'use strict';

/* ====================================================
   CONFIGURACIÓN
==================================================== */
const CALENDLY_URL = 'https://calendly.com/gonzalorosae/auditoria';

// Plazas: cambia solo este número para actualizar toda la web.
// Si lo pones a 0, la web entra automáticamente en modo "plazas agotadas".
const PLAZAS_DISPONIBLES = 2;
const PLAZAS_TOTAL = 3;

// Se usan cuando no quedan plazas
const TEMPORADA_ACTUAL = 'Otoño 2026';
const PROXIMA_APERTURA = '';   // '' si aún no hay fecha

// A dónde llegan los emails de la lista de espera.
// Con FormSubmit no hace falta backend: la primera vez que alguien envíe el
// formulario recibirás un email de activación que tienes que confirmar una sola vez.
// Si lo dejas vacío, el formulario abre el cliente de correo del visitante.
const FORM_ENDPOINT = 'https://formsubmit.co/ajax/gonzalorosae@gmail.com';

const SIN_PLAZAS = PLAZAS_DISPONIBLES <= 0;

/* ====================================================
   ANALÍTICA
   Envoltorio agnóstico: hoy habla con Umami, y si algún día
   cambias de herramienta solo tienes que tocar esta función.
   No se envía ningún dato personal, solo el nombre del paso.
==================================================== */
const ESTADO_PLAZAS = () => (SIN_PLAZAS ? 'agotadas' : 'disponibles');

function track(evento, datos) {
  try {
    if (window.umami && typeof window.umami.track === 'function') {
      datos ? window.umami.track(evento, datos) : window.umami.track(evento);
    }
  } catch (e) { /* la analítica nunca debe romper la página */ }
}

// Enlaces y botones marcados con data-track se registran solos
document.addEventListener('click', e => {
  const el = e.target.closest('[data-track]');
  if (el) track(el.dataset.track);
});

