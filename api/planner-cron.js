// api/planner-cron.js
// Vercel Cron Function — runs every minute (requires Pro plan; on Hobby use
// "0 * * * *" in vercel.json for hourly delivery).
//
// Reads daily_planner_items due in the current minute window via service_role,
// then calls the EXISTING api/send-notification.js for each user. No second
// notification sender is created here.
//
// Environment variables required (set on Vercel, never in client code):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   INTERNAL_NOTIFICATIONS_SECRET

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const INTERNAL_NOTIFICATIONS_SECRET = process.env.INTERNAL_NOTIFICATIONS_SECRET;

// ─── Supabase REST helper (service_role, no client library dependency) ────────

async function supabaseRest(path, { method = 'GET', body } = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'GET' ? 'return=representation' : 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase REST ${method} ${path} → ${res.status}: ${text}`);
  }
  if (method === 'GET') return res.json();
  return null;
}

// ─── Due-item logic ───────────────────────────────────────────────────────────

/**
 * Returns true if a planner item should fire a notification right now.
 * All times are compared in UTC.
 *
 * @param {object} item   - Row from daily_planner_items
 * @param {Date}   now    - Current UTC time
 * @param {string} todayUTC  - 'YYYY-MM-DD' in UTC
 * @param {string} nowTimeUTC - 'HH:MM' in UTC (current minute)
 */
function isDue(item, now, todayUTC, nowTimeUTC) {
  if (!item.notifications_enabled) return false;

  // Throttle: don't fire again within the same UTC minute window
  if (item.last_notified_at) {
    const lastFired = new Date(item.last_notified_at);
    const minutesSinceLast = (now - lastFired) / 60000;
    if (minutesSinceLast < 1) return false;
  }

  // Normalize notify_time: Postgres returns 'HH:MM:SS', we compare 'HH:MM'
  const itemTime = (item.notify_time || '').slice(0, 5);
  if (itemTime !== nowTimeUTC) return false;

  const rec = item.recurrence;

  if (rec === 'daily') return true;

  if (rec === 'weekdays') {
    const weekdays = Array.isArray(item.weekdays) ? item.weekdays : [];
    const todayDow = now.getUTCDay(); // 0=Sun
    return weekdays.includes(todayDow);
  }

  if (rec === 'specific' && item.specific_date) {
    // specific_date is stored as a date string 'YYYY-MM-DD'
    // For lead_time_minutes, fire on (specific_date - lead_time_minutes)
    const eventDate = new Date(`${item.specific_date}T${item.notify_time}Z`);
    const fireAt = new Date(eventDate.getTime() - (item.lead_time_minutes || 0) * 60000);
    const fireMinute = `${String(fireAt.getUTCHours()).padStart(2, '0')}:${String(fireAt.getUTCMinutes()).padStart(2, '0')}`;
    const fireDay = fireAt.toISOString().slice(0, 10);
    return fireDay === todayUTC && fireMinute === nowTimeUTC;
  }

  if (rec === 'none' && item.specific_date) {
    // One-shot: fire on specific_date at notify_time (with optional lead time)
    const eventDate = new Date(`${item.specific_date}T${item.notify_time}Z`);
    const fireAt = new Date(eventDate.getTime() - (item.lead_time_minutes || 0) * 60000);
    const fireMinute = `${String(fireAt.getUTCHours()).padStart(2, '0')}:${String(fireAt.getUTCMinutes()).padStart(2, '0')}`;
    const fireDay = fireAt.toISOString().slice(0, 10);
    return fireDay === todayUTC && fireMinute === nowTimeUTC;
  }

  return false;
}

// ─── Notification type labels ─────────────────────────────────────────────────

function buildNotificationPayload(item) {
  const typeLabels = {
    reminder: '🔔 Reminder',
    exam: '📝 Exam',
    project: '📦 Project',
    deadline: '⏰ Deadline',
  };
  const prefix = typeLabels[item.type] || '🔔 Reminder';
  const leadNote = item.lead_time_minutes > 0
    ? ` (in ${Math.round(item.lead_time_minutes / 60)} hour${item.lead_time_minutes >= 120 ? 's' : ''})`
    : '';
  return {
    title: `${prefix}${leadNote}`,
    body: item.title,
    action_url: '/daily-planner',
    type: 'planner_reminder',
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Vercel Cron sends a GET with a special Authorization header.
  // We also allow POST for manual triggers (with the internal secret).
  if (req.method === 'POST') {
    const secret = req.headers['x-internal-secret'];
    if (!secret || secret !== INTERNAL_NOTIFICATIONS_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !INTERNAL_NOTIFICATIONS_SECRET) {
    return res.status(500).json({ error: 'Missing required environment variables' });
  }

  const now = new Date();
  const todayUTC = now.toISOString().slice(0, 10);
  const nowTimeUTC = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;

  let items;
  try {
    // Fetch all enabled planner items. Service_role bypasses RLS.
    // We filter in JS rather than adding a complex time-window SQL filter
    // to keep the query simple and correct across all recurrence types.
    items = await supabaseRest(
      'daily_planner_items?notifications_enabled=eq.true&select=id,user_id,title,type,recurrence,weekdays,specific_date,notify_time,lead_time_minutes,last_notified_at',
    );
  } catch (err) {
    console.error('[planner-cron] Failed to query daily_planner_items:', err.message);
    return res.status(502).json({ error: err.message });
  }

  const dueItems = (items || []).filter((item) => isDue(item, now, todayUTC, nowTimeUTC));
  console.log(`[planner-cron] ${now.toISOString()} — ${dueItems.length} item(s) due out of ${(items || []).length}`);

  const results = [];
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://mobile-liquid-glass.vercel.app';

  for (const item of dueItems) {
    const notification = buildNotificationPayload(item);

    // Call the existing send-notification endpoint — no second sender
    let delivered = 0;
    let failed = 0;
    try {
      const sendRes = await fetch(`${baseUrl}/api/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': INTERNAL_NOTIFICATIONS_SECRET,
        },
        body: JSON.stringify({ user_id: item.user_id, notification }),
      });
      const json = await sendRes.json().catch(() => ({}));
      delivered = json.delivered ?? 0;
      failed = json.failed ?? 0;
      console.log(`[planner-cron] item ${item.id} → send-notification ${sendRes.status}: delivered=${delivered} failed=${failed}`);
    } catch (err) {
      console.error(`[planner-cron] item ${item.id} → send-notification error:`, err.message);
      failed = 1;
    }

    // Update last_notified_at regardless of delivery outcome to prevent
    // repeated fires in the same minute if the push service is slow.
    try {
      await supabaseRest(
        `daily_planner_items?id=eq.${encodeURIComponent(item.id)}`,
        { method: 'PATCH', body: { last_notified_at: now.toISOString() } },
      );
    } catch (err) {
      console.warn(`[planner-cron] Could not update last_notified_at for item ${item.id}:`, err.message);
    }

    results.push({ id: item.id, user_id: item.user_id, delivered, failed });
  }

  return res.status(200).json({
    success: true,
    checked: (items || []).length,
    due: dueItems.length,
    results,
    timestamp: now.toISOString(),
  });
}
