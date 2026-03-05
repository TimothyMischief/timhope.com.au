// Infinite scroll handler for gallery rows using WAAPI
document.addEventListener("DOMContentLoaded", () => {
  const ROW_SEL = ".show-row-scroll";
  const PX_PER_SEC = 45;      // base auto speed (px/sec)
  const HOVER_EASE = 0.12;    // easing factor for hover stop/resume
  const DRAG_SENS = 1.0;      // 1.0 = 1:1 drag feel

  const prefersReduced =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  function wrapTime(t, duration) {
    let x = t % duration;
    if (x < 0) x += duration;
    return x;
  }

  // Build 3 copies of the original set: [A][A][A]
  function buildTripledTrack(row) {
    if (row.dataset.tripled === "1") return;

    const originals = Array.from(row.children).filter((n) => n.nodeType === 1);
    row.dataset.originalCount = String(originals.length);

    const frag = document.createDocumentFragment();
    for (let copy = 0; copy < 2; copy++) {
      for (const node of originals) frag.appendChild(node.cloneNode(true));
    }
    row.appendChild(frag);

    row.dataset.tripled = "1";
  }

  // With 3 identical sets in the row, total scrollWidth ≈ 3 * setWidth
  function measureSetWidth(row) {
    const count = parseInt(row.dataset.originalCount || "0", 10);
    if (!count) return 0;

    const total = row.scrollWidth;
    if (!total) return 0;

    return total / 3;
  }

  function makeRowController(row, index) {
    // Ensure one continuous line
    row.style.whiteSpace = "nowrap";
    row.style.flexWrap = "nowrap";
    row.style.willChange = "transform";
    row.style.touchAction = "pan-y";

    buildTripledTrack(row);

    // Alternate direction: even rows move right, odd rows move left? (adjust if you want opposite)
    // Here: even ->, odd <-
    const dir = index % 2 === 0 ? 1 : -1;

    const baseRate = prefersReduced ? 0 : 1;

    let anim = null;
    let setWidth = 0;
    let duration = 0;

    // These describe the actual transform range of the current animation
    let fromX = 0;
    let toX = 0;
    let deltaX = 0;

    let targetRate = baseRate;
    let currentRate = baseRate;

    let dragging = false;
    let pointerId = null;
    let lastX = 0;
    let lastTime = 0;

    let raf = 0;

    function startOrRestart() {
      const w = measureSetWidth(row);
      if (!w || w < 10) return false;

      const prevTime = anim?.currentTime ?? 0;
      const prevDuration =
        duration || (anim?.effect?.getTiming?.().duration ?? 0) || 0;

      setWidth = w;
      duration = (setWidth / PX_PER_SEC) * 1000;

      // Always start from the MIDDLE copy so we have duplicates on both sides.
      fromX = -setWidth;
      toX = dir === 1 ? 0 : -2 * setWidth;
      deltaX = toX - fromX; // +/- setWidth

      anim?.cancel();
      anim = row.animate(
        [
          { transform: `translate3d(${fromX}px,0,0)` },
          { transform: `translate3d(${toX}px,0,0)` }
        ],
        { duration, iterations: Infinity, easing: "linear", fill: "both" }
      );

      // Preserve phase by progress (so resizes don’t jump)
      const progress = prevDuration ? (prevTime / prevDuration) : 0;
      const resumedTime = wrapTime(progress * duration, duration);

      anim.currentTime = resumedTime;
      anim.playbackRate = dragging ? 0 : currentRate;
      lastTime = resumedTime;

      return true;
    }

    function tick() {
      raf = 0;
      if (!anim) return;

      currentRate += (targetRate - currentRate) * HOVER_EASE;

      if (Math.abs(targetRate - currentRate) < 0.001) currentRate = targetRate;
      if (Math.abs(currentRate) < 0.0005) currentRate = 0;

      anim.playbackRate = dragging ? 0 : currentRate;

      if (dragging || Math.abs(targetRate - currentRate) >= 0.001) {
        raf = requestAnimationFrame(tick);
      }
    }

    function requestTick() {
      if (!raf) raf = requestAnimationFrame(tick);
    }

    function ensureStarted() {
      if (anim) return;
      if (!startOrRestart()) requestAnimationFrame(ensureStarted);
    }
    ensureStarted();

    row.addEventListener("pointercancel", () => console.log("pointercancel", index));

    row.addEventListener("mouseenter", () => {
      targetRate = 0;
      requestTick();
    });

    row.addEventListener("mouseleave", () => {
      if (prefersReduced) return;
      if (!dragging) {
        targetRate = baseRate;
        requestTick();
      }
    });

    row.addEventListener("pointerdown", (e) => {
      if (!anim) return;
      if (e.button !== undefined && e.button !== 0) return;

      dragging = true;
      pointerId = e.pointerId;
      row.setPointerCapture(pointerId);

      lastX = e.clientX;
      lastTime = anim.currentTime ?? 0;

      targetRate = 0;
      requestTick();
    });

    row.addEventListener("pointermove", (e) => {
      if (!anim) return;
      if (!dragging || e.pointerId !== pointerId) return;

      const dx = (e.clientX - lastX) * DRAG_SENS;
      lastX = e.clientX;

      // Map pixel movement to timeline movement based on the actual transform delta.
      // This stays correct regardless of direction because deltaX is +/- setWidth.
      const dt = (dx / deltaX) * duration;

      const t = wrapTime(lastTime + dt, duration);
      anim.currentTime = t;
      lastTime = t;
    });

    function endDrag(e) {
      if (!anim) return;
      if (!dragging || e.pointerId !== pointerId) return;

      dragging = false;
      try { row.releasePointerCapture(pointerId); } catch {}
      pointerId = null;

      const hovered = row.matches(":hover");
      targetRate = prefersReduced ? 0 : (hovered ? 0 : baseRate);
      requestTick();
    }

    row.addEventListener("pointerup", endDrag);
    row.addEventListener("pointercancel", endDrag);

    const ro = new ResizeObserver(() => {
      if (!anim || dragging) return;
      startOrRestart();
    });
    ro.observe(row);

    window.addEventListener("load", () => {
      if (!anim) ensureStarted();
      else if (!dragging) startOrRestart();
    }, { once: true });

    return {
      destroy: () => {
        ro.disconnect();
        anim?.cancel();
      }
    };
  }

  function init() {
    const rows = Array.from(document.querySelectorAll(ROW_SEL));
    rows.forEach((row, i) => makeRowController(row, i));
  }

  init();
});