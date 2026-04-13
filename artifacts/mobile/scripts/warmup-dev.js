#!/usr/bin/env node
/**
 * warmup-dev.js
 * Starts Metro bundler then pre-warms the web bundle so the
 * Replit preview never has to wait for a cold compile.
 */
const { spawn } = require('child_process');
const http = require('http');

const PORT = process.env.PORT || 18115;

const env = {
  ...process.env,
  EXPO_PACKAGER_PROXY_URL: `https://${process.env.REPLIT_EXPO_DEV_DOMAIN}`,
  EXPO_PUBLIC_DOMAIN: process.env.REPLIT_DEV_DOMAIN,
  EXPO_PUBLIC_REPL_ID: process.env.REPL_ID,
  REACT_NATIVE_PACKAGER_HOSTNAME: process.env.REPLIT_DEV_DOMAIN,
};

const metro = spawn(
  'pnpm',
  ['exec', 'expo', 'start', '--localhost', '--port', String(PORT)],
  { env, stdio: 'inherit' }
);

metro.on('error', (err) => {
  console.error('Failed to start Metro:', err.message);
  process.exit(1);
});

metro.on('exit', (code) => {
  process.exit(code ?? 0);
});

process.on('SIGTERM', () => metro.kill('SIGTERM'));
process.on('SIGINT', () => metro.kill('SIGINT'));

// Poll until Metro is up, then trigger a warm-up web bundle
function waitForMetro(retries = 60, delay = 2000) {
  setTimeout(() => {
    const req = http.get(`http://localhost:${PORT}/`, (res) => {
      if (res.statusCode && res.statusCode < 500) {
        console.log('🔥 [warmup] Metro is up — triggering web bundle pre-warm...');
        const bundleUrl =
          `/node_modules/.pnpm/expo-router%406.0.23_` +
          `%40types%2Breact-dom%4019.1.11_%40types%2Breact%4019.1.17__%40types%2Breact%4019.1.17__` +
          `647f0c9f9fafa8cae778bbb6d28cc5ec/node_modules/expo-router/entry.js` +
          `?platform=web&dev=true&hot=false&lazy=true` +
          `&transform.engine=hermes&transform.routerRoot=app` +
          `&transform.reactCompiler=true&unstable_transformProfile=hermes-stable`;

        const warmup = http.get(`http://localhost:${PORT}${bundleUrl}`, (r) => {
          r.resume(); // drain the response
          console.log(`✅ [warmup] Web bundle pre-warm complete (status ${r.statusCode})`);
        });
        warmup.on('error', (e) => {
          console.warn('⚠️ [warmup] Bundle pre-warm request error:', e.message);
        });
        warmup.setTimeout(60000); // give the bundle up to 60s
      } else {
        retry(retries, delay);
      }
      res.resume();
    });
    req.on('error', () => retry(retries, delay));
    req.setTimeout(3000);
  }, delay);
}

function retry(remaining, delay) {
  if (remaining <= 0) {
    console.warn('⚠️ [warmup] Metro did not start in time — skipping pre-warm.');
    return;
  }
  waitForMetro(remaining - 1, delay);
}

waitForMetro();
