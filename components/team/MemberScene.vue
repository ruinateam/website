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
      <div class="member-scene__copy">
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
.member-scene__copy {
  position: absolute;
  z-index: 4;
  top: 18%;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: clamp(16px, 3vh, 30px);
  max-width: min(62%, 760px);
  pointer-events: none;
}
.member-scene__identity {
  position: relative;
  z-index: 4;
  width: 100%;
  pointer-events: none;
}
.member-scene h2 {
  margin: 0 0 0 -0.055em;
  font-family: var(--font-base);
  font-size: min(clamp(5rem, 12vw, 10.5rem), 24cqh);
  font-weight: 800;
  letter-spacing: -0.065em;
  line-height: 0.96;
  color: #f4f6f6;
  padding: 0 0.12em 0.08em 0;
}
.member-scene.member-scene--cinematic h2 {
  font-size: min(clamp(5rem, 12vw, 10.5rem), 24cqh);
}
.member-scene__contact {
  position: relative;
  z-index: 4;
  width: 100%;
  max-width: 100%;
  pointer-events: auto;
}
.member-scene__contact ul {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
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
  color: rgba(244, 246, 246, 0.9);
  font-size: 0.875rem;
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.75);
  white-space: nowrap;
}
.member-scene__contact svg {
  width: 16px;
  height: 16px;
  color: rgba(198, 207, 210, 0.82);
}
.member-scene a:focus-visible {
  outline: 2px solid var(--color-text-1);
  outline-offset: 4px;
}
.member-scene a:active {
  opacity: 0.7;
}
.member-scene--reverse .member-scene__copy {
  top: 22%;
  left: auto;
  right: 0;
  align-items: flex-end;
  text-align: right;
}
.member-scene--reverse .member-scene__contact ul {
  justify-content: center;
}
.member-scene--closing .member-scene__copy {
  top: 40%;
  left: auto;
  right: 0;
  align-items: flex-end;
  text-align: right;
}
.member-scene--closing .member-scene__contact ul {
  justify-content: center;
}
.member-scene__fallback {
  position: absolute;
  inset: 0;
  background: url("/ruines.webp") center bottom / cover no-repeat;
  opacity: 0.55;
  pointer-events: none;
}

/* Native-mode viewports are separate scissor rectangles; fade their cut edges. */
.member-scene__matte {
  position: absolute;
  inset: 0;
  z-index: 3;
  background: linear-gradient(
    180deg,
    var(--color-team-stage),
    transparent 9%,
    transparent 91%,
    var(--color-team-stage)
  );
  pointer-events: none;
}
.member-scene--cinematic .member-scene__matte {
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
}
/* Native mobile: one full-viewport composition per member, no stacked section bands. */
@media (max-width: 719px) {
  .member-scene {
    scroll-margin-top: 0;
  }
  .member-scene__inner {
    width: 100%;
    height: 100svh;
    min-height: 560px;
  }
  .member-scene__copy {
    display: contents;
  }
  .member-scene__identity,
  .member-scene--reverse .member-scene__identity,
  .member-scene--closing .member-scene__identity {
    position: absolute;
    top: calc(env(safe-area-inset-top, 0px) + 82px);
    left: max(20px, env(safe-area-inset-left));
    right: max(20px, env(safe-area-inset-right));
    width: auto;
    text-align: left;
  }
  .member-scene--reverse .member-scene__identity {
    text-align: right;
  }
  .member-scene--closing .member-scene__identity {
    text-align: center;
  }
  .member-scene h2 {
    font-size: clamp(3.6rem, 16vw, 6rem);
    line-height: 1;
    padding-bottom: 0.16em;
  }
  .member-scene__contact,
  .member-scene--reverse .member-scene__contact,
  .member-scene--closing .member-scene__contact {
    position: absolute;
    top: calc(100svh - clamp(152px, 24svh, 210px));
    left: 0;
    right: 0;
    width: 100%;
    max-width: 100%;
    padding-inline: max(12px, env(safe-area-inset-left)) max(12px, env(safe-area-inset-right));
  }
  .member-scene__contact ul {
    gap: 0 6px;
    justify-content: center;
  }
  .member-scene__contact a {
    gap: 6px;
    font-size: 0.8125rem;
  }
  .member-scene__contact svg {
    width: 15px;
    height: 15px;
  }
  .member-scene__matte {
    display: none;
  }
}
@media (max-width: 359px) {
  .member-scene__contact ul {
    gap: 0 4px;
  }
}
</style>
