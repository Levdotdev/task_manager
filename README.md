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
