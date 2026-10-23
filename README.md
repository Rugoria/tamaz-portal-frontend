# tamaz portals (frontend)

Next.js 16 (App Router), React 19, TypeScript, Tailwind 4. Built from the Claude Design project "Tamaz shared screens".

**This is its own repository.** The Spring Boot backend, the database, the project specification (`CLAUDE.md`, `docs/`) and the API tests live in the backend repository,
[`tamaz-portal`](https://github.com/Rugoria/tamaz-portal). This portal only talks to the backend over HTTP (see "How it talks to the backend"); it shares no code with it.

## Portal languages

English (US), Arabic, French and Spanish are available on every portal and authentication screen. Routes now start with `/en`, `/ar`, `/fr` or `/es`. Existing links without a language redirect using a saved preference, then browser language, then English. An explicit language in the URL takes priority. `/api/*` routes keep their existing addresses and authentication rules.

Selecting a language changes the screen immediately, without an Apply button. The selector saves a preference only when **Remember my language on this device** is checked. Checking it immediately stores the current language in an HTTP-only cookie for one year; clearing it removes that preference. Arabic uses right-to-left layout; dates and calendar labels follow the selected language. Names, record contents, chat messages, backend email and notification bodies remain as supplied. Currency conversion and payment behavior are outside this rollout. Private portal pages are marked `noindex`; public website multilingual SEO belongs in its future implementation.

Edit `messages/translations.tsv` (English source, Arabic, French, Spanish, separated by `|`) and run `npm run messages:build` to regenerate the JSON catalogs. Preserve named placeholders such as `{from}`. `useT()` translates interface strings with an English fallback; do not apply it to user content. The existing English source remains the identifier, so add a new catalog row whenever interface wording changes. Translations should receive a native-speaker terminology review before release.

Run `npm run test:i18n` for catalog coverage, placeholders, fallback and formatting checks. With the frontend running, `npm run test:i18n:http` checks locale detection, consent, translated authentication pages and protected portal redirects. `TEST_BASE_URL` can point it at another local port.

## Currency formatting

Amounts stay in USD. `formatCurrency(amount, locale)` in `lib/format.ts` formats dollar amounts with the selected language's grouping and decimal separators, always includes `USD`, and shows two decimal places. Unsupported languages fall back to English (US). Missing or non-finite amounts display nothing; zero displays as zero. No exchange-rate service or subscription is used.

In client screens, use `const {currency} = useLocalizedFormats()` and render `<bdi>{currency(amount)}</bdi>` to isolate the monetary text correctly in Arabic layouts. Pass amounts in dollars, not cents. Current payment previews have no monetary data and keep their existing “Amount to be confirmed” text; no prices are invented.

## Run it

```bash
cp .env.example .env.local      # set BACKEND_URL if the backend is not on http://localhost:8080
npm install
npm run dev                     # http://localhost:3000
```

The Spring Boot backend must be running (clone the backend repository next to this one; its README explains starting Postgres, Redis and the backend).
Start it with `--app.clearmoves.mode=stub` to be able to move a case through the manufacturer steps with the admin simulator.
`.env.example` also lists `NEXT_PUBLIC_SHOW_PENDING`.

## How it talks to the backend

The browser only calls this app. `app/api/session/[action]` signs in/up and stores the JWT in an httpOnly cookie;
`app/api/[...path]` forwards every other `/api/*` call to the backend with that token. The backend needs no CORS settings.

## Layout

| Path | What |
|---|---|
| `app/(auth)` | Sign in, patient sign-up, doctor registration |
| `app/customer` | Patient portal |
| `app/[role]` | Clinic (`/clinic`) and doctor (`/doctor`) portals, one shared tree |
| `app/admin` | Admin portal |
| `components/ui` | Button, Chip, Dialog, Table, Tabs, Toast, empty/error/loading states |
| `components/shell` | Sidebar (staff, admin) and customer top bar / phone tab bar |
| `components/features` | Messages, Notifications, the case progress panel (shared by portals) |
| `components/case` | The clinic/doctor case page pieces |
| `lib` | API client, types, status labels, formatting, the live-update stream (`realtime.ts`) |
| `scripts` | Message catalog build and checks, the string helper tools, and `smoke.mjs` (a live check of the running stack through the portal) |

## Preview-only screens

Things the client has not decided yet (patient records beyond the name, photos and X-rays, treatment plan, delivery form,
virtual setup approval, tracking numbers, appointments, payments, per-case chat) are built as UI that saves nothing and
carry a "Pending client decision" or "Preview only" tag. Set `NEXT_PUBLIC_SHOW_PENDING=false` to hide them all.

## Checks

```bash
npx tsc --noEmit && npx eslint . && npx next build
```
