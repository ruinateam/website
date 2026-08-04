<script setup lang="ts">
const route = useRoute();
const slugParam = computed(() => {
  const raw = route.params.slug;
  return Array.isArray(raw) ? raw.join("/") : raw || "";
});

const path = computed(() => `/guides/${slugParam.value}`);

const { data: guide } = await useAsyncData(
  () => `guide-${path.value}`,
  () => queryCollection("guides").path(path.value).first(),
);

const { data: allGuides } = await useAsyncData("guide-nav", () =>
  queryCollection("guides")
    .select("path", "title", "created_at", "updated_at")
    .order("created_at", "DESC")
    .all(),
);

const idx = computed(() => allGuides.value?.findIndex((g) => g.path === guide.value?.path) ?? -1);

const prevLink = computed(() => {
  if (!allGuides.value || idx.value < 0) return null;
  const nextIdx = (idx.value - 1 + allGuides.value.length) % allGuides.value.length;
  return allGuides.value[nextIdx];
});

const nextLink = computed(() => {
  if (!allGuides.value || idx.value < 0) return null;
  const nextIdx = (idx.value + 1) % allGuides.value.length;
  return allGuides.value[nextIdx];
});

const formatDate = (value?: string | number | Date | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU");
};

const tagColor = (index: string | number) => `tag-${(Number(index) % 3) + 1}`;

const bodyRef = ref<HTMLElement | null>(null);
const lightboxImages = ref<string[]>([]);
const lightboxIndex = ref(0);
const lightboxVisible = ref(false);

const articleLinkCopied = ref(false);

const writeToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy:", err);
    return false;
  }
};

const isMobileShare = () => {
  if (typeof window === "undefined" || !navigator.share) return false;
  return window.matchMedia("(max-width: 640px)").matches;
};

const handleArticleAction = async () => {
  if (typeof window === "undefined") return;

  const url = window.location.href.split("#")[0] ?? window.location.href;

  if (isMobileShare()) {
    try {
      await navigator.share({
        title: guide.value?.title || document.title,
        url,
      });
    } catch (err) {
      const error = err as Error;
      if (error.name !== "AbortError") {
        console.error("Share failed:", error);
      }
    }
    return;
  }

  const ok = await writeToClipboard(url);
  if (!ok) return;
  articleLinkCopied.value = true;
  window.setTimeout(() => {
    articleLinkCopied.value = false;
  }, 2000);
};

const decorateImages = () => {
  const el = bodyRef.value;
  if (!el) return;
  const imgs = el.querySelectorAll<HTMLImageElement>("img");
  imgs.forEach((img) => {
    img.loading = "lazy";
    img.decoding = "async";
    img.classList.add("zoomable");
  });
};

const onBodyClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null;
  if (!target) return;

  const anchor = target.closest?.("h2 a, h3 a, h4 a") as HTMLAnchorElement | null;
  if (anchor) {
    writeToClipboard(anchor.href).then((ok) => {
      if (!ok) return;
      const icon = anchor.querySelector<HTMLElement>(".heading-anchor-icon");
      if (icon) icon.textContent = "check_small";
      window.setTimeout(() => {
        if (icon) icon.textContent = "arrow_outward";
      }, 2000);
    });
    return;
  }

  if (target.tagName !== "IMG") return;
  const el = bodyRef.value;
  if (!el) return;
  const imgs = Array.from(el.querySelectorAll<HTMLImageElement>("img"));
  const srcs = imgs.map((img) => img.src).filter(Boolean);
  const clicked = target as HTMLImageElement;
  const i = imgs.indexOf(clicked);
  if (i < 0 || !srcs.length) return;
  lightboxImages.value = srcs;
  lightboxIndex.value = i;
  lightboxVisible.value = true;
};

const hideLightbox = () => {
  lightboxVisible.value = false;
};

const decorateHeadings = () => {
  const el = bodyRef.value;
  if (!el) return;
  const headingAnchors = el.querySelectorAll<HTMLElement>("h2 a, h3 a, h4 a");
  headingAnchors.forEach((a) => {
    a.classList.add("heading-anchor");
    if (a.querySelector(".heading-anchor-icon")) return;
    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined heading-anchor-icon";
    icon.textContent = "arrow_outward";
    icon.setAttribute("aria-hidden", "true");
    a.prepend(icon);
  });
};

