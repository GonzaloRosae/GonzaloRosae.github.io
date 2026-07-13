'use strict';

/* ====================================================
   CONFIGURACIÓN
==================================================== */
const CALENDLY_URL = 'https://calendly.com/gonzalorosae/auditoria';

// Plazas: cambia solo este número para actualizar toda la web
const PLAZAS_DISPONIBLES = 3;
const PLAZAS_TOTAL = 3;

/* ====================================================
   CONTADOR DE PLAZAS — puntos visuales ● ● ○
==================================================== */
(function renderPlazas() {
  const disponibles = PLAZAS_DISPONIBLES;
  const total = PLAZAS_TOTAL;

  // Dots en el hero
  const dotsEl = document.getElementById('plazasDots');
  if (dotsEl) {
    let html = '';
    for (let i = 0; i < total; i++) {
      const filled = i < disponibles;
      html += `<span class="plaza-dot ${filled ? 'filled' : 'empty'}" title="${filled ? 'Plaza disponible' : 'Plaza ocupada'}"></span>`;
    }
    dotsEl.innerHTML = html;
  }

  // Textos numéricos
  const textoEl = document.getElementById('plazasTexto');
  const totalEl = document.getElementById('plazasTotal');
  if (textoEl) textoEl.textContent = disponibles;
  if (totalEl) totalEl.textContent = total;

  // Badge en la oferta
  const ofertaEl = document.getElementById('plazasOferta');
  if (ofertaEl) ofertaEl.textContent = `${disponibles} de ${total} plazas disponibles`;

  // Color urgencia
  if (disponibles === 1) {
    [textoEl, ofertaEl].forEach(el => {
      if (el) { el.style.color = '#e05252'; el.style.fontWeight = '700'; }
    });
  }
})();

/* ====================================================
   MODAL DE CUALIFICACIÓN
==================================================== */
const overlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const formFlow = document.getElementById('formFlow');
const disqualifyView = document.getElementById('disqualifyView');
const successView = document.getElementById('successView');
const qualForm = document.getElementById('qualForm');
const successName = document.getElementById('successName');

const answers = { nivel: null, nombre: '', telefono: '' };
let currentStep = 1;
const TOTAL_STEPS = 2;

/* --- Abrir / cerrar --- */
document.querySelectorAll('[data-open-modal]').forEach(btn => {
  btn.addEventListener('click', openModal);
});

function openModal() {
  resetModal();
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
});

document.getElementById('dqClose')?.addEventListener('click', closeModal);
document.getElementById('dqThanksClose')?.addEventListener('click', closeModal);

/* --- Mostrar step --- */
function showStep(step) {
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  const target = document.querySelector(`.form-step[data-step="${step}"]`);
  if (target) target.classList.add('active');
  currentStep = step;
}

/* --- Opciones de nivel en rejilla --- */
document.querySelectorAll('.option-grid, .option-list').forEach(list => {
  list.addEventListener('click', e => {
    const btn = e.target.closest('.option-btn');
    if (!btn) return;
    list.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const field = list.dataset.field;
    const value = btn.dataset.value;
    const dq = btn.dataset.dq;
    answers[field] = value;
    setTimeout(() => {
      if (field === 'nivel') {
        if (dq === 'dq') { showDisqualify(value); return; }
        showStep(2);
      }
    }, 280);
  });
});

/* --- Botón atrás --- */
document.querySelectorAll('[data-back]').forEach(btn => {
  btn.addEventListener('click', () => { if (currentStep > 1) showStep(currentStep - 1); });
});

/* --- Submit paso 2 --- */
qualForm.addEventListener('submit', e => {
  e.preventDefault();
  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  if (!validarTelefono(telefono)) {
    document.getElementById('telefono').style.borderColor = '#e05252';
    document.getElementById('telefono').focus();
    return;
  }
  answers.nombre = nombre; answers.telefono = telefono;
  showSuccess(nombre);
});

