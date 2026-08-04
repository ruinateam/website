<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch, onMounted } from "vue";
import TierControls from "~/components/chat-tiers/TierControls.vue";
import TierSummary from "~/components/chat-tiers/TierSummary.vue";
import TierTable from "~/components/chat-tiers/TierTable.vue";
import UserCard from "~/components/chat-tiers/UserCard.vue";
import { useChatTiersQuery } from "~/composables/useChatTiersQuery";
import { usePrefetchRows } from "~/composables/usePrefetchRows";
import { useRoles } from "~/composables/useRoles";
import { defaultTierColors } from "~/constants/tiers";
import {
  fetchAvailableChannels,
  fetchAvailablePeriods,
  fetchTiersSupabase as fetchTiers,
} from "~/lib/api";
import { humanizeFromDate, humanizeMonths } from "~/lib/format";
import { sortScoredEntries } from "~/lib/score";
import { fuzzyScore, normalizeSearch } from "~/lib/search";
import {
  fetchIvrSubage,
  fetchIvrUserByLoginOrId,
  fetchIvrUsers,
  type IvrUser,
  type Relation,
} from "~/lib/twitch-ivr";
import type { Mode, Scope, TierEntry, TierResponse } from "~/types/tiers";

const channel = ref("zakvielchannel");
const year = ref(new Date().getFullYear());
const month = ref(new Date().getMonth() + 1);
const scope = ref<Scope>("month");
const mode = ref<Mode>("online");
const hadInitialPeriodQuery = ref(false);
const isInitializing = ref(true);
const canSyncQuery = ref(false);
let querySyncTimer: ReturnType<typeof setTimeout> | null = null;
const availableYearsMap = ref<Record<Scope, number[]>>({
  year: [],
  month: [],
  day: [],
});
const availableYears = computed(() => availableYearsMap.value[scope.value] || []);
const availableMonthsMap = ref<Record<number, number[]>>({});
const availableMonths = computed(() => availableMonthsMap.value[year.value] || []);
const availableChannels = ref<string[]>([]);
const availableScopes = ref<Scope[]>([]);
const availableModesMap = ref<Record<Scope, Mode[]>>({
  year: [],
  month: [],
  day: [],
});
const availableModes = computed(() => availableModesMap.value[scope.value] || []);

const profiles = reactive<Record<string, { displayName: string; login: string; logo?: string }>>(
  {},
);
const relations = reactive<Record<string, Relation>>({});
const relationRequests = new Map<string, Promise<Relation>>();
const userLookup = ref("");
const userData = ref<IvrUser | null>(null);
const userLoading = ref(false);
const userError = ref<string | null>(null);
const showProfile = ref(false);

const tierColors = reactive<Record<string, string>>({ ...defaultTierColors });
const tableAnimationSeed = ref(0);
const tableRef = ref<{
  wrapEl: HTMLElement | null;
  sentinelEl: HTMLElement | null;
} | null>(null);
const wrapElRef = computed(() => tableRef.value?.wrapEl ?? null);
const sentinelElRef = computed(() => tableRef.value?.sentinelEl ?? null);

const { loadRoles, avatarClasses } = useRoles();

const fetchProfiles = async (ids: string[]) => {
  if (!ids.length) return;
  const uniq = ids.filter((id) => !profiles[id]);
  if (!uniq.length) return;
  const users = await fetchIvrUsers(uniq);
  users.forEach((u) => {
    profiles[u.id] = {
      displayName: u.displayName,
      login: u.login,
      logo: u.logo,
    };
  });
};

const fetchRelations = async (ids: string[]) => {
  if (!ids.length) return;
  const channelLogin = channel.value.trim();
  const pending = ids.slice(0, 30).filter((id) => profiles[id] && !relations[id]);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < pending.length) {
      const id = pending[nextIndex++]!;
      const profile = profiles[id]!;
      const requestKey = `${channelLogin}:${id}`;
      let request = relationRequests.get(requestKey);
      if (!request) {
        request = fetchIvrSubage(profile.login, channelLogin).finally(() => {
          relationRequests.delete(requestKey);
        });
        relationRequests.set(requestKey, request);
      }

      const relation = await request;
      if (channelLogin === channel.value.trim()) relations[id] = relation;
    }
  };

  await Promise.all(Array.from({ length: Math.min(5, pending.length) }, worker));
};

