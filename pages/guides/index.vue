<script setup lang="ts">
const { data: guidesRaw } = await useAsyncData("guides-list", () =>
  queryCollection("guides")
    .select(
      "path",
      "title",
      "author",
      "description",
      "image_url",
      "created_at",
      "updated_at",
      "tags",
    )
    .order("created_at", "DESC")
    .all(),
);

const formatDate = (value?: string | number | Date | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU");
};

const cards = computed(() =>
  (guidesRaw.value || []).map((item, idx) => ({
    path: item.path,
    title: item.title || `Гайд #${idx + 1}`,
    author: item.author || "Автор",
    description:
      item.description ||
      "Краткое описание гайда. Добавьте description во фронтматтер, чтобы перезаписать это значение.",
    image: item.image_url || "/favicon.svg",
    updatedAt: item.updated_at || item.created_at,
    tags: Array.isArray(item.tags) ? item.tags : [],
  })),
);
</script>

<template>
  <main class="site-page guides-page">
    <header class="page-intro guides-header">
      <h1 class="section-title">Гайды и инструкции</h1>
      <p class="muted">
        Здесь собраны гайды на все случаи жизни. Кликните по карточке, чтобы открыть страницу.
      </p>
    </header>

    <div v-if="cards.length" class="guides-list">
      <NuxtLink v-for="(guide, idx) in cards" :key="guide.path" :to="guide.path" class="guide-row">
        <div class="guide-thumb">
          <img :src="guide.image" :alt="guide.title" loading="lazy" />
        </div>

        <div class="guide-content">
          <div class="guide-top">
            <div class="title-line">
              <h3 class="guide-title">{{ guide.title }}</h3>
              <span class="guide-author">{{ guide.author }}</span>
            </div>
            <div class="guide-updated">
              {{ formatDate(guide.updatedAt) }}
            </div>
          </div>

          <p class="guide-description">
            {{ guide.description }}
          </p>

          <div class="guide-tags" v-if="guide.tags.length">
            <span
              v-for="(tag, tagIdx) in guide.tags"
              :key="`${guide.path}-${tag}-${tagIdx}`"
              class="tag-pill"
              :class="`tag-${(tagIdx % 3) + 1}`"
            >
              {{ tag }}
            </span>
          </div>
        </div>
      </NuxtLink>
    </div>

    <section v-else class="empty-state card">
      <p>
        Пока нет гайдов. Добавьте MD-файлы в content/guides/ с фронтматтером и перезагрузите
        страницу.
      </p>
    </section>
  </main>
</template>

<style scoped>
.section-title {
  margin: 0 0 6px;
}

.guides-header {
  max-width: 720px;
}

.muted {
  margin: 0;
  color: var(--color-text-2);
  line-height: 1.6;
}

.guides-list {
  display: grid;
  gap: 12px;
}

.guide-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px;
  padding: 16px;
  background: rgba(10, 10, 12, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 16px;
  color: inherit;
  transition:
    border-color 0.12s ease,
    background 0.12s ease;
}

.guide-row:hover {
  border-color: rgba(255, 255, 255, 0.16);
  background: rgba(12, 12, 15, 0.84);
}

.guide-thumb {
  width: 84px;
  height: 84px;
  background: rgba(140, 184, 194, 0.1);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.guide-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.guide-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.guide-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.title-line {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}

.guide-title {
  margin: 0;
  font-size: 1.16rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--color-text-1);
}

.guide-author {
  color: var(--color-text-2);
  font-weight: 600;
}

.guide-updated {
  color: var(--color-text-2);
  font-size: 0.9rem;
  white-space: nowrap;
}

.guide-description {
  margin: 0;
  color: var(--color-text-2);
  line-height: 1.6;
}

.guide-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 10px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.84);
  background: rgba(140, 184, 194, 0.14);
  border: 1px solid rgba(140, 184, 194, 0.18);
}

.empty-state {
  margin-top: 8px;
  background: rgba(10, 10, 12, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 16px;
  padding: 16px 18px;
}

@media (max-width: 900px) {
  .guide-row {
    grid-template-columns: 72px 1fr;
    padding: 14px;
  }

  .guide-thumb {
    width: 72px;
    height: 72px;
  }

  .guide-top {
    flex-direction: column;
    align-items: flex-start;
  }

  .guide-updated {
    font-size: 0.85rem;
  }
}

@media (max-width: 640px) {
  .guide-row {
    grid-template-columns: 1fr;
  }

  .guide-thumb {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
  }
}
</style>
