import {writeFileSync,readFileSync,existsSync,mkdirSync} from 'node:fs';
import {setTimeout as sleep} from 'node:timers/promises';
const API=process.env.VILI_API, TOKEN=process.env.VILI_TOKEN;
const TEST=process.argv.includes('--self-test'),STATE=TEST?'/state/discovery-test-status.json':'/state/status.json';
const testEvents=[];let testUpdates=0;
const log=(status,details={})=>{const value={time:new Date().toISOString(),status,...details};writeFileSync(STATE,JSON.stringify(value));console.log(JSON.stringify(value));};
const isFTL=u=>{try{const x=new URL(u);return x.protocol==='https:'&&['www.fencingtimelive.com','fencingtimelive.com'].includes(x.hostname)}catch{return false}};
async function api(action,body){if(TEST){if(action==='schedule')return {events:testEvents};if(action==='discover'){const e={...body,id:'test-'+testEvents.length,source_status:'scanning'};testEvents.push(e);return {ok:true,id:e.id}}if(action==='update'){Object.assign(testEvents.find(e=>e.id===body.event_id),body,{source_status:body.status});testUpdates++;return {ok:true}}throw Error('Unknown test action')}
const r=await fetch(API+'?action=collector-'+action,{method:body?'POST':'GET',headers:{'X-Vili-Collector':TOKEN,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('API '+action+' '+r.status+': '+(await r.text()).slice(0,200));return r.json();}
class CDP {
 constructor(ws){this.ws=ws;this.id=0;this.pending=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(e.data),p=this.pending.get(m.id);if(p){clearTimeout(p.timer);this.pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}});ws.addEventListener('close',()=>{for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('Browser disconnected'))}this.pending.clear()});}
 static async connect(url){const ws=new WebSocket(url);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});return new CDP(ws)}
 call(method,params={}){return new Promise((resolve,reject)=>{const id=++this.id,timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Browser timeout: '+method))},30000);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}))})}
 async evaluate(expression){const r=await this.call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('Page extraction failed');return r.result.value}
 close(){this.ws.close()}
}
// Only visible competition tables are read; no cookies or account credentials are exported.
export function extractPage(){
 const txt=e=>(e?.innerText||'').trim(),norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();
 const me=s=>norm(s)==='STERMENSZKY VILMOS';
 const fullName=e=>[txt(e.querySelector('.tcln')),txt(e.querySelector('.tcfn'))].join(' ').trim();
 const links=Array.from(document.querySelectorAll('a[href]')).map(a=>({url:a.href,text:txt(a),context:txt(a.closest('tr')||a.parentElement)}));
 const tournaments=Array.from(document.querySelectorAll('tr[data-uniqueid]')).map(r=>({id:r.getAttribute('data-uniqueid'),name:txt(r.cells[0]),location:txt(r.cells[1]),dates:txt(r.cells[2])})).filter(r=>/^[A-F0-9]{32}$/i.test(r.id));
 const out={url:location.href,title:document.title,links,tournaments,login:!!document.querySelector('#loginForm')||location.pathname.startsWith('/account/login'),confirmed:false,rank:null,field_size:null,bouts:[],rows:[],loaded:!document.body.innerText.includes('Loading, please wait')};
 out.pool_results=[];
 const results=Array.from(document.querySelectorAll('#resultList tbody tr')).filter(r=>r.cells.length>=3);
 for(const r of results){if(me(txt(r.cells[1]))){const rank=txt(r.cells[0]);if(/^\d+T?$/.test(rank)){out.rank=Number(rank.replace(/T$/,''));out.field_size=results.length;out.confirmed=true;out.rows.push(txt(r));}}}
 if(location.pathname.includes('/pools/results/')&&out.rank!==null){out.pool_results.push({round_id:location.pathname.split('/').pop(),overall_rank:out.rank,overall_size:out.field_size});out.rank=null;out.field_size=null;}
 for(const table of document.querySelectorAll('.poolTable')){
  const rows=Array.from(table.querySelectorAll('tr.poolRow')),mine=rows.find(r=>me(txt(r.querySelector('.poolCompName'))));if(!mine)continue;
  out.confirmed=true;out.rows.push(txt(mine));const myPos=Number(txt(mine.querySelector('.poolPos')));
  const stats=rows.map(r=>{const c=Array.from(r.cells).slice(-5).map(txt);return {r,v:Number(c[0]),ratio:Number(c[1]),ts:Number(c[2]),tr:Number(c[3]),ind:Number(c[4])}}),mineStats=stats.find(s=>s.r===mine);
  const better=(a,b)=>a.ratio>b.ratio||(a.ratio===b.ratio&&(a.ind>b.ind||(a.ind===b.ind&&a.ts>b.ts)));
  if(stats.every(s=>[s.v,s.ratio,s.ts,s.tr,s.ind].every(Number.isFinite))){const rank=1+stats.filter(s=>better(s,mineStats)).length;out.pool_results.push({round_id:location.pathname.split('/').pop(),pool_rank:rank,pool_size:rows.length,wins:mineStats.v,touches_scored:mineStats.ts,touches_received:mineStats.tr,provisional:stats.reduce((n,s)=>n+s.v,0)<rows.length*(rows.length-1)/2});}
  for(const opponent of rows){if(opponent===mine)continue;const theirPos=Number(txt(opponent.querySelector('.poolPos'))),my=txt(mine.cells[theirPos+1]),their=txt(opponent.cells[myPos+1]);
   if(!/^[VD]?\d+$/.test(my)||!/^[VD]?\d+$/.test(their))continue;
   out.bouts.push({stage:'Csoport',opponent:txt(opponent.querySelector('.poolCompName')),my_score:Number(my.replace(/^[VD]/,'')),their_score:Number(their.replace(/^[VD]/,''))});
  }
 }
 for(const table of document.querySelectorAll('.elimTableau')){
  const rows=Array.from(table.rows),headers=Array.from(rows[0]?.cells||[]).map(txt);
  for(let col=0;col<headers.length-1;col++){
   const contestants=rows.map(r=>r.cells[col]).filter(c=>c?.querySelector('.tcln'));
   const winners=rows.map(r=>r.cells[col+1]).filter(c=>c?.querySelector('.tcln'));
   const scores=rows.map(r=>r.cells[col+1]?.querySelector('.tsco')).filter(Boolean);
   for(let i=0;i+1<contestants.length;i+=2){const a=fullName(contestants[i]),b=fullName(contestants[i+1]);if(!me(a)&&!me(b))continue;out.confirmed=true;
    const winner=fullName(winners[i/2]||document.createElement('td')),score=txt(scores[i/2]),match=score.match(/^(\d+)\s*-\s*(\d+)/);
    out.rows.push(headers[col]+' | '+a+' | '+b+' | '+winner+' | '+score);
    if(!match||(![norm(a),norm(b)].includes(norm(winner)))||a.includes('BYE')||b.includes('BYE'))continue;
    const won=me(winner);out.bouts.push({stage:headers[col],opponent:me(a)?b:a,my_score:Number(match[won?1:2]),their_score:Number(match[won?2:1])});
   }
  }
 }
 for(const r of document.querySelectorAll('tr')){if(Array.from(r.cells).some(c=>me(txt(c)))){out.confirmed=true;if(out.rows.length<60)out.rows.push(txt(r));}}
 if(location.pathname==='/')out.loaded &&= tournaments.length>0||document.body.innerText.includes('No matching records found');
 if(location.pathname.includes('/pools/scores/'))out.loaded &&= !!document.querySelector('.poolTable');
 if(location.pathname.includes('/tableaus/scores/'))out.loaded &&= !!document.querySelector('.elimTableau');
 if(location.pathname.includes('/events/results/'))out.loaded &&= results.length>0||document.body.innerText.includes('No matching records found');
 out.header=txt(document.querySelector('header')||document.querySelector('nav'));
 return out;
}
const extraction='('+extractPage.toString()+')()';
let client=null,targetId=null;
async function browser(){
 if(client)return client;
 const list=await (await fetch('http://127.0.0.1:9222/json/list',{signal:AbortSignal.timeout(5000)})).json();
 // Leave the user's login tab untouched. A separate tab shares the persistent FTL session.
 let savedId=targetId;
 const targetFile=TEST?'/state/test-target-id':'/state/target-id';
 if(!savedId&&existsSync(targetFile))savedId=readFileSync(targetFile,'utf8');
 let target=list.find(t=>t.type==='page'&&t.id===savedId);
 if(!target){target=await(await fetch('http://127.0.0.1:9222/json/new?about:blank',{method:'PUT'})).json();}
 targetId=target.id;writeFileSync(targetFile,targetId);client=await CDP.connect(target.webSocketDebuggerUrl);await client.call('Page.enable');return client;
}
async function visit(url){
 if(!isFTL(url))throw Error('Unapproved source host');const c=await browser();await c.call('Page.navigate',{url});
 let last;for(let n=0;n<40;n++){await sleep(500);try{last=await c.evaluate(extraction);if(last.login)return last;if(last.url!==url)continue;if(last.loaded&&(last.confirmed||last.links.length>10||last.tournaments.length>0)&&n>=5)return last;}catch{}}
 if(last?.url===url&&last.loaded)return last;throw Error('Competition page did not finish loading');
}
async function collect(event){
 const first=await visit(event.source_url);if(first.login){await api('update',{event_id:event.id,source_url:event.source_url,status:'login_required'});return 'login_required'}
 const eventId=new URL(event.source_url).pathname.split('/').find(x=>/^[A-F0-9]{32}$/i.test(x));
 const urls=[...new Set(first.links.map(l=>l.url).filter(u=>isFTL(u)&&u.includes(eventId)&&/\/(events\/results|pools\/scores|tableaus\/scores)\//.test(u)))];
 let confirmed=first.confirmed,rank=null,field_size=null,bouts=[],evidence=[],pool=0;const poolResults=new Map();
 for(const url of urls){const page=url===event.source_url?first:await visit(url);if(page.login)throw Error('FTL login expired during import');confirmed ||= page.confirmed;evidence.push(...page.rows);if(page.rank!==null){rank=page.rank;field_size=page.field_size}
  const round=url.includes('/pools/scores/')?++pool:0;bouts.push(...page.bouts.map(b=>({...b,stage:round?'Csoport '+round:b.stage})));
  for(const p of page.pool_results||[])poolResults.set(p.round_id,{...poolResults.get(p.round_id),...p,...(round?{round}: {})});
  if(round){const resultUrl=page.links.find(l=>l.url.includes('/pools/results/')&&l.url.endsWith('/'+url.split('/').pop()))?.url;if(resultUrl){const result=await visit(resultUrl);evidence.push(...result.rows);for(const p of result.pool_results||[])poolResults.set(p.round_id,{...poolResults.get(p.round_id),...p});}}
  await sleep(800);
 }
 if(!confirmed){await api('update',{event_id:event.id,source_url:event.source_url,status:'no_results'});return 'no_results'}
 const unique=[...new Map(bouts.map(b=>[JSON.stringify(b),b])).values()];
 const body={event_id:event.id,source_url:event.source_url,status:rank!==null?'complete':'updated',fencer_confirmed:true,evidence:{title:first.title,rows:[...new Set(evidence)].slice(0,60),pool_results:[...poolResults.values()]},rank,field_size};
 if(unique.length){body.bouts=unique;body.wins=unique.filter(b=>b.my_score>b.their_score).length;body.losses=unique.filter(b=>b.my_score<b.their_score).length;}
 await api('update',body);log('imported',{event:event.name,rank,bouts:unique.length});return body.status;
}
let lastDiscovery=0,discoveryState=null;
async function discover(){
 if(!discoveryState){
 if(Date.now()-lastDiscovery<3600000)return;
 const home=await visit('https://www.fencingtimelive.com/');if(home.login)return;
 const c=await browser(),countries=(process.env.DISCOVERY_COUNTRIES||'HUN,SVK').split(',');let candidates=[];
 for(const filter of ['Last 10 days','Next 7 days']){
  const clicked=await c.evaluate(`(()=>{const a=Array.from(document.querySelectorAll('a')).find(a=>a.textContent.trim()===${JSON.stringify(filter)});if(!a)return false;a.click();return true})()`);if(!clicked)throw Error('Tournament filter missing: '+filter);
  let page;for(let n=0;n<60;n++){await sleep(500);page=await c.evaluate(extraction);if(n>=9&&page.loaded)break;}
  if(!page.loaded)throw Error('Tournament list did not finish loading');
  if(TEST)log('discovery_filter',{filter,rows:page.tournaments.length,sample:page.tournaments.slice(0,2)});candidates.push(...page.tournaments);
 }
 const tournaments=[...new Map(candidates.filter(t=>countries.some(country=>t.location.endsWith(country))).map(t=>[t.id,t])).values()].slice(0,20);
 discoveryState={tournaments,events:[],total:tournaments.length,countries};
 }
 const deadline=Date.now()+15000;
 while(Date.now()<deadline){
 if(!discoveryState.events.length){
 const tournament=discoveryState.tournaments.shift();
 if(!tournament){log('discovery_complete',{tournaments:discoveryState.total,countries:discoveryState.countries});discoveryState=null;lastDiscovery=Date.now();return}
  const dateParts=tournament.dates.match(/[A-Za-z]+ \d{1,2}, \d{4}/g)||[];
  if(dateParts.length&&new Date(dateParts.at(-1)+' 23:59:59 UTC').getTime()<Date.now()-3*86400000)continue;
  const schedule=await visit('https://www.fencingtimelive.com/tournaments/eventSchedule/'+tournament.id);
  discoveryState.events=[...new Set(schedule.links.filter(l=>/\/events\/(view|competitors)\//.test(l.url)).map(l=>l.url.replace('/events/view/','/events/competitors/')))].slice(0,30).map(url=>({url,tournament}));
  continue;
 }
 const {url,tournament}=discoveryState.events.shift();
 const scheduleNow=await api('schedule');const id=url.split('/').pop();if(scheduleNow.events.some(e=>e.source_url.includes(id)))continue;
 const page=await visit(url);if(!page.confirmed)continue;
   const dateText=page.header.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+([A-Za-z]+ \d{1,2}, \d{4})/);if(!dateText)continue;
   const dt=new Date(dateText[1]+' 12:00:00 UTC');if(!Number.isFinite(dt.getTime()))continue;
   const date=dt.toISOString().slice(0,10),age=(Date.now()-dt.getTime())/86400000;if(age>3||age< -21)continue;
   await api('discover',{name:page.title.slice(0,160),date,city:tournament.location,source_url:url,fencer_confirmed:true,evidence:{title:page.title,rows:page.rows}});log('discovered',{name:page.title});
 }
}
const completedChecks=new Map();
async function main(){
 if(!API||!TOKEN)throw Error('Missing collector configuration');mkdirSync('/state',{recursive:true});log('starting');
 while(true){const started=Date.now();try{
  const schedule=await api('schedule');let login=false;
  for(const e of schedule.events){if(e.source_status==='complete'&&Date.now()-(completedChecks.get(e.id)||0)<3600000)continue;try{const status=await collect(e);login ||= status==='login_required';if(status==='complete')completedChecks.set(e.id,Date.now());}catch(err){client?.close();client=null;await api('update',{event_id:e.id,source_url:e.source_url,status:'error',message:err.message}).catch(()=>{});log('event_error',{message:err.message})}}
  if(!login)await discover();
  log(login?'login_required':'waiting',{events:schedule.events.length,next_check_seconds:60});
 }catch(err){log('error',{message:err.message});client?.close();client=null;}
 await sleep(Math.max(1000,60000-(Date.now()-started)));
 }
}
async function selfTest(){mkdirSync('/state',{recursive:true});log('test_started',{initial_events:0});try{for(let i=0;i<150;i++){await discover();if(!discoveryState&&lastDiscovery)break;}if(discoveryState)throw Error('Discovery test did not finish');for(const e of testEvents)await collect(e);writeFileSync('/state/discovery-test.json',JSON.stringify({finished_at:new Date().toISOString(),initial_events:0,production_writes:0,updates:testUpdates,events:testEvents},null,2));log('test_complete',{events:testEvents.length,updates:testUpdates});}finally{if(client){await client.call('Page.close').catch(()=>{});client.close()}}}
if(TEST)selfTest().catch(e=>{log('test_error',{message:e.message});process.exit(1)});else if(process.env.VILI_RUN==='1')main().catch(e=>{console.error(e.message);process.exit(1)});

