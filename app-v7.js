/* Workout Planner v7 — buscador de alimentos + comidas compuestas + foco automático en el día actual */
(function(){
  const NUTRITION_PREFIX='wp_nutrition_v6_';
  const FAVORITES_PREFIX='wp_food_favorites_v6_';
  const NUTRITION_DIRTY_PREFIX='wp_nutrition_dirty_v6_';
  const MEALS=['Desayuno','Almuerzo','Merienda','Cena','Otros'];
  let builderIngredients=[];
  let scannerStream=null;
  let scannerRunning=false;

  function k(prefix){return prefix+userKey(state.currentUser)}
  function readJSON(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}}
  function nutritionEntriesV7(){return readJSON(k(NUTRITION_PREFIX),[])}
  function saveNutritionEntriesV7(rows){localStorage.setItem(k(NUTRITION_PREFIX),JSON.stringify(rows));markNutritionDirtyV7()}
  function favoritesV7(){return readJSON(k(FAVORITES_PREFIX),[])}
  function saveFavoritesV7(rows){localStorage.setItem(k(FAVORITES_PREFIX),JSON.stringify(rows));markNutritionDirtyV7()}
  function markNutritionDirtyV7(){if(state.currentUser)localStorage.setItem(k(NUTRITION_DIRTY_PREFIX),'1')}

  function realTrainingDay(){
    const jsDay=new Date().getDay();
    return jsDay>=1&&jsDay<=5?DAYS[jsDay-1]:null;
  }

  /* Al entrar siempre enfocamos el día real. Después se puede navegar libremente. */
  const baseEnterUserV7=enterUser;
  enterUser=async function(raw){
    const today=realTrainingDay();
    if(today){state.selectedDay=today;saveState()}
    await baseEnterUserV7(raw);
    if(today&&state.currentUser){
      state.selectedDay=today;saveState();doneMap=loadDone();
      if(typeof rebuildTodayDoneFromLogs==='function')rebuildTodayDoneFromLogs();
      renderAll();
    }
  };

  const baseRenderDaysV7=renderDays;
  renderDays=function(){
    baseRenderDaysV7();
    const today=realTrainingDay();if(!today)return;
    const i=DAYS.indexOf(today);
    const main=document.getElementById('dayTabs')?.children[i];
    const mini=document.getElementById('routineDayPicker')?.children[i];
    if(main){main.classList.add('today-pill');main.setAttribute('aria-label',`${today}, hoy`)}
    if(mini)mini.classList.add('today-pill');
  };

  function injectFoodFinder(){
    const view=document.getElementById('view-alimentacion');if(!view||document.getElementById('smartFoodCard'))return;
    const goal=document.getElementById('nutritionGoal');if(!goal)return;
    const card=document.createElement('div');card.id='smartFoodCard';card.className='smart-food-card';
    card.innerHTML=`<div class="smart-food-copy"><span class="smart-food-icon">⌕</span><div><b>¿Qué comiste?</b><small>Buscá alimentos, combiná ingredientes y calculamos los macros.</small></div></div><div class="smart-food-actions"><button id="smartFoodSearch" type="button">Buscar alimento</button><button id="smartFoodScan" type="button">▣ Escanear</button></div>`;
    goal.insertAdjacentElement('afterend',card);
    document.getElementById('smartFoodSearch').onclick=()=>openFoodBuilder();
    document.getElementById('smartFoodScan').onclick=()=>{openFoodBuilder();setTimeout(startBarcodeScanner,120)};
    const mainAdd=document.getElementById('addFoodMain');
    if(mainAdd){mainAdd.textContent='+ Buscar / armar';mainAdd.onclick=()=>openFoodBuilder()}
  }

  function injectBuilderUI(){
    if(document.getElementById('foodBuilderOverlay'))return;
    document.querySelector('.app-shell').insertAdjacentHTML('beforeend',`
      <div class="v4-overlay food-builder-overlay" id="foodBuilderOverlay">
        <div class="v4-dialog food-builder-dialog">
          <button class="v4-close" id="foodBuilderClose">×</button>
          <div class="v4-kicker">Calculador de alimentos</div>
          <div class="v4-title">Armá tu comida</div>
          <div class="builder-top-grid">
            <label><span>Momento</span><select id="builderMeal">${MEALS.map(x=>`<option>${x}</option>`).join('')}</select></label>
            <label><span>Nombre de la comida</span><input id="builderMealName" placeholder="Ej. Tostadas con manteca"></label>
          </div>
          <div class="food-search-box">
            <div class="food-search-row"><input id="foodSearchQuery" placeholder="Pan lactal, banana, manteca..."><button id="foodSearchBtn">Buscar</button></div>
            <div class="barcode-row"><input id="foodBarcodeInput" inputmode="numeric" placeholder="Código de barras"><button id="foodBarcodeBtn">Buscar código</button><button id="foodCameraBtn" aria-label="Escanear código">▣</button></div>
            <div class="food-source-note">Productos: Open Food Facts · Genéricos: USDA cuando está configurado.</div>
          </div>
          <div id="foodSearchStatus" class="food-search-status"></div>
          <div id="foodSearchResults" class="food-search-results"></div>
          <div class="builder-section-head"><b>Ingredientes</b><span id="builderIngredientCount">0</span></div>
          <div id="builderIngredients" class="builder-ingredients"><div class="builder-empty">Buscá un alimento y agregalo a la comida.</div></div>
          <div id="builderTotals" class="builder-totals"></div>
          <label class="favorite-check builder-favorite"><input type="checkbox" id="builderFavorite"> Guardar esta combinación como favorito</label>
          <button class="v4-primary" id="saveBuiltMeal">Guardar comida</button>
          <div class="v4-note">Los valores se calculan según la cantidad en gramos. En productos envasados pueden variar según marca y receta: verificá la etiqueta si necesitás máxima precisión.</div>
        </div>
      </div>
      <div class="v4-overlay barcode-overlay" id="barcodeOverlay">
        <div class="v4-dialog barcode-dialog">
          <button class="v4-close" id="barcodeClose">×</button>
          <div class="v4-kicker">Código de barras</div><div class="v4-title">Apuntá al código</div>
          <div class="barcode-video-wrap"><video id="barcodeVideo" autoplay playsinline muted></video><div class="barcode-target"></div></div>
          <div id="barcodeStatus" class="food-search-status">Buscando código…</div>
          <button class="v4-secondary" id="barcodeCancel">Cancelar</button>
        </div>
      </div>`);
    document.getElementById('foodBuilderClose').onclick=closeFoodBuilder;
    document.getElementById('foodBuilderOverlay').addEventListener('click',e=>{if(e.target===e.currentTarget)closeFoodBuilder()});
    document.getElementById('foodSearchBtn').onclick=searchFoods;
    document.getElementById('foodSearchQuery').addEventListener('keydown',e=>{if(e.key==='Enter')searchFoods()});
    document.getElementById('foodBarcodeBtn').onclick=()=>lookupBarcode(document.getElementById('foodBarcodeInput').value.trim());
    document.getElementById('foodBarcodeInput').addEventListener('keydown',e=>{if(e.key==='Enter')lookupBarcode(e.currentTarget.value.trim())});
    document.getElementById('foodCameraBtn').onclick=startBarcodeScanner;
    document.getElementById('saveBuiltMeal').onclick=saveBuiltMeal;
    document.getElementById('barcodeClose').onclick=stopBarcodeScanner;
    document.getElementById('barcodeCancel').onclick=stopBarcodeScanner;
  }

  function openFoodBuilder(meal){
    injectBuilderUI();builderIngredients=[];
    document.getElementById('builderMeal').value=meal||guessMeal();
    document.getElementById('builderMealName').value='';document.getElementById('builderFavorite').checked=false;
    document.getElementById('foodSearchQuery').value='';document.getElementById('foodBarcodeInput').value='';
    document.getElementById('foodSearchStatus').textContent='';document.getElementById('foodSearchResults').innerHTML='';
    renderBuilderIngredients();document.getElementById('foodBuilderOverlay').classList.add('active');
    setTimeout(()=>document.getElementById('foodSearchQuery').focus(),80);
  }
  function closeFoodBuilder(){stopBarcodeScanner();document.getElementById('foodBuilderOverlay')?.classList.remove('active')}
  function guessMeal(){const h=new Date().getHours();return h<11?'Desayuno':h<15?'Almuerzo':h<19?'Merienda':'Cena'}

  function apiUrl(action,params){
    const base=(state.scriptUrl||DEFAULT_SCRIPT_URL).trim();const u=new URL(base);u.searchParams.set('action',action);
    Object.entries(params||{}).forEach(([a,b])=>u.searchParams.set(a,b));return u.toString();
  }

  async function searchFoods(){
    const q=document.getElementById('foodSearchQuery').value.trim();if(q.length<2){showToast('Escribí al menos 2 letras');return}
    const status=document.getElementById('foodSearchStatus'),results=document.getElementById('foodSearchResults');status.textContent='Buscando…';results.innerHTML='';
    try{
      const res=await fetch(apiUrl('foodSearch',{q}));const data=await res.json();if(!data?.ok)throw new Error(data?.error||'search_failed');
      renderFoodResults(data.results||[]);status.textContent=(data.results||[]).length?`${data.results.length} resultados${data.usdaEnabled?' · Open Food Facts + USDA':' · Open Food Facts'}`:'No encontré resultados. Probá otra descripción.';
    }catch(err){console.debug(err);status.textContent='No pude consultar la base de alimentos. Revisá que el Apps Script v7 esté implementado.'}
  }

  async function lookupBarcode(code){
    code=String(code||'').replace(/\D/g,'');if(code.length<6){showToast('Ingresá un código válido');return}
    const status=document.getElementById('foodSearchStatus');status.textContent='Buscando producto…';
    try{
      const res=await fetch(apiUrl('foodBarcode',{code}));const data=await res.json();
      if(!data?.ok||!data.result){status.textContent='No encontré ese código en Open Food Facts.';return}
      renderFoodResults([data.result]);status.textContent='Producto encontrado';
    }catch(err){console.debug(err);status.textContent='No pude consultar ese código.'}
  }

  function fmtMacro(v){const n=Number(v)||0;return n<10?n.toFixed(1):Math.round(n)}
  function renderFoodResults(rows){
    const box=document.getElementById('foodSearchResults');
    box.innerHTML=rows.map((r,i)=>`<div class="food-result"><div class="food-result-main"><b>${escapeHtml(r.name||'Sin nombre')}</b><small>${escapeHtml([r.brand,r.source].filter(Boolean).join(' · '))}</small><span>por 100 g · <strong>${fmtMacro(r.kcal100)} kcal</strong> · P ${fmtMacro(r.protein100)} · C ${fmtMacro(r.carbs100)} · G ${fmtMacro(r.fat100)}</span></div><button type="button" data-i="${i}">Agregar</button></div>`).join('');
    box.querySelectorAll('button[data-i]').forEach(b=>b.onclick=()=>addSearchResult(rows[Number(b.dataset.i)]));
  }
  function parseServingGrams(text){const m=String(text||'').replace(',','.').match(/([\d.]+)\s*g\b/i);return m?Math.max(1,Number(m[1])||100):100}
  function addSearchResult(r){
    builderIngredients.push({id:cid(),source:r.source||'',sourceId:r.id||r.code||'',code:r.code||'',name:r.name||'Alimento',brand:r.brand||'',grams:parseServingGrams(r.servingSize),servingSize:r.servingSize||'',kcal100:Number(r.kcal100)||0,protein100:Number(r.protein100)||0,carbs100:Number(r.carbs100)||0,fat100:Number(r.fat100)||0,fiber100:Number(r.fiber100)||0});
    renderBuilderIngredients();showToast(`${r.name||'Alimento'} agregado`);
  }
  function ingredientValues(x){const f=(Number(x.grams)||0)/100;return {kcal:x.kcal100*f,protein:x.protein100*f,carbs:x.carbs100*f,fat:x.fat100*f,fiber:x.fiber100*f}}
  function builderTotals(){return builderIngredients.reduce((a,x)=>{const v=ingredientValues(x);a.kcal+=v.kcal;a.protein+=v.protein;a.carbs+=v.carbs;a.fat+=v.fat;a.fiber+=v.fiber;return a},{kcal:0,protein:0,carbs:0,fat:0,fiber:0})}

  function renderBuilderIngredients(){
    const box=document.getElementById('builderIngredients');if(!box)return;
    document.getElementById('builderIngredientCount').textContent=`${builderIngredients.length} ingrediente${builderIngredients.length===1?'':'s'}`;
    if(!builderIngredients.length)box.innerHTML='<div class="builder-empty">Buscá un alimento y agregalo a la comida.</div>';
    else box.innerHTML=builderIngredients.map((x,i)=>{const v=ingredientValues(x);return `<div class="builder-ingredient"><div class="builder-ingredient-title"><div><b>${escapeHtml(x.name)}</b><small>${escapeHtml(x.brand||x.source)}</small></div><button class="ingredient-remove" data-remove="${i}">×</button></div><div class="ingredient-bottom"><label><input type="number" inputmode="decimal" min="0" step="1" value="${Number(x.grams)||0}" data-grams="${i}"><span>g</span></label><div><strong>${Math.round(v.kcal)} kcal</strong><small>P ${fmtMacro(v.protein)} · C ${fmtMacro(v.carbs)} · G ${fmtMacro(v.fat)}</small></div></div></div>`}).join('');
    box.querySelectorAll('[data-grams]').forEach(input=>input.oninput=()=>{builderIngredients[Number(input.dataset.grams)].grams=Math.max(0,Number(input.value)||0);renderBuilderTotals()});
    box.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{builderIngredients.splice(Number(b.dataset.remove),1);renderBuilderIngredients()});
    renderBuilderTotals();
  }

  function renderBuilderTotals(){
    const t=builderTotals(),box=document.getElementById('builderTotals');if(!box)return;
    box.innerHTML=`<div class="builder-total-kcal"><span>Total estimado</span><b>${Math.round(t.kcal)} <small>kcal</small></b></div><div class="builder-total-macros"><div><b>${fmtMacro(t.protein)} g</b><span>Proteína</span></div><div><b>${fmtMacro(t.carbs)} g</b><span>Carbos</span></div><div><b>${fmtMacro(t.fat)} g</b><span>Grasas</span></div><div><b>${fmtMacro(t.fiber)} g</b><span>Fibra</span></div></div>`;
  }

  function saveBuiltMeal(){
    if(!builderIngredients.length){showToast('Agregá al menos un ingrediente');return}
    const t=builderTotals(),now=Date.now(),custom=document.getElementById('builderMealName').value.trim();
    const name=custom||builderIngredients.slice(0,3).map(x=>x.name).join(' + ')+(builderIngredients.length>3?'…':'');
    const grams=Math.round(builderIngredients.reduce((a,x)=>a+(Number(x.grams)||0),0));
    const entry={id:cid(),ts:now,date:localDateStr(),meal:document.getElementById('builderMeal').value,name,quantity:`${builderIngredients.length} ingredientes · ${grams} g`,kcal:Math.round(t.kcal*10)/10,protein:Math.round(t.protein*10)/10,carbs:Math.round(t.carbs*10)/10,fat:Math.round(t.fat*10)/10,fiber:Math.round(t.fiber*10)/10,ingredients:builderIngredients.map(x=>Object.assign({},x)),updatedAt:now};
    saveNutritionEntriesV7([...nutritionEntriesV7(),entry]);
    if(document.getElementById('builderFavorite').checked){
      const fav=Object.assign({},entry,{id:cid(),meal:entry.meal,updatedAt:now});delete fav.date;delete fav.ts;
      saveFavoritesV7([...favoritesV7(),fav]);
    }
    closeFoodBuilder();switchView('alimentacion');syncPending(false);showToast('Comida calculada y guardada');
  }

  async function startBarcodeScanner(){
    injectBuilderUI();
    if(!('BarcodeDetector' in window)||!navigator.mediaDevices?.getUserMedia){
      showToast('Este navegador no permite escaneo automático. Podés escribir el código.');document.getElementById('foodBarcodeInput').focus();return;
    }
    try{
      const supported=await BarcodeDetector.getSupportedFormats();const wanted=['ean_13','ean_8','upc_a','upc_e'].filter(x=>supported.includes(x));
      const detector=wanted.length?new BarcodeDetector({formats:wanted}):new BarcodeDetector();
      scannerStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});scannerRunning=true;
      const video=document.getElementById('barcodeVideo');video.srcObject=scannerStream;document.getElementById('barcodeOverlay').classList.add('active');
      const loop=async()=>{
        if(!scannerRunning)return;
        try{const codes=await detector.detect(video);if(codes.length){const code=String(codes[0].rawValue||'');stopBarcodeScanner();document.getElementById('foodBarcodeInput').value=code;lookupBarcode(code);return}}catch{}
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }catch(err){console.debug(err);stopBarcodeScanner();showToast('No pude abrir la cámara. Ingresá el código manualmente.')}
  }

  function stopBarcodeScanner(){
    scannerRunning=false;if(scannerStream){scannerStream.getTracks().forEach(t=>t.stop());scannerStream=null}
    const video=document.getElementById('barcodeVideo');if(video)video.srcObject=null;
    document.getElementById('barcodeOverlay')?.classList.remove('active');
  }

  injectFoodFinder();injectBuilderUI();
  const baseRenderAllV7=renderAll;
  renderAll=function(){baseRenderAllV7();injectFoodFinder();const today=realTrainingDay();if(today)renderDays()};
  if(state.currentUser){injectFoodFinder();renderDays()}
})();