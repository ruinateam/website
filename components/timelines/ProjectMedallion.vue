<script setup lang="ts">
import { computed } from "vue";
import { mediaLabels } from "~/lib/marvel-timeline";
import type { Project } from "~/lib/marvel-timeline";
import {
  medallionCaptionGap,
  medallionCaptionHeight,
  medallionCaptionWidth,
  medallionDisc,
} from "~/lib/marvel-timeline-layout";
import type { CaptionSide, DetailLevel } from "~/lib/marvel-timeline-layout";

const props = defineProps<{
  project: Project;
  detail: DetailLevel;
  side: CaptionSide;
  laneColor: string;
  posterFailed?: boolean;
}>();

defineEmits<{ posterError: [] }>();

const disc = computed(() => medallionDisc(props.project, props.detail));
const captionWidth = computed(
  () => (props.detail === "full" ? medallionCaptionWidth.full : medallionCaptionWidth.compact),
);
const captionHeight = computed(
  () => (props.detail === "full" ? medallionCaptionHeight.full : medallionCaptionHeight.compact),
);
const poster = computed(
  () => props.detail === "full" && !!props.project.poster && !props.posterFailed,
);
const posterSize = computed(() => (disc.value > 110 ? "w185" : "w154"));
const symbol = computed(() => {
  if (props.project.media === "series") return "live_tv";
  if (props.project.media === "animation") return "animation";
  if (props.project.major) return "stars";
  return "movie";
});
const landmarkCaption = computed(() => props.detail !== "overview" && props.project.major);
</script>

<template>
  <button
    type="button"
    class="medallion"
    :class="[
      `medallion--${detail}`,
      `medallion--caption-${side}`,
      {
        'medallion--major': project.major,
        'medallion--special': project.media === 'special',
      },
    ]"
    :style="{
      '--disc': `${disc}px`,
      '--caption-w': `${captionWidth}px`,
      '--caption-h': `${captionHeight}px`,
      '--caption-gap': `${medallionCaptionGap}px`,
      '--lane-color': laneColor,
    }"
  >
    <span class="medallion__disc" aria-hidden="true">
      <img
        v-if="poster && project.poster"
        class="medallion__poster"
        :src="`https://image.tmdb.org/t/p/${posterSize}/${project.poster}`"
        alt=""
        loading="lazy"
        decoding="async"
        draggable="false"
        @error="$emit('posterError')"
      />
      <span v-else class="medallion__symbol material-symbols-outlined">{{ symbol }}</span>
    </span>
    <span v-if="detail === 'full'" class="medallion__caption">
      <span class="medallion__meta"
        >{{ mediaLabels[project.media] }} · {{ project.releaseYear }}</span
      ><strong>{{ project.title }}</strong>
      <em v-if="landmarkCaption" class="medallion__landmark">Ключевой</em>
    </span>
    <span v-else-if="detail === 'compact'" class="medallion__caption">
      <strong>{{ project.title }}</strong>
    </span>
    <span v-else-if="project.major" class="medallion__caption medallion__caption--tag">
      <strong>{{ project.title }}</strong>
    </span>
  </button>
</template>

<style scoped>
.medallion {
  position: absolute;
  width: var(--disc);
  height: var(--disc);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text, #f5eee8);
  cursor: pointer;
  z-index: 2;
}
.medallion__disc {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 50%;
  background: var(--surface, #161211);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--lane-color) 58%, transparent);
}
.medallion--major .medallion__disc {
  background: var(--surface-raised, #211a18);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--lane-color) 85%, transparent),
    inset 0 0 0 4px var(--paper, #0d0b0b);
}
.medallion--special .medallion__disc {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--lane-color) 70%, transparent);
}
.medallion__poster {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 22%;
  outline: 1px solid #ffffff1a;
  outline-offset: -1px;
}
.medallion__symbol {
  font-size: calc(var(--disc) * 0.4);
  color: color-mix(in srgb, var(--lane-color) 82%, white);
  opacity: 0.72;
}
.medallion--overview .medallion__disc {
  background: var(--paper, #0d0b0b);
}
.medallion--overview .medallion__symbol {
  font-size: 0;
}
.medallion--overview .medallion__disc::after {
  content: "";
  width: 34%;
  height: 34%;
  border-radius: 50%;
  background: var(--lane-color);
}
.medallion--overview.medallion--major .medallion__disc {
  box-shadow: inset 0 0 0 2px var(--lane-color);
}
.medallion--overview.medallion--major .medallion__disc::after {
  background: var(--warm, #d9ab4d);
}
.medallion__caption {
  position: absolute;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: var(--caption-w);
  text-align: center;
  text-wrap: pretty;
  pointer-events: none;
}
.medallion--caption-above .medallion__caption {
  bottom: calc(100% + var(--caption-gap));
  left: 50%;
  translate: -50% 0;
}
.medallion--caption-below .medallion__caption {
  top: calc(100% + var(--caption-gap));
  left: 50%;
  translate: -50% 0;
}
.medallion--caption-left .medallion__caption {
  right: calc(100% + var(--caption-gap));
  top: 50%;
  translate: 0 -50%;
  text-align: end;
}
.medallion--caption-right .medallion__caption {
  left: calc(100% + var(--caption-gap));
  top: 50%;
  translate: 0 -50%;
  text-align: start;
}
.medallion__meta {
  font: 9px/1.3 var(--font-mono);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--lane-color) 78%, white);
}
.medallion__caption strong {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.28;
  letter-spacing: -0.02em;
  color: var(--text-dim, #d8ccc3);
}
.medallion--full .medallion__caption strong {
  font-size: 13px;
  color: var(--text, #f5eee8);
}
.medallion__caption--tag strong {
  font-size: 11px;
  color: var(--muted, #b3a69d);
}
.medallion__landmark {
  font: 8px/1.4 var(--font-mono);
  font-style: normal;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--warm, #d9ab4d);
}
.medallion--overview {
  z-index: 1;
}
.medallion--overview::before {
  content: "";
  position: absolute;
  inset: -13px;
  border-radius: 50%;
}
.medallion:focus-visible {
  outline: 2px solid var(--red, #ed1d24);
  outline-offset: 5px;
  border-radius: 50%;
}
.medallion.is-related .medallion__disc {
  box-shadow:
    inset 0 0 0 2px var(--lane-color),
    inset 0 0 0 5px var(--paper, #0d0b0b);
}
.medallion.is-muted {
  opacity: 0.3;
}
.medallion.is-muted .medallion__caption {
  opacity: 0.55;
}
.medallion.is-highlighted {
  z-index: 6;
}
.medallion.is-highlighted .medallion__disc {
  box-shadow:
    inset 0 0 0 2px var(--lane-color),
    inset 0 0 0 6px var(--paper, #0d0b0b);
}
.medallion.is-highlighted .medallion__caption strong {
  color: var(--text, #f5eee8);
}
@media (hover: hover) {
  .medallion:hover {
    z-index: 6;
  }
}
@media (prefers-reduced-motion: no-preference) {
  .medallion {
    transition: opacity 150ms;
  }
  .medallion.is-highlighted {
    translate: 0 -2px;
  }
}
</style>