const lookupUserRemotely = async (termOverride?: string) => {
  userError.value = null;
  const term = (termOverride ?? userLookup.value).trim();
  if (!term) return;
  userLoading.value = true;
  try {
    const found = await fetchIvrUserByLoginOrId(term);
    userData.value = found;
    if (!found) {
      userError.value = "Not found";
    } else {
      showProfile.value = true;
      const foundId = found.id;
      if (foundId) {
        profiles[foundId] = {
          displayName: found.displayName || found.login || foundId,
          login: found.login || foundId,
          logo: found.logo,
        };
      }
      const rel = foundId ? relations[foundId] : null;
      const needsRelations = foundId && (!rel || (!rel.followedAt && rel.subMonths == null));
      if (foundId && needsRelations) {
        await fetchRelations([foundId]);
      }
    }
  } catch (e: unknown) {
    const msg =
      typeof e === "object" && e && "message" in e && (e as { message?: unknown }).message
        ? String((e as { message?: unknown }).message)
        : "Request failed";
    userError.value = msg;
  } finally {
    userLoading.value = false;
  }
};

const filteredEntries = computed(() => {
  const query = normalizeSearch(activeSearch.value);
  if (!query || !rankedEntries.value.length) return [] as TierEntry[];

  return rankedEntries.value
    .map((entry) => {
      const profile = profiles[entry.userId];
      const displayName = normalizeSearch(profile?.displayName || entry.userLogin || entry.userId);
      const login = normalizeSearch(profile?.login || entry.userLogin || "");
      const userId = normalizeSearch(entry.userId);
      const score = Math.max(
        fuzzyScore(query, userId) + (userId === query ? 900 : 0),
        fuzzyScore(query, login),
        fuzzyScore(query, displayName),
      );
      return { score, entry };
    })
    .filter((item) => item.score >= 0)
    .map((item) => item.entry);
});

const displayedEntries = computed((): TierEntry[] =>
  activeSearch.value.trim() ? filteredEntries.value : data.value?.entries ?? [],
);

const {
  prefetchMore: prefetchMoreProfiles,
  setup: setupPrefetchObserver,
  resetIndex: resetPrefetchIndex,
} = usePrefetchRows({
  fetchBatch: fetchProfiles,
  getIds: () => rankedEntries.value.map((entry) => entry.userId),
  wrapEl: wrapElRef,
  sentinelEl: sentinelElRef,
});

const openProfile = async (userId: string) => {
  const entry = data.value?.entries.find((e: TierEntry) => e.userId === userId);
  const prof = profiles[userId];
  if (entry) {
    profiles[userId] = {
      displayName: prof?.displayName || entry.userLogin || userId,
      login: prof?.login || entry.userLogin || userId,
      logo: prof?.logo,
    };
    userData.value = {
      id: userId,
      login: entry.userLogin || userId,
      displayName: prof?.displayName || entry.userLogin || userId,
      logo: prof?.logo,
    };
    userLoading.value = true;
    showProfile.value = true;
  }
  const rel = relations[userId];
  const needsRelations = !rel || (!rel.followedAt && rel.subMonths == null);
  if (needsRelations) {
    await fetchRelations([userId]);
  }
  await lookupUserRemotely(userId);
};

const data = ref<TierResponse | null>(null);
const pending = ref(false);
const error = ref<unknown>(null);
const hasAttemptedLoad = ref(false);
const latestMonthlySelection = computed(() => {
  for (const y of availableYearsMap.value.month) {
    const monthsForYear = availableMonthsMap.value[y] || [];
    const month = monthsForYear[monthsForYear.length - 1];
    if (month !== undefined) {
      return { year: y, month };
    }
  }
  return null;
});

