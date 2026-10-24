# Puppy Clicker web build

Run `npm ci`, then `npm run build:web`. Deploy the contents of `dist` to the
root of an HTTPS static site. `dist/index.html` is the app; `dist/privacy.html`
is a copy of the unchanged root privacy policy. Do not publish the repository
root as the app. Android commands and configuration are unchanged.

The production build generates the Workbox worker after Expo exports its assets.
It precaches the app shell, icons, clicker image, and both click sounds. Workbox
is bundled locally, with no CDN dependency. Development (`npm run web`) does not
register the worker. Offline operation requires a successful initial online load
and completed service-worker installation; browser storage can still be evicted.

## Local review

Serve `dist` over HTTP on **localhost** using a static server (for example
`python -m http.server 8080 --directory dist`) and open `http://localhost:8080`.
Localhost supports service workers. A phone accessing your computer's LAN IP over
plain HTTP does not; phone testing needs an HTTPS test URL, once deployment is
approved. No deployment is performed by the build command.

1. In browser developer tools, confirm the manifest, icons and service worker
   load, and wait for the worker installation to finish. Reload once online.
2. Install with Chrome's Install option on desktop/Android. On iPhone use Safari's
   Share menu, then Add to Home Screen (and Open as Web App if shown).
3. Close and reopen the installed app. Confirm its name, icon and standalone
   display. Test both phone orientations/sizes supported by your browser.
4. Test a long hold, quick release and rapid repeated presses. Release should
   wait for click in to finish; a new press cancels the previous sequence.
5. Change settings, close the app, enable airplane mode and reopen. Check the
   image, both sounds, settings persistence and internal screens. External links
   still need internet. Repeat after backgrounding and locking/unlocking.

## Update review

Keep the old app open. Make a visible temporary change in a separate test build,
run `npm run build:web` again, and serve it at the **same origin and path**.
Bring the old app back to the foreground, or use developer tools to check for a
service-worker update. Do not enable “Update on reload” or “Bypass for network”
while testing the real update flow.

The new worker installs in the background. The current session continues until
the user selects **Update available — Reload**. Accept it, confirm the new build
appears and settings remain, then test offline again. An already-open second tab
must not reload automatically when the first tab accepts the update.

For hosting, send `Cache-Control: no-cache` for `index.html`, `sw.js`, `pwa.js`
and `manifest.json`; hashed Expo assets may be cached long-term. Serve the worker
as JavaScript, not an HTML fallback. Publish each complete `dist` together and
retain older hashed assets if the host supports it, for sessions still running
the previous build. Cache cleanup affects Workbox caches, not saved app settings.
