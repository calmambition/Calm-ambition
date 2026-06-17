/**
 * Cloudflare Worker for Calm Ambition Burnout Checkin
 * Handles: API key security, Anthropic API calls, rate limiting, validation
 */

const SCALE_QUESTIONS = [
  { dim: "Exhaustion", text: "By the end of a workday, I have nothing left for the people or things I care about." },
  { dim: "Exhaustion", text: "I wake up tired, even after a full night's sleep." },
  { dim: "Exhaustion", text: "When Sunday comes around, I feel a sense of dread about the week ahead.", scale: ["Rarely", "Sometimes", "Often", "Most weeks", "Every week"] },
  { dim: "Detachment", text: "I catch myself going through the motions on work I used to care about." },
  { dim: "Detachment", text: "I'm more cynical or irritable with colleagues and clients than I'd like to be." },
  { dim: "Detachment", text: "I've started keeping people at work at arm's length." },
  { dim: "Efficacy", text: "I doubt whether my work is actually making a difference." },
  { dim: "Efficacy", text: "Tasks that used to feel easy now take real effort to start or finish." },
  { dim: "Efficacy", text: "I finish most days feeling like I accomplished very little." },
];

const SCALE = ["Rarely", "Sometimes", "Often", "Most days", "Every day"];

const INTERVENTION_LIBRARY = `When writing "firstSteps", choose exactly three actions from the library below. Selection rules:
- Weight your choices toward the one or two dimensions with the highest averages.
- Adapt the wording to the person's own context from their free-text answers (their role, their named pressures, their words). Keep each to one sentence.
- Never select two actions from the same cluster.
- If all three dimension averages are 3.0 or above, one of the three actions MUST be the "heavy load" action, listed last.
- These are starting experiments, not fixes. Frame them as two-week trials.

### Energy cluster (recovery and nervous system downshift)
1. Pick one evening this week with a hard finish time, put it in your calendar like a client meeting, and leave the laptop closed after it.
2. Before you walk in the front door each evening, sit in the car or pause outside for ninety seconds of slow breathing with a long exhale, so your body gets the signal that work mode is over.
3. Anchor your wake time: same time every morning for the next fortnight, weekends included, and let bedtime sort itself out.
4. Take one ten-minute walk outside between meetings each day, no phone, no podcast, just movement and daylight.
5. Audit one evening this week for fake recovery: scrolling and background TV keep your stress system idling, so swap thirty minutes of it for anything that actually slows you down, reading, cooking, stretching, talking.
6. Move your caffeine cutoff to midday for two weeks and pay attention to what your evenings and sleep do in response.

### Connection cluster (re-engagement and boundaries)
7. Book one fifteen-minute conversation this week with a colleague you actually like, no agenda, no work problem to solve.
8. Next time you feel yourself checking out in a meeting, write down the exact sentence running through your head; cynicism loses grip once you can see the script.
9. Protect thirty minutes this week for the one part of your role you still genuinely care about, and treat that time as non-negotiable.
10. Decline or delegate one meeting this fortnight with a single-line reason and no apology attached.
11. Tell one trusted person at work, in plain words, that you are running close to the edge; secrecy is part of what keeps the pattern in place.

### Impact cluster (efficacy and evidence)
12. End each workday by writing three lines on what actually moved forward, however small; your sense of accomplishing nothing is a distortion worth testing against evidence.
13. Take the task you keep avoiding and shrink it to a fifteen-minute first move, then stop there; momentum matters more than completion right now.
14. Block one ninety-minute deep work session before midday this week, notifications off, door closed, and notice how it changes the rest of the day.
15. Ask one colleague you trust what they have seen you do well lately, and write the answer down somewhere you will see it again.
16. Find one recurring task that produces nothing anyone uses, and kill it or hand it off this fortnight.

### Heavy load action (mandatory when all dimensions average 3.0+)
17. The signals across your answers are loud enough that the most useful next step is a conversation, not a tactic: book time with your GP this fortnight, and consider what you could put down at work while you rebuild.`;

function dimensionScores(answers) {
  const dims = {};
  SCALE_QUESTIONS.forEach((q, i) => {
    if (!dims[q.dim]) dims[q.dim] = [];
    dims[q.dim].push(answers[i]);
  });
  const out = {};
  Object.entries(dims).forEach(([dim, vals]) => {
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    out[dim] = { average: Number(avg.toFixed(2)), max: 4 };
  });
  return out;
}

