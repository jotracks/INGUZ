/* Workout Planner v4 — UX + Daily Photo + cross-device history sync */
const WP_PHOTO_DB = 'workout_planner_photos_v1';
const WP_PHOTO_STORE = 'photos';
let wpCapturedPhotoBlob = null;
let wpPhotoObjectUrl = '';
let wpNumberSaveCallback = null;

function injectV4UI(){
  if(document.getElementById('numberEditorOverlay')) return;
  document.querySelector('.app-shell').insertAdjacentHTML('beforeend', `
    <input id="dailyPhotoInput" type="file" accept="image/*" capture="user" hidden>

    <div class="v4-overlay" id="numberEditorOverlay">
      <div class="v4-dialog number-dialog">
        <button class="v4-close" id="numberEditorClose">×</button>
        <div class="v4-kicker" id="numberEditorKicker">Editar valor</div>
        <div class="v4-title" id="numberEditorTitle">Repeticiones</div>
        <div class="number-input-wrap">
          <input id="numberEditorInput" type="number" inputmode="decimal" min="0" max="999" step="1">
          <span id="numberEditorUnit">reps</span>
        </div>
        <button class="v4-primary" id="numberEditorSave">Usar este valor</button>
        <div class="v4-note">También podés seguir deslizando la rueda como siempre.</div>
      </div>
    </div>

    <div class="v4-overlay" id="dailyPhotoOverlay">
      <div class="v4-dialog photo-dialog">
        <button class="v4-close" id="dailyPhotoClose">×</button>
        <div class="v4-kicker">Daily gym photo</div>
        <div class="v4-title" id="dailyPhotoTitle">Foto de hoy</div>
        <div class="daily-photo-preview" id="dailyPhotoPreview">
          <div class="daily-photo-placeholder">📷</div>
        </div>
        <div class="photo-actions" id="dailyPhotoActions"></div>
        <div class="v4-note">Por ahora esta foto queda guardada sólo en este dispositivo.</div>
      </div>
    </div>

    <div class="v4-overlay" id="completionOverlay">
      <div class="v4-dialog completion-dialog">
        <div class="completion-icon">✓</div>
        <div class="v4-kicker">Entrenamiento completo</div>
        <div class="completion-title" id="completionTitle">Buen trabajo.</div>
        <div class="completion-stats" id="completionStats"></div>
        <button class="v4-primary" id="completionPhotoBtn">📷 Daily foto</button>
        <button class="v4-secondary" id="completionClose">Cerrar</button>
      </div>
    </div>
  `);

  document.getElementById('numberEditorClose').onclick = closeNumberEditor;
  document.getElementById('numberEditorOverlay').addEventListener('click',e=>{if(e.target===e.currentTarget)closeNumberEditor()});
  document.getElementById('numberEditorSave').onclick = commitNumberEditor;
  document.getElementById('numberEditorInput').addEventListener('keydown',e=>{if(e.key==='Enter')commitNumberEditor()});

  document.getElementById('dailyPhotoClose').onclick = closeDailyPhotoOverlay;
  document.getElementById('dailyPhotoOverlay').addEventListener('click',e=>{if(e.target===e.currentTarget)closeDailyPhotoOverlay()});
  document.getElementById('dailyPhotoInput').onchange = onDailyPhotoPicked;

  document.getElementById('completionClose').onclick = closeCompletionSummary;
  document.getElementById('completionPhotoBtn').onclick = ()=>{closeCompletionSummary();startDailyPhotoCapture()};
}

