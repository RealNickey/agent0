"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Search,
  Copy,
  Check,
  FileDown,
  ExternalLink,
  BookOpen,
  Beaker,
  Cpu,
  Globe,
  Clock,
  BookMarked,
} from "lucide-react";
import { motion } from "motion/react";
import { Streamdown } from "streamdown";

interface ResearchSection {
  title: string;
  content: string;
  source: string;
  url: string;
}

interface ResearchSource {
  name: string;
  url: string;
  type: string;
}

interface ResearchReportProps {
  error?: boolean;
  message?: string;
  query?: string;
  category?: string;
  summary?: string;
  blogContent?: string;
  wordCount?: number;
  estimatedReadTime?: number;
  sections?: ResearchSection[];
  sources?: ResearchSource[];
  keyFindings?: string[];
  timestamp?: string;
}

const categoryConfig: Record<string, { label: string; icon: React.ReactNode; badge: string }> = {
  medical: {
    label: "Medical",
    icon: <Beaker className="h-3.5 w-3.5" />,
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  },
  academic: {
    label: "Academic",
    icon: <BookOpen className="h-3.5 w-3.5" />,
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  },
  technology: {
    label: "Technology",
    icon: <Cpu className="h-3.5 w-3.5" />,
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  },
  general: {
    label: "General",
    icon: <Globe className="h-3.5 w-3.5" />,
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
};

// Build the full markdown for copy â€” uses blogContent if available, otherwise falls back to structured data
function buildCopyText(props: ResearchReportProps): string {
  if (props.blogContent) {
    const header = [
      `# ${props.query}`,
      "",
      `**Category:** ${props.category || "general"}  |  **Sources:** ${props.sources?.length ?? 0}  |  **Reading time:** ~${props.estimatedReadTime ?? 1} min  |  **Date:** ${props.timestamp ? new Date(props.timestamp).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "N/A"}`,
      "",
      "---",
      "",
    ].join("\n");
    return header + props.blogContent;
  }
  // Legacy fallback
  const lines = [
    `# Research Report: ${props.query}`,
    `Category: ${props.category || "general"} | Date: ${props.timestamp ? new Date(props.timestamp).toLocaleDateString() : "N/A"}`,
    "",
  ];
  if (props.summary) {
    lines.push("## Summary", props.summary, "");
  }
  if (props.keyFindings?.length) {
    lines.push("## Key Findings", ...props.keyFindings.map((f) => `- ${f}`), "");
  }
  if (props.sections?.length) {
    lines.push("## Sections");
    for (const s of props.sections) {
      lines.push(`### ${s.title}`, s.content, s.url ? `*Source: ${s.url}*` : "", "");
    }
  }
  if (props.sources?.length) {
    lines.push("## References", ...props.sources.map((s, i) => `${i + 1}. [${s.name}](${s.url})`));
  }
  return lines.join("\n");
}

async function downloadAsDocx(props: ResearchReportProps) {
  const {
    Document,
    Paragraph,
    TextRun,
    HeadingLevel,
    Packer,
    ExternalHyperlink,
    BorderStyle,
  } = await import("docx");
  const { saveAs } = await import("file-saver");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = [];

  // Cover: Title
  children.push(
    new Paragraph({
      text: props.query || "Research Report",
      heading: HeadingLevel.TITLE,
      spacing: { after: 160 },
    })
  );

  // Cover: Meta line
  const metaParts = [
    `Category: ${props.category || "general"}`,
    `Sources: ${props.sources?.length ?? 0}`,
    `Reading time: ~${props.estimatedReadTime ?? 1} min`,
    `Date: ${props.timestamp ? new Date(props.timestamp).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "N/A"}`,
  ];
  children.push(
    new Paragraph({
      children: [new TextRun({ text: metaParts.join("  |  "), italics: true, size: 20, color: "666666" })],
      spacing: { after: 400 },
    })
  );

  // Introduction / Summary
  const wikiSections = (props.sections || []).filter((s) => s.source === "Wikipedia");
  if (wikiSections[0]) {
    children.push(
      new Paragraph({ text: "Introduction", heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } })
    );
    // Split Wikipedia extract into natural paragraphs
    const introParagraphs = wikiSections[0].content.split(/\n\n+/).filter(Boolean);
    for (const para of introParagraphs) {
      children.push(new Paragraph({ text: para, spacing: { after: 160 } }));
    }
    if (wikiSections[0].url) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Source: ", italics: true, size: 18 }),
            new ExternalHyperlink({
              children: [new TextRun({ text: wikiSections[0].title + " â€” Wikipedia", style: "Hyperlink", size: 18 })],
              link: wikiSections[0].url,
            }),
          ],
          spacing: { after: 240 },
        })
      );
    }
  }

  // Body sections (secondary Wikipedia articles)
  for (const section of wikiSections.slice(1)) {
    if (section.content && section.content.length > 80) {
      children.push(
        new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } })
      );
      const bodyParagraphs = section.content.split(/\n\n+/).filter(Boolean);
      for (const para of bodyParagraphs) {
        children.push(new Paragraph({ text: para, spacing: { after: 160 } }));
      }
      if (section.url) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Source: ", italics: true, size: 18 }),
              new ExternalHyperlink({
                children: [new TextRun({ text: "Wikipedia", style: "Hyperlink", size: 18 })],
                link: section.url,
              }),
            ],
            spacing: { after: 240 },
          })
        );
      }
    }
  }

  // Academic Literature
  const academicSections = (props.sections || []).filter(
    (s) => s.source === "PubMed" || s.source === "OpenAlex"
  );
  if (academicSections.length > 0) {
    children.push(
      new Paragraph({
        text: "Academic & Peer-Reviewed Literature",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
      })
    );
    children.push(
      new Paragraph({
        text: "The following peer-reviewed works relate directly to this topic:",
        spacing: { after: 160 },
      })
    );
    for (const section of academicSections) {
      children.push(
        new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_2, spacing: { before: 160, after: 80 } })
      );
      const metaLines = section.content.split("\n").filter(Boolean);
      for (const meta of metaLines) {
        children.push(new Paragraph({ children: [new TextRun({ text: meta })], spacing: { after: 60 } }));
      }
      if (section.url) {
        children.push(
          new Paragraph({
            children: [
              new ExternalHyperlink({
                children: [new TextRun({ text: "View Publication â†’", style: "Hyperlink" })],
                link: section.url,
              }),
            ],
            spacing: { after: 180 },
          })
        );
      }
    }
  }

  // Key Takeaways
  if (props.keyFindings?.length) {
    children.push(
      new Paragraph({ text: "Key Takeaways", heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } })
    );
    for (const finding of props.keyFindings) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `â€¢  ${finding}` })],
          spacing: { after: 80 },
        })
      );
    }
  }

  // References
  if (props.sources?.length) {
    children.push(
      new Paragraph({ text: "References", heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } })
    );
    for (let i = 0; i < props.sources.length; i++) {
      const s = props.sources[i];
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}. ` }),
            new ExternalHyperlink({
              children: [new TextRun({ text: s.name, style: "Hyperlink" })],
              link: s.url,
            }),
            new TextRun({ text: ` â€” ${s.type}`, italics: true }),
          ],
          spacing: { after: 80 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [{ children }],
    creator: "Agent0 Research Tool",
    title: props.query || "Research Report",
    description: `Research article on: ${props.query}`,
  });

  const blob = await Packer.toBlob(doc);
  const filename = `research-${(props.query || "report").replace(/[^a-zA-Z0-9]+/g, "-").substring(0, 50)}.docx`;
  saveAs(blob, filename);
}

export function ResearchReport(props: ResearchReportProps) {
  const { error, message, query, category, blogContent, sources, timestamp, wordCount, estimatedReadTime } = props;
  const [copied, setCopied] = useState(false);

  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 my-2">
        <div className="flex items-center gap-2 mb-1">
          <Search className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Research failed</span>
        </div>
        <p className="text-amber-600 dark:text-amber-400 text-sm">{message || "Could not complete research"}</p>
      </div>
    );
  }

  const catConfig = categoryConfig[category || "general"] || categoryConfig.general;
  const displayDate = timestamp
    ? new Date(timestamp).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildCopyText(props));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border overflow-hidden my-3 shadow-sm hover:shadow-md transition-shadow",
        "dark:border-slate-700",
        "flex flex-col max-h-[680px]"
      )}
    >
      {/* Blog header — always visible */}
      <div className={cn(
        "shrink-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50",
        "dark:from-slate-800 dark:via-slate-800 dark:to-slate-900",
        "px-6 py-5 border-b border-emerald-100 dark:border-slate-700"
      )}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full",
                catConfig.badge
              )}>
                {catConfig.icon}
                {catConfig.label} Research
              </div>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
              {query}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500 dark:text-slate-400">
              {sources && sources.length > 0 && (
                <span className="flex items-center gap-1">
                  <BookMarked className="h-3.5 w-3.5" />
                  {sources.length} source{sources.length !== 1 ? "s" : ""}
                </span>
              )}
              {estimatedReadTime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  ~{estimatedReadTime} min read
                </span>
              )}
              {wordCount && (
                <span>{wordCount.toLocaleString()} words</span>
              )}
              {displayDate && <span>{displayDate}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Article body — scrollable region */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 bg-white dark:bg-slate-900 custom-scrollbar">
        <Streamdown
          className={cn(
            "prose prose-slate dark:prose-invert max-w-none",
            "prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-slate-100",
            "prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3",
            "prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2",
            "prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:text-sm",
            "prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline",
            "prose-strong:text-slate-800 dark:prose-strong:text-slate-200",
            "prose-em:text-slate-500 dark:prose-em:text-slate-400",
            "prose-li:text-sm prose-li:text-slate-700 dark:prose-li:text-slate-300",
            "prose-hr:border-slate-200 dark:prose-hr:border-slate-700",
            "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
          )}
        >
          {blogContent}
        </Streamdown>
      </div>

      {/* Sources — always visible, pinned above action bar */}
      {sources && sources.length > 0 && (
        <div className="shrink-0 px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Sources
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sources.map((source, i) => (
              <a
                key={i}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md",
                  "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200",
                  "dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:border-slate-700",
                  "transition-colors"
                )}
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="max-w-[160px] truncate">{source.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Action bar — always visible, pinned at bottom */}
      <div className={cn(
        "shrink-0 flex items-center gap-2 px-6 py-3",
        "bg-slate-50 dark:bg-slate-800/50",
        "border-t border-slate-200 dark:border-slate-700"
      )}>
        <button
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors",
            copied
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:border-slate-700"
          )}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied!" : "Copy Markdown"}
        </button>
        <button
          onClick={() => downloadAsDocx(props)}
          className={cn(
            "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors",
            "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200",
            "dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:border-slate-700"
          )}
        >
          <FileDown className="h-3.5 w-3.5" />
          Download DOCX
        </button>
      </div>
    </motion.div>
  );
}

export function ResearchLoading({ query }: { query?: string }) {
  return (
    <div className={cn(
      "rounded-xl border overflow-hidden my-3",
      "dark:border-slate-700"
    )}>
      {/* Header skeleton */}
      <div className={cn(
        "bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50",
        "dark:from-slate-800 dark:via-slate-800 dark:to-slate-900",
        "px-6 py-5 border-b border-emerald-100 dark:border-slate-700 animate-pulse"
      )}>
        <div className="flex items-center gap-2 mb-3">
          <Search className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {query ? `Researching "${query}"...` : "Researching..."}
          </span>
        </div>
        <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-full mb-3" />
        <div className="h-6 w-2/3 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
        <div className="flex gap-3 mt-2">
          <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-3 w-14 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
      {/* Body skeleton */}
      <div className="px-6 py-5 bg-white dark:bg-slate-900 space-y-4 animate-pulse">
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="h-4 w-5/6 bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
        <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded mt-4" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="h-4 w-4/5 bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
        <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded mt-4" />
        <div className="space-y-2">
          <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
      </div>
    </div>
  );
}
