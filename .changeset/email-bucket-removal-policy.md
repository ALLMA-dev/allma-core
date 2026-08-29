---
"@allma/core-cdk": patch
---

Make IncomingEmailsBucket removalPolicy stage-conditional (RETAIN in prod, DESTROY elsewhere) and keep autoDeleteObjects non-prod only, aligning with the platform's stateful resource lifecycle pattern.