const { hasQuery, syncFromQuery, pushQuery } = useChatTiersQuery({
  channel,
  scope,
  year,
  month,
  mode,
  hadInitialPeriodQuery,
});

const isChatTiersDebugEnabled = () =>
  typeof window !== "undefined" &&
  (["localhost", "127.0.0.1"].includes(window.location.hostname) ||
    new URLSearchParams(window.location.search).get("debug") === "tiers" ||
    new URLSearchParams(window.location.search).get("debug") === "1");

const debugState = (event: string, payload: Record<string, unknown> = {}) => {
  if (!isChatTiersDebugEnabled()) return;
  console.debug(`[chat-tiers:page] ${event}`, {
    ...payload,
    location: typeof window === "undefined" ? "" : window.location.href,
    state: {
      channel: channel.value,
      scope: scope.value,
      year: year.value,
      month: month.value,
      mode: mode.value,
      isInitializing: isInitializing.value,
      canSyncQuery: canSyncQuery.value,
      hadInitialPeriodQuery: hadInitialPeriodQuery.value,
    },
    available: {
      channels: availableChannels.value,
      scopes: availableScopes.value,
      years: availableYears.value,
      months: availableMonths.value,
      modes: availableModes.value,
    },
  });
};

const syncQuery = (reason: string) => {
  if (isInitializing.value || !canSyncQuery.value) {
    debugState("syncQuery:blocked", { reason });
    return;
  }

  if (querySyncTimer) {
    clearTimeout(querySyncTimer);
  }

  debugState("syncQuery:scheduled", { reason });
  querySyncTimer = setTimeout(() => {
    querySyncTimer = null;
    if (!isInitializing.value && canSyncQuery.value) {
      debugState("syncQuery:flush", { reason });
      pushQuery(reason);
    } else {
      debugState("syncQuery:flush-blocked", { reason });
    }
  }, 350);
};

const alignToAvailable = (preferLatestMonth = false) => {
  let yearWasAdjusted = false;
  const firstYear = availableYears.value[0];
  if (firstYear !== undefined && !availableYears.value.includes(year.value)) {
    year.value = firstYear;
    yearWasAdjusted = true;
  }

  if (
    preferLatestMonth &&
    latestMonthlySelection.value &&
    availableScopes.value.includes("month")
  ) {
    scope.value = "month";
    year.value = latestMonthlySelection.value.year;
    month.value = latestMonthlySelection.value.month;
  } else if (scope.value === "month") {
    const monthsForYear = availableMonths.value;
    const lastMonth = monthsForYear[monthsForYear.length - 1];
    if (!monthsForYear.length) {
      scope.value = "year";
    } else if (lastMonth !== undefined && (yearWasAdjusted || !monthsForYear.includes(month.value))) {
      month.value = lastMonth;
    }
  }

  const firstMode = availableModes.value[0];
  if (firstMode !== undefined && !availableModes.value.includes(mode.value)) {
    mode.value = firstMode;
  }
};

const loadAvailable = async (preferLatestMonth = false, preserveSelection = false) => {
  debugState("loadAvailable:start", { preferLatestMonth, preserveSelection });
  try {
    const [chRes, res] = await Promise.all([
      fetchAvailableChannels(),
      fetchAvailablePeriods(channel.value),
    ]);
    availableChannels.value = chRes.channels;
    availableYearsMap.value = res.years as Record<Scope, number[]>;
    availableMonthsMap.value = res.months;
    availableModesMap.value = res.modes as Record<Scope, Mode[]>;
    const scopes: Scope[] = [];
    if (res.years.year.length) scopes.push("year");
    if (res.years.month.length) scopes.push("month");
    availableScopes.value = scopes;
    if (preserveSelection) {
      debugState("loadAvailable:preserved", { preferLatestMonth, preserveSelection });
      return;
    }
    const firstScope = availableScopes.value[0];
    if (availableScopes.value.length === 1 && firstScope !== undefined) {
      scope.value = firstScope;
    } else if (!availableScopes.value.includes(scope.value)) {
      scope.value = firstScope ?? "year";
    }
    alignToAvailable(preferLatestMonth);
    debugState("loadAvailable:aligned", { preferLatestMonth, preserveSelection });
  } catch {
    debugState("loadAvailable:error", { preferLatestMonth, preserveSelection });
    availableChannels.value = [];
    availableYearsMap.value = {
      year: [],
      month: [],
      day: [],
    };
    availableMonthsMap.value = {};
    availableScopes.value = [];
    availableModesMap.value = {
      year: [],
      month: [],
      day: [],
    };
  }
};

