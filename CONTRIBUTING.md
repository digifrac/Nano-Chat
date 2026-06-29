# Contributing to Nano Chat

Thanks for your interest. Nano Chat is deliberately small and hand-built, and the
bar for new code is that it stays that way.

## Principles

- **No build step, no framework, no dependencies.** Plain HTML, CSS, vanilla JS,
  and one PHP file. If a change needs npm, a bundler, or a library, it does not
  belong here.
- **Runs on ordinary shared PHP hosting.** No database, no long-running process,
  no shell access assumed. State lives in small files under `data/`.
- **Live chat, kept honest.** When no operator is online the widget says so
  rather than taking a message that an anonymous visitor could never get a reply
  to. Keep that behaviour.
- **Restraint over features.** Nano Chat does one thing: a "Chat with us" button.
  New surface area should earn its place.

## Project layout

The repo root is the deployable (it ships as `chat/`):

```
index.html                 operator console page (the business)
widget.html                visitor chat popup page
signal.php                 message queue (no DB)
licence.php                Ed25519 licence verification
install.php                first-run installer (writes bootstrap.php; delete after)
bootstrap.example.php      copy to bootstrap.php -> outside-webroot config path
js/
  core.js                  shared client core (config, polling, send)
  console.js               operator console logic
  widget.js                visitor widget logic
  embed.js                 the button loader pasted on client sites
css/
  style.css                one stylesheet, light + dark tokens
admin/index.php            removable setup UI (delete the folder to harden)
data/                      runtime files (gitignored); each is .php-named and
                           guard-prefixed so a direct hit 403s, plus .htaccess
GUIDE.md / GUIDE.html      plain-language operator guide
```

## Before a pull request

- Keep changes surgical and backward compatible; match the surrounding style.
- `php -l` every PHP file you touch; syntax-check JS (`node --check`).
- Test a real chat locally (`php -S localhost:8090` from the repo root, then
  open `/install.php` once to write `bootstrap.php`) in two browser windows:
  admin to set up, console online, visitor widget, send both ways, close.
- Note that the operator and visitor share one per-browser token, so test the
  two roles in two different browsers (or one normal and one private window),
  not two tabs of the same browser.
- Do not commit anything under `data/` except `.htaccess`, nor `bootstrap.php`
  (per-install; written by `install.php`).
- Update [CHANGELOG.md](CHANGELOG.md), and keep `GUIDE.md` and `GUIDE.html` in
  step if behaviour changes.

## Security

The embedded public key in `licence.php` is the verification half of the Digital
Fracture signing keypair and is safe to ship. Never add anything that phones home,
and never weaken the host-binding (it must come from config `site_url`, not the
request, to prevent Host-header spoofing).

Found a security issue? Please report it privately via
<https://digitalfracture.co.uk/contact.html> rather than opening a public issue.
