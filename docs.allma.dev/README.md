# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Installation

```bash
npm install
```

## Local Development

```bash
npm start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

Deployment to the live site at **https://docs.allma.dev** is **fully automated** — you do not run a
manual deploy command. The offline source in this directory is the single source of truth, and it
syncs to the online site through CI:

1. Open a PR that changes anything under `docs.allma.dev/**`.
   The [`CI/CD for Allma Websites`](../.github/workflows/ci-websites.yml) workflow runs
   `npm run build --prefix docs.allma.dev`. Because Docusaurus is configured with
   `onBrokenLinks: 'throw'` (`docusaurus.config.ts`), a broken internal link fails the PR build.
2. Merge to `main`. The same workflow rebuilds the site and runs the CDK `WebsitesStack`
   (`allma.cdk/lib/websites-stack.ts`), which publishes the static build to an S3 bucket fronted by
   CloudFront and invalidates the CloudFront cache (`distributionPaths: ['/*']`). Changes are live
   within a few minutes.

To preview a production build locally before opening a PR:

```bash
npm run build --prefix docs.allma.dev   # mirrors the CI build / link check
npm run serve --prefix docs.allma.dev   # serves the contents of ./build
```
