<script setup lang="ts">
const props = defineProps<{ hero?: boolean }>();
const menuOpen = ref(false);
const header = ref<HTMLElement | null>(null);
const route = useRoute();
const menuId = "site-nav-links";

function closeMenu() {
  menuOpen.value = false;
}

function onPointerDown(event: PointerEvent) {
  if (!menuOpen.value || !(event.target instanceof Node)) return;
  if (!header.value?.contains(event.target)) closeMenu();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") closeMenu();
}

watch(() => route.fullPath, closeMenu);

onMounted(() => {
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onPointerDown);
  document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <header ref="header" :class="['nav', { 'nav--hero': props.hero, 'nav--floating': props.hero }]">
    <NuxtLink class="nav-brand" to="/" @click="closeMenu">
      <span class="brand">
        <span class="brand-icon" aria-hidden="true"></span>
        <span class="nav-logo">Ruina.team</span>
      </span>
    </NuxtLink>
    <button
      class="nav-toggle"
      type="button"
      :aria-expanded="menuOpen"
      :aria-controls="menuId"
      @click="menuOpen = !menuOpen"
    >
      <span>{{ menuOpen ? "Закрыть" : "Разделы" }}</span>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M4 6.25 8 10.25l4-4"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    <nav :id="menuId" class="nav-links" :class="{ 'is-open': menuOpen }" @click="closeMenu">
      <NuxtLink to="/team">
        <span class="nav-label nav-label--desktop">Команда</span>
        <span class="nav-label nav-label--mobile">Команда</span>
      </NuxtLink>
      <NuxtLink to="/guides">
        <span class="nav-label nav-label--desktop">Руководства</span>
        <span class="nav-label nav-label--mobile">Руководства</span>
      </NuxtLink>
      <NuxtLink to="/timelines">
        <span class="nav-label nav-label--desktop">Таймлайны</span>
        <span class="nav-label nav-label--mobile">Таймлайны</span>
      </NuxtLink>
      <NuxtLink to="/chat-tiers">
        <span class="nav-label nav-label--desktop">Рейтинг чата</span>
        <span class="nav-label nav-label--mobile">Рейтинг</span>
      </NuxtLink>
      <NuxtLink to="https://chat.ruina.team/" target="_blank">
        <span class="nav-label nav-label--desktop">Оверлей чата</span>
        <span class="nav-label nav-label--mobile">Оверлей</span>
      </NuxtLink>
    </nav>
  </header>
</template>

<style scoped>
.nav-label--mobile,
.nav-toggle {
  display: none;
}

@media (max-width: 719px) {
  .nav-label--desktop {
    display: none;
  }

  .nav-label--mobile {
    display: inline;
  }

  .nav {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-height: 54px;
    padding: 6px 8px 6px 14px;
  }

  .nav-brand {
    gap: 0.6em;
    margin-right: 0;
    font-size: 0.95rem;
  }

  .nav-brand .brand-icon {
    width: 1.75em;
    height: 1.75em;
  }

  .nav-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 0 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.035);
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition:
      color var(--duration-fast) var(--ease-smooth),
      background-color var(--duration-fast) var(--ease-smooth);
  }

  .nav-toggle:hover {
    background: rgba(255, 255, 255, 0.06);
    color: #ffffff;
  }

  .nav-toggle:active {
    background: rgba(255, 255, 255, 0.1);
  }

  .nav-toggle:focus-visible {
    outline: 2px solid var(--color-text-1);
    outline-offset: 2px;
  }

  .nav-toggle svg {
    width: 14px;
    height: 14px;
    transition: transform var(--duration-base) var(--ease-emphasis);
  }

  .nav-toggle[aria-expanded="true"] svg {
    transform: rotate(180deg);
  }

  .nav-links {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    left: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
    width: auto;
    padding: 8px;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 16px;
    background: #0a0d0e;
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.46);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-8px);
    pointer-events: none;
    transition:
      opacity var(--duration-fast) var(--ease-smooth),
      transform var(--duration-base) var(--ease-emphasis),
      visibility var(--duration-base);
  }

  .nav-links.is-open {
    opacity: 1;
    visibility: visible;
    transform: none;
    pointer-events: auto;
  }

  .nav-links a {
    display: flex;
    align-items: center;
    min-height: 44px;
    padding: 10px 12px;
    border: 1px solid transparent;
    border-radius: 10px;
    color: rgba(255, 255, 255, 0.76);
    font-size: 0.875rem;
    transition:
      color var(--duration-fast) var(--ease-smooth),
      background-color var(--duration-fast) var(--ease-smooth),
      border-color var(--duration-fast) var(--ease-smooth);
  }

  .nav-links a::after {
    display: none;
  }

  .nav-links a:hover {
    background: rgba(255, 255, 255, 0.045);
    color: #ffffff;
    transform: none;
  }

  .nav-links a:active {
    background: rgba(255, 255, 255, 0.1);
  }

  .nav-links a.router-link-active {
    border-color: rgba(255, 255, 255, 0.055);
    background: rgba(255, 255, 255, 0.06);
    color: #ffffff;
  }

  .nav-links a:last-child {
    grid-column: 1 / -1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .nav-toggle,
  .nav-toggle svg,
  .nav-links,
  .nav-links a {
    transition: none;
  }
}
</style>
