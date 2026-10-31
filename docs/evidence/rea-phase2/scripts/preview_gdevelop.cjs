/* Research-only probe of real GDevelop's anonymous, UNSAVED empty-project preview.
 * Requires Playwright@1.64.1 and its headless Chromium installed in .cache/phase2-tools.
 * Does not authenticate, save, publish, pay, call AI, or change the Desloop application.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const {performance} = require('perf_hooks');
const {chromium} = require(process.env.PHASE2_PLAYWRIGHT || '/home/user/.cache/phase2-tools/node_modules/playwright');
const browserMemorySnapshot = require('./browser_memory.cjs');
const output = process.argv[2];
if (!output) {console.error('Usage: node preview_gdevelop.cjs OUTPUT.json');process.exit(2);}
(async()=>{
  const r={timestamp:new Date().toISOString(), target:'https://editor.gdevelop.io/', test:'isolated anonymous unsaved empty project -> same-origin preview', browser:{playwright:'1.64.1'}, limits:['single baseline sample', 'empty project proves runtime boot, not gameplay or complex project performance', 'CDP JS heap is not physical RAM'], stages:{}, preview:{}, main:{}, errors:[]};
  const t0=performance.now(); let browser;
  try {
    browser=await chromium.launch({headless:true,args:['--no-sandbox']}); r.browser.chromium=browser.version();
    const ctx=await browser.newContext({viewport:{width:1280,height:800},acceptDownloads:false,serviceWorkers:'allow'});
    const p=await ctx.newPage();
    p.on('pageerror',e=>r.errors.push({page:'editor',message:e.message.slice(0,180)}));
    await p.goto(r.target,{waitUntil:'domcontentloaded',timeout:30000}); r.stages.navigationDclMs=Math.round(performance.now()-t0);
    await p.getByRole('button',{name:'Create',exact:true}).click({timeout:25000});
    await p.getByRole('button',{name:'Create new game',exact:true}).click({timeout:10000});
    await p.locator('#empty-project-tile').click({timeout:10000});
    await p.locator('[role=dialog] select').selectOption('Empty');
    await p.locator('[role=dialog] input[type=text]').fill('Isolated preview - unsaved');
    await p.locator('[role=dialog] button').last().click();
    await p.getByText('Untitled scene (Events)',{exact:true}).waitFor({state:'visible',timeout:20000});
    r.stages.editorVisibleMs=Math.round(performance.now()-t0);
    const next=ctx.waitForEvent('page',{timeout:20000});
    await p.getByRole('button',{name:'Preview',exact:true}).click({timeout:12000});
    const preview=await next; preview.on('pageerror',e=>r.errors.push({page:'preview',message:e.message.slice(0,180)}));
    await preview.waitForLoadState('domcontentloaded',{timeout:25000});
    r.stages.previewDocumentDclMs=Math.round(performance.now()-t0);
    await preview.waitForTimeout(4500);
    r.preview=await preview.evaluate(async()=>({
      locationPath:location.pathname,
      documentTitle:document.title,
      canvas:[...document.querySelectorAll('canvas')].map(c=>({width:c.width,height:c.height,webgl2:!!c.getContext('webgl2')})),
      gdjsRuntimeGamePresent:typeof window.gdjs?.RuntimeGame==='function',
      gdjsRuntimeScenePresent:typeof window.gdjs?.RuntimeScene==='function',
      runtimeScripts:[...document.querySelectorAll('script[src]')].length,
      runtimeScriptHosts:[...new Set([...document.querySelectorAll('script[src]')].map(s=>new URL(s.src).host))],
      scriptNames:[...document.querySelectorAll('script[src]')].filter(s=>/\/preview\/(code0|data)\.js/.test(s.src)).map(s=>new URL(s.src).pathname),
      serviceWorkerControlled:!!navigator.serviceWorker?.controller,
      swScopes:navigator.serviceWorker? (await navigator.serviceWorker.getRegistrations()).map(x=>x.scope) : []
    }));
    r.main=await p.evaluate(async()=>({
      editorVisible:document.body.innerText.includes('Untitled scene (Events)') && (document.body.innerText.includes('Preview') || document.body.innerText.includes('Update')),
      serviceWorkerControlled:!!navigator.serviceWorker?.controller,
      swScopes:navigator.serviceWorker?(await navigator.serviceWorker.getRegistrations()).map(x=>x.scope):[]
    }));
    const perfCdp=await ctx.newCDPSession(preview); await perfCdp.send('Performance.enable');
    const {metrics}=await perfCdp.send('Performance.getMetrics');
    r.preview.cdpMetrics=Object.fromEntries(metrics.filter(x=>['JSHeapUsedSize','JSHeapTotalSize','Nodes','ScriptDuration','TaskDuration'].includes(x.name)).map(x=>[x.name,x.value]));
    r.labBrowserProcesses=browserMemorySnapshot();
    r.stages.previewObservedMs=Math.round(performance.now()-t0);
  } catch(e) {r.error=String(e.message||e).slice(0,260);}
  finally {try{await browser?.close();}catch{};r.totalMs=Math.round(performance.now()-t0);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1});
