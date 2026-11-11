# Ruina.team

Сайт Ruina.team: команда, руководства, таймлайн Marvel и рейтинг чата.
Nuxt 4, Vue 3 и TypeScript; статическая сборка для GitHub Pages. Разработка и сборка работают через Bun.

## Быстрый старт

Нужен Bun версии из `package.json` (поле `packageManager`).

```sh
bun install --frozen-lockfile
cp .env.example .env
bun run dev
```

Параметры Supabase в `.env` нужны для данных рейтинга чата. Используйте публичный URL и anon key,
не service-role key. Локальные `.env`-файлы не коммитятся.

## Команды

| Команда              | Назначение                                                      |
| -------------------- | --------------------------------------------------------------- |
| `bun run dev`        | Локальный Nuxt-сервер                                           |
| `bun fmt`            | Встроенное форматирование Bun                                   |
| `bun fmt --check`    | Проверка форматирования без записи                              |
| `bun lint`           | Oxlint, запущенный через Bun                                    |
| `bun run typecheck`  | Подготовка Nuxt-типов и проверка Vue/TypeScript                 |
| `bun run test:unit`  | Модульные и CLI-тесты                                           |
| `bun run test`       | Тесты, lint, валидация анимаций, typecheck и статическая сборка |
| `bun run fetch:data` | Обновление публичного кэша рейтингов и ролей                    |
| `bun run build`      | Генерация сайта в `dist/public`                                 |
| `bun run preview`    | Просмотр готовой сборки на порту 4173                           |

`bun run test` не включает форматирование: запускайте `bun fmt --check` отдельно.
`build` и `typecheck` очищают выходные каталоги; не запускайте их параллельно с dev-сервером.

## Структура

- `pages/`, `components/`, `composables/` — страницы, компоненты и Vue-логика.
- `content/guides/` — Markdown-руководства, отображаемые на сайте.
- `lib/` — работа с данными, таймлайн и код 3D-галереи.
- `public/` — статические ресурсы; `public/api-cache/` генерируется и не хранится в Git.
- `scripts/`, `tests/` — обслуживание проекта и автоматические проверки.
- `assets/css/tokens.css` — общие цвета, типографика и параметры движения.

## Документация

- [Разработка, данные и сборка](docs/development.md).
- [Устройство галереи `/team`](docs/team-gallery.md).
- Источники ресурсов: [скины](public/skins/SOURCES.md),
  [Purpur](public/textures/purpur/SOURCES.md), [анимации](public/animations/README.md).

Публикация настроена в [GitHub Actions](.github/workflows/deploy.yml): push в `main` или ручной запуск workflow.
Локальная сборка сама ничего не публикует.
