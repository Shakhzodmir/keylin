/* Keylin Cosmetics: приглашение. Язык, заставка с ключом, история, визитки, таймер, карта, форма, календарь. */
(function () {
  'use strict';

  var CFG = window.KELIN || {};
  var DICT = window.KELIN_I18N || {};
  var root = document.documentElement;
  var body = document.body;
  var reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var SVGNS = 'http://www.w3.org/2000/svg';
  var XLINK = 'http://www.w3.org/1999/xlink';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  /* ───────── язык ───────── */
  var lang = 'uz';

  function readStore() { try { return localStorage.getItem('kl_lang'); } catch (e) { return null; } }
  function writeStore(v) { try { localStorage.setItem('kl_lang', v); } catch (e) { /* приватный режим */ } }
  function pickLang() {
    var m = /[?&]lang=(uz|ru)\b/.exec(location.search);
    if (m) return m[1];
    var s = readStore();
    return s === 'uz' || s === 'ru' ? s : 'uz';
  }
  function tr(key) {
    var d = DICT[lang] || DICT.uz || {};
    if (d[key] !== undefined) return d[key];
    var f = (DICT.uz || {})[key];
    return f !== undefined ? f : key;
  }

  /* ───────── дата открытия ───────── */
  var O = CFG.opening || { year: 2026, month: 10, day: 25, hour: 10, minute: 0, tzOffset: 5, durationHours: 3 };
  var TZ = O.tzOffset === undefined ? 5 : O.tzOffset;
  var target = Date.UTC(O.year, O.month - 1, O.day, O.hour - TZ, O.minute || 0);

  function timeText() { return pad2(O.hour) + ':' + pad2(O.minute || 0); }
  function weekdayText() { return tr('days')[new Date(Date.UTC(O.year, O.month - 1, O.day)).getUTCDay()]; }
  function monthText() { return tr('months')[O.month - 1]; }
  function addressText() { var a = (CFG.address || {})[lang]; return a ? a : tr('venue.fallback'); }

  function bindText() {
    var map = {
      day: String(O.day),
      monthYear: monthText() + ' ' + O.year,
      weekday: cap(weekdayText()),
      timeAt: tr('hero.at') + ' ' + timeText(),
      when: tr('venue.when').replace('{weekday}', weekdayText()).replace('{day}', O.day).replace('{month}', monthText()).replace('{time}', timeText()),
      address: addressText(),
      phone: phoneOf(person()).label,
      email: person().email || '',
      coordinates: (CFG.coords || {}).lat + '° N · ' + (CFG.coords || {}).lng + '° E'
    };
    $$('[data-bind]').forEach(function (el) {
      var k = el.getAttribute('data-bind');
      if (map[k] !== undefined) el.textContent = map[k];
    });
  }

  /* ───────── рамки под фото и видео ───────── */
  var svgIcon = function (name) {
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('class', 'ic');
    s.setAttribute('aria-hidden', 'true');
    var u = document.createElementNS(SVGNS, 'use');
    u.setAttribute('href', '#i-' + name);
    u.setAttributeNS(XLINK, 'xlink:href', '#i-' + name);
    s.appendChild(u);
    return s;
  };

  var videos = [];

  function mountVideo(slot, id, m) {
    var v = document.createElement('video');
    v.src = m.src;
    if (m.poster) v.poster = m.poster;
    v.preload = 'metadata';
    v.loop = true;
    v.setAttribute('playsinline', '');
    slot.appendChild(v);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slot-play';
    btn.setAttribute('data-i18n-attr', 'aria-label:slot.play');
    var ring = document.createElement('span');
    ring.appendChild(svgIcon('play'));
    btn.appendChild(ring);
    slot.appendChild(btn);

    var userPaused = false;
    if (m.autoplay) {                                  // немое «живое» видео: играет, пока блок на экране
      v.muted = true; v.defaultMuted = true; v.setAttribute('muted', '');
      v.preload = 'none';
      if (!reduceMotion && 'IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting && !userPaused) {
              var pr = v.play();
              if (pr && pr.catch) pr.catch(function () { /* экономия заряда: кнопка воспроизведения остаётся */ });
            } else if (!e.isIntersecting) {
              v.pause();
            }
          });
        }, { threshold: 0.35, rootMargin: '120px 0px' }).observe(slot);
      }
    }
    btn.addEventListener('click', function () {
      userPaused = !v.paused;
      if (v.paused) {
        videos.forEach(function (o) { if (o !== v) o.pause(); });
        var pr = v.play();
        if (pr && pr.catch) pr.catch(function () { /* автозапуск запрещён: пользователь нажмёт ещё раз */ });
      } else {
        v.pause();
      }
    });
    v.addEventListener('play', function () { slot.classList.add('is-playing'); btn.setAttribute('data-i18n-attr', 'aria-label:slot.pause'); applyAttrs(btn); });
    v.addEventListener('pause', function () { slot.classList.remove('is-playing'); btn.setAttribute('data-i18n-attr', 'aria-label:slot.play'); applyAttrs(btn); });
    videos.push(v);
  }

  function buildSlots() {
    $$('[data-slot]').forEach(function (slot) {
      var id = slot.getAttribute('data-slot');
      var type = slot.getAttribute('data-type') || 'photo';
      var m = (CFG.media || {})[id];
      slot.textContent = '';
      slot.classList.remove('has-media');
      if (m && m.src) {
        slot.classList.add('has-media');
        if (type === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(m.src)) {
          mountVideo(slot, id, m);
        } else {
          var img = new Image();
          img.src = m.src;
          img.loading = slot.getAttribute('data-priority') === 'high' ? 'eager' : 'lazy';
          if (slot.getAttribute('data-priority') === 'high') img.fetchPriority = 'high';
          img.decoding = 'async';
          slot.appendChild(img);
        }
      } else {
        var box = document.createElement('div');
        box.className = 'slot-empty';
        if (type === 'video') {
          box.appendChild(svgIcon('play'));
        } else {
          var mark = new Image();
          mark.className = 'slot-mark';
          mark.src = 'assets/logo/key.webp';
          mark.alt = '';
          mark.setAttribute('aria-hidden', 'true');
          box.appendChild(mark);
        }
        var label = document.createElement('span');
        label.setAttribute('data-i18n', type === 'video' ? 'slot.video' : 'slot.photo');
        box.appendChild(label);
        slot.appendChild(box);
      }
    });
  }

  /* ───────── применение языка ───────── */
  function applyAttrs(el) {
    var spec = el.getAttribute('data-i18n-attr');
    if (!spec) return;
    spec.split(';').forEach(function (pair) {
      var p = pair.split(':');
      if (p.length === 2) el.setAttribute(p[0].trim(), tr(p[1].trim()));
    });
  }

  var lastAttending = null;   // для перевода экрана «Спасибо» при смене языка
  var errKey = null;

  function applyLang(next, persist) {
    lang = next;
    root.lang = lang;
    if (persist) writeStore(lang);

    document.title = tr('meta.title');
    var md = $('meta[name="description"]'); if (md) md.setAttribute('content', tr('meta.desc'));
    var og = $('meta[property="og:description"]'); if (og) og.setAttribute('content', tr('meta.desc'));

    $$('[data-i18n]').forEach(function (el) { el.textContent = tr(el.getAttribute('data-i18n')); });
    $$('[data-i18n-attr]').forEach(applyAttrs);
    $$('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-lang') === lang ? 'true' : 'false'); });
    $$('[data-slot]').forEach(function (s) {
      var im = $('img', s);
      if (im) im.alt = tr('slot.' + s.getAttribute('data-slot'));
      var vd = $('video', s);
      if (vd) vd.setAttribute('aria-label', tr('slot.' + s.getAttribute('data-slot')));
    });
    var fr = $('#mapCard iframe'); if (fr) fr.title = tr('venue.map');

    bindText();
    if (lastAttending) $('#thanksText').textContent = tr(lastAttending === 'yes' ? 'rsvp.ok.yes' : 'rsvp.ok.no');
    $('#rsvpErr').textContent = errKey ? tr(errKey) : '';
  }

  /* ───────── заставка ───────── */
  var gate = $('#gate');
  var main = $('#main');
  var keyBtn = $('#keyBtn');
  var gateOn = root.classList.contains('is-locked');
  var opened = false;
  var ready = false;
  var gateFinished = false;

  function startPetals() {
    if (!window.KelinPetals) return;
    window.KelinPetals.start();
  }

  function markReady() {
    if (ready || opened) return;
    ready = true;
    gate.classList.add('is-ready');
    try { gate.focus({ preventScroll: true }); } catch (e) { /* ничего */ }   // фокус в диалоге без видимой рамки, ключ первым по Tab
  }

  function prepareGate() {
    main.setAttribute('inert', '');
    main.setAttribute('aria-hidden', 'true');
    var started = false;
    var begin = function () {
      if (started) return;
      started = true;
      if (reduceMotion) gate.classList.add('is-skip');
      gate.classList.add('is-play');
      startPetals();                                  // лепестки плывут уже на заставке
      if (reduceMotion) markReady(); else setTimeout(markReady, 1700);
    };
    var imgs = $$('img', gate);
    Promise.all(imgs.map(function (i) {
      return i.decode ? i.decode().catch(function () { /* битая картинка не блокирует вход */ }) : Promise.resolve();
    })).then(begin);
    setTimeout(begin, 2500);

    gate.addEventListener('click', openGate);
    keyBtn.addEventListener('click', function (e) { e.stopPropagation(); openGate(); });
    $('#gateOpen').addEventListener('click', function (e) { e.stopPropagation(); openGate(); });
    $('#gateSkip').addEventListener('click', function (e) { e.stopPropagation(); skipGate(); });
    gate.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || gateFinished) return;
      if (opened) { e.preventDefault(); $('#gateSkip').focus(); return; }
      var first = keyBtn;
      var last = $('#gateSkip');
      if (e.shiftKey && (document.activeElement === first || document.activeElement === gate)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !gateFinished) skipGate(); });
  }

  function finishGate() {
    if (gateFinished) return;
    gateFinished = true;
    gate.hidden = true;
    root.classList.remove('is-locked');
    main.removeAttribute('inert');
    main.removeAttribute('aria-hidden');
    window.scrollTo(0, 0);
    var h = $('#hero-title');
    if (h) { try { h.focus({ preventScroll: true }); } catch (e) { /* ничего */ } }
    updateThread();
    updateFab();
  }

  function skipGate() {
    opened = true;
    body.classList.add('is-open');
    finishGate();
    startPetals();
  }

  // золотые искры из ключа
  function spawnSparks() {
    var stage = $('#gateStage');
    var colors = ['#FCBC0C', '#FFD65A', '#FFF3C4', '#F87C78'];
    var made = [];
    for (var i = 0; i < 16; i++) {
      var s = document.createElement('i');
      var ang = Math.random() * Math.PI * 2;
      var dist = 50 + Math.random() * 130;
      s.className = 'spark';
      s.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(1) + 'px');
      s.style.setProperty('--dy', (Math.sin(ang) * dist).toFixed(1) + 'px');
      s.style.setProperty('--s', (3 + Math.random() * 5).toFixed(1) + 'px');
      s.style.setProperty('--c', colors[i % colors.length]);
      s.style.setProperty('--d', (Math.random() * 0.15).toFixed(2) + 's');
      stage.appendChild(s);
      made.push(s);
    }
    setTimeout(function () { made.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); }); }, 2000);
  }

  // Открытие: ключ делает оборот, искры и лепестки вылетают из ключа, створки распахиваются.
  function openGate() {
    if (opened) return;
    opened = true;
    if (!ready) gate.classList.add('is-skip');
    gate.classList.add('is-play', 'is-opening');

    if (reduceMotion) {                               // без движения: мягко растворяемся
      body.classList.add('is-open');
      startPetals();
      gate.classList.add('is-fade');
      setTimeout(finishGate, 260);
      return;
    }
    var vw = window.innerWidth;
    var box = $('#gateStage').getBoundingClientRect();
    var keyx = parseFloat(getComputedStyle(root).getPropertyValue('--logo-keyx')) || 0.403;
    var ix = box.left + box.width * keyx;             // цветок на ключе
    var iy = box.top + box.height * 0.16;
    spawnSparks();
    setTimeout(function () { if (window.KelinPetals) window.KelinPetals.burst(ix, iy, vw < 600 ? 28 : 44); }, 260);
    setTimeout(function () { body.classList.add('is-open'); startPetals(); }, 640);
    setTimeout(finishGate, 1900);                     // створки заканчивают движение примерно к 1.5 с
  }

  /* ───────── галерея: свайп, кнопки и клавиатура ───────── */
  function setupGallery() {
    var gallery = $('#galleryTrack');
    var prev = $('#galleryPrev');
    var next = $('#galleryNext');
    var position = $('#galleryPosition');
    var cards = $$('.gal__item', gallery);
    if (!gallery || !cards.length) return;
    function sync() {
      var max = gallery.scrollWidth - gallery.clientWidth;
      var left = gallery.scrollLeft;
      var gap = parseFloat(getComputedStyle(gallery).columnGap) || 0;
      var width = cards[0].getBoundingClientRect().width + gap;
      var index = max > 1 && left >= max - 2 ? cards.length - 1 : clamp(Math.round(left / width), 0, cards.length - 1);
      position.textContent = pad2(index + 1) + ' / ' + pad2(cards.length);
      prev.disabled = left <= 2;
      next.disabled = left >= max - 2;
    }
    function move(direction) {
      var distance = cards[0].getBoundingClientRect().width + (parseFloat(getComputedStyle(gallery).columnGap) || 0);
      gallery.scrollBy({ left: direction * distance, behavior: reduceMotion ? 'instant' : 'smooth' });
    }
    prev.addEventListener('click', function () { move(-1); });
    next.addEventListener('click', function () { move(1); });
    gallery.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault(); move(e.key === 'ArrowRight' ? 1 : -1);
      }
    });
    gallery.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }

  /* ───────── нить истории ───────── */
  var track = $('#storyTrack');
  var fill = $('#threadFill');
  var tip = $('#threadTip');
  var steps = $$('.step');
  var ticking = false;

  function updateThread() {
    ticking = false;
    if (!track || !fill) return;
    var r = track.getBoundingClientRect();
    var vh = window.innerHeight || 800;
    var anchor = vh * 0.58;
    var p = clamp((anchor - r.top) / r.height, 0, 1);
    fill.style.transform = 'scaleY(' + p.toFixed(4) + ')';
    tip.style.transform = 'translateY(' + (p * fill.parentNode.clientHeight).toFixed(1) + 'px)';
    steps.forEach(function (st) {
      var n = $('.step__node', st).getBoundingClientRect();
      st.classList.toggle('is-lit', n.top + n.height / 2 < anchor);
    });
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(updateThread); }
  }

  function setupReveal() {
    if (!('IntersectionObserver' in window)) { steps.forEach(function (s) { s.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    steps.forEach(function (s) { io.observe(s); });
  }

  /* ───────── быстрая кнопка «Приду» ───────── */
  var fab = $('#fab');
  var seen = { top: true, rsvp: false };
  function updateFab() {
    var on = body.classList.contains('is-open') && !seen.top && !seen.rsvp;
    fab.classList.toggle('is-on', on);
    fab.setAttribute('aria-hidden', on ? 'false' : 'true');
    fab.setAttribute('tabindex', on ? '0' : '-1');
  }
  function setupFab() {
    updateFab();
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { seen[e.target.id === 'top' ? 'top' : 'rsvp'] = e.isIntersecting; });
      updateFab();
    }, { threshold: 0.05 });
    io.observe($('#top'));
    io.observe($('#rsvp'));
    new MutationObserver(updateFab).observe(body, { attributes: true, attributeFilter: ['class'] });
  }

  /* ───────── таймер ───────── */
  var cdFirst = true;
  var cdTimer = 0;
  function setNum(k, v) {
    var el = $('[data-cd="' + k + '"]');
    var txt = (v < 10 ? '0' : '') + v;
    if (el.textContent === txt) return;
    el.textContent = txt;
    if (!cdFirst && !reduceMotion) { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); }
  }
  function tick() {
    var diff = target - Date.now();
    if (diff <= 0) {
      $('#cd').hidden = true;
      $('#cdDone').hidden = false;
      clearInterval(cdTimer);
      return;
    }
    var s = Math.floor(diff / 1000);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    setNum('d', d); setNum('h', h); setNum('m', m); setNum('s', s);
    cdFirst = false;
  }

  /* ───────── карта и ссылки ───────── */
  function setupAnchors() {
    // В srcdoc-предпросмотре браузер может разрешить #rsvp относительно родительской
    // страницы и покинуть приглашение. Прокручиваем текущий документ явно.
    document.addEventListener('click', function (e) {
      var link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var id = link.getAttribute('href').slice(1);
      var section = document.getElementById(id);
      if (!section) return;
      e.preventDefault();
      section.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'start' });
      try { history.replaceState(null, '', '#' + encodeURIComponent(id)); } catch (error) { /* изолированное окно без доступа к history */ }
      if (link.classList.contains('skip')) {
        section.setAttribute('tabindex', '-1');
        section.focus({ preventScroll: true });
      }
    });
  }

  function setupLinks() {
    var L = CFG.links || {};
    var c = CFG.coords || { lat: 41.288503, lng: 69.344578 };
    $('#mapGoogle').href = 'https://maps.google.com/maps?q=' + c.lat + ',' + c.lng + '&ll=' + c.lat + ',' + c.lng + '&z=16';
    $('#mapYandex').href = 'https://yandex.uz/maps/?pt=' + c.lng + ',' + c.lat + '&z=17&l=map';
    $('#lnkIg').href = L.instagram || '#';
    $('#lnkTg').href = L.telegram || '#';
    $('#venueMap').src = 'https://maps.google.com/maps?q=' + c.lat + ',' + c.lng + '&z=16&output=embed';
  }

  /* ───────── визитки ───────── */
  var people = (CFG.people || []).filter(function (p) { return p && p.id; });
  var currentId = people.length ? people[0].id : '';

  function person(id) {
    var want = id || currentId;
    for (var i = 0; i < people.length; i++) if (people[i].id === want) return people[i];
    var L = CFG.links || {};
    return people[0] || { id: '', first: '', last: '', phone: L.phone || '', phoneLabel: L.phoneLabel || '', email: '' };
  }
  // У сестры нет личного номера на сайте: показываем общий номер магазина.
  function phoneOf(p) {
    var L = CFG.links || {};
    return { tel: p.phone || L.phone || '', label: p.phoneLabel || L.phoneLabel || '' };
  }
  function fullName(p, upper) {
    var s = upper ? (p.last + ' ' + p.first).toUpperCase() : p.first + ' ' + p.last;
    return s.trim();
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function renderCards() {
    var tabs = $('#cardTabs');
    var stage = $('#cardStage');
    if (!tabs || !stage || !people.length) return;
    var L = CFG.links || {};
    tabs.textContent = '';
    stage.textContent = '';

    people.forEach(function (p) {
      var tab = el('button', null, p.first);
      tab.type = 'button';
      tab.id = 'tab-' + p.id;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', 'card-' + p.id);
      tab.setAttribute('data-person', p.id);
      tabs.appendChild(tab);

      var card = el('article', 'bizcard');
      card.id = 'card-' + p.id;
      card.setAttribute('role', 'tabpanel');
      card.setAttribute('aria-labelledby', 'tab-' + p.id);
      card.setAttribute('data-person', p.id);
      var face = el('div', 'bizcard__face');

      var mainPane = el('div', 'bizcard__main');
      var head = el('div', 'bizcard__head');
      head.appendChild(el('p', 'bizcard__name', fullName(p, true)));
      var role = el('p', 'bizcard__role');
      role.setAttribute('data-i18n', 'card.role');
      head.appendChild(role);
      mainPane.appendChild(head);

      var rows = el('ul', 'bizcard__rows');
      var addRow = function (icon, text, href) {
        if (!text) return;
        var li = el('li');
        li.appendChild(svgIcon(icon));
        var item = el(href ? 'a' : 'span', null, text);
        if (href) item.href = href;
        li.appendChild(item);
        rows.appendChild(li);
      };
      addRow('phone', phoneOf(p).label, phoneOf(p).tel ? 'tel:' + phoneOf(p).tel : '');
      addRow('instagram', L.instagramLabel, L.instagram);
      addRow('telegram', L.telegramContactLabel, L.telegramContact);
      addRow('mail', p.email, p.email ? 'mailto:' + p.email : '');
      mainPane.appendChild(rows);

      var side = el('div', 'bizcard__side');
      var logo = el('div', 'logo bizcard__logo');
      logo.setAttribute('aria-hidden', 'true');
      ['ke', 'lin', 'key', 'cosmetics'].forEach(function (name) {
        var layer = new Image();
        layer.src = 'assets/logo/' + name + '.webp';
        layer.alt = '';
        layer.decoding = 'async';
        logo.appendChild(layer);
      });
      side.appendChild(logo);
      var qr = el('div', 'bizcard__qr');
      var code = new Image();
      code.src = 'assets/qr/instagram.svg';
      code.width = 120;
      code.height = 120;
      code.setAttribute('data-i18n-attr', 'alt:card.qr');
      code.alt = '';
      qr.appendChild(code);
      side.appendChild(qr);

      face.appendChild(mainPane);
      face.appendChild(side);
      card.appendChild(face);
      stage.appendChild(card);
    });

    // переключение: вкладки, стрелки на клавиатуре и свайп по самой визитке
    var ids = people.map(function (p) { return p.id; });
    var cycle = function (dir) { selectPerson(ids[(ids.indexOf(currentId) + dir + ids.length) % ids.length]); };
    tabs.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[role="tab"]') : null;
      if (t) selectPerson(t.getAttribute('data-person'));
    });
    tabs.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      cycle(e.key === 'ArrowRight' ? 1 : -1);
      var active = $('[role="tab"][aria-selected="true"]', tabs);
      if (active) active.focus();
    });
    var sx = 0, sy = 0, tracking = false;
    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      sx = e.clientX; sy = e.clientY; tracking = true;
    });
    stage.addEventListener('pointerup', function (e) {
      if (!tracking) return;
      tracking = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (ids.length > 1 && Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.4) cycle(dx < 0 ? 1 : -1);
    });
    stage.addEventListener('pointercancel', function () { tracking = false; });
    selectPerson(currentId);
  }

  function selectPerson(id) {
    currentId = id;
    $$('#cardTabs [role="tab"]').forEach(function (t) {
      var on = t.getAttribute('data-person') === id;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    $$('#cardStage .bizcard').forEach(function (c) {
      var on = c.getAttribute('data-person') === id;
      c.classList.toggle('is-front', on);
      c.classList.toggle('is-back', !on);
      if (on) { c.removeAttribute('inert'); c.removeAttribute('aria-hidden'); } else { c.setAttribute('inert', ''); c.setAttribute('aria-hidden', 'true'); }
    });
    updateContactActions();
  }

  // кнопки под визиткой показывают данные выбранной сестры; чего нет, то скрыто
  function updateContactActions() {
    var p = person();
    var tel = $('#lnkTel');
    var mail = $('#lnkMail');
    if (!tel || !mail) return;
    var phone = phoneOf(p);
    tel.parentNode.hidden = !phone.tel;
    if (phone.tel) tel.href = 'tel:' + phone.tel;
    mail.parentNode.hidden = !p.email;
    if (p.email) mail.href = 'mailto:' + p.email;
    bindText();
  }

  function vcardEsc(s) { return String(s).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
  function downloadVcard() {
    var p = person();
    var L = CFG.links || {};
    var lines = ['BEGIN:VCARD', 'VERSION:3.0', 'N:' + vcardEsc(p.last) + ';' + vcardEsc(p.first) + ';;;', 'FN:' + vcardEsc(fullName(p)), 'ORG:Keylin Cosmetics', 'TITLE:' + vcardEsc(tr('card.role'))];
    if (phoneOf(p).tel) lines.push('TEL;TYPE=CELL:' + phoneOf(p).tel);
    if (p.email) lines.push('EMAIL;TYPE=INTERNET:' + p.email);
    if (L.instagram) lines.push('URL:' + L.instagram);
    if (L.telegramContact) lines.push('URL:' + L.telegramContact);
    lines.push('NOTE:' + vcardEsc(tr('foot.note')), 'END:VCARD');
    var blob = new Blob([lines.join('\r\n')], { type: 'text/vcard;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'Keylin-' + (p.first || 'contact') + '.vcf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* ───────── поделиться приглашением ───────── */
  function setupShare() {
    var button = $('#shareBtn');
    var status = $('#shareStatus');
    button.addEventListener('click', function () {
      var url = (CFG.links || {}).invitation;
      if (!url) return;
      status.hidden = true;
      if (navigator.share) {
        navigator.share({ title: tr('hero.logo'), text: tr('share.text'), url: url }).catch(function (error) {
          if (error.name !== 'AbortError') showShareStatus('share.error', url);
        });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          showShareStatus('share.copied');
        }).catch(function () { showShareStatus('share.error', url); });
      } else {
        showShareStatus('share.error', url);
      }
    });
    function showShareStatus(key, url) {
      status.textContent = '';
      var message = document.createElement('span');
      message.setAttribute('data-i18n', key);
      message.textContent = tr(key);
      status.appendChild(message);
      status.hidden = false;
      if (url) {
        var link = document.createElement('a');
        link.id = 'shareFallback';
        link.href = url;
        link.textContent = url;
        status.appendChild(document.createTextNode(' '));
        status.appendChild(link);
      }
    }
  }

  /* ───────── календарь (.ics) ───────── */
  function icsEsc(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function icsStamp(ms) {
    var d = new Date(ms);
    return d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) + 'T' + pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds()) + 'Z';
  }
  function downloadIcs() {
    var c = CFG.coords || { lat: 41.288503, lng: 69.344578 };
    var end = target + (O.durationHours || 3) * 3600 * 1000;
    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Keylin Cosmetics//Invitation//UZ', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:opening-' + target + '@keylin-cosmetics',
      'DTSTAMP:' + icsStamp(Date.now()),
      'DTSTART:' + icsStamp(target),
      'DTEND:' + icsStamp(end),
      'SUMMARY:' + icsEsc(tr('cal.title')),
      'DESCRIPTION:' + icsEsc(tr('cal.desc')),
      'LOCATION:' + icsEsc(addressText()),
      'GEO:' + c.lat + ';' + c.lng,
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    var blob = new Blob([lines], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'keylin-ochilish.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* ───────── форма ответа ───────── */
  var form = $('#rsvpForm');
  var guests = 1;
  var GMAX = 6;

  function showErr(key, focusEl) {
    errKey = key;
    $('#rsvpErr').textContent = key ? tr(key) : '';
    if (focusEl) focusEl.focus();
  }
  function syncGuests() {
    var yes = form.elements.attending.value === 'yes';
    var box = $('#guestsBox');
    box.classList.toggle('is-open', yes);
    if (yes) box.removeAttribute('inert'); else box.setAttribute('inert', '');
  }
  function setGuests(n) {
    guests = clamp(n, 1, GMAX);
    $('#gOut').textContent = String(guests);
    $('#gMinus').disabled = guests <= 1;
    $('#gPlus').disabled = guests >= GMAX;
  }
  function sendRsvp(payload) {
    if (!CFG.rsvpEndpoint) {
      return new Promise(function (resolve) { setTimeout(function () { resolve(true); }, 450); });   // демо-режим
    }
    var ctl = 'AbortController' in window ? new AbortController() : null;
    var to = setTimeout(function () { if (ctl) ctl.abort(); }, 12000);
    return fetch(CFG.rsvpEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctl ? ctl.signal : undefined
    }).then(function (res) {
      clearTimeout(to);
      if (!res.ok) throw new Error('http ' + res.status);
      return false;
    });
  }
  function showThanks(att, demo) {
    lastAttending = att;
    $('#thanksText').textContent = tr(att === 'yes' ? 'rsvp.ok.yes' : 'rsvp.ok.no');
    $('#thanksDemo').hidden = !demo;
    form.hidden = true;
    var thanks = $('#thanks');
    thanks.hidden = false;
    var b = $('#thanksEdit');
    try { b.focus({ preventScroll: true }); } catch (e) { /* ничего */ }
  }

  function setupForm() {
    $$('input[name="attending"]', form).forEach(function (r) { r.addEventListener('change', syncGuests); });
    $('#gMinus').addEventListener('click', function () { setGuests(guests - 1); });
    $('#gPlus').addEventListener('click', function () { setGuests(guests + 1); });
    setGuests(1);

    $('#rsvpName').addEventListener('input', function () { if (errKey === 'rsvp.err.name') showErr(null); });
    $$('input[name="attending"]', form).forEach(function (r) { r.addEventListener('change', function () { if (errKey === 'rsvp.err.choice') showErr(null); }); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var att = form.elements.attending.value;
      if (form.elements.website.value) { showThanks(att || 'yes', false); return; }   // ловушка для ботов
      var name = form.elements.name.value.trim();
      if (!name) { showErr('rsvp.err.name', form.elements.name); return; }
      if (!att) { showErr('rsvp.err.choice', $('input[name="attending"]', form)); return; }
      showErr(null);

      var btn = $('#rsvpSend');
      btn.disabled = true;
      btn.textContent = tr('rsvp.sending') + '…';
      var payload = {
        name: name,
        attending: att === 'yes',
        guests: att === 'yes' ? guests : 0,
        note: form.elements.note.value.trim(),
        lang: lang,
        sentAt: new Date().toISOString()
      };
      sendRsvp(payload).then(function (demo) {
        showThanks(att, demo);
      }).catch(function () {
        showErr('rsvp.err.net');
      }).then(function () {
        btn.disabled = false;
        btn.textContent = tr('rsvp.send');
      });
    });

    $('#thanksEdit').addEventListener('click', function () {
      $('#thanks').hidden = true;
      form.hidden = false;
      lastAttending = null;
      form.elements.name.focus();
    });
  }

  /* ───────── запуск ───────── */
  function init() {
    lang = pickLang();
    buildSlots();
    renderCards();
    applyLang(lang, false);
    updateContactActions();
    setupLinks();
    setupAnchors();
    setupShare();

    $$('[data-lang]').forEach(function (b) {
      b.addEventListener('click', function () { applyLang(b.getAttribute('data-lang'), true); });
    });
    $('#calBtn').addEventListener('click', downloadIcs);
    $('#saveContact').addEventListener('click', downloadVcard);
    if (CFG.sample) {
      $('#sampleFlag').hidden = false;
    }
    $('#rsvpNotice').hidden = !!CFG.rsvpEndpoint;

    setupForm();
    setupGallery();
    setupReveal();
    setupFab();
    tick();
    cdTimer = setInterval(tick, 1000);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updateThread();

    if (gateOn) {
      prepareGate();
    } else {
      gate.hidden = true;
      body.classList.add('is-open');
      startPetals();
      updateFab();
    }
    window.__klReady = true;
  }

  init();
})();
