function matchingLogs(e){return loadLogs().filter(l=>(l.exerciseId&&l.exerciseId===e.id)||(!l.exerciseId&&l.ejercicio===e.nombre)).sort((a,b)=>b.ts-a.ts)}
function renderExerciseProgress(e){
  const c=document.getElementById("exerciseProgress"),logs=matchingLogs(e);if(!logs.length){c.innerHTML=`<div class="block-head"><h3>Progreso</h3><span>Historial</span></div><div class="progress-empty">Cuando registres entrenamientos, acá vas a ver tu evolución de peso y tus últimas marcas.</div>`;return}
  const best=Math.max(...logs.map(x=>Number(x.peso)||0));const latest=logs[0];const byDate={};logs.forEach(l=>{if(!byDate[l.fecha])byDate[l.fecha]=[];byDate[l.fecha].push(l)});const dates=Object.keys(byDate).sort().slice(-6);const vals=dates.map(d=>Math.max(...byDate[d].map(x=>Number(x.peso)||0)));const max=Math.max(1,...vals);
  const bars=dates.map((d,i)=>`<div class="trend-col"><div class="trend-bar-wrap"><div class="trend-bar" style="height:${Math.max(6,Math.round(vals[i]/max*100))}%"></div></div><div class="trend-label">${d.slice(5).replace("-","/")}</div></div>`).join("");
  const recentDates=Object.keys(byDate).sort().reverse().slice(0,4);
  const recent=recentDates.map(d=>{const rs=byDate[d],w=Math.max(...rs.map(x=>Number(x.peso)||0)),r=Math.max(...rs.filter(x=>(Number(x.peso)||0)===w).map(x=>Number(x.reps)||0));return `<div class="history-row"><span>${d}</span><span><b>${w} kg</b> · ${r} reps</span></div>`}).join("");
  c.innerHTML=`<div class="block-head"><h3>Progreso</h3><span>Dentro de este ejercicio</span></div><div class="stat-grid"><div class="stat"><div class="stat-label">Mejor peso</div><div class="stat-value">${best}<small> kg</small></div></div><div class="stat"><div class="stat-label">Última serie</div><div class="stat-value">${latest.peso}<small> kg · ${latest.reps} reps</small></div></div></div><div class="trend">${bars}</div><div class="recent-history">${recent}</div>`;
}

function renderRoutineEditor(){
  const c=document.getElementById("routineList"),exs=routine[state.selectedDay]||[];c.innerHTML="";
  if(!exs.length)c.innerHTML='<div class="progress-empty">Sin ejercicios para este día.</div>';
  exs.forEach((e,i)=>{const r=document.createElement("div");r.className="routine-row";r.innerHTML=`<div class="routine-num">${String(i+1).padStart(2,"0")}</div><div class="routine-info"><b>${escapeHtml(e.nombre)}</b><span>${escapeHtml(targetLabel(e))}</span></div><button class="icon-btn" aria-label="Eliminar">×</button>`;r.querySelector("button").onclick=()=>{routine[state.selectedDay]=routine[state.selectedDay].filter(x=>x.id!==e.id);saveRoutine();renderRoutineEditor();renderExercises();syncPending(false)};c.appendChild(r)});
}
document.getElementById("addExBtn").onclick=()=>{
  const name=document.getElementById("newExName").value.trim();if(!name){showToast("Escribí el nombre del ejercicio");return}
  const series=Math.max(1,parseInt(document.getElementById("newExSeries").value)||3),reps=Math.max(0,parseInt(document.getElementById("newExReps").value)||10),peso=Math.max(0,parseFloat(document.getElementById("newExPeso").value)||0);
  routine[state.selectedDay].push({id:cid(),nombre:name,series,reps,peso,alFallo:false});saveRoutine();document.getElementById("newExName").value="";renderRoutineEditor();renderExercises();syncPending(false);
};

function renderSettings(){
  renderProfile();document.getElementById("accent1").value=state.accentColors.c1;document.getElementById("accent2").value=state.accentColors.c2;document.getElementById("scriptUrlInput").value=state.scriptUrl||DEFAULT_SCRIPT_URL;renderSyncStatus();renderRoutineEditor();
}
document.querySelectorAll(".theme-btn").forEach(b=>b.onclick=()=>{state.theme=b.dataset.theme;saveState();applyTheme()});
document.getElementById("accent1").oninput=e=>{state.accentColors.c1=e.target.value;saveState();applyAccent()};
document.getElementById("accent2").oninput=e=>{state.accentColors.c2=e.target.value;saveState();applyAccent()};
document.getElementById("saveUrlBtn").onclick=()=>{state.scriptUrl=document.getElementById("scriptUrlInput").value.trim()||DEFAULT_SCRIPT_URL;saveState();showToast("URL guardada");renderSyncStatus()};
document.getElementById("syncBtn").onclick=()=>syncPending(true);
document.getElementById("switchUserBtn").onclick=()=>{closeExercise();showLogin()};
document.getElementById("profileButton").onclick=()=>switchView("ajustes");

function resizePhoto(file){return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>{const img=new Image();img.onload=()=>{const size=420,scale=Math.min(1,size/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext("2d").drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL("image/jpeg",.82))};img.onerror=reject;img.src=fr.result};fr.onerror=reject;fr.readAsDataURL(file)})}
document.getElementById("photoInput").onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const p=getProfile();p.photo=await resizePhoto(file);saveProfile(p);renderProfile();showToast("Foto actualizada")}catch{showToast("No pude procesar esa imagen")}};

