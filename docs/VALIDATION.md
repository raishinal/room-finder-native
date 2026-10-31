# Validation and deployment blockers

Checked on October 31, 2026. Reference application source was fully readable.
No source-access blocker and no missing endpoint for an implemented web feature
was found. The reference workspace's tracked source was not changed.

## Checks performed

- `npx tsc --noEmit`: passed.
- `npx expo lint`: passed.
- `npm test`: eight client tests passed (secure credentials, bearer headers,
  expired sessions, offline preservation, field errors, multipart boundaries,
  query encoding, role isolation and rental action permissions).
- `npx expo-doctor`: 20/20 checks passed.
- Android and iOS production exports compiled into Hermes bytecode successfully.
  These are JS/asset bundles, not signed APK/AAB/IPA builds.
- Reference focused Pest suites: 134 tests, 995 assertions passed using the
  reference's configured in-memory SQLite test environment. Suites:
  `Api/AuthenticationTest`, `Rentals/MarketplaceTest`, `Owner/PropertyTest`,
  `Admin/UserManagementTest`, `Admin/NoticeManagementTest`.
- Real HTTP integration: 44 checks passed against an isolated SQLite database,
  including all four demo roles, explicit role denials, owner inventory, saved
  places, booking price snapshots, occupancy conflicts/cancellation, manual
  blocks, application approval, tenancy acceptance/end and self-role protection.
- Browser preview at 390 × 844: sign-in rendering, required-field validation,
  owner login/dashboard, property listing/editor and a real property save checked.
  Device secure storage and native pickers require device QA.

## Deployment blockers

Hosted `https://room-finder.roshanlama.com.np` and GET requests to
`/api/v1/user`, `/api/v1/finder/listings`, and `/api/v1/auth/login` returned
**404 with HTML**. The reference defines these routes. GET `/api/v1/user` should
return **401 JSON** unauthenticated (the local reference does). GET login should
normally be a JSON method error, since login is POST. The hosted root also 404s,
so inspect DNS/vhost/document root and deploy the Laravel app with its `public/`
directory as the document root. Confirm `/api/v1/user` returns JSON 401 before
testing hosted sign-in. No hosted user account was created or mutated.

The configured local backend uses MySQL `127.0.0.1:3306`, database `room-finder`.
The database service refused connections; local login returned HTTP 500 with
SQLSTATE HY000/2002 while querying the cache table. Start the configured database
and run the reference's documented migrations. No MySQL data was changed.

For validation, an independent database was created at
`room-finder-native/.testing/api.sqlite` and seeded only with the reference's
local test accounts. It is ignored by Git and removed after validation. Do not point production or the shared
development backend at this disposable test database.

Sandboxed networking blocked local sockets and the sandboxed Hermes compiler
could not compile its temporary files. Repeating server/HTTP/compiler checks
outside that sandbox succeeded. These are execution-environment restrictions,
not application compilation failures.

EAS account/project linking, signing credentials, registered iOS devices, and
store accounts remain operator setup. No signed binaries, store submissions or
OTA updates were produced. Native device/emulator QA is still required for
keyboard behavior, native media pickers, Keychain/Android storage and back gestures.

## Repeating the integration smoke test

Use a new SQLite file in `.testing/`. In a separate PowerShell terminal, from the
reference backend, override only that process's environment:

```powershell
$env:APP_ENV='testing'
$env:DB_CONNECTION='sqlite'
$env:DB_DATABASE='C:/Users/roslm/OneDrive/Documents/room-finder-native/.testing/api.sqlite'
$env:DB_URL=''
$env:CACHE_STORE='array'
$env:SESSION_DRIVER='array'
$env:MAIL_MAILER='array'
$env:QUEUE_CONNECTION='sync'
$env:APP_URL='http://localhost:8000'
php artisan migrate --force --no-interaction
php artisan db:seed --class=UserSeeder --force --no-interaction
php artisan serve --host=127.0.0.1 --port=8000 --no-reload
```

Run from this native workspace:

```powershell
$env:SMOKE_API_BASE='http://127.0.0.1:8000/api/v1'
$env:SMOKE_DISPOSABLE='yes'
node scripts/api-smoke.mjs
```

This creates synthetic properties, inventory and rental records. It revokes its
temporary tokens in `finally`. It refuses non-local URLs and requires the
disposable flag. It must never target your normal backend database.
