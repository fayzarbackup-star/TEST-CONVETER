import puppeteer from 'puppeteer';
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']});const p=await b.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('requestfailed',r=>errs.push('FAIL '+r.url()));
for(const [w,h,n] of [[1440,900,'desk'],[390,844,'mob']]){await p.setViewport({width:w,height:h,deviceScaleFactor:1});
await p.goto((process.argv[2]||'http://localhost:3008/ui-revamp/index.html'),{waitUntil:'networkidle0'});await new Promise(r=>setTimeout(r,500));
const ov=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);console.log(n,'overflowX',ov);
await p.screenshot({path:String.raw`C:\Users\Admin\AppData\Local\Temp\claude\c--Users-Admin--gemini-antigravity-ide-scratch-fayzar-bangla-converter\609fa5cd-3252-4e05-9346-d2213c286921\scratchpad\ui-${n}.png`,fullPage:n==='mob'?false:false});
await p.screenshot({path:String.raw`C:\Users\Admin\AppData\Local\Temp\claude\c--Users-Admin--gemini-antigravity-ide-scratch-fayzar-bangla-converter\609fa5cd-3252-4e05-9346-d2213c286921\scratchpad\ui-${n}-full.png`,fullPage:true});}
console.log(errs.join('\n')||'no errors');await b.close();