const loadTiers = async () => {
  data.value = await fetchTiers({
    channel: channel.value,
    scope: scope.value,
    year: year.value,
    month: month.value,
    mode: mode.value,
  });
  tableAnimationSeed.value += 1;
  resetPrefetchIndex();
  await prefetchMoreProfiles();
};

const canReload = computed(() => {
  if (!channel.value.trim()) return false;
  if (!availableYears.value.length) return false;
  if (!availableScopes.value.includes(scope.value)) return false;
  if (!availableModes.value.length || !availableModes.value.includes(mode.value)) return false;
  if (scope.value === "month" && !availableMonths.value.includes(month.value)) return false;
  return true;
});

const canAttemptExplicitLoad = computed(() => {
  if (!channel.value.trim()) return false;
  if (scope.value !== "year" && scope.value !== "month") return false;
  if (!Number.isFinite(year.value) || year.value <= 2000) return false;
  if (
    scope.value === "month" &&
    (!Number.isFinite(month.value) || month.value < 1 || month.value > 12)
  ) {
    return false;
  }
  return mode.value === "all" || mode.value === "online" || mode.value === "offline";
});

watch(
  () => data.value?.entries,
  async (entries: TierEntry[] | undefined) => {
    if (!entries) return;
    const topIds = sortScoredEntries(entries)
      .slice(0, 50)
      .map((entry) => entry.userId);
    await fetchProfiles(topIds);
    await fetchRelations(topIds);
    setupPrefetchObserver();
  },
  { immediate: true },
);

type ReloadOptions = {
  allowExplicitSelection?: boolean;
  refreshAvailable?: boolean;
  syncUrl?: boolean;
};

const reload = async ({
  allowExplicitSelection = false,
  refreshAvailable = true,
  syncUrl = true,
}: ReloadOptions = {}) => {
  debugState("reload:start", { allowExplicitSelection, refreshAvailable, syncUrl });
  if (allowExplicitSelection ? !canAttemptExplicitLoad.value : !canReload.value) {
    debugState("reload:blocked", {
      allowExplicitSelection,
      canAttemptExplicitLoad: canAttemptExplicitLoad.value,
      canReload: canReload.value,
    });
    hasAttemptedLoad.value = true;
    return;
  }

  pending.value = true;
  error.value = null;

  const rolesPromise = loadRoles(channel.value).catch(() => {
    /* cosmetic only */
  });

  try {
    if (refreshAvailable) {
      await loadAvailable(false, allowExplicitSelection);
    }
    await loadTiers();
    await rolesPromise;
    if (syncUrl) {
      pushQuery("reload");
    }
  } catch (e: unknown) {
    debugState("reload:error", { error: e });
    error.value = e;
  } finally {
    debugState("reload:done", { allowExplicitSelection, refreshAvailable, syncUrl });
    hasAttemptedLoad.value = true;
    pending.value = false;
  }
};

const loadInitial = async (preserveInitialPeriod: boolean, preserveInitialUrl: boolean) => {
  debugState("loadInitial:start", { preserveInitialPeriod, preserveInitialUrl });
  if (preserveInitialPeriod) {
    const availablePromise = loadAvailable(false, true);
    setupPrefetchObserver();
    await Promise.all([
      availablePromise,
      reload({
        allowExplicitSelection: true,
        refreshAvailable: false,
        syncUrl: false,
      }),
    ]);
    debugState("loadInitial:done-explicit", { preserveInitialPeriod, preserveInitialUrl });
    return;
  }

  await loadAvailable(true);
  setupPrefetchObserver();
  await reload({
    refreshAvailable: false,
    syncUrl: false,
  });
  debugState("loadInitial:done-default", { preserveInitialPeriod, preserveInitialUrl });
};