/* ---------- Editable wheel values ---------- */
function openNumberEditor(kind,value,onSave){
  injectV4UI();
  const reps = kind==='reps';
  document.getElementById('numberEditorKicker').textContent = 'Carga manual';
  document.getElementById('numberEditorTitle').textContent = reps ? 'Repeticiones' : 'Peso';
  document.getElementById('numberEditorUnit').textContent = reps ? 'reps' : 'kg';
  const input=document.getElementById('numberEditorInput');
  input.step=reps?'1':'0.1';
  input.inputMode=reps?'numeric':'decimal';
  input.value=Number(value)||0;
  wpNumberSaveCallback=onSave;
  document.getElementById('numberEditorOverlay').classList.add('active');
  setTimeout(()=>{input.focus();input.select()},60);
}
function closeNumberEditor(){document.getElementById('numberEditorOverlay')?.classList.remove('active');wpNumberSaveCallback=null}
function commitNumberEditor(){
  const input=document.getElementById('numberEditorInput');
  let v=Number(String(input.value).replace(',','.'));
  if(!Number.isFinite(v)||v<0){showToast('Ingresá un número válido');return}
  const isReps=document.getElementById('numberEditorUnit').textContent==='reps';
  v=isReps?Math.round(v):Math.round(v*10)/10;
  v=Math.min(999,v);
  const cb=wpNumberSaveCallback;closeNumberEditor();if(cb)cb(v);
}

function buildWheel(container,values,initial,fmt,onChange){
  container.innerHTML='<div style="height:44px"></div>'+values.map(v=>`<div class="wheel-item">${fmt(v)}</div>`).join('')+'<div style="height:44px"></div>';
  let manualValue=null;
  let scrolling=false;
  function scrollValue(){const raw=Math.round(container.scrollTop/WHEEL_ROW_H),i=Math.max(0,Math.min(values.length-1,raw));return {value:values[i],index:i}}
  function paint(){
    const current=scrollValue();
    container.querySelectorAll('.wheel-item').forEach(x=>x.classList.remove('active'));
    const el=container.children[current.index+1];if(el)el.classList.add('active');
    const value=manualValue!==null?manualValue:current.value;
    if(onChange)onChange(value,manualValue!==null);
    return value;
  }
  function setValue(raw){
    let v=Number(raw);if(!Number.isFinite(v))v=0;
    const exact=values.findIndex(x=>Math.abs(x-v)<1e-7);
    if(exact>=0){manualValue=null;container.scrollTop=exact*WHEEL_ROW_H;requestAnimationFrame(paint)}
    else{manualValue=v;paint()}
  }
  container.onscroll=()=>{
    manualValue=null;
    if(scrolling)return;scrolling=true;
    requestAnimationFrame(()=>{paint();scrolling=false});
  };
  setValue(initial);
  return {getValue:paint,setValue};
}