function switchView(name){document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===`view-${name}`));document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===name));if(name==="ajustes")renderSettings()}
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>switchView(b.dataset.view));

function pendingCount(){return loadLogs().filter(x=>!x.synced).length}
function renderSyncStatus(){const p=pendingCount(),last=state.lastSync?new Date(state.lastSync).toLocaleString("es-AR"):"nunca";document.getElementById("syncStatus").innerHTML=`Usuario remoto: <b>${escapeHtml(state.currentUser||"—")}</b><br>Series pendientes: <b>${p}</b> · Última sincronización: <b>${last}</b><br>La rutina se envía junto con los registros cuando el servidor la admite.`}
async function syncPending(manual){
  if(!state.currentUser)return;const url=(state.scriptUrl||DEFAULT_SCRIPT_URL).trim();if(!url){if(manual)showToast("Falta la URL del Apps Script");return}
  const logs=loadLogs(),rows=logs.filter(x=>!x.synced);if(!rows.length&&!routineIsDirty()){if(manual){showToast("Todo está sincronizado");renderSyncStatus()}return}
  const profile=getProfile();
  const payload={action:"sync",version:3,user:state.currentUser,updatedAt:new Date().toISOString(),rows,routine,profile:{name:state.currentUser},selectedDay:state.selectedDay};
  try{
    await fetch(url,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload)});
    if(rows.length){const ids=new Set(rows.map(x=>x.id));logs.forEach(x=>{if(ids.has(x.id))x.synced=true});saveLogs(logs)}
    clearRoutineDirty();state.lastSync=Date.now();saveState();renderSyncStatus();if(manual)showToast("Sincronización enviada");
  }catch(err){console.error(err);if(manual)showToast("No se pudo sincronizar")}
}
async function pullRemoteRoutine(showMessage){
  const url=(state.scriptUrl||DEFAULT_SCRIPT_URL).trim();if(!url||!state.currentUser)return;
  try{
    const sep=url.includes("?")?"&":"?";const res=await fetch(`${url}${sep}action=load&user=${encodeURIComponent(state.currentUser)}`,{method:"GET"});if(!res.ok)return;const data=await res.json();
    if(data&&data.ok&&data.routine&&typeof data.routine==="object"){
      const hasLocal=localStorage.getItem(routineKey());
      if(!hasLocal||data.updatedAt&&data.updatedAt>(getProfile().remoteUpdatedAt||"")){routine=data.routine;localStorage.setItem(routineKey(),JSON.stringify(routine));const p=getProfile();p.remoteUpdatedAt=data.updatedAt||new Date().toISOString();saveProfile(p);doneMap=loadDone();renderAll();if(showMessage)showToast("Rutina remota cargada")}
    }
  }catch(err){console.debug("Carga remota no disponible",err)}
}
setInterval(()=>syncPending(false),3*60*1000);
window.addEventListener("beforeunload",()=>syncPending(false));

let timerTotal=60,timerRemaining=60,timerRunning=false,timerInterval=null;
function formatTimer(sec){return `${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`}
function openTimer(auto){document.getElementById("timerOverlay").classList.add("active");updateTimer();if(auto&&!timerRunning){resetTimer(timerTotal);startTimer()}}
function closeTimer(){document.getElementById("timerOverlay").classList.remove("active")}
document.getElementById("fabTimer").onclick=()=>openTimer(false);document.getElementById("timerClose").onclick=closeTimer;
document.querySelectorAll(".preset[data-secs]").forEach(b=>b.onclick=()=>{resetTimer(+b.dataset.secs);document.querySelectorAll(".preset[data-secs]").forEach(x=>x.classList.toggle("active",x===b))});
document.getElementById("plus30").onclick=()=>{timerRemaining+=30;timerTotal+=30;updateTimer()};document.getElementById("timerStart").onclick=()=>timerRunning?pauseTimer():startTimer();document.getElementById("timerReset").onclick=()=>resetTimer(timerTotal);
function startTimer(){clearInterval(timerInterval);timerRunning=true;document.getElementById("timerStart").textContent="Pausar";document.getElementById("ringSub").textContent="descansando";document.getElementById("fabTimer").classList.add("fab-running");timerInterval=setInterval(()=>{timerRemaining--;if(timerRemaining<=0){timerRemaining=0;pauseTimer();document.getElementById("ringSub").textContent="listo";if(navigator.vibrate)navigator.vibrate([180,90,180])}updateTimer()},1000)}
function pauseTimer(){timerRunning=false;clearInterval(timerInterval);document.getElementById("timerStart").textContent="Iniciar";document.getElementById("fabTimer").classList.remove("fab-running")}
function resetTimer(s){pauseTimer();timerTotal=s;timerRemaining=s;document.getElementById("ringSub").textContent="listo";updateTimer()}
function updateTimer(){document.getElementById("ringTime").textContent=formatTimer(timerRemaining);document.getElementById("timerRing").setAttribute("stroke-dashoffset",RING_LEN*(1-(timerTotal?timerRemaining/timerTotal:0)));const inline=document.getElementById("inlineTimerText");if(inline)inline.textContent=formatTimer(timerRemaining)}

function renderAll(){if(!state.currentUser)return;applyTheme();applyAccent();renderProfile();renderGreeting();renderDays();renderExercises();renderSettings();updateTimer()}

applyTheme();applyAccent();resetTimer(60);renderLogin();showLogin();
