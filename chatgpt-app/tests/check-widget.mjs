import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../widget.html', import.meta.url), 'utf8');
const server = fs.readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');

assert.match(server, /registerAppTool\(server, 'play_noodle3d'/);
assert.match(server, /registerAppResource\(server, 'Noodle3D Controller'/);
assert.match(server, /ui:\/\/noodle3d\/controller\.html/);
assert.match(server, /StreamableHTTPServerTransport/);
assert.match(server, /enableJsonResponse: true/);
assert.match(html, /window\.openai\?\.requestDisplayMode/);
assert.match(html, /mode:'fullscreen'/);
assert.match(html, /<svg id="view"/);
assert.match(html, /function cam\(v\)/);
assert.match(html, /function proj\(v,w,h\)/);
assert.match(html, /function arena\(seed\)/);
assert.match(html, /const faces=/);
assert.match(html, /data-d="f"/);
assert.match(html, /id="move"/);
assert.match(html, /id="look"/);
assert.match(html, /id="jump"/);
assert.match(html, /pointercancel/);
assert.match(html, /visibilitychange/);
assert.doesNotMatch(html, /THREE\.|three\.module|WebGL|BoxGeometry|canvas\.getContext/);
assert.doesNotMatch(html, /Math\.random/);
assert.doesNotMatch(html, /https?:\/\//);

const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'inline widget script missing');
new Function(script);

console.log(JSON.stringify({
  ok: true,
  contract: 'noodle3d-chatgpt-widget',
  renderer: 'svg-vector-projection',
  fullscreen: 'host-requestDisplayMode',
  externalRuntimeDependencies: 0,
}));