/* ---------- Daily Photo / IndexedDB ---------- */
function openPhotoDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(WP_PHOTO_DB,1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(WP_PHOTO_STORE))db.createObjectStore(WP_PHOTO_STORE,{keyPath:'key'})};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
function photoRecordKey(){return `${userKey(state.currentUser)}|${localDateStr()}`}
async function getDailyPhoto(){
  if(!state.currentUser)return null;
  try{const db=await openPhotoDB();return await new Promise((resolve,reject)=>{const tx=db.transaction(WP_PHOTO_STORE,'readonly');const r=tx.objectStore(WP_PHOTO_STORE).get(photoRecordKey());r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}catch{return null}
}
async function saveDailyPhoto(blob){
  const db=await openPhotoDB();
  const record={key:photoRecordKey(),user:state.currentUser,date:localDateStr(),createdAt:Date.now(),blob};
  await new Promise((resolve,reject)=>{const tx=db.transaction(WP_PHOTO_STORE,'readwrite');tx.objectStore(WP_PHOTO_STORE).put(record);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
  return record;
}
function resizeDailyPhoto(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{
      try{
        const max=1280,scale=Math.min(1,max/Math.max(img.width,img.height));
        const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));
        c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
        c.toBlob(b=>b?resolve(b):reject(new Error('blob')),'image/jpeg',.84);
      }catch(err){URL.revokeObjectURL(url);reject(err)}
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('image'))};img.src=url;
  });
}
function setPhotoPreview(blob){
  if(wpPhotoObjectUrl)URL.revokeObjectURL(wpPhotoObjectUrl);
  wpPhotoObjectUrl=URL.createObjectURL(blob);
  document.getElementById('dailyPhotoPreview').innerHTML=`<img src="${wpPhotoObjectUrl}" alt="Daily gym photo">`;
}
async function renderDailyPhotoBubble(){
  const btn=document.getElementById('dailyPhotoBtn');if(!btn)return;
  const record=await getDailyPhoto();
  if(record?.blob){
    const url=URL.createObjectURL(record.blob);
    btn.classList.add('has-photo');btn.innerHTML=`<span class="daily-thumb"><img src="${url}" alt=""></span><span><b>Daily foto</b><small>✓ Foto de hoy</small></span>`;
    setTimeout(()=>URL.revokeObjectURL(url),8000);
  }else{
    btn.classList.remove('has-photo');btn.innerHTML=`<span class="daily-camera">📷</span><span><b>Daily foto</b><small>Sacá la foto de hoy</small></span>`;
  }
  btn.onclick=openDailyPhoto;
}
async function openDailyPhoto(){
  injectV4UI();
  const record=await getDailyPhoto();
  if(!record?.blob){startDailyPhotoCapture();return}
  wpCapturedPhotoBlob=null;setPhotoPreview(record.blob);
  document.getElementById('dailyPhotoTitle').textContent='Tu foto de hoy';
  document.getElementById('dailyPhotoActions').innerHTML=`<button class="v4-primary" id="retakeDailyPhoto">Sacar otra</button><button class="v4-secondary" id="keepDailyPhoto">Cerrar</button>`;
  document.getElementById('retakeDailyPhoto').onclick=startDailyPhotoCapture;
  document.getElementById('keepDailyPhoto').onclick=closeDailyPhotoOverlay;
  document.getElementById('dailyPhotoOverlay').classList.add('active');
}
function startDailyPhotoCapture(){
  injectV4UI();const input=document.getElementById('dailyPhotoInput');input.value='';input.click();
}
async function onDailyPhotoPicked(e){
  const file=e.target.files?.[0];if(!file)return;
  try{
    wpCapturedPhotoBlob=await resizeDailyPhoto(file);setPhotoPreview(wpCapturedPhotoBlob);
    document.getElementById('dailyPhotoTitle').textContent='¿La guardamos?';
    document.getElementById('dailyPhotoActions').innerHTML=`<button class="v4-primary" id="saveDailyPhotoBtn">Guardar foto</button><button class="v4-secondary" id="retakeDailyPhotoBtn">Repetir</button>`;
    document.getElementById('saveDailyPhotoBtn').onclick=async()=>{try{await saveDailyPhoto(wpCapturedPhotoBlob);wpCapturedPhotoBlob=null;closeDailyPhotoOverlay();renderDailyPhotoBubble();showToast('Daily foto guardada')}catch{showToast('No pude guardar la foto')}};
    document.getElementById('retakeDailyPhotoBtn').onclick=startDailyPhotoCapture;
    document.getElementById('dailyPhotoOverlay').classList.add('active');
  }catch{showToast('No pude procesar esa foto')}
}
function closeDailyPhotoOverlay(){document.getElementById('dailyPhotoOverlay')?.classList.remove('active');wpCapturedPhotoBlob=null;if(wpPhotoObjectUrl){URL.revokeObjectURL(wpPhotoObjectUrl);wpPhotoObjectUrl=''}}

/* ---------- Main summary + Daily Photo bubble ---------- */
function renderSummary(){
  const exs=routine[state.selectedDay]||[],total=exs.reduce((a,e)=>a+e.series,0),done=exs.reduce((a,e)=>a+Math.min(e.series,completedSets(e)),0),pct=total?Math.round(done/total*100):0;
  document.getElementById('daySummary').innerHTML=`<div class="summary-top"><div><div class="summary-label">Plan del día</div><div class="summary-title">${state.selectedDay}</div><div class="summary-meta">${exs.length} ejercicios · ${done} de ${total} series completas</div></div><div class="summary-ring" style="--progress-angle:${pct*3.6}deg"><span>${pct}%</span></div></div><div class="summary-bar"><i style="width:${pct}%"></i></div><div class="summary-actions"><button class="daily-photo-bubble" id="dailyPhotoBtn" type="button"><span class="daily-camera">📷</span><span><b>Daily foto</b><small>Sacá la foto de hoy</small></span></button></div>`;
  renderDailyPhotoBubble();
}

