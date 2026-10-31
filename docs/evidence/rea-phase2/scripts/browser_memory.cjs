/* Snapshot headless Chromium process memory in THIS isolated lab.
 * PSS shares mapped pages proportionally; it is still NOT a mobile-device measurement.
 * Only use when this is the sole Chromium instance in the workspace.
 */
'use strict';
const fs=require('fs');
module.exports=function browserMemorySnapshot(){
  let pssKiB=0,rssKiB=0,processes=0,unreadable=0;
  for(const pid of fs.readdirSync('/proc').filter(s=>/^\d+$/.test(s))){
    try{
      const cmdline=fs.readFileSync(`/proc/${pid}/cmdline`).toString('utf8').split('\0');
      // Chromium child processes may replace argv[0] with a space-separated process title.
      // Match only the genuine binary path PREFIX (not shell commands mentioning that path).
      const browserPath=(process.env.PLAYWRIGHT_BROWSERS_PATH||'/home/user/.cache/ms-playwright').replace(/\/$/,'');
      if(!cmdline[0]?.startsWith(browserPath+'/chromium_headless_shell-') || !cmdline[0].includes('/chrome-headless-shell'))continue;
      const status=fs.readFileSync(`/proc/${pid}/status`,'utf8');
      const rss=Number(status.match(/^VmRSS:\s+(\d+)\s+kB/m)?.[1]||0);
      const rollup=fs.readFileSync(`/proc/${pid}/smaps_rollup`,'utf8');
      const pss=Number(rollup.match(/^Pss:\s+(\d+)\s+kB/m)?.[1]||0);
      pssKiB+=pss;rssKiB+=rss;processes++;
    }catch{unreadable++;}
  }
  return {processes,pssKiB,rssKiB,unreadable,note:'single-time Chromium process snapshot, shared pages counted proportionally by PSS; not actual device RAM use or peak'};
};
