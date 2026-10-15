# Trip Itinerary

A password-protected itinerary page for GitHub Pages. There's no build step.

The itinerary is stored **encrypted** in `trip-data.enc.js` (AES-256-GCM, with the key derived from the trip password). The repo and the site are public, but without the password they show only a lock screen and scrambled data.

## Files
- `trip-data.enc.js`: the encrypted itinerary (days, stops, key info, checklist, tips).
- `index.html`, `app.js`, `styles.css`: the page and lock screen.
- `tools/encrypt.mjs`: encrypts a plaintext `trip-data.js` from the command line (optional).

## Revising the plan
1. Open the site, unlock it and tap **Edit**. Changes save on that device right away.
2. Tap **⋯ → Export for GitHub**. This downloads a new `trip-data.enc.js`, encrypted with the same password.
3. In the repo on GitHub: **Add file → Upload files**, drop in `trip-data.enc.js` and commit. The site updates in about a minute.

## Other menu items
- **Change password**: re-encrypts with a new password and downloads `trip-data.enc.js`. Upload it to make the change live, then share the new password.
- **Discard local edits**: goes back to the published version.
- **Lock this device**: forgets the saved password on this device.

## From the command line (optional)
```bash
TRIP_PASSWORD='the password' node tools/encrypt.mjs trip-data.js > trip-data.enc.js
```
`trip-data.js` (plaintext) is git-ignored, so it never gets committed.

## Notes
- Anyone with the password can read everything, so share it like a door code.
- Edits you haven't exported live in that browser's storage only.
- The page has `noindex` set, so search engines won't list it.
