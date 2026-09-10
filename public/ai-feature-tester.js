(() => {
  'use strict';

  const STORE_KEY = 'liquid-glass-ai-study-review-v4';
  const LEARNING_KEY = 'liquid-glass-learning-suite-v1';
  const TEST_MARKER = 'ai-feature-tester';

  const q = (root, selector) => root?.querySelector(selector) || null;
  const qa = (root, selector) => root ? [...root.querySelectorAll(selector)] : [];
  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));

  const safeParse = (value, fallback) => {
    try { return JSON.parse(value); } catch { return fallback; }
  };

  const todayKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const readState = () => {
    const state = safeParse(localStorage.getItem(STORE_KEY), null) || {};
    state.loginDays ||= {};
    state.noteOpens ||= {};
    state.sessions ||= [];
    state.pending ||= [];
    state.completedReviews ||= [];
    state.latestDecision ||= null;
    return state;
  };

  const writeState = (state) => localStorage.setItem(STORE_KEY, JSON.stringify(state));

  const readLearning = () => safeParse(localStorage.getItem(LEARNING_KEY), null) || {
    notes: {},
    reviews: {},
    activity: { studyMinutes: 0, sessions: 0, viewedCourses: 0, viewedCollections: 0, lastLogin: null },
  };

  const samplePayload = () => {
    const today = todayKey();
    const learning = readLearning();
    const session = {
      id: `tester-session-${Date.now()}`,
      startedAt: Date.now() - 25 * 60 * 1000,
      completedAt: Date.now() - 5 * 60 * 1000,
      focusMinutes: 25,
      restMinutes: 10,
      course: 'AI Feature Test Course',
      concept: 'Prompt engineering fundamentals',
      targetHours: 1,
      mode: 'Focus',
      notesOpenedBefore: 3,
      tester: true,
    };
    return {
      today,
      login: { firstSeenAt: Date.now() - 2 * 86400000, visits: 1 },
      daily: {
        studyMinutes: 25,
        completedSessions: 1,
        concepts: [session.concept],
        notesOpened: 3,
        noteTitles: ['Prompt basics', 'Role-task-context', 'Constraint patterns'],
        focusSessions: [session],
      },
      currentSession: session,
      recentSessions: [session],
      recall: { accuracy: 80, reviewedCount: Object.keys(learning.reviews || {}).length || 1 },
      learningActivity: learning.activity || null,
      latestDecision: null,
    };
  };

  const callAI = async (phase, payload, answers = null) => {
    const response = await fetch('/api/study-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase, payload, answers }),
    });
    const text = await response.text();
    const parsed = safeParse(text, null);
    if (!response.ok) throw new Error(parsed?.error || `AI request failed (${response.status})`);
    if (!parsed || typeof parsed !== 'object') throw new Error('AI returned an invalid response.');
    return parsed;
  };

  const setStatus = (modal, kind, title, detail = '') => {
    const box = q(modal, '[data-tester-status]');
    if (!box) return;
    box.className = `ai-tester-status ${kind || ''}`;
    box.innerHTML = `<strong>${escapeHtml(title)}</strong>${detail ? `<span>${escapeHtml(detail)}</span>` : ''}`;
  };

  const renderResult = (modal, title, value) => {
    const box = q(modal, '[data-tester-result]');
    if (!box) return;
    box.innerHTML = `<div class="ai-tester-result-head"><span>${escapeHtml(title)}</span><button type="button" data-tester-copy aria-label="Copy result">Copy</button></div><pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
    q(box, '[data-tester-copy]')?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(JSON.stringify(value, null, 2)); setStatus(modal, 'ok', 'Result copied'); } catch { setStatus(modal, 'warn', 'Copy unavailable', 'Your browser blocked clipboard access.'); }
    });
  };

  const createReadyTestSession = () => {
    const state = readState();
    const now = Date.now();
    const session = {
      id: `tester-session-${now}`,
      startedAt: now - 25 * 60 * 1000,
      completedAt: now - 10 * 60 * 1000,
      focusMinutes: 25,
      restMinutes: 10,
      course: 'AI Feature Test Course',
      concept: 'Prompt engineering fundamentals',
      targetHours: 1,
      mode: 'Focus',
      notesOpenedBefore: 3,
      tester: true,
    };
    const pending = {
      id: `tester-review-${now}`,
      sessionId: session.id,
      releaseAt: now,
      restMinutes: 10,
      ready: true,
      session,
      tester: true,
    };
    state.sessions.push(session);
    state.sessions = state.sessions.slice(-100);
    state.pending.push(pending);
    state.pending = state.pending.slice(-20);
    writeState(state);
    window.dispatchEvent(new CustomEvent('ai-feature-tester:session-ready', { detail: { pendingId: pending.id } }));
    return pending;
  };

  const runQuestions = async (modal) => {
    setStatus(modal, 'working', 'Testing AI questions…', 'Calling /api/study-review with a controlled study session.');
    q(modal, '[data-tester-button="questions"]')?.setAttribute('disabled', 'disabled');
    try {
      const result = await callAI('questions', samplePayload());
      const valid = Array.isArray(result.questions) && result.questions.length === 3;
      setStatus(modal, valid ? 'ok' : 'warn', valid ? 'AI questions test passed' : 'AI responded, but the question count is unexpected.', valid ? 'Received exactly 3 structured questions.' : 'Review the raw response below.');
      renderResult(modal, 'Questions response', result);
    } catch (error) {
      setStatus(modal, 'error', 'AI questions test failed', error.message);
      renderResult(modal, 'Error', { message: error.message });
    } finally {
      q(modal, '[data-tester-button="questions"]')?.removeAttribute('disabled');
    }
  };

  const runDecision = async (modal) => {
    setStatus(modal, 'working', 'Testing AI decision…', 'Submitting controlled answers to the decision phase.');
    q(modal, '[data-tester-button="decision"]')?.setAttribute('disabled', 'disabled');
    try {
      const payload = samplePayload();
      const answers = {
        confidence: 'Medium',
        difficulty: 'Remembering',
        next: 'Practice this',
      };
      const result = await callAI('decision', payload, answers);
      const valid = Boolean(result.priority && result.reason && result.nextReview && result.recommendedMinutes);
      setStatus(modal, valid ? 'ok' : 'warn', valid ? 'AI decision test passed' : 'AI responded, but the decision fields are incomplete.', valid ? 'Priority, reason, next review and time were returned.' : 'Review the raw response below.');
      renderResult(modal, 'Decision response', result);
    } catch (error) {
      setStatus(modal, 'error', 'AI decision test failed', error.message);
      renderResult(modal, 'Error', { message: error.message });
    } finally {
      q(modal, '[data-tester-button="decision"]')?.removeAttribute('disabled');
    }
  };

  const runStudySimulator = (modal) => {
    const focus = Math.max(3, Number(q(modal, '[data-tester-focus]')?.value) || 5);
    const rest = Math.max(1, Number(q(modal, '[data-tester-rest]')?.value) || 2);
    const progress = q(modal, '[data-tester-progress]');
    const label = q(modal, '[data-tester-sim-label]');
    const button = q(modal, '[data-tester-button="simulate"]');
    if (button) button.disabled = true;
    if (progress) progress.style.width = '0%';
    if (label) label.textContent = `Focus simulation · ${focus}s`;
    setStatus(modal, 'working', 'Study session simulation started', `Focus ${focus}s → rest ${rest}s → AI review ready`);

    const started = performance.now();
    const focusTick = window.setInterval(() => {
      const percent = Math.min(100, ((performance.now() - started) / (focus * 1000)) * 100);
      if (progress) progress.style.width = `${percent}%`;
      if (percent >= 100) {
        window.clearInterval(focusTick);
        if (label) label.textContent = `Recovery simulation · ${rest}s`;
        const restStarted = performance.now();
        const restTick = window.setInterval(() => {
          const restPercent = Math.min(100, ((performance.now() - restStarted) / (rest * 1000)) * 100);
          if (progress) progress.style.width = `${restPercent}%`;
          if (restPercent >= 100) {
            window.clearInterval(restTick);
            const pending = createReadyTestSession();
            if (label) label.textContent = 'Completed · AI review unlocked';
            setStatus(modal, 'ok', 'Study session test passed', `Created a synthetic completed cycle (${pending.session.focusMinutes} min study + ${pending.restMinutes} min recovery).`);
            if (button) button.disabled = false;
            renderResult(modal, 'Synthetic pending review', pending);
          }
        }, 100);
      }
    }, 100);
  };

  const clearTesterData = (modal) => {
    const state = readState();
    state.sessions = state.sessions.filter((item) => !item.tester);
    state.pending = state.pending.filter((item) => !item.tester);
    state.completedReviews = state.completedReviews.filter((item) => !item.tester);
    writeState(state);
    setStatus(modal, 'ok', 'Tester data cleared', 'Real study-review data was left untouched.');
    renderResult(modal, 'Cleanup', { removed: 'AI feature tester records only' });
  };

  const openTester = () => {
    const existing = document.querySelector(`.${TEST_MARKER}-backdrop`);
    if (existing) return;
    const backdrop = document.createElement('div');
    backdrop.className = `${TEST_MARKER}-backdrop`;
    backdrop.innerHTML = `
      <section class="ai-feature-tester-modal" role="dialog" aria-modal="true" aria-label="AI feature tester">
        <header class="ai-tester-header">
          <div><span class="ai-tester-eyebrow">Developer tools</span><h2>AI Feature Tester</h2><p>Test AI features without waiting for a full study cycle.</p></div>
          <button type="button" class="ai-tester-close" aria-label="Close">×</button>
        </header>
        <section class="ai-tester-status" data-tester-status><strong>Ready to test</strong><span>Use the simulator first, or call the AI phases directly.</span></section>
        <section class="ai-tester-card">
          <div class="ai-tester-card-heading"><div><span>01 · STUDY SESSION</span><h3>Session simulator</h3><p>Run a short focus + recovery cycle and unlock a synthetic AI review.</p></div><span class="ai-tester-badge">QA</span></div>
          <div class="ai-tester-controls"><label>Focus seconds<input data-tester-focus type="number" min="3" max="60" value="5"></label><label>Rest seconds<input data-tester-rest type="number" min="1" max="30" value="2"></label></div>
          <div class="ai-tester-progress"><span data-tester-progress></span></div>
          <div class="ai-tester-sim-meta"><span data-tester-sim-label>Ready</span><button type="button" data-tester-button="simulate">Run session test</button></div>
        </section>
        <section class="ai-tester-card">
          <div class="ai-tester-card-heading"><div><span>02 · AI BACKEND</span><h3>API tests</h3><p>These calls hit the same study-review endpoint used by the live feature.</p></div><span class="ai-tester-badge live">LIVE</span></div>
          <div class="ai-tester-actions"><button type="button" data-tester-button="questions">Test 3 AI questions</button><button type="button" data-tester-button="decision">Test AI decision</button></div>
        </section>
        <section class="ai-tester-card">
          <div class="ai-tester-card-heading"><div><span>03 · MAINTENANCE</span><h3>Tester cleanup</h3><p>Remove only synthetic records created by this tester.</p></div></div>
          <button type="button" class="ai-tester-secondary" data-tester-button="clear">Clear tester data</button>
        </section>
        <section class="ai-tester-result" data-tester-result><div class="ai-tester-empty">No test result yet.</div></section>
        <footer class="ai-tester-footer"><span>Real user study data is never used by the simulator.</span><span>Endpoint · /api/study-review</span></footer>
      </section>`;
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) backdrop.remove(); });
    q(backdrop, '.ai-tester-close')?.addEventListener('click', () => backdrop.remove());
    q(backdrop, '[data-tester-button="simulate"]')?.addEventListener('click', () => runStudySimulator(backdrop));
    q(backdrop, '[data-tester-button="questions"]')?.addEventListener('click', () => runQuestions(backdrop));
    q(backdrop, '[data-tester-button="decision"]')?.addEventListener('click', () => runDecision(backdrop));
    q(backdrop, '[data-tester-button="clear"]')?.addEventListener('click', () => clearTesterData(backdrop));
    document.body.appendChild(backdrop);
  };

  const injectLauncher = (dashboard) => {
    if (!dashboard || q(dashboard, '[data-ai-feature-tester-launcher]')) return;
    const controls = q(dashboard, '.dashboard-controls');
    if (!controls) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-button ai-feature-tester-launcher';
    button.dataset.aiFeatureTesterLauncher = 'true';
    button.setAttribute('aria-label', 'AI Feature Tester');
    button.title = 'AI Feature Tester';
    button.innerHTML = '<span aria-hidden="true">⌘</span>';
    button.addEventListener('click', openTester);
    controls.insertBefore(button, controls.firstElementChild);
  };

  const observe = () => {
    const dashboard = document.querySelector('.dashboard-screen');
    if (dashboard) injectLauncher(dashboard);
  };

  const observer = new MutationObserver(observe);
  observer.observe(document.body, { childList: true, subtree: true });
  observe();
})();
