/* Research-only browser probe: unauthenticated, fresh Chromium context, no project edits/saves.
 * Usage: PLAYWRIGHT_BROWSERS_PATH=... node bench_editor.cjs URL baseline|slow OUTPUT.json
 * Playwright is installed in the excluded .cache/phase2-tools directory, not in the product.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const {performance} = require('perf_hooks');
const playwrightRoot = process.env.PHASE2_PLAYWRIGHT || '/home/user/.cache/phase2-tools/node_modules/playwright';
const {chromium} = require(playwrightRoot);
const browserMemorySnapshot = require('./browser_memory.cjs');
const [url, profile, output, workflow = 'none'] = process.argv.slice(2);
if (!url || !['baseline', 'slow', 'heap128'].includes(profile) || !output || !['none', 'gdevelop-empty'].includes(workflow)) {
  console.error('Usage: node bench_editor.cjs URL baseline|slow|heap128 OUTPUT.json [none|gdevelop-empty]');
  process.exit(2);
}
const throttle = profile === 'slow' ? {rttMs: 150, downBytesPerSecond: 100000, upBytesPerSecond: 50000, cpuFactor: 4} : null;
const maxDurationMs = profile === 'slow' ? 180000 : 80000;
const settleMs = workflow === 'gdevelop-empty' ? (profile === 'slow' ? 15000 : 8000) : (profile === 'slow' ? 35000 : 18000);
const maxTransferBytes = 60 * 1024 * 1024;
function sanitizedUrl(s) {
  try {const u = new URL(s); return `${u.origin}${u.pathname.slice(0, 180)}`;}
  catch {return '(unparseable)';}
}
async function run() {
  const result = {
    purpose: 'external editor runtime research only; no authenticated session, no Desloop integration',
    timestamp: new Date().toISOString(), target: sanitizedUrl(url),
    browser: {engine: 'Playwright Chromium headless shell', version: null, playwright: require(require('path').join(playwrightRoot,'package.json')).version},
    profile, emulation: throttle ? {...throttle, note: 'CDP network/CPU emulation; not physical Ghana 3G, not physical low-RAM'} : {note: 'no CDP throttling'},
    sampleCount: 1, timeoutMs: maxDurationMs, settleMs, transferBudgetBytes: maxTransferBytes,
    workflow: {name: workflow, saved: false, authenticated: false, milestones: {}},
    navigation: {}, ui: {}, metrics: {}, requests: {responses: 0, failures: 0, statuses: {}, byHost: {}, topTransferred: []},
    pageErrors: [], observedErrors: [], limitations: ['single sample; cloud host and lab network', 'CDP JS heap is not device RAM', 'UI text alone does not prove editing, save or play']
  };
  let browser, page, context, cdp, timer;
  const requests = new Map();
  let bytes = 0, abortedForBudget = false;
  const start = performance.now();
  try {
    browser = await chromium.launch({headless: true, args: ['--no-sandbox', ...(profile === 'heap128' ? ['--js-flags=--max-old-space-size=128'] : [])]});
    result.browser.version = browser.version();
    result.browser.v8OldSpaceCapMiB = profile === 'heap128' ? 128 : null;
    context = await browser.newContext({viewport: {width: 1280, height: 800}, deviceScaleFactor: 1, acceptDownloads: false, serviceWorkers: 'allow'});
    page = await context.newPage();
    page.on('pageerror', e => {if (result.pageErrors.length < 12) result.pageErrors.push(String(e.message || e).slice(0, 240).replace(/https?:\/\/\S+/g, '(URL)'));});
    page.on('requestfailed', r => {result.requests.failures++; if (result.observedErrors.length < 15) result.observedErrors.push({resource: sanitizedUrl(r.url()), cause: r.failure()?.errorText?.slice(0, 100)});});
    cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Performance.enable');
    if (throttle) {
      await cdp.send('Network.emulateNetworkConditions', {offline: false, latency: throttle.rttMs, downloadThroughput: throttle.downBytesPerSecond, uploadThroughput: throttle.upBytesPerSecond, connectionType: 'cellular3g'});
      await cdp.send('Emulation.setCPUThrottlingRate', {rate: throttle.cpuFactor});
    }
    cdp.on('Network.responseReceived', ({requestId, response, type}) => {
      const host = (() => {try{return new URL(response.url).host;}catch{return '(unknown)';}})();
      const rec = {url: sanitizedUrl(response.url), host, type, status: response.status, encodedBytes: 0, cache: Boolean(response.fromDiskCache || response.fromServiceWorker)};
      requests.set(requestId, rec);
      result.requests.responses++;
      result.requests.statuses[response.status] = (result.requests.statuses[response.status] || 0) + 1;
    });
    cdp.on('Network.loadingFinished', ({requestId, encodedDataLength}) => {
      const r = requests.get(requestId); if (!r) return;
      r.encodedBytes = Math.max(0, encodedDataLength || 0);
      bytes += r.encodedBytes;
      const agg = result.requests.byHost[r.host] ||= {responses: 0, encodedBytes: 0};
      agg.responses++; agg.encodedBytes += r.encodedBytes;
      if (bytes > maxTransferBytes && !abortedForBudget) {abortedForBudget = true; result.observedErrors.push({cause: 'transfer budget exceeded'}); page.close().catch(()=>{});}
    });
    timer = setTimeout(() => {result.observedErrors.push({cause: 'duration budget exceeded'}); page.close().catch(()=>{});}, maxDurationMs);
    const navStart = performance.now();
    try {
      const response = await page.goto(url, {waitUntil: 'domcontentloaded', timeout: Math.min(maxDurationMs - 10000, 100000)});
      result.navigation = {httpStatus: response?.status() ?? null, domContentLoadedMs: Math.round(performance.now() - navStart)};
      if (workflow === 'gdevelop-empty') {
        const step = async (name, fn) => {
          await fn();
          result.workflow.milestones[name] = Math.round(performance.now() - navStart);
        };
        try {
          await step('createTabClickedMs', () => page.getByRole('button', {name: 'Create', exact: true}).click({timeout: maxDurationMs - 25000}));
          await step('newGameDialogOpenedMs', () => page.getByRole('button', {name: 'Create new game', exact: true}).click({timeout: 25000}));
          await step('emptyTemplateSelectedMs', () => page.locator('#empty-project-tile').click({timeout: 25000}));
          await step('unsavedChoiceSelectedMs', async () => {
            await page.locator('[role=dialog] select').selectOption('Empty', {timeout: 12000});
            await page.locator('[role=dialog] input[type=text]').fill('Isolated research - unsaved');
          });
          await step('createUnsavedGameClickedMs', () => page.locator('[role=dialog] button').last().click({timeout: 12000}));
          await step('sceneEditorVisibleMs', () => page.getByText('Untitled scene (Events)', {exact:true}).waitFor({state:'visible', timeout: 30000}));
          result.workflow.editorVisible = true;
          result.workflow.saveChoice = "Don't save this project now";
        } catch(e) {result.workflow.error = String(e.message || e).slice(0, 260);}
      }
      await page.waitForTimeout(settleMs);
    } catch(e) {result.navigation.error = String(e.message || e).slice(0, 250);}
    if (!page.isClosed()) {
      result.ui = await page.evaluate(() => ({
        documentTitle: document.title,
        locationPath: location.pathname,
        bodyTextFirst500: document.body?.innerText?.trim().slice(0,500) || '',
        buttons: document.querySelectorAll('button').length,
        canvases: document.querySelectorAll('canvas').length,
        inputs: document.querySelectorAll('input').length,
        iframeCount: document.querySelectorAll('iframe').length,
        gdGlobalPresent: Boolean(window.gd),
        scratchGUIStandalonePresent: Boolean(window.GUI?.createStandaloneRoot),
        jsHeapSizeLimitBytes: performance.memory?.jsHeapSizeLimit ?? null,
        navigationTiming: (()=> {const n=performance.getEntriesByType('navigation')[0];return n?{dclMs:Math.round(n.domContentLoadedEventEnd),loadMs:Math.round(n.loadEventEnd),transferSize:n.transferSize}:null;})()
      })).catch(e => ({error: e.message.slice(0, 180)}));
      try {const perf = await cdp.send('Performance.getMetrics'); result.metrics = Object.fromEntries(perf.metrics.filter(x => ['JSHeapUsedSize','JSHeapTotalSize','Nodes','Documents','Frames','JSEventListeners','TaskDuration','ScriptDuration'].includes(x.name)).map(x=>[x.name,x.value]));} catch(e) {result.metrics.error=e.message;}
      try {result.metrics.domCounters = await cdp.send('Memory.getDOMCounters');} catch(e) {result.metrics.domCounterError=e.message;}
      result.metrics.browserProcessMemory=browserMemorySnapshot();
    }
  } catch(e) {result.fatalError = String(e.message || e).slice(0, 300);}
  finally {
    clearTimeout(timer);
    result.totalMs = Math.round(performance.now() - start);
    result.requests.encodedBytes = bytes;
    result.requests.topTransferred = [...requests.values()].filter(x=>x.encodedBytes>0).sort((a,b)=>b.encodedBytes-a.encodedBytes).slice(0,12);
    try {await browser?.close();} catch{}
    fs.mkdirSync(require('path').dirname(output), {recursive: true});
    fs.writeFileSync(output, JSON.stringify(result, null, 2)+'\n');
    console.log(JSON.stringify({profile:result.profile,target:result.target,status:result.navigation.httpStatus,domContentLoadedMs:result.navigation.domContentLoadedMs,totalMs:result.totalMs,responses:result.requests.responses,encodedBytes:bytes,ui:result.ui,errors:result.pageErrors.slice(0,2),observedErrors:result.observedErrors.slice(0,3)},null,2));
  }
}
run().catch(e=>{console.error(e);process.exitCode=1;});
