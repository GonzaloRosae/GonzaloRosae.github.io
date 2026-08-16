'use strict';

/* ====================================================
   CONFIGURACIÓN
==================================================== */
const CALENDLY_URL = 'https://calendly.com/gonzalorosae/auditoria';

// Plazas: cambia solo este número para actualizar toda la web.
// Si lo pones a 0, la web entra automáticamente en modo "plazas agotadas".
const PLAZAS_DISPONIBLES = 0;
const PLAZAS_TOTAL = 3;

// Se usan cuando no quedan plazas
const TEMPORADA_ACTUAL = 'Verano 2026';
const PROXIMA_APERTURA = 'enero de 2027';   // déjalo en '' si aún no tienes fecha

// A dónde llegan los emails de la lista de espera.
// Con FormSubmit no hace falta backend: la primera vez que alguien envíe el
// formulario recibirás un email de activación que tienes que confirmar una sola vez.
// Si lo dejas vacío, el formulario abre el cliente de correo del visitante.
const FORM_ENDPOINT = 'https://formsubmit.co/ajax/gonzalorosae@gmail.com';

const SIN_PLAZAS = PLAZAS_DISPONIBLES <= 0;

/* ====================================================
   CONTADOR DE PLAZAS - puntos visuales ● ● ○
   y conmutación de todo el estado "agotado"
==================================================== */
(function renderPlazas() {
  const disponibles = Math.max(0, PLAZAS_DISPONIBLES);
  const total = PLAZAS_TOTAL;
  const apertura = PROXIMA_APERTURA || 'la próxima temporada';

  document.body.classList.toggle('sin-plazas', SIN_PLAZAS);

  // Bloques que solo existen en uno de los dos estados
  document.querySelectorAll('[data-solo-agotado]').forEach(el => { el.hidden = !SIN_PLAZAS; });
  document.querySelectorAll('[data-solo-disponible]').forEach(el => { el.hidden = SIN_PLAZAS; });

  // Textos reutilizados
  document.querySelectorAll('[data-plazas-total]').forEach(el => { el.textContent = total; });
  document.querySelectorAll('[data-temporada]').forEach(el => { el.textContent = TEMPORADA_ACTUAL; });
  document.querySelectorAll('[data-proxima-apertura]').forEach(el => { el.textContent = apertura; });

  // Dots en el hero
  const dotsEl = document.getElementById('plazasDots');
  if (dotsEl) {
    let html = '';
    for (let i = 0; i < total; i++) {
      if (SIN_PLAZAS) {
        html += '<span class="plaza-dot ocupada" title="Plaza ocupada"></span>';
      } else {
        const filled = i < disponibles;
        html += `<span class="plaza-dot ${filled ? 'filled' : 'empty'}" title="${filled ? 'Plaza disponible' : 'Plaza ocupada'}"></span>`;
      }
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
  const offerSlots = document.getElementById('offerSlots');
  if (ofertaEl) {
    ofertaEl.textContent = SIN_PLAZAS
      ? `Plazas agotadas · ${TEMPORADA_ACTUAL}`
      : `⏳ ${disponibles} de ${total} plazas disponibles · ${TEMPORADA_ACTUAL}`;
  }
  if (offerSlots) offerSlots.classList.toggle('agotado', SIN_PLAZAS);

  if (SIN_PLAZAS) {
    // Frase del hero
    const fraseEl = document.getElementById('plazasFrase');
    if (fraseEl) {
      fraseEl.innerHTML = `<strong class="plazas-alerta">Plazas agotadas esta temporada</strong> - próxima apertura ${apertura}`;
    }
    // Etiquetas alternativas de los CTA
    document.querySelectorAll('[data-label-agotado]').forEach(btn => {
      const target = btn.querySelector('.btn-label, .fab-text') || btn;
      target.textContent = btn.dataset.labelAgotado;
    });
  } else if (disponibles === 1) {
    // Color urgencia
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

const answers = { nivel: null };
let currentStep = 1;

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
        showSuccess();
      }
    }, 280);
  });
});

/* --- Gestión de vistas del modal --- */
const VISTAS = ['formFlow', 'disqualifyView', 'successView', 'soldOutView', 'waitlistView', 'waitlistOk'];

function mostrarVista(id) {
  VISTAS.forEach(v => {
    const el = document.getElementById(v);
    if (el) el.classList.toggle('hidden', v !== id);
  });
}

/* --- Cualificado: si no hay plazas, pasa antes por la pantalla de espera --- */
function showSuccess() {
  if (SIN_PLAZAS) { mostrarVista('soldOutView'); return; }
  mostrarCalendly();
}

