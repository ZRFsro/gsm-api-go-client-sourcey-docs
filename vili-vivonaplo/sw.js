const CACHE='vili-shell-v19';const BASE=new URL('./',self.location).pathname;const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./fencing-hero.png'];self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('vili-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(BASE)||u.search)return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request,{cache:"no-store"}).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy))}return r}).catch(()=>caches.match('./index.html')));return}if(ASSETS.some(a=>new URL(a,self.location).pathname===u.pathname))e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));});
self.addEventListener('push',event=>{
 let data={title:'Vili vívónaplója',body:'Új versenyinformáció érkezett.',url:'https://zrfsro.github.io/gsm-api-go-client-sourcey-docs/vili-vivonaplo/'};
 try{const incoming=event.data?.json();if(incoming&&typeof incoming==='object')data={...data,...incoming}}catch{}
 const options={body:String(data.body||''),icon:'./icon-192.png',badge:'./icon-192.png',tag:'vili-opava-new-results',renotify:true,
  data:{url:String(data.url||'https://zrfsro.github.io/gsm-api-go-client-sourcey-docs/vili-vivonaplo/')}};
 event.waitUntil(self.registration.showNotification(String(data.title||'Vili vívónaplója'),options));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const target=new URL(event.notification.data?.url||'./',self.location.origin);
 if(target.origin!==self.location.origin)return;
 event.waitUntil((async()=>{
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const c of clients){if(c.url.startsWith(target.origin)&&'focus'in c){try{await c.navigate(target.href);return await c.focus()}catch{}}}
  return self.clients.openWindow(target.href);
 })());
});
