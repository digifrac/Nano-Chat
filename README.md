# Nano Chat

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-digitalfracture-ffdd00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/digitalfracture)

A free, one-click **"Chat with us"** button for any website. A visitor taps it, picks what their message is about, and talks to the business live in the browser. Hand built, no frameworks, no Node, no database. It runs on any ordinary PHP web host.

**Live demo:** the "Chat with us" button is running in the footer of **[digitalfracture.co.uk](https://digitalfracture.co.uk)**. Scroll to the bottom and try it.

- **Visitor** sees a button (floating or inline), a short subject picker, and a message box. No account, no app, nothing to install.
- **Operator** (the business) keeps one page open as their chat desk and answers incoming chats, with each visitor's subject shown in the queue.
- **Messages flow over plain HTTPS** through one small PHP file. No WebRTC, no relay, no third party. That is what keeps it free to run.

Nano Chat is **live chat**. When your console is open, messages appear within a couple of seconds each way and it feels real time. When no one is online, the visitor's chat box greys out and says so, instead of taking a message that no one can answer. See [Live only, and why](#live-only-and-why).

## The three pieces

| Piece | File | Who uses it |
| --- | --- | --- |
| **Admin** | `admin/` | You, once, to set it up. **Removable** afterwards (delete the folder). |
| **Operator console** | `index.html` | The business. Kept open to receive chats. |
| **Visitor widget** | `js/embed.js` + `widget.html` | Website visitors. The button plus the chat popup. |

Before any of those you run a one-time **installer** (`install.php`) that chooses where your config is stored, in a directory **outside the webroot**, so your settings, operator password and licence key are never web reachable. It writes a small `bootstrap.php` pointing at that directory, then you delete it. Walked through below, and in plain language in the [user guide](GUIDE.md).

## Put it live

1. Upload the files into a folder called `chat/` on your host, so they sit next to your home page and answer at `https://yoursite.com/chat/`.
2. Make sure the `data/` folder is writable by PHP (most hosts: already is; otherwise set it to 755).
3. Run the installer: visit `https://yoursite.com/chat/install.php`. It proposes a config directory **outside your webroot** (where your settings, operator password and licence key are kept), creates it, and writes `bootstrap.php`. Accept the default or point it elsewhere above the webroot, then click the create button.
4. It hands you to `https://yoursite.com/chat/admin/`, where you:
   - create an **admin password** (this also protects the operator console),
   - set the **business handle**, display name, button label, accent and greeting,
   - list your **subjects** (one per line; the first is pre-selected),
   - set the **Site URL** (where Nano Chat is installed; this binds your licence),
   - paste a **licence key** if you have one (removes the "Powered by" line),
   - copy the **embed snippet** it shows you.
5. Open `https://yoursite.com/chat/` (the console), enter the admin password, **Go online**, and leave the tab open.
6. Paste the embed snippet onto the website that should have the button.

HTTPS is recommended so the conversation travels privately. Your host almost certainly has it.

### Harden it

Once configured, **delete `install.php`** and the **`admin/` folder** from the host (the admin page offers a one-click delete for `install.php`). The chat keeps running off your settings in the outside-webroot config directory; `signal.php` only ever reads them. Re-upload `admin/` whenever you want to change settings.

Your settings, operator password hash and licence key live in that config directory **above the webroot**, so they are never served even if `.htaccess` is ignored. The only thing in the webroot that points at it is `bootstrap.php` (PHP, never served as text), which `install.php` wrote for you.

## Add the button to a site

The embed script gives you two styles. Use either or both, on any website.

**Floating button** (parks in a page corner):

```html
<script src="https://yoursite.com/chat/js/embed.js" data-nano-call="floating"></script>
```

**Inline button** (renders exactly where you drop the placeholder):

```html
<script src="https://yoursite.com/chat/js/embed.js"></script>
<span data-nano-call-button></span>
```

Both open the same chat popup. Branding, label, position and the "Powered by" line come from your admin settings. `data-label` and `data-position` on the tag can override per placement. The popup is an iframe served from your Nano Chat host.

## How a chat flows

```
Visitor (any site)        signal.php              Operator console
  | taps Chat, picks         |                        |
  | subject + message        |                        |
  | message ----------------> |  (saved to a file)    |
  |                          | <-- console polls, sees |
  |                          |     the new chat in     |
  |                          |     the queue, opens it |
  |                          |     and replies ------->|
  | <---- reply (on poll) -- |                         |
  |======  live back and forth, a couple of seconds  ==|
```

Both sides poll `signal.php` every couple of seconds, so a new message lands within a moment. Each conversation is one small JSON file under `data/` (`chat-<visitor>.php`). There is no database.

## Live only, and why

Nano Chat is **live chat**, not a leave-a-message form. Visitors are anonymous and get a fresh throwaway identity every time they open the widget, so a reply left after they have gone could never reach them when they return. Rather than pretend to take such a message, the widget is honest about it:

- When your console is **online**, the button and popup work normally.
- When no one is online, the opening screen **greys out** and shows a short note asking the visitor to check back. The message box is disabled.
- The moment you go online, it comes back to life on its own. No reload needed.

Both sides also see each other's presence while chatting (online or away), and both are told when the other person closes the chat.

## Licence (per domain)

Nano Chat is **MIT licensed** (see `LICENSE`). The code is free to use, and free to run with the small **"Powered by Nano Chat"** line shown. To remove that line, buy a **per-domain licence key for £19.99 (one off, per domain)**. The line shows under the button and in the popup until a valid key for that domain is set.

- Verification is **local and cryptographic** (Ed25519, embedded public key). No phone-home, no network call.
- The licence binds to the host in your **Site URL** setting (never the request header, so it cannot be spoofed). `www.` is treated the same as the bare domain.
- Dev hosts (`localhost`, `*.test`, `*.local`, anything with a port) never show the line.

## Privacy and security

- **No accounts, no phone book, no logs.** The server stores only the business config, a per-browser token, and the open conversations. Visitors are anonymous throwaway names, swept automatically after 14 idle days. The operator can also delete any chat from the console, one at a time or in bulk ("Clear closed" / "Clear all").
- **The operator console is password protected.** Only someone with the admin password can put the business online, so a stranger cannot grab your line and read your chats.
- **Config, password and licence key live outside the webroot.** The installer puts them in a directory above your public folder, so they are never served even if `.htaccess` is ignored (for example on nginx). Only `bootstrap.php` (PHP, never sent as text) points at them. The transient in-webroot files under `data/` are additionally `.php`-guarded so a direct request returns 403.

## Test locally

With PHP installed (for example XAMPP):

```
php -S localhost:8090
```

Open `http://localhost:8090/install.php` first. It writes `bootstrap.php` and a config directory (the default sits beside the project, which is fine for local testing). Then `http://localhost:8090/admin/` to set up, `http://localhost:8090/` for the console, and `http://localhost:8090/widget.html` for the visitor widget.

## User guide

A plain language, step-by-step guide for non-technical operators is in **[GUIDE.md](GUIDE.md)** (and the same content as a styled page in `GUIDE.html`).

## Support

Nano Chat is free and MIT licensed. If it saved you a phone bill, or you just want to keep the Nano suite maintained, you can buy me a coffee:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-digitalfracture-ffdd00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/digitalfracture)

Grabbing a per-domain licence (above) supports it too, and removes the badge. Nano Chat is part of the Nano Suite, alongside Nano CMS, Nano Cart, Nano 301 and Nano GDPR.
