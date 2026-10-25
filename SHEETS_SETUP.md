# Google Sheets score storage

## What changed

- The browser sends game results to the same-origin `/api/scores` endpoint. The Vercel function stores and reads records through the Google Sheets API; the Google service account key never enters the browser bundle.
- The first API request creates the `BalloonScores` and `TetrisScores` tabs and their headers in the configured spreadsheet.
- Each completed run is one row. Rows contain a stable record ID, normalized nickname key, nickname, score, country code, play time, and local day/week/month keys.
- The leaderboard keeps its existing per-run score ranking and time/country filters. For the entered nickname, it also shows all-time games played, cumulative points, personal best, and the five most recent scores.
- Nickname, country, language, and camera calibration preferences remain in that device's local storage. A player can enter the same nickname on another device to retrieve the shared score records.

## Google and Vercel setup

1. In Google Cloud Console, enable the Google Sheets API for a Google Cloud project.
2. Create a service account and a JSON key. The service account does not need broad project roles; it needs editor access to the score spreadsheet.
3. Create a Google spreadsheet and share it with the service account's `client_email` as an Editor. Copy the spreadsheet ID from the URL between `/d/` and `/edit`.
4. Add these environment variables to the Vercel project for Preview and Production:

   - `GOOGLE_SHEETS_SPREADSHEET_ID`: the spreadsheet ID.
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: the service account `client_email`.
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: the service account `private_key`; if the Vercel form stores escaped newlines, keep them as `\n`.

   These are server-side secrets. Do not prefix them with `VITE_`, commit them, or put the service account JSON file in the repository. `BalloonScores` and `TetrisScores` are created automatically.

5. Deploy the worker's repository update to Vercel after setting the variables. For local API work, use `vercel dev` with the same variables; plain `npm run dev` starts Vite and does not run Vercel's `/api` function.

## Importing existing Firestore scores

The one-time script reads the existing public `scores_balloon` and `scores_tetris` collections and appends eligible rows to the corresponding Sheet tab. It keeps original timestamps and date keys and prefixes each legacy record ID with its Firestore collection name. Re-running it skips IDs already imported.

With the needed `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` available in `.env.local`:

```sh
node --env-file=.env.local scripts/migrate-firestore-to-sheets.mjs
node --env-file=.env.local scripts/migrate-firestore-to-sheets.mjs --apply
```

The first command is a dry run. Review its counts, then run the second command to write. This script needs Firestore read permission and Sheets editor permission. It does not delete or modify Firestore data. Existing browser-only personal-best values cannot be migrated because they were never stored in Firestore.

## Identity and data limits

Records are grouped by a nickname after Unicode normalization, trimming, and case folding. This allows the same typed nickname to work across devices, but it does not prove who owns that nickname; a public player can reuse another player's nickname or submit a fabricated score. Ask players to use a nickname rather than a real name or health information.

Google Sheets has API quotas, and this implementation reads the selected game's score rows to rank and summarize them. Google's current limits list 300 read requests per minute and 300 write requests per minute per project, plus 60 read and 60 write requests per minute per user per project; this app's requests share the service account identity. The API retries quota `429` responses with exponential backoff, but the Sheet remains a modest-traffic store rather than an unbounded high-traffic database. Watch Vercel logs for recurring quota errors; if usage grows substantially, keep this API boundary and move its storage implementation to a database designed for concurrent queries. See Google's [Sheets API usage limits](https://developers.google.com/workspace/sheets/api/limits).

Rows are added with the Sheets API's append operation, which appends after the existing table in the chosen range. See [Google's append reference](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append). Service account authentication is handled by Google's `google-auth-library`; keep the private key only in Vercel's server-side environment. Google's [service-account OAuth guide](https://developers.google.com/identity/protocols/oauth2/service-account) recommends using a library for JWT signing.

## Handoff and verification record

- **Intent:** share a repo-ready local change with the worker so they can commit and upload it.
- **Plan:** replace direct browser Firestore score reads/writes with `/api/scores`; store every game run in Sheets; add nickname totals/history; provide a dry-run-first legacy importer and setup instructions.
- **Decisions:** use one tab per game; preserve the current individual-run leaderboard and its filters; keep nickname/camera preferences local; do not remove or change the old Firestore configuration or data.
- **Verification:** record the production build and source diff status in the handoff message accompanying the patch. A live Sheets read/write and a historical import still require the spreadsheet and Vercel secrets to be configured.
- **Handoff:** share the generated patch file with a worker who has the matching `KevinJSKim85/smilefit` repository. Apply it from the repository root with `git apply <patch-file>` and review the staged source changes before committing.
