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
      { name: "Telegram", href: "https://t.me/digidro", icon: "telegram" },
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
    <nav class="team-index" aria-label="Участники команды">
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
  position: fixed;
  z-index: 15;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  width: max-content;
  max-width: calc(100% - 32px);
  padding: 4px;
  border: 1px solid var(--color-border-strong);
  border-radius: 4px;
  background: var(--color-team-dock);
}

.team-index a {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 8px 20px;
  color: var(--color-text-2);
  font-size: 0.875rem;
  text-decoration: none;
  transition:
    color var(--duration-fast) var(--ease-smooth),
    background-color var(--duration-fast) var(--ease-smooth);
}

.team-index a[aria-current] {
  background: var(--color-surface-soft);
  color: var(--color-text-1);
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

@media (max-width: 700px) {
  .team-index {
    bottom: max(12px, env(safe-area-inset-bottom));
  }

  .team-index a {
    padding-inline: 12px;
  }
}
</style>
