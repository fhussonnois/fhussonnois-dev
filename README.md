# fhussonnois.dev

Personal blog built with [Hugo](https://gohugo.io/) and deployed to GitHub Pages.

## Prerequisites

- [Hugo Extended](https://gohugo.io/installation/) v0.120.3+
- [Node.js](https://nodejs.org/) 18+

## Development

```bash
# Local development server
hugo server -D

# Production build
hugo --minify -v -s . -d ./public
```

## Updating Contributions

The [Contributions](https://www.fhussonnois.dev/contributions/) page is generated from `data/contributions.json`, which is produced by a TypeScript script that queries the GitHub API.

To refresh the data:

```bash
cd scripts
npm install        # first time only
npx tsx fetch-contributions.ts
```

The script will:

1. Search GitHub for all merged PRs authored by `fhussonnois`
2. Exclude PRs from `kestra-io`, `streamthoughts`, and `fhussonnois` orgs/repos
3. For `apache/kafka` PRs, fetch PR bodies to extract KIP references
4. Write the results to `data/contributions.json`

Optionally set `GITHUB_TOKEN` to avoid rate limits:

```bash
GITHUB_TOKEN=ghp_xxx npx tsx fetch-contributions.ts
```

After running, commit the updated `data/contributions.json` and redeploy.

## Deployment

Push to `main` triggers the GitHub Actions workflow which builds with Hugo and deploys to the `gh-pages` branch.
