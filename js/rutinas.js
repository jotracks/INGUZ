/* ═══════════════════════════════════════
   RUTINAS.JS — Construcción de tarjetas,
                tracker de series,
                historial de entrenamientos
   ═══════════════════════════════════════ */

// ──────────────────────────────────────
// HISTORIAL (se guarda en memoria por sesión;
// en producción iría a la base de datos)
// ──────────────────────────────────────
const historial = {}; // { "2025-03-12": { "pe1": [{kg, reps, done}], ... } }

function getFechaHoy() {
  return new Date().toISOString().slice(0,10);
}

// ──────────────────────────────────────
// GUARDAR SERIE AL TILDAR
// ──────────────────────────────────────
function guardarYTildar(btn, exId) {
  const series = document.getElementById('sel-series-' + exId).value;
  const kg     = document.getElementById('sel-kg-'     + exId).value;
  const reps   = document.getElementById('sel-reps-'   + exId).value;

  if (!series || !kg || !reps) {
    showToast('Completá los 3 campos primero');
    return;
  }

  btn.classList.add('done');
  setTimeout(() => btn.classList.remove('done'), 1200);

  guardarSerie(exId, Date.now(), { series, kg, reps });
  showToast(`${series} series · ${kg} kg · ${reps} reps guardado`);
  renderHistorialEjercicio(exId);
}

function guardarSerie(exId, key, data) {
  const fecha = getFechaHoy();
  if (!historial[fecha]) historial[fecha] = {};
  if (!historial[fecha][exId]) historial[fecha][exId] = [];
  historial[fecha][exId].push({ ...data, ts: key });
}

// ──────────────────────────────────────
// CONSTRUIR TARJETA DE EJERCICIO
// Tracker: 3 selects (Series · Kg · Reps) + tilde + comentario
// ──────────────────────────────────────
function buildExCard(ex) {
  return `
  <div class="ex-card" id="${ex.id}">
    <div class="ex-head" onclick="toggleEx('${ex.id}')">
      <div class="ex-illus">
        <svg viewBox="0 0 56 56" fill="none">${ex.svg}</svg>
      </div>
      <div class="ex-inf">
        <div class="ex-name">${ex.name}</div>
        <div class="ex-det">${ex.det}</div>
      </div>
      <div class="ex-chk" onclick="event.stopPropagation(); toggleExDone(this)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
             stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    </div>

    <div class="ex-tracker">
      <div class="trk-lbl">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        ANOTAR SERIE
      </div>

      <!-- 3 selects en una fila + tilde -->
      <div class="trk-row">
        <div class="trk-field">
          <div class="trk-lbl-small">SERIES</div>
          <select class="trk-sel" id="sel-series-${ex.id}">
            ${SERIES_OPTS}
          </select>
        </div>
        <div class="trk-field">
          <div class="trk-lbl-small">PESO (KG)</div>
          <select class="trk-sel" id="sel-kg-${ex.id}">
            ${KG_OPTS}
          </select>
        </div>
        <div class="trk-field">
          <div class="trk-lbl-small">REPS</div>
          <select class="trk-sel" id="sel-reps-${ex.id}">
            ${REP_OPTS}
          </select>
        </div>
        <div class="trk-done" onclick="guardarYTildar(this, '${ex.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      </div>

      <!-- Mini historial del ejercicio (se llena al guardar) -->
      <div class="ex-historial" id="hist-${ex.id}"></div>

      <!-- Solo botón de comentario -->
      <button class="comment-btn" id="cbtn-${ex.id}"
              onclick="toggleComment('cm-${ex.id}', this)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Agregar comentario
      </button>

      <div class="comment-area" id="cm-${ex.id}">
        <textarea class="comment-txt" id="ctxt-${ex.id}"
          placeholder="Ej: Sentí buena tensión, subir peso la próxima…"></textarea>
        <button class="comment-save-btn" onclick="guardarComentario('${ex.id}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Guardar nota
        </button>
      </div>
    </div>
  </div>`;
}

