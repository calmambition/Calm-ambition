# Check-In Deployment Checklist (Quick Start)

Copy and paste this into a terminal, one section at a time.

## Step 1: Install Wrangler

```bash
npm install -g wrangler
```

Verify:
```bash
wrangler --version
```

## Step 2: Authenticate with Cloudflare

```bash
wrangler login
```

(Opens browser, follow prompts)

## Step 3: Create KV Namespace

```bash
wrangler kv:namespace create "RATELIMIT"
```

Copy the returned ID (looks like `a1b2c3d4e5f6g7h8`).

Edit `wrangler.toml` and replace the KV id:

```toml
[[kv_namespaces]]
binding = "KV"
id = "YOUR-ID-HERE"
```

## Step 4: Set API Key

```bash
wrangler secret put ANTHROPIC_API_KEY
```

Paste your key from https://console.anthropic.com/account/keys and press Enter.

## Step 5: Deploy Worker

```bash
wrangler deploy
```

**Important:** Copy the worker URL from the output. It looks like:
```
✓ Deployed to https://calm-ambition-checkin.workers.dev
```

Save this URL.

## Step 6: Update Check-In Page

Open `check-in/index.html` in your editor.

Find line ~380:
```javascript
const response = await fetch('https://worker-url.workers.dev/readout', {
```

Replace `https://worker-url.workers.dev` with your worker URL from Step 5.

Save the file.

## Step 7: Test Locally

```bash
npm run dev
```

Visit: http://localhost:3456/check-in/

Answer all 11 questions and verify:
- Loading spinner appears
- Readout displays (should have headline + 3 dimensions + pattern + 3 steps)
- No em dashes in readout (check the text carefully)

If you get an API error at the loading step, double-check the worker URL in check-in/index.html.

## Step 8: Push to GitHub

```bash
git add .
git commit -m "Add burnout check-in with AI-powered readouts"
git push
```

The changes auto-deploy to GitHub Pages.

## Step 9: Test on Production

Visit: https://calmambition.github.io/Calm-ambition/check-in/

Complete the quiz, enter your email, and verify:
- Formspree receives the submission (check Formspree dashboard)
- Email arrives in your inbox with readout
- Mobile: complete quiz on a real phone to verify no cache issues

## Done

The check-in is live. Next steps:

1. Add email follow-up sequence (optional but recommended)
2. Monitor Formspree submissions daily
3. Track conversions to discovery calls
4. Watch Cloudflare Worker metrics for errors

---

## Troubleshooting Quick Links

- **API key issues?** https://console.anthropic.com/account/keys
- **Formspree submissions?** https://formspree.io
- **Cloudflare metrics?** https://dash.cloudflare.com → Workers
- **Em dashes in output?** Contact Claude — the prompt enforces removal

All 9 steps take ~15 minutes.
