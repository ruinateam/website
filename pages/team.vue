<script setup lang="ts">
const members = [
  {
    name: "Linaryx",
    skin: {
      remote:
        "https://textures.minecraft.net/texture/9cffc10b798d3adac173fc1bcf23645018b8606e9a4f7a21acdb2dbbc7e518cf",
      local: "/skins/linaryx.png",
    },
    socials: [
      { name: "NameMC", href: "https://namemc.com/profile/Linaryx.1", icon: "namemc" },
      { name: "Twitch", href: "https://www.twitch.tv/linaryx", icon: "twitch" },
      { name: "GitHub", href: "https://github.com/Linaryx", icon: "github" },
      { name: "Telegram", href: "https://t.me/linaryx", icon: "telegram" },
    ],
  },
  {
    name: "Digidro",
    skin: {
      remote:
        "https://textures.minecraft.net/texture/24544397466101c4d914fa0b60fc9db40b40ffee7a270c248ff4e6f75f47d36",
      local: "/skins/digidro.png",
    },
    socials: [
      { name: "NameMC", href: "https://namemc.com/profile/Digidro.2", icon: "namemc" },
      { name: "Twitch", href: "https://www.twitch.tv/digidro_", icon: "twitch" },
      { name: "GitHub", href: "https://github.com/Digidr0", icon: "github" },
      { name: "Telegram", href: "https://t.me/digidr0", icon: "telegram" },
    ],
  },
  {
    name: "Faldoor",
    skin: {
      remote:
        "https://textures.minecraft.net/texture/94f5c2e66f632f61a07c9764e1cca71c09b4386f231d9234f99fe719d15db94a",
      local: "/skins/faldoor.png",
    },
    socials: [
      { name: "NameMC", href: "https://namemc.com/profile/Faldoor.1", icon: "namemc" },
      { name: "Twitch", href: "https://www.twitch.tv/faldoorch", icon: "twitch" },
      { name: "GitHub", href: "https://github.com/faldoor", icon: "github" },
      { name: "Telegram", href: "https://t.me/faldoorch", icon: "telegram" },
    ],
  },
];
const teamPrepared = useState("team-prepared", () => false);
const teamVisited = useState("team-visited", () => false);
const preloadGallery = !teamVisited.value;
onMounted(() => {
  teamVisited.value = true;
});
teamPrepared.value = false;

const { track, stage, scenes, gallery, cinematic, activeMember, navigateToMember, scheduleUpdate } =
  useTeamSequence(members.map((member) => member.name.toLowerCase()));

useSeoMeta({
  title: "Команда — Ruina.team",
  description: "Участники Ruina.team: Linaryx, Digidro и Faldoor.",
});

useHead({
  link: [
    ...(preloadGallery
      ? [
          {
            rel: "preconnect" as const,
            href: "https://textures.minecraft.net",
            crossorigin: "anonymous" as const,
          },
        ]
      : []),
    ...(preloadGallery
      ? [
          "/bg.webp",
          ...["purpur_block", "purpur_pillar", "purpur_pillar_top"].map(
            (name) => `/textures/purpur/${name}.png`,
          ),
        ]
      : []
    ).map((href) => ({
      rel: "preload" as const,
      as: "image" as const,
      href,
      ...(href === "/bg.webp" ? {} : { crossorigin: "anonymous" as const }),
    })),
  ],
  noscript: [
    {
      innerHTML:
        "<style>.app-loader{display:none!important}.app-stage{opacity:1!important;filter:none!important}</style>",
    },
  ],
});
</script>

<template>
  <main class="team-page" aria-label="Команда">
    <nav class="team-index" aria-label="Участники команды" :style="{ '--active': activeMember }">
      <span class="team-index__indicator" aria-hidden="true"></span>
      <a
        v-for="(member, index) in members"
        :key="member.name"
        :href="`#${member.name.toLowerCase()}`"
        :aria-current="activeMember === index ? 'location' : undefined"
        @click="navigateToMember($event, index)"
      >
        {{ member.name }}
      </a>
    </nav>

    <div ref="track" class="team-track" :class="{ 'is-cinematic': cinematic }">
      <div ref="stage" class="team-stage">
        <TeamGalleryStage
          ref="gallery"
          :skins="members.map((member) => member.skin)"
          :names="members.map((member) => member.name)"
          :cinematic="cinematic"
          :active="activeMember"
          @invalidate="scheduleUpdate"
          @prepared="teamPrepared = true"
        />
        <TeamMemberScene
          v-for="(member, index) in members"
          :key="member.name"
          ref="scenes"
          v-bind="member"
          :index="index"
          :cinematic="cinematic"
        />
      </div>
      <template v-if="cinematic">
        <span
          v-for="member in members"
          :id="member.name.toLowerCase()"
          :key="member.name"
          class="team-track__anchor"
          aria-hidden="true"
        ></span>
      </template>
    </div>
  </main>