// ──────────────────────────────────────
// CONSTRUIR TODOS LOS GRUPOS
// ──────────────────────────────────────
function buildEjercicios() {
  Object.entries(GRUPOS).forEach(([grupo, ejercicios]) => {
    const el = document.getElementById('rlist-' + grupo);
    if (el) el.innerHTML = ejercicios.map(buildExCard).join('');
  });
}

// ──────────────────────────────────────
// INTERACCIONES
// ──────────────────────────────────────
function toggleEx(id) {
  const card = document.getElementById(id);
  card.classList.toggle('open');
  if (card.classList.contains('open')) {
    renderHistorialEjercicio(id);
  }
}

function toggleExDone(el) {
  el.classList.toggle('done');
  if (el.classList.contains('done')) showToast('Ejercicio completado 💪');
}

function toggleSerieDone(el, exId, idx) {
  el.classList.toggle('done');
  if (el.classList.contains('done')) {
    const row  = el.closest('.serie-row');
    const kg   = row.querySelector('[data-type="kg"]').value;
    const reps = row.querySelector('[data-type="reps"]').value;
    guardarSerie(exId, idx, { kg, reps });
    showToast('Serie guardada');
    renderHistorialEjercicio(exId);
  }
}

function onSerieChange(exId, idx, sel) {
  const row  = sel.closest('.serie-row');
  const done = row.querySelector('.s-done');
  if (done && done.classList.contains('done')) {
    const kg   = row.querySelector('[data-type="kg"]').value;
    const reps = row.querySelector('[data-type="reps"]').value;
    guardarSerie(exId, idx, { kg, reps });
  }
}

function toggleComment(cmId, btn) {
  const area = document.getElementById(cmId);
  const open = area.classList.toggle('show');
  btn.classList.toggle('active', open);
  if (open) area.querySelector('textarea').focus();
}

function guardarComentario(exId) {
  const txt = document.getElementById('ctxt-' + exId).value.trim();
  if (!txt) { showToast('Escribí algo primero'); return; }

  // Guardar en historial
  const fecha = getFechaHoy();
  if (!historial[fecha]) historial[fecha] = {};
  historial[fecha][exId + '_nota'] = txt;

  // Cerrar el panel y dejar el botón en verde indicando que hay nota
  const area = document.getElementById('cm-' + exId);
  const btn  = document.getElementById('cbtn-' + exId);
  area.classList.remove('show');
  btn.classList.remove('active');
  btn.classList.add('has-note');
  btn.querySelector('span') && (btn.querySelector('span').textContent = 'Nota guardada ✓');

  showToast('Nota guardada');
}

// ──────────────────────────────────────
// HISTORIAL INLINE POR EJERCICIO
// ──────────────────────────────────────
function renderHistorialEjercicio(exId) {
  const el = document.getElementById('hist-' + exId);
  if (!el) return;

  const fecha   = getFechaHoy();
  const entradas = (historial[fecha] && historial[fecha][exId]) || [];

  if (entradas.length === 0) { el.innerHTML = ''; return; }

  let html = `<div class="hist-title">
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
    REGISTRADO HOY
  </div>`;

  entradas.forEach((e, i) => {
    html += `<div class="hist-row">
      <span class="hist-serie">S${i+1}</span>
      <span class="hist-val">${e.series} series</span>
      <span class="hist-val">${e.kg} kg</span>
      <span class="hist-best">${e.reps} reps</span>
    </div>`;
  });

  el.innerHTML = html;
}

function formatFecha(iso) {
  const [y,m,d] = iso.split('-');
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`;
}

// ──────────────────────────────────────
// TABS
// ──────────────────────────────────────
function switchTab(tab, tabId) {
  document.querySelectorAll('.rtab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  ['tab-pecho','tab-espalda','tab-piernas','tab-box'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === tabId ? 'block' : 'none';
  });
}
