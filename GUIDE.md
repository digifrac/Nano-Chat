# Nano Chat User Guide

A plain language guide to running Nano Chat: uploading the folder, setting a password, going online, and answering chats from your website visitors. You do not need to be a developer. If you can upload files and follow a few steps, you can run it.

## Contents

1. [What Nano Chat does](#what-nano-chat-does)
2. [How Nano Chat is laid out](#how-nano-chat-is-laid-out)
3. [Step 1: upload the folder](#step-1-upload-the-folder)
4. [Step 2: run the installer](#step-2-run-the-installer)
5. [Step 3: set your password and settings](#step-3-set-your-password-and-settings)
6. [Step 4: add the button to your site](#step-4-add-the-button-to-your-site)
7. [Step 5: tidy up](#step-5-tidy-up)
8. [Answering chats day to day](#answering-chats-day-to-day)
9. [What visitors see when you are offline](#what-visitors-see-when-you-are-offline)
10. [Editing your settings later](#editing-your-settings-later)
11. [If something does not work](#if-something-does-not-work)
12. [Cost and licence](#cost-and-licence)
13. [Need a hand](#need-a-hand)

## What Nano Chat does

Nano Chat puts a **"Chat with us"** button on your website. A visitor clicks it, chooses what their message is about, and types to you. You answer from a single page you keep open, like a chat desk. Messages travel over your normal web host. There is no third party service, no monthly fee, and nothing for the visitor to install.

It is **live chat**. When your page is open and you are online, messages go back and forth within a couple of seconds. When you are not online, the visitor's chat box greys out and tells them to check back, so no one is left waiting for a reply that cannot come.

## How Nano Chat is laid out

There are three simple parts.

**The admin sets it up.** A private admin area where you choose your password, your branding, and the list of subjects. You use it once at the start, then remove it.

**The console is where you answer.** One page you keep open. It shows the queue of chats and lets you reply.

**The button is what visitors see.** A small snippet you paste onto your website. It shows the button and opens the chat popup.

## Step 1: upload the folder

1. Open your file manager or FTP program.
2. Go into your website, the folder that holds your home page (often called `public_html`).
3. Upload the Nano Chat files into a new folder named `chat`.

You should now have `chat` sitting next to your home page, reachable at `https://yoursite.com/chat/`.

## Step 2: run the installer

1. In your browser, go to `https://yoursite.com/chat/install.php`.
2. You will see a config folder path already filled in. Leave it as it is unless you have a reason to change it.
3. Click the create button.

This sets up a small private folder, outside your website, where your password and settings are kept safe.

## Step 3: set your password and settings

The installer sends you to the admin page. There you:

1. Type an **admin password** (at least 10 characters), then type it again to confirm. This password also protects your console.
2. Set your **display name** (for example your business name), the **button label**, an **accent colour** and a short **greeting**.
3. List your **subjects**, one per line, for example `Sales`, `Support`, `General enquiry`. The first one is selected by default.
4. Set the **Site URL** to the address where Nano Chat is installed. This is used by your licence, if you buy one.
5. If you have a **licence key**, paste it in. This removes the small "Powered by Nano Chat" line.
6. Copy the **embed snippet** the page shows you. You will need it in the next step.

## Step 4: add the button to your site

Paste the snippet from the admin page onto any page that should have the button. There are two styles.

**A floating button** that sits in a corner of every page:

```html
<script src="https://yoursite.com/chat/js/embed.js" data-nano-call="floating"></script>
```

**An inline button** that appears exactly where you put the placeholder:

```html
<script src="https://yoursite.com/chat/js/embed.js"></script>
<span data-nano-call-button></span>
```

Both open the same chat popup, with your branding and label.

## Step 5: tidy up

1. Delete `install.php` from the `chat` folder. The installer offers a button to do this for you.
2. When you have finished your settings, delete the whole `admin` folder.

Your chat keeps working. Your password and settings are stored safely outside the website, and the console reads them as needed. Removing the admin just means there is nothing sensitive sitting on the public site while you are not editing.

## Answering chats day to day

1. Open `https://yoursite.com/chat/` and log in with your admin password.
2. Click **Go online** and leave the tab open. You are now staffing the line.
3. When a visitor starts a chat, it appears in your queue with its subject. A green dot shows when that visitor is currently on the page.
4. Click a chat to open it, type your reply, and send. The visitor sees it within a couple of seconds.
5. Click **Close chat** when the conversation is done. The visitor is told it was closed, and can send a new message to reopen it.

If you allow browser notifications, you get a small pop when a new chat comes in, even if the tab is in the background.

## Cleaning up old chats

You do not have to keep every chat. Junk and spam can be removed, on their own or in bulk.

- **Delete one chat.** Each chat in the queue has a small **×** on the right. Click it to delete that chat. You can also open a chat and use the **Delete** button at the top.
- **Clear closed.** The **Clear closed** button at the top of the queue removes every chat you have closed, in one go. A good end-of-day tidy.
- **Clear all.** The **Clear all** button removes every chat, open or closed. Use this with care.

Deleting asks you to confirm first, and it cannot be undone. Closing a chat is the gentle option (it can be reopened); deleting is permanent. Chats you never get round to clearing are removed on their own after 14 quiet days.

## What visitors see when you are offline

Nano Chat is live chat, so it is honest when no one is there. When your console is not online:

- The chat popup is **greyed out** and shows a short note asking the visitor to check back when you are online.
- The message box is disabled, so no one leaves a message that cannot be answered.
- As soon as you go online, the popup comes back to life on its own.

While a chat is open, both sides can see whether the other is online or away, and both are told when the other person closes the chat.

## Editing your settings later

When you want to change your settings, subjects or branding in future:

1. Upload the `admin` folder back into `chat`.
2. Go to `https://yoursite.com/chat/admin/` and log in.
3. Make your changes and save.
4. Delete the `admin` folder again when done.

## If something does not work

- **The installer cannot create the config folder.** Create it by hand in your file manager, set it to permission 750, then reload the installer page.
- **The page says it cannot write to data.** Set the `data` folder permission to 755 in your host control panel (look for a permissions or CHMOD option).
- **The button does not appear.** Check the snippet points at the right address, for example `https://yoursite.com/chat/js/embed.js`, and that the `chat` folder really is on the server.
- **You changed something but the site looks the same.** Your browser may be showing a saved copy. Refresh with the cache cleared (hold Ctrl and press F5), or open the page in a private window.

## Cost and licence

Nano Chat is **free** and MIT licensed. You can use it on as many sites as you like with a small "Powered by Nano Chat" line shown under the button.

To remove that line, you can buy a **per-domain licence key for 19.99 pounds**, a one off payment per domain. It is verified on your own server, with no phone-home and no monthly fee.

## Need a hand

Contact Digital Fracture through the website. Nano Chat is part of the Nano Suite, alongside Nano CMS, Nano Cart, Nano 301 and Nano GDPR.

Nano Chat is free and always will be. If it saved you some time, you can [buy me a coffee](https://buymeacoffee.com/digitalfracture). Thank you.
