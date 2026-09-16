/**
 * Workout Planner v6 - Google Apps Script backend
 * Vincular este proyecto al Google Sheet que se quiera usar.
 * Implementar como Web App: Execute as Me / Anyone with the link.
 *
 * v5: historial de entrenamiento editable/borrable por ID.
 * v6: perfil nutricional, comidas, favoritos y sesiones de entrenamiento.
 */

function doGet(e) {
  try {
    var action = String((e && e.parameter && e.parameter.action) || 'status');
    if (action === 'load') {
      var user = cleanUser_((e.parameter && e.parameter.user) || '');
      if (!user) return json_({ ok:false, error:'missing_user' });
      return json_(loadUser_(user));
    }
    return json_({ ok:true, app:'Workout Planner', version:6 });
  } catch (err) {
    return json_({ ok:false, error:String(err) });
  }
}

function doPost(e) {
  try {
    var payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var user = cleanUser_(payload.user || inferUser_(payload.rows));
    if (!user) return json_({ ok:false, error:'missing_user' });
    var action = String(payload.action || 'sync');
    var updatedAt = payload.updatedAt || new Date().toISOString();

    if (action === 'syncV6') {
      if (payload.nutritionProfile && typeof payload.nutritionProfile === 'object') saveNutritionProfile_(user, payload.nutritionProfile, updatedAt);
      if (Array.isArray(payload.nutritionEntries)) saveNutritionEntries_(user, payload.nutritionEntries);
      if (Array.isArray(payload.nutritionFavorites)) saveNutritionFavorites_(user, payload.nutritionFavorites);
      if (Array.isArray(payload.sessions)) saveSessions_(user, payload.sessions);
      upsertProfile_(user, updatedAt);
      return json_({ok:true,user:user,version:6,area:'nutrition'});
    }

    if (Array.isArray(payload.deletedIds) && payload.deletedIds.length) deleteLogs_(user, payload.deletedIds);
    if (Array.isArray(payload.rows) && payload.rows.length) upsertLogs_(user, payload.rows);
    if (payload.routine && typeof payload.routine === 'object') saveRoutine_(user, payload.routine, updatedAt);
    upsertProfile_(user, updatedAt);

    return json_({
      ok:true,
      user:user,
      rows:Array.isArray(payload.rows) ? payload.rows.length : 0,
      deleted:Array.isArray(payload.deletedIds) ? payload.deletedIds.length : 0,
      version:6
    });
  } catch (err) {
    return json_({ ok:false, error:String(err) });
  }
}

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function cleanUser_(value) {
  return String(value || '').trim().replace(/[\\\/\?\*\[\]:]/g, ' ').replace(/\s+/g, ' ').slice(0, 55);
}
function inferUser_(rows) { return Array.isArray(rows) && rows.length ? (rows[0].usuario || '') : ''; }
function tabName_(prefix, user) { return (prefix + ' - ' + cleanUser_(user)).slice(0, 90); }
function safeJson_(value, fallback) { try { return JSON.parse(String(value || '')); } catch (e) { return fallback; } }

