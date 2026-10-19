const { chromium } = require('playwright');
(async()=>{
  const names = process.argv.slice(2);
  const b = await chromium.launch({args:['--allow-file-access-from-files']});
  const p = await b.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  for (const n of names){
    await p.goto('file://'+require('path').resolve(__dirname,'..','pages')+'/'+n+'.html');
    await p.evaluate(()=>document.fonts.ready);
    await p.waitForLoadState('networkidle');
    const missing = await p.evaluate(()=>[...document.fonts].filter(f=>f.status!=='loaded').map(f=>f.family+' '+f.status));
    await p.screenshot({path:require('path').resolve(__dirname,'..',n)+'.png'});
    console.log(n, 'fonts not loaded:', missing.join(',')||'none');
  }
  await b.close();
})();
