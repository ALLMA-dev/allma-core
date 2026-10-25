---
'@allma/core-cdk': patch
---

Give every Lambda log group in `AllmaStack` a finite CloudWatch retention from `logging.retentionDays.default`, including CDK custom-resource Lambdas. Before, platform Lambda logs never expired. A `retentionDays` value that is not a valid CloudWatch period now rounds up to the next valid period.