function getOrCreate_(name, headers) {
  var ss = ss_(), sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0 && headers && headers.length) {
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.getRange(1,1,1,headers.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function replaceBody_(sh, headers, rows) {
  if (sh.getLastRow() > 1) sh.getRange(2,1,sh.getLastRow()-1,headers.length).clearContent();
  if (rows && rows.length) sh.getRange(2,1,rows.length,headers.length).setValues(rows);
}

/* ---------------- ENTRENAMIENTO ---------------- */
function logHeaders_() {
  return ['ID','TIMESTAMP','FECHA','USUARIO','DIA','EJERCICIO_ID','EJERCICIO','SERIE','REPS','PESO_KG'];
}

function logRow_(user, r) {
  return [
    String(r.id || ''),
    r.ts ? new Date(Number(r.ts)) : new Date(),
    r.fecha || '',
    user,
    r.dia || '',
    r.exerciseId || '',
    r.ejercicio || '',
    r.set || '',
    r.reps === undefined ? '' : r.reps,
    r.peso === undefined ? '' : r.peso
  ];
}

function upsertLogs_(user, rows) {
  var headers = logHeaders_();
  var sh = getOrCreate_(tabName_('Historial', user), headers);
  var last = sh.getLastRow(), idToRow = {};

  if (last > 1) {
    sh.getRange(2,1,last-1,1).getValues().forEach(function(r, i){
      var id = String(r[0] || '');
      if (id) idToRow[id] = i + 2;
    });
  }

  var append = [];
  rows.forEach(function(r){
    var id = String(r.id || '');
    var values = logRow_(user, r);
    if (id && idToRow[id]) sh.getRange(idToRow[id],1,1,headers.length).setValues([values]);
    else append.push(values);
  });

  if (append.length) sh.getRange(sh.getLastRow()+1,1,append.length,headers.length).setValues(append);
}

function deleteLogs_(user, ids) {
  var sh = ss_().getSheetByName(tabName_('Historial', user));
  if (!sh || sh.getLastRow() <= 1) return;
  var wanted = {};
  ids.forEach(function(id){ if (id !== null && id !== undefined) wanted[String(id)] = true; });
  if (!Object.keys(wanted).length) return;
  var values = sh.getRange(2,1,sh.getLastRow()-1,1).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    var id = String(values[i][0] || '');
    if (id && wanted[id]) sh.deleteRow(i + 2);
  }
}

function saveRoutine_(user, routine, updatedAt) {
  var headers = ['DIA','ORDEN','EJERCICIO_ID','EJERCICIO','SERIES','REPS','PESO_KG','AL_FALLO','ACTUALIZADO'];
  var sh = getOrCreate_(tabName_('Rutina', user), headers), out = [];
  ['Lunes','Martes','Miércoles','Jueves','Viernes'].forEach(function(day){
    var list = Array.isArray(routine[day]) ? routine[day] : [];
    list.forEach(function(ex, i){ out.push([day,i+1,ex.id || '',ex.nombre || '',ex.series || 0,ex.reps || 0,ex.peso || 0,!!ex.alFallo,updatedAt]); });
  });
  replaceBody_(sh, headers, out);
}

function loadRoutine_(user) {
  var sh = ss_().getSheetByName(tabName_('Rutina', user));
  var routine = {Lunes:[],Martes:[],Miércoles:[],Jueves:[],Viernes:[]}, updatedAt = '', exists = !!(sh && sh.getLastRow() > 1);
  if (exists) {
    var values = sh.getRange(2,1,sh.getLastRow()-1,9).getValues();
    values.forEach(function(r){
      var day = String(r[0] || ''); if (!routine[day]) return;
      routine[day].push({id:String(r[2] || ''),nombre:String(r[3] || ''),series:Number(r[4] || 0),reps:Number(r[5] || 0),peso:Number(r[6] || 0),alFallo:!!r[7]});
      if (String(r[8] || '') > updatedAt) updatedAt = String(r[8] || '');
    });
  }
  return {routine:routine,updatedAt:updatedAt,routineExists:exists};
}

function loadLogs_(user) {
  var sh = ss_().getSheetByName(tabName_('Historial', user));
  if (!sh || sh.getLastRow() <= 1) return [];
  return sh.getRange(2,1,sh.getLastRow()-1,10).getValues().map(function(r){
    var ts = r[1] instanceof Date ? r[1].getTime() : (Number(r[1]) || 0);
    return {id:String(r[0] || ''),ts:ts,fecha:String(r[2] || ''),usuario:user,dia:String(r[4] || ''),exerciseId:String(r[5] || ''),ejercicio:String(r[6] || ''),set:Number(r[7] || 0),reps:Number(r[8] || 0),peso:Number(r[9] || 0)};
  });
}

/* ---------------- PERFIL / NUTRICIÓN ---------------- */
function saveNutritionProfile_(user, p, updatedAt) {
  var headers=['USUARIO','PESO_KG','ALTURA_CM','EDAD','SEXO_CALCULO','ACTIVIDAD','OBJETIVO','KCAL_OBJ','PROTEINA_G_OBJ','CARBOS_G_OBJ','GRASAS_G_OBJ','FIBRA_G_OBJ','BMR_EST','TDEE_EST','ACTUALIZADO'];
  var sh=getOrCreate_(tabName_('Perfil nutricional', user),headers);
  var t=p.targets||{},c=p.calculation||{};
  replaceBody_(sh,headers,[[user,Number(p.weight)||0,Number(p.height)||0,Number(p.age)||0,p.calcSex||'',p.activity||'',p.goal||'',Number(t.kcal)||0,Number(t.protein)||0,Number(t.carbs)||0,Number(t.fat)||0,Number(t.fiber)||25,Number(c.bmr)||0,Number(c.tdee)||0,Number(p.updatedAt)||updatedAt]]);
}

function loadNutritionProfile_(user) {
  var sh=ss_().getSheetByName(tabName_('Perfil nutricional', user)); if(!sh||sh.getLastRow()<=1)return null;
  var r=sh.getRange(2,1,1,15).getValues()[0];
  return {weight:Number(r[1])||0,height:Number(r[2])||0,age:Number(r[3])||0,calcSex:String(r[4]||''),activity:String(r[5]||''),goal:String(r[6]||''),targets:{kcal:Number(r[7])||0,protein:Number(r[8])||0,carbs:Number(r[9])||0,fat:Number(r[10])||0,fiber:Number(r[11])||25},calculation:{bmr:Number(r[12])||0,tdee:Number(r[13])||0},updatedAt:Number(r[14])||0};
}

function saveNutritionEntries_(user, entries) {
  var headers=['ID','TIMESTAMP','FECHA','USUARIO','COMIDA','ALIMENTO','CANTIDAD','KCAL','PROTEINA_G','CARBOS_G','GRASAS_G','FIBRA_G','ACTUALIZADO'];
  var sh=getOrCreate_(tabName_('Nutricion', user),headers);
  var rows=entries.map(function(x){return [String(x.id||''),x.ts?new Date(Number(x.ts)):new Date(),x.date||'',user,x.meal||'',x.name||'',x.quantity||'',Number(x.kcal)||0,Number(x.protein)||0,Number(x.carbs)||0,Number(x.fat)||0,Number(x.fiber)||0,Number(x.updatedAt)||0];});
  replaceBody_(sh,headers,rows);
}

function loadNutritionEntries_(user) {
  var sh=ss_().getSheetByName(tabName_('Nutricion', user));if(!sh||sh.getLastRow()<=1)return [];
  return sh.getRange(2,1,sh.getLastRow()-1,13).getValues().map(function(r){return {id:String(r[0]||''),ts:r[1] instanceof Date?r[1].getTime():(Number(r[1])||0),date:String(r[2]||''),meal:String(r[4]||''),name:String(r[5]||''),quantity:String(r[6]||''),kcal:Number(r[7])||0,protein:Number(r[8])||0,carbs:Number(r[9])||0,fat:Number(r[10])||0,fiber:Number(r[11])||0,updatedAt:Number(r[12])||0};});
}

function saveNutritionFavorites_(user, favorites) {
  var headers=['ID','COMIDA','ALIMENTO','CANTIDAD','KCAL','PROTEINA_G','CARBOS_G','GRASAS_G','FIBRA_G','ACTUALIZADO'];
  var sh=getOrCreate_(tabName_('Favoritos', user),headers);
  var rows=favorites.map(function(x){return [String(x.id||''),x.meal||'',x.name||'',x.quantity||'',Number(x.kcal)||0,Number(x.protein)||0,Number(x.carbs)||0,Number(x.fat)||0,Number(x.fiber)||0,Number(x.updatedAt)||0];});
  replaceBody_(sh,headers,rows);
}

function loadNutritionFavorites_(user) {
  var sh=ss_().getSheetByName(tabName_('Favoritos', user));if(!sh||sh.getLastRow()<=1)return [];
  return sh.getRange(2,1,sh.getLastRow()-1,10).getValues().map(function(r){return {id:String(r[0]||''),meal:String(r[1]||''),name:String(r[2]||''),quantity:String(r[3]||''),kcal:Number(r[4])||0,protein:Number(r[5])||0,carbs:Number(r[6])||0,fat:Number(r[7])||0,fiber:Number(r[8])||0,updatedAt:Number(r[9])||0};});
}

/* ---------------- SESIONES / SMARTWATCH FUTURO ---------------- */
function saveSessions_(user, sessions) {
  var headers=['ID','FECHA','DIA','INICIO','FIN','ESTADO','EJERCICIOS_JSON','SERIES_JSON','HEALTH_PROVIDER','EXTERNAL_WORKOUT_ID','DURACION_MIN','FC_MEDIA','FC_MAX','CAL_ACTIVAS','HEALTH_JSON','ACTUALIZADO'];
  var sh=getOrCreate_(tabName_('Sesiones', user),headers);
  var rows=sessions.map(function(s){var h=s.health||{};return [String(s.id||''),s.date||'',s.day||'',Number(s.startTs)||0,Number(s.endTs)||0,s.status||'',JSON.stringify(s.exerciseIds||[]),JSON.stringify(s.setIds||[]),h.provider||'',h.externalWorkoutId||'',h.durationMin===null?'':Number(h.durationMin)||0,h.avgHeartRate===null?'':Number(h.avgHeartRate)||0,h.maxHeartRate===null?'':Number(h.maxHeartRate)||0,h.activeCalories===null?'':Number(h.activeCalories)||0,JSON.stringify(h.raw||null),Number(s.updatedAt)||0];});
  replaceBody_(sh,headers,rows);
}

function loadSessions_(user) {
  var sh=ss_().getSheetByName(tabName_('Sesiones', user));if(!sh||sh.getLastRow()<=1)return [];
  return sh.getRange(2,1,sh.getLastRow()-1,16).getValues().map(function(r){return {id:String(r[0]||''),user:user,date:String(r[1]||''),day:String(r[2]||''),startTs:Number(r[3])||0,endTs:Number(r[4])||null,status:String(r[5]||''),exerciseIds:safeJson_(r[6],[]),setIds:safeJson_(r[7],[]),health:{provider:String(r[8]||'')||null,externalWorkoutId:String(r[9]||'')||null,durationMin:r[10]===''?null:Number(r[10])||0,avgHeartRate:r[11]===''?null:Number(r[11])||0,maxHeartRate:r[12]===''?null:Number(r[12])||0,activeCalories:r[13]===''?null:Number(r[13])||0,raw:safeJson_(r[14],null)},updatedAt:Number(r[15])||0};});
}

function upsertProfile_(user, updatedAt) {
  var headers = ['USUARIO','ACTUALIZADO'], sh = getOrCreate_('Usuarios', headers), last = sh.getLastRow();
  var values = last > 1 ? sh.getRange(2,1,last-1,2).getValues() : [], row = -1;
  for (var i=0;i<values.length;i++) if (String(values[i][0]).toLowerCase() === user.toLowerCase()) { row=i+2; break; }
  if (row > 0) sh.getRange(row,1,1,2).setValues([[user,updatedAt]]); else sh.appendRow([user,updatedAt]);
}

function loadUser_(user) {
  var r=loadRoutine_(user);
  return {
    ok:true,user:user,routine:r.routine,routineExists:r.routineExists,updatedAt:r.updatedAt,
    logs:loadLogs_(user),
    nutritionProfile:loadNutritionProfile_(user),
    nutritionEntries:loadNutritionEntries_(user),
    nutritionFavorites:loadNutritionFavorites_(user),
    sessions:loadSessions_(user),
    version:6
  };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
