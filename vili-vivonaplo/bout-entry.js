function setupBoutEntry({api, getEvents, getRole, reload}) {
 const el = id => document.getElementById(id);
 const dialog = el('boutEntry'), form = el('boutForm'), setup = el('boutSetup');
 const eventSelect = el('boutEvent'), opponent = el('boutOpponent');
 const select = el('boutSelect'), mine = el('boutMine'), theirs = el('boutTheirs');
 const stage = el('boutPhase'), notice = el('boutStatus');
 const queues = new Map();
 let eventId, activeId, saving = false;
 function queue() {
  if (!queues.has(eventId)) {
   let stored = [];
   try { stored = JSON.parse(localStorage.getItem('vili-bouts:' + eventId) || '[]'); } catch {}
   queues.set(eventId, Array.isArray(stored) ? stored : []);
  }
  return queues.get(eventId);
 }
 function persist() {
  try { localStorage.setItem('vili-bouts:' + eventId, JSON.stringify(queue())); } catch {}
 }
 function reconcile() {
  const updates = getEvents().find(event => event.id === eventId)?.live_updates || [];
  for (const item of queue()) {
   const result = updates.find(update => update.id === item.id);
   if (result) item.result = `${result.my_score} : ${result.their_score}`;
  }
  persist();
 }
 function option(value, label) { return new Option(label, value); }
 function draw() {
  const items = queue();
  const pending = items.filter(item => !item.result);
  if (!pending.some(item => item.id === activeId)) activeId = pending[0]?.id;
  select.replaceChildren(...pending.map(item => option(item.id, `${items.indexOf(item) + 1}. ${item.name}`)));
  if (activeId) select.value = activeId;
  form.hidden = !pending.length;
  const saved = items.filter(item => item.result);
  el('boutSaved').hidden = !saved.length;
  el('boutSavedList').replaceChildren(...saved.map(item => {
   const row = document.createElement('li');
   row.textContent = `${item.name} · ${item.result}`;
   return row;
  }));
  el('boutHeading').textContent = pending.length ? 'Következő ellenfél' : 'Ellenfelek megadása';
  el('boutQueueHint').hidden = !!pending.length;
  el('boutQueueHint').textContent = saved.length ? 'Minden megadott asszó mentve. Ha lesz még ellenfél, add hozzá itt.' :
   'Írd be az ellenfeleket, soronként egy nevet. Egyetlen nevet is megadhatsz.';
  setup.open = !pending.length;
 }
 function clearPoints() { mine.value = ''; theirs.value = ''; }
 function open(id) {
  if (getRole() !== 'admin' || dialog.open || !getEvents().length) return;
  const events = getEvents();
  eventId = id || eventId || events[0].id;
  if (!events.some(event => event.id === eventId)) eventId = events[0].id;
  eventSelect.replaceChildren(...events.map(event => option(event.id, `${event.name} · ${event.date}`)));
  eventSelect.value = eventId;
  activeId = undefined;
  notice.textContent = '';
  opponent.value = '';
  clearPoints();
  reconcile();
  draw();
  dialog.showModal();
  (activeId ? select : opponent).focus();
 }
 el('closeBoutEntry').onclick = () => { if (!saving) dialog.close(); };
 dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
 eventSelect.onchange = () => {
  eventId = eventSelect.value;
  activeId = undefined;
  opponent.value = '';
  notice.textContent = '';
  clearPoints();
  reconcile();
  draw();
 };
 select.onchange = () => {
  activeId = select.value;
  notice.textContent = '';
  clearPoints();
  mine.focus();
 };
 el('boutAddForm').onsubmit = event => {
  event.preventDefault();
  const names = opponent.value.split(/\r?\n/).map(name => name.trim()).filter(Boolean);
  if (!names.length || names.some(name => name.length > 180)) {
   notice.textContent = 'Adj meg legalább egy, legfeljebb 180 karakteres nevet.';
   return;
  }
  if (queue().length + names.length > 100) {
   notice.textContent = 'Egy versenyhez ezen az eszközön legfeljebb 100 asszót adhatsz meg.';
   return;
  }
  queue().push(...names.map(name => ({id:crypto.randomUUID(),name})));
  persist();
  opponent.value = '';
  notice.textContent = '';
  draw();
  mine.focus();
 };
 form.onsubmit = async event => {
  event.preventDefault();
  const item = queue().find(item => !item.result && item.id === activeId);
  if (!item || saving || getRole() !== 'admin') return;
  const next = queue().find(other => !other.result && other.id !== item.id);
  const myScore = mine.valueAsNumber, theirScore = theirs.valueAsNumber;
  if (![myScore, theirScore].every(value => Number.isInteger(value) && value >= 0 && value <= 99)) {
   notice.textContent = 'Mindkét pontszámhoz adj meg 0 és 99 közötti egész számot.';
   return;
  }
  saving = true;
  el('boutFields').disabled = true;
  el('closeBoutEntry').disabled = true;
  notice.textContent = 'Mentés…';
  try {
   const saved = await api('live-update','POST',{
    event_id:eventId,update_id:item.id,phase:stage.value,opponent:item.name,
    my_score:myScore,their_score:theirScore,
    current_text:`Befejezett asszó: Vili ${myScore} : ${theirScore} ${item.name}.`,
    next_text:next ? `A megadott sorrendben a következő ellenfél: ${next.name}.` : '',
   });
   if (!saved.ok || saved.id !== item.id) throw Error('A mentés visszaigazolása hiányzik.');
   item.result = `${myScore} : ${theirScore}`;
   persist();
   clearPoints();
   draw();
   notice.textContent = `Mentve: ${item.name}, ${item.result}.${next ? ` Következik: ${next.name}.` : ''}`;
   void reload({quiet:true});
  } catch (error) {
   notice.textContent = `A mentés nem lett visszaigazolva. ${error.message}`;
  } finally {
   saving = false;
   el('boutFields').disabled = false;
   el('closeBoutEntry').disabled = false;
   if (dialog.open) (form.hidden ? opponent : mine).focus();
  }
 };
 return {
  open,
  sync() {
   if (getRole() !== 'admin' && dialog.open) dialog.close();
  },
 };
}
