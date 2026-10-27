/** Real Chrome smoke test against a synthetic map. Does not establish real GEE compatibility. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const webpack = require('webpack');
const http = require('node:http');

async function main() {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'earth-agent-map-test-'));
  let chrome;
  let server;
  const pending = new Map();
  try {
    await new Promise((resolve, reject) =>
      webpack(
        {
          mode: 'production',
          devtool: false,
          entry: path.resolve(__dirname, '../tests/map-browser-entry.ts'),
          output: { path: temporary, filename: 'fixture.js' },
          resolve: { extensions: ['.ts', '.js'] },
          module: {
            rules: [
              {
                test: /\.ts$/,
                use: { loader: 'ts-loader', options: { transpileOnly: true } },
                exclude: /node_modules/,
              },
            ],
          },
        },
        (error, stats) =>
          error || stats.hasErrors() ? reject(error || new Error(stats.toString())) : resolve()
      )
    );
    const executable = process.env.MAP_TEST_CHROME || '/opt/google/chrome/chrome';
    chrome = spawn(
      executable,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--remote-debugging-pipe',
        `--user-data-dir=${path.join(temporary, 'profile')}`,
        ...(process.getuid?.() === 0 ? ['--no-sandbox'] : []),
        'about:blank',
      ],
      { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] }
    );
    let errors = '',
      buffer = '',
      sequence = 0;
    chrome.stderr.on('data', (chunk) => {
      errors = (errors + chunk).slice(-4000);
    });
    chrome.on('error', (error) => {
      for (const waiter of pending.values()) waiter.reject(error);
    });
    chrome.on('exit', () => {
      for (const waiter of pending.values()) waiter.reject(new Error(`Chrome exited: ${errors}`));
    });
    chrome.stdio[4].on('data', (chunk) => {
      buffer += chunk.toString();
      let index;
      while ((index = buffer.indexOf('\0')) !== -1) {
        const raw = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        if (!raw) continue;
        const message = JSON.parse(raw),
          waiter = pending.get(message.id);
        if (!waiter) continue;
        pending.delete(message.id);
        clearTimeout(waiter.timer);
        message.error
          ? waiter.reject(new Error(JSON.stringify(message.error)))
          : waiter.resolve(message.result);
      }
    });
    const send = (method, params = {}, sessionId) =>
      new Promise((resolve, reject) => {
        const id = ++sequence;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`CDP timeout: ${method}. ${errors}`));
        }, 15000);
        pending.set(id, { resolve, reject, timer });
        chrome.stdio[3].write(
          JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0'
        );
      });
    server = http.createServer((_request, response) => {
      response.setHeader('Content-Type', 'text/html');
      response.end('<!doctype html><html><body></body></html>');
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const page = (method, params) => send(method, params, sessionId);
    const evaluate = async (expression) => {
      const result = await page('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    await page('Page.enable');
    await page('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
    for (let i = 0; i < 50; i++) {
      if (await evaluate(`location.hostname === '127.0.0.1' && document.readyState === 'complete'`))
        break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.deepEqual(await evaluate(`({secure:isSecureContext,uuid:typeof crypto.randomUUID})`), {
      secure: true,
      uuid: 'function',
    });
    await page('Emulation.setDeviceMetricsOverride', {
      width: 1200,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await evaluate(
      `document.readyState === 'loading' ? new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, {once:true})) : true`
    );
    await evaluate(fs.readFileSync(path.join(temporary, 'fixture.js'), 'utf8'));
    const dispatch = (name, args) =>
      evaluate(`mapTest.dispatch(${JSON.stringify(name)}, ${JSON.stringify(args)})`);
    const context = await dispatch('mapInspect', { action: 'context' });
    assert.equal(context.rect.x, 100);
    assert.equal(context.rect.y, 120);
    assert.equal(context.viewport.devicePixelRatio, 2);
    const screenshot = await page('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    const png = Buffer.from(screenshot.data, 'base64');
    const frame = {
      mapId: context.mapId,
      revision: context.revision,
      width: png.readUInt32BE(16),
      height: png.readUInt32BE(20),
      viewportWidth: context.viewport.width,
      viewportHeight: context.viewport.height,
    };
    assert.equal(frame.width, 2400);
    assert.equal(frame.height, 1800);
    assert.deepEqual(
      (
        await dispatch('mapConvert', {
          direction: 'pixel_to_geo',
          revision: context.revision,
          space: 'screenshot',
          frame,
          pixel: { x: 1000, y: 740 },
        })
      ).coordinate,
      [0, 0]
    );
    await dispatch('mapAnnotate', {
      action: 'upsert',
      id: 'ea-point',
      geometry: { type: 'Point', coordinates: [0, 0] },
      label: 'Origin',
    });
    const before = await evaluate(
      `document.querySelector('[data-earth-agent-map]').shadowRoot.querySelector('circle').getAttribute('cx')`
    );
    await evaluate('mapTest.pan([10, 0])');
    // A fresh mutation requests a synchronous overlay render after pan.
    await dispatch('mapAnnotate', {
      action: 'upsert',
      id: 'ea-point',
      geometry: { type: 'Point', coordinates: [0, 0] },
    });
    const after = await evaluate(
      `document.querySelector('[data-earth-agent-map]').shadowRoot.querySelector('circle').getAttribute('cx')`
    );
    assert.ok(
      Number(after) < Number(before),
      'geographic overlay must move left when map pans east'
    );
    assert.equal(
      await evaluate(
        `mapTest.dispatch('mapConvert', ${JSON.stringify({ direction: 'pixel_to_geo', revision: context.revision, pixel: { x: 400, y: 250 } })}).then(()=>false,e=>e.message.includes('STALE_MAP_VIEW'))`
      ),
      true
    );
    // Visual guidance must not capture native GEE pointer input.
    await page('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: 500,
      y: 370,
      button: 'left',
      clickCount: 1,
    });
    await page('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: 500,
      y: 370,
      button: 'left',
      clickCount: 1,
    });
    assert.equal(await evaluate('mapTest.pointerCount()'), 1);
    assert.equal(
      await evaluate(
        "document.querySelector('[data-earth-agent-map]').shadowRoot.querySelectorAll('button,[data-vertex]').length"
      ),
      0
    );
    assert.equal(
      await evaluate(
        `(() => { new Function('Map','ui','ee',mapTest.setup); return !/require\\(|__webpack/.test(mapTest.setup) })()`
      ),
      true,
      'minified setup code must remain standalone'
    );
    console.log(
      'Chrome map smoke passed: DPR2 screenshot coordinates, overlay pointer passthrough, geographic pan, stale-view guard, standalone minified setup. Synthetic map only; real GEE verification still required.'
    );
  } finally {
    for (const waiter of pending.values()) clearTimeout(waiter.timer);
    if (chrome?.pid && chrome.exitCode === null && chrome.signalCode === null) {
      await new Promise((resolve) => {
        chrome.once('exit', resolve);
        chrome.kill('SIGTERM');
      });
    }
    if (server) await new Promise((resolve) => server.close(resolve));
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
