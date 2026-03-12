/* ═══════════════════════════════════════
   APP.JS — Login, navegación, usuario,
             foto con crop, redes sociales,
             reservas
   ═══════════════════════════════════════ */

let userActual = null;

// ──────────────────────────────────────
// LOGIN
// ──────────────────────────────────────
function doLogin() {
  const dni = document.getElementById('input-dni').value.trim();
  const u = DB.usuarios.find(x => x.dni === dni);
  if (!u) {
    document.getElementById('login-err').style.display = 'block';
    return;
  }
  document.getElementById('login-err').style.display = 'none';
  userActual = u;
  cargarUsuario(u);
  document.getElementById('screen-login').classList.remove('active');
  document.getElementById('main-nav').style.display = 'flex';
  showScreen('home');
}

document.getElementById('input-dni').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

function doLogout() {
  userActual = null;
  document.getElementById('main-nav').style.display = 'none';
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-login').classList.add('active');
  document.getElementById('input-dni').value = '';
}

// ──────────────────────────────────────
// CARGAR DATOS DEL USUARIO EN TODA LA APP
// ──────────────────────────────────────
function cargarUsuario(u) {
  // Avatares en headers
  ['home','res','rut'].forEach(id => {
    const el = document.getElementById('avatar-' + id);
    if (el) el.textContent = u.iniciales;
  });

  // Home
  document.getElementById('hero-saludo').innerHTML = `¡Buenas,<br>${u.nombre}! 💪`;

  // Perfil cajón
  document.getElementById('pc-photo-init').textContent = u.iniciales;
  document.getElementById('pc-name').textContent = u.nombreCompleto.toUpperCase();
  document.getElementById('pc-plan').textContent = `Plan ${u.plan} ${u.plan === 'Premium' ? '💎' : '⭐'}`;
  document.getElementById('pc-since').textContent = `Miembro desde ${u.fechaInicio}`;

  // Membresía
  document.getElementById('memb-ultimo').textContent   = u.ultimoPago;
  document.getElementById('memb-proximo').textContent  = u.proximoPago;

  const card  = document.getElementById('memb-card');
  const mol   = document.getElementById('molinete');
  const dot   = document.getElementById('mol-dot');

  if (u.activo) {
    card.className = 'memb-card ok';
    mol.className  = 'molinete ok';
    dot.className  = 'mol-dot g';
    document.getElementById('mol-title').textContent = '✅ Acceso habilitado';
    document.getElementById('mol-sub').textContent   = 'Tu membresía está al día.';
  } else {
    card.className = 'memb-card bad';
    mol.className  = 'molinete bad';
    dot.className  = 'mol-dot r';
    document.getElementById('mol-title').textContent = '🔒 Acceso bloqueado';
    document.getElementById('mol-sub').textContent   = 'Membresía vencida. Regularizá el pago.';
  }

  // Progreso
  const pct = Math.round(u.asistenciaMes / u.clasesMes * 100);
  document.getElementById('prog-asist').textContent        = `${u.asistenciaMes}/${u.clasesMes} clases`;
  document.getElementById('prog-asist-bar').style.width    = pct + '%';

  // Construir ejercicios
  buildEjercicios();
}

// ──────────────────────────────────────
// NAVEGACIÓN
// ──────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const sc = document.getElementById('screen-' + name);
  if (sc) sc.classList.add('active');
  const ni = document.getElementById('nav-' + name);
  if (ni) ni.classList.add('active');
  window.scrollTo(0, 0);
}

// Selector de días en reservas
document.querySelectorAll('.day-btn').forEach(b => b.addEventListener('click', function () {
  document.querySelectorAll('.day-btn').forEach(x => x.classList.remove('active'));
  this.classList.add('active');
}));

// ──────────────────────────────────────
// RESERVAS
// ──────────────────────────────────────
function reservar(btn) {
  btn.textContent = 'Reservado ✓';
  btn.className   = 'book-btn booked';
  btn.disabled    = true;
  showToast('Clase reservada');
}

// ──────────────────────────────────────
// FOTO DE PERFIL CON CROP
// ──────────────────────────────────────
let cropState = { x: 0, y: 0, scale: 1, src: '', naturalW: 0, naturalH: 0 };
let dragStart  = null;
let cropImgEl  = null;

function openPhotoInput() {
  document.getElementById('photo-input').click();
}

