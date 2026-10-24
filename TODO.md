# Testing checklist

Repeat on Windows, Android Chrome and iPhone Safari, in the browser and installed PWA.

- [ ] Volume slider: try 0%, 25%, 50% and 100%; both press and release sounds follow it.
- [ ] At 0%, clicks are silent but the counter, animation and haptics still work.
- [ ] Close and reopen the webpage/PWA: volume is restored, including 0%.
- [ ] Change theme, haptics or counter visibility after adjusting volume: all preferences remain saved.
- [ ] Existing users without a saved volume start at 100%, retaining their other settings.
- [ ] Slider works with touch/mouse and keyboard arrows, and has a screen-reader label/value.
- [ ] Long hold, quick release and rapid presses retain the correct in/out sound sequence.
- [ ] Audio works after backgrounding, locking and reopening, at the saved volume.
- [ ] Offline reopening retains the image, both sounds, slider and saved preferences.
- [ ] Update prompt waits for acceptance; reload preserves settings and a second tab stays open.
- [ ] Slider and percentage remain readable in light/dark themes on narrow phones.
- [ ] Native Android: volume changes affect click playback; existing controls still work.

Browser data clearing/private browsing can remove saved settings. App volume is relative
to device volume; it does not change the device volume setting.
