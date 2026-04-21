# Cloudflare setup (abatecomply.com + nexdynegroup.com)

LeadFlow AI uses Cloudflare for DNS and edge protection on both
domains. This doc is the click-path for wiring each domain to the
right backend (Railway for the app, Resend/Cloudflare Email Routing
for mail).

---

## Domain layout

| Domain                  | Role                                              |
| ----------------------- | ------------------------------------------------- |
| `abatecomply.com`       | LeadFlow AI public app **and** Resend sender (root verified in Resend 2026-04-13) |
| `nexdynegroup.com`      | NexDyne Consulting brand site + real inboxes (`support@`, `admin@`) |
| `mail.nexdynegroup.com` | Subdomain for future NexDyne Consulting outbound (not yet set up) |

Both root zones live on the same Cloudflare account. If they don't
yet, add the missing zone under **Websites → Add a site**, choose the
**Pro** plan (David already pays for this), and update the registrar
nameservers to the two Cloudflare NS records shown. Propagation is
~2 hours.

**Why the two domains are asymmetric:** `abatecomply.com`'s only role
is the LeadFlow app, so sending outbound mail from the root is clean
— there's no other product sharing its sending reputation. But
`nexdynegroup.com` is a consulting brand zone with real receive-only
inboxes (`support@`, `admin@`) on the root, so its outbound has to
live on a subdomain (`mail.nexdynegroup.com`) to keep Resend's bounce
MX from colliding with Cloudflare Email Routing's inbound MX.

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

## 3. Resend sending domains (outbound)

**`abatecomply.com` root (LeadFlow) — already live.** Verified in
Resend 2026-04-13. Four DNS records are on the abatecomply.com zone:
MX (bounces), SPF TXT, DKIM TXT (`resend._domainkey`), DMARC TXT
(`_dmarc`). All with **Proxy status: DNS only** (gray cloud). No
action needed unless Resend flags the domain as failing — then check
that nothing has orange-cloud-proxied those records.

### `mail.nexdynegroup.com` (future — NexDyne Consulting outbound)

Do this when NexDyne Consulting actually needs to send mail. LeadFlow
doesn't depend on it.

1. In Resend, **Domains → Add Domain → `mail.nexdynegroup.com`**.
   Important: **subdomain only**, not the bare `nexdynegroup.com`.
   The root is reserved for inbound mail (Email Routing) — adding
   Resend's MX on the root would collide with the inbound MX.
2. Resend shows four records. In Cloudflare DNS for the
   `nexdynegroup.com` zone, add each one **exactly** as shown, with
   **Proxy status: DNS only** (gray cloud). Orange cloud rewrites
   TXT/MX content and breaks mail.

   Expected shape (Resend generates the exact DKIM string for you):

   | Type | Name                           | Content                              |
   | ---- | ------------------------------ | ------------------------------------ |
   | MX   | `mail`                         | `feedback-smtp.us-east-1.amazonses.com` (priority 10) |
   | TXT  | `mail`                         | `v=spf1 include:amazonses.com ~all`  |
   | TXT  | `resend._domainkey.mail`       | `p=…` (long DKIM string)             |
   | TXT  | `_dmarc.mail`                  | `v=DMARC1; p=none; rua=mailto:support@nexdynegroup.com` |

   The DMARC `rua=` pointing at `support@nexdynegroup.com` is fine —
   that's just the reporting inbox and doesn't need to be on the
   sending domain.

3. Back in Resend click **Verify DNS Records**. Wait 5-15 min. Once
   all four show ✅, the subdomain can send.

4. **One Resend API key sends from any verified domain** in the
   account — you don't need a new key. The `FROM_EMAIL` env var in
   whatever system uses NexDyne's outbound (different project from
   LeadFlow) is what pins sending to `mail.nexdynegroup.com`.
   LeadFlow's `FROM_EMAIL` stays pointed at `noreply@abatecomply.com`.

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
  email appears in `support@nexdynegroup.com` within 30 seconds. The
  "from" on that alert should be `noreply@abatecomply.com`.
- **Sign in:** `admin@nexdynegroup.com` with the password you
  captured in the bootstrap log lets you into Platform Admin.
- **No MX conflicts:** `dig MX abatecomply.com` shows only Resend's
  bounce MX (`feedback-smtp.us-east-1.amazonses.com`). `dig MX
  nexdynegroup.com` shows either the Cloudflare Email Routing MX
  (Option A) or your Workspace/Fastmail MX (Option B) — not both.
  The future `mail.nexdynegroup.com` subdomain (when you add it) has
  its own MX on the subdomain that doesn't collide with the
  nexdynegroup.com root MX.
