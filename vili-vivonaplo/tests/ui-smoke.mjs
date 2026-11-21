import {chromium,webkit} from "playwright";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import path from "node:path";

const root=path.resolve("vili-vivonaplo");
const types={".html":"text/html; charset=utf-8",".js":"text/javascript",".png":"image/png",".webmanifest":"application/manifest+json"};
const hostedApi="https://dcmmpkjfgjaqdzhzmzuh.supabase.co/functions/v1/";
const fixtures=new Map();
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,"http://localhost");
  const pathname=decodeURIComponent(url.pathname);
  if(pathname.startsWith('/fixture-api/')){
   const fixture=fixtures.get(pathname.split('/').at(-1));
   if(!fixture){res.writeHead(404).end();return;}
   let raw='';for await(const chunk of req)raw+=chunk;
   const reply=fixture(url.searchParams.get('action'),raw?JSON.parse(raw):null);
   res.writeHead(reply.status??200,{"Content-Type":"application/json","Cache-Control":"no-store"});
   res.end(JSON.stringify(reply.payload));
   return;
  }
  const local=path.resolve(root,"."+pathname);
  if(!local.startsWith(root+path.sep)) {res.writeHead(403);res.end();return;}
  const data=pathname==="/index.html"
   ? (await readFile(local,"utf8")).replaceAll(hostedApi+"vili-vivonaplo","/fixture-api/"+(url.searchParams.get('fixture')??''))
     .replaceAll(hostedApi+"vili-push","/fixture-push")
   : await readFile(local);
  res.writeHead(200,{"Content-Type":types[path.extname(local)]||"application/octet-stream"});
  res.end(data);
 }catch(e){res.writeHead(404);res.end("Not found");}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const address="http://127.0.0.1:"+server.address().port+"/index.html";
