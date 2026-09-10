/* Rutina personalizada de la profe — septiembre 2026
   Esta plantilla reemplaza UNA VEZ las rutinas anteriores. Después, los usuarios
   pueden seguir editándola normalmente sin que sus cambios se vuelvan a pisar. */
(function(){
  const TEMPLATE_VERSION='profe-2026-09-10-v1';

  const rows={
    Lunes:[
      ['p2609-lun-01','Press plano',4,10,'10/12'],
      ['p2609-lun-02','Press inclinado en Smith',3,10,'10/12'],
      ['p2609-lun-03','Cruce de poleas altas',3,12,'12/15'],
      ['p2609-lun-04','Flexiones de pecho',3,20,'20'],
      ['p2609-lun-05','Vuelos laterales',3,12,'12'],
      ['p2609-lun-06','Vuelos frontales',3,10,'10'],
      ['p2609-lun-07','Convergente de hombro',3,12,'12']
    ],
    Martes:[
      ['p2609-mar-01','Sentadilla con barra',3,10,'10'],
      ['p2609-mar-02','Prensa 45',4,15,'15'],
      ['p2609-mar-03','Peso muerto rumano',3,10,'10/12'],
      ['p2609-mar-04','Subida al cajón unilateral',3,8,'8/8'],
      ['p2609-mar-05','Gemelos en polea',3,20,'20']
    ],
    Miércoles:[
      ['p2609-mie-01','Polea alta por delante',4,10,'10/12'],
      ['p2609-mie-02','Dominadas agarre cerrado',3,10,'10'],
      ['p2609-mie-03','Remo sentado',3,10,'10/12'],
      ['p2609-mie-04','Remo con barra',4,12,'12'],
      ['p2609-mie-05','Tríceps polea',4,12,'12/15'],
      ['p2609-mie-06','Tríceps press francés',3,12,'12'],
      ['p2609-mie-07','Face pull',3,12,'12'],
      ['p2609-mie-08','Pull over',4,15,'15']
    ],
    Jueves:[
      ['p2609-jue-01','Sillón de cuádriceps',4,12,'12'],
      ['p2609-jue-02','Sillón de isquiotibiales',4,10,'10'],
      ['p2609-jue-03','Sentadilla búlgara',3,8,'8/8'],
      ['p2609-jue-04','Abductores',3,15,'15'],
      ['p2609-jue-05','Prensa Hack',3,15,'15']
    ],
    Viernes:[
      ['p2609-vie-01','Press pecho Hammer',4,10,'10/12'],
      ['p2609-vie-02','Press inclinado con mancuerna',3,10,'10/12'],
      ['p2609-vie-03','Peck deck',3,12,'12/15'],
      ['p2609-vie-04','Cruce de poleas bajas',3,12,'12/15'],
      ['p2609-vie-05','Bíceps polea',4,12,'12/15'],
      ['p2609-vie-06','Bíceps Scott',3,8,'8/10'],
      ['p2609-vie-07','Bíceps barra en pronación',3,10,'10/12']
    ]
  };

  const metaById={};
  Object.values(rows).forEach(day=>day.forEach(x=>metaById[x[0]]={reps:x[2],repsLabel:x[4]}));

  function officialRoutine(){
    const r={_templateVersion:TEMPLATE_VERSION};
    Object.keys(rows).forEach(day=>{
      r[day]=rows[day].map(x=>({id:x[0],nombre:x[1],series:x[2],reps:x[3],repsLabel:x[4],peso:0,alFallo:false}));
    });
    return r;
  }

  function routineLooksOfficial(r){
    if(!r||typeof r!=='object')return false;
    let total=0,known=0;
    DAYS.forEach(day=>(Array.isArray(r[day])?r[day]:[]).forEach(ex=>{total++;if(metaById[ex.id])known++}));
    return total>0 && known>=Math.max(1,Math.floor(total*.75));
  }

  function hydrateRoutine(r){
    if(!r||typeof r!=='object')return r;
    r._templateVersion=TEMPLATE_VERSION;
    DAYS.forEach(day=>(Array.isArray(r[day])?r[day]:[]).forEach(ex=>{
      const meta=metaById[ex.id];if(meta){ex.repsLabel=meta.repsLabel;if(!Number.isFinite(Number(ex.reps)))ex.reps=meta.reps;}
    }));
    return r;
  }

  /* Nuevos usuarios reciben directamente esta rutina. */
  defaultRoutine=officialRoutine;

  /* Los rangos de la profe se muestran como tales; la rueda empieza en el primer valor. */
  targetLabel=function(e){
    const pesoTxt=e.peso>0?' · '+e.peso+' kg':'';
    const repsTxt=e.repsLabel||e.reps;
    return e.alFallo?`${e.series} series al fallo${pesoTxt}`:`${e.series} × ${repsTxt} reps${pesoTxt}`;
  };

  const baseRenderExerciseSheet=renderExerciseSheet;
  renderExerciseSheet=function(){
    baseRenderExerciseSheet();
    const exs=routine[state.selectedDay]||[],e=exs[exerciseIndex];
    if(!e||!e.repsLabel)return;
    const main=document.querySelector('#goalCard .goal-main');
    if(main)main.innerHTML=`${e.series} × <span>${escapeHtml(e.repsLabel)} reps</span>`;
  };

  const basePullRemoteRoutine=pullRemoteRoutine;
  pullRemoteRoutine=async function(showMessage){
    const result=await basePullRemoteRoutine(showMessage);
    if(!state.currentUser)return result;

    /* Si Sheets ya contiene esta plantilla (aunque el backend haya descartado
       repsLabel/_templateVersion), rehidratamos esos metadatos localmente. */
    if(routineLooksOfficial(routine)){
      hydrateRoutine(routine);
      localStorage.setItem(routineKey(),JSON.stringify(routine));
      return result;
    }

    /* Rutina anterior detectada: reemplazo intencional pedido por el usuario. */
    routine=officialRoutine();
    localStorage.setItem(routineKey(),JSON.stringify(routine));
    markRoutineDirty();
    doneMap=loadDone();
    renderAll();
    showToast('Nueva rutina cargada');

    /* Empuja la nueva plantilla a Sheets. syncPending luego vuelve a leerla;
       routineLooksOfficial evita cualquier bucle aunque Sheets no guarde metadata. */
    await syncPending(false);
    return result;
  };

  /* Si la rutina local actual ya es la nueva, aseguramos que conserve los rangos. */
  if(state.currentUser && routineLooksOfficial(routine)){
    hydrateRoutine(routine);
    localStorage.setItem(routineKey(),JSON.stringify(routine));
  }
})();
