# Daily Task Manager

An Ionic Vue task manager with Google sign-in, Firebase Realtime Database, training-hour tracking, and responsive light/dark interfaces.

## Tasks

- Create, edit, complete, revert, and delete tasks with a title, notes, due time, and priority.
- Create categories as you type, and reuse existing categories.
- Attach multiple files and multiple links with editable titles. Existing single-file and single-link tasks remain readable and migrate when edited.
- Choose daily, weekday, weekly, or monthly repeats. Completing an occurrence keeps its history and creates the next upcoming occurrence with its notes, category, files, links, and reminders. Late completion skips elapsed occurrences. Monthly repeats keep the original day where possible: January 31 → February 28 → March 31.
- Reverting a completed occurrence keeps its already-created next occurrence. Deleting the pending next occurrence stops the series.
- Search titles, notes, categories, filenames, link titles, and URLs. Every search word must match somewhere in the task.
- Combine status, category, priority, and repeat filters. Search and filters apply to both list and calendar views.
- Browse a monthly calendar, see task counts and previews, select a date for its tasks, or add a task on that date. The calendar shows saved occurrences; the next recurring occurrence appears after completion.
- Sort by date or priority, or select **Your order** to drag cards by their handles. Arrow buttons offer keyboard and touch alternatives. Ordering persists per user; tasks hidden by filters retain their positions.

Attachments currently use the existing database-backed data-URL storage: 5 MB per new file, 10 MB combined files and photo per task. Download links retain the original filenames.

## Device reminders

[Capacitor Local Notifications](https://capacitorjs.com/docs/apis/local-notifications) schedules reminders in the installed Android or iOS app. Select any combination of **5 min, 15 min, 30 min, 1 hour, and 1 day** before a task’s due time. Choices saved in a browser carry over when the task is loaded in the native app; browser sessions do not deliver native notifications.

Use **Enable reminders** to allow device notifications. Android also offers **Open settings** for precise alarm permission. Without it, approximate alarms are used and the app explains this; background refresh does not open the settings screen. Device power saving, Focus, and notification settings can affect delivery.

The app reconciles local schedules on task updates, app resume, and foreground delivery. Edits, completion, deletion, and sign-out cancel the affected reminders; signing out also clears delivered task reminders. Notifications from other plugins are preserved. Notification taps open the matching task for the signed-in user.

Only future reminders are scheduled. iOS schedules the nearest reminders within a 64-notification pending window, reserving room for other notifications; later reminders refill as the app is reopened. Android uses a 500-reminder window. Changes made on another device are reflected in this device’s local schedules when this app next loads/syncs the tasks. Due dates and repeat times follow the device’s local clock, matching the existing task date format.

## Development

```sh
npm ci
npm run dev -- --host 127.0.0.1
npm run build
npm run lint
npm run test:unit -- --run
```

Keep the existing `VITE_FIREBASE_*` environment settings for your Firebase project, enable Google authentication, and use the project’s Realtime Database configuration. The authentication flow remains Firebase Google popup sign-in; verify it in the chosen native distribution during device testing.

After changing web code or native plugins:

```sh
npm run build
npx cap sync
npx cap open android
# On macOS with Xcode:
npx cap open ios
```

Both native projects include the local-notification plugin. Android includes notification and precise-alarm permissions and a monochrome notification icon. iOS uses Swift Package Manager and includes camera/photo usage descriptions for task photos. Build Android with the Java 21 toolchain required by this Capacitor version; build and sign iOS with Xcode on macOS.

Unit tests cover legacy task compatibility, every search field, recurrence and month-end behavior, repeat write retries/recovery, ordering, multiple attachments, and native notification reconciliation using plugin/database mocks. Native notification delivery and native Google sign-in still require Android/iOS device testing.
