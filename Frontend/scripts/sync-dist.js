import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

// Determine if running from Frontend/ or workspace root
const isInsideFrontend = fs.existsSync(path.resolve('src')) && fs.existsSync(path.resolve('package.json'));
const frontendDir = isInsideFrontend ? process.cwd() : path.resolve('Frontend');
const rootDir = isInsideFrontend ? path.resolve('..') : process.cwd();

const outputPublic = path.resolve(frontendDir, '.output', 'public');
const frontendDist = path.resolve(frontendDir, 'dist');
const rootDist = path.resolve(rootDir, 'dist');
const publicDir = path.resolve(frontendDir, 'public');

async function getPrerenderedHtml(fallbackHtml, cssFile, jsFile) {
  const serverPath = path.resolve(frontendDir, '.output', 'server', 'index.mjs');
  if (!fs.existsSync(serverPath)) return fallbackHtml;

  return new Promise((resolve) => {
    try {
      const child = spawn('node', [serverPath], {
        cwd: frontendDir,
        env: { ...process.env, PORT: '3456', HOST: '127.0.0.1' },
        stdio: 'ignore'
      });

      const timer = setTimeout(async () => {
        try {
          const res = await fetch('http://127.0.0.1:3456/');
          if (res.ok) {
            let html = await res.text();
            child.kill();
            
            const timestamp = Date.now();
            
            // Bypass any stale browser/CDN caches for scripts and CSS
            if (jsFile) {
              html = html.replaceAll(jsFile, `${jsFile}?v=${timestamp}`);
            }

            // Inject direct resilient CSS links and backend config into head
            const headInjections = `
    <link rel="stylesheet" href="/assets/${cssFile}?v=${timestamp}" />
    <link rel="stylesheet" href="./assets/${cssFile}?v=${timestamp}" />
    <link rel="stylesheet" href="/styles.css?v=${timestamp}" />
    <link rel="stylesheet" href="./styles.css?v=${timestamp}" />
    <script>
      /* Hostinger Deployment Backend API Config:
         Change this URL if your backend runs on a different port/subdomain, e.g. 'https://api.yourdomain.com/api/v1' */
      window.__API_URL__ = window.__API_URL__ || (window.location.hostname === 'localhost' ? 'http://localhost:5002/api/v1' : window.location.origin + '/api/v1');
    </script>
  </head>`;
            html = html.replace('</head>', headInjections);
            console.log(`✓ Generated SSR prerendered index.html (${html.length} bytes) with cache-busting (?v=${timestamp})`);
            return resolve(html);
          }
        } catch (e) {
          // ignore
        }
        child.kill();
        resolve(fallbackHtml);
      }, 700);

      child.on('error', () => {
        clearTimeout(timer);
        resolve(fallbackHtml);
      });
    } catch {
      resolve(fallbackHtml);
    }
  });
}

async function run() {
  try {
    // 1. Clean previous dist folders to avoid stale hashed files
    for (const target of [frontendDist, rootDist]) {
      if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
      }
      fs.mkdirSync(target, { recursive: true });
    }

    // 2. Copy fresh .output/public contents to frontendDist and rootDist
    if (fs.existsSync(outputPublic)) {
      for (const target of [frontendDist, rootDist]) {
        fs.cpSync(outputPublic, target, { recursive: true });
      }
      console.log(`✓ Copied fresh .output/public -> Frontend/dist and root/dist`);
    }

    // 3. Ensure public folder assets (favicon.ico, robots.txt) are copied
    if (fs.existsSync(publicDir)) {
      for (const target of [frontendDist, rootDist, outputPublic]) {
        fs.cpSync(publicDir, target, { recursive: true });
      }
    }

    // 4. Locate the exact, freshest CSS and JS entries from the build
    const assetsDir = path.join(frontendDist, 'assets');
    if (fs.existsSync(assetsDir)) {
      const files = fs.readdirSync(assetsDir);
      const cssFile = files.find(f => f.endsWith('.css'));
      
      const indexJsFiles = files.filter(f => f.startsWith('index-') && f.endsWith('.js'));
      const jsFile = indexJsFiles.sort((a, b) => {
        return fs.statSync(path.join(assetsDir, b)).mtimeMs - fs.statSync(path.join(assetsDir, a)).mtimeMs;
      })[0] || files.find(f => f.endsWith('.js'));

      console.log(`✓ Active entry bundle: ${jsFile} | stylesheet: ${cssFile}`);

      const timestamp = Date.now();
      const fallbackHtml = `<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Bharat API Cloud — Banking & KYC APIs</title>
    <link rel="icon" href="/favicon.ico" type="image/x-icon" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" />
    <script>
      /* Hostinger Deployment Backend API Config:
         Change this URL if your backend runs on a different port/subdomain, e.g. 'https://api.yourdomain.com/api/v1' */
      window.__API_URL__ = window.__API_URL__ || (window.location.hostname === 'localhost' ? 'http://localhost:5002/api/v1' : window.location.origin + '/api/v1');
    </script>
    ${cssFile ? `<link rel="stylesheet" href="/assets/${cssFile}?v=${timestamp}" />` : ''}
    ${cssFile ? `<link rel="stylesheet" href="/styles.css?v=${timestamp}" />` : ''}
  </head>
  <body>
    <div id="root"></div>
    ${jsFile ? `<script type="module" crossorigin src="/assets/${jsFile}?v=${timestamp}"></script>` : ''}
  </body>
</html>
`;

      const finalHtml = await getPrerenderedHtml(fallbackHtml, cssFile, jsFile);

      for (const dir of [frontendDist, rootDist, outputPublic]) {
        fs.writeFileSync(path.join(dir, 'index.html'), finalHtml, 'utf-8');
        // Also copy stylesheet to root styles.css as an infallible fallback
        if (cssFile) {
          fs.copyFileSync(path.join(assetsDir, cssFile), path.join(dir, 'styles.css'));
        }
      }
    }

    // 5. Create robust .htaccess with no-cache headers, MIME types and standard SPA rewrite rules
    const htaccessContent = `<IfModule mod_headers.c>
  Header set Cache-Control "no-cache, no-store, must-revalidate"
  Header set Pragma "no-cache"
  Header set Expires 0
</IfModule>

<IfModule mod_mime.c>
  AddType application/javascript .js
  AddType application/javascript .mjs
  AddType text/css .css
  AddType image/svg+xml .svg
  AddType image/x-icon .ico
  AddType application/json .json
</IfModule>

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
`;

    for (const dir of [frontendDist, rootDist, outputPublic]) {
      fs.writeFileSync(path.join(dir, '.htaccess'), htaccessContent, 'utf-8');
    }
    console.log('✓ Created .htaccess with no-cache headers, mod_mime and SPA routing in all output dirs');
    console.log(`✓ Frontend/dist items: ${fs.readdirSync(frontendDist).length}, root/dist items: ${fs.readdirSync(rootDist).length}`);
  } catch (err) {
    console.error('Error syncing dist directory:', err.message);
  }
}

run();
