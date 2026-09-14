/* Workout Planner v5 — historial como fuente de verdad + edición/borrado seguro */
(function(){
  const DELETE_KEY_PREFIX='wp_deleted_logs_';
  let editingLogId='';

  function deletedKey(){return DELETE_KEY_PREFIX+userKey(state.currentUser)}
  function getDeletedIds(){try{return JSON.parse(localStorage.getItem(deletedKey())||'[]').map(String)}catch{return []}}
  function setDeletedIds(ids){localStorage.setItem(deletedKey(),JSON.stringify([...new Set(ids.map(String))]))}
  function queueDeletedId(id){if(!id)return;setDeletedIds([...getDeletedIds(),String(id)])}

  function currentExerciseIds(){return new Set((routine[state.selectedDay]||[]).map(e=>String(e.id||''))) }
  function logBelongsToExercise(log,e){
    if(String(log.exerciseId||'')===String(e.id||''))return true;
    return !log.exerciseId && String(log.ejercicio||'')===String(e.nombre||'');
  }
  function currentDayLogs(){
    const allowed=currentExerciseIds(),deleted=new Set(getDeletedIds());
    return loadLogs().filter(l=>
      l.fecha===localDateStr() && l.dia===state.selectedDay && !deleted.has(String(l.id||'')) &&
      ((!l.exerciseId && (routine[state.selectedDay]||[]).some(e=>e.nombre===l.ejercicio)) || allowed.has(String(l.exerciseId||'')))
    );
  }
  function canonicalLogsForExercise(e){
    const bySet=new Map();
    currentDayLogs().filter(l=>logBelongsToExercise(l,e)).forEach(l=>{
      const setNum=Number(l.set)||0;if(!setNum)return;
      const prev=bySet.get(setNum);
      if(!prev || (Number(l.ts)||0)>=(Number(prev.ts)||0))bySet.set(setNum,l);
    });
    return [...bySet.values()].sort((a,b)=>(Number(a.set)||0)-(Number(b.set)||0));
  }
  function firstMissingSet(e){
    const used=new Set(canonicalLogsForExercise(e).map(l=>Number(l.set)||0));
    for(let i=1;i<=Number(e.series||0);i++)if(!used.has(i))return i;
    return Number(e.series||0)+1;
  }

  /* El historial pasa a ser la fuente de verdad. Sólo se usan ejercicios de la rutina actual. */
  rebuildTodayDoneFromLogs=function(){
    const map={};
    (routine[state.selectedDay]||[]).forEach(e=>{
      const rows=canonicalLogsForExercise(e);if(!rows.length)return;
      map[e.id]={};rows.forEach(l=>map[e.id][Number(l.set)]={reps:Number(l.reps)||0,peso:Number(l.peso)||0,logId:l.id||''});
    });
    doneMap=map;saveDone();
  };

  completedSets=function(e){return canonicalLogsForExercise(e).filter(l=>Number(l.set)<=Number(e.series||0)).length};

  function injectV5UI(){
    if(document.getElementById('editSetOverlay'))return;
    document.querySelector('.app-shell').insertAdjacentHTML('beforeend',`
      <div class="v4-overlay" id="editSetOverlay">
        <div class="v4-dialog edit-set-dialog">
          <button class="v4-close" id="editSetClose">×</button>
          <div class="v4-kicker">Corregir registro</div>
          <div class="v4-title" id="editSetTitle">Editar serie</div>
          <div class="edit-set-grid">
            <label><span>Repeticiones</span><input id="editSetReps" type="number" inputmode="numeric" min="0" max="999" step="1"></label>
            <label><span>Peso · kg</span><input id="editSetPeso" type="number" inputmode="decimal" min="0" max="999" step="0.1"></label>
          </div>
          <button class="v4-primary" id="editSetSave">Guardar cambios</button>
          <button class="v5-delete" id="editSetDelete">Eliminar esta serie</button>
          <div class="v4-note">Los cambios quedan locales al instante y se sincronizan con Sheets.</div>
        </div>
      </div>
    `);
    document.getElementById('editSetClose').onclick=closeEditSet;
    document.getElementById('editSetOverlay').addEventListener('click',e=>{if(e.target===e.currentTarget)closeEditSet()});
    document.getElementById('editSetSave').onclick=saveEditedSet;
    document.getElementById('editSetDelete').onclick=deleteEditedSet;
  }
  function openEditSet(id){
    injectV5UI();const log=loadLogs().find(x=>String(x.id)===String(id));if(!log)return;
    editingLogId=String(id);
    document.getElementById('editSetTitle').textContent=`Serie ${log.set}`;
    document.getElementById('editSetReps').value=Number(log.reps)||0;
    document.getElementById('editSetPeso').value=Number(log.peso)||0;
    document.getElementById('editSetOverlay').classList.add('active');
  }
  function closeEditSet(){document.getElementById('editSetOverlay')?.classList.remove('active');editingLogId=''}
  function saveEditedSet(){
    if(!editingLogId)return;
    const reps=Math.max(0,Math.round(Number(document.getElementById('editSetReps').value)||0));
    const peso=Math.max(0,Math.round((Number(document.getElementById('editSetPeso').value)||0)*10)/10);
    const logs=loadLogs(),log=logs.find(x=>String(x.id)===editingLogId);if(!log)return closeEditSet();
    log.reps=reps;log.peso=peso;log.ts=Date.now();log.synced=false;saveLogs(logs);
    closeEditSet();rebuildTodayDoneFromLogs();renderExercises();renderExerciseSheet();syncPending(false);showToast('Serie corregida');
  }
  function deleteEditedSet(){
    if(!editingLogId)return;
    const id=editingLogId;
    if(!confirm('¿Eliminar esta serie?'))return;
    saveLogs(loadLogs().filter(x=>String(x.id)!==id));queueDeletedId(id);
    closeEditSet();rebuildTodayDoneFromLogs();renderExercises();renderExerciseSheet();syncPending(false);showToast('Serie eliminada');
  }

  renderTodayHistory=function(e){
    const c=document.getElementById('todayHistory'),rows=canonicalLogsForExercise(e);
    c.innerHTML=`<div class="block-head"><h3>Hoy</h3><span>${rows.length}/${e.series} series</span></div>`+
      (rows.length?rows.map(l=>`<div class="today-set v5-today-set"><span>Serie ${Number(l.set)||0}</span><span class="today-set-data"><b>${Number(l.reps)||0} reps</b> · ${Number(l.peso)||0} kg</span><button class="set-edit-btn" type="button" data-log-id="${escapeHtml(l.id||'')}">Editar</button></div>`).join(''):`<div class="progress-empty">Todavía no registraste series de este ejercicio hoy.</div>`);
    c.querySelectorAll('.set-edit-btn').forEach(b=>b.onclick=()=>openEditSet(b.dataset.logId));
  };

  /* Render del ejercicio sin depender del índice para el guardado. */
  renderExerciseSheet=function(){
    const exs=routine[state.selectedDay]||[];if(!exs.length){closeExercise();return}
    exerciseIndex=Math.max(0,Math.min(exerciseIndex,exs.length-1));
    const e=exs[exerciseIndex],rows=canonicalLogsForExercise(e),n=rows.length,complete=n>=Number(e.series||0);
    document.getElementById('sheetCount').textContent=`Ejercicio ${exerciseIndex+1} de ${exs.length}`;
    document.getElementById('sheetName').textContent=e.nombre;
    const repsGoal=e.repsLabel||e.reps;
    const goalMain=e.alFallo?`${e.series} × <span>al fallo</span>`:`${e.series} × <span>${escapeHtml(repsGoal)} reps</span>`;
    document.getElementById('goalCard').innerHTML=`<div class="goal-label">Objetivo</div><div class="goal-main">${goalMain}</div><div class="goal-sub">${e.peso>0?`Peso de referencia: ${e.peso} kg`:'Elegí reps y peso para cada serie'}</div><div class="goal-status"><div class="goal-progress"><b>${n}</b> de ${e.series} series registradas</div><button class="rest-bubble" id="inlineTimer"><svg viewBox="0 0 24 24" fill="none" stroke-width="2.2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg><span id="inlineTimerText">${formatTimer(timerRemaining)}</span></button></div>`;
    document.getElementById('inlineTimer').onclick=()=>openTimer(false);

    const area=document.getElementById('setArea');
    if(complete){area.innerHTML=`<div class="complete-card">✓ Ejercicio completo por hoy</div>`}
    else{
      const next=firstMissingSet(e),last=matchingLogs(e).filter(l=>!new Set(getDeletedIds()).has(String(l.id||'')))[0];
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
  };

  markSetDone=function(e,setNum,reps,peso){
    ensureSessionStart();
    const logs=loadLogs();
    const existing=logs.filter(l=>l.fecha===localDateStr()&&l.dia===state.selectedDay&&logBelongsToExercise(l,e)&&Number(l.set)===Number(setNum)).sort((a,b)=>(Number(b.ts)||0)-(Number(a.ts)||0))[0];
    if(existing){existing.reps=Number(reps)||0;existing.peso=Number(peso)||0;existing.ts=Date.now();existing.synced=false}
    else logs.push({id:cid(),ts:Date.now(),fecha:localDateStr(),usuario:state.currentUser,dia:state.selectedDay,exerciseId:e.id,ejercicio:e.nombre,set:Number(setNum),reps:Number(reps)||0,peso:Number(peso)||0,synced:false});
    saveLogs(logs);rebuildTodayDoneFromLogs();
    const finished=dayIsComplete();renderExercises();renderExerciseSheet();syncPending(false);
    if(finished){closeExercise();closeTimer();openCompletionSummary()}else openTimer(true);
  };

  dayIsComplete=function(){
    const exs=routine[state.selectedDay]||[];return exs.length>0&&exs.every(e=>completedSets(e)>=Number(e.series||0));
  };

  function mergeRemoteLogsV5(remote){
    if(!Array.isArray(remote))return false;
    const deleted=new Set(getDeletedIds()),local=loadLogs(),map=new Map();
    local.forEach(x=>{if(!deleted.has(String(x.id||'')))map.set(remoteLogKey(x),x)});
    remote.forEach(r=>{
      const n=normalizeRemoteLog(r);if(deleted.has(String(n.id||'')))return;
      const k=remoteLogKey(n),old=map.get(k);
      if(old && old.synced===false)return; // nunca pisar una edición local pendiente
      map.set(k,old?Object.assign(old,n,{synced:true}):n);
    });
    saveLogs([...map.values()].sort((a,b)=>(Number(a.ts)||0)-(Number(b.ts)||0)));return remote.length>0;
  }
  mergeRemoteLogs=mergeRemoteLogsV5;

  const basePull=pullRemoteRoutine;
  pullRemoteRoutine=async function(showMessage){
    const result=await basePull(showMessage);
    rebuildTodayDoneFromLogs();renderExercises();
    return result;
  };

  /* Sync v5: upserts + cola de borrados. Los IDs borrados se mantienen como tombstones
     hasta que una lectura remota confirme que ya no existen. */
  syncPending=async function(manual){
    if(!state.currentUser)return;const url=(state.scriptUrl||DEFAULT_SCRIPT_URL).trim();if(!url){if(manual)showToast('Falta la URL del Apps Script');return}
    const logs=loadLogs(),rows=logs.filter(x=>!x.synced),deletedIds=getDeletedIds();
    if(!rows.length&&!routineIsDirty()&&!deletedIds.length){if(manual){await pullRemoteRoutine(false);showToast('Todo está sincronizado');renderSyncStatus()}return}
    const payload={action:'sync',version:5,user:state.currentUser,updatedAt:new Date().toISOString(),rows,deletedIds,routine,profile:{name:state.currentUser},selectedDay:state.selectedDay};
    try{
      await fetch(url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});
      if(rows.length){const ids=new Set(rows.map(x=>String(x.id)));logs.forEach(x=>{if(ids.has(String(x.id)))x.synced=true});saveLogs(logs)}
      clearRoutineDirty();state.lastSync=Date.now();saveState();
      try{
        const sep=url.includes('?')?'&':'?';const res=await fetch(`${url}${sep}action=load&user=${encodeURIComponent(state.currentUser)}`);if(res.ok){const data=await res.json();if(data?.ok){
          const remoteIds=new Set((data.logs||[]).map(x=>String(x.id||'')));setDeletedIds(getDeletedIds().filter(id=>remoteIds.has(String(id))));
          if(data.routine&&typeof data.routine==='object'&&!routineIsDirty()){routine=data.routine;DAYS.forEach(d=>{if(!Array.isArray(routine[d]))routine[d]=[]});localStorage.setItem(routineKey(),JSON.stringify(routine))}
          mergeRemoteLogsV5(data.logs||[]);rebuildTodayDoneFromLogs();renderAll();
        }}
      }catch(err){console.debug('Confirmación remota pendiente',err)}
      renderSyncStatus();if(manual)showToast('Sincronización completa');
    }catch(err){console.error(err);if(manual)showToast('No se pudo sincronizar')}
  };

  const oldRenderSyncStatus=renderSyncStatus;
  renderSyncStatus=function(){
    oldRenderSyncStatus();const el=document.getElementById('syncStatus'),n=getDeletedIds().length;if(el&&n)el.innerHTML+=`<br>Eliminaciones pendientes: <b>${n}</b>`;
  };

  injectV5UI();
  if(state.currentUser){rebuildTodayDoneFromLogs();renderExercises();}
})();
