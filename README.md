# Trip Guide

A password-protected personal trip guide for GitHub Pages. There's no build step.

The trip is stored **encrypted** in `trip-data.enc.js` (AES-256-GCM, with the key derived from the trip password). The repo and site are public, but without the password they show only a lock screen.

## What's in it
- **Today**: what's happening now and next, local and Vancouver time, reminders, today's plan, tomorrow's preview, to-dos and anything still missing.
- **Plan**: a day strip covering the whole trip, a timeline for each day with how to get between stops, and a detail sheet for every stop (tips, address → Maps, hours, cost, booking, nearby).
- **Guide**: city guides with quick facts, must-sees (linked to your plan), food, neighbourhoods, getting around, good-to-knows, Made Theory inspiration and "your places".
- **Trip**: the route, bookings, contacts (call, text or email), the checklist, notes and settings.

## Editing
Tap **Edit** (top right) and tap anything to change it. Each item opens a form, and edits save on that device as you type. Use **+ Add** rows to add stops, days, bookings, contacts, tasks, notes and guide items.

## Publishing
Tap **Publish**.
- **One-tap (recommended):** connect GitHub once with a fine-grained token that has *Contents: Read and write* access to this repo only. The page walks you through it. After that, Publish encrypts and commits `trip-data.enc.js` for you.
- **Manual:** download the file, then on GitHub use *Add file → Upload files* and commit.

## Files
- `trip-data.enc.js`: the encrypted trip.
- `index.html`, `app.js`, `styles.css`: the app.
- `tools/encrypt.mjs`: encrypts a plaintext `trip-data.js` from the command line:
  ```bash
  TRIP_PASSWORD='the password' node tools/encrypt.mjs trip-data.js > trip-data.enc.js
  ```
  `trip-data.js` (plaintext) is git-ignored, so it never gets committed.

## Notes
- Anyone with the password can read everything, so share it like a door code.
- The GitHub token and saved password live only in that browser's storage. Use **Trip → Lock this device** to forget the password.
- The page has `noindex` set, so search engines won't list it.
