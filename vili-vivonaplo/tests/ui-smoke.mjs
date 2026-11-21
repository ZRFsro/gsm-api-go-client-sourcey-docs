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
  source_evidence:{schedule:upcoming+" 09:30 CET – U11 fiú tőr",ftl_tournament_schedule:"https://www.fencingtimelive.com/tournaments/eventSchedule/AB4F797396B5483DA011976CC6B4ED36#today",geostab_pdf_available:false},rank:null,field_size:null,wins:null,losses:null,photos:[],bouts:[]},
 {id:"22222222-2222-4222-8222-222222222222",name:"Jövő Bajnokai – teszt",date:previous,
  category:"U10 fiú tőr",city:"Budapest, Magyarország",source_status:"complete",
  source_url:"https://www.fencingtimelive.com/rounds/strips/example",source_evidence:{post_pool:{rank:8,size:29},pool_results:[{round:1,pool_rank:3,pool_size:5},{round:2,pool_rank:1,pool_size:6}]},
  rank:17,field_size:29,wins:7,losses:3,photos:[],bouts:[{stage:"Csoport 1",opponent:"Teszt ellenfél",my_score:5,their_score:3}]},
 {id:"33333333-3333-4333-8333-333333333333",name:"Szlovák Kupa – vegyes mezőny",date:"2026-10-31",
  category:"U11 fiú tőr",city:"Pozsony, Szlovákia",source_status:"not_connected",
  source_evidence:{post_pool:{rank:20,size:21}},rank:10,field_size:15,wins:0,losses:5,photos:[],bouts:[]}
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
  await page.clock.setFixedTime(new Date('2026-11-21T08:15:00Z'));
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
  await page.locator("#raceLiveModal").waitFor({state:"visible"});
  check(await page.locator("#raceLiveModal").isVisible(),"race-day popup opens before login ("+width+"px)");
  check((await page.locator("#raceLiveOfficial").innerText()).includes("Vili élő naplójának"),"race-day popup opens our family diary instead of FTL ("+width+"px)");
  await page.locator("#raceLiveDismiss").click();
  check(!(await page.locator("#raceLiveModal").isVisible()),"race popup dismissible ("+width+"px)");
  await page.locator("#racePopupHelp").click();
  check(await page.locator("#raceLiveModal").isVisible(),"popup can be reopened ("+width+"px)");
  await page.locator('#raceLiveModal [data-close="raceLiveModal"]').click();
  await page.locator("#loginForm").waitFor();
  await page.locator("#loginPass").fill("not-a-real-password");
  await page.locator("#loginForm button[type=submit]").click();
  await page.locator("#metricEvents").waitFor({state:"visible"});
  await page.waitForFunction(()=>document.querySelector("#metricEvents")?.textContent?.trim()==="3",{timeout:12000});
  check(await page.locator("#metricEvents").innerText()==="3","event list loads ("+width+"px)");
  check(await page.locator("#pushSetup").isVisible(),"push opt-in card visible for family ("+width+"px)");
  check(await page.locator("#pushButton").isVisible(),"push enable button available ("+width+"px)");
  check(await page.locator("#pushTestButton").isHidden(),"test push requires subscription ("+width+"px)");
  await page.locator("#familyHelp").waitFor({state:"visible",timeout:12000});
  await page.locator("#familyHelp").click();
  await page.locator("#familyGuide").waitFor({state:"visible",timeout:12000});
  check(await page.locator("#familyGuide").isVisible(),"grandparents first-login guide opens ("+width+"px)");
  check((await page.locator("#familyGuide").innerText()).includes("Vili élő naplója"),"guide explains own live page ("+width+"px)");
  check(await page.locator("#guideOfficialLink").isHidden(),"grandparents are not sent to external FTL ("+width+"px)");
  await page.locator("#guideOkay").click();
  check(!(await page.locator("#familyGuide").isVisible()),"guide dismisses correctly ("+width+"px)");
  await page.locator("#familyHelp").click();
  check(await page.locator("#familyGuide").isVisible(),"grandparents can reopen help ("+width+"px)");
  await page.locator("#guideRaceButton").click();
  check(await page.locator('[data-race="11111111-1111-4111-8111-111111111111"]').evaluate(e=>e.open),"guide opens competition details ("+width+"px)");
  await page.locator("#racePopupHelp").click();
  await page.locator("#raceLiveOfficial").click();
  check(await page.locator('[data-tab="live"]').evaluate(e=>e.classList.contains("active")),"popup navigates to own live page ("+width+"px)");
  const liveResults=page.locator("#liveOfficialResults");
  await page.locator("#liveSelect").selectOption("11111111-1111-4111-8111-111111111111");
  check((await liveResults.innerText()).includes("hivatalos eredményeire még várunk"),"live view shows pending official results ("+width+"px)");
  await page.locator("#liveSelect").selectOption("22222222-2222-4222-8222-222222222222");
  check((await liveResults.innerText()).includes("17.")&&(await liveResults.innerText()).includes("8. / 29"),"live view shows final and post-pool placement ("+width+"px)");
  check(await liveResults.locator(".bout-name").innerText()==="Teszt ellenfél","live view shows the imported bout ("+width+"px)");
  await page.locator('[data-tab="events"]').click();
  check(await page.locator(".race-date-badge").count()===3,"real competition date badges rendered ("+width+"px)");
  check(await page.locator("#upcomingPanel").isVisible(),"upcoming U11 card visible ("+width+"px)");
  check((await page.locator("#upcomingPanel").innerText()).includes("09:30"),"scheduled time visible ("+width+"px)");
  check(await page.locator("#upcomingPanel [data-own-live]").count()===1,"Opava's live button stays on family website ("+width+"px)");
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  check(overflow<=2,"no horizontal overflow "+width+"px, measured="+overflow);
  await page.locator("#seeUpcoming").click();
  const opened=await page.locator('[data-race="11111111-1111-4111-8111-111111111111"]').evaluate(e=>e.open);
  check(opened,"upcoming details opens real race card ("+width+"px)");
  check(await page.locator('[data-race="11111111-1111-4111-8111-111111111111"] [data-own-live]').count()===1,"own live diary button in race detail ("+width+"px)");
  await page.locator('[data-tab="progress"]').click();
  check((await page.locator("#content").innerText()).includes("43%"),"field-normalized placement is 43% ("+width+"px)");
  check(await page.locator(".result-chart").count()===1,"real-data chart renders as SVG ("+width+"px)");
  check(await page.locator(".legend-pool").count()===1,"post-pool legend visible ("+width+"px)");
  check(await page.locator(".pool-series-line").count()===1,"post-pool trend rendered ("+width+"px)");
  check(await page.locator(".final-series-line").count()===1,"final-placement trend rendered ("+width+"px)");
  const budapest=page.locator(".progress-race").filter({hasText:"Jövő Bajnokai – teszt"});
  check((await budapest.locator(".progress-place-group strong").innerText()).trim()==="8. / 29","post-pool rank 8/29 recorded ("+width+"px)");
  check((await budapest.locator(".progress-place-final strong").innerText()).trim()==="17. / 29","final rank 17/29 recorded ("+width+"px)");
  const mixed=page.locator(".progress-race").filter({hasText:"Szlovák Kupa – vegyes mezőny"});
  check((await mixed.locator(".progress-place-group strong").innerText()).trim()==="20. / 21","mixed pool count stays 21 ("+width+"px)");
  check((await mixed.locator(".progress-place-final strong").innerText()).trim()==="10. / 15","mixed final count stays 15 ("+width+"px)");
  const future=page.locator(".progress-race").filter({hasText:"Opavský listopad"});
  check((await future.locator(".progress-place-group strong").innerText()).trim()==="—","missing pool ranking not invented ("+width+"px)");
  check((await future.locator(".progress-place-final strong").innerText()).trim()==="—","missing final ranking not invented ("+width+"px)");
  check((await budapest.locator(".progress-rounds").innerText()).includes("1. csoport"),"individual pool rounds preserved ("+width+"px)");
  const progressOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  check(progressOverflow<=2,"progress view has no horizontal overflow "+width+"px, measured="+progressOverflow);

  await page.locator('[data-tab="photos"]').click();
  check((await page.locator("#content").innerText()).includes("még nincs fényképe"),"empty album shown ("+width+"px)");
  check(!errors.length,"JavaScript runtime without uncaught exceptions ("+width+"px): "+errors.join(","));
  await page.close();
  if(width===390){
    const adminPage=await browser.newPage({viewport:{width:390,height:820}});
    await adminPage.clock.setFixedTime(new Date('2026-11-21T08:15:00Z'));
    let capturedEventId=null;
    await adminPage.route("https://dcmmpkjfgjaqdzhzmzuh.supabase.co/functions/v1/vili-vivonaplo**",async(route)=>{
      const req=route.request(),action=new URL(req.url()).searchParams.get("action");
      if(action==="add-photo"){const payload=JSON.parse(req.postData());capturedEventId=payload.event_id;await route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify({ok:true})});return;}
      const response=action==="whoami"?{role:null}:
        action==="login"?{role:"admin",token:"fake-admin-session"}:
        action==="events"?{role:"admin",events:sample.map((e,i)=>i===0?{...e,date:"2026-11-21"}:e),collector:{configured:true,last_seen:new Date().toISOString()}}:
        {ok:true};
      await route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(response)});
    });
    await adminPage.goto(address,{waitUntil:"domcontentloaded"});
    await adminPage.locator("#raceLiveDismiss").click();
    await adminPage.locator("#loginRole").selectOption("admin");
    await adminPage.locator("#loginPass").fill("fake-test");
    await adminPage.locator("#loginForm button[type=submit]").click();
    await adminPage.locator("#quickPhotoButton").waitFor({state:"visible"});
    check(await adminPage.locator("#quickPhotoButton").isVisible(),"admin always-visible photo button");
    check((await adminPage.locator("#quickPhotoLabel").innerText()).includes("Opava"),"quick photo defaults to current Opava event");
    const choose=adminPage.waitForEvent("filechooser");
    await adminPage.locator("#quickPhotoButton").click();
    const fc=await choose;
    check(!!fc,"one tap opens native file chooser");
    const imageData=await adminPage.evaluate(()=>{
      const c=document.createElement("canvas");c.width=16;c.height=16;
      c.getContext("2d").fillRect(0,0,16,16);
      return c.toDataURL("image/jpeg",.8).split(",")[1];
    });
    await fc.setFiles({name:"test-photo.jpg",mimeType:"image/jpeg",buffer:Buffer.from(imageData,"base64")});
    await adminPage.waitForFunction(()=>document.querySelector("#toast")?.textContent?.includes("fotó elmentve"),{timeout:12000});
    check(capturedEventId==="11111111-1111-4111-8111-111111111111","photo uploaded to Opava event ID without modal");
    await adminPage.close();
  }
 }
 }finally{await browser.close();}
 }
 console.log("SMOKE_TESTS_PASSED="+passed);
}finally{await new Promise(r=>server.close(r));}