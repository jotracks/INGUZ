const DAYS=["Lunes","Martes","Miércoles","Jueves","Viernes"];
const DAY_SHORT={Lunes:"Lun",Martes:"Mar",Miércoles:"Mié",Jueves:"Jue",Viernes:"Vie"};
const DEFAULT_SCRIPT_URL="https://script.google.com/macros/s/AKfycbxKJdWbcC94dGXkLzngAq0JZ3Q6bfWTzLzS2QQVz7-CMh_1BMBHvgN_CIHWww8xmJTAvw/exec";
const STATE_KEY="wp_state_v3";
const RING_LEN=502.65;
const WHEEL_ROW_H=44;

function todayName(){const i=(new Date().getDay()+6)%7;return i<DAYS.length?DAYS[i]:DAYS[0]}
function localDateStr(d=new Date()){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`}
function cid(){return "x"+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function userKey(name){return encodeURIComponent((name||"").trim().toLocaleLowerCase("es"))}
function initials(name){return (name||"?").trim().split(/\s+/).map(x=>x[0]||"").join("").toUpperCase().slice(0,2)||"?"}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
function range(min,max,step){const a=[];for(let v=min;v<=max+1e-9;v+=step)a.push(Math.round(v*10)/10);return a}
const REPS_VALUES=range(0,40,1),PESO_VALUES=range(0,250,0.5);

function loadState(){
  const old=JSON.parse(localStorage.getItem(STATE_KEY)||"null");
  return Object.assign({theme:"dark",accentColors:{c1:"#00ff6a",c2:"#eaff00"},selectedDay:todayName(),currentUser:"",recentUsers:[],scriptUrl:DEFAULT_SCRIPT_URL,lastSync:null},old||{});
}
let state=loadState();
let routine={};
let doneMap={};
let exerciseIndex=0;
function saveState(){localStorage.setItem(STATE_KEY,JSON.stringify(state))}
function profileKey(){return `wp_profile_${userKey(state.currentUser)}`}
function routineKey(){return `wp_routine_${userKey(state.currentUser)}`}
function logsKey(){return `wp_logs_${userKey(state.currentUser)}`}
function doneKey(day=state.selectedDay,date=localDateStr()){return `wp_done_${userKey(state.currentUser)}_${day}_${date}`}
function dirtyKey(){return `wp_routine_dirty_${userKey(state.currentUser)}`}
function getProfile(){return JSON.parse(localStorage.getItem(profileKey())||"null")||{name:state.currentUser,photo:""}}
function saveProfile(p){localStorage.setItem(profileKey(),JSON.stringify(p))}
function loadLogs(){return JSON.parse(localStorage.getItem(logsKey())||"[]")}
function saveLogs(x){localStorage.setItem(logsKey(),JSON.stringify(x))}
function loadDone(){return JSON.parse(localStorage.getItem(doneKey())||"{}")}
function saveDone(){localStorage.setItem(doneKey(),JSON.stringify(doneMap))}
function markRoutineDirty(){localStorage.setItem(dirtyKey(),"1")}
function clearRoutineDirty(){localStorage.removeItem(dirtyKey())}
function routineIsDirty(){return localStorage.getItem(dirtyKey())==="1"}

function ex(nombre,series,reps,alFallo){return{id:cid(),nombre,series,reps:alFallo?12:reps,peso:0,alFallo:!!alFallo}}
function defaultRoutine(){
  const r={};DAYS.forEach(d=>r[d]=[]);
  r.Lunes=[ex("Press de banca con barra",4,10),ex("Aperturas en banco inclinado con mancuernas",3,12),ex("Press inclinado con mancuernas",4,10),ex("Curl de bíceps alterno martillo con mancuernas",4,8),ex("Curl de bíceps con barra Z",3,10),ex("Curl de bíceps con barra en supinación",3,10),ex("Crunch en máquina carga alta",3,null,true)];
  r.Martes=[ex("Dominadas",4,null,true),ex("Remo con barra",4,10),ex("Remo con mancuerna en banco inclinado",4,10),ex("Press francés",4,10),ex("Extensiones de tríceps en polea alta",3,8),ex("Fondos de tríceps",3,null,true)];
  r.Miércoles=[ex("Press Arnold",4,8),ex("Elevaciones laterales con mancuernas",4,12),ex("Pájaros sentado",3,10),ex("Encogimientos de hombros con barra",3,15),ex("Trapecios con polea baja",3,10),ex("Sentadillas con barra",4,12),ex("Extensiones de piernas",3,12),ex("Zancadas andando con mancuerna",3,20),ex("Femoral tumbado",3,10),ex("Peso muerto rumano con barra",4,10),ex("Gemelos en máquina sentado",3,15)];
  r.Jueves=[ex("Press de banca con mancuernas",4,12),ex("Cruces en poleas",4,10),ex("Press declinado con mancuernas",4,12),ex("Curl de bíceps sentado con mancuernas",4,8),ex("Curl de bíceps 21",3,8)];
  r.Viernes=[ex("Jalón al pecho",4,null,true),ex("Remo en polea baja y agarre supino",4,12),ex("Peso muerto",4,10),ex("Extensión vertical alterna con mancuerna",3,10),ex("Jalones con cuerda",3,8),ex("Flexiones de tríceps",3,null,true)];
  return r;
}
function loadRoutine(){
  let r=JSON.parse(localStorage.getItem(routineKey())||"null");
  if(!r){r=defaultRoutine();localStorage.setItem(routineKey(),JSON.stringify(r));markRoutineDirty()}
  DAYS.forEach(d=>{if(!Array.isArray(r[d]))r[d]=[]});
  return r;
}
function saveRoutine(){localStorage.setItem(routineKey(),JSON.stringify(routine));markRoutineDirty()}

function hexToRgb(hex){const h=hex.replace("#","");return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`}
function applyTheme(){
  document.documentElement.classList.toggle("light",state.theme==="light");
  document.querySelector('meta[name="theme-color"]').setAttribute("content",state.theme==="light"?"#f2f3ee":"#080a08");
  document.querySelectorAll(".theme-btn").forEach(b=>b.classList.toggle("active",b.dataset.theme===state.theme));
}
function applyAccent(){
  if(!state.accentColors)state.accentColors={c1:"#00ff6a",c2:"#eaff00"};
  const root=document.documentElement.style;
  root.setProperty("--g1",state.accentColors.c1);root.setProperty("--g2",state.accentColors.c2);
  root.setProperty("--g1-rgb",hexToRgb(state.accentColors.c1));root.setProperty("--g2-rgb",hexToRgb(state.accentColors.c2));
}

