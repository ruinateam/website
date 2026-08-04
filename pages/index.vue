<template>
  <main class="home" :class="{ 'is-ready': isReady }">
    <section class="hero">
      <div class="hero-overlay" aria-hidden="true"></div>
      <div class="hero-noise" aria-hidden="true"></div>
      <div class="hero-fade" aria-hidden="true"></div>

      <div class="hero-inner">
        <div class="hero-wordmark" aria-hidden="true">
          <span>RUINA</span>
          <span>TEAM</span>
        </div>
      </div>
    </section>

    <footer class="home-footer">
      <div class="home-footer-inner">
        <p class="home-footer-brand">ruina.team {{ currentYear }}</p>
        <div class="home-footer-links">
          <a
            class="home-footer-link"
            href="https://github.com/ruinateam/website"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            title="GitHub"
          >
            <SocialIcon name="github" />
          </a>
          <a
            class="home-footer-link"
            href="https://www.twitch.tv/linaryx"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitch"
            title="Twitch"
          >
            <SocialIcon name="twitch" />
          </a>
          <a
            class="home-footer-link"
            href="https://t.me/linaryx"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Telegram"
            title="Telegram"
          >
            <SocialIcon name="telegram" />
          </a>
        </div>
      </div>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";

const appReady = useState("app-ready", () => false);
const isReady = ref(false);
const fontsReady = ref(false);
const currentYear = new Date().getFullYear();

const startAnimation = () => {
  if (isReady.value || !appReady.value || !fontsReady.value) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      isReady.value = true;
    });
  });
};

onMounted(async () => {
  const maxWaitMs = 400;
  const documentFontsReady = (document as any)?.fonts?.ready as Promise<void> | undefined;

  if (documentFontsReady && typeof (documentFontsReady as any).then === "function") {
    Promise.race([documentFontsReady, new Promise((r) => setTimeout(r, maxWaitMs))])
      .then(() => {
        fontsReady.value = true;
        startAnimation();
      })
      .catch(() => {
        fontsReady.value = true;
        startAnimation();
      });
    return;
  }

  setTimeout(() => {
    fontsReady.value = true;
    startAnimation();
  }, 0);
});

watch(
  () => appReady.value,
  (ready) => {
    if (ready) startAnimation();
  },
);
</script>

<style scoped>
.home {
  min-height: 100vh;
  min-height: 100dvh;
  background: #060708;
}

.hero {
  --hero-pad-top: clamp(104px, 12vh, 144px);
  --hero-pad-bottom: 24px;
  position: relative;
  display: flex;
  height: 100vh;
  height: 100dvh;
  margin: 0;
  padding: var(--hero-pad-top) clamp(20px, 5vw, 56px) var(--hero-pad-bottom);
  overflow: hidden;
  background: url("/bg.webp") center / cover no-repeat;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  /*background:
    radial-gradient(ellipse at 50% 38%, rgba(188, 222, 226, 0.14), transparent 44%),
    linear-gradient(180deg, rgba(5, 7, 8, 0.18), rgba(5, 7, 8, 0.5)),
    url("/ruines.webp") center bottom / min(1420px, 94%) no-repeat;*/
  background: url("/ruines.webp") center bottom / min(1420px, 94%) no-repeat;
  opacity: 0;
  filter: blur(10px);
  transform: translateY(78px) scale(1.08);
  pointer-events: none;
  z-index: 2;
}

.hero-noise {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(6, 8, 9, 0.06), rgba(6, 8, 9, 0.28));
  mix-blend-mode: screen;
  opacity: 0;
  transform: scale(1.03);
  pointer-events: none;
}

.hero-fade {
  position: absolute;
  inset: auto 0 0;
  height: clamp(140px, 18vh, 220px);
  background: linear-gradient(180deg, rgba(6, 7, 8, 0), rgba(6, 7, 8, 0.72) 54%, #070809 100%);
  pointer-events: none;
  z-index: 0;
}

.hero-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.hero-wordmark {
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 0;
  text-align: center;
  font-size: clamp(5rem, 14vw, 10rem);
  line-height: 0.88;
  letter-spacing: -0.06em;
  font-weight: 900;
  color: #fff;
  text-shadow:
    0 0 24px rgba(255, 255, 255, 0.7),
    0 0 60px rgba(180, 222, 230, 0.22);
  filter: blur(18px);
  transform: translateY(-24px) scale(0.84);
  opacity: 0;
}

.home-footer {
  position: relative;
  z-index: 1;
  background:
    linear-gradient(180deg, rgba(7, 8, 9, 0.92), rgba(7, 8, 9, 0.98)), rgba(7, 8, 9, 0.98);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.home-footer-inner {
  width: min(460px, calc(100% - 40px));
  margin: 0 auto;
  min-height: 84px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
}

.home-footer-brand {
  margin: 0;
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.88rem;
  letter-spacing: 0.03em;
}

.home-footer-links {
  display: flex;
  align-items: center;
  gap: 12px;
}

.home-footer-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.68);
  transition:
    color 0.12s ease,
    opacity 0.12s ease,
    transform 0.12s ease;
}

.home-footer-link svg {
  display: block;
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
}

.home-footer-link:hover {
  color: #ffffff;
  transform: translateY(-1px);
}

.home.is-ready .hero-overlay {
  opacity: 1;
  filter: blur(0);
  transform: translateY(0) scale(1);
  transition:
    opacity 1s cubic-bezier(0.18, 0.88, 0.24, 1),
    filter 1.35s var(--ease-emphasis),
    transform 1.7s var(--ease-emphasis);
}

.home.is-ready .hero-noise {
  opacity: 1;
  transform: scale(1);
  transition:
    opacity 1.4s cubic-bezier(0.18, 0.88, 0.24, 1),
    transform 1.8s var(--ease-emphasis);
}

.home.is-ready .hero-wordmark {
  opacity: 1;
  filter: blur(0);
  transform: translateY(-90px);
  transition:
    opacity 0.95s cubic-bezier(0.22, 1, 0.36, 1) 0.16s,
    filter 1.15s var(--ease-emphasis) 0.16s,
    transform 1.5s var(--ease-emphasis) 0.16s;
}

@media (max-width: 1100px) {
  .hero-wordmark {
    transform: none;
    font-size: clamp(4rem, 18vw, 8rem);
  }
}

@media (max-width: 700px) {
  .hero {
    --hero-pad-top: calc(var(--nav-height, 72px) + 28px);
    --hero-pad-bottom: 18px;
    padding-inline: 14px;
  }

  .home-footer-inner {
    width: min(320px, calc(100% - 28px));
    min-height: 76px;
    gap: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-overlay,
  .hero-noise,
  .hero-wordmark {
    opacity: 1 !important;
    filter: none !important;
    transform: none !important;
    transition: none !important;
  }
}
</style>