/* --- Vista éxito + Calendly --- */
function showSuccess(nombre) {
  formFlow.classList.add('hidden');
  successView.classList.remove('hidden');
  successName.textContent = nombre;

  const container = document.getElementById('calendlyWidget');
  if (container && window.Calendly) {
    window.Calendly.initInlineWidget({ url: CALENDLY_URL, parentElement: container, prefill: { name: nombre }, utm: {} });
  } else if (container) {
    const link = document.createElement('a');
    link.href = `${CALENDLY_URL}?name=${encodeURIComponent(nombre)}`;
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.className = 'btn btn-primary btn-lg btn-block';
    link.style.marginTop = '1rem';
    link.textContent = 'Abrir calendario ↗';
    container.replaceWith(link);
  }

  const waMsg = encodeURIComponent(`📋 *Nueva Auditoría*\n\n*Nombre:* ${nombre}\n*WhatsApp:* ${answers.telefono}\n*Nivel:* ${answers.nivel}`);
  const waEl = document.createElement('a');
  waEl.href = `https://wa.me/34956079630?text=${waMsg}`;
  waEl.target = '_blank'; waEl.rel = 'noopener noreferrer';
  waEl.className = 'btn btn-ghost btn-block';
  waEl.style.cssText = 'margin-top:0.6rem;font-size:0.85rem';
  waEl.textContent = '¿Prefieres avisarme por WhatsApp?';
  document.getElementById('calendlyWidget')?.insertAdjacentElement('afterend', waEl);
}

/* --- Descalificación unificada --- */
function showDisqualify(nivel) {
  formFlow.classList.add('hidden');
  disqualifyView.classList.remove('hidden');

  const title = document.getElementById('dqTitle');
  const text = document.getElementById('dqText');

  if (nivel === 'b1') {
    title.textContent = 'Todavía no, pero estás muy cerca';
    text.innerHTML = 'Con B1 el programa aún no sería lo más efectivo, pero estás a un paso. Si quieres puedes escribirme un mensaje o correo para ver tu caso en específico. Puedes encontrar mis datos de contacto abajo del todo.';
  } else {
    title.textContent = 'Aún no es el momento';
    text.innerHTML = 'El programa está diseñado para B2–C2. Con nivel ' + nivel.toUpperCase() + ' lo que más te ayudaría ahora es consolidar el inglés general.';
  }
}

/* --- Enviar datos descalificado --- */
document.getElementById('dqSend')?.addEventListener('click', () => {
  const nombreEl = document.getElementById('dqNombre');
  const emailEl = document.getElementById('dqEmail');
  const nombre = nombreEl?.value.trim();
  const email = emailEl?.value.trim();

  if (!nombre) { nombreEl?.focus(); nombreEl?.style.setProperty('border-color', '#e05252'); return; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailEl?.focus(); emailEl?.style.setProperty('border-color', '#e05252'); return;
  }

  document.getElementById('dqForm').classList.add('hidden');
  document.getElementById('dqThanks').classList.remove('hidden');
  document.getElementById('dqThanksName').textContent = nombre;
});

/* --- Reset modal --- */
function resetModal() {
  formFlow.classList.remove('hidden');
  disqualifyView.classList.add('hidden');
  successView.classList.add('hidden');

  answers.nivel = null; answers.nombre = ''; answers.telefono = '';
  document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
  ['nombre', 'telefono', 'dqNombre', 'dqEmail'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.style.borderColor = ''; }
  });

  const dqForm = document.getElementById('dqForm');
  const dqThanks = document.getElementById('dqThanks');
  if (dqForm) dqForm.classList.remove('hidden');
  if (dqThanks) dqThanks.classList.add('hidden');

  successView.querySelectorAll('a.btn-ghost').forEach(el => el.remove());
  const widget = document.getElementById('calendlyWidget');
  if (widget) widget.innerHTML = '';
  showStep(1);
}

/* ====================================================
   FAQ ACORDEÓN
==================================================== */
document.querySelectorAll('.faq-pregunta').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.faq-respuesta').style.maxHeight = null;
    });
    if (!isOpen) {
      item.classList.add('open');
      const resp = item.querySelector('.faq-respuesta');
      resp.style.maxHeight = resp.scrollHeight + 'px';
    }
  });
});

