(() => {
  document.documentElement.classList.add("js");

  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smoothstep = (start, end, value) => {
    const progress = clamp((value - start) / Math.max(0.0001, end - start));
    return progress * progress * (3 - 2 * progress);
  };

  const buildBlurText = (text, className, initialDelay, wordDelay) => {
    const paragraph = document.createElement("p");
    paragraph.className = `blur-text ${className}`;

    text.split(" ").forEach((word, index, words) => {
      const segment = document.createElement("span");
      segment.className = "blur-text__segment";
      segment.style.setProperty("--blur-delay", `${initialDelay + index * wordDelay}ms`);
      segment.style.setProperty("--blur-duration", "0.55s");
      segment.style.setProperty("--blur-offset", "-20px");
      segment.textContent = index < words.length - 1 ? `${word}\u00a0` : word;
      paragraph.append(segment);
    });

    return paragraph;
  };

  const setupScrollIntro = () => {
    const root = document.querySelector(".home-scroll-intro__expand");
    if (!root) return;

    const track = root.querySelector(".scroll-expand__track");
    const stage = root.querySelector(".scroll-expand__stage");
    const frame = root.querySelector(".scroll-expand__frame");
    const media = root.querySelector(".scroll-expand__media");
    const hint = root.querySelector(".scroll-expand__hint");
    const textHost = root.querySelector(".home-scroll-intro__layout");
    if (!track || !stage || !frame || !media || !textHost) return;

    const startsAtTop = window.location.hash === "" || window.location.hash === "#top";
    let armed = !startsAtTop;
    let textAdded = false;
    let raf = 0;

    const revealText = () => {
      if (textAdded) return;
      textAdded = true;
      const wrapper = document.createElement("div");
      wrapper.className = "home-scroll-intro__text";
      wrapper.append(
        buildBlurText(
          "Hi, I am Sylar, an industrial designer.",
          "home-intro__copy home-intro__copy--first",
          120,
          110,
        ),
        buildBlurText(
          "I create thoughtful products, systems and experiences for a better everyday and a better world.",
          "home-intro__copy",
          720,
          90,
        ),
      );
      textHost.append(wrapper);
    };

    const measure = () => {
      const viewport = Math.round(
        window.visualViewport ? window.visualViewport.height : window.innerHeight,
      );
      stage.style.height = `${viewport}px`;
      track.style.height = `${viewport * 2.97}px`;
    };

    const render = (rawProgress) => {
      const progress = smoothstep(0, 1, rawProgress);
      const width = 15 + 85 * progress;
      const height = 22 + 78 * progress;
      const insetX = (100 - width) / 2;
      const insetY = (100 - height) / 2;
      const radius = 12 * (1 - progress);

      const clip = `inset(${insetY}% ${insetX}% ${insetY}% ${insetX}% round ${radius}px)`;
      frame.style.webkitClipPath = clip;
      frame.style.clipPath = clip;
      media.style.transform = `translate3d(${7 - 31 * progress}%, ${15 - 4 * progress}%, 0) scale(${0.46 + 0.3 * progress})`;
      media.style.opacity = `${smoothstep(0.28, 0.6, rawProgress)}`;
      if (hint) hint.style.opacity = `${1 - smoothstep(0.16, 0.26, rawProgress)}`;

      if (rawProgress >= 0.96) revealText();
    };

    const update = () => {
      raf = 0;
      if (!armed) return;
      const span = Math.max(1, window.innerHeight * 0.82);
      const progress = clamp(-track.getBoundingClientRect().top / span);
      render(progress);
    };

    const requestUpdate = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    measure();

    if (reduceMotion) {
      render(1);
      revealText();
      track.style.height = `${Math.round(window.innerHeight)}px`;
      return;
    }

    if (startsAtTop) {
      // Browsers commonly restore the previous scroll position after a reload.
      // Keep the published homepage deterministic: every fresh visit starts at
      // the logo-only state, then the first downward scroll drives the reveal.
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }

      const resetIntro = () => {
        window.scrollTo(0, 0);
        render(0);
      };

      const armIntro = () => {
        if (armed) return;
        armed = true;
        requestUpdate();
      };

      const armFromKey = (event) => {
        if (["ArrowDown", "PageDown", "End", " "].includes(event.key)) armIntro();
      };

      resetIntro();
      requestAnimationFrame(resetIntro);
      window.addEventListener("pageshow", resetIntro, { once: true });
      window.addEventListener("wheel", armIntro, { passive: true, once: true });
      window.addEventListener("touchstart", armIntro, { passive: true, once: true });
      window.addEventListener("keydown", armFromKey, { once: true });
    } else {
      render(0);
      armed = true;
      requestUpdate();
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", () => {
      measure();
      requestUpdate();
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", () => {
        measure();
        requestUpdate();
      });
    }
  };

  const setupSectionReveals = () => {
    const sections = document.querySelectorAll(
      ".project-showcase-section, .product-showcase-section, .framer-about",
    );
    if (!sections.length) return;

    const reveal = (section) => {
      section.style.opacity = "1";
      section.style.transform = "none";
      section.style.transition = reduceMotion
        ? "none"
        : "opacity 700ms cubic-bezier(0.22, 1, 0.36, 1), transform 800ms cubic-bezier(0.22, 1, 0.36, 1)";
    };

    if (reduceMotion || !("IntersectionObserver" in window)) {
      sections.forEach(reveal);
      return;
    }

    sections.forEach((section) => {
      section.style.opacity = "0.32";
      section.style.transform = "translateY(82px) scale(0.972)";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8%" },
    );
    sections.forEach((section) => observer.observe(section));
  };

  const setupTiltedCards = () => {
    if (!finePointer || reduceMotion) return;

    document.querySelectorAll(".tilted-card").forEach((card) => {
      const inner = card.querySelector(".tilted-card__inner");
      const caption = card.querySelector(".tilted-card__caption");
      if (!inner) return;

      const move = (event) => {
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
      };

      const leave = () => {
        inner.style.transform = "";
        if (caption) {
          caption.style.opacity = "0";
          caption.style.transform = "";
        }
      };

      if ("PointerEvent" in window) {
        card.addEventListener("pointermove", move);
        card.addEventListener("pointerleave", leave);
      } else {
        card.addEventListener("mousemove", move);
        card.addEventListener("mouseleave", leave);
      }
    });
  };

  setupScrollIntro();
  setupSectionReveals();
  setupTiltedCards();
})();
