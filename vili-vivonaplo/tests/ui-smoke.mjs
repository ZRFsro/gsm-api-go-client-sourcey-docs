import {chromium,webkit} from "playwright";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import path from "node:path";

const root=path.resolve("vili-vivonaplo");
const types={".html":"text/html; charset=utf-8",".js":"text/javascript",".png":"image/png",".webmanifest":"application/manifest+json"};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
  const local=path.resolve(root,"."+pathname);
  if(!local.startsWith(root+path.sep)) {res.writeHead(403);res.end();return;}
  const data=await readFile(local);
  res.writeHead(200,{"Content-Type":types[path.extname(local)]||"application/octet-stream"});
  res.end(data);
 }catch(e){res.writeHead(404);res.end("Not found");}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const address="http://127.0.0.1:"+server.address().port+"/index.html";
const now=new Date();
const format=(x)=>{const p=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"Europe/Bratislava",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(x).map(x=>[x.type,x.value]));return p.year+"-"+p.month+"-"+p.day;};
const upcoming=format(new Date(now.getTime()+86400000*2));
const previous="2026-11-14";
const sample=[
 {id:"11111111-1111-4111-8111-111111111111",name:"Opavský listopad – teszt U11",date:upcoming,
  category:"U11 fiú tőr",city:"Opava, Csehország",source_status:"awaiting_results",source_url:"https://www.czechfencing.cz/portal/events/list",
  source_evidence:{schedule:upcoming+" 09:30 CET – U11 fiú tőr"},rank:null,field_size:null,wins:null,losses:null,photos:[],bouts:[]},
 {id:"22222222-2222-4222-8222-222222222222",name:"Jövő Bajnokai – teszt",date:previous,
  category:"U10 fiú tőr",city:"Budapest, Magyarország",source_status:"complete",
  source_url:"https://www.fencingtimelive.com/rounds/strips/example",source_evidence:{post_pool:{rank:8,size:29}},
  rank:17,field_size:29,wins:7,losses:3,photos:[],bouts:[]}
];
let passed=0,engineName="";
function check(ok,msg){if(!ok)throw Error(msg);passed++; console.log("PASS "+engineName+": "+msg);}
try {
 for (const [name,browserType] of [["Chromium",chromium],["WebKit",webkit]]) {
  engineName=name;
  const browser=await browserType.launch({headless:true,args:name==="Chromium"?["--no-sandbox"]:[]});
  try {
 for(const width of [320,375,390,768,1280]){
  const page=await browser.newPage({viewport:{width,height:820},deviceScaleFactor:2});
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.route("https://dcmmpkjfgjaqdzhzmzuh.supabase.co/functions/v1/vili-vivonaplo**",async(route)=>{
   const req=route.request(),action=new URL(req.url()).searchParams.get("action");
   const response=action==="whoami"?{role:null}:
     action==="login"?{role:"family",token:"fake-test-only-session"}:
     action==="events"?{role:"family",events:sample,collector:{configured:true,last_seen:new Date().toISOString()}}:
     action==="logout"?{ok:true}:{ok:true};
   await route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(response)});
  });
  await page.goto(address,{waitUntil:"domcontentloaded"});
  await page.locator("#loginForm").waitFor();
  await page.locator("#loginPass").fill("not-a-real-password");
  await page.locator("#loginForm button[type=submit]").click();
  await page.locator("#metricEvents").waitFor({state:"visible"});
  check(await page.locator("#metricEvents").innerText()==="2","event list loads ("+width+"px)");
  check(await page.locator(".race-date-badge").count()===2,"real competition date badges rendered ("+width+"px)");
  check(await page.locator("#upcomingPanel").isVisible(),"upcoming U11 card visible ("+width+"px)");
  check((await page.locator("#upcomingPanel").innerText()).includes("09:30"),"scheduled time visible ("+width+"px)");
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  check(overflow<=2,"no horizontal overflow "+width+"px, measured="+overflow);
  await page.locator("#seeUpcoming").click();
  const opened=await page.locator('[data-race="11111111-1111-4111-8111-111111111111"]').evaluate(e=>e.open);
  check(opened,"upcoming details opens real race card ("+width+"px)");
  await page.locator('[data-tab="progress"]').click();
  check((await page.locator("#content").innerText()).includes("43%"),"field-normalized placement is 43% ("+width+"px)");
  check(await page.locator(".result-chart").count()===1,"real-data chart renders as SVG ("+width+"px)");
  await page.locator('[data-tab="photos"]').click();
  check((await page.locator("#content").innerText()).includes("még nincs fényképe"),"empty album shown ("+width+"px)");
  check(!errors.length,"JavaScript runtime without uncaught exceptions ("+width+"px): "+errors.join(","));
  await page.close();
 }
 }finally{await browser.close();}
 }
 console.log("SMOKE_TESTS_PASSED="+passed);
}finally{await new Promise(r=>server.close(r));}