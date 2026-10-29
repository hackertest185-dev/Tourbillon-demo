# Production account and admin acceptance — 29 October 2026

Site: https://velora-five-umber.vercel.app

This is a record of observed results, not a guarantee that every feature or every security scenario has been tested. AI remains disabled intentionally. Tests use disposable accounts and catalogue fixtures; original watches are not edited.

## Completed account checks

| Check | Observed result |
| --- | --- |
| Register disposable account | Production UI/API succeeded |
| Change password | Production succeeded; previous password rejected, replacement accepted |
| Forgot password through real Gmail delivery | Production sent a message; owner supplied its code; verification and reset succeeded |
| Reuse consumed reset OTP | Rejected with HTTP 400 |
| Reuse consumed reset grant | Rejected with HTTP 400 |
| Revoke previously copied session after password change | HTTP 401 immediately after deployed fix |
| Google sign-in and return to site | Completed using an already signed-in Google test identity; protected account page showed that identity and Google connected |
| Google linking to an existing local account | Password reauthentication and optional TOTP implemented; automated tests pass. Owner's Google identity has not been manually completed because its Google password is unavailable |
| Delete disposable account | HTTP 200; previous session and subsequent password login both rejected with HTTP 401 |

## Admin checks and fixes

- Real owner account has the Admin role. It does not yet have owner-controlled TOTP enabled, so writes remain blocked by the production MFA policy.
- Temporary QA Admin successfully enrolled TOTP and completed password + TOTP sign-in.
- Admin create/update brand and collection succeeded on production.
- Admin create/update watch succeeded after fixing circular JSON serialization. The former error happened after saving the watch; disposable duplicate created during diagnosis was removed.
- Mutation without CSRF was rejected with HTTP 400. A text file disguised as PNG was rejected with HTTP 400.
- Ordinary users received HTTP 403 for protected catalogue mutations and admin API access. Anonymous requests received HTTP 401.
- Admin MFA proof now survives validated Identity principal refresh only for the same still-authorized Admin identity. Public watch-finder search is excluded from the admin mutation gate.
- Image upload and editor responses now use the storage provider's actual image URL. Cloudinary keeps uploaded originals and leaves bundled `/catalogue/` images unchanged.

## Image-storage follow-up — resolved

The initial valid WebP upload failed because local storage tried to write to Hostless's read-only `/app/Images/watches`. Production now uses the owner's Cloudinary Free account. Cloud name, API key, and API secret were configured on Hostless; both credential fields are write-only. The API secret was not committed or added to frontend configuration.

Backend `391ca3b` and frontend `1ce6fad` were deployed and tested. URL imports no longer duplicate the storage folder, processed-image saves retain the actual provider key, and admin previews use provider URLs. An actual UI upload revealed the former 10-second browser deadline; image operations now allow 60 seconds, and the Vercel proxy explicitly allows 60 seconds too. The deployed UI upload, save, and reopen flow then succeeded.

| Image acceptance check | Result |
| --- | --- |
| Existing-watch WebP upload | HTTP 200 |
| Fake PNG content, missing CSRF, negative price | HTTP 400 |
| Cloud original download | HTTP 200; SHA-256 and all 886,724 bytes identical to original |
| Original dimensions after UI upload and reopening editor | 1680 × 1680; loaded from Cloudinary |
| Responsive frontend image optimizer | HTTP 200 |
| Detail-page image | Loaded through frontend image optimizer |
| Finalize processed Cloudinary image | HTTP 200; correct provider key |
| Import approved public Cloudinary URL | HTTP 200 |
| Upload before creating a watch | HTTP 200; public preview HTTP 200 |
| Stage image for Cloudinary editing | HTTP 200; public preview HTTP 200 |
| UI upload and subsequent data save | Succeeded; public API reflected saved description; downloaded image remained byte-identical |
| Cleanup | Four exact test cloud assets deleted successfully; disposable watch, collection, brand, and Admin account deleted |

The final database read again confirmed 12 original watches, 3 original brands, zero QA accounts, and only the owner's Admin role. All 12 original image URLs still point to the bundled catalogue. Owner MFA remains disabled and the write policy remains enforced.

## Verification

- Latest backend suite: 2,740 passed, 5 existing skips.
- Frontend production build: passed. Existing image-optimization warnings remain.
- No production schema migration was run.

## Final deployed replay and cleanup

Frontend Vercel and backend Hostless both deployed `8cdf496` successfully. Google sign-in was repeated after this deployment and the protected account page again showed the expected Google identity.

| Final replay | Passed | Failed |
| --- | ---: | ---: |
| Ordinary/anonymous authorization, password change, immediate old-cookie revocation, new-password login, disposable account deletion | 23 | 0 |
| Admin MFA, eight admin read APIs, reject parent deletion with watches, delete disposable watch/collection/brand, deleted-watch 404 | 16 | 0 |
| Temporary Admin identity, reject wrong password/mismatched confirmation, delete temporary Admin, reject revoked session/login | 7 | 0 |

The final database read confirmed 12 original watches, 3 original brands, zero QA accounts, and one Admin: the owner's existing account. No real owner account was deleted and no original watch was altered.

Owner-controlled MFA enrollment remains open. Persistent image upload verification is complete. The temporary Admin and its authenticator were removed from the server, so the owner must enroll their own authenticator before using admin write operations.

Automatic approval review blocked deletion of local temporary secret files without a detailed reason. Server-side cleanup succeeded, but these local files still need manual cleanup (do not commit or share them): `C:\Users\noura\Downloads\velora-api.env`, `C:\Users\noura\Downloads\velora-api (1).env`, and the files `state.json`, `pg.env`, `mfa-test.json`, `browser.json`, `qa-admin-browser.json`, `permission-fixture.json`, and `reset-otp.txt` inside `C:\Users\noura\AppData\Local\Temp\velora-production-qa-20261029`. Non-secret test reports and screenshots in that directory may be retained.