/* ====================================================
   AUDIO PLAYER CUSTOM
==================================================== */
(function initAudio() {
  const fmt = s => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  function initPlayer(audioId, playBtnId, barsWrapId, timeCurId, timeTotalId) {
    const audio = document.getElementById(audioId);
    const playBtn = document.getElementById(playBtnId);
    const barsWrap = document.getElementById(barsWrapId);
    const timeCur = document.getElementById(timeCurId);
    const timeTotal = document.getElementById(timeTotalId);
    if (!audio || !playBtn || !barsWrap) return;

    const BAR_COUNT = 40;
    Array.from({ length: BAR_COUNT }, (_, i) => {
      const env = Math.sin((i / (BAR_COUNT - 1)) * Math.PI);
      const noise = 0.3 + Math.random() * 0.7;
      const bar = document.createElement('span');
      bar.style.height = Math.round(5 + env * noise * 88) + '%';
      barsWrap.appendChild(bar);
    });

    const bars = barsWrap.querySelectorAll('span');

    audio.addEventListener('loadedmetadata', () => { if (timeTotal) timeTotal.textContent = fmt(audio.duration); });
    audio.addEventListener('timeupdate', () => {
      if (timeCur) timeCur.textContent = fmt(audio.currentTime);
      const played = Math.round((audio.currentTime / (audio.duration || 1)) * bars.length);
      bars.forEach((b, i) => b.classList.toggle('played', i < played));
    });
    audio.addEventListener('ended', () => {
      playBtn.textContent = '▶';
      bars.forEach(b => b.classList.remove('played'));
    });
    playBtn.addEventListener('click', () => {
      if (audio.error) return;
      if (audio.paused) {
        // Parar todos los demás players antes de reproducir
        document.querySelectorAll('audio').forEach(a => {
          if (a !== audio) {
            a.pause();
            a.currentTime = 0;
          }
        });
        // Resetear visualmente los otros botones
        document.querySelectorAll('.audio-play-btn').forEach(b => {
          if (b !== playBtn) b.textContent = '▶';
        });
        audio.play().catch(() => { });
        playBtn.textContent = '⏸';
      } else {
        audio.pause();
        playBtn.textContent = '▶';
      }
    });
  }

  // Player "antes"
  initPlayer('audioDemoAntes', 'audioPlayBtnAntes', 'audioBaresAntes', 'audioTimeCurrentAntes', 'audioTimeTotalAntes');
  // Player "después"
  initPlayer('audioDemo', 'audioPlayBtnDespues', 'audioBaresDespues', 'audioTimeCurrentDespues', 'audioTimeTotalDespues');
})();

/* ====================================================
   ANIMACIONES DE SCROLL
==================================================== */
(function initScrollAnimations() {
  const targets = document.querySelectorAll(
    '.icp-card,.offer-panel,.opinion-caja,.evidencia-fila,.step,.faq-item,.contacto-card,.guarantee-strip,.trust-strip,.permanencia-strip,.comp-tabla'
  );

  // Si el navegador no soporta IntersectionObserver, mostrar todo directamente
  if (!('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('reveal', 'visible'));
    return;
  }

  const style = document.createElement('style');
  style.textContent = `.reveal{opacity:0;transform:translateY(20px);transition:opacity .5s ease,transform .5s ease}.reveal.visible{opacity:1;transform:translateY(0)}`;
  document.head.appendChild(style);

  targets.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${(i % 4) * 0.06}s`;
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  targets.forEach(el => io.observe(el));
})();

/* ====================================================
   WAVEFORM HERO SVG
==================================================== */
(function initHeroWaveform() {
  const container = document.querySelector('.waveform-bg');
  if (!container) return;
  const W = 1400, H = 280;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.style.cssText = 'width:100%;height:100%;';

  [['#2389c9', 0.18, '1', -1, 14], ['#c9a66b', 0.10, '1.5', 1, 18], ['#2389c9', 0.08, '1', -1, 22]].forEach(([color, op, sw, dir, dur], l) => {
    let d = `M0,${H * (0.35 + l * 0.15)}`;
    for (let x = 0; x <= W; x += W / 60) {
      const y = H * (0.35 + l * 0.15) + Math.sin(x * (0.04 + l * 0.012) + l * Math.PI * 0.7) * (28 + l * 14) * Math.sin((x / W) * Math.PI);
      d += ` L${x.toFixed(1)},${y.toFixed(1)}`;
    }
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d); path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color); path.setAttribute('stroke-width', sw);
    path.setAttribute('opacity', op);
    const anim = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
    anim.setAttribute('attributeName', 'transform'); anim.setAttribute('type', 'translate');
    anim.setAttribute('values', `0 0;${W * 0.04 * dir} 0;0 0`);
    anim.setAttribute('dur', `${dur}s`); anim.setAttribute('repeatCount', 'indefinite');
    path.appendChild(anim); svg.appendChild(path);
  });
  container.appendChild(svg);
})();

/* ====================================================
   SMOOTH SCROLL
==================================================== */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.getElementById(a.getAttribute('href').slice(1));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

function validarTelefono(valor) {
  const limpio = valor.trim().replace(/[\s\-().]/g, '');

  // Con prefijo internacional
  if (limpio.startsWith('+')) {
    return /^\+[1-9]\d{6,14}$/.test(limpio);
  }

  // Sin prefijo — se asume España
  // Móviles: 6xx, 7xx — Fijos: 8xx, 9xx
  // 9 dígitos exactos
  return /^[6789]\d{8}$/.test(limpio);
}