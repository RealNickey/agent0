import { tool } from "ai";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface ResearchSection {
  title: string;
  content: string;
  source: string;
  url: string;
}

interface AcademicPaper {
  title: string;
  abstract: string;
  authors: string;
  journal: string;
  year: string;
  url: string;
  source: string;
}

interface ResearchSource {
  name: string;
  url: string;
  type: string;
  authors?: string;
  journal?: string;
  year?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Category detection
// ─────────────────────────────────────────────────────────────────────────────
const MEDICAL_KEYWORDS = [
  "disease", "symptoms", "treatment", "diagnosis", "medication", "drug",
  "cancer", "therapy", "clinical", "patient", "health", "medical",
  "surgery", "vaccine", "infection", "syndrome", "disorder", "pathology",
];
const ACADEMIC_KEYWORDS = [
  "paper", "study", "research", "algorithm", "theory", "hypothesis",
  "experiment", "methodology", "analysis", "journal", "citation",
  "literature", "thesis", "dissertation", "peer-reviewed",
];
const TECH_KEYWORDS = [
  "programming", "software", "api", "framework", "database", "machine learning",
  "artificial intelligence", "blockchain", "cloud", "devops", "javascript",
  "python", "neural network", "deep learning", "cybersecurity", "linux",
];

function detectCategory(query: string): "medical" | "academic" | "general" | "technology" {
  const lower = query.toLowerCase();
  const medicalScore = MEDICAL_KEYWORDS.filter((k) => lower.includes(k)).length;
  const academicScore = ACADEMIC_KEYWORDS.filter((k) => lower.includes(k)).length;
  const techScore = TECH_KEYWORDS.filter((k) => lower.includes(k)).length;
  const max = Math.max(medicalScore, academicScore, techScore);
  if (max === 0) return "general";
  if (medicalScore === max) return "medical";
  if (techScore === max) return "technology";
  return "academic";
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Reconstruct an abstract from OpenAlex's inverted index format */
function reconstructAbstract(
  invertedIndex: Record<string, number[]> | null | undefined
): string {
  if (!invertedIndex) return "";
  const words: string[] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words[pos] = word;
    }
  }
  return words.filter(Boolean).join(" ");
}

/** Truncate text to maxChars at the nearest sentence boundary */
function truncateAtSentence(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const sub = text.substring(0, maxChars);
  const lastDot = sub.lastIndexOf(". ");
  return lastDot > maxChars * 0.5 ? sub.substring(0, lastDot + 1) : sub + "...";
}

/**
 * Parse Wikipedia plain-text (explaintext=true) into logical body sections.
 * Sections marked == Heading == are split out; meta-sections are skipped.
 */
function parseWikiSections(
  plainText: string,
  maxSections = 4,
  maxCharsEach = 1800
): Array<{ heading: string; body: string }> {
  const META =
    /^(see also|references|notes|bibliography|external links|further reading|sources|footnotes|citations)$/i;
  const headerRe = /^={2,3}\s*(.+?)\s*={2,3}\s*$/gm;
  const segments: Array<{ heading: string; body: string }> = [];
  let lastHeading = "Overview";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = headerRe.exec(plainText)) !== null) {
    if (segments.length >= maxSections) break;
    const body = plainText.substring(lastIndex, match.index).trim();
    if (body.length > 100 && !META.test(lastHeading)) {
      segments.push({ heading: lastHeading, body: truncateAtSentence(body, maxCharsEach) });
    }
    lastHeading = match[1];
    lastIndex = match.index + match[0].length;
  }

  if (segments.length < maxSections) {
    const tail = plainText.substring(lastIndex).trim();
    if (tail.length > 100 && !META.test(lastHeading)) {
      segments.push({ heading: lastHeading, body: truncateAtSentence(tail, maxCharsEach) });
    }
  }

  return segments.slice(0, maxSections);
}

// ─────────────────────────────────────────────────────────────────────────────
// API fetchers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch full Wikipedia article text (all body sections, not just the intro
 * summary) by using the explaintext extract API.
 */