watch(
  () => year.value,
  () => {
    if (isInitializing.value) return;
    debugState("watch:year");
    alignToAvailable();
    syncQuery("watch:year");
  },
);

watch(
  () => channel.value,
  async () => {
    if (isInitializing.value) return;
    debugState("watch:channel");
    for (const id of Object.keys(relations)) delete relations[id];
    await loadAvailable(true);
    syncQuery("watch:channel");
  },
);

watch(
  () => scope.value,
  () => {
    if (isInitializing.value) return;
    debugState("watch:scope");
    alignToAvailable();
    syncQuery("watch:scope");
  },
);

watch(
  () => [month.value, mode.value],
  () => {
    if (isInitializing.value) return;
    debugState("watch:month-mode");
    syncQuery("watch:month-mode");
  },
);

onMounted(async () => {
  debugState("mounted:start");
  const initialQuery = await syncFromQuery();
  const preserveInitialPeriod = initialQuery.hadInitialPeriodQuery;
  const preserveInitialUrl = initialQuery.hadInitialQuery;
  debugState("mounted:after-syncFromQuery", { initialQuery });

  try {
    await loadInitial(preserveInitialPeriod, preserveInitialUrl);
  } finally {
    isInitializing.value = false;
    debugState("mounted:init-unlocked", { preserveInitialUrl });
    setTimeout(() => {
      canSyncQuery.value = true;
      debugState("mounted:query-sync-unlocked", { preserveInitialUrl });
      if (!preserveInitialUrl && !hasQuery()) {
        syncQuery("initial-default-url");
      } else if (!preserveInitialUrl) {
        debugState("mounted:skip-initial-default-url-late-query");
      }
    }, 500);
  }
});

onBeforeUnmount(() => {
  if (querySyncTimer) {
    clearTimeout(querySyncTimer);
  }
});

const periodText = computed(() => {
  if (!data.value) return "";
  const { year: y, month: m } = data.value;
  return [y, m].filter(Boolean).join("/");
});

const rankedEntries = computed(() =>
  data.value?.entries ? sortScoredEntries(data.value.entries) : [],
);

const activeSearch = computed(() => userLookup.value.trim());
const rankMap = computed(() =>
  Object.fromEntries(rankedEntries.value.map((entry, index) => [entry.userId, index + 1])),
);

const selectedEntry = computed(() => {
  if (!data.value || !userData.value) return null;
  return data.value.entries.find((e: TierEntry) => e.userId === userData.value?.id) || null;
});

const selectedRank = computed(() => {
  if (!userData.value) return null;
  const idx = rankedEntries.value.findIndex((entry) => entry.userId === userData.value?.id);
  return idx >= 0 ? idx : null;
});

const displayNameLine = computed(() => {
  if (!userData.value) return "";
  const { displayName, login } = userData.value;
  if (!displayName || !login) return displayName || login || "";
  if (displayName.toLowerCase() === login.toLowerCase()) return displayName;
  return `${displayName} (${login})`;
});

const errorText = computed(() => {
  const val = error.value;
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && "message" in val) {
    const message = val.message;
    if (message) return String(message);
  }
  return String(val);
});
</script>

