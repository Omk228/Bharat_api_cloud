import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import os from 'node:os';

async function setupRedis() {
  const redisDir = path.join(os.homedir(), '.redis-portable');
  const zipPath = path.join(redisDir, 'redis.zip');
  const exePath = path.join(redisDir, 'redis-server.exe');

  console.log('🚀 Setting up Portable Redis for Windows...');
  console.log(`📁 Target Directory: ${redisDir}`);

  if (!fs.existsSync(redisDir)) {
    fs.mkdirSync(redisDir, { recursive: true });
  }

  if (!fs.existsSync(exePath)) {
    console.log('📥 Downloading Portable Redis v5.0.14 from GitHub releases...');
    const url = 'https://github.com/tporadowski/redis/releases/download/v5.0.14.1/Redis-x64-5.0.14.1.zip';
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download Redis: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(zipPath, Buffer.from(arrayBuffer));
    console.log('📦 Extracting Redis binaries...');

    execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${redisDir}' -Force"`);
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    console.log('✅ Extraction complete!');
  } else {
    console.log('✅ Redis binaries already downloaded.');
  }

  // Check if Redis is already running on port 6379
  try {
    const checkPort = execSync('powershell -Command "Test-NetConnection -ComputerName 127.0.0.1 -Port 6379 -InformationLevel Quiet"').toString().trim();
    if (checkPort === 'True') {
      console.log('✅ Redis Server is ALREADY running on port 6379!');
      return;
    }
  } catch (e) {}

  console.log('🚀 Starting Redis Server on port 6379 (Background Process)...');
  const child = spawn(exePath, ['--maxheap', '512M'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    cwd: redisDir
  });
  child.unref();

  // Wait 1.5 seconds and test connection
  await new Promise(r => setTimeout(r, 1500));
  
  try {
    const verify = execSync('powershell -Command "Test-NetConnection -ComputerName 127.0.0.1 -Port 6379 -InformationLevel Quiet"').toString().trim();
    if (verify === 'True') {
      console.log('🎉 Redis Server successfully started and LISTENING on 127.0.0.1:6379!');
    } else {
      console.log('⚠️ Redis spawned, port will be active shortly.');
    }
  } catch (e) {}
}

setupRedis().catch(err => {
  console.error('❌ Redis setup failed:', err.message);
});