/* ---------- Exercise sheet v4 ---------- */
function renderExerciseSheet(){
  const exs=routine[state.selectedDay]||[];if(!exs.length){closeExercise();return}
  exerciseIndex=Math.max(0,Math.min(exerciseIndex,exs.length-1));
  const e=exs[exerciseIndex],d=doneMap[e.id]||{},n=Object.keys(d).length,complete=n>=e.series;
  document.getElementById('sheetCount').textContent=`Ejercicio ${exerciseIndex+1} de ${exs.length}`;
  document.getElementById('sheetName').textContent=e.nombre;
  const goalMain=e.alFallo?`${e.series} × <span>al fallo</span>`:`${e.series} × <span>${e.reps} reps</span>`;
  document.getElementById('goalCard').innerHTML=`<div class="goal-label">Objetivo</div><div class="goal-main">${goalMain}</div><div class="goal-sub">${e.peso>0?`Peso de referencia: ${e.peso} kg`:'Elegí reps y peso para cada serie'}</div><div class="goal-status"><div class="goal-progress"><b>${n}</b> de ${e.series} series registradas</div><button class="rest-bubble" id="inlineTimer"><svg viewBox="0 0 24 24" fill="none" stroke-width="2.2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg><span id="inlineTimerText">${formatTimer(timerRemaining)}</span></button></div>`;
  document.getElementById('inlineTimer').onclick=()=>openTimer(false);

  const area=document.getElementById('setArea');
  if(complete){area.innerHTML=`<div class="complete-card">✓ Ejercicio completo por hoy</div>`}
  else{
    const next=n+1,last=matchingLogs(e)[0];
    const lastHtml=last?`<div class="last-set"><span>Última serie <b>${last.reps} reps · ${last.peso} kg</b></span><button id="useLastSet" type="button">USAR</button></div>`:'';
    area.innerHTML=`<div class="set-card"><div class="set-head"><div class="set-badge">Serie ${next} de ${e.series}</div><div class="set-hint">Deslizá o tocá el número</div></div>${lastHtml}<div class="wheels"><div class="wheel-col"><div class="wheel-label">Repeticiones</div><div class="wheel-wrap"><div class="wheel-scroll" id="repsWheel"></div><div class="wheel-highlight"></div><button class="wheel-value-button" id="repsValueBtn" type="button">${e.reps||0}</button></div></div><div class="wheel-col"><div class="wheel-label">Peso · kg</div><div class="wheel-wrap"><div class="wheel-scroll" id="pesoWheel"></div><div class="wheel-highlight"></div><button class="wheel-value-button" id="pesoValueBtn" type="button">${e.peso||0}</button></div></div></div><button class="save-set" id="saveSet">Guardar serie</button></div>`;
    const repsBtn=document.getElementById('repsValueBtn'),pesoBtn=document.getElementById('pesoValueBtn');
    const rw=buildWheel(document.getElementById('repsWheel'),REPS_VALUES,e.reps||0,v=>String(v),(v,manual)=>{repsBtn.textContent=String(v);repsBtn.classList.toggle('manual',manual)});
    const pw=buildWheel(document.getElementById('pesoWheel'),PESO_VALUES,e.peso||0,v=>v%1===0?String(v):v.toFixed(1),(v,manual)=>{pesoBtn.textContent=Number(v)%1===0?String(v):Number(v).toFixed(1);pesoBtn.classList.toggle('manual',manual)});
    repsBtn.onclick=()=>openNumberEditor('reps',rw.getValue(),v=>rw.setValue(v));
    pesoBtn.onclick=()=>openNumberEditor('peso',pw.getValue(),v=>pw.setValue(v));
    if(last)document.getElementById('useLastSet').onclick=()=>{rw.setValue(Number(last.reps)||0);pw.setValue(Number(last.peso)||0);showToast('Última serie cargada')};
    document.getElementById('saveSet').onclick=()=>markSetDone(e,next,rw.getValue(),pw.getValue());
  }
  renderTodayHistory(e);renderExerciseProgress(e);
}

