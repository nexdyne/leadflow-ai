# Cloudflare setup (abatecomply.com)

LeadFlow AI runs on a single Cloudflare zone: `abatecomply.com`. That
one zone serves three roles:

1. **DNS + edge protection** for the app (CNAME to Railway)
2. **Outbound mail auth** for Resend (SPF/DKIM/DMARC + bounce MX)
3. **DNS for inbound Google Workspace mail** at `admin@abatecomply.com`
   and `support@abatecomply.com`

This doc is the click-path for wiring each of those up.

> **Historical note:** Earlier plans split LeadFlow (abatecomply.com)
> from NexDyne Consulting (nexdynegroup.com). That's out — see
> `EMAIL_SETUP.md` section 1 for why. Everything now lives on one zone.

---

## 1. `abatecomply.com` → Railway

Railway gives you a public hostname like
`leadflow-production.up.railway.app`. To serve the app from
`abatecomply.com`:

1. In Railway, go to the LeadFlow service → **Settings → Networking
   → Custom Domains → + Custom Domain** and type `abatecomply.com`.
   Railway gives you a CNAME target, e.g. `r.railway.app`.
2. Also add `www.abatecomply.com` the same way.
3. In Cloudflare DNS for `abatecomply.com`, add:

   | Type  | Name  | Target                      | Proxy   |
   | ----- | ----- | --------------------------- | ------- |
   | CNAME | `@`   | `<your>.up.railway.app`     | Proxied |
   | CNAME | `www` | `abatecomply.com`           | Proxied |

   Cloudflare supports CNAME at the zone apex (CNAME flattening), so
   `@ → CNAME` works fine.
4. In Cloudflare → **SSL/TLS → Overview**, set encryption mode to
   **Full (strict)**. Railway issues a valid cert, so strict mode
   works end-to-end.
5. In Cloudflare → **SSL/TLS → Edge Certificates**, turn on **Always
   Use HTTPS** and **Automatic HTTPS Rewrites**.

It takes ~60 seconds for Railway to detect the CNAME and issue the
cert. When you refresh the Railway Custom Domains page both entries
should show a green "Active" badge.

**Verifying:**
- `curl -I https://abatecomply.com` returns `200` and
  `server: cloudflare`.
- `https://abatecomply.com/api/health` returns
  `{"status":"ok","timestamp":"…"}`.

---

## 2. Resend outbound on the same zone

Verified in Resend 2026-04-13. Four records live on the
`abatecomply.com` zone. The trick is that they coexist with Google
Workspace's inbound MX — SPF just needs BOTH includes, and the bounce
MX at priority 10 sits behind Google's priority 1.

| Type | Name                    | Content                                                           | Proxy |
| ---- | ----------------------- | ----------------------------------------------------------------- | ----- |
| MX   | `@`                     | `feedback-smtp.us-east-1.amazonses.com` (priority 10)             | DNS only |
| TXT  | `@`                     | `v=spf1 include:amazonses.com include:_spf.google.com ~all`       | DNS only |
| TXT  | `resend._domainkey`     | `p=…` (long DKIM string Resend generates)                         | DNS only |
| TXT  | `_dmarc`                | `v=DMARC1; p=none; rua=mailto:support@abatecomply.com`            | DNS only |

All four must be **Proxy status: DNS only** (gray cloud). Orange-cloud
proxying rewrites TXT/MX content and breaks validation.

**Why only one SPF record:** SPF requires exactly one TXT record at
the zone root. If you have two — one for Resend, one for Google — mail
servers will hard-fail SPF for both. Combine them into a single record
with both `include:` directives.

---

## 3. Google Workspace inbound on the same zone

Workspace provides the mailboxes for `admin@abatecomply.com` and
`support@abatecomply.com`. Workspace's DNS requirement is a single MX
record at the zone root:

| Type | Name | Content                       | Priority | Proxy |
| ---- | ---- | ----------------------------- | -------- | ----- |
| MX   | `@`  | `smtp.google.com`             | 1        | DNS only |

(Older Workspace docs list five separate records pointing at
`aspmx.l.google.com` + four `altN.aspmx.l.google.com`. The single
`smtp.google.com` is the newer default — either shape works, don't
mix them.)

**Why Google and Resend's bounce MX coexist:** MX priority determines
which server gets tried first for incoming mail. Google is priority 1;
Resend's bounce MX is priority 10. Incoming mail always hits Google.
The priority-10 record only matters for Amazon SES bounce callbacks,
which are the only thing ever delivered there. Nothing routes to your
Workspace inbox through the priority-10 record.

Verify with a manual MX lookup (e.g. <https://mxtoolbox.com> or
`dig MX abatecomply.com` from a machine with working DNS):

```
abatecomply.com. MX 1  smtp.google.com.
abatecomply.com. MX 10 feedback-smtp.us-east-1.amazonses.com.
```

If you only see one, the other record didn't get saved. Add it.

---

## 4. Cloudflare security settings

Under **Security**:

- **WAF → Managed rules**: on, default ruleset. Cloudflare Pro's
  managed rules block most garden-variety attacks without config.
- **Bots → Bot Fight Mode**: on. The landing page support form has
  its own rate limiting (10/hour/IP) but Bot Fight Mode filters out
  obvious scrapers before they hit your origin.
- **DDoS → HTTP DDoS attack protection**: on (default).
- **Rate Limiting Rules**: skip unless you see abuse. The 10/hour/IP
  limit in the support controller is usually enough.

Under **Speed**:
- **Brotli**: on
- **Auto Minify** (HTML/CSS/JS): on
- **Early Hints**: on

Under **Caching → Configuration**:
- **Browser Cache TTL**: Respect existing headers (Railway sends its
  own)
- **Always Online**: on — serves a cached copy if Railway is down

---

## 5. Page Rules (optional)

Usually unnecessary — Cloudflare's defaults are correct. One useful
pair if you ever add a blog or marketing path:

- `abatecomply.com/blog/*` → Cache Level: Cache Everything
- `abatecomply.com/api/*`  → Cache Level: Bypass (Railway sends
  Cache-Control headers but this is explicit insurance)

---

## 6. Verifying the whole picture

After all of the above, you should be able to:

- **Load the app:** `https://abatecomply.com` → LandingPage renders
  over HTTPS with a Cloudflare cert.
- **Hit the API:** `https://abatecomply.com/api/health` returns
  `{"status":"ok","timestamp":"…"}`.
- **Submit support:** the landing page form succeeds, an ack email
  arrives in the submitter's inbox within 30 seconds, and an alert
  email arrives in the Google Workspace inbox for
  `support@abatecomply.com`. The "from" on both is
  `noreply@abatecomply.com`.
- **Sign in:** `admin@abatecomply.com` with the password you captured
  in the bootstrap log lets you into Platform Admin.
- **MX shape:** `dig MX abatecomply.com` (or mxtoolbox) returns
  exactly two records — Google at priority 1 and Resend's bounce MX
  at priority 10. Anything else means a stray record needs cleaning
  up.