async function fetchWikipedia(query: string): Promise<{
  sections: ResearchSection[];
  sources: ResearchSource[];
  summary: string;
}> {
  const encoded = encodeURIComponent(query);
  const sections: ResearchSection[] = [];
  const sources: ResearchSource[] = [];
  let summary = "";

  const searchRes = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&srlimit=2&format=json&origin=*`
  );
  if (!searchRes.ok) return { sections, sources, summary };

  const searchData = await searchRes.json();
  const topTitles: string[] = (searchData?.query?.search ?? [])
    .slice(0, 2)
    .map((r: { title: string }) => r.title);
  if (topTitles.length === 0) return { sections, sources, summary };

  // Fetch full plain-text for each article (exintro=false = include all sections)
  const extractResults = await Promise.allSettled(
    topTitles.map((t) =>
      fetch(
        `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=false&explaintext=true&titles=${encodeURIComponent(t)}&format=json&origin=*`
      )
    )
  );

  for (let i = 0; i < extractResults.length; i++) {
    const res = extractResults[i];
    if (res.status !== "fulfilled" || !res.value.ok) continue;
    const data = await res.value.json();
    const pages = data?.query?.pages ?? {};
    const page = Object.values(pages)[0] as Record<string, unknown>;
    if (!page?.extract) continue;

    const rawText = (page.extract as string).replace(/\n{3,}/g, "\n\n");
    const pageTitle = (page.title as string) ?? topTitles[i];
    const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(
      pageTitle.replace(/ /g, "_")
    )}`;

    if (!summary) {
      summary =
        rawText.split("\n\n").find((p) => p.trim().length > 60) ??
        rawText.substring(0, 400);
    }

    const parsed = parseWikiSections(rawText, i === 0 ? 4 : 2, 1800);
    for (const seg of parsed) {
      sections.push({
        title: seg.heading === "Overview" ? pageTitle : `${pageTitle}: ${seg.heading}`,
        content: seg.body,
        source: "Wikipedia",
        url: pageUrl,
      });
    }
    sources.push({ name: pageTitle, url: pageUrl, type: "encyclopedia" });
  }

  return { sections, sources, summary };
}

/**
 * Europe PMC — replaces raw PubMed esummary.
 * Returns full abstracts in JSON (resultType=core).
 */
async function fetchEuropePMC(
  query: string,
  maxResults: number
): Promise<{
  sections: ResearchSection[];
  sources: ResearchSource[];
  papers: AcademicPaper[];
}> {
  const encoded = encodeURIComponent(query);
  const sections: ResearchSection[] = [];
  const sources: ResearchSource[] = [];
  const papers: AcademicPaper[] = [];

  const res = await fetch(
    `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encoded}&format=json&resultType=core&pageSize=${maxResults}`
  );
  if (!res.ok) return { sections, sources, papers };

  const data = await res.json();
  const results: unknown[] = data?.resultList?.result ?? [];

  for (const item of results) {
    const paper = item as Record<string, unknown>;
    const rawAbstract = ((paper.abstractText as string) ?? "")
      .replace(/<[^>]*>/g, "")
      .trim();
    if (rawAbstract.length < 60) continue;

    const title = ((paper.title as string) ?? "Untitled").replace(/<[^>]*>/g, "");
    const authors = (paper.authorString as string) ?? "";
    const journal = (paper.journalTitle as string) ?? "";
    const year = paper.pubYear ? String(paper.pubYear) : "";
    const doi = (paper.doi as string) ?? "";
    const url = doi
      ? `https://doi.org/${doi}`
      : `https://europepmc.org/search?query=${encodeURIComponent(title)}`;

    const abstract = truncateAtSentence(rawAbstract, 900);
    const meta = [authors, journal ? `*${journal}*` : "", year]
      .filter(Boolean)
      .join(" | ");
    const content = `${abstract}\n\n— ${meta}`;

    sections.push({ title, content, source: "Europe PMC", url });
    sources.push({ name: title, url, type: "medical-journal", authors, journal, year });
    papers.push({ title, abstract, authors, journal, year, url, source: "Europe PMC" });
  }

  return { sections, sources, papers };
}

/**
 * OpenAlex — reconstructs abstracts from the inverted index so we can
 * actually read each paper's content instead of just listing its metadata.
 */
