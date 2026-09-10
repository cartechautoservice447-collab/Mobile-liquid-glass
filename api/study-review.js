export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  // Current stable Gemini model for this integration.
  const model = 'gemini-3.6-flash';

  const schema =
    phase === 'decision'
      ? {
          type: 'object',
          properties: {
            decision: {
              type: 'object',
              properties: {
                priority: {
                  type: 'string',
                },
                reason: {
                  type: 'string',
                },
                nextReview: {
                  type: 'string',
                },
                recommendedMinutes: {
                  type: 'number',
                },
                focus: {
                  type: 'string',
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
          type: 'object',
          properties: {
            summary: {
              type: 'string',
            },
            strengths: {
              type: 'string',
            },
            weakArea: {
              type: 'string',
            },
            nextReview: {
              type: 'string',
            },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                  },
                  text: {
                    type: 'string',
                  },
                  options: {
                    type: 'array',
                    items: {
                      type: 'string',
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

  const systemInstruction = [
    'You are the study-intelligence layer inside an existing learning app.',
    phaseInstruction,
    'Use only supplied app data.',
    'Do not invent facts.',
    'Do not teach a lesson.',
    'Do not request information already present.',
    'Keep the output concise, specific, and practical.',
  ].join(' ');

  const userInput = JSON.stringify({
    activity: payload,
    userAnswers: answers,
  });

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/interactions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          model,
          input: userInput,
          system_instruction: systemInstruction,

          response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema,
          },

          generation_config: {
            thinking_level: 'high',
            max_output_tokens: 2000,
          },

          store: false,
        }),
      }
    );

    const raw = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({
        error: raw.slice(0, 1500),
      });
    }

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(502).json({
        error: 'Gemini returned invalid API JSON',
        raw: raw.slice(0, 1500),
      });
    }

    /*
     * Interactions API responses can expose output text directly
     * or through the model_output step.
     */
    let outputText =
      typeof data?.output_text === 'string'
        ? data.output_text.trim()
        : '';

    if (!outputText && Array.isArray(data?.steps)) {
      outputText = data.steps
        .filter((step) => step?.type === 'model_output')
        .flatMap((step) =>
          Array.isArray(step?.content) ? step.content : []
        )
        .filter((content) => content?.type === 'text')
        .map((content) => content.text || '')
        .join('')
        .trim();
    }

    if (!outputText && Array.isArray(data?.outputs)) {
      outputText = data.outputs
        .filter((output) => output?.type === 'text')
        .map((output) => output.text || '')
        .join('')
        .trim();
    }

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
        error: 'Gemini returned invalid structured JSON',
        raw: outputText.slice(0, 1500),
      });
    }

    return res.status(200).json(parsedOutput);
  } catch (error) {
    return res.status(500).json({
      error: error?.message || 'Gemini study review failed',
    });
  }
}