const refreshBody = () => {
  decorateHeadings();
  decorateImages();
};

onMounted(() => {
  nextTick(refreshBody);
});

watch(
  () => guide.value?.path,
  () => nextTick(refreshBody),
);
</script>

<template>
  <main class="site-page guide-page" v-if="guide">
    <header class="guide-hero">
      <div class="hero-cover">
        <img :src="guide.image_url || '/favicon.svg'" :alt="guide.title" />
      </div>
      <div class="hero-content">
        <h1 class="hero-title">
          {{ guide.title || "Без названия" }}
          <span class="hero-author" v-if="guide.author">by {{ guide.author }}</span>
        </h1>
        <p class="hero-desc" v-if="guide.description">
          {{ guide.description }}
        </p>

        <div class="hero-meta">
          <div>
            <span class="label">Обновлено</span>
            <span class="value">{{ formatDate(guide.updated_at || guide.created_at) }}</span>
          </div>
          <div>
            <span class="label">Создано</span>
            <span class="value">{{ formatDate(guide.created_at) }}</span>
          </div>
          <div>
            <span class="label">Путь</span>
            <span class="value mono">{{ guide.path }}</span>
          </div>
        </div>

        <div class="hero-actions">
          <button
            class="copy-link-btn"
            type="button"
            :aria-label="articleLinkCopied ? 'Ссылка скопирована' : 'Копировать ссылку на статью'"
            :title="articleLinkCopied ? 'Скопировано' : 'Копировать ссылку'"
            @click="handleArticleAction"
          >
            <span class="copy-link-label copy-link-label--desktop">
              <span class="material-symbols-outlined">{{
                articleLinkCopied ? "check" : "link_2"
              }}</span>
            </span>
            <span class="copy-link-label copy-link-label--mobile" aria-hidden="true">
              <span class="material-symbols-outlined">ios_share</span>
            </span>
          </button>

          <div class="hero-tags" v-if="guide.tags?.length">
            <span
              v-for="(tag, tagIdx) in guide.tags"
              :key="`${guide.path}-tag-${tag}-${tagIdx}`"
              class="tag-pill"
              :class="tagColor(tagIdx)"
            >
              {{ tag }}
            </span>
          </div>
        </div>
      </div>
    </header>

    <section
      class="guide-body surface-panel surface-panel--padded"
      ref="bodyRef"
      @click="onBodyClick"
    >
      <ContentRenderer :value="guide" />
    </section>

    <ClientOnly>
      <GuideLightbox
        :visible="lightboxVisible"
        :imgs="lightboxImages"
        :index="lightboxIndex"
        @hide="hideLightbox"
        @update:index="lightboxIndex = $event"
      />
    </ClientOnly>

    <footer class="guide-nav" v-if="prevLink || nextLink">
      <NuxtLink v-if="prevLink" :to="prevLink.path" class="btn ghost"
        >← {{ prevLink.title }}</NuxtLink
      >
      <div class="spacer" />
      <NuxtLink v-if="nextLink" :to="nextLink.path" class="btn primary"
        >{{ nextLink.title }} →</NuxtLink
      >
    </footer>
  </main>

  <main v-else class="site-page guide-page">
    <section class="empty-state surface-panel surface-panel--padded">
      <h2>Гайд не найден</h2>
      <p>Проверьте путь или добавьте MD-файл в content/guides/.</p>
      <NuxtLink to="/guides" class="btn primary">Вернуться к списку</NuxtLink>
    </section>
  </main>
</template>

<style scoped>
.guide-hero {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 18px;
  background: var(--color-bg3);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  padding: 16px;
  box-shadow: var(--shadow-soft);
}

