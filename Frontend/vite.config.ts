import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import fs from "node:fs";
import path from "node:path";

function syncDistPlugin() {
  return {
    name: "sync-dist-plugin",
    closeBundle() {
      try {
        const frontendDir = process.cwd();
        const rootDir = path.resolve(frontendDir, "..");
        const outputPublic = path.resolve(frontendDir, ".output", "public");
        const frontendDist = path.resolve(frontendDir, "dist");
        const rootDist = path.resolve(rootDir, "dist");
        const publicDir = path.resolve(frontendDir, "public");

        const targetDirs = [frontendDist, rootDist];

        for (const dir of targetDirs) {
          fs.mkdirSync(dir, { recursive: true });
          if (fs.existsSync(outputPublic)) {
            fs.cpSync(outputPublic, dir, { recursive: true });
          }
          if (fs.existsSync(publicDir)) {
            fs.cpSync(publicDir, dir, { recursive: true });
          }

          const assetsDir = path.join(dir, "assets");
          if (fs.existsSync(assetsDir)) {
            const files = fs.readdirSync(assetsDir);
            const cssFile = files.find((f) => f.endsWith(".css"));
            const jsFile = files.find((f) => f.startsWith("index-") && f.endsWith(".js")) || files.find((f) => f.endsWith(".js"));

            const htmlContent = `<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="alternate icon" href="/favicon.ico" type="image/x-icon" />
    <link rel="apple-touch-icon" href="/favicon.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" />
    <script>
      /* Bharat API Cloud Backend Gateway Config: */
      window.__API_URL__ = window.__API_URL__ || (window.location.hostname === 'localhost' ? 'http://localhost:5002/api/v1' : 'https://brown-goldfish-546701.hostingersite.com/api/v1');
    </script>
    ${cssFile ? `<link rel="stylesheet" href="/assets/${cssFile}" />` : ""}
  </head>
  <body>
    <div id="root"></div>
    ${jsFile ? `<script type="module" src="/assets/${jsFile}"></script>` : ""}
  </body>
</html>
`;
            fs.writeFileSync(path.join(dir, "index.html"), htmlContent, "utf-8");
          }

          const htaccessContent = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
`;
          fs.writeFileSync(path.join(dir, ".htaccess"), htaccessContent, "utf-8");
        }
      } catch (err) {
        // Safe fallback
      }
    },
  };
}

export default defineConfig({
  nitro: {
    preset: "node-server",
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  plugins: [syncDistPlugin()],
});