/* ---------- Workout session + completion ---------- */
function sessionKey(){return `wp_session_${userKey(state.currentUser)}_${state.selectedDay}_${localDateStr()}`}
function getSessionStart(){
  const stored=Number(localStorage.getItem(sessionKey())||0);if(stored)return stored;
  const today=loadLogs().filter(x=>x.fecha===localDateStr()&&x.dia===state.selectedDay&&Number(x.ts));
  return today.length?Math.min(...today.map(x=>Number(x.ts))):Date.now();
}
function ensureSessionStart(){if(!localStorage.getItem(sessionKey()))localStorage.setItem(sessionKey(),String(getSessionStart()))}
function dayIsComplete(){const exs=routine[state.selectedDay]||[],total=exs.reduce((a,e)=>a+e.series,0),done=exs.reduce((a,e)=>a+Math.min(e.series,completedSets(e)),0);return total>0&&done>=total}
function openCompletionSummary(){
  injectV4UI();
  const exs=routine[state.selectedDay]||[],series=exs.reduce((a,e)=>a+e.series,0),start=getSessionStart(),mins=Math.max(1,Math.round((Date.now()-start)/60000));
  document.getElementById('completionTitle').textContent=`${state.currentUser.split(/\s+/)[0]}, terminaste ${state.selectedDay}.`;
  document.getElementById('completionStats').innerHTML=`<div><b>${exs.length}</b><span>ejercicios</span></div><div><b>${series}</b><span>series</span></div><div><b>${mins}</b><span>min</span></div>`;
  document.getElementById('completionOverlay').classList.add('active');
}
function closeCompletionSummary(){document.getElementById('completionOverlay')?.classList.remove('active')}

function markSetDone(e,setNum,reps,peso){
  ensureSessionStart();
  if(!doneMap[e.id])doneMap[e.id]={};doneMap[e.id][setNum]={reps,peso};saveDone();
  const logs=loadLogs();logs.push({id:cid(),ts:Date.now(),fecha:localDateStr(),usuario:state.currentUser,dia:state.selectedDay,exerciseId:e.id,ejercicio:e.nombre,set:setNum,reps,peso,synced:false});saveLogs(logs);
  const finished=dayIsComplete();
  renderExercises();renderExerciseSheet();syncPending(false);
  if(finished){closeExercise();closeTimer();openCompletionSummary()}else openTimer(true);
}

function selectDay(d){
  state.selectedDay=d;saveState();doneMap=loadDone();rebuildTodayDoneFromLogs();renderDays();renderSummary();renderExercises();renderRoutineEditor();
}

/* ---------- Cross-device Sheet sync ---------- */
function remoteLogKey(x){return x.id?`id:${x.id}`:`sig:${x.fecha}|${x.dia}|${x.exerciseId||x.ejercicio}|${x.set}|${x.reps}|${x.peso}|${x.ts||''}`}
function normalizeRemoteLog(x){return {id:String(x.id||''),ts:Number(x.ts)||Date.now(),fecha:String(x.fecha||''),usuario:state.currentUser,dia:String(x.dia||''),exerciseId:String(x.exerciseId||''),ejercicio:String(x.ejercicio||''),set:Number(x.set)||0,reps:Number(x.reps)||0,peso:Number(x.peso)||0,synced:true}}
function mergeRemoteLogs(remote){
  if(!Array.isArray(remote)||!remote.length)return false;
  const local=loadLogs(),map=new Map();local.forEach(x=>map.set(remoteLogKey(x),x));
  remote.forEach(r=>{const n=normalizeRemoteLog(r),k=remoteLogKey(n),old=map.get(k);map.set(k,old?Object.assign(old,n,{synced:true}):n)});
  saveLogs(Array.from(map.values()).sort((a,b)=>(Number(a.ts)||0)-(Number(b.ts)||0)));return true;
}
function rebuildTodayDoneFromLogs(){
  const map={},exs=routine[state.selectedDay]||[],logs=loadLogs().filter(x=>x.fecha===localDateStr()&&x.dia===state.selectedDay).sort((a,b)=>(Number(a.ts)||0)-(Number(b.ts)||0));
  logs.forEach(l=>{let id=l.exerciseId;if(!id){const ex=exs.find(e=>e.nombre===l.ejercicio);id=ex?.id||''}if(!id||!l.set)return;if(!map[id])map[id]={};map[id][l.set]={reps:Number(l.reps)||0,peso:Number(l.peso)||0}});
  doneMap=map;saveDone();
}
function hasRemoteRoutine(data){if(data?.routineExists)return true;if(data?.updatedAt)return true;return data?.routine&&Object.values(data.routine).some(v=>Array.isArray(v)&&v.length)}