function buildPrompt(answers, freeText) {
  const scores = dimensionScores(answers);
  const detail = SCALE_QUESTIONS.map(
    (q, i) => `[${q.dim}] "${q.text}" -> ${(q.scale || SCALE)[answers[i]]}`
  ).join("\n");

  return `You are writing a personalised reflection for Calm Ambition, a burnout recovery and sustainable high-performance coaching practice for senior professionals, founded by a certified wellness coach with 15 years of corporate experience.

Voice: warm, direct, evidence-informed, peer-to-peer. Speaks to senior professionals as capable adults. No fluff, no toxic positivity, no clinical jargon dumped on the reader. Never diagnoses. Australian English spelling.

Hard rules:
- NEVER use em dashes anywhere. Use commas, colons, full stops, or restructure.
- Never say the person "has burnout" or assign any diagnosis. Describe patterns and signals only.
- Do not mention Maslach, MBI, or any framework by name. Use plain language.
- Ground everything in what they actually wrote. Quote their own words back, not your paraphrase of a category.

Write like a real coach speaking to one person across a table. Senior professionals spot generic AI writing in a second and stop trusting it, so avoid every tell below:
- Cut all adverbs and filler: really, just, simply, genuinely, truly, deeply, constantly, clearly. Cut empty intensifiers like "every single day", "more than ever", "running on empty" used as a slogan.
- No binary-contrast formulas: "not X, it's Y", "isn't about X, it's Y", "not just X but Y", "more than a [thing] problem", "points to something more than". State what you see plainly.
- No drama setups or throat-clearing: "The disconnect here is sharp:", "Here's the thing", "The pattern is one of...", "What stands out is...", "The fact that...". Open with the observation itself.
- Do not give abstract nouns human actions. Never write "depletion meeting a crisis of meaning", "the signals point to", "the exhaustion tells you". A person feels, notices and does things. Name them: "you", "your week", "your body".
- No aphorisms or pull-quote lines like "worth holding onto as a signal of what's still intact". If a sentence sounds like a poster, rewrite it as a flat observation.
- Vary sentence length. Do not stack short punchy fragments. Do not end every paragraph on a tidy line.
- Be specific. Point at their actual answers (the Sunday dread, the late nights with senior leaders, the task they keep avoiding), not vague "your nervous system" abstractions.
- Plain Australian English a tired professional reads in one pass. No therapy-speak, no corporate jargon, no toxic positivity.

Their self-check responses (frequency scale: Rarely, Sometimes, Often, Most days, Every day):
${detail}

Dimension averages (0 to 4 scale): ${JSON.stringify(scores)}

Their words, in response to "a recent moment when work felt heaviest":
"${freeText.moment || "(left blank)"}"

Their words, in response to "what sustainable would look like in six months":
"${freeText.sustainable || "(left blank)"}"

${INTERVENTION_LIBRARY}

Respond with ONLY a valid JSON object, no markdown fences, no preamble, in exactly this shape:
{
  "headline": "A short headline in plain spoken words (max 10 words). No colon constructions, no 'X, not Y' formula, no abstract nouns like depletion or crisis.",
  "dimensions": [
    {"name": "Energy", "level": "Steady" | "Strained" | "Running on empty", "reflection": "2 sentences about their exhaustion answers, spoken to them. Point at what they actually said. No adverbs, no 'not X but Y', no aphorisms."},
    {"name": "Connection", "level": "Connected" | "Pulling back" | "Checked out", "reflection": "2 sentences about their detachment answers, same rules."},
    {"name": "Impact", "level": "Confident" | "Wavering" | "Doubting", "reflection": "2 sentences about their efficacy answers, same rules."}
  ],
  "pattern": "One paragraph (3-4 sentences) said the way you would say it to them, connecting what they reported. Quote at least one phrase they actually wrote. Do not open with 'The pattern is', 'What stands out', or 'The disconnect'. No abstract nouns doing the acting.",
  "firstSteps": ["Three specific, small actions for the next two weeks. Each one sentence, concrete, tied to their situation, not generic wellness advice."],
  "invitation": "One warm, plain sentence inviting a free discovery call to talk it through. No salesy or poster language."
}`;
}

async function generateReadout(answers, freeText, env) {
  const prompt = buildPrompt(answers, freeText);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${errBody}`);
  }

  const data = await response.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "https://calmambition.github.io",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Only POST to /readout
    if (request.method !== "POST" || !request.url.includes("/readout")) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }

    // CORS check
    const origin = request.headers.get("Origin") || "";
    if (!origin.includes("calmambition.github.io")) {
      return new Response(JSON.stringify({ error: "CORS denied" }), { status: 403 });
    }

    // Parse body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    const { answers, freeText } = body;

    // Validate answers
    if (!Array.isArray(answers) || answers.length !== 9) {
      return new Response(JSON.stringify({ error: "answers must be array of 9 integers" }), { status: 400 });
    }
    if (!answers.every((a) => Number.isInteger(a) && a >= 0 && a <= 4)) {
      return new Response(JSON.stringify({ error: "answers must be 0-4" }), { status: 400 });
    }

    // Validate free text
    if (!freeText || typeof freeText !== "object") {
      return new Response(JSON.stringify({ error: "freeText must be object" }), { status: 400 });
    }
    const moment = String(freeText.moment || "").slice(0, 1000).replace(/[^\w\s.,\-()'"]/g, "");
    const sustainable = String(freeText.sustainable || "").slice(0, 1000).replace(/[^\w\s.,\-()'"]/g, "");

    // Rate limit (simple IP-based using Cloudflare KV)
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const rateLimitKey = `ratelimit:${ip}`;
    const count = await env.KV.get(rateLimitKey);
    if (count && parseInt(count) > 10) {
      return new Response(
        JSON.stringify({ error: "Rate limited. Try again in 1 hour." }),
        { status: 429 }
      );
    }
    await env.KV.put(rateLimitKey, String((parseInt(count) || 0) + 1), { expirationTtl: 3600 });

    // Generate readout
    let readout;
    try {
      readout = await generateReadout(answers, { moment, sustainable }, env);
    } catch (e) {
      console.error("Readout generation error:", e.message);
      return new Response(JSON.stringify({ error: "Failed to generate readout" }), { status: 502 });
    }

    return new Response(JSON.stringify(readout), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "https://calmambition.github.io",
      },
    });
  },
};
