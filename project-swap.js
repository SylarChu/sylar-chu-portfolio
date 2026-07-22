(() => {
  const SWAP_DELAY = 5000;
  const EXIT_DURATION = 520;
  const DRAG_THRESHOLD = 58;

  const initialize = (root) => {
    if (root.dataset.enhanced === "true") return;

    const stage = root.querySelector("[data-card-swap-stage]");
    const cards = Array.from(root.querySelectorAll("[data-card-index]"));
    const projectLinks = Array.from(root.querySelectorAll("[data-project-index]"));
    if (!stage || cards.length < 2) return;

    root.dataset.enhanced = "true";
    let order = cards.map((_, index) => index);
    let timer;
    let exitTimer;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let dragX = 0;
    let dragY = 0;
    let didDrag = false;

    const render = () => {
      order.forEach((cardIndex, position) => {
        const card = cards[cardIndex];
        card.dataset.position = String(position);
        card.setAttribute("aria-hidden", position === 0 ? "false" : "true");
      });

      projectLinks.forEach((link, index) => {
        const isActive = index === order[0];
        link.dataset.active = isActive ? "true" : "false";
        if (isActive) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    };

    const resetTimer = () => {
      window.clearInterval(timer);
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        timer = window.setInterval(() => advance(), SWAP_DELAY);
      }
    };

    const advance = (targetIndex) => {
      if (root.dataset.animating === "true") return;

      if (Number.isInteger(targetIndex) && order[0] !== targetIndex) {
        order = [targetIndex, ...order.filter((index) => index !== targetIndex)];
        render();
        resetTimer();
        return;
      }

      const front = cards[order[0]];
      root.dataset.animating = "true";
      front.classList.add("is-exiting");
      order = [...order.slice(1), order[0]];
      render();

      window.clearTimeout(exitTimer);
      exitTimer = window.setTimeout(() => {
        front.classList.remove("is-exiting", "is-dragging");
        front.style.removeProperty("--drag-x");
        front.style.removeProperty("--drag-y");
        render();
        root.dataset.animating = "false";
      }, EXIT_DURATION);
      resetTimer();
    };

    projectLinks.forEach((link) => {
      const index = Number(link.dataset.projectIndex);
      link.addEventListener("pointerenter", () => advance(index));
      link.addEventListener("focus", () => advance(index));
    });

    stage.addEventListener("pointerdown", (event) => {
      if (window.matchMedia("(max-width: 760px)").matches) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const front = cards[order[0]];
      if (!front.contains(event.target)) return;

      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      dragX = 0;
      dragY = 0;
      didDrag = false;
      front.classList.add("is-dragging");
      stage.setPointerCapture(pointerId);
      window.clearInterval(timer);
    });

    stage.addEventListener("pointermove", (event) => {
      if (event.pointerId !== pointerId) return;
      const front = cards[order[0]];
      dragX = event.clientX - startX;
      dragY = event.clientY - startY;
      didDrag = Math.abs(dragX) > 6 || Math.abs(dragY) > 6;
      front.style.setProperty("--drag-x", `${dragX}px`);
      front.style.setProperty("--drag-y", `${dragY * 0.28}px`);
    });

    const finishDrag = (event) => {
      if (event.pointerId !== pointerId) return;
      const front = cards[order[0]];
      front.classList.remove("is-dragging");
      pointerId = null;

      if (Math.abs(dragX) >= DRAG_THRESHOLD) {
        advance();
      } else {
        front.style.removeProperty("--drag-x");
        front.style.removeProperty("--drag-y");
        resetTimer();
      }
    };

    stage.addEventListener("pointerup", finishDrag);
    stage.addEventListener("pointercancel", finishDrag);
    stage.addEventListener("click", (event) => {
      if (didDrag) {
        event.preventDefault();
        didDrag = false;
      }
    });

    render();
    resetTimer();
  };

  const boot = () => document.querySelectorAll("[data-card-swap]").forEach(initialize);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