function fixturePage(handler){
 const id=String(fixtures.size+1);
 fixtures.set(id,handler);
 return address+'?fixture='+id;
}
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
  source_evidence:{post_pool:{rank:20,size:21}},rank:10,field_size:15,wins:0,losses:5,photos:[],bouts:[]},
 {id:"44444444-4444-4444-8444-444444444444",name:"NAS-import – vegyes tőr",date:"2026-11-20",
  category:"U11 vegyes tőr",city:"Opava, Csehország",source_status:"complete",
  source_evidence:{pool_results:[{round:1,pool_rank:2,pool_size:7,overall_rank:6,overall_size:30,provisional:false}]},
  rank:14,field_size:30,wins:6,losses:2,photos:[],bouts:[]}
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
  await page.goto(fixturePage(action=>{
   const response=action==="whoami"?{role:null}:
     action==="login"?{role:"family",token:"fake-test-only-session"}:
     action==="events"?{role:"family",events:sample,collector:{configured:true,last_seen:new Date().toISOString()}}:
     action==="logout"?{ok:true}:{ok:true};
   return {payload:response};
  }),{waitUntil:"domcontentloaded"});
  check(await page.locator('.overlay:not([hidden]), dialog[open]').count()===0,"no navigation popup before login ("+width+"px)");
  await page.locator('#openPublicLive').click();
  check(new URL(page.url()).hash==='#elo',"one tap sets the live destination before login ("+width+"px)");
  await page.locator("#loginForm").waitFor();
  await page.locator("#loginPass").fill("not-a-real-password");
  await page.locator("#loginForm button[type=submit]").click();
  await page.locator("#liveBrief").waitFor({state:"visible"});
  check(await page.locator('[data-tab="live"]').getAttribute('aria-current')==='page',"login opens live directly ("+width+"px)");
  check(await page.locator('#content > #liveBrief').count()===1,"the race status is the first panel ("+width+"px)");
  check(await page.locator('#diaryOverview').isHidden(),"homepage cards hidden on live page ("+width+"px)");
  check(await page.locator('.overlay:not([hidden]), dialog[open]').count()===0,"no popup covers the live status ("+width+"px)");
  check(await page.locator('#pushSetup').isHidden(),"notification controls hidden on live page ("+width+"px)");
  await page.locator('[data-tab="settings"]').click();
  check(await page.locator('#pushSetup').isVisible(),"family can manage notifications in Settings ("+width+"px)");
  check(await page.locator('#checkAppUpdate').isVisible(),"app update control is in Settings ("+width+"px)");
  check(!(await page.locator('#passwordForm').isVisible()),"parent controls stay out of the family settings ("+width+"px)");
  check(await page.locator('#pushTestButton').isHidden(),"test push requires subscription ("+width+"px)");
  await page.locator('[data-tab="live"]').click();
  const liveResults=page.locator("#liveOfficialResults");
  await page.locator("#liveSelect").selectOption("11111111-1111-4111-8111-111111111111");
  await page.locator("#liveDetails summary").click();
  check((await liveResults.innerText()).includes("hivatalos eredményeire még várunk"),"live view shows pending official results ("+width+"px)");
  await page.locator("#liveSelect").selectOption("22222222-2222-4222-8222-222222222222");
  check((await page.locator("#liveBrief").innerText()).includes("17. / 29"),"final place in top summary");
  await page.locator("#liveDetails summary").click();
  check((await liveResults.innerText()).includes("17.")&&(await liveResults.innerText()).includes("8. / 29"),"live view shows final and post-pool placement ("+width+"px)");
  check(await liveResults.locator(".bout-name").innerText()==="Teszt ellenfél","live view shows the imported bout ("+width+"px)");
  await page.locator('[data-tab="events"]').click();
  const navFits=await page.locator('.tabs').evaluate(menu=>menu.scrollWidth<=menu.clientWidth&&Array.from(menu.children).every(item=>item.scrollWidth<=item.clientWidth));
  check(navFits,"all five navigation items fit without horizontal scrolling ("+width+"px)");
  check(await page.locator(".race-date-badge").count()===sample.length-1,"upcoming race is shown once outside the completed list ("+width+"px)");
  const importedCard=page.locator('.race-card[data-race="44444444-4444-4444-8444-444444444444"]');
  check((await importedCard.locator('summary .race-stats > div').filter({hasText:"Csoportkörök után"}).innerText()).includes("6. / 30"),
   "collapsed card shows the imported single-round placement ("+width+"px)");
  check(await page.locator("#upcomingPanel").isVisible(),"upcoming U11 card visible ("+width+"px)");
  check(await page.locator("#upcomingPanel [data-own-live]").count()===1,"Opava's live button stays on family website ("+width+"px)");
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  check(overflow<=2,"no horizontal overflow "+width+"px, measured="+overflow);
  await page.locator('#upcomingPanel [data-own-live]').click();
  check(await page.locator('#liveBrief').isVisible(),"home live button goes straight to the summary ("+width+"px)");
  check((await page.locator('#liveBrief').innerText()).includes('09:30'),"scheduled time visible on the summary ("+width+"px)");
  await page.locator('[data-tab="progress"]').click();
  check(!(await page.locator('.result-chart').isVisible()),"placement lists precede the optional chart ("+width+"px)");
  await page.locator('#progressChart summary').click();
  check((await page.locator("#content").innerText()).includes("43%"),"field-normalized placement is 43% ("+width+"px)");
  check(await page.locator(".result-chart").count()===1,"real-data chart renders as SVG ("+width+"px)");
  check(await page.locator(".legend-pool").count()===1,"post-pool legend visible ("+width+"px)");
  check(await page.locator(".pool-series-line").count()===1,"post-pool trend rendered ("+width+"px)");
  check(await page.locator(".final-series-line").count()===1,"final-placement trend rendered ("+width+"px)");
  const budapest=page.locator(".progress-race").filter({hasText:"Jövő Bajnokai – teszt"});
  check((await budapest.locator(".progress-place-group strong").innerText()).trim()==="8. / 29","post-pool rank 8/29 recorded ("+width+"px)");
  const importedRace=page.locator(".progress-race").filter({hasText:"NAS-import – vegyes tőr"});
  check((await importedRace.locator(".progress-place-group strong").innerText()).trim()==="6. / 30","progress uses the imported post-pool placement ("+width+"px)");
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
  check(await page.locator('.album-row').count()===sample.length,"photos open as a compact album index ("+width+"px)");
  await page.locator('.album-row').first().click();
  check((await page.locator("#content").innerText()).includes("még nincs fotó"),"empty album shown ("+width+"px)");
  await page.locator('#allAlbums').click();
  check(await page.locator('.album-row').first().evaluate(row=>document.activeElement===row),"back to albums restores keyboard focus ("+width+"px)");
  check(!errors.length,"JavaScript runtime without uncaught exceptions ("+width+"px): "+errors.join(","));
  await page.close();
  if(width===390){
    const adminPage=await browser.newPage({viewport:{width:390,height:820}});
    await adminPage.clock.setFixedTime(new Date('2026-11-21T08:15:00Z'));
    let capturedEventId=null;
    const resultSubmissions=[];
    await adminPage.goto(fixturePage((action,body)=>{
      const reply=(payload,status=200)=>({payload,status});
      if(action==="add-photo"){capturedEventId=body.event_id;return reply({ok:true});}
      if(action==="live-update"){
        resultSubmissions.push(body);
        if(resultSubmissions.length===1)return reply({error:"Szimulált hálózati hiba"},503);
        return reply({ok:true,id:body.update_id});
      }
      const response=action==="whoami"?{role:null}:
        action==="login"?{role:"admin",token:"fake-admin-session"}:
        action==="events"?{role:"admin",events:sample.map((e,i)=>i===0?{...e,date:"2026-11-21"}:e),collector:{configured:true,last_seen:new Date().toISOString()}}:
        {ok:true};
      return reply(response);
    }),{waitUntil:"domcontentloaded"});
    await adminPage.locator("#loginRole").selectOption("admin");
    await adminPage.locator("#loginPass").fill("fake-test");
    await adminPage.locator("#loginForm button[type=submit]").click();
    await adminPage.locator('[data-tab="live"]').click();
    check(await adminPage.locator('#openBoutEntry').isVisible(),"asszó entry is an explicit action");
    check(!(await adminPage.locator('#boutEntry').isVisible()),"asszó form does not open on its own");
    await adminPage.locator('#openBoutEntry').click();
    await adminPage.locator('#boutOpponent').fill('Első ellenfél\nMásodik ellenfél');
    await adminPage.locator('#boutAddForm button[type=submit]').click();
    await adminPage.locator('#boutSelect').selectOption({index:1});
    await adminPage.locator('#boutMine').fill('5');
    await adminPage.locator('#boutTheirs').fill('2');
    await adminPage.locator('#boutForm button[type=submit]').click();
    await adminPage.locator('#boutStatus').filter({hasText:'Szimulált hálózati hiba'}).waitFor();
    await adminPage.locator('#boutForm button[type=submit]').click();
    await adminPage.locator('#boutStatus').filter({hasText:'Következik: Első ellenfél'}).waitFor();
    check(resultSubmissions[0].update_id===resultSubmissions[1].update_id&&resultSubmissions[1].opponent==='Második ellenfél',
     "an out-of-order bout keeps the same id when retried and advances to the remaining opponent");
    await adminPage.locator('#closeBoutEntry').click();
    await adminPage.locator('[data-tab="events"]').click();
    await adminPage.locator('#newEvent').click();
    check(await adminPage.locator('#editModal[open] #eventName').isVisible(),"new event opens a keyboard-accessible dialog");
    check(!(await adminPage.locator('#eventRank').isVisible()),"advanced result fields start collapsed");
    await adminPage.keyboard.press('Escape');
    await adminPage.locator('#editModal').waitFor({state:'hidden',timeout:6000});
    check(!(await adminPage.locator('#editModal').isVisible()),"Escape closes the event dialog");
    await adminPage.locator('[data-tab="photos"]').click();
    await adminPage.locator("#quickPhotoButton").waitFor({state:"visible"});
    check(await adminPage.locator("#quickPhotoButton").isVisible(),"admin photo upload in the photo view");
    check((await adminPage.locator("#quickPhotoLabel").innerText()).includes("Opavský"),"quick photo defaults to the current event");
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
    await adminPage.locator('[data-tab="live"]').click();
    await adminPage.locator('#liveSelect').selectOption('22222222-2222-4222-8222-222222222222');
    await adminPage.getByRole('button',{name:'Versenyfotók',exact:true}).click();
    check((await adminPage.locator('#quickPhotoLabel').innerText()).includes('Jövő Bajnokai'),"quick upload follows the open album");
    const albumChoose=adminPage.waitForEvent('filechooser');
    await adminPage.locator('#quickPhotoButton').click();
    await (await albumChoose).setFiles({name:'album-photo.jpg',mimeType:'image/jpeg',buffer:Buffer.from(imageData,'base64')});
    await adminPage.waitForFunction(()=>document.querySelector('#toast')?.textContent?.includes('fotó elmentve: Jövő Bajnokai'));
    check(capturedEventId==='22222222-2222-4222-8222-222222222222',"photo remains attached to the selected older competition");
    await adminPage.close();
  }
 }
 }finally{await browser.close();}
 }
 console.log("SMOKE_TESTS_PASSED="+passed);
}finally{await new Promise(r=>server.close(r));}
