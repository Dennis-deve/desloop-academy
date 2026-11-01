import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const built = resolve(root, 'dist/learning-loop-review');
const html = await readFile(resolve(built, 'index.html'), 'utf8');
const assets = await readdir(resolve(built, 'assets'));
const jsAssets = assets.filter((name) => extname(name) === '.js');
const cssAssets = assets.filter((name) => extname(name) === '.css');
if (jsAssets.length !== 1 || cssAssets.length !== 1 || assets.length !== 2) {
  throw new Error(`The review must be exactly one JS and one CSS file before inlining: ${assets}`);
}
const [js, css, logo] = await Promise.all([
  readFile(resolve(built, 'assets', jsAssets[0]), 'utf8'),
  readFile(resolve(built, 'assets', cssAssets[0]), 'utf8'),
  readFile(resolve(root, 'public/brand/brandmark-dark.webp')),
]);
if (!js.includes('__DESLOOP_BRAND_MARK__'))
  throw new Error('The original brand asset marker was not bundled.');
if (/\b(?:src|href)=["']https?:/i.test(html) || /url\(\s*["']?https?:/i.test(css)) {
  throw new Error('A review file must not depend on a live external stylesheet, font or script.');
}
const dataLogo = `data:image/webp;base64,${logo.toString('base64')}`;
const scriptRef = `<script type="module" crossorigin src="./assets/${jsAssets[0]}"></script>`;
const styleRef = `<link rel="stylesheet" crossorigin href="./assets/${cssAssets[0]}">`;
if (!html.includes(scriptRef) || !html.includes(styleRef))
  throw new Error('Unexpected Vite HTML output; refusing a broken inline artifact.');
const result = html
  .replace(
    scriptRef,
    () =>
      `<script type="module">${js.replaceAll('__DESLOOP_BRAND_MARK__', dataLogo).replace(/<\/script/gi, '<\\/script')}</script>`,
  )
  .replace(styleRef, () => `<style>${css}</style>`);
if (
  /src="\.\/assets\//.test(result) ||
  /href="\.\/assets\//.test(result) ||
  result.includes('__DESLOOP_BRAND_MARK__')
)
  throw new Error('Review still depends on a build asset.');
const target = resolve(root, '..', 'Desloop_Learning_Loop_Design_Review.html');
await writeFile(target, result);
console.log(
  `Self-contained review: ${target} (${Math.round(Buffer.byteLength(result) / 1024)} KiB)`,
);
