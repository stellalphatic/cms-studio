# Studio CMS — Documentation Index

Start here, then drill down as needed.

| Doc | Read when… |
| --- | --- |
| [`SETUP.md`](./SETUP.md) | First-time setup: Supabase project, Vercel deploy, Resend, Turnstile, first super-admin, troubleshooting login/redirect issues. |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | You want to understand how Studio + Supabase + the public sites fit together. What's live vs rebuilt. Where data flows. |
| [`INTEGRATION.md`](./INTEGRATION.md) | You're a developer manually wiring an existing or new site to the CMS. Full step-by-step playbook. |
| [`AGENT_INTEGRATION_PROMPT.md`](./AGENT_INTEGRATION_PROMPT.md) | You want an **AI coding agent** (Cursor, Claude Code, GPT-5, Cline…) to do the integration for you. Paste this into the agent. |
| [`MIGRATION_AND_ROLLOUT.md`](./MIGRATION_AND_ROLLOUT.md) | You're rolling Studio out to an already-live site and need a hybrid (legacy + CMS) strategy. |
| [`WHITELABEL.md`](./WHITELABEL.md) | A client wants their own `cms.theirdomain.com`. |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | You're deploying Studio (Vercel) or a public site (Amplify / Vercel / Netlify / Cloudflare). |

## In-app shortcuts (for humans, not docs)

- **Workspace switcher** → top of the sidebar.
- **Integration page** (env vars, smoke tests, deploy-hook help)
  → workspace → "Integration" (admin only).
- **API Keys** → workspace → "API Keys" (admin only).
- **Settings → Deploy hook URL** — paste your host's deploy-hook URL here.
- **Admin → People** — invite teammates anywhere on the platform and
  promote them to platform admin.
- **Admin → Sites** — create new workspaces. You're auto-granted `owner`.
