---
sidebar_position: 3
title: Quick Start
---

# Quick Start: Deploy Allma

This guide provides the fastest path to getting the core Allma platform running in your AWS account. We'll focus on the minimal steps required to deploy the backend services.

We will use the `examples/basic-deployment` project as a template. This project uses the AWS Cloud Development Kit (CDK) to define and deploy all necessary cloud infrastructure.

### Prerequisites

Before you begin, ensure you have the following:
1.  **An AWS Account:** [Create one here if you don't have one.](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/)
2.  **AWS CLI:** [Install and configure the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) with credentials for your account.
3.  **Node.js:** [Install the latest LTS version.](https://nodejs.org/)
4.  **Git:** To clone the repository.

---

## Step 1: Get the Allma Code

First, clone the main Allma repository and install all dependencies from the root. This links all the local Allma packages together.

```bash
git clone https://github.com/your-org/allma.git
cd allma
npm install
```

## Step 2: Set Up Your Deployment Project

The `examples/basic-deployment` directory is a template. **It is highly recommended to copy this directory** to a new, private location for your own project. For this guide, we will proceed from within the example.

Navigate into the project and install its dependencies.

```bash
cd examples/basic-deployment
npm install
```

## Step 3: Configure Your Deployment

Open `config/allma.config.ts`. This is where you provide the essential details for your deployment.

Update the following required values:

```typescript title="config/allma.config.ts"
import { StageConfig, Stage } from '@allma/core-types';

export const myDevConfig: StageConfig = {
  // --- REQUIRED: Update these values ---
  awsAccountId: '112233445566', // YOUR AWS Account ID
  awsRegion: 'us-east-1',      // YOUR preferred AWS Region
  stage: Stage.DEV,

  // --- REQUIRED: Secrets for AI Services ---
  // 1. In AWS, go to Secrets Manager.
  // 2. Create a new secret (type "Other").
  // 3. Use a JSON key/value, e.g., {"GeminiApiKey": "your-key-here"}
  // 4. Save the secret and paste its full ARN here.
  aiApiKeySecretArn: 'arn:aws:secretsmanager:us-east-1:112233445566:secret:MyAllmaKeys-aBcDeF',

  // ... other configs can be left as default for now ...
};
```

## Step 4: Build and Deploy

First, navigate back to the **monorepo root** to build all the Allma packages.

```bash
# In the monorepo root (e.g., allma/)
cd ../..
npm run build
```

Now, return to your deployment project and deploy the stack to AWS.

```bash
# In your deployment project (e.g., allma/examples/basic-deployment)
cd examples/basic-deployment
npx cdk deploy --all
```

> **Tip:** If you use multiple AWS profiles, you can specify one with the `--profile` flag:
> `npx cdk deploy --all --profile your-profile-name`

If this is your first time using the AWS CDK in this account/region, you may be prompted to run a `cdk bootstrap` command first. Follow the on-screen instructions.

Approve any security changes when prompted by the CDK.

---

### You're Live!

Congratulations! The Allma backend is now running in your AWS account. The CDK output will include the URL for your **Admin API endpoint**.

---

## Optional Next Steps

### Deploying the Admin Shell UI

The Admin Shell is the web interface for managing and monitoring Allma.

1.  **Build the Admin Shell:**
    From the monorepo root, run the build command for the admin shell application.
    ```bash
    # In the monorepo root (e.g., allma/)
    npm run build --workspace=@allma/admin-shell
    ```

2.  **Configure the Deployment:**
    Open `bin/basic-allma-app.ts` in your deployment project. Pass the `adminShell` property to the `AllmaStack`.

    ```typescript title="bin/basic-allma-app.ts"
    import * as path from 'path';

    // ... other imports

    new AllmaStack(app, `Allma-Backend-${myDevConfig.stage}`, {
      // ... existing props
      adminShell: {
        assetPath: path.join(__dirname, '../src/admin-app/dist'),
      },
    });
    ```

3.  **Re-deploy:**
    Run the deploy command again from your deployment project.
    ```bash
    npx cdk deploy --all
    ```
    The CDK output will now include the CloudFront URL for your Admin Shell.

### Setting Up the First Administrator

After deploying the Admin Shell, you need to create the first super administrator user to log in.

1.  **Navigate to Amazon Cognito:**
    *   In the AWS Console, go to the Amazon Cognito service.
    *   Find the User Pool that was created by your CDK deployment. It will be named something like `Allma-Auth-UserPool-dev`.

2.  **Create or Find Your User:**
    *   You can either create a new user or use an existing one that you've signed up with.

3.  **Assign Admin Privileges:**
    *   Go to the **Users** tab and select your user.
    *   Under **Group memberships**, click **Add user to group** and select the `Admin` group.
    *   In the user's detail view, find the **Additional attributes** section.
    *   Set the **Attribute name** to `custom:admin_roles`.
    *   Set the **Value** to `{"roles": ["SUPER_ADMIN"], "permissions": []}`.
    *   Save the changes.

You can now log into the Admin Shell with this user's credentials, and you will have full super administrator access. If you still see "Access Denied" sign out and login again.

### Using a Custom Domain for the UI

You can map a custom domain to the Admin Shell site. There are two common ways to do this:

#### Method 1: Automated DNS with Route 53 (Recommended)

This is the easiest method if you manage your domain's DNS with AWS Route 53. The CDK will automatically create the necessary DNS records for you.

1.  **Prerequisites:**
    *   A domain name whose DNS is managed by a **public hosted zone in AWS Route 53**.
        *   If your domain is registered with a third-party (like GoDaddy or Namecheap), you must first [delegate DNS control to Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html) by updating the Name Server (NS) records at your registrar.
    *   An ACM SSL certificate for your desired domain (e.g., `allma.example.com`). **This certificate must be created in the `us-east-1` region**, which is a requirement for CloudFront.

2.  **Update the Configuration:**
    In `bin/basic-allma-app.ts`, provide the domain details to your UI configuration.

    ```typescript title="bin/basic-allma-app.ts"
    // ...

    new AllmaStack(app, `Allma-Backend-${myDevConfig.stage}`, {
      // ... existing props
      adminShell: {
        assetPath: path.join(__dirname, '../src/admin-app/dist'),
        domainName: 'allma.example.com',
        hostedZoneId: 'Z0123456789ABCDEFGHIJ', // Your Route 53 Hosted Zone ID
        certificateArn: 'arn:aws:acm:us-east-1:112233445566:certificate/your-cert-id',
      },
    });
    ```

3.  **Re-deploy:**
    Run `npx cdk deploy --all` again. The CDK will automatically create an Alias record in your hosted zone pointing your domain to the CloudFront distribution.

#### Method 2: Manual DNS with an External Provider

If you prefer to manage your DNS records with an external provider (e.g., Cloudflare, GoDaddy), you can create a `CNAME` record manually.

1.  **Prerequisites:**
    *   An ACM SSL certificate for your desired domain (e.g., `allma.example.com`). **This certificate must be created in the `us-east-1` region.**

2.  **Update the Configuration:**
    In `bin/basic-allma-app.ts`, provide only the `domainName` and `certificateArn`. Omit the `hostedZoneId`.

    ```typescript title="bin/basic-allma-app.ts"
    // ...

    new AllmaStack(app, `Allma-Backend-${myDevConfig.stage}`, {
      // ... existing props
      adminShell: {
        assetPath: path.join(__dirname, '../src/admin-app/dist'),
        domainName: 'allma.example.com',
        certificateArn: 'arn:aws:acm:us-east-1:112233445566:certificate/your-cert-id',
      },
    });
    ```

3.  **Re-deploy and Get the CloudFront URL:**
    Run `npx cdk deploy --all`. After the deployment finishes, look for the CDK output named `AdminShellWebAppUrl`. It will look something like `https://d123abcdef.cloudfront.net`.

4.  **Create a CNAME Record:**
    Go to your DNS provider's dashboard and create a `CNAME` record:
    *   **Name/Host:** `allma` (or whatever subdomain you are using)
    *   **Value/Target:** The CloudFront URL from the CDK output (e.g., `d123abcdef.cloudfront.net`).
