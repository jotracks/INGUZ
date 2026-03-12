/* ═══════════════════════════════════════
   DATA.JS — Base de datos simulada,
             definición de ejercicios,
             opciones de selectores
   ═══════════════════════════════════════ */

// ──────────────────────────────────────
// USUARIOS (simula lo que vendría del server)
// ──────────────────────────────────────
const DB = {
  usuarios: [
    {
      id: 1, dni: "28541963",
      nombre: "Jota", apellido: "Mossotto",
      nombreCompleto: "Jota Mossotto", iniciales: "JM",
      plan: "Premium", activo: true,
      fechaInicio: "Enero 2024",
      ultimoPago: "15 Feb 2025", proximoPago: "15 Mar 2025",
      asistenciaMes: 18, clasesMes: 22
    },
    {
      id: 2, dni: "35102847",
      nombre: "Laura", apellido: "González",
      nombreCompleto: "Laura González", iniciales: "LG",
      plan: "Básico", activo: false,
      fechaInicio: "Marzo 2024",
      ultimoPago: "01 Ene 2025", proximoPago: "01 Feb 2025",
      asistenciaMes: 4, clasesMes: 22
    }
  ]
};

// ──────────────────────────────────────
// ICONOS SVG OUTLINE para clases / reservas
// ──────────────────────────────────────
const ICONS = {
  box:        `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
  muscu:      `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5a5 5 0 0 1 7 7l-7 7-7-7a5 5 0 0 1 7-7z"/><path d="M17.5 6.5a5 5 0 0 1 0 7"/><line x1="12" y1="12" x2="22" y2="2"/></svg>`,
  funcional:  `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><path d="M12 6v6l4 2"/><path d="M6 12H4m16 0h-2"/><circle cx="12" cy="12" r="6"/></svg>`,
  hiit:       `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  stretching: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2"/><path d="M9 20l3-8 3 8"/><path d="M6 10l6-2 6 2"/></svg>`,
  // nav icons
  home:    `<svg class="nav-svg" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  calendar:`<svg class="nav-svg" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  dumbbell:`<svg class="nav-svg" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5a5 5 0 0 1 7 7l-7 7-7-7a5 5 0 0 1 7-7z"/><path d="M17.5 6.5a5 5 0 0 1 0 7"/><line x1="12" y1="12" x2="22" y2="2"/></svg>`,
  user:    `<svg class="nav-svg" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
};

// ──────────────────────────────────────
// DEFINICIÓN DE EJERCICIOS
// svg: contenido interno del viewBox 56x56
// ──────────────────────────────────────
const GRUPOS = {
  pecho: [
    {
      id:'pe1', name:'Press Banca Plano',
      det:'4 series · 8–10 reps · 70 kg',
      svg:`<rect width="56" height="56" fill="#1c1c1c"/>
           <rect x="10" y="36" width="36" height="5" rx="2" fill="#222"/>
           <rect x="6" y="22" width="44" height="4" rx="2" fill="none" stroke="#5cb85c" stroke-width="2"/>
           <rect x="4" y="18" width="6" height="12" rx="2" fill="none" stroke="#5cb85c" stroke-width="1.5"/>
           <rect x="46" y="18" width="6" height="12" rx="2" fill="none" stroke="#5cb85c" stroke-width="1.5"/>
           <ellipse cx="28" cy="32" rx="8" ry="5" fill="none" stroke="#888" stroke-width="1.5"/>
           <circle cx="28" cy="37" r="4" fill="none" stroke="#aaa" stroke-width="1.5"/>
           <line x1="20" y1="28" x2="14" y2="24" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="36" y1="28" x2="42" y2="24" stroke="#888" stroke-width="2" stroke-linecap="round"/>`
    },
    {
      id:'pe2', name:'Press Inclinado',
      det:'3 series · 10 reps · 55 kg',
      svg:`<rect width="56" height="56" fill="#1c1c1c"/>
           <rect x="8" y="16" width="40" height="4" rx="2" fill="none" stroke="#5cb85c" stroke-width="2" transform="rotate(-5 8 16)"/>
           <rect x="4" y="13" width="6" height="10" rx="2" fill="none" stroke="#5cb85c" stroke-width="1.5"/>
           <rect x="46" y="12" width="6" height="10" rx="2" fill="none" stroke="#5cb85c" stroke-width="1.5"/>
           <ellipse cx="26" cy="28" rx="7" ry="4" fill="none" stroke="#888" stroke-width="1.5" transform="rotate(-20 26 28)"/>
           <circle cx="22" cy="35" r="4" fill="none" stroke="#aaa" stroke-width="1.5"/>
           <line x1="20" y1="24" x2="14" y2="20" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="33" y1="22" x2="39" y2="19" stroke="#888" stroke-width="2" stroke-linecap="round"/>`
    },
    {
      id:'pe3', name:'Aperturas Mancuernas',
      det:'3 series · 12 reps · 18 kg',
      svg:`<rect width="56" height="56" fill="#1c1c1c"/>
           <rect x="10" y="36" width="36" height="5" rx="2" fill="#222"/>
           <circle cx="28" cy="30" r="7" fill="none" stroke="#888" stroke-width="1.5"/>
           <circle cx="28" cy="24" r="4" fill="none" stroke="#aaa" stroke-width="1.5"/>
           <line x1="21" y1="30" x2="8" y2="24" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="35" y1="30" x2="48" y2="24" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <circle cx="7" cy="23" r="4" fill="none" stroke="#5cb85c" stroke-width="1.8"/>
           <circle cx="49" cy="23" r="4" fill="none" stroke="#5cb85c" stroke-width="1.8"/>`
    },
    {
      id:'pe4', name:'Fondos en Paralelas',
      det:'3 series · 12 reps · Corporal',
      svg:`<rect width="56" height="56" fill="#1c1c1c"/>
           <rect x="8" y="20" width="4" height="22" rx="2" fill="none" stroke="#5cb85c" stroke-width="1.8"/>
           <rect x="44" y="20" width="4" height="22" rx="2" fill="none" stroke="#5cb85c" stroke-width="1.8"/>
           <rect x="5" y="17" width="10" height="5" rx="2" fill="none" stroke="#5cb85c" stroke-width="1.5"/>
           <rect x="41" y="17" width="10" height="5" rx="2" fill="none" stroke="#5cb85c" stroke-width="1.5"/>
           <circle cx="28" cy="14" r="5" fill="none" stroke="#aaa" stroke-width="1.5"/>
           <rect x="23" y="19" width="10" height="12" rx="3" fill="none" stroke="#888" stroke-width="1.5"/>
           <line x1="23" y1="24" x2="13" y2="21" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="33" y1="24" x2="43" y2="21" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="26" y1="31" x2="24" y2="43" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="30" y1="31" x2="32" y2="43" stroke="#888" stroke-width="2" stroke-linecap="round"/>`
    },
    {
      id:'pe5', name:'Extensión Tríceps Polea',
      det:'4 series · 12 reps · 25 kg',
      svg:`<rect width="56" height="56" fill="#1c1c1c"/>
           <rect x="42" y="4" width="6" height="46" rx="2" fill="none" stroke="#444" stroke-width="1.5"/>
           <circle cx="45" cy="9" r="4" fill="none" stroke="#5cb85c" stroke-width="1.8"/>
           <line x1="45" y1="13" x2="31" y2="22" stroke="#555" stroke-width="1.2"/>
           <circle cx="24" cy="13" r="5" fill="none" stroke="#aaa" stroke-width="1.5"/>
           <rect x="19" y="18" width="10" height="14" rx="3" fill="none" stroke="#888" stroke-width="1.5"/>
           <line x1="29" y1="24" x2="31" y2="22" stroke="#888" stroke-width="1.8" stroke-linecap="round"/>
           <line x1="29" y1="24" x2="30" y2="34" stroke="#888" stroke-width="2.5" stroke-linecap="round"/>
           <rect x="27" y="34" width="7" height="3" rx="1.5" fill="none" stroke="#5cb85c" stroke-width="1.5"/>
           <line x1="22" y1="32" x2="20" y2="46" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="28" y1="32" x2="30" y2="46" stroke="#888" stroke-width="2" stroke-linecap="round"/>`
    }
  ],
  espalda: [
    {
      id:'es1', name:'Dominadas',
      det:'4 series · 8 reps · Corporal',
      svg:`<rect width="56" height="56" fill="#1c1c1c"/>
           <rect x="6" y="20" width="44" height="4" rx="2" fill="none" stroke="#5cb85c" stroke-width="2"/>
           <rect x="4" y="16" width="6" height="12" rx="2" fill="none" stroke="#5cb85c" stroke-width="1.5"/>
           <rect x="46" y="16" width="6" height="12" rx="2" fill="none" stroke="#5cb85c" stroke-width="1.5"/>
           <circle cx="28" cy="36" r="5" fill="none" stroke="#aaa" stroke-width="1.5"/>
           <rect x="22" y="24" width="12" height="10" rx="3" fill="none" stroke="#888" stroke-width="1.5"/>
           <line x1="22" y1="22" x2="14" y2="21" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="34" y1="22" x2="42" y2="21" stroke="#888" stroke-width="2" stroke-linecap="round"/>`
    },
    {
      id:'es2', name:'Remo con Mancuerna',
      det:'4 series · 10 reps · 32 kg',
      svg:`<rect width="56" height="56" fill="#1c1c1c"/>
           <rect x="10" y="34" width="36" height="5" rx="2" fill="#222"/>
           <circle cx="28" cy="26" r="6" fill="none" stroke="#888" stroke-width="1.5"/>
           <circle cx="28" cy="20" r="4" fill="none" stroke="#aaa" stroke-width="1.5"/>
           <line x1="22" y1="28" x2="14" y2="33" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="34" y1="28" x2="42" y2="24" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <rect x="38" y="20" width="9" height="8" rx="2" fill="none" stroke="#5cb85c" stroke-width="1.8"/>`
    },
    {
      id:'es3', name:'Curl Bíceps Barra',
      det:'3 series · 12 reps · 30 kg',
      svg:`<rect width="56" height="56" fill="#1c1c1c"/>
           <circle cx="28" cy="13" r="5" fill="none" stroke="#aaa" stroke-width="1.5"/>
           <rect x="23" y="18" width="10" height="14" rx="3" fill="none" stroke="#888" stroke-width="1.5"/>
           <line x1="23" y1="27" x2="14" y2="31" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="33" y1="27" x2="42" y2="31" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <rect x="8" y="29" width="40" height="4" rx="2" fill="none" stroke="#5cb85c" stroke-width="2"/>
           <rect x="4" y="26" width="6" height="10" rx="2" fill="none" stroke="#5cb85c" stroke-width="1.5"/>
           <rect x="46" y="26" width="6" height="10" rx="2" fill="none" stroke="#5cb85c" stroke-width="1.5"/>`
    }
  ],
  piernas: [
    {
      id:'pi1', name:'Sentadilla con Barra',
      det:'4 series · 8 reps · 80 kg',
      svg:`<rect width="56" height="56" fill="#1c1c1c"/>
           <rect x="6" y="17" width="44" height="4" rx="2" fill="none" stroke="#5cb85c" stroke-width="2"/>
           <rect x="4" y="13" width="6" height="12" rx="2" fill="none" stroke="#5cb85c" stroke-width="1.5"/>
           <rect x="46" y="13" width="6" height="12" rx="2" fill="none" stroke="#5cb85c" stroke-width="1.5"/>
           <circle cx="28" cy="13" r="5" fill="none" stroke="#aaa" stroke-width="1.5"/>
           <rect x="22" y="18" width="12" height="10" rx="2" fill="none" stroke="#888" stroke-width="1.5"/>
           <line x1="22" y1="28" x2="17" y2="42" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="34" y1="28" x2="39" y2="42" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="17" y1="42" x2="13" y2="48" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="39" y1="42" x2="43" y2="48" stroke="#888" stroke-width="2" stroke-linecap="round"/>`
    },
    {
      id:'pi2', name:'Prensa de Piernas',
      det:'4 series · 12 reps · 140 kg',
      svg:`<rect width="56" height="56" fill="#1c1c1c"/>
           <rect x="6" y="28" width="30" height="20" rx="4" fill="none" stroke="#444" stroke-width="1.5"/>
           <rect x="10" y="22" width="22" height="8" rx="2" fill="none" stroke="#5cb85c" stroke-width="2"/>
           <circle cx="16" cy="20" r="5" fill="none" stroke="#aaa" stroke-width="1.5"/>
           <line x1="18" y1="24" x2="20" y2="34" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="25" y1="24" x2="27" y2="34" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <rect x="34" y="20" width="16" height="4" rx="2" fill="none" stroke="#5cb85c" stroke-width="1.5"/>`
    },
    {
      id:'pi3', name:'Extensión Cuádriceps',
      det:'3 series · 15 reps · 50 kg',
      svg:`<rect width="56" height="56" fill="#1c1c1c"/>
           <rect x="8" y="26" width="32" height="14" rx="3" fill="none" stroke="#444" stroke-width="1.5"/>
           <circle cx="18" cy="23" r="5" fill="none" stroke="#aaa" stroke-width="1.5"/>
           <rect x="12" y="28" width="14" height="9" rx="2" fill="none" stroke="#888" stroke-width="1.5"/>
           <line x1="26" y1="35" x2="37" y2="40" stroke="#888" stroke-width="2.5" stroke-linecap="round"/>
           <rect x="35" y="37" width="11" height="5" rx="2" fill="none" stroke="#5cb85c" stroke-width="1.8"/>`
    }
  ],
  box: [
    {
      id:'bx1', name:'Combo en Bolsa',
      det:'5 rondas · 2 min · 1 min descanso',
      svg:`<rect width="56" height="56" fill="#1c1c1c"/>
           <rect x="22" y="5" width="12" height="24" rx="6" fill="none" stroke="#5cb85c" stroke-width="2"/>
           <line x1="28" y1="5" x2="28" y2="2" stroke="#555" stroke-width="1.5"/>
           <circle cx="15" cy="27" r="5" fill="none" stroke="#aaa" stroke-width="1.5"/>
           <rect x="9" y="32" width="10" height="12" rx="3" fill="none" stroke="#888" stroke-width="1.5"/>
           <line x1="19" y1="35" x2="22" y2="20" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="9" y1="36" x2="5" y2="44" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="19" y1="44" x2="21" y2="52" stroke="#888" stroke-width="2" stroke-linecap="round"/>`
    },
    {
      id:'bx2', name:'Salto a la Soga',
      det:'4 series · 1 min c/u',
      svg:`<rect width="56" height="56" fill="#1c1c1c"/>
           <circle cx="28" cy="13" r="5" fill="none" stroke="#aaa" stroke-width="1.5"/>
           <rect x="23" y="18" width="10" height="14" rx="3" fill="none" stroke="#888" stroke-width="1.5"/>
           <line x1="23" y1="23" x2="10" y2="29" stroke="#888" stroke-width="1.8" stroke-linecap="round"/>
           <line x1="33" y1="23" x2="46" y2="29" stroke="#888" stroke-width="1.8" stroke-linecap="round"/>
           <path d="M10 31 Q28 47 46 31" stroke="#5cb85c" stroke-width="2" fill="none" stroke-linecap="round"/>
           <line x1="23" y1="32" x2="20" y2="46" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="33" y1="32" x2="36" y2="46" stroke="#888" stroke-width="2" stroke-linecap="round"/>`
    },
    {
      id:'bx3', name:'Burpees',
      det:'4 series · 10 reps',
      svg:`<rect width="56" height="56" fill="#1c1c1c"/>
           <circle cx="28" cy="10" r="4" fill="none" stroke="#aaa" stroke-width="1.5"/>
           <line x1="28" y1="14" x2="28" y2="26" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="28" y1="20" x2="20" y2="28" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="28" y1="20" x2="36" y2="28" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="28" y1="26" x2="22" y2="36" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="28" y1="26" x2="34" y2="36" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="14" y1="48" x2="42" y2="48" stroke="#5cb85c" stroke-width="2" stroke-linecap="round"/>
           <line x1="14" y1="44" x2="14" y2="48" stroke="#5cb85c" stroke-width="2" stroke-linecap="round"/>
           <line x1="42" y1="44" x2="42" y2="48" stroke="#5cb85c" stroke-width="2" stroke-linecap="round"/>`
    },
    {
      id:'bx4', name:'Mountain Climbers',
      det:'4 series · 30 seg',
      svg:`<rect width="56" height="56" fill="#1c1c1c"/>
           <circle cx="44" cy="14" r="4" fill="none" stroke="#aaa" stroke-width="1.5"/>
           <line x1="44" y1="18" x2="36" y2="30" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="36" y1="30" x2="14" y2="34" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="36" y1="30" x2="28" y2="44" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="44" y1="26" x2="36" y2="38" stroke="#888" stroke-width="2" stroke-linecap="round"/>
           <line x1="14" y1="34" x2="10" y2="42" stroke="#5cb85c" stroke-width="2" stroke-linecap="round"/>
           <line x1="14" y1="34" x2="20" y2="42" stroke="#5cb85c" stroke-width="2" stroke-linecap="round"/>`
    }
  ]
};

// ──────────────────────────────────────
// OPCIONES PARA LOS SELECTORES
// ──────────────────────────────────────
function buildKgOptions() {
  let html = '<option value="">— kg —</option>';
  // De 0 a 10 en pasos de 1
  for (let i = 0; i <= 10; i++) html += `<option value="${i}">${i}</option>`;
  // De 12 a 200 en pasos de 2.5
  for (let i = 12.5; i <= 200; i += 2.5) {
    const label = Number.isInteger(i) ? i : i.toFixed(1);
    html += `<option value="${i}">${label}</option>`;
  }
  return html;
}

function buildRepOptions() {
  let html = '<option value="">— reps —</option>';
  for (let i = 1; i <= 50; i++) html += `<option value="${i}">${i}</option>`;
  return html;
}

function buildSeriesOptions() {
  let html = '<option value="">Nº</option>';
  for (let i = 1; i <= 20; i++) html += `<option value="${i}">${i}</option>`;
  return html;
}

// Cache de las opciones para no regenerarlas cada vez
const KG_OPTS     = buildKgOptions();
const REP_OPTS    = buildRepOptions();
const SERIES_OPTS = buildSeriesOptions();
