(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function getMaxMove() {
    if (window.innerWidth <= 520) return 78;
    if (window.innerWidth <= 760) return 110;
    if (window.innerWidth <= 1100) return 190;
    return 290;
  }

  function initialize(root) {
    const rows = Array.from(root.querySelectorAll("[data-grid-motion-row]"));
    if (rows.length === 0) return;

    let target = 0;
    let current = 0;
    let frame = 0;
    let gsapActive = false;
    const inertia = [0.5, 0.36, 0.26, 0.18];

    const rowOffset = (index, value) => {
      const direction = index % 2 === 0 ? 1 : -1;
      return value * direction * (1 - index * 0.055);
    };

    const renderNative = () => {
      current += (target - current) * 0.085;
      rows.forEach((row, index) => {
        row.style.transform = `translate3d(${rowOffset(index, current)}px, 0, 0)`;
      });

      if (Math.abs(target - current) > 0.1) {
        frame = window.requestAnimationFrame(renderNative);
      } else {
        frame = 0;
      }
    };

    const moveRows = (value) => {
      target = value;
      if (reduceMotion.matches) return;

      if (window.gsap) {
        gsapActive = true;
        rows.forEach((row, index) => {
          window.gsap.to(row, {
            x: rowOffset(index, value),
            duration: 0.52 + inertia[index],
            ease: "power3.out",
            overwrite: "auto",
          });
        });
        return;
      }

      root.dataset.engine = "native";
      if (!frame) frame = window.requestAnimationFrame(renderNative);
    };

    const handlePointer = (event) => {
      const bounds = root.getBoundingClientRect();
      const normalized = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
      moveRows((normalized - 0.5) * 2 * getMaxMove());
    };

    const returnToCenter = () => moveRows(0);

    root.addEventListener("pointermove", handlePointer, { passive: true });
    root.addEventListener("pointerleave", returnToCenter, { passive: true });
    root.addEventListener("pointercancel", returnToCenter, { passive: true });

    reduceMotion.addEventListener("change", () => {
      if (reduceMotion.matches) {
        target = 0;
        current = 0;
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        if (window.gsap) window.gsap.set(rows, { clearProps: "transform" });
        rows.forEach((row) => row.style.removeProperty("transform"));
      } else {
        moveRows(0);
      }
    });

    if (window.gsap) {
      window.gsap.ticker.lagSmoothing(0);
      root.dataset.engine = "gsap";
      gsapActive = true;
    }

    root.dataset.enhanced = "true";
    if (!reduceMotion.matches) moveRows(0);

    window.addEventListener("load", () => {
      if (!gsapActive && window.gsap && !reduceMotion.matches) {
        root.dataset.engine = "gsap";
        window.gsap.ticker.lagSmoothing(0);
        gsapActive = true;
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        moveRows(target);
      }
    }, { once: true });
  }

  document.querySelectorAll("[data-grid-motion]").forEach(initialize);
})();
