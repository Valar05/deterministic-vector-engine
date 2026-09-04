import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('../controller.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('../controller.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../controller.css', import.meta.url), 'utf8');

assert.match(html, /id="game"/);
assert.match(html, /id="moveZone"/);
assert.match(html, /id="lookZone"/);
assert.match(html, /id="jumpButton"/);
assert.match(html, /id="fullscreenButton"/);
assert.match(html, /id="accessibleMovement"/);
assert.match(js, /function compileNoodleBox/);
assert.doesNotMatch(js, /BoxGeometry/);
assert.match(js, /new THREE\.BufferGeometry/);
assert.match(js, /new THREE\.GridHelper/);
assert.match(js, /requestFullscreen/);
assert.match(js, /pointercancel/);
assert.match(js, /visibilitychange/);
assert.match(js, /window\.__noodleController/);
assert.match(css, /100dvh/);
assert.match(css, /safe-area-inset/);

const server = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], { cwd: root, stdio: 'inherit' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await sleep(900);
  const chrome = process.env.CHROME || 'google-chrome';
  const common = ['--headless=new','--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars','--window-size=1280,720','--virtual-time-budget=5000'];
  const shot = spawnSync(chrome, [...common,'--screenshot=controller-pixels.png','http://127.0.0.1:8765/controller.html?seed=pixel-proof'], { cwd: root, encoding:'utf8' });
  if (shot.status !== 0) throw new Error(`chrome screenshot failed: ${shot.stderr || shot.stdout}`);
  const png = new URL('../controller-pixels.png', import.meta.url);
  assert.ok(existsSync(png), 'controller screenshot must exist');
  assert.ok(statSync(png).size > 10000, `controller screenshot suspiciously small: ${statSync(png).size}`);

  const dom = spawnSync(chrome, [...common,'--dump-dom','http://127.0.0.1:8765/controller.html?seed=pixel-proof'], { cwd: root, encoding:'utf8' });
  if (dom.status !== 0) throw new Error(`chrome DOM canary failed: ${dom.stderr || dom.stdout}`);
  assert.match(dom.stdout, /NOODLE KATA/);
  assert.match(dom.stdout, /pixel-proof/);
  assert.doesNotMatch(dom.stdout, /loading deterministic arena…/);
  console.log(JSON.stringify({ok:true,contract:'noodle-controller-pixels',screenshotBytes:statSync(png).size,seed:'pixel-proof'}));
} finally {
  server.kill('SIGTERM');
}
