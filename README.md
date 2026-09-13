# Daily Task Manager

An Ionic Vue task manager with Google sign-in, Firebase Realtime Database, training-hour tracking, and responsive light/dark interfaces.

## Tasks

- Create, edit, complete, revert, and delete tasks with a title, notes, due time, and priority.
- Choose 💼 Work, 👤 Personal, 📚 Study, 🛒 Errands, 💰 Finance, or 📁 Projects. Custom categories and previously saved categories remain available.
- Attach multiple files and multiple links with editable titles. Existing single-file and single-link tasks remain readable and migrate when edited.
- Choose daily, weekday, weekly, or monthly repeats. Dates appear automatically from the selected start date without completing earlier occurrences. Completing or reverting a date updates only that date; other dates stay unchanged. Monthly repeats keep the original day where possible: January 31 → February 28 → March 31.
- Editing a recurring task updates its schedule. Deleting a pending date stops that date and later repeats, retaining earlier dates and completed history. Deleting a completed date removes only that date. Existing completion-created recurring tasks remain compatible.
- Search titles, notes, categories, filenames, link titles, and URLs. Every search word must match somewhere in the task.
- Combine status, category, priority, and repeat filters. Search and filters apply to both list and calendar views.
- Browse a monthly calendar, see task counts and previews, select a date for its tasks, or add a task on that date. Every month expands its recurring dates automatically. The list shows the next 30 days of repeats alongside saved tasks and completed history.
- Sort by date or priority, or select **Your order** to drag cards by their handles. This view shows each recurring schedule once; Calendar shows every date. Arrow buttons offer keyboard and touch alternatives. Ordering persists per user; tasks hidden by filters retain their positions.

Attachments currently use the existing database-backed data-URL storage: 5 MB per new file, 10 MB combined files and photo per task. Download links retain the original filenames.

## Device reminders

[Capacitor Local Notifications](https://capacitorjs.com/docs/apis/local-notifications) schedules reminders in the installed Android or iOS app. Select any combination of **5 min, 15 min, 30 min, 1 hour, and 1 day** before a task’s due time. Choices saved in a browser carry over when the task is loaded in the native app; browser sessions do not deliver native notifications.

Use **Enable reminders** to allow device notifications. Android also offers **Open settings** for precise alarm permission. Without it, approximate alarms are used and the app explains this; background refresh does not open the settings screen. Device power saving, Focus, and notification settings can affect delivery.

The app reconciles local schedules on task updates, app resume, and foreground delivery. Edits, completion, deletion, and sign-out cancel the affected reminders; signing out also clears delivered task reminders. Notifications from other plugins are preserved. Notification taps open the matching task for the signed-in user.

An offline launch preserves the signed-in account’s existing device schedules until tasks load. Startup notification taps wait for authentication and task data. A tap received while a task form or confirmation is open waits for that dialog to close.

Only future reminders are scheduled. Recurring dates are expanded over the coming year before the nearest reminders are selected; completing an earlier date is not required. iOS schedules the nearest reminders within a 64-notification pending window, reserving room for other notifications; later reminders refill as the app is reopened. Android uses a 500-reminder window. Changes made on another device are reflected in this device’s local schedules when this app next loads/syncs the tasks. Due dates and repeat times follow the device’s local clock, matching the existing task date format.

## Development

Dark mode uses neutral charcoal surfaces and muted blue accents. Browser, home-screen, Android adaptive/legacy, and iOS app icons use the custom calendar/checkmark artwork in `resources/icon.svg`. Native splash screens use the same artwork. `python scripts/generate-icons.py` rebuilds the committed browser/iOS PNGs with Pillow.

```sh
npm ci
npm run dev -- --host 127.0.0.1
npm run build
npm run lint
npm run test:unit -- --run
```

Keep the existing `VITE_FIREBASE_*` environment settings for your Firebase project, enable Google authentication, and use the project’s Realtime Database configuration. Browser sign-in uses the Firebase Google popup. Android uses the native [Capawesome Google Sign-In plugin](https://capawesome.io/docs/sdks/capacitor/google-sign-in/) and exchanges its Google ID token with Firebase `signInWithCredential`. Firebase verifies the token and owns the app session, task access, and existing training-hours record. The Android flow does not depend on browser popup/redirect state or sessionStorage.

### Android Google sign-in

The existing repository contains the Firebase web app settings; it does not contain an Android OAuth client or Google web client ID. Complete this setup in the **same Firebase/Google Cloud project** before installing a new Android build:

1. In Firebase Console → Authentication → Sign-in method → Google → Web SDK configuration, copy the **Web client ID**. Set `VITE_GOOGLE_WEB_CLIENT_ID=123456789-abc.apps.googleusercontent.com` in `.env.local`, replacing the example with your real ID. For the GitHub APK workflow, set a repository **Actions variable** named `VITE_GOOGLE_WEB_CLIENT_ID` to that ID. The plugin receives the web client ID; the Android client ID is registered separately.
2. In Firebase Project settings → Your apps, add/select the Android app with package name **`io.daily.taskmanager`** and add the **SHA-1 of the key signing your APK**. Enable the Google sign-in provider. Verify an Android OAuth client exists in Google Cloud → APIs & Services → Credentials with that package and SHA-1, alongside the web client. See [Firebase’s Android Google sign-in setup](https://firebase.google.com/docs/auth/android/google-signin). This plugin only obtains a Google token; it does not require the native Firebase SDK or `google-services.json`.
3. For GitHub-built debug APKs, save the base64-encoded **same debug keystore** as an Actions **secret** named `ANDROID_DEBUG_KEYSTORE_BASE64`. The workflow restores it before Gradle runs, preserving its registered SHA-1 on every build. A fresh runner-generated debug key would invalidate the OAuth registration on the next build. The workflow uploads an **Android signing certificate** artifact containing its fingerprints. It requires both this secret and the web client ID, so it cannot silently distribute an unconfigured APK.

Android Studio normally creates your local debug keystore on the first debug build. Print its fingerprint with:

```sh
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
# Linux: copy this value into the ANDROID_DEBUG_KEYSTORE_BASE64 Actions secret.
base64 -w0 ~/.android/debug.keystore
```

On Windows PowerShell, encode it with:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:USERPROFILE\.android\debug.keystore"))
```

Register each signing certificate you distribute: local debug, GitHub debug, and release/Google Play app signing can have different SHA-1 values. Keep the configured keystore outside git. A release upload key and Google Play app signing key can also differ.

Build the configured Android application with:

```sh
npm run build:android
npx cap open android
```

Then rebuild and install the APK. Updating hosted web files alone cannot add the native sign-in plugin to an already installed app. After picking an account, verify login opens the task screen without a reload, existing tasks/hours remain, signing out closes its modal, and canceling the account picker allows retry. Missing client configuration and unavailable Google accounts/Play services have actionable login messages. Browser popup sign-in remains independently testable; iOS Google authentication still needs its own distribution testing.

After changing web code or native plugins:

```sh
npm run build
npx cap sync
npx cap open android
# On macOS with Xcode:
npx cap open ios
```

Both native projects include the local-notification plugin. Android includes notification and precise-alarm permissions and a monochrome notification icon. iOS uses Swift Package Manager and includes camera/photo usage descriptions for task photos. Build Android with the Java 21 toolchain required by this Capacitor version; build and sign iOS with Xcode on macOS.

Unit tests cover legacy task compatibility, every search field, recurrence and month-end behavior, repeat write retries/recovery, ordering, multiple attachments, native notification reconciliation, and Android native token exchange/cancellation/sign-out using plugin/database mocks. Native notification delivery and Google sign-in still require configured Android/iOS device testing.
