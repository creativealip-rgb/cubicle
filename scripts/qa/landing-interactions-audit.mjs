import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const base=process.env.BASE_URL||'https://dev.cubiqlo.com';
const out=process.env.OUT_DIR||'/tmp/cubiqlo-landing-interactions';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const report=[];
for(const d of [{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}]){
 const ctx=await browser.newContext({viewport:{width:d.width,height:d.height}}); const p=await ctx.newPage();
 const errors=[],failed=[]; p.on('console',m=>{if(m.type()==='error')errors.push(m.text())}); p.on('requestfailed',r=>failed.push(r.url()));
 await p.goto(base,{waitUntil:'networkidle'});
 // Load all lazy assets.
 await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=500){scrollTo(0,y);await new Promise(r=>setTimeout(r,60))}scrollTo(0,0)});
 await p.waitForTimeout(500);
 const images=await p.locator('img').evaluateAll(xs=>xs.map(x=>({alt:x.alt,src:x.currentSrc,complete:x.complete,naturalWidth:x.naturalWidth}))); 
 const anchors={}; for(const id of ['workflow','portal','compare','pricing']){if(!await p.locator(`a[href="#${id}"]:visible`).count()&&d.name==='mobile')await p.locator('summary[aria-label]').click();await p.locator(`a[href="#${id}"]:visible`).first().click(); await p.waitForTimeout(150); anchors[id]={hash:await p.evaluate(()=>location.hash),top:await p.locator(`#${id}`).evaluate(e=>Math.round(e.getBoundingClientRect().top))};}
 // Language toggle both directions and persisted copy.
 const en=p.getByRole('button',{name:'EN'}), id=p.getByRole('button',{name:'ID'}); await en.click(); await p.waitForLoadState('networkidle'); const english=await p.locator('h1').innerText(); await id.click(); await p.waitForLoadState('networkidle'); const indonesian=await p.locator('h1').innerText();
 const authHrefs=await p.locator('a[href*="app.cubiqlo.com/login"],a[href*="app.cubiqlo.com/signup"]').evaluateAll(xs=>xs.map(x=>x.href));
 const legal=[]; for(const href of ['/terms','/privacy']){const r=await p.request.get(new URL(href, base).href);legal.push({href,status:r.status()})}
 const touch=await p.locator('a,button,summary').evaluateAll(xs=>xs.filter(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return r.width&&r.height&&s.visibility!=='hidden'}).map(e=>({text:e.textContent?.trim().slice(0,50),label:e.getAttribute('aria-label'),w:Math.round(e.getBoundingClientRect().width),h:Math.round(e.getBoundingClientRect().height)})).filter(x=>x.h<40||x.w<40));
 if(d.name==='mobile'){await p.locator('summary[aria-label]').click(); await p.screenshot({path:`${out}/mobile-menu.png`});}
 await p.screenshot({path:`${out}/${d.name}-full.png`,fullPage:true});
 report.push({device:d.name,images,broken:images.filter(x=>!x.complete||!x.naturalWidth),anchors,english,indonesian,authHrefs,legal,touch,errors,failed,overflow:await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)});
 await ctx.close();
}
await browser.close(); await fs.writeFile(`${out}/result.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
