# Room Finder mobile

Expo SDK 58 / React Native 0.88 / Expo Router native client for the sibling Laravel
Room Finder application. Feature and authorization contracts come from that
project, not mock data. See [feature inventory](docs/FEATURES.md) and
[validation and blockers](docs/VALIDATION.md).

## Development

Requires Node 22+, npm, and the reference backend's PHP/Composer/database setup.
There is no Bun lockfile; use `npx` for this project.

```powershell
npm ci
Copy-Item .env.example .env.local
npx expo start
```

Local defaults to `http://localhost:8000/api/v1`. In the sibling `room-finder`,
start its configured database, run its documented migrations and storage link,
then `php artisan serve --host=127.0.0.1 --port=8000`. Configure real mail delivery
for verification/recovery; `MAIL_MAILER=log` writes email links to Laravel logs.
Do not seed public demo credentials into production. The reference's
`docs/demo-users.md` describes local-only accounts.

For Android over USB/emulator, forward the phone's localhost to the host:

```powershell
adb reverse tcp:8000 tcp:8000
adb reverse tcp:8081 tcp:8081
npx expo start --dev-client --localhost
```

An iOS simulator on the backend Mac can use localhost directly. A physical iPhone
or remote simulator's localhost is that device: explicitly set
`EXPO_PUBLIC_API_BASE_URL` to a reachable development host when needed. Windows
cannot run an iOS simulator; use EAS and a registered iPhone. Local HTTP native
exceptions are enabled only with `EXPO_PUBLIC_APP_ENV=local`.

Development and production both use:

```dotenv
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_BASE_URL=https://room-finder.roshanlama.com.np/api/v1
```

Use `production` as the environment value for release builds. Restart Metro after
changing environment variables. Public environment variables are bundled into
the client; never put credentials in them. EAS profiles pin the hosted URL.

## Android / iOS builds

SDK-compatible SecureStore, ImagePicker, BuildProperties and DevClient are
installed. Use a development build for the configured native app. Native folders
are generated; never edit them by hand. The proposed application identifiers are
`com.roshanlama.roomfinder`; confirm ownership before the first store submission.

```powershell
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --profile local --platform android
npx eas-cli@latest build --profile development --platform android
npx eas-cli@latest build --profile development --platform ios
npx eas-cli@latest build --profile preview --platform android
npx eas-cli@latest build --profile production --platform all
```

`local` is an internal development client using localhost; `development` is an
internal development client using the hosted backend. `preview` produces an
Android APK. Production produces store artifacts with remote version increments.
EAS init associates the app with your Expo account/project. Apple builds require
Apple signing credentials and internal-device registration; store distribution
requires Apple/Google developer accounts. No cloud build or submission was
started by this implementation.

For a local Android development binary with Android tooling installed, run
`npx expo run:android`. Local iOS builds require macOS and `npx expo run:ios`.

```powershell
npx eas-cli@latest submit --profile production --platform android
npx eas-cli@latest submit --profile production --platform ios
```

Over-the-air updates require deliberately configuring Expo Updates/project
channels first (`npx expo install expo-updates`, then
`npx eas-cli@latest update:configure`). Updates are not configured or published
here; rebuild native apps after adding native modules or changing plugins.

## Architecture and behavior

- `src/app/`: Router screens only: authentication, workspace section, listing.
- `src/components/`: Native UI, forms, gallery, role-specific workflows.
- `src/lib/api.ts`: JSON/multipart transport, bearer header, timeout, field errors,
  secure credential lifecycle, environment-specific storage keys.
- `src/lib/session.tsx`: Session bootstrap, verification/account gates, workspace.
- `src/lib/workflows.ts`: Role navigation and date/state-specific action controls.
- `src/lib/forms.ts`: Named native fields matching the API request schemas.
- `src/hooks/use-resource.ts`: Abortable requests; stale response isolation.

Native tokens use Keychain/Android encrypted storage through Expo SecureStore;
no token goes into plain preferences, logs or URLs. Browser preview deliberately
keeps its token in memory and signs out on reload. A 401 clears the token. Offline
failures preserve it so users can retry. Tokens expire after 30 days; the backend
has no refresh-token API. Sign-out revokes the current token; password changes
revoke every device. The server remains authoritative for access and availability.

Email verification opens the exact signed API URL in the user's mail/browser;
return to the app and press refresh. Reset can be completed in the existing web
page or the native reset form using the email token. Unverified users can edit
their profile, refresh/resend verification and sign out.

Lists are server paginated. Pull to refresh or use retry/refresh buttons for new
activity. Messages are plain text with optional viewing proposals in the API's
timezone. No background polling, push delivery, offline writes or offline record
cache is implemented by the reference. Connection failures show retry states.

Create a property, then edit it to upload photos. Gallery visibility/cover changes
and amenity clearing use JSON, while new photo uploads use a separate multipart
save. This preserves empty-array semantics that PHP multipart cannot represent
reliably. Uploads use POST method spoofing on updates and let fetch set boundaries.
No saved property photo is permanently deleted.

## Checks

```powershell
npx expo lint
npx tsc --noEmit
npm test
npx expo-doctor
npm run export:native
```

API integration smoke testing is opt-in, localhost-only and restricted to an
explicitly disposable backend. See [validation instructions](docs/VALIDATION.md).
Current SDK references: [Expo 58](https://docs.expo.dev/versions/v58.0.0/),
[SecureStore](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/),
[ImagePicker](https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/),
[Router](https://docs.expo.dev/router/introduction/),
[EAS Build](https://docs.expo.dev/build/introduction/).
