# Allma Websites CDK Package

This package contains the AWS CDK infrastructure for deploying Allma's public-facing websites, including the documentation site. It is designed to be a standalone project, completely independent of the `@allma/core-cdk` package, which is intended for open-source consumers.

This separation allows Allma's internal website infrastructure to be managed and deployed separately from the core open-source platform.

## Manual Deployment

While this package is primarily deployed via the automated CI/CD pipeline (`.github/workflows/ci-websites.yml`), it can also be deployed manually.

### Prerequisites

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Build the Documentation Site:**
    The CDK stack deploys the pre-built static assets for the documentation site. You must build them first.
    ```bash
    npm install --prefix ../docs.allma.dev
    npm run build --prefix ../docs.allma.dev
    ```

3.  **Configure AWS Credentials:**
    Ensure your environment is configured with AWS credentials that have sufficient permissions to deploy the necessary resources (S3, CloudFront, Lambda, etc.).

### Deployment Command

To deploy the stack, you must provide the `stage`, `account`, and `region` as context variables to the CDK. You can also optionally provide a `domainName` and `certificateArn` to configure a custom domain.

```bash
npm run cdk deploy -- \
  -c stage=<your-stage-name> \
  -c account=<your-aws-account-id> \
  -c region=<your-aws-region> \
  -c domainName=<your-domain-name> \ # Optional
  -c certificateArn=<your-certificate-arn> # Optional
```

**Example (without custom domain):**

```bash
npm run cdk deploy -- \
  -c stage=prod \
  -c account=123456789012 \
  -c region=us-east-1
```

**Example (with custom domain):**

```bash
npm run cdk deploy -- \
  -c stage=prod \
  -c account=123456789012 \
  -c region=us-east-1 \
  -c domainName=docs.example.com \
  -c certificateArn=arn:aws:acm:us-east-1:123456789012:certificate/your-cert-id
```

This command will synthesize and deploy the CloudFormation stack, creating all the necessary resources to host the documentation site.