function showToast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");clearTimeout(showToast.t);showToast.t=setTimeout(()=>t.classList.remove("show"),1900)}
function formatLongDate(){return new Intl.DateTimeFormat("es-AR",{weekday:"short",day:"numeric",month:"short"}).format(new Date()).replace(".","")}
function greetingWord(){const h=new Date().getHours();return h<12?"Buen día":h<19?"Buenas tardes":"Buenas noches"}

function renderLogin(){
  const input=document.getElementById("loginName");
  input.value=state.currentUser||"";
  const cont=document.getElementById("recentUsers");cont.innerHTML="";
  (state.recentUsers||[]).slice(0,4).forEach(name=>{
    const b=document.createElement("button");b.className="recent-user";b.textContent=name;b.onclick=()=>enterUser(name);cont.appendChild(b);
  });
}
async function enterUser(raw){
  const name=String(raw||"").trim();if(!name){showToast("Ingresá un nombre");return}
  state.currentUser=name;
  state.recentUsers=[name,...(state.recentUsers||[]).filter(x=>x.toLocaleLowerCase("es")!==name.toLocaleLowerCase("es"))].slice(0,6);
  saveState();
  if(!localStorage.getItem(profileKey()))saveProfile({name,photo:""});
  routine=loadRoutine();doneMap=loadDone();
  document.getElementById("loginGate").classList.add("hidden");
  renderAll();
  pullRemoteRoutine(false);
}
function showLogin(){document.getElementById("loginGate").classList.remove("hidden");renderLogin();setTimeout(()=>document.getElementById("loginName").focus(),80)}
document.getElementById("loginBtn").onclick=()=>enterUser(document.getElementById("loginName").value);
document.getElementById("loginName").addEventListener("keydown",e=>{if(e.key==="Enter")enterUser(e.currentTarget.value)});