.hero-cover {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: #0f0f12;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hero-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.copy-link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--color-brand-accent-1);
  border-radius: 10px;
  background: transparent;
  color: var(--color-brand-accent-bright);
  cursor: pointer;
  flex-shrink: 0;
  line-height: 1;
  transition:
    background 0.12s ease,
    color 0.12s ease,
    border-color 0.12s ease;
}

.copy-link-btn:hover {
  background: var(--color-brand-accent-1);
  color: #fff;
}

.copy-link-btn .material-symbols-outlined {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 18px;
  line-height: 1;
}

.copy-link-label--mobile {
  display: none;
}

.hero-title {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text-1);
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.hero-author {
  color: var(--color-text-2);
  font-weight: 700;
}

.hero-desc {
  margin: 0;
  color: var(--color-text-2);
}

.hero-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.label {
  display: block;
  color: var(--color-text-2);
  font-size: 0.85rem;
}

.value {
  display: block;
  color: var(--color-text-1);
  font-weight: 700;
}

.mono {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  word-break: break-all;
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 10px;
  font-weight: 800;
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 0.04em;
  color: #111;
  background: #e2e8f0;
}

.tag-1,
.tag-2,
.tag-3 {
  background: var(--color-brand-accent-3);
  color: #ffffff;
}

.guide-body {
  min-width: 0;
}

.guide-body :deep(h1),
.guide-body :deep(h2),
.guide-body :deep(h3) {
  color: var(--color-text-1);
  margin: 18px 0 10px;
}

.guide-body :deep(p) {
  color: var(--color-text-2);
  line-height: 1.6;
}

.guide-body :deep(ul),
.guide-body :deep(ol),
.guide-body :deep(blockquote) {
  color: var(--color-text-2);
}

.guide-body :deep(ul),
.guide-body :deep(ol) {
  padding-left: 1.25rem;
}

.guide-body :deep(blockquote) {
  margin: 16px 0;
  padding-left: 16px;
  border-left: 3px solid var(--color-border-strong);
}

.guide-body :deep(code) {
  background: #0f172a31;
  padding: 2px 4px;
  border-radius: 6px;
}

.guide-body :deep(pre) {
  background: #0f172a31;
  border-radius: 10px;
  padding: 10px;
  border: 1px solid #ffffff22;
  overflow: auto;
}

.guide-body :deep(a) {
  color: var(--color-text-1);
}

.guide-body :deep(a:not(.heading-anchor)) {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.guide-body :deep(a:not(.heading-anchor):focus-visible) {
  color: var(--color-brand-accent-1);
}

.guide-body :deep(a.heading-anchor) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none !important;
  border: none !important;
}

.guide-body :deep(.heading-anchor-icon) {
  font-size: 16px;
  color: var(--color-brand-accent-bright);
  opacity: 0.7;
  transition: opacity 0.12s ease;
}

.guide-body :deep(a.heading-anchor:hover) .heading-anchor-icon,
.guide-body :deep(a.heading-anchor:focus-visible) .heading-anchor-icon {
  opacity: 1;
}

.guide-body :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  border-radius: 10px;
  margin: 14px 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.28);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.guide-body :deep(img.zoomable) {
  cursor: zoom-in;
}

.guide-body :deep(img.zoomable:hover) {
  transform: translateY(-1px);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.18);
}

.guide-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.guide-nav .spacer {
  flex: 1;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  font-weight: 800;
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    background 0.12s ease,
    border-color 0.12s ease,
    transform 0.12s ease;
}

.btn.primary {
  background: var(--color-brand-accent-1);
  border-color: var(--color-brand-accent-2);
  color: #fff;
}

.btn.ghost {
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--color-border);
  color: var(--color-text-1);
}

.empty-state {
  display: grid;
  gap: 8px;
}

@media (max-width: 900px) {
  .guide-hero {
    grid-template-columns: 1fr;
  }

  .hero-cover {
    width: 160px;
    height: 160px;
  }
}

@media (max-width: 640px) {
  .copy-link-label--desktop {
    display: none;
  }

  .copy-link-label--mobile {
    display: inline-flex;
  }

  .guide-nav {
    flex-direction: column;
    align-items: stretch;
  }

  .guide-nav .spacer {
    display: none;
  }
}
</style>
