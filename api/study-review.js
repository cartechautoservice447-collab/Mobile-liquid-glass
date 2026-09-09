export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'OPENAI_API_KEY is not configured' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { phase = 'questions', payload, answers = null } = body;
  if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'payload is required' });

  const model = process.env.OPENAI_STUDY_REVIEW_MODEL || 'gpt-5.6-luna';
  const schema = phase === 'decision'
    ? {
        type: 'object',
        properties: { decision: { type: 'object', properties: {
          priority: { type: 'string' }, reason: { type: 'string' }, nextReview: { type: 'string' },
          recommendedMinutes: { type: 'number' }, focus: { type: 'string' },
        }, required: ['priority', 'reason', 'nextReview', 'recommendedMinutes', 'focus'], additionalProperties: false } },
        required: ['decision'], additionalProperties: false,
      }
    : {
        type: 'object',
        properties: {
          summary: { type: 'string' }, strengths: { type: 'string' }, weakArea: { type: 'string' }, nextReview: { type: 'string' },
          questions: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'object', properties: {
            id: { type: 'string' }, text: { type: 'string' }, options: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string' } },
          }, required: ['id', 'text', 'options'], additionalProperties: false } },
        },
        required: ['summary', 'strengths', 'weakArea', 'nextReview', 'questions'], additionalProperties: false,
      };

  const phaseInstruction = phase === 'decision'
    ? 'Make one clear next-study decision from the activity and the user answers. Do not invent facts. Include priority, reason, next-review timing, a realistic session length in minutes, and the focus area.'
    : 'Analyze the completed study cycle and today’s activity. Generate exactly three meaningful check-in questions based on what the user actually did; do not repeat generic questions unnecessarily.';

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        input: [
          { role: 'system', content: [{ type: 'input_text', text: `You are the study-intelligence layer inside an existing learning app. ${phaseInstruction} Use only supplied app data. Do not teach a lesson and do not request information already present. Keep the output concise and practical.` }] },
          { role: 'user', content: [{ type: 'input_text', text: JSON.stringify({ activity: payload, userAnswers: answers }) }] },
        ],
        text: { format: { type: 'json_schema', name: phase === 'decision' ? 'study_decision' : 'study_review_questions', strict: true, schema } },
      }),
    });

    const raw = await response.text();
    if (!response.ok) return res.status(response.status).json({ error: raw.slice(0, 1200) });
    const data = JSON.parse(raw);
    const outputText = Array.isArray(data.output)
      ? data.output.flatMap((item) => Array.isArray(item.content) ? item.content : []).map((item) => item.text || '').join('').trim()
      : '';
    if (!outputText) return res.status(502).json({ error: 'AI returned no text' });
    return res.status(200).json(JSON.parse(outputText));
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'AI review failed' });
  }
}
