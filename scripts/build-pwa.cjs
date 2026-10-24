const { generateSW } = require('workbox-build');
const fs = require('node:fs/promises');
const path = require('node:path');

async function main() {
  const root = path.resolve(__dirname, '..');
  const dist = path.join(root, 'dist');
  const htmlPath = path.join(dist, 'index.html');
  const html = await fs.readFile(htmlPath, 'utf8');
  // The privacy policy remains the original root file, copied under its own URL.
  await fs.copyFile(path.join(root, 'index.html'), path.join(dist, 'privacy.html'));
  const registrationScript = '<script src="./pwa.js" defer></script>';
  await fs.writeFile(htmlPath, html.includes(registrationScript) ? html :
    html.replace('</body>', `${registrationScript}</body>`));
  const { count, size, warnings } = await generateSW({
    globDirectory: dist,
    globPatterns: ['**/*.{html,js,css,json,png,jpg,jpeg,webp,svg,ico,mp3,woff,woff2,ttf}'],
    globIgnores: ['sw.js', 'workbox-*.js'],
    swDest: path.join(dist, 'sw.js'),
    // Bundle Workbox locally: offline startup must not depend on a CDN.
    inlineWorkboxRuntime: true,
    cleanupOutdatedCaches: true,
    skipWaiting: false,
    clientsClaim: false,
    navigateFallback: 'index.html',
    navigateFallbackDenylist: [/\/privacy\.html$/],
  });
  if (warnings.length) throw new Error(warnings.join('\n'));
  console.log(`PWA: precached ${count} files (${size} bytes).`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
