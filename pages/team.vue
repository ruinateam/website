<script setup lang="ts">
const members = [
  {
    name: "Linaryx",
    skin: "https://mc-heads.net/skin/Linaryx",
    animation: "intro" as const,
    accent: "#FF0080",
    accentSoft: "rgba(255, 0, 128, 0.2)",
    socials: [
      { name: "NameMC", href: "https://namemc.com/profile/Linaryx.1", icon: "namemc" },
      { name: "Twitch", href: "https://www.twitch.tv/linaryx", icon: "twitch" },
      { name: "GitHub", href: "https://github.com/Linaryx", icon: "github" },
      { name: "Telegram", href: "https://t.me/linaryx", icon: "telegram" },
    ],
  },
  {
    name: "Digidro",
    skin: "https://mc-heads.net/skin/Digidro",
    animation: "idle" as const,
    accent: "#FF7400",
    accentSoft: "rgba(255, 116, 0, 0.2)",
    socials: [
      { name: "NameMC", href: "https://namemc.com/profile/Digidro.2", icon: "namemc" },
      { name: "Twitch", href: "https://www.twitch.tv/digidro_", icon: "twitch" },
      { name: "GitHub", href: "https://github.com/Digidr0", icon: "github" },
      { name: "Telegram", href: "https://t.me/digidro", icon: "telegram" },
    ],
  },
];
</script>

<template>
  <main class="team-page">
    <header class="team-intro">
      <p class="eyebrow">КОМАНДА</p>
      <h1>Участники Ruina.team</h1>
    </header>

    <section class="team-roster" aria-label="Команда Ruina.team">
      <article
        v-for="member in members"
        :key="member.name"
        class="member-card"
        :style="{ '--accent': member.accent, '--accent-soft': member.accentSoft }"
      >
        <div class="member-card__viewer">
          <div class="member-card__scan" aria-hidden="true"></div>
          <div class="member-card__corner member-card__corner--top" aria-hidden="true"></div>
          <div class="member-card__corner member-card__corner--bottom" aria-hidden="true"></div>
          <ClientOnly>
            <TeamSkinViewer :name="member.name" :skin="member.skin" :animation="member.animation" />
            <template #fallback>
              <div class="member-card__fallback">Загрузка профиля</div>
            </template>
          </ClientOnly>
        </div>

        <div class="member-card__body">
          <div>
            <h2>{{ member.name }}</h2>
          </div>
          <div class="member-card__socials" :aria-label="`Ссылки ${member.name}`">
            <a
              v-for="social in member.socials"
              :key="social.name"
              :href="social.href"
              :aria-label="`${social.name}: ${member.name}`"
              :title="social.name"
              target="_blank"
              rel="noopener noreferrer"
            >
              <SocialIcon :name="social.icon" />
            </a>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
.team-page {
  display: grid;
  gap: clamp(28px, 5vw, 64px);
  padding: clamp(24px, 5vw, 66px) 0 24px;
}

.team-intro {
  position: relative;
  max-width: 760px;
  padding-left: clamp(18px, 3vw, 32px);
}

.team-intro::before {
  position: absolute;
  top: 0.55rem;
  bottom: 0.45rem;
  left: 0;
  width: 2px;
  content: "";
  background: linear-gradient(180deg, #fff, rgba(255, 255, 255, 0.05));
}

.eyebrow {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.eyebrow {
  margin: 0 0 14px;
  color: rgba(255, 255, 255, 0.55);
}

.team-intro h1 {
  max-width: 680px;
  margin: 0;
  font-family: var(--font-base);
  font-size: clamp(2.45rem, 6vw, 5.4rem);
  font-weight: 800;
  letter-spacing: -0.06em;
  line-height: 0.91;
  text-wrap: balance;
}

.team-roster {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(16px, 2.2vw, 28px);
}

.member-card {
  position: relative;
  overflow: hidden;
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.02));
  box-shadow: 0 26px 70px rgba(0, 0, 0, 0.3);
}

.member-card__viewer {
  position: relative;
  height: clamp(340px, 43vw, 550px);
  overflow: hidden;
  isolation: isolate;
  border-bottom: 1px solid rgba(255, 255, 255, 0.11);
  background:
    radial-gradient(circle at 50% 46%, var(--accent-soft), transparent 38%),
    linear-gradient(180deg, #111115, #070708);
}

.member-card__viewer::before,
.member-card__viewer::after {
  position: absolute;
  z-index: 0;
  pointer-events: none;
  content: "";
}

.member-card__viewer :deep(.skin-viewer) {
  position: relative;
  z-index: 1;
}

.member-card__viewer::before {
  inset: 0;
  opacity: 0.32;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.12) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: linear-gradient(180deg, transparent, #000 15%, #000 86%, transparent);
}

.member-card__viewer::after {
  right: 7%;
  bottom: -19%;
  width: 58%;
  aspect-ratio: 1;
  border: 1px solid var(--accent);
  border-radius: 50%;
  opacity: 0.3;
  box-shadow: 0 0 60px var(--accent-soft);
}

.member-card__scan {
  position: absolute;
  z-index: 2;
  top: -35%;
  right: 0;
  left: 0;
  height: 35%;
  pointer-events: none;
  opacity: 0.38;
  background: linear-gradient(180deg, transparent, var(--accent), transparent);
  mix-blend-mode: screen;
  animation: scan 6s linear infinite;
}

.member-card__corner {
  position: absolute;
  z-index: 3;
  width: 30px;
  height: 30px;
  border-color: var(--accent);
  border-style: solid;
  opacity: 0.9;
  pointer-events: none;
}

.member-card__corner--top {
  top: 14px;
  right: 14px;
  border-width: 1px 1px 0 0;
}

.member-card__corner--bottom {
  bottom: 14px;
  left: 14px;
  border-width: 0 0 1px 1px;
}

.member-card__fallback {
  display: grid;
  height: 100%;
  place-items: center;
  color: rgba(255, 255, 255, 0.45);
  font-family: "JetBrains Mono", monospace;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.member-card__body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 120px;
  padding: clamp(16px, 2vw, 24px);
}

.member-card h2 {
  margin: 0;
  font-family: var(--font-minecraft);
  font-size: clamp(1.8rem, 3vw, 2.6rem);
  font-weight: 400;
  letter-spacing: 0.015em;
  line-height: 1;
}

.member-card__socials {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.member-card__socials a {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.78);
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    color 0.15s ease,
    transform 0.15s ease;
}

.member-card__socials a:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: #ffffff;
  transform: translateY(-2px);
}

.member-card__socials svg {
  width: 18px;
  height: 18px;
}

@keyframes scan {
  to {
    transform: translateY(390%);
  }
}

@media (max-width: 700px) {
  .team-page {
    padding-top: 18px;
  }

  .team-intro h1 {
    letter-spacing: -0.06em;
  }

  .team-roster {
    grid-template-columns: 1fr;
  }

  .member-card__viewer {
    height: min(124vw, 510px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .member-card__scan {
    animation: none;
  }
}
</style>
