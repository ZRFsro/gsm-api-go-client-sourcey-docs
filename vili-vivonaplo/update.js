(()=>{
  const current=document.querySelector('meta[name="app-version"]')?.content;
  let checking=false,available=null,lastFocus=null;
  const dialog=document.createElement('dialog');
  dialog.className='update-dialog';
  dialog.setAttribute('aria-labelledby','update-title');
  dialog.innerHTML='<h2 id="update-title">Új verzió érhető el</h2><p>Az app régebbi változata van megnyitva. Frissítsd, hogy a legújabb megjelenést és funkciókat lásd.</p><p>A mentett eredmények és fotók megmaradnak. A még el nem mentett beírásokat előbb mentsd el.</p><p class="update-error" role="status"></p><div class="actions"><button type="button" class="secondary" data-later>Később</button><button type="button" data-refresh>Frissítés most</button></div>';
  document.body.append(dialog);
  const manual=document.createElement('button');
  manual.type='button';manual.className='secondary';manual.textContent='Frissítés ellenőrzése';
  document.querySelector('.footer')?.append(document.createElement('br'),manual);
  manual.onclick=async()=>{manual.disabled=true;manual.textContent='Ellenőrzés…';const ok=await check();manual.disabled=false;manual.textContent=!ok?'Nincs kapcsolat · Ellenőrzés újra':available===current?'Az app naprakész · Ellenőrzés újra':'Frissítés ellenőrzése'};
  const button=dialog.querySelector('[data-refresh]'),error=dialog.querySelector('.update-error');
  function close(){dialog.close();lastFocus?.focus?.()}
  dialog.querySelector('[data-later]').onclick=close;
  async function latest(){
    const url=new URL('./index.html',location.href);url.searchParams.set('version-check',Date.now());
    const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw Error('Nem sikerült letölteni az új verziót. Próbáld újra.');
    const html=await response.text();
    const version=html.match(/<meta name="app-version" content="([^"]+)"/i)?.[1];
    if(!version)throw Error('A frissítés még nem elérhető. Próbáld újra később.');
    return version;
  }
  async function check(){
    if(checking||document.hidden||!navigator.onLine)return false;
    checking=true;
    try{available=await latest();if(available!==current&&!dialog.open){lastFocus=document.activeElement;error.textContent='';dialog.showModal();button.focus()}return true}catch(_){return false}finally{checking=false}
  }
  button.onclick=async()=>{
    button.disabled=true;button.textContent='Frissítés…';error.textContent='';
    try{
      available=await latest();
      if('serviceWorker' in navigator){const registration=await navigator.serviceWorker.getRegistration();registration?.update().catch(()=>{})}
      const url=new URL('./index.html',location.href);url.searchParams.set('app-update',available+'-'+Date.now());
      location.replace(url.href);
    }catch(e){error.textContent=e.message;button.disabled=false;button.textContent='Újrapróbálás'}
  };
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{});
    navigator.serviceWorker.addEventListener('controllerchange',check);
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
  window.addEventListener('online',check);
  window.addEventListener('pageshow',check);
  setInterval(check,60000);check();
})();
