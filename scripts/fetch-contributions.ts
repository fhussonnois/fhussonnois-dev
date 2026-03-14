import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const GITHUB_USER = "fhussonnois";
const EXCLUDED_OWNERS = ["kestra-io", "streamthoughts", "fhussonnois"];
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const KIP_WIKI = "https://cwiki.apache.org/confluence/display/KAFKA";

// KIP references not found in PR bodies but confirmed via JIRA
const KNOWN_KIPS: Record<string, number> = {
  "apache/kafka#2604": 131, // KAFKA-4794 → KIP-131
};

interface SearchItem {
  number: number;
  title: string;
  html_url: string;
  created_at: string;
  pull_request?: { merged_at: string | null };
  repository_url: string;
}

interface SearchResponse {
  total_count: number;
  items: SearchItem[];
}

interface PRDetail {
  body: string | null;
}

interface PR {
  number: number;
  title: string;
  url: string;
  created_at: string;
  merged_at: string;
  kip?: { number: number; url: string };
}

interface RepoContributions {
  repo: string;
  repo_url: string;
  prs: PR[];
}

interface ContributionsData {
  generated_at: string;
  contributions: RepoContributions[];
}

async function githubFetch(url: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "fhussonnois-contributions-fetcher",
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText} - ${await res.text()}`);
  }
  return res;
}

async function fetchMergedPRs(): Promise<SearchItem[]> {
  const allItems: SearchItem[] = [];
  let page = 1;

  while (true) {
    const excludes = EXCLUDED_OWNERS.map((o) => `-org:${o}`).join("+");
    const query = `type:pr+author:${GITHUB_USER}+is:merged+${excludes}+-user:${GITHUB_USER}`;
    const url = `https://api.github.com/search/issues?q=${query}&sort=created&order=asc&per_page=100&page=${page}`;

    console.log(`Fetching page ${page}...`);
    const res = await githubFetch(url);
    const data: SearchResponse = await res.json();

    allItems.push(...data.items);

    if (allItems.length >= data.total_count || data.items.length < 100) {
      break;
    }
    page++;
  }

  return allItems;
}

async function fetchPRBody(repo: string, prNumber: number): Promise<string> {
  const url = `https://api.github.com/repos/${repo}/pulls/${prNumber}`;
  const res = await githubFetch(url);
  const data: PRDetail = await res.json();
  return data.body ?? "";
}

function extractKip(body: string): { number: number; url: string } | undefined {
  const match = body.match(/KIP[- ](\d+)/i);
  if (!match) return undefined;
  const kipNumber = parseInt(match[1], 10);
  const kipTitle = `KIP-${kipNumber}`;
  return {
    number: kipNumber,
    url: `${KIP_WIKI}/${kipTitle}`,
  };
}

function extractOwner(repositoryUrl: string): string {
  const parts = repositoryUrl.split("/");
  return parts[parts.length - 2];
}

function extractRepo(repositoryUrl: string): string {
  const parts = repositoryUrl.split("/");
  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

async function main() {
  console.log("Fetching merged PRs for", GITHUB_USER);
  if (!GITHUB_TOKEN) {
    console.warn("Warning: GITHUB_TOKEN not set. Rate limits will be strict (10 req/min).");
  }

  const items = await fetchMergedPRs();
  console.log(`Found ${items.length} total merged PRs`);

  // Filter out excluded owners
  const filtered = items.filter((item) => {
    const owner = extractOwner(item.repository_url);
    return !EXCLUDED_OWNERS.includes(owner.toLowerCase());
  });
  console.log(`After filtering: ${filtered.length} PRs`);

  // Group by repo
  const grouped = new Map<string, PR[]>();

  for (const item of filtered) {
    const repo = extractRepo(item.repository_url);
    const pr: PR = {
      number: item.number,
      title: item.title,
      url: item.html_url,
      created_at: item.created_at,
      merged_at: item.pull_request?.merged_at ?? item.created_at,
    };

    // For apache/kafka PRs, fetch the body to extract KIP references
    if (repo === "apache/kafka") {
      const key = `${repo}#${pr.number}`;
      console.log(`  Fetching body for ${key}...`);
      const body = await fetchPRBody(repo, pr.number);
      let kip = extractKip(body);
      if (!kip && KNOWN_KIPS[key]) {
        kip = {
          number: KNOWN_KIPS[key],
          url: `${KIP_WIKI}/KIP-${KNOWN_KIPS[key]}`,
        };
      }
      if (kip) {
        pr.kip = kip;
        console.log(`    Found KIP-${kip.number}`);
      }
    }

    if (!grouped.has(repo)) {
      grouped.set(repo, []);
    }
    grouped.get(repo)!.push(pr);
  }

  // Sort PRs within each repo by merged_at descending (newest first)
  for (const prs of grouped.values()) {
    prs.sort((a, b) => new Date(b.merged_at).getTime() - new Date(a.merged_at).getTime());
  }

  // Build output sorted by repo name
  const contributions: RepoContributions[] = Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([repo, prs]) => ({
      repo,
      repo_url: `https://github.com/${repo}`,
      prs,
    }));

  const output: ContributionsData = {
    generated_at: new Date().toISOString(),
    contributions,
  };

  const outPath = resolve(__dirname, "../data/contributions.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`Written ${contributions.length} projects to ${outPath}`);

  for (const c of contributions) {
    console.log(`  ${c.repo}: ${c.prs.length} PR(s)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
