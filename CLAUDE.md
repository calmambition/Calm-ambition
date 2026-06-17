# Calm Ambition — Claude Instructions

## Project layout & deploy

**This GitHub repo (`calmambition/Calm-ambition`) is the source of truth.** Do not edit the iCloud folder `C:\Users\steve\iCloudDrive\Calm-Ambition\Calm-ambition`; it is an offloaded clone with empty/dataless files. Clone fresh if you don't have a working copy.

Burnout check-in quiz architecture:
- `check-in/index.html` — vanilla JS frontend on GitHub Pages. Deploys automatically on push to `main`.
- `worker.js` + `wrangler.toml` — Cloudflare Worker at `https://calm-ambition-checkin.pri-jain.workers.dev/readout`. Holds the Anthropic prompt (claude-sonnet-4-6) that generates the readout. Deploy with `npx wrangler deploy` (wrangler is authed to Cloudflare on the founder's machine). Pushing to GitHub does NOT deploy the worker.
- Lead email to the coach goes via Formspree form `mkoepynv`, sent from `submitEmail()` in `check-in/index.html`.

When you change quiz copy: prompt/readout wording lives in `worker.js`, page/email wording lives in `check-in/index.html`.

## Writing rules

**No em dashes. Ever.**
Do not use em dashes (—) anywhere in site copy, blog posts, or any user-facing text. Use a period and a new sentence, a comma, or restructure the sentence instead.

Example:
- Wrong: "The work was hard — harder than expected."
- Right: "The work was hard. Harder than expected."
- Right: "The work was harder than expected."
