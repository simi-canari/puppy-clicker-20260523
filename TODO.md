# Testing checklist

- [ ] Fix incorrect button dimensions; verify sizing on desktop, mobile and the itch.io embedded player.

Deployment reference: [itch.io HTML5 deployment guide](docs/itchio-deployment-guide.md).

Repeat on Windows, Android Chrome and iPhone Safari, in the browser and installed PWA.

- [ ] Audio works after backgrounding, locking and reopening, at the saved volume.
- [ ] Offline reopening retains the image, both sounds, slider and saved preferences.
- [ ] Update prompt waits for acceptance; reload preserves settings and a second tab stays open.

Browser data clearing/private browsing can remove saved settings. App volume is relative
to device volume; it does not change the device volume setting.
