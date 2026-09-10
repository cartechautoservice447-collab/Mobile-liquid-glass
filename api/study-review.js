export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
j

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY is not configured',
    });
  }

  const body =
    req.body && typeof req.body === 'object' ? req.body : {};

  const {
    phase = 'questions',
    payload,
    answers = null,
  } = body;

  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({
      error: 'payload is required',
    });
  }

  // Gemini model used for the Study Review feature.
  const model = 'gemini-2.5-flash';

  const schema =
    phase === 'decision'
      ? {
          type: 'OBJECT',
          properties: {
            decision: {
              type: 'OBJECT',
              properties: {
                priority: {
                  type: 'STRING',
                },
                reason: {
                  type: 'STRING',
                },
                nextReview: {
                  type: 'STRING',
                },
                recommendedMinutes: {
                  type: 'NUMBER',
                },
                focus: {
                  type: 'STRING',
                },
              },
              required: [
                'priority',
                'reason',
                'nextReview',
                'recommendedMinutes',
                'focus',
              ],
            },
          },
          required: ['decision'],
        }
      : {
          type: 'OBJECT',
          properties: {
            summary: {
              type: 'STRING',
            },
            strengths: {
              type: 'STRING',
            },
            weakArea: {
              type: 'STRING',
            },
            nextReview: {
              type: 'STRING',
            },
            questions: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  id: {
                    type: 'STRING',
                  },
                  text: {
                    type: 'STRING',
                  },
                  options: {
                    type: 'ARRAY',
                    items: {
                      type: 'STRING',
                    },
                  },
                },
                required: ['id', 'text', 'options'],
              },
            },
          },
          required: [
            'summary',
            'strengths',
            'weakArea',
            'nextReview',
            'questions',
          ],
        };

  const phaseInstruction =
    phase === 'decision'
      ? 'Make one clear next-study decision from the activity and the user answers. Do not invent facts. Include priority, reason, next-review timing, a realistic session length in minutes, and the focus area.'
      : 'Analyze the completed study cycle and today’s activity. Generate exactly three meaningful check-in questions based on what the user actually did. Do not repeat generic questions unnecessarily.';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text:
                  `You are the study-intelligence layer inside an existing learning app. ${phaseInstruction} Use only supplied app data. Do not teach a lesson and do not request information already present. Keep the output concise and practical.`,
              },
            ],
          },

          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: JSON.stringify({
                    activity: payload,
                    userAnswers: answers,
                  }),
                },
              ],
            },
          ],

          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        }),
      }
    );

    const raw = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({
        error: raw.slice(0, 1200),
      });
    }

    const data = JSON.parse(raw);

    const outputText =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim() || '';

    if (!outputText) {
      return res.status(502).json({
        error: 'Gemini returned no text',
      });
    }

    let parsedOutput;

    try {
      parsedOutput = JSON.parse(outputText);
    } catch {
      return res.status(502).json({
        error: 'Gemini returned invalid JSON',
        raw: outputText.slice(0, 1200),
      });
    }

    return res.status(200).json(parsedOutput);
  } catch (error) {
    return res.status(500).json({
      error:
        error?.message || 'Gemini study review failed',
    });
  }
}