/* ====================================================
   CONTADOR DE PLAZAS - puntos visuales ● ● ○
   y conmutación de todo el estado "agotado"
==================================================== */
(function renderPlazas() {
  const disponibles = Math.max(0, PLAZAS_DISPONIBLES);
  const total = PLAZAS_TOTAL;
  const apertura = PROXIMA_APERTURA || '';

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
    const cuenta = SIN_PLAZAS
      ? 'Plazas agotadas'
      : `<span aria-hidden="true">⏳</span> ${disponibles} de ${total} plazas disponibles`;
    ofertaEl.innerHTML = `<span class="slot-cuenta">${cuenta}</span><span class="slot-sep"> · </span>`
      + `<span class="slot-temp">${TEMPORADA_ACTUAL}</span>`;
  }
  if (offerSlots) offerSlots.classList.toggle('agotado', SIN_PLAZAS);

  if (SIN_PLAZAS) {
    // Frase del hero
    const fraseEl = document.getElementById('plazasFrase');
    if (fraseEl) {
      const subtexto = apertura
        ? `próxima apertura ${apertura}`
        : 'reserva tu plaza para la próxima temporada ya';
      fraseEl.innerHTML = '<span class="plazas-cuenta"><strong class="plazas-alerta">Plazas agotadas esta temporada</strong></span>'
        + `<span class="plazas-sep"> - </span><span class="plazas-sub">${subtexto}</span>`;
    }

    const soldOutAperturaEl = document.getElementById('soldOutApertura');
    if (soldOutAperturaEl) {
      soldOutAperturaEl.innerHTML = apertura
        ? `La próxima apertura es <strong>${apertura}</strong>.`
        : 'Reserva tu plaza para la próxima temporada ya.';
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
const successView = document.getElementById('successView');

const answers = { nivel: null };

/* --- Abrir / cerrar --- */
document.querySelectorAll('[data-open-modal]').forEach(btn => {
  btn.addEventListener('click', () => {
    track('modal_abierto', { origen: btn.dataset.origen || 'sin-marcar', plazas: ESTADO_PLAZAS() });
    openModal(btn);
  });
});

// El modal es un <dialog>: el navegador atrapa el foco dentro, cierra con Escape
// y devuelve el foco al botón que lo abrió.
let disparador = null;

function openModal(origen) {
  disparador = origen || null;
  resetModal();
  if (typeof overlay.showModal === 'function') overlay.showModal();
  else overlay.setAttribute('open', '');   // navegadores sin <dialog>
  document.body.style.overflow = 'hidden';
  enfocarVista('formFlow');
}

function closeModal() {
  if (typeof overlay.close === 'function') {
    overlay.close();               // dispara el evento "close", que hace la limpieza
  } else {
    overlay.removeAttribute('open');
    alCerrarModal();
  }
}

function alCerrarModal() {
  document.body.style.overflow = '';
  if (disparador && disparador.isConnected) disparador.focus({ preventScroll: true });
  disparador = null;
}

overlay.addEventListener('close', alCerrarModal);
modalClose.addEventListener('click', closeModal);
document.querySelectorAll('[data-cerrar-modal]').forEach(b => b.addEventListener('click', closeModal));

// Clic fuera de la caja: cierra. Clic en un enlace interno (#contacto...): cierra y deja navegar.
overlay.addEventListener('click', e => {
  if (e.target === overlay || e.target.closest('a[href^="#"]')) closeModal();
});

// Lleva el foco al título de la vista activa para teclado y lectores de pantalla
function enfocarVista(id) {
  const vista = document.getElementById(id);
  const titulo = vista && vista.querySelector('h3, h4');
  if (!titulo) return;
  titulo.setAttribute('tabindex', '-1');
  titulo.focus({ preventScroll: true });
}

/* --- Mostrar step --- */
function showStep(step) {
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  const target = document.querySelector(`.form-step[data-step="${step}"]`);
  if (target) target.classList.add('active');
}

/* --- Opciones de nivel en rejilla --- */
document.querySelectorAll('.option-grid').forEach(list => {
  list.addEventListener('click', e => {
    const btn = e.target.closest('.option-btn');
    if (!btn) return;
    list.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const field = list.dataset.field;
    const value = btn.dataset.value;
    const dq = btn.dataset.dq;
    answers[field] = value;
    // Con intención clara de reservar, Calendly se descarga mientras se ve la transición
    if (field === 'nivel' && dq !== 'dq' && !SIN_PLAZAS) cargarCalendly().catch(() => { });
    setTimeout(() => {
      if (field === 'nivel') {
        track('nivel_elegido', { nivel: value, cualifica: dq === 'dq' ? 'no' : 'si' });
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
  enfocarVista(id);
}

/* --- Cualificado: si no hay plazas, pasa antes por la pantalla de espera --- */
function showSuccess() {
  if (SIN_PLAZAS) {
    track('agotado_pantalla');
    mostrarVista('soldOutView');
    return;
  }
  mostrarCalendly();
}

/* --- Calendly: el script y la hoja de estilos solo se piden cuando alguien llega a reservar.
       Antes se descargaban en todas las visitas, sin que nadie hubiera pulsado nada. --- */
let calendlyPromesa = null;

function cargarCalendly() {
  if (window.Calendly) return Promise.resolve();
  if (calendlyPromesa) return calendlyPromesa;

  calendlyPromesa = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://assets.calendly.com/assets/external/widget.css';
    document.head.appendChild(css);

    const js = document.createElement('script');
    js.src = 'https://assets.calendly.com/assets/external/widget.js';
    js.async = true;
    js.onload = () => (window.Calendly ? resolve() : reject(new Error('Calendly no disponible')));
    js.onerror = () => { calendlyPromesa = null; reject(new Error('No se pudo cargar Calendly')); };
    document.head.appendChild(js);
  });
  return calendlyPromesa;
}

/* --- Vista éxito + Calendly --- */
function mostrarCalendly() {
  track('calendly_mostrado', { plazas: ESTADO_PLAZAS() });
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

  const marco = document.getElementById('calFrame');
  const container = document.getElementById('calendlyWidget');
  if (container && !container.dataset.cargado) {
    container.dataset.cargado = '1';

    const terminar = () => { if (marco) marco.classList.add('is-loaded'); };

    // Plan B: si Calendly falla o tarda demasiado, enlace directo
    const alternativa = () => {
      terminar();
      const link = document.createElement('a');
      link.href = CALENDLY_URL;
      link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.className = 'btn btn-primary btn-lg btn-block';
      link.style.marginTop = '1rem';
      link.textContent = 'Abrir calendario ↗';
      container.replaceWith(link);
    };
    const limite = setTimeout(alternativa, 15000);

    cargarCalendly().then(() => {
      // El esqueleto se retira cuando el iframe de Calendly termina de cargar
      const observador = new MutationObserver(() => {
        const iframe = container.querySelector('iframe');
        if (!iframe) return;
        observador.disconnect();
        iframe.addEventListener('load', () => { clearTimeout(limite); terminar(); }, { once: true });
      });
      observador.observe(container, { childList: true, subtree: true });
      window.Calendly.initInlineWidget({ url: CALENDLY_URL, parentElement: container, utm: {} });
    }).catch(() => { clearTimeout(limite); alternativa(); });
  }

  if (!document.getElementById('waLink')) {
    const waMsg = encodeURIComponent('Hola, quiero reservar mi Auditoría de Acento gratuita.');
    const waEl = document.createElement('a');
    waEl.id = 'waLink';
    waEl.href = `https://wa.me/34956079630?text=${waMsg}`;
    waEl.target = '_blank'; waEl.rel = 'noopener noreferrer';
    waEl.className = 'btn btn-ghost btn-block';
    waEl.dataset.track = 'calendly_prefiere_whatsapp';
    waEl.style.cssText = 'margin-top:0.6rem;font-size:0.85rem';
    waEl.textContent = '¿Prefieres avisarme por WhatsApp?';
    successView.appendChild(waEl);
  }
}

/* ====================================================
   PLAZAS AGOTADAS: prioridad o lista de espera
==================================================== */
document.getElementById('soAgendar')?.addEventListener('click', () => {
  track('agotado_elige_auditoria');
  mostrarCalendly();
});
document.getElementById('wlOkAgendar')?.addEventListener('click', () => {
  track('agotado_rescate_auditoria');
  mostrarCalendly();
});
document.getElementById('soLista')?.addEventListener('click', () => {
  track('agotado_elige_lista');
  mostrarVista('waitlistView');
});
document.getElementById('wlBack')?.addEventListener('click', () => mostrarVista('soldOutView'));

function wlMostrarError(msgHtml) {
  const err = document.getElementById('wlError');
  if (!err) return;
  err.innerHTML = msgHtml;
  err.classList.remove('hidden');
}

function wlMailtoFallback(nombre, email) {
  const asunto = encodeURIComponent('Lista de espera - The British Voice Method');
  const cuerpo = encodeURIComponent(
    `Hola Gonzalo:\n\nQuiero que me avises cuando se abra una plaza.\n\n`
    + `Nombre: ${nombre}\nEmail: ${email}\n`
    + `Acepto la política de privacidad (${new Date().toISOString()}).\n`);
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

  const consentEl = document.getElementById('wlConsent');
  if (consentEl && !consentEl.checked) {
    wlMostrarError('Necesito que aceptes la política de privacidad para poder guardar tu correo.');
    consentEl.focus();
    return;
  }

  const wlOk = () => {
    track('lista_espera_alta');
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
        temporada: TEMPORADA_ACTUAL,
        consentimiento: 'Aceptada la política de privacidad en el formulario web',
        consentimiento_fecha: new Date().toISOString()
      })
    });
    if (!res.ok) throw new Error('Respuesta ' + res.status);

    // Un 200 no basta: si el endpoint aún no está activado, FormSubmit responde
    // correctamente pero NO reenvía el correo. Solo damos el alta por buena
    // cuando la respuesta confirma el éxito de forma explícita.
    let data = null;
    try { data = await res.json(); } catch (_) { data = null; }
    const confirmado = data && String(data.success).toLowerCase() === 'true';
    if (!confirmado) throw new Error('Envío no confirmado por el servicio de formularios');

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
    text.innerHTML = 'Con B1 el programa aún no sería lo más efectivo, pero estás a un paso. Si quieres puedes escribirme un mensaje o correo para ver tu caso en específico. Puedes encontrar mis datos de contacto <a class="dq-link" href="#contacto">abajo del todo</a>.';
  } else {
    title.textContent = 'Aún no es el momento';
    text.innerHTML = 'El programa está diseñado para B2-C2. Con nivel ' + nivel.toUpperCase() + ' lo que más te ayudaría ahora es consolidar el inglés general.';
  }
}

/* --- Me equivoqué de nivel: volver a la pregunta --- */
document.getElementById('dqBack')?.addEventListener('click', () => {
  document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
  answers.nivel = null;
  mostrarVista('formFlow');
});

/* --- Reset modal --- */
function resetModal() {
  mostrarVista('formFlow');

  answers.nivel = null;
  document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
  ['wlNombre', 'wlEmail'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.style.borderColor = ''; }
  });

  document.getElementById('wlError')?.classList.add('hidden');
  const consentReset = document.getElementById('wlConsent');
  if (consentReset) consentReset.checked = false;

  showStep(1);
}

/* ====================================================
   FAQ ACORDEÓN
==================================================== */
document.querySelectorAll('.faq-pregunta').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    if (!isOpen) track('faq_abierta', { pregunta: btn.textContent.replace('+', '').trim().slice(0, 60) });
    document.querySelectorAll('.faq-item').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.faq-pregunta').setAttribute('aria-expanded', 'false');
      i.querySelector('.faq-respuesta').style.maxHeight = null;
    });
    if (!isOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      const resp = item.querySelector('.faq-respuesta');
      resp.style.maxHeight = resp.scrollHeight + 'px';
    }
  });
});