document.getElementById('photo-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    cropState.src = ev.target.result;
    openCropOverlay(ev.target.result);
  };
  reader.readAsDataURL(file);
  // reset para poder cargar la misma foto de nuevo
  e.target.value = '';
});

function openCropOverlay(src) {
  const overlay = document.getElementById('crop-overlay');
  overlay.classList.add('show');

  cropImgEl = document.getElementById('crop-img');
  cropImgEl.src = src;
  cropImgEl.onload = () => {
    cropState.naturalW = cropImgEl.naturalWidth;
    cropState.naturalH = cropImgEl.naturalHeight;
    // tamaño inicial: encaja el alto en el círculo (220px)
    const containerSize = 220;
    const ratio = containerSize / Math.min(cropState.naturalW, cropState.naturalH);
    cropState.scale = ratio;
    cropState.x = 0;
    cropState.y = 0;
    document.getElementById('scale-slider').value = ratio * 100;
    applyCropTransform();
  };
}

function applyCropTransform() {
  if (!cropImgEl) return;
  const s = cropState.scale;
  cropImgEl.style.width  = cropState.naturalW * s + 'px';
  cropImgEl.style.height = cropState.naturalH * s + 'px';
  cropImgEl.style.left   = cropState.x + 'px';
  cropImgEl.style.top    = cropState.y + 'px';
}

// Drag para mover la imagen dentro del círculo
const cropWrap = document.getElementById('crop-circle-wrap');

cropWrap.addEventListener('pointerdown', e => {
  dragStart = { px: e.clientX, py: e.clientY, ix: cropState.x, iy: cropState.y };
  cropWrap.setPointerCapture(e.pointerId);
});
cropWrap.addEventListener('pointermove', e => {
  if (!dragStart) return;
  cropState.x = dragStart.ix + (e.clientX - dragStart.px);
  cropState.y = dragStart.iy + (e.clientY - dragStart.py);
  applyCropTransform();
});
cropWrap.addEventListener('pointerup', () => { dragStart = null; });

// Slider de zoom
document.getElementById('scale-slider').addEventListener('input', function () {
  cropState.scale = parseFloat(this.value) / 100;
  applyCropTransform();
});

function cancelCrop() {
  document.getElementById('crop-overlay').classList.remove('show');
}

function applyCrop() {
  // Renderizamos el círculo cortado a un canvas 200×200
  const size = 200;
  const canvas = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // clip circular
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI*2);
  ctx.clip();

  // La imagen se pinta con el offset y escala actuales,
  // pero mapeados desde el contenedor (220px) al canvas (200px)
  const ratio = size / 220;
  const img = new Image();
  img.src = cropState.src;
  img.onload = () => {
    ctx.drawImage(img,
      cropState.x * ratio,
      cropState.y * ratio,
      cropState.naturalW * cropState.scale * ratio,
      cropState.naturalH * cropState.scale * ratio
    );
    const dataUrl = canvas.toDataURL('image/jpeg', .92);
    applyPhotoToUI(dataUrl);
    document.getElementById('crop-overlay').classList.remove('show');
  };
}

function applyPhotoToUI(dataUrl) {
  // Foto en cajón de perfil
  const ph = document.getElementById('pc-photo-init');
  ph.style.display = 'none';
  const img = document.getElementById('pc-photo-img');
  img.src = dataUrl;
  img.style.display = 'block';

  // Avatares en headers
  ['home','res','rut'].forEach(id => {
    const av = document.getElementById('avatar-' + id);
    if (av) av.innerHTML = `<img src="${dataUrl}" alt="">`;
  });
}

// ──────────────────────────────────────
// REDES SOCIALES — modo edición / vista
// ──────────────────────────────────────
const REDES_IDS = ['ig','fb','x','tt','yt'];

function toggleEditRedes() {
  const editDiv  = document.getElementById('pc-redes-edit');
  const editBtn  = document.getElementById('pc-edit-btn');
  const isOpen   = editDiv.classList.toggle('show');
  editBtn.classList.toggle('active', isOpen);
  editBtn.querySelector('span').textContent = isOpen ? 'Listo' : 'Editar';

  if (!isOpen) {
    // Guardar y actualizar puntos verdes
    REDES_IDS.forEach(id => {
      const val = document.getElementById('red-inp-' + id).value.trim();
      const btn = document.getElementById('red-btn-' + id);
      btn.classList.toggle('filled', val !== '');
    });
    showToast('Redes guardadas');
  }
}

// ──────────────────────────────────────
// TOAST
// ──────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}
