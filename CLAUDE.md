@AGENTS.md

# Tamaz portals (frontend)

This repository is only the web app. The backend, the database, the API tests and the project specification live in the backend repository,
[`tamaz-portal`](https://github.com/Rugoria/tamaz-portal): its `CLAUDE.md` is the single source of truth for product rules, and `docs/` holds the decisions, open questions and the SimplyCeph notes.
Read it before changing behaviour. Do not fill gaps with assumptions: record them as open questions there.

## Rules that apply here

- **Wording.** Clinics, doctors and patients only ever see "Tamaz", never Clear Moves, SimplyCeph or "the manufacturer". Only admin screens may name the manufacturer.
- **Undecided things are preview-only.** Screens for something the client has not decided save nothing, carry a "Pending client decision" or "Preview only" tag, sit behind `NEXT_PUBLIC_SHOW_PENDING`, and show no database data.
- **All interface text goes through `useT()`.** Every new English string needs a row in `messages/translations.tsv` (`English|ar|fr|es`), then `npm run messages:build`. Check with `npm run test:i18n` and `node scripts/extract-new-strings.mjs <files>`.
- **The browser only talks to this app.** Backend calls go through `app/api/[...path]` (the JWT stays in an httpOnly cookie). The live-update stream has its own route, `app/api/events/route.ts`, because it must stream and the catch-all route buffers.
- **Types mirror the backend by hand.** `lib/types.ts` copies the backend's response shapes. When the backend changes a response, change them together (backend first, with an addition that does not break the old shape; then this repo; then remove the old part).
- **Before finishing:** `npx tsc --noEmit`, `npx eslint .`, `npm run test:i18n`, `npm run build`.