async function fetchOpenAlex(
  query: string,
  maxResults: number
): Promise<{
  sections: ResearchSection[];
  sources: ResearchSource[];
  papers: AcademicPaper[];
}> {
  const encoded = encodeURIComponent(query);
  const sections: ResearchSection[] = [];
  const sources: ResearchSource[] = [];
  const papers: AcademicPaper[] = [];

  const res = await fetch(
    `https://api.openalex.org/works?search=${encoded}&per_page=${maxResults}&mailto=agent0@example.com`
  );
  if (!res.ok) return { sections, sources, papers };

  const data = await res.json();
  const works: unknown[] = data?.results ?? [];

  for (const item of works) {
    const work = item as Record<string, unknown>;
    const title = (work.title as string) ?? "Untitled";
    const rawAbstract = reconstructAbstract(
      work.abstract_inverted_index as Record<string, number[]> | null
    );
    if (rawAbstract.length < 60) continue;
    const abstract = truncateAtSentence(rawAbstract, 900);

    const authorships =
      (work.authorships as Array<{ author: { display_name: string } }>) ?? [];
    const authors = authorships
      .slice(0, 5)
      .map((a) => a.author?.display_name)
      .filter(Boolean)
      .join(", ");
    const year = work.publication_year ? String(work.publication_year) : "";
    const venue =
      (
        work.primary_location as Record<
          string,
          Record<string, string>
        > | null
      )?.source?.display_name ?? "";
    const citationCount = (work.cited_by_count as number) ?? 0;
    const rawDoi = (work.doi as string) ?? "";
    const doi = rawDoi.replace("https://doi.org/", "");
    const url = doi ? `https://doi.org/${doi}` : ((work.id as string) ?? "");

    const meta = [
      authors,
      venue ? `*${venue}*` : "",
      year,
      citationCount > 0 ? `${citationCount} citations` : "",
    ]
      .filter(Boolean)
      .join(" | ");
    const content = `${abstract}\n\n— ${meta}`;

    sections.push({ title, content, source: "OpenAlex", url });
    sources.push({ name: title, url, type: "academic-paper", authors, journal: venue, year });
    papers.push({ title, abstract, authors, journal: venue, year, url, source: "OpenAlex" });
  }

  return { sections, sources, papers };
}

async function fetchDuckDuckGo(query: string): Promise<{
  sections: ResearchSection[];
  sources: ResearchSource[];
  ddgAbstract: string;
  ddgUrl: string;
}> {
  const encoded = encodeURIComponent(query);
  const sections: ResearchSection[] = [];
  const sources: ResearchSource[] = [];
  let ddgAbstract = "";
  let ddgUrl = "";

  const res = await fetch(
    `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1`
  );
  if (!res.ok) return { sections, sources, ddgAbstract, ddgUrl };

  const data = await res.json();
  if (((data.AbstractText as string) ?? "").length > 50) {
    ddgAbstract = data.AbstractText as string;
    ddgUrl = (data.AbstractURL as string) ?? `https://duckduckgo.com/?q=${encoded}`;
    sections.push({
      title: (data.Heading as string) ?? "Overview",
      content: ddgAbstract,
      source: "DuckDuckGo",
      url: ddgUrl,
    });
    sources.push({
      name: (data.AbstractSource as string) ?? "Web",
      url: ddgUrl,
      type: "web",
    });
  }

  return { sections, sources, ddgAbstract, ddgUrl };
}

// ─────────────────────────────────────────────────────────────────────────────
// Research survey / journal-style synthesis
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assemble fetched content into a numbered research survey article.
 *
 * Structure:
 *   Abstract → Introduction (Wikipedia §1) → [N more Wiki sections] →
 *   Overview (DuckDuckGo, if new) → Academic Literature Review →
 *   Key Findings → References
 */