<template>
  <main class="site-page tiers-page surface-panel surface-panel--padded">
    <header class="header">
      <div>
        <h1>Рейтинг пользователей чата</h1>
        <p class="muted">
          Подгружаем данные из
          <a href="https://github.com/Linaryx/rustlog" target="_blank" rel="noopener noreferrer"
            >rustlog tiers</a
          >: online / offline / all
        </p>
      </div>
      <button
        class="btn primary refresh-btn"
        :disabled="pending || !canReload"
        @click="reload()"
      >
        {{ pending ? "Загрузка..." : "Загрузить статистику" }}
      </button>
    </header>

    <TierControls
      :channel="channel"
      :scope="scope"
      :year="year"
      :month="month"
      :mode="mode"
      :available-channels="availableChannels"
      :available-scopes="availableScopes"
      :available-years="availableYears"
      :available-months="availableMonths"
      :available-modes="availableModes"
      @update:channel="channel = $event"
      @update:scope="scope = $event"
      @update:year="year = $event"
      @update:month="month = $event"
      @update:mode="mode = $event"
      @reload="reload"
    />

    <section class="card no-lift">
      <div class="lookup">
        <div class="lookup-row">
          <input v-model="userLookup" type="text" placeholder="login, display name or id" />
          <button v-if="activeSearch" class="btn secondary" type="button" @click="userLookup = ''">
            Сбросить
          </button>
        </div>
        <p v-if="activeSearch" class="lookup-meta">
          Найдено {{ filteredEntries.length }} из {{ rankedEntries.length }} по запросу "{{
            activeSearch
          }}"
        </p>
        <p v-if="userError" class="error-text">Ошибка: {{ userError }}</p>
        <div v-if="userData" class="profile-mini">
          <span class="value">{{ userData.displayName }}</span>
          <button class="btn secondary" @click="showProfile = !showProfile">
            {{ showProfile ? "Скрыть карточку" : "Карточка" }}
          </button>
        </div>
      </div>
    </section>

    <section class="card error" v-if="error">
      <p>Ошибка: {{ errorText }}</p>
    </section>

    <section v-else-if="hasAttemptedLoad && !pending && !data" class="card empty-state">
      <p class="value">Данных для выбранной статистики нет.</p>
      <p class="muted">
        Проверьте канал, период и режим чата. Если вы открыли ссылку вручную, параметры URL не будут
        автоматически заменены на другие.
      </p>
    </section>

    <section v-if="pending || data" class="card no-lift results-card">
      <TierSummary
        :loading="pending"
        :period="periodText"
        :timezone="data?.timezone || ''"
        :users="data?.totalUsers || 0"
        :messages="data?.totalMessages || 0"
        :unique="data?.totalUniqueMessages || 0"
      />

      <div class="table-slot">
        <p v-if="!pending && activeSearch && !filteredEntries.length" class="lookup-empty">
          По текущему запросу ничего не найдено.
        </p>
        <TierTable
          ref="tableRef"
          :entries="displayedEntries"
          :rank-map="rankMap"
          :profiles="profiles"
          :avatar-classes="avatarClasses"
          :tier-colors="tierColors"
          :loading="pending"
          :skeleton-rows="11"
          :animation-seed="tableAnimationSeed"
          @open-profile="openProfile"
        />
      </div>
    </section>
  </main>

  <UserCard
    v-if="showProfile && userData"
    :user-data="userData"
    :loading="userLoading"
    :display-name="displayNameLine"
    :created-text="humanizeFromDate(userData.createdAt)"
    :follow-text="humanizeFromDate(relations[userData.id]?.followedAt)"
    :sub-text="humanizeMonths(relations[userData.id]?.subMonths)"
    :role-text="
      userData.roles?.isPartner ? 'Партнёр' : userData.roles?.isAffiliate ? 'Компаньон' : ''
    "
    :selected-entry="selectedEntry"
    :selected-rank="selectedRank"
    @close="showProfile = false"
  />
</template>

<style scoped>
.tiers-page {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
  backdrop-filter: blur(10px);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #7dd3fc;
  font-size: 12px;
  font-weight: 600;
  margin: 0;
}

h1 {
  margin: 4px 0;
  font-size: 32px;
}

.muted {
  margin: 0;
  color: var(--color-text-2);
}

.pill {
  background: #0b0b0e;
  border: 1px solid #1a1a1a;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-weight: 700;
}

.card {
  margin-top: 0;
  background: rgba(11, 11, 14, 0.82);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 16px;
}

