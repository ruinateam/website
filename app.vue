<script setup lang="ts">
const criticalAssets = ["/bg.webp", "/ruines.webp", "/loading-emote.webp"] as const;
const loadingEmoteSrc = criticalAssets[2];
const appReady = useState("app-ready", () => false);

const route = useRoute();
const isHome = computed(() => route.path === "/");
const isTeam = computed(() => route.path.replace(/\/$/, "") === "/team");
const isChatTiers = computed(() => route.path.startsWith("/chat-tiers"));
const assetsReady = ref(false);
const teamPrepared = useState("team-prepared", () => false);
const isLoading = computed(() => !assetsReady.value || (isTeam.value && !teamPrepared.value));

onMounted(async () => {
  await preloadCriticalAssets();
  assetsReady.value = true;
  window.setTimeout(() => {
    appReady.value = true;
  }, 240);
});

async function preloadCriticalAssets() {
  // The team's live architecture does not use the homepage's prerendered ruins.
  const assets = isTeam.value
    ? criticalAssets.filter((src) => src !== "/ruines.webp")
    : criticalAssets;
  const tasks: Promise<unknown>[] = assets.map((src) => preloadImage(src));

  if (typeof document !== "undefined" && document.fonts?.ready) {
    tasks.push(document.fonts.ready);
  }

  await Promise.allSettled(tasks);
}

function preloadImage(src: string) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;

    if (image.complete) {
      resolve();
    }
  });
}
</script>

<template>
  <div>
    <LoadingScreen :visible="isLoading" :emote-src="loadingEmoteSrc" />
    <div class="app-stage" :class="{ 'app-stage--ready': !isLoading }">
      <div
        class="site"
        :class="{ 'is-home': isHome, 'is-team': isTeam, 'is-chat-tiers': isChatTiers }"
      >
        <div class="site-bg" aria-hidden="true"></div>
        <NavBar :hero="isHome" />
        <div :class="['shell', { 'shell--full': isHome || isTeam }]">
          <NuxtPage />
        </div>
      </div>
    </div>
  </div>
</template>