function synthesizeBlogMarkdown(
  query: string,
  wikiSections: ResearchSection[],
  ddgAbstract: string,
  ddgUrl: string,
  academicPapers: AcademicPaper[],
  sources: ResearchSource[]
): string {
  const parts: string[] = [];
  let sectionNum = 0;

  // ── Abstract ──────────────────────────────────────────────────────────────
  {
    const wikiOpener = wikiSections[0]?.content.split(/\.\s+/)[0] ?? "";
    const ddgOpener = ddgAbstract ? ddgAbstract.split(/\.\s+/)[0] : "";
    const opener =
      wikiOpener.length > 40
        ? wikiOpener + "."
        : ddgOpener.length > 40
        ? ddgOpener + "."
        : `This survey examines the topic: ${query}.`;
    const paperLabel =
      academicPapers.length > 0
        ? `${academicPapers.length} peer-reviewed ${
            academicPapers.length === 1 ? "publication" : "publications"
          } alongside`
        : "";
    const sourceDesc = paperLabel
      ? `${paperLabel} encyclopedic and web sources`
      : `${sources.length} encyclopedic and web sources`;
    parts.push(
      `## Abstract\n\n${opener} This research survey synthesizes findings from ${sourceDesc}, covering background knowledge, established literature, and key insights on this subject.`
    );
  }

  // ── Wikipedia full-article sections ───────────────────────────────────────
  const wikiMainTitle = wikiSections[0]?.title.split(":")[0].trim() ?? query;
  for (const sec of wikiSections) {
    sectionNum++;
    const rawHeading = sec.title.includes(":")
      ? sec.title.split(":").slice(1).join(":").trim()
      : sec.title;
    const header =
      sectionNum === 1 ? `## 1. Introduction` : `## ${sectionNum}. ${rawHeading}`;
    const paragraphs = sec.content
      .split("\n\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 40);
    if (paragraphs.length > 0) {
      parts.push(
        `${header}\n\n${paragraphs.join("\n\n")}\n\n*Source: [${wikiMainTitle} — Wikipedia](${sec.url})*`
      );
    }
  }

  // ── DuckDuckGo overview (only if content is not already in Wikipedia) ─────
  if (ddgAbstract.length > 80) {
    const covered = wikiSections.some((s) =>
      s.content.includes(ddgAbstract.substring(0, 60))
    );
    if (!covered) {
      sectionNum++;
      parts.push(
        `## ${sectionNum}. Overview\n\n${ddgAbstract}\n\n*Source: [${ddgUrl}](${ddgUrl})*`
      );
    }
  }

  // ── Academic Literature Review ────────────────────────────────────────────
  if (academicPapers.length > 0) {
    sectionNum++;
    const paperBlocks = academicPapers.map((paper) => {
      const authorsShort = paper.authors
        ? paper.authors.split(",").slice(0, 3).join(",") +
          (paper.authors.split(",").length > 3 ? " et al." : "")
        : "";
      const citation = [
        authorsShort,
        paper.journal ? `*${paper.journal}*` : "",
        paper.year,
      ]
        .filter(Boolean)
        .join(" | ");

      return [
        `### ${paper.title}`,
        paper.abstract,
        citation ? `**Citation:** ${citation}` : "",
        `[Read Full Publication →](${paper.url})`,
      ]
        .filter(Boolean)
        .join("\n\n");
    });

    parts.push(
      [
        `## ${sectionNum}. Academic Literature Review`,
        `The following peer-reviewed publications directly address this topic. Each entry is drawn from the paper's own abstract, reporting the study's scope, methodology, and reported findings.`,
        paperBlocks.join("\n\n---\n\n"),
      ].join("\n\n")
    );
  }

  // ── Key Findings ─────────────────────────────────────────────────────────
  {
    const findings: string[] = [];
    for (const sec of wikiSections.slice(0, 4)) {
      const first = sec.content.split(/\.\s+/)[0];
      if (first && first.length > 30)
        findings.push(first.endsWith(".") ? first : first + ".");
    }
    for (const paper of academicPapers.slice(0, 4)) {
      const first = paper.abstract.split(/\.\s+/)[0];
      if (first && first.length > 30)
        findings.push(first.endsWith(".") ? first : first + ".");
    }
    if (findings.length > 0) {
      sectionNum++;
      parts.push(
        `## ${sectionNum}. Key Findings\n\n${findings.map((f) => `- ${f}`).join("\n")}`
      );
    }
  }

  // ── References ────────────────────────────────────────────────────────────
  {
    const typeLabel: Record<string, string> = {
      encyclopedia: "Encyclopedia",
      "medical-journal": "Journal Article",
      "academic-paper": "Academic Paper",
      web: "Web",
    };

    const refLines = sources.map((s, i) => {
      const authorsShort = s.authors
        ? s.authors.split(",").slice(0, 3).join(",") +
          (s.authors.split(",").length > 3 ? " et al." : "")
        : "";
      const meta = [
        authorsShort,
        s.journal ? `*${s.journal}*` : "",
        s.year ?? "",
      ]
        .filter(Boolean)
        .join(", ");
      return `${i + 1}. [${s.name}](${s.url})${meta ? ` — ${meta}` : ""} *(${
        typeLabel[s.type] ?? s.type
      })*`;
    });

    parts.push(`## References\n\n${refLines.join("\n")}`);
  }

  return parts.join("\n\n---\n\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool export
// ─────────────────────────────────────────────────────────────────────────────
export const conductResearch = tool({
  description:
    "Research a topic by reading full content from multiple authoritative sources: Wikipedia full articles (all major body sections via explaintext API), Europe PMC peer-reviewed papers with complete abstracts (JSON), OpenAlex academic publications with reconstructed abstracts (inverted-index rebuild), and DuckDuckGo instant answers. Synthesizes a comprehensive research survey / journal-style article with numbered sections, a full literature review where each paper's abstract is presented in full prose, key findings, and a complete reference list with author/journal/year metadata.",
  inputSchema: z.object({
    query: z.string().describe("The topic or question to research"),
    category: z
      .enum(["medical", "academic", "general", "technology", "auto"])
      .default("auto")
      .describe("Research category — use 'auto' to detect from query keywords"),
    maxSources: z
      .number()
      .default(5)
      .describe("Maximum academic papers to fetch per source API (default 5)"),
  }),
  execute: async ({ query, category = "auto", maxSources = 5 }) => {
    const resolvedCategory =
      category === "auto" ? detectCategory(query) : category;

    try {
      // All four sources fetched in parallel every time
      const [wikiResult, ddgResult, pmcResult, oaResult] =
        await Promise.allSettled([
          fetchWikipedia(query),
          fetchDuckDuckGo(query),
          fetchEuropePMC(query, maxSources),
          fetchOpenAlex(query, maxSources),
        ]);

      const wikiData =
        wikiResult.status === "fulfilled"
          ? wikiResult.value
          : { sections: [], sources: [], summary: "" };
      const ddgData =
        ddgResult.status === "fulfilled"
          ? ddgResult.value
          : { sections: [], sources: [], ddgAbstract: "", ddgUrl: "" };
      const pmcData =
        pmcResult.status === "fulfilled"
          ? pmcResult.value
          : { sections: [], sources: [], papers: [] };
      const oaData =
        oaResult.status === "fulfilled"
          ? oaResult.value
          : { sections: [], sources: [], papers: [] };

      // Merge academic papers, deduplicate by title prefix
      const seenTitles = new Set<string>();
      const allPapers: AcademicPaper[] = [];
      for (const paper of [...pmcData.papers, ...oaData.papers]) {
        const key = paper.title.toLowerCase().substring(0, 60);
        if (!seenTitles.has(key) && paper.abstract.length > 50) {
          seenTitles.add(key);
          allPapers.push(paper);
        }
      }

      const allSections: ResearchSection[] = [
        ...wikiData.sections,
        ...ddgData.sections,
        ...pmcData.sections,
        ...oaData.sections,
      ];

      if (allSections.length === 0) {
        return {
          error: true,
          message: `No results found for "${query}". Try a different search term.`,
        };
      }

      // Deduplicate sources by URL
      const seenUrls = new Set<string>();
      const uniqueSources = [
        ...wikiData.sources,
        ...ddgData.sources,
        ...pmcData.sources,
        ...oaData.sources,
      ].filter((s) => {
        if (!s.url || seenUrls.has(s.url)) return false;
        seenUrls.add(s.url);
        return true;
      });

      // Synthesize research survey article
      const blogContent = synthesizeBlogMarkdown(
        query,
        wikiData.sections,
        ddgData.ddgAbstract,
        ddgData.ddgUrl,
        allPapers.slice(0, maxSources),
        uniqueSources
      );
      const wordCount = blogContent.split(/\s+/).filter(Boolean).length;
      const estimatedReadTime = Math.max(1, Math.round(wordCount / 200));

      const keyFindings = [
        ...wikiData.sections.slice(0, 3).map((s) => {
          const first = s.content.split(/\.\s+/)[0];
          return first && first.length > 30
            ? first.endsWith(".")
              ? first
              : first + "."
            : null;
        }),
        ...allPapers.slice(0, 2).map((p) => {
          const first = p.abstract.split(/\.\s+/)[0];
          return first && first.length > 30
            ? first.endsWith(".")
              ? first
              : first + "."
            : null;
        }),
      ].filter((f): f is string => f !== null);

      return {
        error: false,
        query,
        category: resolvedCategory,
        summary:
          wikiData.summary ||
          allSections[0]?.content.substring(0, 300) ||
          "No summary available.",
        blogContent,
        wordCount,
        estimatedReadTime,
        sections: allSections,
        sources: uniqueSources,
        keyFindings,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: true,
        message: `Research failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
});

export const researchTools = {
  conductResearch,
};
