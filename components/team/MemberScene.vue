<script setup lang="ts">
import { galleryFrame } from "~/lib/team-cinema";

const props = defineProps<{
  name: string;
  socials: { name: string; href: string; icon: string }[];
  index: number;
  cinematic: boolean;
}>();
const scene = ref<HTMLElement | null>(null);
const identity = ref<HTMLElement | null>(null);
const contact = ref<HTMLElement | null>(null);

function updateNativeScene() {
  if (!scene.value) return false;
  const rect = scene.value.getBoundingClientRect();
  const middle = window.innerHeight / 2;
  return rect.top <= middle && rect.bottom > middle;
}

function setCinematicProgress(progress: number | null, active: boolean) {
  if (!scene.value) return;
  if (progress === null) {
    scene.value.style.removeProperty("visibility");
    scene.value.removeAttribute("aria-hidden");
    scene.value.inert = false;
    if (contact.value) contact.value.inert = false;
    for (const element of [identity.value, contact.value]) {
      element?.style.removeProperty("transform");
      element?.style.removeProperty("opacity");
      element?.style.removeProperty("clip-path");
    }
    return;
  }
  const shot = galleryFrame(progress, false).members[props.index]!;
  const direction = props.index === 1 ? -1 : 1;
  const travel = Math.max(-1, Math.min(1, progress - props.index)) * direction;
  scene.value.style.visibility = shot.reveal > 0 || shot.links > 0 ? "visible" : "hidden";
  scene.value.inert = !active;
  scene.value.setAttribute("aria-hidden", String(!active));
  if (identity.value) {
    identity.value.style.transform = `translate3d(${-travel * 100}px, ${travel * -24}px, 0)`;
    identity.value.style.clipPath = `inset(0 ${100 * (1 - shot.reveal)}% 0 0)`;
  }
  if (contact.value) {
    contact.value.style.opacity = String(shot.links);
    contact.value.inert = shot.links < 0.99;
  }
}
defineExpose({ setCinematicProgress, updateNativeScene });
</script>

<template>
  <section
    :id="cinematic ? undefined : name.toLowerCase()"
    ref="scene"
    class="member-scene"
    data-gallery-profile
    :class="{
      'member-scene--reverse': index === 1,
      'member-scene--closing': index === 2,
      'member-scene--cinematic': cinematic,
    }"
    :aria-labelledby="`${name.toLowerCase()}-name`"
  >
    <div class="member-scene__fallback" aria-hidden="true"></div>
    <div class="member-scene__matte" aria-hidden="true"></div>
    <div class="member-scene__inner">
      <div ref="identity" class="member-scene__identity">
        <h2 :id="`${name.toLowerCase()}-name`">{{ name }}</h2>
      </div>
      <div ref="contact" class="member-scene__contact">
        <ul :aria-label="`Социальные сети ${name}`">
          <li v-for="social in socials" :key="social.name">
            <a
              :href="social.href"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`${social.name}: ${name}`"
            >
              <SocialIcon :name="social.icon" /><span>{{ social.name }}</span>
            </a>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.member-scene {
  position: relative;
  min-width: 0;
  pointer-events: none;
  scroll-margin-top: 40px;
}
.member-scene__inner {
  position: relative;
  width: min(1280px, calc(100% - 96px));
  height: clamp(640px, 82svh, 880px);
  margin-inline: auto;
  container-type: size;
}
.member-scene--cinematic {
  position: absolute;
  inset: 0;
}
.member-scene--cinematic .member-scene__inner {
  height: 100%;
  container-type: size;
}
.member-scene__identity {
  position: absolute;
  z-index: 4;
  top: 16%;
  left: 0;
  right: 0;
  pointer-events: none;
}
.member-scene h2 {
  margin: 0 0 0 -0.055em;
  font-family: var(--font-base);
  font-size: min(clamp(6rem, 14.5vw, 13rem), 28cqh);
  font-weight: 800;
  letter-spacing: -0.075em;
  line-height: 1.1;
  padding: 0 0.12em 0.12em 0;
}
.member-scene.member-scene--cinematic h2 {
  font-size: min(clamp(6rem, 14.5vw, 13rem), 28cqh);
}
.member-scene__contact {
  position: absolute;
  z-index: 4;
  top: 64%;
  left: 0;
  width: 42%;
  pointer-events: auto;
}
.member-scene__contact ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0 24px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.member-scene__contact a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  color: var(--color-text-1);
  font-size: 0.875rem;
}
.member-scene__contact svg {
  width: 16px;
  height: 16px;
  color: var(--color-text-2);
}
.member-scene a:focus-visible {
  outline: 2px solid var(--color-text-1);
  outline-offset: 4px;
}
.member-scene a:active {
  opacity: 0.7;
}
.member-scene--reverse .member-scene__identity {
  top: 24%;
  text-align: right;
}
.member-scene--reverse .member-scene__contact {
  left: auto;
  right: 0;
  width: 38%;
}
.member-scene--closing .member-scene__identity {
  top: 48%;
  text-align: right;
}
.member-scene--closing .member-scene__contact {
  top: 86%;
  left: auto;
  right: 0;
  width: auto;
}
.member-scene__fallback {
  position: absolute;
  inset: 0;
  background: url("/ruines.webp") center bottom / cover no-repeat;
  opacity: 0.55;
  pointer-events: none;
}

.member-scene__matte {
  display: none;
}
:global(.team-stage:has(.gallery-stage[data-status="ready"]) .member-scene__fallback) {
  display: none;
}
@media (hover: hover) and (pointer: fine) {
  .member-scene__contact a:hover {
    text-decoration: underline;
    text-underline-offset: 6px;
  }
}
@media (max-width: 900px) {
  .member-scene__inner {
    width: calc(100% - 64px);
  }
  .member-scene__contact {
    width: 40%;
  }
}
@media (max-width: 600px) {
  .member-scene__inner {
    width: calc(100% - 40px);
    height: 600px;
  }
  .member-scene__identity,
  .member-scene--reverse .member-scene__identity {
    top: 48px;
  }
  .member-scene h2 {
    font-size: clamp(4rem, 19vw, 7rem);
  }
  .member-scene__contact,
  .member-scene--reverse .member-scene__contact,
  .member-scene--closing .member-scene__contact {
    top: 464px;
    left: 0;
    right: auto;
    width: 100%;
  }
  .member-scene__contact ul {
    gap: 0 12px;
  }
  .member-scene__contact a {
    font-size: 0.8125rem;
  }
  .member-scene--closing .member-scene__identity {
    top: 368px;
  }
  .member-scene__matte {
    display: block;
    position: absolute;
    z-index: 3;
    top: 128px;
    left: 0;
    width: 100%;
    height: 340px;
    background: linear-gradient(
      var(--color-team-stage),
      transparent 10%,
      transparent 88%,
      var(--color-team-stage)
    );
    pointer-events: none;
  }
  .member-scene--reverse .member-scene__contact ul,
  .member-scene--closing .member-scene__contact ul {
    justify-content: flex-end;
  }
}
</style>
