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

Use the exact level words shown for each dimension. For Connection, the healthy level is "Connected", never "Engaged".

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

// Email sending config
const FROM_EMAIL = "Calm Ambition <hello@calmambition.com.au>";
const REPLY_TO_EMAIL = "thecalmcoach.pri@gmail.com"; // replies land in Pri's Gmail
const BOOKING_URL = "https://calmambition.github.io/Calm-ambition/#contact";

function isAllowedOrigin(origin) {
  return origin.includes("calmambition.github.io") || origin.includes("calmambition.com.au");
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : "https://calmambition.github.io",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

async function rateLimit(env, ip, bucket, max) {
  const key = `${bucket}:${ip}`;
  const count = parseInt(await env.KV.get(key)) || 0;
  if (count >= max) return false;
  await env.KV.put(key, String(count + 1), { expirationTtl: 3600 });
  return true;
}

// HTML-escape user-influenced text before placing in the email template
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Validate the readout shape and field sizes before emailing it on
function validReadout(r) {
  if (!r || typeof r !== "object") return false;
  if (typeof r.headline !== "string" || r.headline.length > 300) return false;
  if (typeof r.pattern !== "string" || r.pattern.length > 1500) return false;
  if (typeof r.invitation !== "string" || r.invitation.length > 600) return false;
  if (!Array.isArray(r.dimensions) || r.dimensions.length > 5) return false;
  for (const d of r.dimensions) {
    if (!d || typeof d !== "object") return false;
    if (typeof d.name !== "string" || d.name.length > 60) return false;
    if (typeof d.level !== "string" || d.level.length > 60) return false;
    if (typeof d.reflection !== "string" || d.reflection.length > 900) return false;
  }
  if (!Array.isArray(r.firstSteps) || r.firstSteps.length > 5) return false;
  for (const s of r.firstSteps) {
    if (typeof s !== "string" || s.length > 600) return false;
  }
  return true;
}

function buildEmailHtml(r) {
  const dims = r.dimensions.map((d) => `
    <tr><td style="padding:0 0 22px;">
      <span style="font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#2E3D30;">${esc(d.name)}</span>
      <span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#5C7A5C;padding-left:8px;">${esc(d.level)}</span>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#3D4A3E;padding-top:6px;">${esc(d.reflection)}</div>
    </td></tr>`).join("");

  const steps = r.firstSteps.map((s, i) => `
    <tr><td style="padding:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#3D4A3E;">
      <span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;color:#5C7A5C;font-size:18px;padding-right:10px;">${i + 1}</span>${esc(s)}
    </td></tr>`).join("");

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#EDE7DA;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDE7DA;padding:32px 0;"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#F5F0E8;">
      <tr><td style="padding:36px 40px 0;text-align:center;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:18px;letter-spacing:5px;text-transform:uppercase;color:#2E3D30;">Calm Ambition</div>
        <div style="width:36px;height:1px;background:#A98E5F;margin:12px auto 0;font-size:0;line-height:0;">&nbsp;</div>
      </td></tr>
      <tr><td style="padding:32px 40px 0;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#5C7A5C;">Your readout</div>
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;color:#2E3D30;padding-top:8px;">${esc(r.headline)}</div>
      </td></tr>
      <tr><td style="padding:28px 40px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${dims}</table></td></tr>
      <tr><td style="padding:6px 40px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#DCE6D7;padding:24px 26px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#5C7A5C;padding-bottom:8px;">The pattern</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#3D4A3E;">${esc(r.pattern)}</div>
      </td></tr></table></td></tr>
      <tr><td style="padding:28px 40px 0;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#5C7A5C;padding-bottom:14px;">Three small things to try</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${steps}</table>
      </td></tr>
      <tr><td style="padding:24px 40px 0;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:18px;line-height:1.5;color:#2E3D30;text-align:center;border-top:1px solid #DCE6D7;padding-top:24px;">${esc(r.invitation)}</div>
      </td></tr>
      <tr><td style="padding:24px 40px 0;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr><td style="background:#5C7A5C;">
          <a href="${BOOKING_URL}" style="display:inline-block;padding:15px 38px;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#F5F0E8;text-decoration:none;">Book a discovery call</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="padding:28px 40px 40px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8A8678;text-align:center;">This readout is for self-reflection only and is not a medical or psychological diagnosis. If you are struggling, please speak with your GP or a mental health professional.</div>
      </td></tr>
    </table>
  </td></tr></table>
  </body></html>`;
}

function buildEmailText(r) {
  const dims = r.dimensions.map((d) => `${d.name} (${d.level})\n${d.reflection}`).join("\n\n");
  const steps = r.firstSteps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  return [
    "CALM AMBITION", "Your readout", "",
    r.headline, "",
    dims, "",
    "THE PATTERN", r.pattern, "",
    "THREE SMALL THINGS TO TRY", steps, "",
    r.invitation, "",
    "Book a discovery call: " + BOOKING_URL, "",
    "This readout is for self-reflection only and is not a medical or psychological diagnosis. If you are struggling, please speak with your GP or a mental health professional.",
  ].join("\n");
}

async function sendReadoutEmail(toEmail, readout, env) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [toEmail],
      reply_to: REPLY_TO_EMAIL,
      subject: "Your Calm Ambition burnout check-in",
      html: buildEmailHtml(readout),
      text: buildEmailText(readout),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error: ${res.status} ${body}`);
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Not found" }, 404, origin);
    }
    if (!isAllowedOrigin(origin)) {
      return jsonResponse({ error: "CORS denied" }, 403, origin);
    }

    const path = new URL(request.url).pathname;
    const ip = request.headers.get("cf-connecting-ip") || "unknown";

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400, origin);
    }

    // --- /readout: generate the AI readout ---
    if (path.endsWith("/readout")) {
      const { answers, freeText } = body;

      if (!Array.isArray(answers) || answers.length !== 9) {
        return jsonResponse({ error: "answers must be array of 9 integers" }, 400, origin);
      }
      if (!answers.every((a) => Number.isInteger(a) && a >= 0 && a <= 4)) {
        return jsonResponse({ error: "answers must be 0-4" }, 400, origin);
      }
      if (!freeText || typeof freeText !== "object") {
        return jsonResponse({ error: "freeText must be object" }, 400, origin);
      }
      const moment = String(freeText.moment || "").slice(0, 1000).replace(/[^\w\s.,\-()'"]/g, "");
      const sustainable = String(freeText.sustainable || "").slice(0, 1000).replace(/[^\w\s.,\-()'"]/g, "");

      if (!(await rateLimit(env, ip, "ratelimit", 10))) {
        return jsonResponse({ error: "Rate limited. Try again in 1 hour." }, 429, origin);
      }

      let readout;
      try {
        readout = await generateReadout(answers, { moment, sustainable }, env);
      } catch (e) {
        console.error("Readout generation error:", e.message);
        return jsonResponse({ error: "Failed to generate readout" }, 502, origin);
      }
      return jsonResponse(readout, 200, origin);
    }

    // --- /email: send the readout to the visitor ---
    if (path.endsWith("/email")) {
      const { email, readout } = body;

      const emailOk = typeof email === "string" && email.length <= 200 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
      if (!emailOk) {
        return jsonResponse({ error: "Invalid email" }, 400, origin);
      }
      if (!validReadout(readout)) {
        return jsonResponse({ error: "Invalid readout" }, 400, origin);
      }
      if (!(await rateLimit(env, ip, "emailrate", 6))) {
        return jsonResponse({ error: "Rate limited. Try again in 1 hour." }, 429, origin);
      }

      try {
        await sendReadoutEmail(email, readout, env);
      } catch (e) {
        console.error("Email send error:", e.message);
        return jsonResponse({ error: "Failed to send email" }, 502, origin);
      }
      return jsonResponse({ sent: true }, 200, origin);
    }

    return jsonResponse({ error: "Not found" }, 404, origin);
  },
};
