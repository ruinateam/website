<script setup lang="ts">
const props = defineProps<{
  code?: string;
  language?: string | null;
  filename?: string;
  highlights?: number[];
  meta?: string;
  class?: string;
  style?: string | Record<string, string | number>;
}>();

const copied = ref(false);

const copyCode = async () => {
  if (!props.code || typeof window === "undefined") return;
  try {
    await navigator.clipboard.writeText(props.code);
    copied.value = true;
    window.setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error("Failed to copy code:", err);
  }
};
</script>

<template>
  <div class="prose-pre-wrapper" :class="{ 'has-filename': filename }">
    <div v-if="filename" class="prose-pre-filename">{{ filename }}</div>
    <button
      class="prose-pre-copy"
      type="button"
      :aria-label="copied ? 'Код скопирован' : 'Копировать код'"
      :title="copied ? 'Скопировано' : 'Копировать'"
      @click="copyCode"
    >
      <span class="material-symbols-outlined">{{ copied ? "check" : "content_copy" }}</span>
    </button>
    <pre :class="$props.class" :style="$props.style"><slot /></pre>
  </div>
</template>

<style scoped>
.prose-pre-wrapper {
  position: relative;
}

.prose-pre-copy {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #ffffff33;
  border-radius: 6px;
  background: #0f172acc;
  color: var(--color-text-1);
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease,
    border-color 0.12s ease;
}

.prose-pre-copy:hover {
  background: var(--color-brand-accent-1);
  border-color: var(--color-brand-accent-1);
  color: #fff;
}

.prose-pre-copy .material-symbols-outlined {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 16px;
  line-height: 1;
}

.prose-pre-filename {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 8px 12px;
  border-bottom: 1px solid #ffffff22;
  border-radius: 10px 10px 0 0;
  background: #0f172a80;
  color: var(--color-text-2);
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-mono, monospace);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.prose-pre-wrapper.has-filename pre {
  padding-top: 42px;
}
</style>
