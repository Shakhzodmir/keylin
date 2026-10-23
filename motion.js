/* Keylin: scroll reveals, light parallax, frame tilt and desktop gallery dragging.
 * Native scrolling stays in control. Only transform/opacity animate on entry.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;
  var hero = document.querySelector('.hero');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var pending = 0;
  var pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  var petalsOn = false;

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

  function schedule() {
    if (!pending && !document.hidden) pending = requestAnimationFrame(update);
  }

  function update() {
    pending = 0;
    var total = Math.max(1, root.scrollHeight - innerHeight);
    root.style.setProperty('--reading-progress', clamp(scrollY / total, 0, 1).toFixed(4));
    if (reduce) return;
    updateDrift();
    if (!hero) return;
    var rect = hero.getBoundingClientRect();
    var visible = rect.bottom > 0 && rect.top < innerHeight;
    // лепестки летят над первыми экранами страницы, дальше не тратят заряд батареи
    var shouldRun = scrollY < innerHeight * 2.4 && body.classList.contains('is-open') && !document.hidden;
    if (window.KelinPetals && shouldRun !== petalsOn) {
      petalsOn = shouldRun;
      window.KelinPetals[shouldRun ? 'start' : 'stop']();
    }
    if (!visible) return;
    hero.style.setProperty('--hero-parallax', (-clamp(-rect.top / rect.height, 0, 1) * 48).toFixed(2) + 'px');
    pointer.x += (pointer.targetX - pointer.x) * 0.12;
    pointer.y += (pointer.targetY - pointer.y) * 0.12;
    hero.style.setProperty('--pointer-x', pointer.x.toFixed(2) + 'px');
    hero.style.setProperty('--pointer-y', pointer.y.toFixed(2) + 'px');
    if (Math.abs(pointer.targetX - pointer.x) + Math.abs(pointer.targetY - pointer.y) > 0.1) schedule();
  }

  /* Картинки в рамках слегка плывут против прокрутки: рамка стоит, кадр внутри движется. */
  var driftItems = [];
  function setupDrift() {
    if (reduce) return;
    [['.shop__image > img', 38], ['.origin__image > img', 46], ['.sisters .portrait__window > img', 26], ['.gal .frame__in > img', 22], ['.store__fig:not(.store__fig--facade) .store__img > img', 22]].forEach(function (group) {
      document.querySelectorAll(group[0]).forEach(function (img) {
        img.setAttribute('data-drift', '');
        driftItems.push({ el: img, range: group[1] });
      });
    });
  }
  function updateDrift() {
    for (var i = 0; i < driftItems.length; i++) {
      var item = driftItems[i];
      var rect = item.el.parentNode.getBoundingClientRect();
      if (rect.bottom < -80 || rect.top > innerHeight + 80) continue;
      // от -1 (рамка у нижнего края экрана) до +1 (у верхнего)
      var progress = clamp(((rect.top + rect.height / 2) - innerHeight / 2) / (innerHeight / 2 + rect.height / 2), -1, 1);
      item.el.style.transform = 'translate3d(0,' + (progress * item.range * -1).toFixed(1) + 'px,0) scale(1.16)';
    }
  }

  function setupReveals() {
    if (reduce || !('IntersectionObserver' in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });
    [
      ['.hello__letter', 'up', 0],
      ['.sisters__portrait', 'portrait', 120],
      ['.shop .sec-title', 'up', 0],
      ['.shop__art, .origin__content', 'up', 0],
      ['.origin__image', 'reveal', 0],
      ['.store__head', 'up', 0],
      ['.store__fig, .store__clip', 'up', 90],
      ['.cat', 'up', 60],
      ['.gal .sec-title', 'up', 0],
      ['.gal__item', 'up', 80],
      ['.cd__cell', 'up', 90],
      ['.rsvp__intro, .rsvp__panel', 'up', 100],
      ['.foot__invitation', 'up', 0]
    ].forEach(function (group) {
      document.querySelectorAll(group[0]).forEach(function (element, index) {
        element.setAttribute('data-motion', group[1]);
        element.style.setProperty('--motion-delay', Math.min(index * group[2], 240) + 'ms');
        observer.observe(element);
      });
    });
    root.classList.add('motion-ready');
  }

  function setupTilt() {
    if (reduce || !finePointer) return;
    document.querySelectorAll('.sisters .portrait__window, .gal .frame, .shop__image, .bizcard__face').forEach(function (frame) {
      var bounds, frameId = 0, latest;
      frame.classList.add('is-tiltable');
      frame.addEventListener('pointerenter', function () { bounds = frame.getBoundingClientRect(); });
      frame.addEventListener('pointermove', function (event) {
        if (event.pointerType !== 'mouse' || !bounds || event.buttons) return;
        latest = event;
        if (frameId) return;
        frameId = requestAnimationFrame(function () {
          frameId = 0;
          frame.style.setProperty('--tilt-y', (clamp((latest.clientX - bounds.left) / bounds.width - 0.5, -0.5, 0.5) * 8).toFixed(2) + 'deg');
          frame.style.setProperty('--tilt-x', (-clamp((latest.clientY - bounds.top) / bounds.height - 0.5, -0.5, 0.5) * 8).toFixed(2) + 'deg');
        });
      });
      frame.addEventListener('pointerleave', function () {
        if (frameId) cancelAnimationFrame(frameId);
        frameId = 0;
        frame.style.setProperty('--tilt-x', '0deg');
        frame.style.setProperty('--tilt-y', '0deg');
      });
    });
  }

  function setupGalleryDrag() {
    var gallery = document.getElementById('galleryTrack');
    if (!gallery) return;
    var active = null;
    gallery.addEventListener('pointerdown', function (event) {
      if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('button, a, video, input')) return;
      active = { id: event.pointerId, x: event.clientX, scroll: gallery.scrollLeft, dragging: false };
      event.preventDefault();
      gallery.focus({ preventScroll: true });
    });
    gallery.addEventListener('pointermove', function (event) {
      if (!active || event.pointerId !== active.id) return;
      var distance = event.clientX - active.x;
      if (!active.dragging && Math.abs(distance) < 8) return;
      if (!active.dragging) {
        active.dragging = true;
        gallery.classList.add('is-dragging');
        gallery.setPointerCapture(active.id);
      }
      gallery.scrollLeft = active.scroll - distance;
    });
    function finishDrag(event) {
      if (!active || event.pointerId !== active.id) return;
      var id = active.id;
      active = null;
      gallery.classList.remove('is-dragging');
      if (gallery.hasPointerCapture(id)) gallery.releasePointerCapture(id);
    }
    window.addEventListener('pointerup', finishDrag);
    gallery.addEventListener('pointercancel', finishDrag);
    gallery.addEventListener('lostpointercapture', finishDrag);
    gallery.addEventListener('dragstart', function (event) { event.preventDefault(); });
  }

  setupDrift();
  setupReveals();
  setupTilt();
  setupGalleryDrag();
  if (hero && finePointer && !reduce) {
    hero.addEventListener('pointermove', function (event) {
      if (event.pointerType !== 'mouse') return;
      var rect = hero.getBoundingClientRect();
      pointer.targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 24;
      pointer.targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 18;
      schedule();
    });
    hero.addEventListener('pointerleave', function () {
      pointer.targetX = 0; pointer.targetY = 0; schedule();
    });
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  new MutationObserver(schedule).observe(body, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (pending) cancelAnimationFrame(pending);
      pending = 0;
      if (window.KelinPetals) window.KelinPetals.stop();
      petalsOn = false;
    } else { schedule(); }
  });
  schedule();
})();
