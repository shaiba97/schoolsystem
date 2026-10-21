# Platform Console — Decisions

Append-only log for the provider control plane (`system/`, port 5800). Mirrors
the per-app convention from `admin/DECISIONS.md`; cross-app decisions also land
in the repository-level `DECISIONS.md`.

## 2026-10-21 — P0 scaffold

- **Port 5800** confirmed by product owner (academic 5000, teacher 5100,
  student 5200, guardian 5300, admin 5400, financial 5500, receptionist 5600,
  transport 5700, backend 3000).
- **Separate app, not an admin section.** The console is its own Next app so a
  school-level JWT can never satisfy its guard by cookie sharing; the platform
  JWT lives in its own `sys_token` cookie and carries `scope: 'platform'`.
- **No tenant cookie/header.** Platform endpoints are cross-tenant; tenant
  context is an explicit path/query argument per endpoint. The
  `/api/backend` proxy forwards only `Authorization`.
- **Base-nova, English only** (matches admin; `rtl: false` in
  `components.json`).
- **Auth plumbing mirrors admin** (`proxy.ts` cookie-presence guard,
  `/api/session/login|logout`, `/api/backend/[[...path]]` proxy,
  `lib/api/session.ts` + `client.ts`) so all portals stay one pattern.
- **Nav role gates are UX only.** `SUPER_ADMIN` vs `SUPPORT` visibility is a
  sessionStorage hint; the backend `PlatformAdminGuard` + role checks remain
  the source of truth.
- **Routes reserved now** so proxy/nav never 404: `/dashboard`, `/tenants`,
  `/tenants/new`, `/tenants/[schoolId]`, `/licensing`, `/health`, `/audit`.
  Sub-pages land in their phases; the dashboard is a shortcut shell until the
  stats endpoint exists (no fabricated numbers).

## 2026-10-21 (P2) - Console reads the platform API

- **Dashboard** (`/dashboard`, `force-dynamic`): server-rendered from `GET /platform/stats` - schools, MRR, collected revenue, renewals due, schools by status (bar per status), and a commercial summary. Numbers use `font-mono`; no fabricated values - a failed fetch renders an explicit "Platform metrics unavailable" state instead of zeros.
- **Directory** (`/tenants`): client component with debounced-free search (name/slug/email), status chips, paginated table (20/page), per-row link to the detail page. Loading = shape-matched skeletons, empty = a written empty state, errors = inline message.
- **Tenant detail** (`/tenants/[schoolId]?tab=overview|modules|billing|data`): server fetch + client tabs. Overview (profile, usage counts, last 20 platform actions), Modules (one switch per portal), Billing (licenses + invoices), Feature flags (switches). Write controls are hidden for SUPPORT and enforced by the backend regardless; the tab is mirrored into the URL query.
- **Design read**: internal operator console, data-dense (VISUAL_DENSITY ~7), neutral base with the shadcn base-nova theme, no marketing chrome, no fake data anywhere.

## 2026-10-21 (P3/P4) - Audit log, announcements, and the provisioning wizard

- **`/audit`**: client table over `GET /platform/audit` with an action filter (applied on submit, not per keystroke), 25 rows a page, and a before/after column that renders `key: old -> new` from the audit payload.
- **`/announcements`** (new route, SUPER_ADMIN only): publish form (title, message, severity) plus a list where a switch withdraws or restores an announcement. The route is an addition to the reserved route list - broadcast needs a surface of its own; recorded here so the deviation is deliberate.
- **`/tenants/new`**: four-step wizard (School -> Plan and portals -> Administrator -> Review) with per-step validation, a live slug derived from the name, plan and portal/flag pickers, and a completion panel that states the administrator credentials one last time and links to the new school. Success and failure are both explicit; the wizard never fabricates a plan list - when the backend has no active plan it says so and provisions without a license.

## 2026-10-21 - Financial Affairs console (`/financials`)

- **Four tabs** in one route, tab mirrored into the query string: P&L Overview (revenue, expenses, net profit and margin in USD; a card per market with local income, local costs and the net converted to USD; a consolidated per-market table), Subscriptions (school, tier, local price and currency, USD value, term, payment status, actions), Currencies (code, rate to 1 USD, auto-sync switch, last updated, inline rate edit) and Expenses (cost, category, country allocation, amount, date paid).
- **Actions** are SUPER_ADMIN-only and hidden for support accounts: record a payment (dialog with amount, currency, method, date, reference, notes), issue a receipt for money already received, view a school's payment history, and log a platform expense.
- **Honest numbers**: a school whose currency has no configured rate shows "no rate for XXX" instead of a converted figure, and its status reads UNPRICED. The P&L reports how many payments and expenses could not be converted rather than folding them into the totals.
- **Country codes, not flag emoji**: Windows renders flag emoji as letter pairs, so a market is identified by its ISO code badge.
