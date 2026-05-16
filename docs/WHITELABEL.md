# Whitelabel CMS subdomains

Give each client a branded CMS URL (e.g. `cms.searchhub.digital`) that
points to the same Studio deployment. Each client only ever sees their own
workspace — no cross-tenant leakage in the UI.

## How it works

1. The Studio app reads `Host` on every request.
2. `lib/host.ts` looks up that host against `sites.cms_domain`.
3. If matched:
   - "/" auto-redirects into that site's workspace (no workspace picker)
   - The topbar workspace switcher hides every other workspace
   - `/admin` is inaccessible (returns to "/")
   - The whole UI uses that site's brand colour
4. Your master domain (`admin.fousventures.com`) keeps full multi-workspace
   + platform-admin access for your team.

## Per-client setup (~5 min each)

For each subdomain you want to add — `cms.searchhub.digital`,
`cms.kingsbridgeimmigration.ca`, `cms.clona.my`, `cms.vantageprinters.com`:

### Step 1 — Vercel (add the domain to your Studio project)

1. Vercel → Studio project → **Settings → Domains** → **Add Domain**.
2. Type `cms.searchhub.digital` → Continue.
3. Vercel shows the DNS record to add. Note it down (it's always
   `cname.vercel-dns.com` for a subdomain).

> Vercel's Hobby plan = 50 domains/project. Pro = unlimited.

### Step 2 — Client's DNS (CNAME the subdomain to Vercel)

At the client's DNS host (Route 53, Cloudflare, GoDaddy, etc.):

```
Type:  CNAME
Name:  cms
Value: cname.vercel-dns.com
TTL:   300
```

**Do NOT** CNAME to `cms.fousventures.com`. Vercel rejects requests whose
`Host` header it doesn't recognise — daisy-chaining DNS doesn't help.

Wait 1–5 min. Vercel auto-issues a Let's Encrypt cert.

### Step 3 — Studio (tell Studio which workspace this host belongs to)

`https://admin.fousventures.com/searchhub/settings` → **Custom CMS
subdomain** = `cms.searchhub.digital` → Save.

The host cache invalidates immediately, so visiting
`https://cms.searchhub.digital` now lands the user directly in the
SearchHub workspace.

### Step 4 — Verify

1. Visit `https://cms.searchhub.digital`
2. Sign in as a user with SearchHub membership.
3. They should land in the SearchHub workspace.
4. Workspace switcher in the topbar shows **only** SearchHub.
5. Visiting `/admin` or `/clona` directly redirects them back to `/searchhub`.

## Cross-site editors

A single user CAN have membership across multiple sites — the membership
table just gates which workspaces are visible from where:

| User visits via... | Sees in switcher |
|---|---|
| `admin.fousventures.com` | All sites they're a member of + Platform Admin (if applicable) |
| `cms.searchhub.digital` | SearchHub only |
| `cms.clona.my` | Clona only |

So if your contractor Ada has `editor` on SearchHub + `editor` on Clona:
- She can do SearchHub work at `cms.searchhub.digital`
- She can do Clona work at `cms.clona.my`
- She can manage both from `admin.fousventures.com`

Each client never knows she also works on the other site.

## When NOT to use whitelabel

Skip the per-client subdomain if:

- The client is fine using `admin.fousventures.com` (no branding concern)
- It's a short-term engagement
- The client's DNS is locked down and you can't get a CNAME added

Your master `admin.fousventures.com` always works for every site you
manage. Whitelabel domains are purely an optional client-experience layer.

## What about wildcard `*.fousventures.com`?

Available on Vercel **Pro/Enterprise** plans only ($20/mo+). With a
wildcard, you'd add `*.fousventures.com` once and any new subdomain
(`acme.fousventures.com`, `widgets.fousventures.com`) automatically
resolves to the Studio project without a per-domain add. You'd still set
`cms_domain` in Studio Settings for each one.

Not needed if you're staying under ~50 sites or running on Hobby.
