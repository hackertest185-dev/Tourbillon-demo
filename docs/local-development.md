# Local development verification — 25 October 2026

The local catalogue contains **3 brands, 8 collections and 12 watches**. Every record has a matching product photograph saved under `backend/Images/catalogue/`, specifications and an official US retail price in **USD**. These are reference retail prices, not live inventory or a quotation inclusive of taxes and shipping. Product pages link to the manufacturer and show the verification date.

## Start locally

- PostgreSQL, Redis and the API are currently running in Docker. The existing development API container is `tourbillon-backend-dev`, at [http://localhost:5248](http://localhost:5248).
- In `frontend`, run `npm run dev`. Visit [Tourbillon](http://localhost:3000/tourbillon) or [All watches](http://localhost:3000/watches).
- Run a single development server. Port 3000 is explicit, so a second invocation fails instead of silently opening port 3001 against the same cache.
- Development uses `.next-dev`; production builds use `.next`. `npm run dev-fresh` refuses to reset the cache while port 3000 is occupied.
- Storage is configured as `Local` for development. No AWS credentials are needed for catalogue images or normal image uploads.

## Reproduce the catalogue

`data/catalogue.json` is the import manifest, including source URLs, photograph URLs and prices checked on **2026-10-25**. `scripts/catalogue-data.mjs` contains the authored catalogue definitions.

From the project root, `node scripts/seed-catalogue.mjs` imports missing slugs in one transaction. It preserves existing admin edits and unrelated data, and saves a database backup in `.local/backups/` first. Running it twice was verified to create no duplicates.

To re-download the images, run `./scripts/download-catalogue-images.ps1` in PowerShell 7. It checks the official prices against the manifest and rejects non-image responses; review any price changes before updating the source data. Photographs are served locally rather than relying on external hotlinks at runtime.

## Verification completed

- Frontend production build, including lint and type checks: passed. Existing image-component lint warnings remain.
- Backend suite: **2,693 passed, 5 skipped, 0 failed** in an isolated source copy inside the .NET container. The existing MailKit package advisory warning remains; no email dependency changes were made in this task.
- Local API smoke test: **76 checks passed** via the frontend proxy. Includes all 12 watch details, original product photographs and exact imported prices; brands and collections; catalogue order and featured products; standard search and typo tolerance; filter options; deterministic search with AI disabled; registration, login, logout and profile updates; favourites and personal collections; inquiry, appointment and interest persistence.
- The image replacement regression was exercised by uploading twice to the same watch: the provider key retained the extension and both resulting image URLs returned valid bytes. The original catalogue photo was restored afterwards.
- Browser checks: product listing and detail, a Quartz movement filter, two-watch comparison and differences-only view, password login and session restoration, saving and displaying a favourite, and opening the appointment panel. The login default destination was corrected from the portfolio root to `/tourbillon` across the auth flows.
- All **18 checked page URLs** returned HTTP 200, including every imported brand and collection. The Next.js image optimization endpoint returned a valid optimized product image.

The smoke test is `node scripts/smoke-local.mjs`. It creates a temporary local QA account and records results in `.local/smoke-report.json`. The optional `--test-admin-upload` flag is for a fresh local database with no existing administrator. After browser tests, `--cleanup-account` removes its QA account. Never run this write test against a deployed service.

All temporary QA contact, appointment and interest records and the QA account were removed after verification. The catalogue and its source photographs remain.

The cinematic homepage now lists the available brands from the API and uses search examples that match the seeded catalogue.

## Email boundary

Appointments, contact inquiries and interest registrations were verified to save successfully. Sending email confirmations and passwordless email codes still requires SMTP configuration and was **not** verified. Password-based registration and login work locally. AI features were not enabled.

## Follow-up verification — 25 October 2026

- A new production frontend build passed compilation, linting and TypeScript validation. The remaining `no-img-element` messages are existing administrator image-editor performance warnings; they do not prevent the build or affect the customer catalogue.
- The production server returned HTTP 200 for 21 declared customer and authentication routes, including the seeded watch, brand and collection slug routes. The non-routes `/brands`, `/collections`, `/account` and `/chat` intentionally have no page; navigation targets their defined dynamic or feature surfaces instead.
- Account deletion now deletes account-owned favourites, collections, browsing history, taste profile, inquiries, appointments and interest registrations before the identity record, in one transaction. This prevents the database foreign keys for appointments and interest registrations from rejecting a user who has used those features. After Docker/.NET is available, run the account cleanup below once to verify the live API path.
- Next.js now only permits development API images and the configured CloudFront distribution. Legacy manufacturer and logo CDNs are no longer approved for runtime product media.

### Final local re-check when services are available

1. Start Docker Desktop and the local stack, then run `node scripts/smoke-local.mjs`.
2. Run `node scripts/smoke-local.mjs --cleanup-account` and confirm `Temporary QA account deleted.` This is the regression check for account deletion with favourites, inquiries, appointments and interest records.
3. Run the backend test suite from the .NET container (or an installed .NET 8 SDK). The current baseline is **2,693 passed, 5 skipped, 0 failed**.

Do not run either smoke command against a deployed environment: they create a temporary account and save test requests.

## Google sign-in

Google Cloud project `fast-envoy-512621-t9` has a Web application OAuth client named **Tourbillon Local Web**. Its authorized origin is `http://localhost:3000` and its exact redirect URI is `http://localhost:5248/signin-google`. It requests only basic identity scopes (`openid`, `profile`, `email`).

The client credentials are stored outside the repository in the standard .NET user-secrets store and synchronized into the development API container. After recreating `tourbillon-backend-dev`, run `node scripts/configure-google-login.mjs` from the project root to restore the credentials and restart that container. The script also accepts a downloaded Google web client JSON file as its optional first argument; keep that file outside the repository. Production credentials require a separate deployment configuration and the deployed callback URL.

The login button opens Google in the same tab and returns to the requested local page. The backend requires a verified Google email and persists the Google provider ID, so later logins resolve to the same account. Six focused authentication tests passed, covering existing and new accounts, missing/invalid identity and failed account linking. The real browser flow reached Google's account chooser; completing account selection and consent, then verifying the resulting site session, is still pending the account owner's action.

## Price and photograph provenance

| Brand | Watch | Reference | Official US retail (USD) | Source |
| --- | --- | --- | ---: | --- |
| Tissot | PRX Powermatic 80 Blue | T1374071104100 | $850 | [Manufacturer](https://www.tissotwatches.com/en-us/T1374071104100.html) |
| Tissot | PRX Quartz Blue | T1374101104100 | $450 | [Manufacturer](https://www.tissotwatches.com/en-us/T1374101104100.html) |
| Tissot | Gentleman Powermatic 80 Silicium Blue | T1274071104100 | $950 | [Manufacturer](https://www.tissotwatches.com/en-us/T1274071104100.html) |
| Tissot | Seastar 1000 Powermatic 80 Blue | T1204071104103 | $925 | [Manufacturer](https://www.tissotwatches.com/en-us/T1204071104103.html) |
| Grand Seiko | Snowflake SBGA211 | SBGA211 | $6,900 | [Manufacturer](https://www.grand-seiko.com/us-en/collections/SBGA211G) |
| Grand Seiko | Shunbun SBGA413 | SBGA413 | $7,200 | [Manufacturer](https://www.grand-seiko.com/us-en/collections/SBGA413G) |
| Grand Seiko | Elegance GMT SBGM221 | SBGM221 | $5,400 | [Manufacturer](https://www.grand-seiko.com/us-en/collections/SBGM221G) |
| Grand Seiko | Elegance Manual SBGW301 | SBGW301 | $5,000 | [Manufacturer](https://www.grand-seiko.com/us-en/collections/SBGW301G) |
| Seiko | Presage Cocktail Time SRPB41 | SRPB41 | $475 | [Manufacturer](https://seikousa.com/products/srpb41) |
| Seiko | Prospex Turtle Diver SRPE93 | SRPE93 | $525 | [Manufacturer](https://seikousa.com/products/srpe93) |
| Seiko | 5 Sports Automatic SRPD55 | SRPD55 | $350 | [Manufacturer](https://seikousa.com/products/srpd55) |
| Seiko | 5 Sports GMT SSK003 | SSK003 | $495 | [Manufacturer](https://seikousa.com/products/ssk003) |

Each photograph's original URL is retained in `data/catalogue.json`. Descriptions were written for this seed catalogue; product specifications were taken from the linked manufacturer records.
