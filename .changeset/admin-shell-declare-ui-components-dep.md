---
"@allma/admin-shell": patch
---

Declare `@allma/ui-components` as a peer/dev dependency of `@allma/admin-shell`.

The package imports from `@allma/ui-components` but never declared it in its own `package.json`, so
Turbo's topological `^build` ordering didn't know the two were related and scheduled their builds
concurrently. Because the root `build` task is uncached and `ui-components`' tsup config uses
`clean: true`, its `dist/` was wiped at the start of every build — and admin-shell's esbuild would
intermittently fail to resolve `./dist/index.mjs` during that window (`Could not resolve
"@allma/ui-components"`). Declaring the dependency in the admin-shell package (not just the repo
root, which Turbo does not use for per-package ordering) lets Turbo build `ui-components` first,
eliminating the race.