.results-card {
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.results-card :deep(.summary) {
  padding: 16px 16px 12px;
  margin-bottom: 0;
}

.card.no-lift:hover {
  transform: none;
  box-shadow: none;

  border-color: #1f1f1f;
}

.lookup {
  display: grid;
  gap: 12px;
  position: relative;
}

.lookup-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.lookup-row input {
  flex: 1 1 240px;
  min-width: 0;
  background: rgba(11, 11, 11, 0.92);
  border: 1px solid var(--color-border-strong);
  color: var(--color-text-1);
  border-radius: 12px;
  padding: 10px 12px;
}

.lookup-meta,
.lookup-empty {
  color: var(--color-text-2);
  font-size: 0.92rem;
}

.lookup-empty {
  margin: 0;
  padding: 12px 16px;
}

.lookup-row .btn:hover,
.lookup-row .btn:active {
  transform: none !important;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 700;
  transition: all 0.15s ease;
  border: 1px solid var(--color-border-strong);
  background: rgba(10, 10, 10, 0.92);
  color: var(--color-text-1);
  box-shadow: none;
  cursor: pointer;
}

.btn.primary:hover {
  border-color: #444444;
  background: #111111;
  transform: none;
}

.btn.primary:active {
  transform: none;
  border-color: #666666;
  background: #111111;
}

.profile {
  display: flex;
  gap: 12px;
  align-items: center;
}

.profile img {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid #1f2937;
}

.card.error {
  border-color: #b91c1c;
  color: #fecdd3;
}

.empty-state {
  display: grid;
  gap: 8px;
}

.empty-state .value {
  margin: 0;
  font-weight: 800;
}

.error-text {
  color: #fca5a5;
  margin: 0;
}

.profile-mini {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.table-slot {
  min-height: 0;
}

.table-slot :deep(.table-wrap) {
  border: 0;
  border-top: 1px solid var(--color-border);
  border-radius: 0 0 14px 14px;
}

.btn.secondary {
  background: #0d0d0d;
  border: 1px solid #2d2d2d;
}

.btn.primary.refresh-btn {
  align-self: flex-start;
  padding: 10px 16px;
  background: var(--color-brand-accent-1);
  border-color: var(--color-brand-accent-2);
  color: #ffffff;
  box-shadow:
    0 6px 20px rgba(16, 174, 185, 0.15),
    0 0 12px rgba(16, 145, 185, 0.35);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s,
    color 0.15s;
}

.btn.primary.refresh-btn:hover {
  transform: none;
}

.btn.primary.refresh-btn:active {
  transform: none;
  border-color: #446973;
  background: #43656d;
  box-shadow:
    0 6px 18px rgba(67, 101, 109, 0.18),
    0 0 10px rgba(84, 129, 138, 0.24);
}

/* Disabled state: gray and non-interactive */
.btn.primary.refresh-btn[disabled],
.btn.primary.refresh-btn:disabled {
  background: #4b5563;
  border-color: #374151;
  color: #e5e7eb;
  box-shadow: none;
  cursor: not-allowed;
  opacity: 0.75;
}

.btn.primary.refresh-btn[disabled]:hover,
.btn.primary.refresh-btn[disabled]:active,
.btn.primary.refresh-btn:disabled:hover,
.btn.primary.refresh-btn:disabled:active {
  transform: none;
  background: #4b5563;
  border-color: #374151;
  box-shadow: none;
}

/* Underline rustlog link in muted text */
.muted a {
  text-decoration: underline;
  text-underline-offset: 2px;
  color: inherit;
}

.muted a:focus,
.muted a:hover {
  text-decoration: underline;
}

@media (min-width: 901px) {
  .tiers-page {
    min-height: 940px;
    height: max(calc(100dvh - 132px), 940px);
    overflow: hidden;
  }

  .results-card {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .table-slot {
    flex: 1 0 420px;
    min-height: 420px;
    overflow: hidden;
  }

  .table-slot :deep(.table-wrap) {
    height: 100%;
    width: 100%;
    min-height: 420px;
  }
}

@media (max-width: 900px) {
  .tiers-page {
    padding: 16px;
  }

  h1 {
    font-size: 28px;
  }
}

@media (max-width: 640px) {
  .lookup-row,
  .profile-mini {
    flex-direction: column;
    align-items: stretch;
  }

  .btn,
  .btn.primary.refresh-btn {
    width: 100%;
  }
}
</style>
