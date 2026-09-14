/**
 * Workout Planner v5 - Google Apps Script backend
 * Vincular este proyecto al Google Sheet que se quiera usar.
 * Implementar como Web App: Execute as Me / Anyone with the link.
 *
 * v5: los registros se actualizan por ID y también pueden borrarse.
 */

function doGet(e) {
  try {
    var action = String((e && e.parameter && e.parameter.action) || 'status');
    if (action === 'load') {
      var user = cleanUser_((e.parameter && e.parameter.user) || '');
      if (!user) return json_({ ok:false, error:'missing_user' });
      return json_(loadUser_(user));
    }
    return json_({ ok:true, app:'Workout Planner', version:5 });
  } catch (err) {
    return json_({ ok:false, error:String(err) });
  }
}

function doPost(e) {
  try {
    var payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var user = cleanUser_(payload.user || inferUser_(payload.rows));
    if (!user) return json_({ ok:false, error:'missing_user' });

    if (Array.isArray(payload.deletedIds) && payload.deletedIds.length) deleteLogs_(user, payload.deletedIds);
    if (Array.isArray(payload.rows) && payload.rows.length) upsertLogs_(user, payload.rows);
    if (payload.routine && typeof payload.routine === 'object') saveRoutine_(user, payload.routine, payload.updatedAt || new Date().toISOString());
    upsertProfile_(user, payload.updatedAt || new Date().toISOString());

    return json_({
      ok:true,
      user:user,
      rows:Array.isArray(payload.rows) ? payload.rows.length : 0,
      deleted:Array.isArray(payload.deletedIds) ? payload.deletedIds.length : 0,
      version:5
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

function getOrCreate_(name, headers) {
  var ss = ss_(), sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0 && headers && headers.length) {
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.getRange(1,1,1,headers.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

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
    if (id && idToRow[id]) {
      sh.getRange(idToRow[id],1,1,headers.length).setValues([values]);
    } else {
      append.push(values);
    }
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
  var sh = getOrCreate_(tabName_('Rutina', user), headers);
  if (sh.getLastRow() > 1) sh.getRange(2,1,sh.getLastRow()-1,headers.length).clearContent();
  var out = [];
  ['Lunes','Martes','Miércoles','Jueves','Viernes'].forEach(function(day){
    var list = Array.isArray(routine[day]) ? routine[day] : [];
    list.forEach(function(ex, i){
      out.push([day,i+1,ex.id || '',ex.nombre || '',ex.series || 0,ex.reps || 0,ex.peso || 0,!!ex.alFallo,updatedAt]);
    });
  });
  if (out.length) sh.getRange(2,1,out.length,headers.length).setValues(out);
}

function upsertProfile_(user, updatedAt) {
  var headers = ['USUARIO','ACTUALIZADO'], sh = getOrCreate_('Usuarios', headers), last = sh.getLastRow();
  var values = last > 1 ? sh.getRange(2,1,last-1,2).getValues() : [], row = -1;
  for (var i=0;i<values.length;i++) {
    if (String(values[i][0]).toLowerCase() === user.toLowerCase()) { row=i+2; break; }
  }
  if (row > 0) sh.getRange(row,1,1,2).setValues([[user,updatedAt]]);
  else sh.appendRow([user,updatedAt]);
}

function loadRoutine_(user) {
  var sh = ss_().getSheetByName(tabName_('Rutina', user));
  var routine = {Lunes:[],Martes:[],Miércoles:[],Jueves:[],Viernes:[]}, updatedAt = '', exists = !!(sh && sh.getLastRow() > 1);
  if (exists) {
    var values = sh.getRange(2,1,sh.getLastRow()-1,9).getValues();
    values.forEach(function(r){
      var day = String(r[0] || '');
      if (!routine[day]) return;
      routine[day].push({
        id:String(r[2] || ''),
        nombre:String(r[3] || ''),
        series:Number(r[4] || 0),
        reps:Number(r[5] || 0),
        peso:Number(r[6] || 0),
        alFallo:!!r[7]
      });
      if (String(r[8] || '') > updatedAt) updatedAt = String(r[8] || '');
    });
  }
  return {routine:routine,updatedAt:updatedAt,routineExists:exists};
}

function loadLogs_(user) {
  var sh = ss_().getSheetByName(tabName_('Historial', user));
  if (!sh || sh.getLastRow() <= 1) return [];
  var values = sh.getRange(2,1,sh.getLastRow()-1,10).getValues();
  return values.map(function(r){
    var ts = r[1] instanceof Date ? r[1].getTime() : (Number(r[1]) || 0);
    return {
      id:String(r[0] || ''),
      ts:ts,
      fecha:String(r[2] || ''),
      usuario:user,
      dia:String(r[4] || ''),
      exerciseId:String(r[5] || ''),
      ejercicio:String(r[6] || ''),
      set:Number(r[7] || 0),
      reps:Number(r[8] || 0),
      peso:Number(r[9] || 0)
    };
  });
}

function loadUser_(user) {
  var r = loadRoutine_(user), logs = loadLogs_(user);
  return {ok:true,user:user,routine:r.routine,routineExists:r.routineExists,updatedAt:r.updatedAt,logs:logs,version:5};
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
