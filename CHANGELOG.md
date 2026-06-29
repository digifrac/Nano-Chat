# Changelog

All notable changes to Nano Chat are recorded here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); versions follow [SemVer](https://semver.org/).

## [Unreleased]

### Security

- Raised the admin password minimum to 10 characters (was 8), matching the
  guide. Existing passwords keep working; the floor applies when creating or
  changing one.

### Fixed

- Admin page loaded a stale `style.css` version, which could break its colours
  from a cached copy. Bumped to match the rest of the app.

### Added

- **Chat cleanup from the console.** The operator can delete a single
  conversation (a `×` on each queue row, or a **Delete** button inside an open
  chat) and bulk-clear from the queue: **Clear closed** removes every closed
  chat, **Clear all** removes the lot. Deletes are operator-only and permanent
  (with a confirm); the 14-day auto-sweep still runs as a backstop. New
  `signal.php` actions `delete` and `purge` back this.

## [1.0.0] - 2026-06-29

First release. A free, one-click **"Chat with us"** button for any website: a
visitor taps it, picks a subject, and talks to the business live in the browser.
Flat-file, plain PHP, no database, on ordinary shared hosting.

### Added

- **Visitor widget** (`js/embed.js` + `widget.html`): floating corner button
  and/or inline button, both opening a chat popup with a subject picker
  (defaults to the first, so one tap starts) and a message box. Anonymous
  visitors, no account, nothing to install.
- **Operator console** (`index.html` + `js/console.js`): the business keeps it
  open to receive chats; admin password required to go online; a queue shows
  every conversation with its subject, and a desktop notification fires on a new
  chat. Click a chat to open the thread and reply.
- **Message queue** (`signal.php`): file-based, one small JSON file per
  conversation under `data/` (`chat-<visitor>.php`). Actions for config,
  register-host, start, send, poll and close, all over plain HTTPS by polling.
  No database, no WebRTC, no relay. Closed or idle visitor chats are swept after
  14 days.
- **Live presence both ways**: while a chat is open, each side sees whether the
  other is online or away, and both are told when the other person closes the
  chat.
- **Live-only offline behaviour**: when no operator is online the visitor widget
  greys out and shows a short note instead of taking a message that no anonymous
  visitor could later receive a reply to. It comes back to life on its own the
  moment the operator goes online.
- **Web installer** (`install.php` + `bootstrap.example.php`): first-run setup
  that creates an **outside-webroot config directory** and writes a gitignored
  `bootstrap.php` pointing at it. Refuses to re-run once configured; self-deletes
  after install.
- **Removable admin** (`admin/`): password-gated setup that writes the business
  handle, branding, subjects, theme, site URL and licence key to `config.json`,
  and the operator password hash to `admin.json`, both in the **outside-webroot
  config directory**, never web-reachable. Delete the folder after setup to
  harden; re-upload to edit.
- **Licence** (`licence.php`): per-domain Ed25519 verification (no phone-home,
  embedded public key, host taken from config not the request) that removes the
  "Powered by Nano Chat" line on a licensed domain. Part of the Digital Fracture
  Nano licence suite.
- **Security in depth**: persistent secrets (settings, licence key, password
  hash) live outside the webroot; the transient in-webroot files under `data/`
  are `.php`-named and written with a PHP guard as their first line, so a direct
  request returns 403 with an empty body even where `.htaccess` is ignored
  (nginx), alongside `data/.htaccess`.
- MIT licence; light/dark theme; reduced-motion support.

### Notes

- Nano Chat is the text successor to Nano Call, an earlier voice experiment.
  The reusable parts (installer, removable admin, licence, embed loader, theme)
  carried over; the WebRTC voice engine, TURN relay and signalling were removed
  and `signal.php` was rewritten as a plain text message queue.
