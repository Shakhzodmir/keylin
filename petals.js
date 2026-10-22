/* Лепестки роз. Рисуются на canvas заранее подготовленными спрайтами, поэтому кадр стоит
   несколько вызовов drawImage. Два режима:
   - фоновые лепестки (start/stop): плавно падают, а при прокрутке страницы ветром сдвигаются;
   - вылет лепестков из ключа (burst): короткий всплеск при открытии приглашения. */
(function () {
  'use strict';

  var canvas = document.getElementById('petals');
  if (!canvas || !canvas.getContext) return;

  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var ctx = canvas.getContext('2d');
  var sprites = [];
  var items = [];
  var dpr = 1, vw = 0, vh = 0, raf = 0, last = 0, fade = 0, running = false, lastScroll = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  function petalPath(g, w, h) {
    g.beginPath();
    g.moveTo(0, -h * 0.46);
    g.bezierCurveTo(w * 0.62, -h * 0.30, w * 0.52, h * 0.30, 0, h * 0.46);
    g.bezierCurveTo(-w * 0.52, h * 0.30, -w * 0.62, -h * 0.30, 0, -h * 0.46);
    g.closePath();
  }

  function makeSprite(size, tint, gold) {
    var c = document.createElement('canvas');
    var w = size, h = Math.round(size * 1.3);
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    g.translate(w / 2, h / 2);
    petalPath(g, w, h);
    var grad = g.createRadialGradient(-w * 0.12, -h * 0.14, w * 0.04, 0, 0, h * 0.56);
    grad.addColorStop(0, '#FFF6F4');
    grad.addColorStop(0.55, tint[0]);
    grad.addColorStop(1, tint[1]);
    g.fillStyle = grad;
    g.fill();
    g.globalAlpha = 0.24;
    g.strokeStyle = '#D9807C';
    g.lineWidth = Math.max(1, w * 0.022);
    g.beginPath();
    g.moveTo(0, -h * 0.36);
    g.quadraticCurveTo(w * 0.05, 0, 0, h * 0.38);
    g.stroke();
    g.globalAlpha = 1;
    if (gold) {                       // золотая кромка, как на лепестках бренда: только местами
      petalPath(g, w, h);
      g.strokeStyle = 'rgba(252,188,12,.85)';
      g.lineWidth = Math.max(1.2, w * 0.04);
      g.setLineDash([w * 0.7, w * 1.5]);
      g.lineDashOffset = rand(0, w);
      g.stroke();
    }
    return c;
  }

  function buildSprites() {
    if (sprites.length) return;
    sprites = [
      makeSprite(64, ['#F9D2CF', '#F3AEAB'], false),
      makeSprite(64, ['#FBDAD7', '#F5B8B5'], true),
      makeSprite(64, ['#F8C9C6', '#EF9F9C'], false),
      makeSprite(64, ['#FCE3E1', '#F7C4C1'], true)
    ];
  }

  function reset(p, initial) {
    p.s = rand(0.55, 1.15);
    p.x = rand(-20, vw + 20);
    p.y = initial ? rand(-vh * 0.1, vh) : rand(-90, -30);
    p.vy = rand(26, 58) * (0.65 + p.s * 0.45);
    p.amp = rand(16, 48);
    p.freq = rand(0.35, 0.85);
    p.ph = rand(0, 6.28);
    p.rot = rand(0, 6.28);
    p.vr = rand(-0.7, 0.7);
    p.fl = rand(0.8, 1.9);
    p.fph = rand(0, 6.28);
    p.a = rand(0.45, 0.85);
    p.k = rand(-1, 1);              // в какую сторону и насколько сильно лепесток сносит ветром
    p.t = 0;
    p.sp = sprites[(Math.random() * sprites.length) | 0];
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    var n = Math.max(8, Math.min(16, Math.round(vw / 90)));
    while (items.length < n) { var p = {}; reset(p, true); items.push(p); }
    items.length = n;
  }

  function frame(ts) {
    if (!running) return;
    var dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    fade = Math.min(1, fade + dt / 1.2);

    // ветер: прокрутка страницы подталкивает лепестки, как лёгкий сквозняк
    var sy = window.pageYOffset || 0;
    var scrolled = sy - lastScroll;
    lastScroll = sy;
    var gust = clamp(scrolled, -90, 90);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    for (var i = 0; i < items.length; i++) {
      var p = items[i];
      p.t += dt;
      p.y += p.vy * dt - gust * (0.22 + 0.32 * p.s);
      p.x += gust * 0.18 * p.k;
      p.rot += (p.vr + gust * 0.015) * dt;
      if (p.y > vh + 60) { reset(p, false); continue; }
      if (p.y < -120) { reset(p, false); p.y = vh + rand(20, 80); continue; }
      var x = p.x + Math.sin(p.t * p.freq + p.ph) * p.amp;
      var sx = 0.4 + 0.6 * Math.abs(Math.cos(p.t * p.fl + p.fph));
      var w = 56 * p.s, h = 73 * p.s;
      ctx.globalAlpha = p.a * fade;
      ctx.save();
      ctx.translate(x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(sx, 1);
      ctx.drawImage(p.sp, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (reduce || running) return;
    buildSprites();
    resize();
    running = true;
    fade = 0;
    lastScroll = window.pageYOffset || 0;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);   // без этого последние лепестки застыли бы на экране
  }

  /* Всплеск лепестков из точки (cx, cy): летят в стороны, замедляются и опадают. */
  function burst(cx, cy, count) {
    if (reduce) return;
    buildSprites();
    var c = document.createElement('canvas');
    var d = Math.min(window.devicePixelRatio || 1, 2);
    var W = window.innerWidth, H = window.innerHeight;
    c.width = Math.round(W * d);
    c.height = Math.round(H * d);
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:210;pointer-events:none';
    document.body.appendChild(c);
    var g = c.getContext('2d');
    var ps = [];
    for (var i = 0; i < count; i++) {
      var ang = rand(0, Math.PI * 2);
      var speed = rand(200, 720);
      ps.push({
        x: cx, y: cy, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed - 140,
        s: rand(0.38, 0.95), rot: rand(0, 6.28), vr: rand(-5, 5), fl: rand(2.5, 6), ph: rand(0, 6.28),
        sp: sprites[(Math.random() * sprites.length) | 0], t: 0, life: rand(1.4, 2.5)
      });
    }
    var prev = performance.now();
    function step(now) {
      var dt = Math.min(0.04, (now - prev) / 1000 || 0.016);
      prev = now;
      g.setTransform(d, 0, 0, d, 0, 0);
      g.clearRect(0, 0, W, H);
      var alive = 0;
      var drag = Math.exp(-2.1 * dt);
      for (var k = 0; k < ps.length; k++) {
        var p = ps[k];
        p.t += dt;
        if (p.t > p.life) continue;
        alive++;
        p.vx *= drag;
        p.vy = p.vy * drag + 300 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        var u = p.t / p.life;
        var alpha = (u < 0.08 ? u / 0.08 : (u > 0.65 ? (1 - u) / 0.35 : 1)) * 0.95;
        var sx = 0.35 + 0.65 * Math.abs(Math.cos(p.t * p.fl + p.ph));
        var w = 56 * p.s, h = 73 * p.s;
        g.globalAlpha = alpha;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.scale(sx, 1);
        g.drawImage(p.sp, -w / 2, -h / 2, w, h);
        g.restore();
      }
      if (alive) requestAnimationFrame(step); else if (c.parentNode) c.parentNode.removeChild(c);
    }
    requestAnimationFrame(step);
  }

  var begun = false;
  document.addEventListener('visibilitychange', function () {
    if (!begun) return;
    if (document.hidden) stop(); else start();
  });
  var rt = 0;
  window.addEventListener('resize', function () {
    if (!running) return;
    clearTimeout(rt);
    rt = setTimeout(resize, 150);
  });

  window.KelinPetals = {
    start: function () { begun = true; start(); },
    stop: function () { begun = false; stop(); },
    burst: burst
  };
})();
