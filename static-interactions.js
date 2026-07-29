const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

document.querySelectorAll(".tilted-card").forEach((card) => {
  const inner = card.querySelector(".tilted-card__inner");
  const caption = card.querySelector(".tilted-card__caption");

  if (!inner) return;

  card.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" || reducedMotion.matches) return;

    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 7;
    const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -7;

    inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.025)`;

    if (caption) {
      caption.style.opacity = "1";
      caption.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
  });

  card.addEventListener("pointerleave", () => {
    inner.style.transform = "";

    if (caption) {
      caption.style.opacity = "0";
      caption.style.transform = "";
    }
  });
});
