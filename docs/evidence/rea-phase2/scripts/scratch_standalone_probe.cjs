/* Research-only isolated Scratch Foundation @scratch/scratch-gui@15.3.0 standalone distribution.
 * The genuine, integrity-checked npm package dist is served only to this one-shot lab browser on
 * 127.0.0.1; outbound browser requests are denied. It is NOT a Desloop feature or public demo.
 * Usage: PLAYWRIGHT_BROWSERS_PATH=... node scratch_standalone_probe.cjs baseline|slow OUT.json
 */
'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),zlib=require('zlib');
const {performance}=require('perf_hooks');
const {chromium}=require(process.env.PHASE2_PLAYWRIGHT||'/home/user/.cache/phase2-tools/node_modules/playwright');
const browserMemorySnapshot=require('./browser_memory.cjs');
const [profile,output]=process.argv.slice(2);
if (!['baseline','slow','heap128'].includes(profile)||!output) {console.error('Usage: node scratch_standalone_probe.cjs baseline|slow|heap128 OUT.json');process.exit(2);}
const dist=process.env.PHASE2_SCRATCH_DIST||'/home/user/.cache/phase2-tools/scratch-dist/package/dist';
const main=path.join(dist,'scratch-gui-standalone.js');
if (!fs.existsSync(main)) {console.error('Verified npm dist not extracted at '+main);process.exit(2);}
const index=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isolated Scratch package test (not Desloop)</title><style>html,body,#scratch{width:100%;height:100%;padding:0;margin:0;overflow:hidden}</style></head><body><div id="scratch"></div><script src="/scratch-gui-standalone.js"></script><script>try {GUI.setAppElement(document.getElementById('scratch')); window.__editorState=new GUI.EditorState({});window.__scratchRoot=GUI.createStandaloneRoot(window.__editorState,document.getElementById('scratch'));window.__scratchRoot.render({projectId:'0',canEditTitle:false,canSave:false,backpackVisible:false,showComingSoon:false});window.__bootState='render-called';}catch(e){window.__bootError=String(e);console.error(e);}</script></body></html>`;
const mime={'.js':'application/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.woff2':'font/woff2','.woff':'font/woff','.mp3':'audio/mpeg','.wav':'audio/wav','.ico':'image/x-icon','.wasm':'application/wasm','.hex':'application/octet-stream'};
const gzip=zlib.gzipSync(fs.readFileSync(main),{level:6});
const throttle=profile==='slow'?{latencyMs:150,downloadBytesPerSec:100000,uploadBytesPerSec:50000,cpuFactor:4}:null;
const maxMs=profile==='slow'?150000:55000;
const maxTransferBytes=80*1024*1024;
const result={timestamp:new Date().toISOString(),purpose:'research only; authentic current Scratch npm standalone distribution, no Desloop integration',package:{name:'@scratch/scratch-gui',version:'15.3.0',tarSha256:'7d82aa70885f70ede5e20645df44d5ce8b6462c7a08d1784bd902e7f0f547eea',standaloneJsRawBytes:fs.statSync(main).size,standaloneJsGzipBytes:gzip.length},browser:{playwright:'1.64.1'},profile,network:{mode:'ephemeral loopback static server; no external browser requests allowed',emulation:throttle,blockedHosts:{},responses:0,encodedBytes:0,failures:0,statuses:{}},limits:['not a real Ghana network or low-RAM device','no physical RAM constraint','one cold-context run; local loopback server, not production CDN'],maxMs,maxTransferBytes,ui:{},runtime:{},metrics:{},errors:[]};
const server=http.createServer((req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(index);return;}
    const rel=decodeURIComponent(url.pathname).replace(/^\/+/, ''); const filename=path.resolve(dist,rel);
    if(!filename.startsWith(dist+path.sep)||!fs.existsSync(filename)||!fs.statSync(filename).isFile()){res.writeHead(404);res.end();return;}
    const headers={'Content-Type':mime[path.extname(filename).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'};
    if(filename===main){headers['Content-Encoding']='gzip';headers['Content-Length']=gzip.length;res.writeHead(200,headers);res.end(gzip);return;}
    res.writeHead(200,headers);fs.createReadStream(filename).pipe(res);
  }catch(e){res.writeHead(400);res.end();}
});
(async()=>{let browser,ctx,page,cdp,timer;const t0=performance.now();try{
  await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',err=>err?reject(err):resolve()));const port=server.address().port;
  browser=await chromium.launch({headless:true,args:['--no-sandbox',...(profile==='heap128'?['--js-flags=--max-old-space-size=128']:[])]});result.browser.chromium=browser.version();
  result.browser.v8OldSpaceCapMiB=profile==='heap128'?128:null;
  ctx=await browser.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',acceptDownloads:false});
  await ctx.route('**/*',route=>{let u;try{u=new URL(route.request().url());}catch{}
    if((u?.hostname==='127.0.0.1'&&u.port===String(port)) || u?.protocol==='blob:' || u?.protocol==='data:'){return route.continue();}
    const host=u?.host||'(unknown)';result.network.blockedHosts[host]=(result.network.blockedHosts[host]||0)+1;
    return route.abort('blockedbyclient');
  });
  page=await ctx.newPage();page.on('pageerror',e=>{if(result.errors.length<12)result.errors.push({kind:'pageerror',message:e.message.slice(0,220)});});
  page.on('requestfailed',r=>{result.network.failures++;if(result.errors.length<12)result.errors.push({kind:'requestfailed',host:new URL(r.url()).host,error:r.failure()?.errorText?.slice(0,100)});});
  cdp=await ctx.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Performance.enable');
  if(throttle){await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:throttle.latencyMs,downloadThroughput:throttle.downloadBytesPerSec,uploadThroughput:throttle.uploadBytesPerSec,connectionType:'cellular3g'});await cdp.send('Emulation.setCPUThrottlingRate',{rate:throttle.cpuFactor});}
  cdp.on('Network.responseReceived',({response})=>{result.network.responses++;result.network.statuses[response.status]=(result.network.statuses[response.status]||0)+1;});
  cdp.on('Network.loadingFinished',({encodedDataLength})=>{result.network.encodedBytes+=Math.max(0,encodedDataLength||0);if(result.network.encodedBytes>maxTransferBytes&&!page.isClosed()){result.errors.push({kind:'budget',message:'transfer budget exceeded'});page.close().catch(()=>{});}});
  timer=setTimeout(()=>{result.errors.push({kind:'budget',message:'duration budget exceeded'});page.close().catch(()=>{});},maxMs);
  const navStart=performance.now();
  try{const r=await page.goto(`http://127.0.0.1:${port}/`,{waitUntil:'domcontentloaded',timeout:maxMs-8000});result.nav={status:r?.status(),dclMs:Math.round(performance.now()-navStart)};
    try {
      await page.waitForFunction(()=>window.__editorState?.store?.getState()?.scratchGui?.vm?.runtime?.targets?.length>0,null,{timeout:profile==='slow'?30000:12000});
      result.projectLoadedElapsedMs=Math.round(performance.now()-navStart);
    } catch(e) {result.errors.push({kind:'project-load',message:'default project did not load within bounded wait: '+e.message.slice(0,115)});}
    await page.waitForTimeout(profile==='slow'?6000:3500);
  }catch(e){result.nav={error:e.message.slice(0,220),elapsedMs:Math.round(performance.now()-navStart)};}
  if(!page.isClosed()){
    result.ui=await page.evaluate(()=>({title:document.title,bootState:window.__bootState||null,bootError:window.__bootError||null,guiGlobalPresent:!!window.GUI,jsHeapSizeLimitBytes:performance.memory?.jsHeapSizeLimit??null,bodyFirst850:document.body?.innerText?.slice(0,850),buttons:document.querySelectorAll('button').length,canvases:document.querySelectorAll('canvas').length,svgCount:document.querySelectorAll('svg').length,stagePresence:!!document.querySelector('[class*=stage]'),blocklyPresence:!!document.querySelector('.blocklySvg'),greenFlagPresence:!!document.querySelector('[class*=green-flag]'),editorStatePresent:!!window.__editorState})).catch(e=>({error:e.message.slice(0,150)}));
    try {
      result.runtime.beforeFlag=await page.evaluate(()=>{const vm=window.__editorState?.store?.getState()?.scratchGui?.vm;window.__vmStarts=0;vm?.on('PROJECT_START',()=>{window.__vmStarts++;});return {vmPresent:!!vm,targets:vm?.runtime?.targets?.map(x=>({name:x.sprite?.name,isStage:x.isStage}))||[],vmRuntimeStepping:!!vm?.runtime?._steppingInterval};});
      await page.getByRole('button',{name:'Start project',exact:true}).click({timeout:8000});
      await page.waitForTimeout(300);
      result.runtime.afterFlag=await page.evaluate(()=>({projectStartEvents:window.__vmStarts,threads:window.__editorState?.store?.getState()?.scratchGui?.vm?.runtime?.threads?.length}));
    } catch(e) {result.runtime.error=e.message.slice(0,220);}
    try{const {metrics}=await cdp.send('Performance.getMetrics');result.metrics=Object.fromEntries(metrics.filter(x=>['JSHeapUsedSize','JSHeapTotalSize','Nodes','Documents','ScriptDuration','TaskDuration'].includes(x.name)).map(x=>[x.name,x.value]));}catch(e){result.metrics.error=e.message.slice(0,150);}
    result.metrics.browserProcessMemory=browserMemorySnapshot();
  }
}catch(e){result.fatalError=e.message.slice(0,240);}finally{clearTimeout(timer);try{await browser?.close();}catch{};await new Promise(resolve=>server.close(resolve));result.totalMs=Math.round(performance.now()-t0);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
