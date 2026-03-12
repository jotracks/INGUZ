/* ═══════════════════════════════════════
   CALENDARIO.JS — Scroll de días infinito,
                   clases dinámicas en home
   ═══════════════════════════════════════ */

// ──────────────────────────────────────
// CATÁLOGO DE CLASES
// ──────────────────────────────────────
const CLASES_DEF = [
  {
    nombre: 'Box Cardio',
    hora: '18:00', dia: 'Hoy',
    lugares: 5, total: 12,
    svg: `<path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>`
  },
  {
    nombre: 'Musculación',
    hora: '7:00', dia: 'Vie',
    lugares: 12, total: 15,
    svg: `<path d="M6.5 6.5a5 5 0 0 1 7 7l-7 7-7-7a5 5 0 0 1 7-7z"/>
          <path d="M17.5 6.5a5 5 0 0 1 0 7"/>
          <line x1="12" y1="12" x2="22" y2="2"/>`
  },
  {
    nombre: 'HIIT',
    hora: '19:30', dia: 'Sáb',
    lugares: 0, total: 10,
    svg: `<polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`
  },
  {
    nombre: 'Funcional',
    hora: '9:00', dia: 'Dom',
    lugares: 8, total: 12,
    svg: `<circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>`
  },
  {
    nombre: 'Stretching',
    hora: '11:00', dia: 'Lun',
    lugares: 10, total: 15,
    svg: `<circle cx="12" cy="5" r="1"/>
          <path d="M9 20l3-8 3 8"/>
          <path d="M6 12H4m16 0h-2"/>
          <circle cx="12" cy="12" r="6"/>`
  },
  {
    nombre: 'Box Técnica',
    hora: '20:00', dia: 'Mar',
    lugares: 6, total: 8,
    svg: `<path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>`
  },
  {
    nombre: 'Cardio Core',
    hora: '8:00', dia: 'Mié',
    lugares: 3, total: 10,
    svg: `<polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`
  }
];

// ──────────────────────────────────────
// NOMBRES DE DÍAS
// ──────────────────────────────────────
const DIAS_CORTOS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

let selectedDate = null;   // Date object del día seleccionado

// ──────────────────────────────────────
// CONSTRUIR CALENDARIO SCROLL INFINITO
// Genera 90 días pasados + hoy + 90 días futuros
// ──────────────────────────────────────
// ──────────────────────────────────────
// CONSTRUIR CALENDARIO — hoy + 30 días, scroll manual
// ──────────────────────────────────────
function buildCalendario() {
  const wrap = document.getElementById('day-sel-wrap');
  if (!wrap) return;

  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  selectedDate = hoy;

  const mesLabel = hoy.toLocaleString('es', { month: 'long', year: 'numeric' });
  document.getElementById('res-mes-label').textContent =
    mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);

  let html = '';
  for (let offset = 0; offset <= 30; offset++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + offset);

    const esHoy   = offset === 0;
    const dayName = esHoy ? 'Hoy' : DIAS_CORTOS[d.getDay()];
    const dayNum  = d.getDate();
    const iso     = d.toISOString().slice(0,10);

    html += `
    <div class="day-btn ${esHoy ? 'active' : ''}"
         data-iso="${iso}"
         onclick="selectDay(this, '${iso}')">
      <div class="day-name">${dayName}</div>
      <div class="day-num">${dayNum}</div>
    </div>`;
  }

  wrap.innerHTML = html;
}

function selectDay(btn, iso) {
  document.querySelectorAll('#day-sel-wrap .day-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedDate = new Date(iso + 'T00:00:00');
}


// ──────────────────────────────────────
// CLASES EN HOME — scroll manual
// ──────────────────────────────────────
function buildClasesHome() {
  const wrap = document.getElementById('classes-scroll-wrap');
  if (!wrap) return;

  const claseHTML = (c) => {
    const sinLugares = c.lugares === 0;
    return `
    <div class="class-card ${sinLugares ? 'full' : ''}" onclick="showScreen('reservas')">
      <div class="class-card-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round">${c.svg}</svg>
      </div>
      <div class="class-name">${c.nombre}</div>
      <div class="class-time">${c.dia} · ${c.hora}</div>
      <div class="class-spots ${sinLugares ? 'spots-full' : ''}">
        ${sinLugares ? 'Completo' : c.lugares + ' lugares'}
      </div>
    </div>`;
  };

  wrap.innerHTML = CLASES_DEF.map(claseHTML).join('');
}

window.addEventListener('DOMContentLoaded', () => {
  buildCalendario();
  buildClasesHome();
});
