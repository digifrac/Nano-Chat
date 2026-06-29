# Nano Chat use cases

Nano Chat does one thing: a **"Chat with us" button** on a website that lets a
visitor message a business live in the browser. Free, nothing for the visitor to
install. The business keeps the operator console open like a chat desk. Below are
realistic ways to sell and place it.

## 1. "Chat with us" button for a small business (the core sell)

- **Setup:** the business keeps the console open on their shop or office PC
  (online as e.g. `acme-plumbing`). Paste the embed snippet on their site.
- **Flow:** a visitor taps the floating button, picks a subject ("Quote",
  "Booking", "Support"), and types. The office PC shows the chat in its queue,
  and the reply lands back with the visitor in a couple of seconds.
- **Why it sells:** almost no small business offers a one-click live chat on
  their own domain without a monthly SaaS bill. A feature you can add to every
  site you build.

## 2. Inline "talk to us" on a contact or pricing page

- **Setup:** drop the inline button (`<span data-nano-call-button>`) next to the
  address, in the contact section, or beside a pricing tier.
- **Flow:** instead of a contact form that lands in a quiet inbox, people get an
  answer while they are still on the page. The subject picker doubles as
  lightweight routing context ("Sales" vs "Support").

## 3. Service desk or reception line

- **Setup:** reception keeps the console open all day; subjects map to the things
  they handle ("New enquiry", "Existing order", "Complaint").
- **Flow:** the subject acts as a mini intake label, so whoever answers already
  knows what each chat is about before opening it.

## 4. Event or campaign window

- **Setup:** put the button live only during a sale, a product launch, or office
  hours. Because it is live-only, it greys out by itself the moment you close the
  console, so visitors outside the window are told to check back rather than left
  hanging.

## 5. A branded chat you actually own

- **Setup:** install it once on the client's own domain, set their colour and
  greeting, and (optionally) drop in a licence key to remove the badge.
- **Flow:** the conversation runs entirely on the client's host. No visitor data
  is handed to a third party, which is an easy selling point for anyone careful
  about privacy.

## What it is not

- Not a SaaS chat widget with a monthly fee, a bot, or a canned-response tree.
- Not an offline ticket queue. It is live chat: when no one is online, it says so
  instead of collecting messages an anonymous visitor could never get a reply to.
- Not a framework-heavy embed. It is one small script and one PHP file.
