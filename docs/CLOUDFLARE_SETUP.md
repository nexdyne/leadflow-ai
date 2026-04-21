# Cloudflare setup (abatecomply.com + nexdynegroup.com)

LeadFlow AI uses Cloudflare for DNS and edge protection on both
domains. This doc is the click-path for wiring each domain to the
right backend (Railway for the app, Resend/Cloudflare Email Routing
for mail).

---

## Domain layout

| Domain                 | Role                                         |
| ---------------------- | -------------------------------------------- |
| `abatecomply.com`      | Public app → routes to Railway               |
| `nexdynegroup.com`     | Company / brand site + email sending domain  |
| `mail.nexdynegroup.com`| Subdomain dedicated to Resend outbound mail  |

Both zones live on the same Cloudflare account. If they don't yet,
add the missing zone under **Websites → Add a site**, choose the
**Pro** plan (David already pays for this), and update the registrar
nameservers to the two Cloudflare NS records shown. Propagation is
~2 hours.

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
   | CNAME | `@`   | `<your>.up.railway.app`     | 🟠 Proxied |
   | CNAME | `www` | `abatecomply.com`           | 🟠 Proxied |

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

## 2. `nexdynegroup.com` → marketing site (if any)

If you don't have a separate marketing site yet, leave the root
pointing at a placeholder. For now the only thing the zone *needs*
is the `mail.nexdynegroup.com` subdomain wired up for Resend.

If you later add a marketing site on Webflow / Framer / Vercel, add
its CNAME under `@` and `www` the same way as abatecomply.com.

---

## 3. `mail.nexdynegroup.com` → Resend (outbound)

Resend verifies a subdomain, not the bare domain, so keep this
on `mail.nexdynegroup.com`.

1. In Resend, **Domains → Add Domain → `mail.nexdynegroup.com`**.
2. Resend shows four records. In Cloudflare DNS for
   `nexdynegroup.com`, add each one **exactly** as shown, with
   **Proxy status: DNS only** (gray cloud). Orange cloud breaks mail.

   Typical records (your exact values will differ slightly):

   | Type | Name                           | Content                              |
   | ---- | ------------------------------ | ------------------------------------ |
   | MX   | `mail`                         | `feedback-smtp.us-east-1.amazonses.com` (priority 10) |
   | TXT  | `mail`                         | `v=spf1 include:amazonses.com ~all`  |
   | TXT  | `resend._domainkey.mail`       | `p=…` (long DKIM string)             |
   | TXT  | `_dmarc.mail`                  | `v=DMARC1; p=none; rua=mailto:support@nexdynegroup.com` |

3. Back in Resend click **Verify DNS Records**. Wait 5-15 min.

---

## 4. Receiving mail at `support@nexdynegroup.com` and `admin@nexdynegroup.com`

Resend handles **outbound only**. For inbound mail you have two good
options:

### Option A: Cloudflare Email Routing (free, simplest)
1. In Cloudflare → the `nexdynegroup.com` zone → **Email → Email
   Routing → Get Started**.
2. Cloudflare auto-adds the required MX and SPF records. It will
   warn you if your existing records conflict — let it resolve the
   conflict by replacing them.
3. Under **Routing rules**, create two custom addresses:
   - `support@nexdynegroup.com` → forwards to your personal inbox
   - `admin@nexdynegroup.com` → forwards to your personal inbox
4. Verify the destination inbox (Cloudflare sends a confirmation
   email you have to click).

Limits: Cloudflare Email Routing is **forwarding only** — you can
reply from your personal inbox but the reply will go out from that
personal address, not from `support@nexdynegroup.com`. Fine for
low-volume triage, awkward once a real team is handling support.

### Option B: Google Workspace or Fastmail (paid, proper)
If you want a real mailbox at `support@nexdynegroup.com` that you can
log into and reply from:
1. Sign up for Google Workspace ($6/user/mo) or Fastmail ($5/user/mo).
2. They'll give you MX + SPF records. Delete Cloudflare Email Routing
   if you had it on, then add the provider's records.
3. **Important:** if you also have Resend's MX record on `mail.`,
   those are on the subdomain — they don't conflict with MX records
   on the root `nexdynegroup.com`.

Recommendation: start with **Option A** (free, 10-minute setup). Move
to Option B when support volume justifies a real mailbox.

---

## 5. Cloudflare security settings (both zones)

Under each zone's **Security** section:

- **WAF → Managed rules**: on, default ruleset. Cloudflare Pro's
  managed rules block most garden-variety attacks without config.
- **Bots → Bot Fight Mode**: on. The landing page support form has
  its own rate limiting (10/hour/IP) but Bot Fight Mode filters out
  obvious scrapers before they hit your origin.
- **DDoS → HTTP DDoS attack protection**: on (it's on by default).
- **Rate Limiting Rules**: skip unless you see abuse. The 10/hour/IP
  limit in the support controller is usually enough.

Under **Speed**:
- **Brotli**: on
- **Auto Minify** (HTML/CSS/JS): on — harmless, small wins
- **Early Hints**: on (only matters once you serve HTML from edge)

Under **Caching → Configuration**:
- **Browser Cache TTL**: Respect existing headers (Railway sends its
  own)
- **Always Online**: on — serves a cached copy if Railway is down

---

## 6. Page Rules (optional)

For abatecomply.com you usually don't need page rules — the default
behavior is correct. One useful one if you add a blog or marketing
path:

- `abatecomply.com/blog/*` → Cache Level: Cache Everything
- `abatecomply.com/api/*`  → Cache Level: Bypass (Railway sends
  Cache-Control headers but this is explicit insurance)

---

## 7. Verifying the whole picture

After all of the above, you should be able to:

- **Load the app:** `https://abatecomply.com` → LandingPage renders
  over HTTPS with a Cloudflare cert.
- **Hit the API:** `https://abatecomply.com/api/health` returns
  `{"status":"ok","timestamp":"…"}`.
- **Submit support:** the landing page form succeeds and an alert
  email appears in `support@nexdynegroup.com` within 30 seconds.
- **Sign in:** `admin@nexdynegroup.com` with the password you
  captured in the bootstrap log lets you into Platform Admin.
- **No MX conflicts:** `dig MX nexdynegroup.com` shows either the
  Cloudflare Email Routing MX (Option A) or your Workspace/Fastmail
  MX (Option B), not both.
