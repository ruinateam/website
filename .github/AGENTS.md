# Agent Guide

Nuxt 4 / Vue 3 static site, built with Bun and deployed to GitHub Pages.

- Read [README](../README.md) for setup, commands and project structure.
- Read [development notes](../docs/development.md) for data sources, cache generation and deployment.
- Read [gallery architecture](../docs/team-gallery.md) before changing `/team`.
- Use `bun fmt --check` and `bun run test`; the latter includes lint, typecheck and static generation.
- Do not run cleanup/build/typecheck alongside a dev server: they remove its generated output.
- Preserve unrelated changes, source assets and attribution. Do not edit generated directories manually.
- Keep `.env` and `public/api-cache/` out of commits. Client configuration must never contain private credentials.
- Prefer `content/guides/` for editorial content; validate new routes against prerender configuration.
- For UI changes, verify real desktop/mobile screenshots, keyboard access, reduced-motion and fallbacks.
- Do not commit or deploy without explicit authorization.
