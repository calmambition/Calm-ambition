# Burnout Check-In Setup Guide

This guide walks through deploying the AI-powered burnout check-in. The system has three parts: the check-in page, a Cloudflare Worker for API security, and email delivery via Formspree.

## 1. Cloudflare Worker Setup

The Worker holds your Anthropic API key and handles all LLM calls server-side, so the key never reaches the browser.

### Install Wrangler

```bash
npm install -g wrangler
```

### Authenticate with Cloudflare

```bash
wrangler login
```

This opens your browser to authenticate. Follow the prompts.

### Create a KV Namespace (for rate limiting)

```bash
wrangler kv:namespace create "RATELIMIT"
```

Copy the namespace ID returned. Update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "KV"
id = "your-copied-id-here"
```

### Set the Anthropic API Key

```bash
wrangler secret put ANTHROPIC_API_KEY
```

Paste your Anthropic API key. It's never stored in code, only in Cloudflare's secure vault.

Get your API key at: https://console.anthropic.com/account/keys

### Deploy the Worker

```bash
wrangler deploy
```

Output will show your worker URL:
```
✓ Deployed to https://calm-ambition-checkin.workers.dev
```

**Save this URL.** You'll need it in the next step.

## 2. Update the Check-In Page

The check-in page needs to know where to send readout requests.

In `check-in/index.html`, find this line (around line 380):

```javascript
const response = await fetch('https://worker-url.workers.dev/readout', {
```

Replace `https://worker-url.workers.dev` with your actual worker URL from step 1.

Example:
```javascript
const response = await fetch('https://calm-ambition-checkin.workers.dev/readout', {
```

## 3. Email Delivery Setup

Readouts are emailed via Formspree (your existing contact form endpoint).

Formspree will automatically send emails to the address submitted. You already have the endpoint (`mkoepynv`) wired up in the check-in page.

### Custom Email Template (Optional)

By default, Formspree sends a simple email. To add a nice template, you can create a custom email with your branding in the check-in page before submitting to Formspree. The current code sends the readout JSON as a field, but you may want to format it nicer.

For now, the default works. Later you can enhance this.

## 4. Service Worker Cache Handling

The site uses a service worker. The check-in page can get stale cache issues on mobile.

**Option A: Exclude from SW caching (simplest)**

In your service worker registration (if you have one), add:

```javascript
// Exclude check-in from caching
if (!request.url.includes('/check-in/')) {
  // cache as normal
}
```

**Option B: Version-bust on deploy**

In `check-in/index.html`, add a cache-buster query param:

```html
<link rel="stylesheet" href="styles.css?v=2024-06-12">
```

Bump the `v` parameter each time you deploy.

## 5. Testing

### Test locally first

Start the preview server:

```bash
npm run dev
```

Navigate to `http://localhost:3456/check-in/` (adjust port if different).

Fill out the quiz with test data. If the worker isn't deployed yet, you'll see an API error at the loading step — that's expected.

### Test after worker deployment

1. Complete the quiz all the way through
2. Enter an email address
3. Check that Formspree receives the submission (you'll see it in your Formspree dashboard)
4. Verify the readout generates without em dashes (critical for brand compliance)

### Test on mobile

After deploying to GitHub Pages:

1. Open https://calmambition.github.io/Calm-ambition/check-in/ on a real phone (iOS or Android)
2. Complete the quiz
3. Refresh the page
4. Verify it loads the latest code, not a cached version
5. Check the email arrives

If you see stale content on mobile, add version-busting to the CSS/JS includes (Option B above).

## 6. Monitoring & Rate Limiting

The Worker rate-limits to 10 requests/hour per IP. This is stored in your KV namespace and resets hourly.

If a user hits the limit, they get:
```json
{ "error": "Rate limited. Try again in 1 hour." }
```

No personal data is logged. Only status codes and timing.

### Check usage in Cloudflare Dashboard

1. Log in to Cloudflare
2. Navigate to Workers > calm-ambition-checkin
3. Metrics tab shows request counts, errors, and latency

## 7. Analytics

The check-in page includes Google Analytics tracking:
- `check_in_view` when the page loads
- You can add more events in the `trackEvent()` function if needed

Currently tracked:
- Page view on load
- (Future: quiz start, completion, readout viewed, CTA clicked)

## 8. Troubleshooting

**Worker returns 403 CORS error**

Check that your site origin is `https://calmambition.github.io`. The Worker only allows requests from this origin.

**Worker returns 502 (JSON parse error)**

Claude's response didn't parse as valid JSON. The prompt might need tweaking, or Claude returned incomplete output. Check:
1. Is `ANTHROPIC_API_KEY` set correctly?
2. Is the model ID correct? (Should be `claude-sonnet-4-20250514`)
3. Try retrying the quiz — sometimes the API hiccups

**Email not arriving**

Check Formspree dashboard at https://formspree.io to see:
1. Did the submission come through?
2. Is the email address valid?
3. Check spam/promotions folder

**Stale content on mobile**

The service worker is caching an old version. Either:
1. Clear the app cache (Settings > Storage > Clear all data)
2. Use Option B version-busting on next deploy
3. Hard refresh (Cmd+Shift+R on desktop, or in browser settings on mobile)

## Cost Notes

- **Cloudflare Workers:** Free tier covers 100,000 requests/day. You'll stay well under this.
- **Anthropic API:** ~0.02 AUD per readout. Hundreds of leads/month costs a few dollars.
- **Formspree:** Free tier handles emails fine.

Set a spend limit in Anthropic console anyway: https://console.anthropic.com/account/billing

## Deployment Checklist

- [ ] Wrangler installed and authenticated
- [ ] KV namespace created and ID in wrangler.toml
- [ ] Anthropic API key set via `wrangler secret put`
- [ ] Worker deployed successfully
- [ ] Worker URL copied and pasted into check-in/index.html
- [ ] check-in link added to main site nav
- [ ] Service worker cache handling configured
- [ ] Test quiz completed locally
- [ ] Test quiz completed on staging/production
- [ ] Mobile testing done (real device, not just browser emulation)
- [ ] Email received from Formspree
- [ ] Readout checked for em dashes (should be zero)
- [ ] Analytics events firing in GA dashboard
