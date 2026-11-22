import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../assets/fonts');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const cssUrl = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,500;0,600;1,300;1,500&family=Hanken+Grotesk:wght@400;500;600&display=swap';

async function run() {
  console.log('Fetching Google Fonts stylesheet...');
  const res = await fetch(cssUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const css = await res.text();

  // Parse @font-face blocks
  const blocks = css.split('@font-face').slice(1);
  let localCss = '';
  let index = 0;

  for (const rawBlock of blocks) {
    const block = rawBlock.trim();
    const familyMatch = block.match(/font-family:\s*['"]?([^'";]+)['"]?/);
    const styleMatch = block.match(/font-style:\s*([^;]+);/);
    const weightMatch = block.match(/font-weight:\s*([^;]+);/);
    const urlMatch = block.match(/src:\s*url\((https:[^)]+)\)\s*format\(['"]?woff2['"]?\)/);
    const unicodeMatch = block.match(/unicode-range:\s*([^;]+);/);

    if (!familyMatch || !urlMatch) continue;

    const family = familyMatch[1].trim();
    const fontStyle = styleMatch ? styleMatch[1].trim() : 'normal';
    const fontWeight = weightMatch ? weightMatch[1].trim() : '400';
    const fontUrl = urlMatch[1].trim();
    const unicodeRange = unicodeMatch ? unicodeMatch[1].trim() : '';

    const safeFamily = family.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const fileName = `${safeFamily}-${fontWeight}-${fontStyle}-${++index}.woff2`;
    const filePath = path.join(outDir, fileName);

    console.log(`Downloading ${family} ${fontWeight} ${fontStyle} (${fileName})...`);
    const fontRes = await fetch(fontUrl);
    const fontBuf = Buffer.from(await fontRes.arrayBuffer());
    fs.writeFileSync(filePath, fontBuf);

    localCss += `@font-face {\n  font-family: '${family}';\n  font-style: ${fontStyle};\n  font-weight: ${fontWeight};\n  font-display: swap;\n  src: url('assets/fonts/${fileName}') format('woff2');\n  unicode-range: ${unicodeRange};\n}\n`;
  }

  fs.writeFileSync(path.join(outDir, 'fonts.css'), localCss, 'utf8');
  console.log('✓ Successfully downloaded fonts and generated assets/fonts/fonts.css');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