</template>

<style>
.app-stage--ready:has(.is-team) {
  /* A non-none filter makes the profile dock fixed to the whole document. */
  filter: none;
}

.site.is-team {
  background: var(--color-team-stage);
}

.site.is-team .shell {
  width: 100%;
  padding-top: 0;
  padding-bottom: 0;
}

/* Only the mounted desktop cinematic gallery owns the document viewport. */
html:has(.team-track.is-cinematic),
body:has(.team-track.is-cinematic) {
  overflow: hidden;
  overscroll-behavior: none;
}

.site.is-team:has(.is-cinematic) {
  height: 100dvh;
  min-height: 0;
  overflow: clip;
}

.site.is-team:has(.is-cinematic) .shell {
  min-height: 0;
}

@media (max-width: 719px) {
  /* The mobile gallery owns the viewport; keep the compact navigation over it. */
  .site.is-team .nav {
    position: fixed;
    top: max(10px, env(safe-area-inset-top));
    right: max(12px, env(safe-area-inset-right));
    left: max(12px, env(safe-area-inset-left));
    width: auto;
    margin: 0;
    border-color: rgba(255, 255, 255, 0.07);
    background: linear-gradient(180deg, rgba(10, 13, 14, 0.88), rgba(10, 13, 14, 0.64));
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.34);
  }

  /* Native mobile scroll keeps one member composition per viewport. */
  html:has(.team-track:not(.is-cinematic)) {
    scroll-padding-top: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  html:has(.is-team) {
    scroll-behavior: auto;
  }
}
</style>

<style scoped>
.team-page {
  position: relative;
  isolation: isolate;
  overflow-x: clip;
  background: var(--color-team-stage);
  padding-top: 40px;
  padding-bottom: 104px;
}

.team-page::after {
  content: "";
  position: fixed;
  z-index: 14;
  inset: auto 0 0;
  height: clamp(96px, 14vh, 144px);
  background: linear-gradient(rgba(7, 9, 10, 0), rgba(7, 9, 10, 0.94));
  pointer-events: none;
}

.team-track {
  position: relative;
}

.team-stage {
  position: relative;
}

.team-stage::before {
  content: "";
  position: absolute;
  inset: 0;
  background: url("/bg.webp") center / cover;
  mask-image: linear-gradient(transparent, black 18%, black 85%, transparent);
  pointer-events: none;
}

.team-track.is-cinematic {
  height: var(--team-stage-height);
}

.team-page:has(.is-cinematic) {
  padding: 0;
}

.is-cinematic .team-stage {
  position: fixed;
  left: 0;
  right: 0;
  top: var(--team-stage-top);
  height: var(--team-stage-height);
  isolation: isolate;
}

.team-track__anchor {
  position: absolute;
  top: 0;
  width: 1px;
  height: 1px;
  pointer-events: none;
}

.team-index {
  --dock-pad: 4px;
  position: fixed;
  z-index: 15;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: min(320px, calc(100% - 32px));
  padding: var(--dock-pad);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 16px;
  background: rgba(10, 12, 12, 0.82);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.46);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.team-index__indicator {
  position: absolute;
  z-index: 0;
  top: var(--dock-pad);
  bottom: var(--dock-pad);
  left: var(--dock-pad);
  width: calc((100% - (var(--dock-pad) * 2)) / 3);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  pointer-events: none;
  transform: translate3d(calc(var(--active) * 100%), 0, 0);
  transition: transform 420ms var(--ease-emphasis);
}

.team-index a {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 44px;
  padding: 8px 10px;
  border-radius: 12px;
  color: rgba(236, 239, 240, 0.58);
  font-size: 0.875rem;
  font-weight: 700;
  text-decoration: none;
  transition: color var(--duration-fast) var(--ease-smooth);
}

.team-index a[aria-current] {
  color: var(--color-text-1);
}

@media (hover: hover) and (pointer: fine) {
  .team-index a:hover {
    color: var(--color-text-1);
  }
}

.team-page a:hover {
  color: var(--color-text-1);
}

.team-page a:focus-visible {
  outline: 2px solid var(--color-text-1);
  outline-offset: 4px;
}

.team-page a:active {
  background: var(--color-surface);
}

.team-index a:active {
  background: rgba(255, 255, 255, 0.1);
}

@media (prefers-reduced-motion: reduce) {
  .team-index__indicator {
    transition: none;
  }
}

@media (max-width: 719px) {
  .team-page {
    padding: 0;
  }

  .team-index {
    bottom: max(10px, env(safe-area-inset-bottom));
    width: min(300px, calc(100% - 32px));
  }

  .team-index a {
    padding-inline: 8px;
    font-size: 0.8125rem;
  }

  .team-page::after {
    height: clamp(92px, 17svh, 150px);
  }
}
</style>
