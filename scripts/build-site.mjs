import fs from 'node:fs';
import path from 'node:path';

export function buildSite(rootDir = '.', outDirName = '_site') {
  const root = path.resolve(rootDir);
  const outDir = path.resolve(root, outDirName);

  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  const allowlist = [
    'index.html',
    'studio.js',
    'wall-live.js',
    'replay.js',
    'robots.txt',
    'sitemap.xml',
    'site.webmanifest',
    'og-image.png',
    'og-image.svg',
    '_headers',
    'CNAME',
    'SECURITY.md'
  ];

  allowlist.forEach(file => {
    const src = path.join(root, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(outDir, file));
    }
  });

  const editionSrc = path.join(root, 'data', 'edition.json');
  if (fs.existsSync(editionSrc)) {
    fs.mkdirSync(path.join(outDir, 'data'), { recursive: true });
    fs.copyFileSync(editionSrc, path.join(outDir, 'data', 'edition.json'));
  }

  const assetsSrc = path.join(root, 'assets');
  if (fs.existsSync(assetsSrc)) {
    fs.cpSync(assetsSrc, path.join(outDir, 'assets'), { recursive: true });
  }

  const srcDir = path.join(root, 'src');
  if (fs.existsSync(srcDir)) {
    fs.cpSync(srcDir, path.join(outDir, 'src'), { recursive: true });
  }

  const rootFiles = fs.readdirSync(root);
  rootFiles.forEach(f => {
    if (/^(favicon|apple-touch-icon|icon-).*\.(png|svg|ico)$/i.test(f)) {
      fs.copyFileSync(path.join(root, f), path.join(outDir, f));
    }
  });

  return { ok: true, outDir };
}

// CLI execution
buildSite(process.cwd(), '_site');
console.log('✓ _site built successfully with allowlisted public assets.');
