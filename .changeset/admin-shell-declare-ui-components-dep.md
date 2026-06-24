---
"@allma/admin-shell": patch
---

Declare `@allma/ui-components` as a dependency of `@allma/admin-shell`. It was imported in source
but never declared, so a clean build had no dependency-graph edge forcing `@allma/ui-components` to
build first and `tsup` would fail with `Could not resolve "@allma/ui-components"`. Declaring it fixes
the build ordering and lets `tsup` externalize the package (it is no longer inlined into the bundle),
so consumers receive it transitively with no action required.
