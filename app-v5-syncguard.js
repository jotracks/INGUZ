/* v5 sync guard — confirma escrituras antes de marcar cambios como sincronizados */
(function(){
  function delKey(){return 'wp_deleted_logs_'+userKey(state.currentUser)}
  function deletedIds(){try{return JSON.parse(localStorage.getItem(delKey())||'[]').map(String)}catch{return []}}
  function saveDeleted(ids){localStorage.setItem(delKey(),JSON.stringify([...new Set(ids.map(String))]))}
  function sameLog(a,b){
    return String(a.id||'')===String(b.id||'') &&
      String(a.dia||'')===String(b.dia||'') &&
      String(a.exerciseId||'')===String(b.exerciseId||'') &&
      Number(a.set||0)===Number(b.set||0) &&
      Number(a.reps||0)===Number(b.reps||0) &&
      Math.abs(Number(a.peso||0)-Number(b.peso||0))<0.001;
  }

  syncPending=async function(manual){
    if(!state.currentUser)return;
    const url=(state.scriptUrl||DEFAULT_SCRIPT_URL).trim();
    if(!url){if(manual)showToast('Falta la URL del Apps Script');return}

    let logs=loadLogs();
    const pending=logs.filter(x=>!x.synced),deleted=deletedIds(),dirty=routineIsDirty();
    if(!pending.length&&!deleted.length&&!dirty){
      if(manual){await pullRemoteRoutine(false);showToast('Todo está sincronizado');renderSyncStatus()}
      return;
    }

    const payload={action:'sync',version:5,user:state.currentUser,updatedAt:new Date().toISOString(),rows:pending,deletedIds:deleted,routine,profile:{name:state.currentUser},selectedDay:state.selectedDay};
    try{
      await fetch(url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});

      const sep=url.includes('?')?'&':'?';
      const res=await fetch(`${url}${sep}action=load&user=${encodeURIComponent(state.currentUser)}`,{method:'GET'});
      if(!res.ok)throw new Error('remote_read_failed');
      const data=await res.json();
      if(!data?.ok)throw new Error(data?.error||'remote_invalid');

      const remoteLogs=Array.isArray(data.logs)?data.logs:[];
      const remoteById=new Map(remoteLogs.map(x=>[String(x.id||''),x]));

      logs=loadLogs();
      logs.forEach(local=>{
        if(local.synced!==false)return;
        const remote=remoteById.get(String(local.id||''));
        if(remote&&sameLog(local,remote))local.synced=true;
      });
      saveLogs(logs);

      /* Un borrado sólo se da por confirmado cuando el ID ya no vuelve desde Sheets. */
      saveDeleted(deletedIds().filter(id=>remoteById.has(String(id))));

      /* La rutina se envía, pero conservamos la copia local con repsLabel y metadata visual. */
      if(dirty&&data.routine&&typeof data.routine==='object')clearRoutineDirty();

      mergeRemoteLogs(remoteLogs);
      rebuildTodayDoneFromLogs();
      state.lastSync=Date.now();saveState();renderAll();renderSyncStatus();

      const stillPending=loadLogs().some(x=>x.synced===false)||deletedIds().length>0;
      if(manual)showToast(stillPending?'Hay cambios pendientes del backend':'Sincronización completa');
    }catch(err){
      console.debug('Sync pendiente',err);
      renderSyncStatus();
      if(manual)showToast('Guardado local; sincronización pendiente');
    }
  };
})();
