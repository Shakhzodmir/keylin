/* Лепестки роз на фоне страницы. Рисуются на canvas заранее подготовленными спрайтами,
   чтобы кадр стоил несколько вызовов drawImage. Работают только пока вкладка видна. */
(function () {
  'use strict';

  var canvas = document.getElementById('petals');
  if (!canvas || !canvas.getContext) return;

  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var ctx = canvas.getContext('2d');
  var sprites = [];
  var items = [];
  var dpr = 1, vw = 0, vh = 0, raf = 0, last = 0, fade = 0, running = false;

  function rand(a, b) { return a + Math.random() * (b - a); }

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
    sprites = [
      makeSprite(56, ['#F9D2CF', '#F3AEAB'], false),
      makeSprite(56, ['#FBDAD7', '#F5B8B5'], true),
      makeSprite(56, ['#F8C9C6', '#EF9F9C'], false),
      makeSprite(56, ['#FCE3E1', '#F7C4C1'], true)
    ];
  }

  function reset(p, initial) {
    p.s = rand(0.5, 1.05);
    p.x = rand(-20, vw + 20);
    p.y = initial ? rand(-vh * 0.15, vh) : rand(-90, -30);
    p.vy = rand(24, 54) * (0.65 + p.s * 0.45);
    p.amp = rand(14, 44);
    p.freq = rand(0.35, 0.8);
    p.ph = rand(0, 6.28);
    p.rot = rand(0, 6.28);
    p.vr = rand(-0.6, 0.6);
    p.fl = rand(0.8, 1.8);
    p.fph = rand(0, 6.28);
    p.a = rand(0.2, 0.4);
    p.t = 0;
    p.sp = sprites[(Math.random() * sprites.length) | 0];
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    var n = Math.max(5, Math.min(10, Math.round(vw / 130)));
    while (items.length < n) { var p = {}; reset(p, true); items.push(p); }
    items.length = n;
  }

  function frame(ts) {
    if (!running) return;
    var dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    fade = Math.min(1, fade + dt / 1.4);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    for (var i = 0; i < items.length; i++) {
      var p = items[i];
      p.t += dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y > vh + 60) { reset(p, false); continue; }
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
    if (!sprites.length) buildSprites();
    resize();
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
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
    stop: function () { begun = false; stop(); }
  };
})();
