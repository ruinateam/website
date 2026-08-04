<script setup lang="ts">
import { computed } from "vue";
import { siGithub, siNamemc, siTelegram, siTwitch } from "simple-icons";

const props = defineProps<{ name: string }>();

const icons = {
  github: siGithub,
  namemc: siNamemc,
  telegram: siTelegram,
  twitch: siTwitch,
};

const icon = computed(() => icons[props.name as keyof typeof icons] ?? siGithub);
</script>

<template>
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" :d="icon.path" />
  </svg>
</template>
