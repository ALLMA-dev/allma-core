---
"@allma/core-types": major
---

**Breaking:** remove the `log_info`, `log_warn`, `log_error` and `log_debug` exports. They were plain `console` wrappers that shadowed the structured logger. Use the same-named functions from `@allma/core-sdk`, which take `(message, details?, correlationId?)`.
