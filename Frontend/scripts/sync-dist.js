import fs from 'node:fs';
import path from 'node:path';

const outputPublic = path.resolve('.output', 'public');
const distDir = path.resolve('dist');
const publicDir = path.resolve('public');

try {
  // Ensure dist directory exists
  fs.mkdirSync(distDir, { recursive: true });

  // 1. Copy .output/public contents to dist if available
  if (fs.existsSync(outputPublic)) {
    fs.cpSync(outputPublic, distDir, { recursive: true });
    console.log(`✓ Synced .output/public -> dist`);
  }

  // 2. Ensure public folder assets (favicon.ico, robots.txt) are copied
  if (fs.existsSync(publicDir)) {
    fs.cpSync(publicDir, distDir, { recursive: true });
    if (fs.existsSync(outputPublic)) {
      fs.cpSync(publicDir, outputPublic, { recursive: true });
    }
  }

  // 3. Find latest CSS and JS assets in assets folder
  const assetsDir = path.join(distDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    const cssFile = files.find(f => f.endsWith('.css'));
    const jsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js')) || files.find(f => f.endsWith('.js'));

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
    ${cssFile ? `<link rel="stylesheet" href="/assets/${cssFile}" />` : ''}
  </head>
  <body>
    <div id="root"></div>
    ${jsFile ? `<script type="module" src="/assets/${jsFile}"></script>` : ''}
  </body>
</html>
`;

    fs.writeFileSync(path.join(distDir, 'index.html'), htmlContent, 'utf-8');
    if (fs.existsSync(outputPublic)) {
      fs.writeFileSync(path.join(outputPublic, 'index.html'), htmlContent, 'utf-8');
    }
    console.log('✓ Generated production index.html');
  }

  // 4. Create .htaccess for SPA routing on Hostinger (Apache/LiteSpeed)
  const htaccessContent = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
`;
  fs.writeFileSync(path.join(distDir, '.htaccess'), htaccessContent, 'utf-8');
  if (fs.existsSync(outputPublic)) {
    fs.writeFileSync(path.join(outputPublic, '.htaccess'), htaccessContent, 'utf-8');
  }
  console.log('✓ Created .htaccess for SPA client-side routing');
  console.log(`✓ Output directory 'dist' is ready with ${fs.readdirSync(distDir).length} items`);
} catch (err) {
  console.error('Error syncing dist directory:', err.message);
  fs.mkdirSync(distDir, { recursive: true });
}
