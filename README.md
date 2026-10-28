# tamaz portals (frontend)

The web app of the Tamaz clear-aligner platform: four portals (patient, clinic, doctor and admin) in four languages (English, Arabic, French, Spanish).
Built with Next.js 16 (App Router), React 19, TypeScript and Tailwind CSS 4, from the Claude Design project "Tamaz shared screens".

It is a separate repository from the backend, [`tamaz-portal`](https://github.com/Rugoria/tamaz-portal) (Spring Boot, database, API tests). This app shares no code with it and only talks to it over HTTP.

## The portals

Every route starts with a language: `/en`, `/ar`, `/fr` or `/es`.

| Portal | Routes | Main screens |
|---|---|---|
| Sign in | `/login`, `/register`, `/register/doctor`, `/forgot-password`, `/reset-password` | Sign in, patient sign-up, doctor registration, password reset |
| Patient | `/customer/*` | My aligners (progress), messages, clinics, appointments (book, change, cancel), notifications, account |
| Clinic and doctor | `/clinic/*` and `/doctor/*` (one shared tree, different menu) | Overview, patients, cases, messages, appointments (clinics), profile, notifications, account |
| Admin | `/admin/*` | Overview numbers, submissions, cases, patients, accounts, views (grid templates), messages, integration settings, audit log |

The case page is a step-by-step flow for clinics and doctors: required records (STL scans with 3D previews, photos, X-rays), treatment plan, delivery, payment and send. After a send it shows the case's progress and, when the manufacturer has made a plan, a panel to approve it or ask for changes.
Status changes, notifications and chat appear on open pages as they happen (see "Live updates").

## Tech stack

| Part | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript 5 |
| Styling | Tailwind CSS 4; design tokens in `app/globals.css`; our own small component set in `components/ui` (no shadcn/ui) |
| Data | SWR for reads, a small `api()` client for writes |
| Languages | next-intl for routing and formatting; our own message catalog (see "Languages") |
| 3D | three.js, loaded on demand for the STL previews |

## Getting started

You need Node 20.9 or newer (developed on 22) and the backend running (its README explains Postgres, Redis and the backend itself). Start the backend with `--app.clearmoves.mode=stub` to move a case through the manufacturer steps with the admin simulator.

```bash
cp .env.example .env.local      # set BACKEND_URL if the backend is not on http://localhost:8080
npm install
npm run dev                     # http://localhost:3000
```

| Variable | Purpose |
|---|---|
| `BACKEND_URL` | Where the Spring Boot backend runs. Server-side only, never sent to the browser. Set it when you build and when you start |
| `BACKEND_PROXY_SECRET` | Production only. Sent as `X-Tamaz-Proxy-Secret` on every backend call; nginx in front of the backend refuses calls without it. Server-side only. Leave unset locally |
| `NEXT_PUBLIC_SHOW_PENDING` | `true` (default) shows the preview-only screens, `false` hides them all (see "Preview-only screens") |
| `NEXT_DIST_DIR` | Optional. Lets a second dev server run beside the first, for example `NEXT_DIST_DIR=.next-test npx next dev -p 3002` |

Demo accounts come from the backend's seed script (`scripts/api-tests/seed_demo.mjs` in the backend repository).

## How it talks to the backend

The browser only calls this app, so the backend needs no CORS settings. Four route handlers in `app/api` do the work:

| Route | What it does |
|---|---|
| `session/[action]` | Signs in or up and keeps the JWT in an httpOnly cookie, so the token never reaches page scripts |
| `[...path]` | Forwards every other `/api/*` call to the backend with that token, and passes on the visitor's address in `X-Client-IP` for the backend's rate limits |
| `events` | The live-update stream. It has its own route because it never finishes, so it must be streamed straight through and not buffered |
| `preferences/language` | Saves or clears the "remember my language" cookie |

`lib/types.ts` mirrors the backend's response shapes by hand. When the backend changes a response, change them together: backend first with an addition that keeps the old shape working, then this repository, then remove the old part.

## Live updates

One server-sent-event stream per browser tab (`lib/realtime.ts`, started by `components/realtime/RealtimeProvider`). Messages only say what changed (a type and an id); the page then refetches that data through the normal API, so permissions are still checked.
The stream closes in a hidden tab and reopens, with one refresh, when you come back. While it is open, the old polling slows down to a safety net; without it the screens poll as before.

## Languages

English (US), Arabic, French and Spanish are available on every screen. Without a language in the address, the app uses a saved preference, then the browser language, then English; a language in the address always wins.
Selecting a language changes the screen at once. **Remember my language on this device** stores it in an httpOnly cookie for one year; clearing it removes it. Arabic uses right-to-left layout, and dates and calendar labels follow the language.
Names, record contents, chat messages and email or notification bodies are shown as supplied and are not translated.

- Interface text goes through `useT()`; the English wording is the key and doubles as the fallback. Never use it on user content.
- To add or change wording, edit `messages/translations.tsv` (`English|ar|fr|es`, one row per string, keep named placeholders such as `{from}`), then run `npm run messages:build` to regenerate the JSON catalogs.
- `node scripts/extract-new-strings.mjs <files>` lists strings in those files that still have no translation; `scripts/check-strings.mjs` and `scripts/merge-strings.mjs` are the other helpers.
- Translations should get a native-speaker review before a public release.

**Currency.** Amounts stay in USD. `formatCurrency(amount, locale)` in `lib/format.ts` formats with the language's separators, always shows `USD` and two decimals, and shows nothing for a missing amount. In client screens use `const {currency} = useLocalizedFormats()` and render `<bdi>{currency(amount)}</bdi>` so the amount reads correctly in Arabic. Pass dollars, not cents.

## Preview-only screens

Things the client has not decided yet (patient records beyond the name, photos and X-rays, treatment plan, delivery form, virtual setup approval, tracking numbers, payments, per-case chat) are built as UI that saves nothing and carries a "Pending client decision" or "Preview only" tag. Set `NEXT_PUBLIC_SHOW_PENDING=false` to hide them all. They never show database data.

## Project layout

| Path | What is in it |
|---|---|
| `app/[locale]/(auth)` | Sign in, sign-up, doctor registration, password reset |
| `app/[locale]/customer` | Patient portal |
| `app/[locale]/[role]` | Clinic (`/clinic`) and doctor (`/doctor`) portals |
| `app/[locale]/admin` | Admin portal |
| `app/api` | The four route handlers above |
| `components/ui` | Button, Chip, Dialog, Table, Tabs, Toast, form fields, empty, error and loading states |
| `components/shell` | Sidebar (staff, admin), the patient top bar and phone tab bar |
| `components/case`, `grid`, `features`, `profile`, `patient`, `views`, `admin`, `realtime` | The pieces of those screens: case flow, data grids, messages and notifications, profile, patient dialogs, view templates, admin settings, live updates |
| `lib` | API client, hooks, types, status labels, dates, currency, the grid engine, the live-update stream |
| `i18n`, `messages` | Language routing and formatting, and the message catalog (`translations.tsv` and the generated JSON) |
| `proxy.ts` | Language detection and redirects |
| `scripts` | Catalog build and checks, the string helpers, and `smoke.mjs` |

## Checks

Before a pull request:

```bash
npx tsc --noEmit
npx eslint .
npm run test:i18n
npm run build
```

With the backend and the portal both running, three live checks (they sign in with the demo accounts; override with `DEMO_PASSWORD`, `DEMO_ADMIN_EMAIL` and `DEMO_ADMIN_PASSWORD` if yours differ):

```bash
node scripts/smoke.mjs http://localhost:3000
node scripts/test-i18n-auth.cjs
npm run test:i18n:http
```

`smoke.mjs` signs in as each role, opens every main page and calls the main endpoints through the proxy. `test-i18n-auth.cjs` checks all four languages, API access and role redirects for each role. `TEST_BASE_URL` points the two i18n checks at another port.

## Conventions

- The clinic, doctor and patient screens present **Tamaz** as the maker. The manufacturer and its systems are named only on admin screens.
- Reuse `components/ui` and the tokens in `app/globals.css`; do not add another UI library.
- Every list or detail screen has loading, error (with retry) and empty states, and works at phone width.
- Times arrive as UTC instants and are shown in the viewer's time zone (`lib/dates.ts`).