// Si cambia el ancho con una respuesta abierta (por ejemplo al girar el móvil),
// se recalcula su altura para que el texto no quede cortado
window.addEventListener('resize', () => {
  const abierta = document.querySelector('.faq-item.open .faq-respuesta');
  if (abierta) abierta.style.maxHeight = abierta.scrollHeight + 'px';
});

/* ====================================================
   AUDIO PLAYER CUSTOM
==================================================== */
(function initAudio() {
  const fmt = s => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  const BAR_COUNT = 40;

  // Picos reales del audio (Web Audio). Antes las barras se generaban con Math.random()
  // y cambiaban en cada visita, sin relación con la grabación.
  async function calcularPicos(url, n) {
    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error('Audio no disponible');
    const datos = await respuesta.arrayBuffer();
    const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Ctx) throw new Error('Web Audio no disponible');
    const ctx = new Ctx(1, 44100, 44100);
    const audio = await new Promise((ok, ko) => ctx.decodeAudioData(datos, ok, ko));

    const canal = audio.getChannelData(0);
    const tramo = Math.floor(canal.length / n);
    const paso = Math.max(1, Math.floor(tramo / 400));
    const picos = [];
    for (let i = 0; i < n; i++) {
      let suma = 0, cuenta = 0;
      for (let j = i * tramo; j < (i + 1) * tramo; j += paso) { suma += canal[j] * canal[j]; cuenta++; }
      picos.push(Math.sqrt(suma / (cuenta || 1)));
    }
    const max = Math.max(...picos) || 1;
    return picos.map(p => p / max);
  }

  function initPlayer(audioId, playBtnId, barsWrapId, timeCurId, timeTotalId, nombre) {
    const audio = document.getElementById(audioId);
    const playBtn = document.getElementById(playBtnId);
    const barsWrap = document.getElementById(barsWrapId);
    const timeCur = document.getElementById(timeCurId);
    const timeTotal = document.getElementById(timeTotalId);
    if (!audio || !playBtn || !barsWrap) return;

    // Las barras son decorativas: el progreso lo comunican el tiempo y el botón
    barsWrap.setAttribute('aria-hidden', 'true');
    barsWrap.classList.add('is-loading');
    for (let i = 0; i < BAR_COUNT; i++) {
      const bar = document.createElement('span');
      bar.style.height = '18%';
      barsWrap.appendChild(bar);
    }
    const bars = barsWrap.querySelectorAll('span');

    // La forma de onda se calcula cuando la sección está a punto de verse (no antes: son unos 580 KB de audio)
    let ondaIniciada = false;
    const cargarOnda = () => {
      if (ondaIniciada) return;
      ondaIniciada = true;
      calcularPicos(audio.getAttribute('src'), BAR_COUNT)
        .then(picos => picos.forEach((p, i) => { bars[i].style.height = Math.max(7, Math.round(p * 100)) + '%'; }))
        .catch(() => { /* si falla, se quedan barras planas: mejor que inventarlas */ })
        .finally(() => barsWrap.classList.remove('is-loading'));
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entradas => {
        if (entradas.some(en => en.isIntersecting)) { cargarOnda(); io.disconnect(); }
      }, { rootMargin: '120px 0px' });
      io.observe(playBtn);
    } else {
      cargarOnda();
    }

    audio.addEventListener('loadedmetadata', () => { if (timeTotal) timeTotal.textContent = fmt(audio.duration); });
    audio.addEventListener('timeupdate', () => {
      if (timeCur) timeCur.textContent = fmt(audio.currentTime);
      const played = Math.round((audio.currentTime / (audio.duration || 1)) * bars.length);
      bars.forEach((b, i) => b.classList.toggle('played', i < played));
    });

    // El botón refleja el estado real del audio (también cuando otro reproductor lo pausa)
    const marcarPlay = () => { playBtn.textContent = '⏸'; playBtn.setAttribute('aria-label', `Pausar ${nombre}`); };
    const marcarPausa = () => { playBtn.textContent = '▶'; playBtn.setAttribute('aria-label', `Reproducir ${nombre}`); };
    audio.addEventListener('play', marcarPlay);
    audio.addEventListener('pause', marcarPausa);
    audio.addEventListener('ended', () => {
      marcarPausa();
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
        audio.play().catch(() => { });
        track('audio_play', { pista: audioId === 'audioDemo' ? 'despues' : 'antes' });
      } else {
        audio.pause();
      }
    });
  }

  // Player "antes"
  initPlayer('audioDemoAntes', 'audioPlayBtnAntes', 'audioBaresAntes', 'audioTimeCurrentAntes', 'audioTimeTotalAntes', 'antes');
  // Player "después"
  initPlayer('audioDemo', 'audioPlayBtnDespues', 'audioBaresDespues', 'audioTimeCurrentDespues', 'audioTimeTotalDespues', 'después');
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
   SMOOTH SCROLL
==================================================== */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.getElementById(a.getAttribute('href').slice(1));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});