/* --- Vista éxito + Calendly --- */
function mostrarCalendly() {
  mostrarVista('successView');

  if (SIN_PLAZAS) {
    const titulo = document.getElementById('successTitulo');
    const texto = document.getElementById('successTexto');
    if (titulo) titulo.textContent = 'Vamos a reservar tu prioridad';
    if (texto) {
      texto.textContent = 'Elige el hueco que mejor te venga. Son 15 minutos por videollamada y, al terminarlos, '
        + 'entras en la lista de prioridad para la próxima plaza. No pagas nada.';
    }
  }

  const container = document.getElementById('calendlyWidget');
  if (container && !container.dataset.cargado) {
    container.dataset.cargado = '1';
    if (window.Calendly) {
      window.Calendly.initInlineWidget({ url: CALENDLY_URL, parentElement: container, utm: {} });
    } else {
      const link = document.createElement('a');
      link.href = CALENDLY_URL;
      link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.className = 'btn btn-primary btn-lg btn-block';
      link.style.marginTop = '1rem';
      link.textContent = 'Abrir calendario ↗';
      container.replaceWith(link);
    }
  }

  if (!document.getElementById('waLink')) {
    const waMsg = encodeURIComponent('Hola, quiero reservar mi Auditoría de Acento gratuita.');
    const waEl = document.createElement('a');
    waEl.id = 'waLink';
    waEl.href = `https://wa.me/34956079630?text=${waMsg}`;
    waEl.target = '_blank'; waEl.rel = 'noopener noreferrer';
    waEl.className = 'btn btn-ghost btn-block';
    waEl.style.cssText = 'margin-top:0.6rem;font-size:0.85rem';
    waEl.textContent = '¿Prefieres avisarme por WhatsApp?';
    successView.appendChild(waEl);
  }
}

/* ====================================================
   PLAZAS AGOTADAS: prioridad o lista de espera
==================================================== */
document.getElementById('soAgendar')?.addEventListener('click', mostrarCalendly);
document.getElementById('wlOkAgendar')?.addEventListener('click', mostrarCalendly);
document.getElementById('soLista')?.addEventListener('click', () => mostrarVista('waitlistView'));
document.getElementById('wlBack')?.addEventListener('click', () => mostrarVista('soldOutView'));

function wlMostrarError(msgHtml) {
  const err = document.getElementById('wlError');
  if (!err) return;
  err.innerHTML = msgHtml;
  err.classList.remove('hidden');
}

function wlMailtoFallback(nombre, email) {
  const asunto = encodeURIComponent('Lista de espera - The British Voice Method');
  const cuerpo = encodeURIComponent(`Hola Gonzalo:\n\nQuiero que me avises cuando se abra una plaza.\n\nNombre: ${nombre}\nEmail: ${email}\n`);
  return `mailto:gonzalorosae@gmail.com?subject=${asunto}&body=${cuerpo}`;
}

document.getElementById('wlSend')?.addEventListener('click', async () => {
  const nombreEl = document.getElementById('wlNombre');
  const emailEl = document.getElementById('wlEmail');
  const btn = document.getElementById('wlSend');
  const err = document.getElementById('wlError');

  const nombre = nombreEl?.value.trim() || '';
  const email = emailEl?.value.trim() || '';

  err?.classList.add('hidden');
  [nombreEl, emailEl].forEach(el => { if (el) el.style.borderColor = ''; });

  if (!nombre) {
    nombreEl?.focus();
    nombreEl?.style.setProperty('border-color', '#e05252');
    wlMostrarError('Escribe tu nombre para que sepa a quién aviso.');
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailEl?.focus();
    emailEl?.style.setProperty('border-color', '#e05252');
    wlMostrarError('Revisa el email: parece que falta algo.');
    return;
  }

  const wlOk = () => {
    const nameEl = document.getElementById('wlOkName');
    if (nameEl) nameEl.textContent = nombre;
    mostrarVista('waitlistOk');
  };

  if (!FORM_ENDPOINT) {
    window.location.href = wlMailtoFallback(nombre, email);
    wlOk();
    return;
  }

  const textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Enviando…';

  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        nombre,
        email,
        _subject: `Lista de espera - ${nombre}`,
        _captcha: 'false',
        origen: 'Lista de espera (plazas agotadas)',
        temporada: TEMPORADA_ACTUAL
      })
    });
    if (!res.ok) throw new Error('Respuesta ' + res.status);
    wlOk();
  } catch (e) {
    wlMostrarError(
      'No he podido enviarlo desde aquí. <a href="' + wlMailtoFallback(nombre, email) + '">Mándamelo por correo</a> '
      + 'y te apunto yo mismo.'
    );
  } finally {
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
});

/* --- Descalificación unificada --- */
function showDisqualify(nivel) {
  mostrarVista('disqualifyView');

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
  mostrarVista('formFlow');

  answers.nivel = null;
  document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
  ['dqNombre', 'dqEmail', 'wlNombre', 'wlEmail'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.style.borderColor = ''; }
  });

  const dqForm = document.getElementById('dqForm');
  const dqThanks = document.getElementById('dqThanks');
  if (dqForm) dqForm.classList.remove('hidden');
  if (dqThanks) dqThanks.classList.add('hidden');
  document.getElementById('wlError')?.classList.add('hidden');

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