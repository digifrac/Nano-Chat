# Product

## Register

product

## Users

Three kinds of people:

- **The website visitor.** Arrives on a business's site, often non-technical, on any browser. Has never seen the app, installs nothing, and wants to be talking to the business within seconds. Sees only: a button, a short "what is it about?" picker, and a message box.
- **The operator (the business).** Keeps the console open all day on a shop or office PC as a chat desk. Logs in once with the admin password, then answers chats, seeing each conversation's subject in the queue.
- **The installer (a web designer).** Sets the line up once via the removable admin: branding, subjects, licence, and the embed snippet to paste onto a client's site. Often deploying it as a paid feature for a client.

## Product Purpose

A one-click "Chat with us" button for any website: a visitor taps it and talks to the business live in the browser. Plain text messages brokered by one PHP file on ordinary shared hosting, no database and no third party. Success: a visitor reaches the open console in a couple of seconds without help; the business trusts the page enough to leave it on as their chat desk all day; the installer can brand, license, and embed it in minutes.

## Brand Personality

Nano: small, hand-built, honest. The calm confidence of a desk tool, not the bustle of a SaaS chat app. Three words: minimal, dependable, quiet.

## Anti-references

- Not Discord/Teams/Slack: no channels, presence walls, chrome, or notification noise.
- Not a SaaS chat-widget: no bot, no canned-response tree, no pretend "leave a message" form when no one can answer. When the operator is offline it says so plainly.
- No framework aesthetics (Material, Bootstrap). This is a hand-built tool and should feel like one, in the good sense: precise, light, nothing generic.

## Design Principles

- One screen, one job: each state (choose subject, chatting; or for the operator: log in, queue, open thread) shows only what that moment needs.
- The conversation is the interface: the loudest element on any screen is the action that moves the chat forward.
- Restraint over ornament: one accent colour (set per business), generous whitespace, motion only to convey state (house ethos shared with the owner's other Nano projects).
- Honest about presence: both sides see online or away, both are told when a chat is closed, and the widget greys out when no one is there rather than collecting messages that go unread.

## Accessibility and Inclusion

- WCAG AA contrast minimums on the dark theme; verify muted text against card surfaces.
- Full keyboard operation (Enter to submit, focus-visible rings, logical tab order).
- prefers-reduced-motion alternatives for the status pulse and screen transitions.
- Visitors may be elderly or non-technical: large hit targets, plain-language labels and errors.
