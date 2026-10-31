# Puppy Clicker — itch.io HTML5 deployment guide

**Repository:** https://github.com/simi-canari/puppy-clicker-20260523  
**itch.io page:** https://simonpasi96.itch.io/puppy-clicker  
**Original web app:** https://puppy-clicker.sophia-aqua.com/

## Goal

Publish the existing Expo / React Native Web app as a **browser-playable itch.io tool**, rather than an APK. The standard `npm run build:web` output works on the main website but needs asset-path adjustments for itch.io's nested hosting directory.

## Working method (manual release)

Run these commands in **PowerShell**, from `C:\Repositories\puppy-clicker-20260523`.

### 1. Build the web app

```powershell
npm ci
npm run build:web
```

The build exports the site into `dist/` and creates a PWA service worker. We will adjust a **copy of the build output**, not the source code.

### 2. Make itch.io-compatible paths and package the build

The script below:

- Changes the HTML's `/ _expo`-style root-relative URL into a relative URL (without the space).
- Renames `_expo` to `expo-assets` (this name change was part of our successful test, though not proven strictly necessary).
- Disables the PWA registration **only in this itch.io package**, since itch.io runs the app in a hosted iframe.
- Changes the JavaScript bundle's root-relative `/assets/...` URLs for images and sounds into `./assets/...` URLs.
- Creates a ZIP with **forward-slash paths**, which was the crucial fix for serving nested JavaScript files on itch.io.

Paste this complete block into PowerShell:

```powershell
@'
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import re

root = Path('dist')
html_file = root / 'index.html'
html = html_file.read_text(encoding='utf-8-sig')

# Rename Expo output folder if this is a fresh build.
old_dir = root / '_expo'
new_dir = root / 'expo-assets'
if old_dir.exists():
    old_dir.rename(new_dir)

# All browser asset references must remain inside the itch.io project path.
html = html.replace('="/_expo/', '="./expo-assets/')
html = html.replace('="./_expo/', '="./expo-assets/')
html = html.replace('="/assets/', '="./assets/')
html = html.replace('<script src="./pwa.js" defer></script>', '')
html_file.write_text(html, encoding='utf-8')

# Expo also embeds root-relative image/sound paths in its JS bundle.
bundles = list((new_dir / 'static/js/web').glob('index-*.js'))
if not bundles:
    raise SystemExit('No Expo JS bundle found; inspect dist/ before uploading.')
for bundle in bundles:
    js = bundle.read_text(encoding='utf-8')
    js, count = re.subn(r'''(["'])/assets/''', r'\1./assets/', js)
    bundle.write_text(js, encoding='utf-8')
    print(f'{bundle.name}: patched {count} asset URLs')

output = Path('puppy-clicker-itch.zip')
with ZipFile(output, 'w', ZIP_DEFLATED) as zip_file:
    for file in root.rglob('*'):
        if file.is_file():
            zip_file.write(file, file.relative_to(root).as_posix())

with ZipFile(output) as zip_file:
    names = zip_file.namelist()
    assert 'index.html' in names
    assert any(name.startswith('expo-assets/static/js/web/index-') and name.endswith('.js') for name in names)
    assert all('\\' not in name for name in names)
print(f'Created {output.resolve()}')
'@ | python -
```

**Expected ZIP structure:**

```text
index.html
expo-assets/static/js/web/index-<hash>.js
assets/assets/images/clicker.<hash>.png
assets/assets/sounds/click in.<hash>.mp3
assets/assets/sounds/click out.<hash>.mp3
...
```

Do **not** run `npm run build:web` *after* patching and before uploading: it would replace the patched `dist/` output. If you need another build, just repeat both steps.

### 3. Upload to itch.io

1. Open **Edit tool** on https://simonpasi96.itch.io/puppy-clicker.
2. Keep **Classification: Tools** and **Kind of project: HTML**.
3. Upload/replace `puppy-clicker-itch.zip` and designate it playable in the browser.
4. Save and test while the project is still in **Draft**.
5. Once the clicker, audio, and settings work, switch visibility to **Public**.

### 4. Smoke test

- The blue clicker illustration appears.
- Clicking/tapping plays sound; test both press and release.
- The click counter and reset work.
- Settings, volume and light/dark themes work.
- DevTools → Console/Network contains no `404` for `.js`, `.png`, or `.mp3` files.
- Test on desktop and a mobile browser. Ignore itch.io's unrelated iframe `monetization`, `xr`, and `allowfullscreen` warnings if functionality works.

## What went wrong (and why these fixes exist)

1. **JS 404 at `https://html-classic.itch.zone/_expo/...`**: `index.html` contained an absolute asset path. Changing to a relative path made the request target the project's subdirectory.
2. **JS 404 even with a relative path**: The Windows-created ZIP displayed backslash-separated entry names, such as `_expo\static\js\web\...`. Rebuilding with Python `ZipFile` and POSIX-style forward slashes allowed the JS to load.
3. **Clicker image and sound 404**: Expo's minified JavaScript contained `/assets/...` URLs, which pointed at itch.io's domain root. Rewriting them to `./assets/...` fixed loading of the clicker and audio.
4. **Service-worker precaching failure**: The missing JS originally caused a precache error; for this embedded build we removed the `pwa.js` registration script. Keep normal PWA support for the separate primary website.
5. **Remaining warning**: React Native Web may report an `Animated` / `useNativeDriver` fallback warning. It isn't the missing-asset problem and did not prevent the clicker image from rendering.

## Known layout issue

- Button dimensions are not right. Review and correct button sizing, then verify the layout on desktop and mobile, including the itch.io embedded player.

## Future automation with butler

This manual ZIP is a bridge. The desired follow-up is:

**GitHub push → build web → apply itch.io path fixes → butler push to `simonpasi96/puppy-clicker:html5`.**

Use an itch.io API key stored as a GitHub Actions secret `BUTLER_API_KEY` (never commit it). Official documentation: https://itch.io/docs/butler/ . Do not blindly upload the ordinary unpatched `dist/` to itch.io: the root-relative URLs would break again. Prefer extracting the transformation above into a checked-in build script, then testing it before enabling automatic deployment on every push.

**Current status:** The screenshots from October 25, 2026 show the blue clicker rendering on the itch.io draft page after the asset-path patch. Verify audible click behavior before declaring the release complete.
