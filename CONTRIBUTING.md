# Contributing to Allma

First off, thank you for considering contributing to Allma! We're thrilled you're interested in helping us build a powerful, open-source AI orchestration platform. Your contributions are what make the open-source community such an amazing place.

This document provides a high-level overview of the contribution process. For a more detailed, step-by-step tutorial, please see our full **[Contribution Guide on our documentation website](/docs/community/contribution-guide)**.

## Code of Conduct

This project is governed by the [Allma Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How to Contribute

There are many ways to contribute, from writing code and documentation to submitting bug reports and feature requests.

-   **🐞 Reporting Bugs:** If you find a bug, please search our [GitHub Issues](https://github.com/your-org/allma/issues) to see if it has already been reported. If not, [open a new bug report](https://github.com/your-org/allma/issues/new?assignees=&labels=bug&template=bug_report.md&title=).
-   **💡 Suggesting Enhancements:** We use [GitHub Discussions](https://github.com/your-org/allma/discussions/new?category=ideas) for new feature ideas. It's a great way to start a conversation with the community and maintainers before you invest time in writing code.

## Your First Code Contribution

Ready to write some code? You can get started by looking for issues tagged `good first issue` or `help wanted`.

-   [**Good first issues**](https://github.com/your-org/allma/labels/good%20first%20issue): Ideal for newcomers.
-   [**Help wanted issues**](https://github.com/your-org/allma/labels/help%20wanted): Well-defined tasks that are ready for implementation.

### The Pull Request Workflow

We follow a standard GitHub workflow for all code contributions.

1.  **Claim an Issue:** Comment on the issue you want to work on to let others know.
2.  **Fork & Clone:** Fork the repository to your own GitHub account and clone it to your local machine.
3.  **Create a Branch:** Create a new branch from `main` with a descriptive name (e.g., `fix/issue-123-json-parsing` or `feature/add-case-converter-module`).
4.  **Develop & Test:** Make your changes, add new tests to cover your work, and ensure all existing tests pass by running `npm test`.
5.  **Commit Your Changes:** We use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for our commit messages (e.g., `feat: add string case converter module`).
6.  **Push to Your Fork:** Push your branch to your forked repository on GitHub.
7.  **Open a Pull Request:** Create a Pull Request from your branch back to the Allma `main` branch.
    -   Fill out the PR template completely.
    -   Link the PR to the issue it resolves using keywords like `Closes #123`.

A maintainer will review your PR, and you may be asked to make changes. This collaboration is a key part of the open-source process!

### Style Guides

-   **Code:** We use **ESLint** and **Prettier**. Run `npm run lint` before committing to format your code.
-   **Commits:** We enforce [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). This helps us automate releases and generate changelogs.

We look forward to building with you!