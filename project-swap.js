(() => {
  const DRAG_THRESHOLD = 54;

  const initialize = (container) => {
    if (container.dataset.enhanced === "true") return;

    const shell = container.closest(".project-swap");
    const cards = Array.from(container.querySelectorAll("[data-card-index]"));
    const projectLinks = Array.from(
      shell?.querySelectorAll("[data-project-index]") ?? [],
    );
    if (cards.length < 2) return;

    const gsap = window.gsap;
    const baseDistanceX = Number(container.dataset.cardDistance) || 60;
    const baseDistanceY = Number(container.dataset.verticalDistance) || 70;
    const delay = Number(container.dataset.delay) || 5000;
    const skew = Number(container.dataset.skewAmount) || 3;
    const elastic = container.dataset.easing !== "linear";
    const pauseOnHover = container.dataset.pauseOnHover === "true";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const config = elastic
      ? {
          ease: "elastic.out(0.6,0.9)",
          drop: 1.05,
          move: 1.25,
          back: 1.25,
          overlap: 0.78,
        }
      : {
          ease: "power1.inOut",
          drop: 0.62,
          move: 0.7,
          back: 0.7,
          overlap: 0.45,
        };

    let order = cards.map((_, index) => index);
    let timer;
    let timeline;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let dragX = 0;
    let dragY = 0;
    let didDrag = false;
    let animating = false;

    const distanceScale = () => {
      if (window.matchMedia("(max-width: 480px)").matches) return 0.28;
      if (window.matchMedia("(max-width: 760px)").matches) return 0.35;
      return 1;
    };

    const makeSlot = (position) => {
      const scale = distanceScale();
      const x = position * baseDistanceX * scale;
      const y = -position * baseDistanceY * scale;
      return {
        x,
        y,
        z: -position * baseDistanceX * 1.5 * scale,
        zIndex: cards.length - position,
      };
    };

    const transformFor = (slot, extraX = 0, extraY = 0) =>
      `translate3d(calc(-50% + ${slot.x + extraX}px), calc(-50% + ${
        slot.y + extraY
      }px), ${slot.z}px) skewY(${skew}deg)`;

    const placeNow = (element, slot) => {
      if (gsap) {
        gsap.set(element, {
          x: slot.x,
          y: slot.y,
          z: slot.z,
          xPercent: -50,
          yPercent: -50,
          skewY: skew,
          transformOrigin: "center center",
          zIndex: slot.zIndex,
          force3D: true,
        });
      } else {
        element.style.zIndex = String(slot.zIndex);
        element.style.transform = transformFor(slot);
      }
    };

    const animateFallback = (element, slot, duration = 700) => {
      const animation = element.animate(
        [{ transform: element.style.transform }, { transform: transformFor(slot) }],
        {
          duration,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        },
      );
      animation.addEventListener("finish", () => {
        element.style.transform = transformFor(slot);
        animation.cancel();
      });
      element.style.zIndex = String(slot.zIndex);
      return animation.finished.catch(() => undefined);
    };

    const updateActiveState = () => {
      cards.forEach((card, index) => {
        const isFront = index === order[0];
        card.dataset.front = isFront ? "true" : "false";
        card.setAttribute("aria-hidden", isFront ? "false" : "true");
        card.tabIndex = isFront ? 0 : -1;
      });

      projectLinks.forEach((link, index) => {
        const isActive = index === order[0];
        link.dataset.active = isActive ? "true" : "false";
        if (isActive) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    };

    const placeAll = () => {
      order.forEach((cardIndex, position) => placeNow(cards[cardIndex], makeSlot(position)));
      updateActiveState();
    };

    const stopTimer = () => window.clearInterval(timer);
    const startTimer = () => {
      stopTimer();
      if (!reducedMotion.matches) timer = window.setInterval(swap, delay);
    };

    const showProject = (targetIndex) => {
      if (animating || order[0] === targetIndex || !order.includes(targetIndex)) return;
      timeline?.kill?.();
      order = [targetIndex, ...order.filter((index) => index !== targetIndex)];
      updateActiveState();

      order.forEach((cardIndex, position) => {
        const card = cards[cardIndex];
        const slot = makeSlot(position);
        if (gsap) {
          gsap.to(card, {
            ...slot,
            duration: reducedMotion.matches ? 0 : 0.65,
            ease: "power2.out",
            overwrite: true,
          });
        } else {
          animateFallback(card, slot, reducedMotion.matches ? 1 : 650);
        }
      });
      startTimer();
    };

    const swapWithGsap = () => {
      const [front, ...rest] = order;
      const frontCard = cards[front];
      const nextOrder = [...rest, front];
      const dropDistance = Math.max(420, container.clientHeight * 0.88);

      animating = true;
      order = nextOrder;
      updateActiveState();
      timeline?.kill?.();
      timeline = gsap.timeline({
        onComplete: () => {
          animating = false;
        },
      });

      timeline.to(frontCard, {
        y: `+=${dropDistance}`,
        duration: config.drop,
        ease: config.ease,
      });
      timeline.addLabel("promote", `-=${config.drop * config.overlap}`);

      rest.forEach((cardIndex, position) => {
        const card = cards[cardIndex];
        const slot = makeSlot(position);
        timeline.set(card, { zIndex: slot.zIndex }, "promote");
        timeline.to(
          card,
          {
            x: slot.x,
            y: slot.y,
            z: slot.z,
            duration: config.move,
            ease: config.ease,
          },
          `promote+=${position * 0.1}`,
        );
      });

      const backSlot = makeSlot(cards.length - 1);
      timeline.addLabel("return", `promote+=${config.move * 0.08}`);
      timeline.set(frontCard, { zIndex: backSlot.zIndex }, "return");
      timeline.to(
        frontCard,
        {
          x: backSlot.x,
          y: backSlot.y,
          z: backSlot.z,
          duration: config.back,
          ease: config.ease,
        },
        "return",
      );
    };

    const swapFallback = async () => {
      const [front, ...rest] = order;
      const frontCard = cards[front];
      const frontSlot = makeSlot(0);
      const dropDistance = Math.max(420, container.clientHeight * 0.88);

      animating = true;
      order = [...rest, front];
      updateActiveState();
      const drop = frontCard.animate(
        [
          { transform: transformFor(frontSlot) },
          { transform: transformFor(frontSlot, 0, dropDistance) },
        ],
        {
          duration: 620,
          easing: "cubic-bezier(0.65, 0, 0.35, 1)",
          fill: "forwards",
        },
      );

      await Promise.all([
        drop.finished.catch(() => undefined),
        ...rest.map((cardIndex, position) =>
          animateFallback(cards[cardIndex], makeSlot(position), 700),
        ),
      ]);
      drop.cancel();
      await animateFallback(frontCard, makeSlot(cards.length - 1), 700);
      animating = false;
    };

    function swap() {
      if (animating || order.length < 2 || reducedMotion.matches) return;
      if (gsap) swapWithGsap();
      else swapFallback();
    }

    projectLinks.forEach((link) => {
      const index = Number(link.dataset.projectIndex);
      link.addEventListener("pointerenter", () => showProject(index));
      link.addEventListener("focus", () => showProject(index));
    });

    container.addEventListener("pointerdown", (event) => {
      if (animating || reducedMotion.matches) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const frontCard = cards[order[0]];
      if (!frontCard.contains(event.target)) return;

      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      dragX = 0;
      dragY = 0;
      didDrag = false;
      container.dataset.dragging = "true";
      container.setPointerCapture(pointerId);
      stopTimer();
      timeline?.pause?.();
    });

    container.addEventListener("pointermove", (event) => {
      if (event.pointerId !== pointerId) return;
      dragX = event.clientX - startX;
      dragY = event.clientY - startY;
      didDrag = Math.abs(dragX) > 6 || Math.abs(dragY) > 6;
      const frontCard = cards[order[0]];
      const frontSlot = makeSlot(0);

      if (gsap) {
        gsap.set(frontCard, {
          x: frontSlot.x + dragX,
          y: frontSlot.y + dragY * 0.25,
          rotationZ: dragX * 0.012,
        });
      } else {
        frontCard.style.transform = transformFor(frontSlot, dragX, dragY * 0.25);
      }
    });

    const finishDrag = (event) => {
      if (event.pointerId !== pointerId) return;
      const frontCard = cards[order[0]];
      const frontSlot = makeSlot(0);
      pointerId = null;
      delete container.dataset.dragging;

      if (Math.abs(dragX) >= DRAG_THRESHOLD) {
        if (gsap) gsap.set(frontCard, { rotationZ: 0 });
        swap();
      } else if (gsap) {
        gsap.to(frontCard, {
          x: frontSlot.x,
          y: frontSlot.y,
          rotationZ: 0,
          duration: 0.45,
          ease: "power2.out",
        });
      } else {
        animateFallback(frontCard, frontSlot, 450);
      }
      timeline?.resume?.();
      startTimer();
    };

    container.addEventListener("pointerup", finishDrag);
    container.addEventListener("pointercancel", finishDrag);
    container.addEventListener("click", (event) => {
      if (didDrag) {
        event.preventDefault();
        didDrag = false;
      }
    });

    if (pauseOnHover) {
      container.addEventListener("mouseenter", () => {
        stopTimer();
        timeline?.pause?.();
      });
      container.addEventListener("mouseleave", () => {
        timeline?.resume?.();
        startTimer();
      });
    }

    let resizeFrame;
    window.addEventListener("resize", () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(placeAll);
    });
    reducedMotion.addEventListener?.("change", () => {
      placeAll();
      startTimer();
    });

    container.dataset.enhanced = "true";
    container.dataset.engine = gsap ? "gsap" : "native";
    placeAll();
    startTimer();
  };

  const boot = () =>
    document.querySelectorAll("[data-card-swap]").forEach(initialize);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