function renderProfile(){
  const p=getProfile();const photo=p.photo;
  document.getElementById("headerUserName").textContent=state.currentUser;
  document.getElementById("settingsUserName").textContent=state.currentUser;
  [document.getElementById("headerAvatar"),document.getElementById("settingsAvatar")].forEach(el=>{
    el.innerHTML=photo?`<img src="${photo}" alt="">`:escapeHtml(initials(state.currentUser));
  });
}
function renderGreeting(){
  document.getElementById("greetingKicker").textContent=greetingWord();
  document.getElementById("greetingTitle").textContent=state.currentUser.split(/\s+/)[0]+", a entrenar.";
  document.getElementById("greetingDate").textContent=formatLongDate();
}
function renderDays(){
  const a=document.getElementById("dayTabs"),b=document.getElementById("routineDayPicker");a.innerHTML="";b.innerHTML="";
  DAYS.forEach(d=>{
    const x=document.createElement("button");x.className="day-pill"+(d===state.selectedDay?" active":"");x.textContent=DAY_SHORT[d];x.onclick=()=>selectDay(d);a.appendChild(x);
    const y=document.createElement("button");y.className="day-mini"+(d===state.selectedDay?" active":"");y.textContent=DAY_SHORT[d];y.onclick=()=>selectDay(d);b.appendChild(y);
  });
}
function selectDay(d){state.selectedDay=d;saveState();doneMap=loadDone();renderDays();renderSummary();renderExercises();renderRoutineEditor()}
function targetLabel(e){const w=e.peso>0?` · ${e.peso} kg`:"";return e.alFallo?`${e.series} series al fallo${w}`:`${e.series} × ${e.reps} reps${w}`}
function completedSets(e){return Object.keys(doneMap[e.id]||{}).length}
function renderSummary(){
  const exs=routine[state.selectedDay]||[];const total=exs.reduce((a,e)=>a+e.series,0);const done=exs.reduce((a,e)=>a+Math.min(e.series,completedSets(e)),0);const pct=total?Math.round(done/total*100):0;
  document.getElementById("daySummary").innerHTML=`<div class="summary-top"><div><div class="summary-label">Plan del día</div><div class="summary-title">${state.selectedDay}</div><div class="summary-meta">${exs.length} ejercicios · ${done} de ${total} series completas</div></div><div class="summary-ring" style="--progress-angle:${pct*3.6}deg"><span>${pct}%</span></div></div><div class="summary-bar"><i style="width:${pct}%"></i></div>`;
}
function renderExercises(){
  const list=document.getElementById("exerciseList"),exs=routine[state.selectedDay]||[];document.getElementById("exerciseCount").textContent=`${exs.length} en total`;
  if(!exs.length){list.innerHTML=`<div class="empty-hint">Todavía no cargaste ejercicios para <b>${state.selectedDay}</b>.<br>Podés armarlos desde Ajustes → Mi rutina.</div>`;return}
  list.innerHTML="";
  exs.forEach((e,i)=>{
    const d=completedSets(e),complete=d>=e.series,row=document.createElement("div");row.className="exercise-row"+(complete?" complete":"");
    row.innerHTML=`<div class="exercise-index">${complete?"✓":String(i+1).padStart(2,"0")}</div><div class="er-main"><div class="er-name">${escapeHtml(e.nombre)}</div><div class="er-target">OBJETIVO · ${escapeHtml(targetLabel(e))}</div></div><div class="er-right"><div class="progress-chip ${complete?"done":""}">${d}/${e.series}</div><div class="chev">›</div></div>`;
    row.onclick=()=>openExercise(i);list.appendChild(row);
  });
  renderSummary();
}

function buildWheel(container,values,initial,fmt){
  container.innerHTML='<div style="height:44px"></div>'+values.map(v=>`<div class="wheel-item">${fmt(v)}</div>`).join("")+'<div style="height:44px"></div>';
  let idx=values.findIndex(v=>Math.abs(v-initial)<1e-6);if(idx<0)idx=0;container.scrollTop=idx*WHEEL_ROW_H;
  function active(){const raw=Math.round(container.scrollTop/WHEEL_ROW_H),i=Math.max(0,Math.min(values.length-1,raw));container.querySelectorAll(".wheel-item").forEach(x=>x.classList.remove("active"));const el=container.children[i+1];if(el)el.classList.add("active");return values[i]}
  active();let raf=false;container.onscroll=()=>{if(raf)return;raf=true;requestAnimationFrame(()=>{active();raf=false})};return{getValue:active};
}
function openExercise(i){exerciseIndex=i;document.getElementById("exerciseOverlay").classList.add("active");renderExerciseSheet()}
function closeExercise(){document.getElementById("exerciseOverlay").classList.remove("active")}
document.getElementById("sheetClose").onclick=closeExercise;
document.getElementById("exerciseOverlay").addEventListener("click",e=>{if(e.target===e.currentTarget)closeExercise()});
document.getElementById("prevExercise").onclick=()=>{const x=routine[state.selectedDay]||[];exerciseIndex=(exerciseIndex-1+x.length)%x.length;renderExerciseSheet()};
document.getElementById("nextExercise").onclick=()=>{const x=routine[state.selectedDay]||[];exerciseIndex=(exerciseIndex+1)%x.length;renderExerciseSheet()};

