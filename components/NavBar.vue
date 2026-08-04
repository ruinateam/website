<script setup lang="ts">
const props = defineProps<{ hero?: boolean }>();
</script>

<template>
  <header :class="['nav', { 'nav--hero': props.hero, 'nav--floating': props.hero }]">
    <NuxtLink class="nav-brand" to="/">
      <span class="brand">
        <span class="brand-icon" aria-hidden="true"></span>
        <span class="nav-logo">Ruina.team</span>
      </span>
    </NuxtLink>
    <nav class="nav-links">
      <NuxtLink to="/team">
        <span class="nav-label nav-label--desktop">Команда</span>
        <span class="nav-label nav-label--mobile">Команда</span>
      </NuxtLink>
      <NuxtLink to="/guides">
        <span class="nav-label nav-label--desktop">Руководства</span>
        <span class="nav-label nav-label--mobile">Руководства</span>
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
.nav-label--mobile {
  display: none;
}

@media (max-width: 640px) {
  .nav-label--desktop {
    display: none;
  }

  .nav-label--mobile {
    display: inline;
  }

  .nav-links {
    gap: 14px;
  }
}
</style>
