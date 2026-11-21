const CACHE = 'vili-shell-v21';
const BASE = new URL('./', self.location);
const ASSETS = ['./index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './fencing-hero.png', './update.js?v=7', './bout-entry.js?v=1'];
const assetURLs = new Set(ASSETS.map(asset => new URL(asset, BASE).href));
self.addEventListener('install', event => {
 event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(ASSETS.map(asset => new Request(new URL(asset, BASE), {cache:'reload'})));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate', event => {
 event.waitUntil((async () => {
  const names = await caches.keys();
  await Promise.all(names.filter(name => name.startsWith('vili-shell-') && name !== CACHE).map(name => caches.delete(name)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch', event => {
 const url = new URL(event.request.url);
 if (event.request.method !== 'GET' || url.origin !== BASE.origin) return;
 if (event.request.mode === 'navigate' && [BASE.pathname, BASE.pathname + 'index.html'].includes(url.pathname)) {
  event.respondWith((async () => {
   const index = new URL('index.html', BASE);
   try {
    const response = await fetch(event.request, {cache:'no-store'});
    if (response.ok) {
     const copy = response.clone();
     try { await (await caches.open(CACHE)).put(index, copy); } catch {}
    }
    return response;
   } catch {
    return (await (await caches.open(CACHE)).match(index)) || Response.error();
   }
  })());
 } else if (assetURLs.has(url.href)) {
  event.respondWith(caches.open(CACHE).then(cache => cache.match(event.request)).then(cached => cached || fetch(event.request)));
 }
});
self.addEventListener('push',event=>{
 let data={title:'Vili vívónaplója',body:'Új versenyinformáció érkezett.',url:'https://zrfsro.github.io/gsm-api-go-client-sourcey-docs/vili-vivonaplo/'};
 try{const incoming=event.data?.json();if(incoming&&typeof incoming==='object')data={...data,...incoming}}catch{}
 const options={body:String(data.body||''),icon:'./icon-192.png',badge:'./icon-192.png',tag:'vili-opava-new-results',renotify:true,
  data:{url:String(data.url||'https://zrfsro.github.io/gsm-api-go-client-sourcey-docs/vili-vivonaplo/')}};
 event.waitUntil(self.registration.showNotification(String(data.title||'Vili vívónaplója'),options));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const target=new URL(event.notification.data?.url||'./',BASE);
 if(target.origin!==BASE.origin||!target.pathname.startsWith(BASE.pathname))return;
 event.waitUntil((async()=>{
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const c of clients){if(c.url.startsWith(BASE.href)&&'focus'in c){try{const page=await c.navigate(target.href);if(page)return await page.focus()}catch{}}}
  return self.clients.openWindow(target.href);
 })());
});
