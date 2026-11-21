
import webpush from "npm:web-push@3.6.7";
import {createClient} from "npm:@supabase/supabase-js@2.95.0";
const env=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
const sb=createClient(Deno.env.get("SUPABASE_URL")||"",env.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"",{auth:{persistSession:false,autoRefreshToken:false}});
const headers={"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":"https://zrfsro.github.io","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"authorization,content-type"};
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const sha=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,"0")).join("");
const verifyAuth=async(req:Request)=>{
 const t=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
 if(!/^[a-f0-9]{64}$/.test(t))return null;
 const q=await sb.from("web_sessions").select("role").eq("token_hash",await sha(t)).gt("expires_at",new Date().toISOString()).maybeSingle();
 return q.data?.role||null;
};
async function getSettings(){
 let q=await sb.from("vili_push_settings").select("*").eq("id",1).single();
 if(q.error)throw q.error;
 if(!q.data.vapid_public||!q.data.vapid_private){
  const keys=webpush.generateVAPIDKeys();
  const upd=await sb.from("vili_push_settings").update({vapid_public:keys.publicKey,vapid_private:keys.privateKey,updated_at:new Date().toISOString()}).eq("id",1).is("vapid_public",null);
  if(upd.error)throw upd.error;
  q=await sb.from("vili_push_settings").select("*").eq("id",1).single();
  if(q.error)throw q.error;
 }
 return q.data;
}
const allowedEndpoint=(v:string)=>/^https:\/\/[A-Za-z0-9.-]+\/.{1,2000}$/.test(v)&&v.length<=2000;
const isKey=(s:string)=>/^[A-Za-z0-9_-]{8,256}$/.test(s);
const APP="https://zrfsro.github.io/gsm-api-go-client-sourcey-docs/vili-vivonaplo/";
function fingerprint(e:any){
 const ev=e.source_evidence||{};
 return JSON.stringify({rank:e.rank??null,size:e.field_size??null,wins:e.wins??null,losses:e.losses??null,
  bouts:Array.isArray(e.bouts)?e.bouts:null,pool_results:ev.pool_results||null,post_pool:ev.post_pool||null,
  published:ev.official_results_published===true||ev.official_results_published==="true",
  pdf:ev.geostab_pdf_available===true||ev.geostab_pdf_available==="true",
  status:e.source_status==="external_results_available"||e.source_status==="complete"?"available":"waiting"});
}
function notifiedDescription(prev:string|null,current:any,now:number){
 const newState=JSON.parse(fingerprint(current));
 const changes=prev?JSON.parse(prev):null;
 const title=current.name;
 if(!changes){
  const age=now-Date.parse(current.source_updated_at);
  const fresh=age>=0&&age<5*60_000;
  if(!fresh||(!newState.rank&&!newState.bouts?.length&&!newState.pool_results?.length))return null;
 }
 if(newState.rank&&newState.rank!==changes?.rank)return {title:title+" – Vili végső helyezése",body:"Vili helyezése: "+newState.rank+". / "+(newState.size||"—")+"."};
 if(!changes)return {title:title+" – új eredmények",body:"Vili első eredményei megérkeztek a vívónaplóba."};
 const changePublish=(!changes.published&&newState.published)||(!changes.pdf&&newState.pdf);
 if(changePublish)return {title:title+" – megjelentek az eredmények",body:"A hivatalos eredménylista elérhető a vívónaplóban."};
 if(newState.bouts?.length>(changes.bouts?.length||0))return {title:title+" – új asszóeredmény",body:"Vili naplójában már "+newState.bouts.length+" rögzített asszó látható."};
 if(newState.pool_results?.length&&JSON.stringify(newState.pool_results)!==JSON.stringify(changes.pool_results))return {title:title+" – új csoporteredmények",body:"Vili csoportkörének eredményei frissültek a vívónaplóban."};
 if(newState.post_pool&&JSON.stringify(newState.post_pool)!==JSON.stringify(changes.post_pool)){
  const p=newState.post_pool;return {title:title+" – csoportkörök utáni helyezés",body:"Vili összesített helyezése: "+(p.rank||"—")+". / "+(p.size||"—")+"."};
 }
 return null;
}
async function dispatch(settings:any){
 const now=new Date();
 const today=now.toLocaleDateString('sv-SE',{timeZone:'Europe/Bratislava'});
 const yesterday=new Date(Date.parse(today+'T00:00:00Z')-86400_000).toISOString().slice(0,10);
 const events=await sb.from("events").select("id,name,date,rank,field_size,wins,losses,bouts,source_status,source_evidence,source_updated_at")
  .gte("date",yesterday).lte("date",today);
 if(events.error)throw events.error;
 const races=events.data||[];
 if(!races.length)return {ok:true,changed:false,push_sent:0};
 const states=await sb.from("vili_push_state").select("event_id,fingerprint,checked_at").in("event_id",races.map(event=>event.id));
 if(states.error)throw states.error;
 const byEvent=new Map((states.data||[]).map(state=>[state.event_id,state]));
 const messages=[];
 let changed=false;
 for(const event of races){
  const previous=byEvent.get(event.id);
  const latest=fingerprint(event);
  if(previous?.fingerprint===latest)continue;
  const message=notifiedDescription(previous?.fingerprint||null,event,now.getTime());
  const next={event_id:event.id,fingerprint:latest,checked_at:now.toISOString()};
  const claim=previous
   ? sb.from("vili_push_state").update(next).eq("event_id",event.id).eq("checked_at",previous.checked_at)
   : sb.from("vili_push_state").upsert(next,{onConflict:"event_id",ignoreDuplicates:true});
  const saved=await claim.select("event_id").maybeSingle();
  if(saved.error)throw saved.error;
  if(!saved.data)continue;
  changed=true;
  if(message)messages.push({eventId:event.id,...message});
 }
 if(!messages.length)return {ok:true,changed,push_sent:0};
 webpush.setVapidDetails("https://zrf.sk",settings.vapid_public,settings.vapid_private);
 const subs=await sb.from("vili_push_subscriptions").select("endpoint,p256dh,auth");
 if(subs.error)throw subs.error;
 let sent=0,failed=0;
 const expired=new Set<string>();
 for(const {eventId,title,body} of messages){
  for(const x of subs.data||[]){
   if(expired.has(x.endpoint))continue;
   try{
    await webpush.sendNotification({endpoint:x.endpoint,keys:{p256dh:x.p256dh,auth:x.auth}},JSON.stringify({title,body,url:APP+'#elo'}),{TTL:7200,urgency:"high",timeout:8000});
    await sb.from("vili_push_subscriptions").update({last_sent_at:new Date().toISOString(),failed_count:0}).eq("endpoint",x.endpoint);
    sent++;
   }catch(err){
    const status=(err as any)?.statusCode;
    if(status===404||status===410){expired.add(x.endpoint);await sb.from("vili_push_subscriptions").delete().eq("endpoint",x.endpoint);}
    else await sb.from("vili_push_subscriptions").update({failed_count:1}).eq("endpoint",x.endpoint);
    console.error("vili push failed",status,String(err).slice(0,200));failed++;
   }
  }
  await sb.from("vili_push_state").update({last_notified_at:new Date().toISOString()}).eq("event_id",eventId);
 }
 return {ok:true,changed,push_sent:sent,push_failed:failed};
}
Deno.serve(async(req:Request)=>{
 try{
  if(req.method==="OPTIONS")return new Response(null,{headers,status:204});
  const url=new URL(req.url),action=url.searchParams.get("action")||"";
  if(req.method==="GET"&&action==="key"){
   const settings=await getSettings();
   return response({publicKey:settings.vapid_public});
  }
  if(req.method==="POST"&&action==="dispatch"){
   const settings=await getSettings();
   const token=req.headers.get("x-vili-dispatch")||"";
   if(!token||token!==settings.dispatch_secret)return response({error:"Not authorized"},401);
   return response(await dispatch(settings));
  }
  if(req.method==="POST"&&(action==="subscribe"||action==="unsubscribe")){
   const origin=req.headers.get("origin");
   if(origin&&origin!=="https://zrfsro.github.io")return response({error:"Origin not allowed"},403);
   const role=await verifyAuth(req);
   if(!role)return response({error:"Sign in first"},401);
   const body=await req.json().catch(()=>({}));
   if(!allowedEndpoint(body.endpoint||""))return response({error:"Invalid endpoint"},400);
   if(action==="unsubscribe"){
    const r=await sb.from("vili_push_subscriptions").delete().eq("endpoint",body.endpoint);
    if(r.error)throw r.error;return response({ok:true});
   }
   if(!isKey(body.p256dh||"")||!isKey(body.auth||""))return response({error:"Invalid subscription"},400);
   const upd=await sb.from("vili_push_subscriptions").upsert({endpoint:body.endpoint,p256dh:body.p256dh,auth:body.auth,role},{onConflict:"endpoint"});
   if(upd.error)throw upd.error;
   return response({ok:true,subscribed:true});
  }
  if(req.method==="POST"&&action==="test"){
   const role=await verifyAuth(req);
   if(!role)return response({error:"Sign in first"},401);
   const origin=req.headers.get("origin");
   if(origin&&origin!=="https://zrfsro.github.io")return response({error:"Origin not allowed"},403);
   const body=await req.json().catch(()=>({}));
   if(!allowedEndpoint(body.endpoint||""))return response({error:"Invalid endpoint"},400);
   const subscription=await sb.from("vili_push_subscriptions").select("endpoint,p256dh,auth").eq("endpoint",body.endpoint).maybeSingle();
   if(subscription.error)throw subscription.error;
   if(!subscription.data)return response({error:"No matching device subscription"},404);
   const settings=await getSettings();
   webpush.setVapidDetails("https://zrf.sk",settings.vapid_public,settings.vapid_private);
   try{
    await webpush.sendNotification({endpoint:subscription.data.endpoint,keys:{p256dh:subscription.data.p256dh,auth:subscription.data.auth}},JSON.stringify({title:"Vili vívónaplója – próba",body:"A telefonos értesítések fogadása működik. 🤺",url:APP}),{TTL:600});
    return response({ok:true,sent:true});
   }catch(err){
    console.error("push test failed",String(err).slice(0,200));
    return response({error:"Az eszköz push-szolgáltatása nem fogadta az üzenetet."},502);
   }
  }
  if(action==="health")return response({ok:true,webpush:"ready"});
  return response({error:"Not found"},404);
 }catch(e){console.error("vili push server failure",String(e));return response({error:"Push service error"},500)}
});