function renderExerciseSheet(){
  const exs=routine[state.selectedDay]||[];if(!exs.length){closeExercise();return}exerciseIndex=Math.max(0,Math.min(exerciseIndex,exs.length-1));const e=exs[exerciseIndex];const d=doneMap[e.id]||{};const n=Object.keys(d).length,complete=n>=e.series;
  document.getElementById("sheetCount").textContent=`Ejercicio ${exerciseIndex+1} de ${exs.length}`;document.getElementById("sheetName").textContent=e.nombre;
  const goalMain=e.alFallo?`${e.series} × <span>al fallo</span>`:`${e.series} × <span>${e.reps} reps</span>`;
  document.getElementById("goalCard").innerHTML=`<div class="goal-label">Objetivo</div><div class="goal-main">${goalMain}</div><div class="goal-sub">${e.peso>0?`Peso de referencia: ${e.peso} kg`:"Elegí reps y peso para cada serie"}</div><div class="goal-status"><div class="goal-progress"><b>${n}</b> de ${e.series} series registradas</div><button class="rest-bubble" id="inlineTimer"><svg viewBox="0 0 24 24" fill="none" stroke-width="2.2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg><span id="inlineTimerText">${formatTimer(timerRemaining)}</span></button></div>`;
  document.getElementById("inlineTimer").onclick=()=>openTimer(false);
  const area=document.getElementById("setArea");
  if(complete){area.innerHTML=`<div class="complete-card">✓ Ejercicio completo por hoy</div>`}
  else{
    const next=n+1;area.innerHTML=`<div class="set-card"><div class="set-head"><div class="set-badge">Serie ${next} de ${e.series}</div><div class="set-hint">Deslizá para ajustar</div></div><div class="wheels"><div class="wheel-col"><div class="wheel-label">Repeticiones</div><div class="wheel-wrap"><div class="wheel-scroll" id="repsWheel"></div><div class="wheel-highlight"></div></div></div><div class="wheel-col"><div class="wheel-label">Peso · kg</div><div class="wheel-wrap"><div class="wheel-scroll" id="pesoWheel"></div><div class="wheel-highlight"></div></div></div></div><button class="save-set" id="saveSet">Guardar serie</button></div>`;
    const rw=buildWheel(document.getElementById("repsWheel"),REPS_VALUES,e.reps||0,v=>String(v));const pw=buildWheel(document.getElementById("pesoWheel"),PESO_VALUES,e.peso||0,v=>v%1===0?String(v):v.toFixed(1));
    document.getElementById("saveSet").onclick=()=>markSetDone(e,next,rw.getValue(),pw.getValue());
  }
  renderTodayHistory(e);renderExerciseProgress(e);
}
function markSetDone(e,setNum,reps,peso){
  if(!doneMap[e.id])doneMap[e.id]={};doneMap[e.id][setNum]={reps,peso};saveDone();
  const logs=loadLogs();logs.push({id:cid(),ts:Date.now(),fecha:localDateStr(),usuario:state.currentUser,dia:state.selectedDay,exerciseId:e.id,ejercicio:e.nombre,set:setNum,reps,peso,synced:false});saveLogs(logs);
  renderExercises();renderExerciseSheet();openTimer(true);syncPending(false);
}
function renderTodayHistory(e){
  const c=document.getElementById("todayHistory"),d=doneMap[e.id]||{},keys=Object.keys(d).sort((a,b)=>+a-+b);
  c.innerHTML=`<div class="block-head"><h3>Hoy</h3><span>${keys.length}/${e.series} series</span></div>`+(keys.length?keys.map(k=>`<div class="today-set"><span>Serie ${k}</span><span><b>${d[k].reps} reps</b> · ${d[k].peso} kg</span></div>`).join(""):`<div class="progress-empty">Todavía no registraste series de este ejercicio hoy.</div>`);
}
