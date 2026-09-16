/* Workout Planner v6 — Nutrición + perfil corporal + sesiones preparadas para smartwatch */
(function(){
  const BODY_PREFIX='wp_body_v6_';
  const NUTRITION_PREFIX='wp_nutrition_v6_';
  const FAVORITES_PREFIX='wp_food_favorites_v6_';
  const NUTRITION_DIRTY_PREFIX='wp_nutrition_dirty_v6_';
  const SESSIONS_PREFIX='wp_sessions_v6_';
  const SKIP_ONBOARDING_PREFIX='wp_body_onboarding_skip_v6_';
  const MEALS=['Desayuno','Almuerzo','Merienda','Cena','Otros'];
  let editingFoodId='';

  function key(prefix){return prefix+userKey(state.currentUser)}
  function readJSON(k,fallback){try{return JSON.parse(localStorage.getItem(k)||'null')??fallback}catch{return fallback}}
  function bodyProfile(){return readJSON(key(BODY_PREFIX),null)}
  function saveBodyProfile(p){p.updatedAt=Date.now();localStorage.setItem(key(BODY_PREFIX),JSON.stringify(p));markNutritionDirty()}
  function nutritionEntries(){return readJSON(key(NUTRITION_PREFIX),[])}
  function saveNutritionEntries(v){localStorage.setItem(key(NUTRITION_PREFIX),JSON.stringify(v));markNutritionDirty()}
  function foodFavorites(){return readJSON(key(FAVORITES_PREFIX),[])}
  function saveFoodFavorites(v){localStorage.setItem(key(FAVORITES_PREFIX),JSON.stringify(v));markNutritionDirty()}
  function workoutSessions(){return readJSON(key(SESSIONS_PREFIX),[])}
  function saveWorkoutSessions(v){localStorage.setItem(key(SESSIONS_PREFIX),JSON.stringify(v));markNutritionDirty()}
  function markNutritionDirty(){if(state.currentUser)localStorage.setItem(key(NUTRITION_DIRTY_PREFIX),'1')}
  function clearNutritionDirty(){if(state.currentUser)localStorage.removeItem(key(NUTRITION_DIRTY_PREFIX))}
  function nutritionIsDirty(){return !!state.currentUser&&localStorage.getItem(key(NUTRITION_DIRTY_PREFIX))==='1'}

  function calculateTargets(data){
    const w=Math.max(1,Number(data.weight)||0),h=Math.max(1,Number(data.height)||0),age=Math.max(1,Number(data.age)||0);
    if(!w||!h||!age)return null;
    const sex=data.calcSex==='f'?'f':'m';
    const bmr=10*w+6.25*h-5*age+(sex==='f'?-161:5);
    const mult={sedentary:1.2,light:1.375,moderate:1.55,high:1.725,veryHigh:1.9}[data.activity]||1.55;
    const goalFactor={lose:.90,maintain:1,gain:1.10}[data.goal]||1;
    const kcal=Math.max(1200,Math.round((bmr*mult*goalFactor)/10)*10);
    const protein=Math.round(w*1.8);
    const fat=Math.round(w*.8);
    const carbs=Math.max(0,Math.round((kcal-protein*4-fat*9)/4));
    return {kcal,protein,carbs,fat,fiber:25,bmr:Math.round(bmr),tdee:Math.round(bmr*mult)};
  }

  function injectNavigation(){
    const header=document.querySelector('.app-header');
    if(header&&!document.getElementById('settingsGear')){
      const profile=document.getElementById('profileButton');
      const wrap=document.createElement('div');wrap.className='header-actions';
      header.insertBefore(wrap,profile);wrap.appendChild(profile);
      const gear=document.createElement('button');gear.id='settingsGear';gear.className='settings-gear';gear.setAttribute('aria-label','Ajustes');
      gear.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.97 19.36a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15 1.7 1.7 0 0 0 3.04 14H3v-4h.08A1.7 1.7 0 0 0 4.64 8.97a1.7 1.7 0 0 0-.34-1.88l-.06-.06L7.07 4.2l.06.06A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3.04V3h4v.08A1.7 1.7 0 0 0 15.03 4.64a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.15.62.57 1.15 1.16 1.41.2.09.42.14.64.14H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z"/></svg>';
      gear.onclick=()=>switchView('ajustes');wrap.appendChild(gear);
    }
    const nav=document.querySelector('.bottomnav');
    if(nav&&!document.querySelector('.nav-item[data-view="alimentacion"]')){
      nav.innerHTML=`
        <button class="nav-item active" data-view="rutina"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6M20 9v6M7 7v10M17 7v10M7 12h10M2 10v4M22 10v4"/></svg>Rutina<span class="nav-indicator"></span></button>
        <button class="nav-item" data-view="alimentacion"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V12M12 12C7 12 4 9 4 5c5 0 8 2 8 7ZM12 15c1-5 4-8 8-9 0 5-3 8-8 9Z"/></svg>Alimentación<span class="nav-indicator"></span></button>`;
      nav.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
    }
  }

  function injectNutritionView(){
    if(document.getElementById('view-alimentacion'))return;
    const settings=document.getElementById('view-ajustes');
    const section=document.createElement('section');section.className='view';section.id='view-alimentacion';
    section.innerHTML=`
      <div class="nutrition-heading"><div><div class="greeting-kicker">Plan diario</div><div class="page-title nutrition-page-title">Alimentación</div></div><div class="greeting-date" id="nutritionDate"></div></div>
      <div id="nutritionGoal"></div>
      <div class="nutrition-section-head"><h2>Macros de hoy</h2><button class="nutrition-link" id="editNutritionGoals">Objetivos</button></div>
      <div class="macro-grid" id="macroGrid"></div>
      <div id="favoriteFoods"></div>
      <div class="nutrition-section-head"><h2>Comidas</h2><button class="nutrition-add-main" id="addFoodMain">+ Agregar</button></div>
      <div id="nutritionMeals"></div>
      <div class="nutrition-section-head glossary-head"><h2>Aprender</h2><span>Guía rápida</span></div>
      <div class="glossary-grid" id="nutritionGlossary"></div>
      <div class="nutrition-disclaimer">Las metas son estimaciones orientativas para organizarte. Si necesitás un plan clínico o tenés una condición médica, conviene definirlo con un profesional de nutrición.</div>`;
    settings.parentNode.insertBefore(section,settings);
    document.getElementById('addFoodMain').onclick=()=>openFoodEditor(null,'Almuerzo');
    document.getElementById('editNutritionGoals').onclick=()=>switchView('ajustes');
  }

  function injectBodySettings(){
    if(document.getElementById('bodySettingsCard'))return;
    const profileCard=document.getElementById('settingsUserName')?.closest('.settings-card');if(!profileCard)return;
    const card=document.createElement('div');card.className='settings-card';card.id='bodySettingsCard';
    card.innerHTML=`<h3>Datos corporales y nutrición</h3>
      <div class="body-settings-grid">
        <label><span>Peso · kg</span><input class="input" id="bodyWeight" type="number" inputmode="decimal" min="30" max="300" step="0.1"></label>
        <label><span>Altura · cm</span><input class="input" id="bodyHeight" type="number" inputmode="numeric" min="120" max="230" step="1"></label>
        <label><span>Edad</span><input class="input" id="bodyAge" type="number" inputmode="numeric" min="16" max="100" step="1"></label>
        <label><span>Para cálculo</span><select class="input" id="bodySex"><option value="m">Masculino</option><option value="f">Femenino</option></select></label>
      </div>
      <label class="settings-field"><span>Actividad habitual</span><select class="input" id="bodyActivity"><option value="sedentary">Baja / mayormente sentado</option><option value="light">Ligera · 1–3 días</option><option value="moderate">Moderada · 3–5 días</option><option value="high">Alta · 6–7 días</option><option value="veryHigh">Muy alta / trabajo físico</option></select></label>
      <label class="settings-field"><span>Objetivo</span><select class="input" id="bodyGoal"><option value="lose">Bajar grasa</option><option value="maintain">Mantener</option><option value="gain">Ganar masa</option></select></label>
      <button class="btn btn-full" id="recalculateTargets">Calcular objetivos sugeridos</button>
      <div class="target-settings-grid">
        <label><span>Calorías</span><input class="input" id="targetKcal" type="number" min="0" step="10"></label>
        <label><span>Proteína · g</span><input class="input" id="targetProtein" type="number" min="0" step="1"></label>
        <label><span>Carbos · g</span><input class="input" id="targetCarbs" type="number" min="0" step="1"></label>
        <label><span>Grasas · g</span><input class="input" id="targetFat" type="number" min="0" step="1"></label>
      </div>
      <button class="btn btn-primary btn-full" id="saveBodySettings">Guardar datos</button>
      <div class="settings-help">La calculadora usa una estimación de metabolismo + actividad. Podés modificar los objetivos manualmente después de calcularlos.</div>
      <div class="future-device"><span class="future-device-icon">⌚</span><div><b>Dispositivos conectados</b><small>Preparado para integrar entrenamientos de smartwatch más adelante.</small></div><span class="future-badge">Próximamente</span></div>`;
    profileCard.insertAdjacentElement('afterend',card);
    document.getElementById('recalculateTargets').onclick=recalculateSettingsTargets;
    document.getElementById('saveBodySettings').onclick=saveBodySettingsFromForm;
  }

  function injectFoodModal(){
    if(document.getElementById('foodEditorOverlay'))return;
    document.querySelector('.app-shell').insertAdjacentHTML('beforeend',`
      <div class="v4-overlay" id="foodEditorOverlay"><div class="v4-dialog food-dialog">
        <button class="v4-close" id="foodEditorClose">×</button><div class="v4-kicker">Registro diario</div><div class="v4-title" id="foodEditorTitle">Agregar comida</div>
        <label class="food-field"><span>Momento</span><select id="foodMeal">${MEALS.map(x=>`<option>${x}</option>`).join('')}</select></label>
        <label class="food-field"><span>Alimento / comida</span><input id="foodName" placeholder="Ej. Pollo con arroz"></label>
        <label class="food-field"><span>Cantidad o porción</span><input id="foodQuantity" placeholder="Ej. 250 g, 1 plato, 2 unidades"></label>
        <div class="food-macro-inputs"><label><span>kcal</span><input id="foodKcal" type="number" inputmode="numeric" min="0"></label><label><span>Proteína · g</span><input id="foodProtein" type="number" inputmode="decimal" min="0" step="0.1"></label><label><span>Carbos · g</span><input id="foodCarbs" type="number" inputmode="decimal" min="0" step="0.1"></label><label><span>Grasas · g</span><input id="foodFat" type="number" inputmode="decimal" min="0" step="0.1"></label><label><span>Fibra · g</span><input id="foodFiber" type="number" inputmode="decimal" min="0" step="0.1"></label></div>
        <label class="favorite-check"><input type="checkbox" id="foodFavorite"> Guardar esta porción como favorito</label>
        <button class="v4-primary" id="foodEditorSave">Guardar</button><button class="food-delete" id="foodEditorDelete">Eliminar registro</button>
        <div class="v4-note">Podés copiar los valores de la etiqueta del alimento. No hace falta completar fibra si no la conocés.</div>
      </div></div>`);
    document.getElementById('foodEditorClose').onclick=closeFoodEditor;
    document.getElementById('foodEditorOverlay').addEventListener('click',e=>{if(e.target===e.currentTarget)closeFoodEditor()});
    document.getElementById('foodEditorSave').onclick=saveFoodEditor;
    document.getElementById('foodEditorDelete').onclick=deleteFoodEditor;
  }

  function injectOnboarding(){
    if(document.getElementById('bodyOnboardingOverlay'))return;
    document.querySelector('.app-shell').insertAdjacentHTML('beforeend',`
      <div class="v4-overlay onboarding-overlay" id="bodyOnboardingOverlay"><div class="v4-dialog onboarding-dialog">
        <div class="v4-kicker">Una sola vez</div><div class="v4-title">Armemos tu objetivo</div><p class="onboarding-copy">Estos datos sirven para estimar calorías y macros. Después podés cambiarlos desde ⚙️ Ajustes.</p>
        <div class="body-settings-grid"><label><span>Peso · kg</span><input id="obWeight" type="number" inputmode="decimal" step="0.1"></label><label><span>Altura · cm</span><input id="obHeight" type="number" inputmode="numeric"></label><label><span>Edad</span><input id="obAge" type="number" inputmode="numeric"></label><label><span>Para cálculo</span><select id="obSex"><option value="m">Masculino</option><option value="f">Femenino</option></select></label></div>
        <label class="food-field"><span>Actividad habitual</span><select id="obActivity"><option value="sedentary">Baja / mayormente sentado</option><option value="light">Ligera · 1–3 días</option><option value="moderate" selected>Moderada · 3–5 días</option><option value="high">Alta · 6–7 días</option><option value="veryHigh">Muy alta / trabajo físico</option></select></label>
        <label class="food-field"><span>Objetivo</span><select id="obGoal"><option value="lose">Bajar grasa</option><option value="maintain" selected>Mantener</option><option value="gain">Ganar masa</option></select></label>
        <button class="v4-primary" id="saveOnboarding">Calcular y continuar</button><button class="v4-secondary" id="skipOnboarding">Configurar después</button>
        <div class="v4-note">Es una referencia inicial, no un diagnóstico ni una dieta cerrada.</div>
      </div></div>`);
    document.getElementById('saveOnboarding').onclick=saveOnboarding;
    document.getElementById('skipOnboarding').onclick=()=>{localStorage.setItem(key(SKIP_ONBOARDING_PREFIX),'1');closeOnboarding()};
  }

  function renderBodySettings(){
    injectBodySettings();const p=bodyProfile()||{};
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v??''};
    set('bodyWeight',p.weight);set('bodyHeight',p.height);set('bodyAge',p.age);set('bodySex',p.calcSex||'m');set('bodyActivity',p.activity||'moderate');set('bodyGoal',p.goal||'maintain');
    set('targetKcal',p.targets?.kcal);set('targetProtein',p.targets?.protein);set('targetCarbs',p.targets?.carbs);set('targetFat',p.targets?.fat);
  }
  function settingsBodyData(){return {weight:Number(document.getElementById('bodyWeight').value)||0,height:Number(document.getElementById('bodyHeight').value)||0,age:Number(document.getElementById('bodyAge').value)||0,calcSex:document.getElementById('bodySex').value,activity:document.getElementById('bodyActivity').value,goal:document.getElementById('bodyGoal').value}}
  function recalculateSettingsTargets(){const calc=calculateTargets(settingsBodyData());if(!calc){showToast('Completá peso, altura y edad');return}document.getElementById('targetKcal').value=calc.kcal;document.getElementById('targetProtein').value=calc.protein;document.getElementById('targetCarbs').value=calc.carbs;document.getElementById('targetFat').value=calc.fat;showToast('Objetivos calculados')}
  function saveBodySettingsFromForm(){
    const data=settingsBodyData();if(!data.weight||!data.height||!data.age){showToast('Completá peso, altura y edad');return}
    const fallback=calculateTargets(data)||{};data.targets={kcal:Number(document.getElementById('targetKcal').value)||fallback.kcal||0,protein:Number(document.getElementById('targetProtein').value)||fallback.protein||0,carbs:Number(document.getElementById('targetCarbs').value)||fallback.carbs||0,fat:Number(document.getElementById('targetFat').value)||fallback.fat||0,fiber:bodyProfile()?.targets?.fiber||fallback.fiber||25};data.calculation={bmr:fallback.bmr||0,tdee:fallback.tdee||0};saveBodyProfile(data);renderNutrition();syncPending(false);showToast('Datos guardados')
  }

  function maybeShowOnboarding(){if(!state.currentUser||bodyProfile()||localStorage.getItem(key(SKIP_ONBOARDING_PREFIX)))return;injectOnboarding();document.getElementById('bodyOnboardingOverlay').classList.add('active')}
  function closeOnboarding(){document.getElementById('bodyOnboardingOverlay')?.classList.remove('active')}
  function saveOnboarding(){
    const data={weight:Number(document.getElementById('obWeight').value)||0,height:Number(document.getElementById('obHeight').value)||0,age:Number(document.getElementById('obAge').value)||0,calcSex:document.getElementById('obSex').value,activity:document.getElementById('obActivity').value,goal:document.getElementById('obGoal').value};
    const targets=calculateTargets(data);if(!targets){showToast('Completá peso, altura y edad');return}data.targets={kcal:targets.kcal,protein:targets.protein,carbs:targets.carbs,fat:targets.fat,fiber:targets.fiber};data.calculation={bmr:targets.bmr,tdee:targets.tdee};saveBodyProfile(data);closeOnboarding();renderBodySettings();renderNutrition();syncPending(false);showToast('Objetivo inicial listo')
  }

  function todayNutrition(){return nutritionEntries().filter(x=>x.date===localDateStr()).sort((a,b)=>(Number(a.ts)||0)-(Number(b.ts)||0))}
  function totals(rows){return rows.reduce((a,x)=>{a.kcal+=Number(x.kcal)||0;a.protein+=Number(x.protein)||0;a.carbs+=Number(x.carbs)||0;a.fat+=Number(x.fat)||0;a.fiber+=Number(x.fiber)||0;return a},{kcal:0,protein:0,carbs:0,fat:0,fiber:0})}
  function pct(v,t){return t?Math.min(100,Math.round(v/t*100)):0}
  function macroCard(name,value,target,unit){const p=pct(value,target);return `<div class="macro-card"><div class="macro-top"><span>${name}</span><b>${Math.round(value)} <small>/ ${Math.round(target||0)} ${unit}</small></b></div><div class="macro-bar"><i style="width:${p}%"></i></div><div class="macro-percent">${p}%</div></div>`}

  function renderNutrition(){
    if(!state.currentUser||!document.getElementById('view-alimentacion'))return;
    document.getElementById('nutritionDate').textContent=formatLongDate();
    const p=bodyProfile(),rows=todayNutrition(),sum=totals(rows),t=p?.targets||{};
    const kcalPct=pct(sum.kcal,t.kcal);
    document.getElementById('nutritionGoal').innerHTML=p?`<div class="nutrition-goal-card"><div><div class="summary-label">Objetivo diario</div><div class="nutrition-kcal"><b>${Math.round(sum.kcal)}</b><span>/ ${Math.round(t.kcal||0)} kcal</span></div><div class="nutrition-remaining">${Math.max(0,Math.round((t.kcal||0)-sum.kcal))} kcal restantes · estimación personalizable</div></div><div class="summary-ring" style="--progress-angle:${kcalPct*3.6}deg"><span>${kcalPct}%</span></div><div class="nutrition-goal-bar"><i style="width:${kcalPct}%"></i></div></div>`:`<button class="nutrition-setup" id="nutritionSetup"><span>🍽️</span><div><b>Configurá tu objetivo</b><small>Cargá tus datos corporales para estimar calorías y macros.</small></div><strong>→</strong></button>`;
    document.getElementById('nutritionSetup')?.addEventListener('click',()=>{localStorage.removeItem(key(SKIP_ONBOARDING_PREFIX));maybeShowOnboarding()});
    document.getElementById('macroGrid').innerHTML=macroCard('Proteína',sum.protein,t.protein||0,'g')+macroCard('Carbohidratos',sum.carbs,t.carbs||0,'g')+macroCard('Grasas',sum.fat,t.fat||0,'g')+macroCard('Fibra',sum.fiber,t.fiber||25,'g');
    renderFavorites();renderMeals(rows);renderGlossary();
  }

  function renderFavorites(){
    const box=document.getElementById('favoriteFoods'),fav=foodFavorites();if(!fav.length){box.innerHTML='';return}
    box.innerHTML=`<div class="nutrition-section-head compact"><h2>Favoritos</h2><span>Toque rápido</span></div><div class="favorite-foods">${fav.map(f=>`<button class="favorite-food" data-id="${escapeHtml(f.id)}"><b>${escapeHtml(f.name)}</b><small>${escapeHtml(f.quantity||'Porción')} · ${Math.round(Number(f.kcal)||0)} kcal</small></button>`).join('')}</div>`;
    box.querySelectorAll('.favorite-food').forEach(b=>b.onclick=()=>addFavoriteToToday(b.dataset.id));
  }
  function renderMeals(rows){
    const box=document.getElementById('nutritionMeals');
    box.innerHTML=MEALS.map(meal=>{const list=rows.filter(x=>x.meal===meal);return `<div class="meal-card"><div class="meal-head"><div><b>${meal}</b><small>${Math.round(totals(list).kcal)} kcal</small></div><button class="meal-add" data-meal="${meal}">+</button></div>${list.length?list.map(x=>`<button class="food-row" data-id="${escapeHtml(x.id)}"><span><b>${escapeHtml(x.name)}</b><small>${escapeHtml(x.quantity||'')} ${x.quantity?'· ':''}${Math.round(Number(x.kcal)||0)} kcal</small></span><span class="food-row-macros">P ${Math.round(Number(x.protein)||0)} · C ${Math.round(Number(x.carbs)||0)} · G ${Math.round(Number(x.fat)||0)}</span><strong>›</strong></button>`).join(''):`<div class="meal-empty">Sin registros</div>`}</div>`}).join('');
    box.querySelectorAll('.meal-add').forEach(b=>b.onclick=()=>openFoodEditor(null,b.dataset.meal));
    box.querySelectorAll('.food-row').forEach(b=>b.onclick=()=>openFoodEditor(b.dataset.id));
  }
  function renderGlossary(){
    const box=document.getElementById('nutritionGlossary');if(box.dataset.ready)return;box.dataset.ready='1';
    const items=[
      ['Proteínas','Ayudan a construir y reparar tejidos, incluido el músculo.','Carnes, pescado, huevos, leche y yogur, quesos, legumbres, tofu y soja.'],
      ['Carbohidratos','Son una fuente principal de energía, especialmente útil para entrenar y recuperarte.','Arroz, papa, batata, avena, pan, pastas, frutas, legumbres y cereales.'],
      ['Grasas','También aportan energía y participan en funciones celulares y hormonales.','Aceite de oliva, palta, frutos secos, semillas, huevos y pescados grasos.'],
      ['Fibra','Es parte de los alimentos vegetales y ayuda al tránsito intestinal y a la saciedad.','Verduras, frutas, legumbres, avena, granos integrales, semillas y frutos secos.'],
      ['Calorías','Son una medida de energía. Proteínas, carbohidratos y grasas aportan calorías en distintas cantidades.','No vienen de un solo alimento: representan la energía total de lo que comés y tomás.']
    ];
    box.innerHTML=items.map((x,i)=>`<details class="glossary-card" ${i===0?'open':''}><summary><span class="glossary-index">0${i+1}</span><b>${x[0]}</b><strong>+</strong></summary><div class="glossary-body"><p>${x[1]}</p><span>¿Dónde encontrarlos?</span><p>${x[2]}</p></div></details>`).join('');
  }

  function openFoodEditor(id,meal){
    injectFoodModal();editingFoodId=id||'';const row=id?nutritionEntries().find(x=>String(x.id)===String(id)):null;
    document.getElementById('foodEditorTitle').textContent=row?'Editar registro':'Agregar comida';document.getElementById('foodMeal').value=row?.meal||meal||'Almuerzo';document.getElementById('foodName').value=row?.name||'';document.getElementById('foodQuantity').value=row?.quantity||'';document.getElementById('foodKcal').value=row?.kcal??'';document.getElementById('foodProtein').value=row?.protein??'';document.getElementById('foodCarbs').value=row?.carbs??'';document.getElementById('foodFat').value=row?.fat??'';document.getElementById('foodFiber').value=row?.fiber??'';document.getElementById('foodFavorite').checked=false;document.getElementById('foodEditorDelete').style.display=row?'block':'none';document.getElementById('foodEditorOverlay').classList.add('active');setTimeout(()=>document.getElementById('foodName').focus(),60)
  }
  function closeFoodEditor(){document.getElementById('foodEditorOverlay')?.classList.remove('active');editingFoodId=''}
  function readFoodForm(){return {meal:document.getElementById('foodMeal').value,name:document.getElementById('foodName').value.trim(),quantity:document.getElementById('foodQuantity').value.trim(),kcal:Math.max(0,Number(document.getElementById('foodKcal').value)||0),protein:Math.max(0,Number(document.getElementById('foodProtein').value)||0),carbs:Math.max(0,Number(document.getElementById('foodCarbs').value)||0),fat:Math.max(0,Number(document.getElementById('foodFat').value)||0),fiber:Math.max(0,Number(document.getElementById('foodFiber').value)||0)}}
  function saveFoodEditor(){
    const data=readFoodForm();if(!data.name){showToast('Escribí el alimento o comida');return}let rows=nutritionEntries();const now=Date.now();
    if(editingFoodId){const row=rows.find(x=>String(x.id)===String(editingFoodId));if(row)Object.assign(row,data,{updatedAt:now})}
    else rows.push(Object.assign({id:cid(),ts:now,date:localDateStr(),updatedAt:now},data));
    saveNutritionEntries(rows);
    if(document.getElementById('foodFavorite').checked){let fav=foodFavorites();const old=fav.find(x=>x.name.toLowerCase()===data.name.toLowerCase()&&x.quantity===data.quantity);if(old)Object.assign(old,data,{updatedAt:now});else fav.push(Object.assign({id:cid(),updatedAt:now},data));saveFoodFavorites(fav)}
    closeFoodEditor();renderNutrition();syncPending(false);showToast(editingFoodId?'Registro actualizado':'Comida agregada')
  }
  function deleteFoodEditor(){if(!editingFoodId||!confirm('¿Eliminar este registro?'))return;saveNutritionEntries(nutritionEntries().filter(x=>String(x.id)!==String(editingFoodId)));closeFoodEditor();renderNutrition();syncPending(false);showToast('Registro eliminado')}
  function addFavoriteToToday(id){const f=foodFavorites().find(x=>String(x.id)===String(id));if(!f)return;const now=Date.now();const row={id:cid(),ts:now,date:localDateStr(),meal:f.meal||'Otros',name:f.name,quantity:f.quantity,kcal:f.kcal,protein:f.protein,carbs:f.carbs,fat:f.fat,fiber:f.fiber,updatedAt:now};saveNutritionEntries([...nutritionEntries(),row]);renderNutrition();syncPending(false);showToast(`${f.name} agregado`)}

  function updateWorkoutSessionFromLogs(){
    if(!state.currentUser)return;const date=localDateStr(),day=state.selectedDay;const rows=loadLogs().filter(x=>x.fecha===date&&x.dia===day);if(!rows.length)return;
    let sessions=workoutSessions(),id=`session-${date}-${day}`,s=sessions.find(x=>x.id===id);const times=rows.map(x=>Number(x.ts)||Date.now());
    if(!s){s={id,user:state.currentUser,date,day,startTs:Math.min(...times),endTs:null,status:'active',exerciseIds:[],setIds:[],health:{provider:null,externalWorkoutId:null,durationMin:null,avgHeartRate:null,maxHeartRate:null,activeCalories:null,raw:null},updatedAt:Date.now()};sessions.push(s)}
    s.startTs=Math.min(s.startTs||Date.now(),...times);s.exerciseIds=[...new Set(rows.map(x=>x.exerciseId).filter(Boolean))];s.setIds=[...new Set(rows.map(x=>x.id).filter(Boolean))];
    if(typeof dayIsComplete==='function'&&dayIsComplete()){s.status='complete';if(!s.endTs)s.endTs=Math.max(...times,Date.now())}s.updatedAt=Date.now();saveWorkoutSessions(sessions)
  }

  async function syncV6Remote(){
    if(!state.currentUser||!nutritionIsDirty())return true;const url=(state.scriptUrl||DEFAULT_SCRIPT_URL).trim();if(!url)return false;
    const payload={action:'syncV6',version:6,user:state.currentUser,updatedAt:new Date().toISOString(),nutritionProfile:bodyProfile(),nutritionEntries:nutritionEntries(),nutritionFavorites:foodFavorites(),sessions:workoutSessions()};
    try{await fetch(url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});const sep=url.includes('?')?'&':'?';const res=await fetch(`${url}${sep}action=load&user=${encodeURIComponent(state.currentUser)}`);if(!res.ok)return false;const data=await res.json();if(!data?.ok)return false;applyRemoteV6(data,true);clearNutritionDirty();return true}catch(err){console.debug('Nutrición pendiente de sincronizar',err);return false}
  }
  function applyRemoteV6(data,afterOwnSync){
    if(!state.currentUser||!data)return;
    if(!nutritionIsDirty()||afterOwnSync){
      if(data.nutritionProfile)localStorage.setItem(key(BODY_PREFIX),JSON.stringify(data.nutritionProfile));
      if(Array.isArray(data.nutritionEntries))localStorage.setItem(key(NUTRITION_PREFIX),JSON.stringify(data.nutritionEntries));
      if(Array.isArray(data.nutritionFavorites))localStorage.setItem(key(FAVORITES_PREFIX),JSON.stringify(data.nutritionFavorites));
      if(Array.isArray(data.sessions)){const local=workoutSessions(),map=new Map(data.sessions.map(x=>[x.id,x]));local.forEach(x=>{const old=map.get(x.id);if(!old||Number(x.updatedAt||0)>Number(old.updatedAt||0))map.set(x.id,x)});localStorage.setItem(key(SESSIONS_PREFIX),JSON.stringify([...map.values()]))}
    }
    renderBodySettings();renderNutrition();
  }
  async function pullV6Remote(){
    if(!state.currentUser)return;const url=(state.scriptUrl||DEFAULT_SCRIPT_URL).trim();if(!url)return;
    try{const sep=url.includes('?')?'&':'?';const res=await fetch(`${url}${sep}action=load&user=${encodeURIComponent(state.currentUser)}`);if(!res.ok)return;const data=await res.json();if(data?.ok)applyRemoteV6(data,false)}catch(err){console.debug('Datos de nutrición remotos no disponibles',err)}
  }

  injectNavigation();injectNutritionView();injectBodySettings();injectFoodModal();injectOnboarding();

  const baseRenderSettings=renderSettings;
  renderSettings=function(){baseRenderSettings();renderBodySettings()};

  const baseRenderAll=renderAll;
  renderAll=function(){baseRenderAll();renderNutrition();updateWorkoutSessionFromLogs()};

  const baseSwitchView=switchView;
  switchView=function(name){baseSwitchView(name);document.getElementById('settingsGear')?.classList.toggle('active',name==='ajustes');const fab=document.getElementById('fabTimer');if(fab)fab.style.display=name==='rutina'?'grid':'none';if(name==='alimentacion')renderNutrition();if(name==='ajustes')renderBodySettings()};

  const baseEnterUser=enterUser;
  enterUser=async function(raw){await baseEnterUser(raw);await pullV6Remote();renderBodySettings();renderNutrition();setTimeout(maybeShowOnboarding,180)};

  const baseMarkSetDone=markSetDone;
  markSetDone=function(e,setNum,reps,peso){baseMarkSetDone(e,setNum,reps,peso);setTimeout(updateWorkoutSessionFromLogs,0)};

  const baseSyncPending=syncPending;
  syncPending=async function(manual){await baseSyncPending(manual);await syncV6Remote()};

  const basePullRemote=pullRemoteRoutine;
  pullRemoteRoutine=async function(showMessage){const result=await basePullRemote(showMessage);await pullV6Remote();return result};

  document.getElementById('profileButton').onclick=()=>switchView('ajustes');
  if(state.currentUser){renderBodySettings();renderNutrition();updateWorkoutSessionFromLogs();setTimeout(maybeShowOnboarding,200)}
})();
