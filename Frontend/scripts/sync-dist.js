import fs from 'node:fs';
import path from 'node:path';

// Determine if running from Frontend/ or workspace root
const isInsideFrontend = fs.existsSync(path.resolve('src')) && fs.existsSync(path.resolve('package.json'));
const frontendDir = isInsideFrontend ? process.cwd() : path.resolve('Frontend');
const rootDir = isInsideFrontend ? path.resolve('..') : process.cwd();

const outputPublic = path.resolve(frontendDir, '.output', 'public');
const frontendDist = path.resolve(frontendDir, 'dist');
const rootDist = path.resolve(rootDir, 'dist');
const publicDir = path.resolve(frontendDir, 'public');

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
    
    // Sort index-*.js files by modification time so the freshest chunk is always chosen
    const indexJsFiles = files.filter(f => f.startsWith('index-') && f.endsWith('.js'));
    const jsFile = indexJsFiles.sort((a, b) => {
      return fs.statSync(path.join(assetsDir, b)).mtimeMs - fs.statSync(path.join(assetsDir, a)).mtimeMs;
    })[0] || files.find(f => f.endsWith('.js'));

    console.log(`✓ Active entry bundle: ${jsFile} | stylesheet: ${cssFile}`);

    const htmlContent = `<!DOCTYPE html>
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
    ${cssFile ? `<link rel="stylesheet" href="/assets/${cssFile}" />` : ''}
  </head>
  <body>
    <div id="root"></div>
    ${jsFile ? `<script type="module" crossorigin src="/assets/${jsFile}"></script>` : ''}
  </body>
</html>
`;

    for (const dir of [frontendDist, rootDist, outputPublic]) {
      fs.writeFileSync(path.join(dir, 'index.html'), htmlContent, 'utf-8');
    }
    console.log('✓ Generated production index.html in all output dirs');
  }

  // 5. Create robust .htaccess with MIME types and standard SPA rewrite rules
  const htaccessContent = `<IfModule mod_mime.c>
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
  console.log('✓ Created .htaccess with mod_mime and SPA routing in all output dirs');
  console.log(`✓ Frontend/dist items: ${fs.readdirSync(frontendDist).length}, root/dist items: ${fs.readdirSync(rootDist).length}`);
} catch (err) {
  console.error('Error syncing dist directory:', err.message);
}