async function enterUser(raw){
  const name=String(raw||'').trim();if(!name){showToast('Ingresá un nombre');return}
  state.currentUser=name;state.recentUsers=[name,...(state.recentUsers||[]).filter(x=>x.toLocaleLowerCase('es')!==name.toLocaleLowerCase('es'))].slice(0,6);saveState();
  if(!localStorage.getItem(profileKey()))saveProfile({name,photo:''});
  const hadLocalRoutine=!!localStorage.getItem(routineKey());routine=loadRoutine();doneMap=loadDone();if(!hadLocalRoutine)clearRoutineDirty();
  document.getElementById('loginGate').classList.add('hidden');renderAll();
  const result=await pullRemoteRoutine(false);
  if(!hadLocalRoutine&&!result.remoteRoutine){markRoutineDirty();syncPending(false)}
}

async function syncPending(manual){
  if(!state.currentUser)return;const url=(state.scriptUrl||DEFAULT_SCRIPT_URL).trim();if(!url){if(manual)showToast('Falta la URL del Apps Script');return}
  const logs=loadLogs(),rows=logs.filter(x=>!x.synced);if(!rows.length&&!routineIsDirty()){if(manual){await pullRemoteRoutine(false);showToast('Todo está sincronizado');renderSyncStatus()}return}
  const payload={action:'sync',version:4,user:state.currentUser,updatedAt:new Date().toISOString(),rows,routine,profile:{name:state.currentUser},selectedDay:state.selectedDay};
  try{
    await fetch(url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});
    if(rows.length){const ids=new Set(rows.map(x=>x.id));logs.forEach(x=>{if(ids.has(x.id))x.synced=true});saveLogs(logs)}
    clearRoutineDirty();state.lastSync=Date.now();saveState();await pullRemoteRoutine(false);renderSyncStatus();if(manual)showToast('Sincronización completa');
  }catch(err){console.error(err);if(manual)showToast('No se pudo sincronizar')}
}

async function pullRemoteRoutine(showMessage){
  const out={remoteRoutine:false,remoteLogs:false};
  const url=(state.scriptUrl||DEFAULT_SCRIPT_URL).trim();if(!url||!state.currentUser)return out;
  try{
    const sep=url.includes('?')?'&':'?';const res=await fetch(`${url}${sep}action=load&user=${encodeURIComponent(state.currentUser)}`,{method:'GET'});if(!res.ok)return out;const data=await res.json();if(!data?.ok)return out;
    const p=getProfile();
    if(hasRemoteRoutine(data)&&data.routine&&typeof data.routine==='object'&&!routineIsDirty()){
      routine=data.routine;DAYS.forEach(d=>{if(!Array.isArray(routine[d]))routine[d]=[]});localStorage.setItem(routineKey(),JSON.stringify(routine));clearRoutineDirty();out.remoteRoutine=true;
      p.remoteUpdatedAt=data.updatedAt||p.remoteUpdatedAt||new Date().toISOString();saveProfile(p);
    }
    if(mergeRemoteLogs(data.logs)){out.remoteLogs=true}
    rebuildTodayDoneFromLogs();renderAll();
    if(showMessage)showToast(out.remoteLogs?'Rutina y progreso cargados':'Rutina remota cargada');
  }catch(err){console.debug('Carga remota no disponible',err)}
  return out;
}

function renderSyncStatus(){
  const p=pendingCount(),last=state.lastSync?new Date(state.lastSync).toLocaleString('es-AR'):'nunca';
  document.getElementById('syncStatus').innerHTML=`Usuario remoto: <b>${escapeHtml(state.currentUser||'—')}</b><br>Series pendientes: <b>${p}</b> · Última sincronización: <b>${last}</b><br>Rutina e historial se respaldan en Sheets y se recuperan al usar el mismo nombre.`;
}

injectV4UI();
if(state.currentUser)renderAll();
