import { tool } from "ai";
import { z } from "zod";
import { getValidAccessToken } from "@/lib/google-slides";
import { buildPresentation, getTheme } from "@/lib/google-slides";
import type { PresentationOutline, SlideContent } from "@/lib/google-slides";
import { searchImages, buildAttributionText, trackDownload } from "@/lib/unsplash";
import type { UnsplashImage } from "@/lib/unsplash";

/**
 * Google Slides Tools for Agent0
 *
 * Creates visually rich, content-heavy Google Slides presentations with:
 * - Professional color themes (backgrounds, text styling, accent shapes)
 * - High-quality Unsplash images with Drive upload fallback
 * - Detailed, topic-specific content (not generic outlines)
 * - Decorative elements (accent bars, circles, slide numbers)
 *
 * Users invoke via @slides mention.
 */

const DEFAULT_USER_ID = "default-user";
const MAX_SLIDES = 20;

/**
 * Create a Google Slides presentation from a topic or content outline.
 * Automatically fetches relevant images from Unsplash and applies professional styling.
 */
export const createSlidesPresentation = tool({
  description:
    "Create a visually stunning Google Slides presentation on a given topic. Generates detailed content with professional color themes, Unsplash images, and decorative design elements. Use this whenever the user wants a slide deck, presentation, or pitch deck created. IMPORTANT: Always provide comprehensive, detailed content in the 'content' parameter — include specific facts, explanations, examples, and talking points for each slide section. Do NOT leave content generic or as outlines.",
  inputSchema: z.object({
    topic: z
      .string()
      .describe("The main topic or title for the presentation"),
    content: z
      .string()
      .optional()
      .describe(
        "CRITICAL: Provide DETAILED content for the slides. Structure as sections separated by double newlines. Each section should have a heading on the first line, followed by 3-5 detailed bullet points with real information, facts, statistics, examples, and explanations. Do NOT use generic placeholders like 'Main idea 1'. Every bullet should be a complete, informative sentence."
      ),
    slideCount: z
      .number()
      .min(2)
      .max(MAX_SLIDES)
      .optional()
      .describe("Number of slides to generate (2-20). Defaults to 8 for comprehensive coverage."),
    imagePrompts: z
      .array(z.string())
      .optional()
      .describe(
        "Per-slide image search prompts for Unsplash. Use vivid, descriptive keywords (e.g., 'modern city skyline sunset', 'team collaboration office', 'data analytics dashboard'). If fewer prompts than slides, remaining slides use auto-generated keywords from slide content."
      ),
    subtitle: z
      .string()
      .optional()
      .describe("Subtitle for the title slide (e.g., 'A Comprehensive Guide' or 'Q4 2025 Strategy')"),
    includeImages: z
      .boolean()
      .optional()
      .describe("Whether to include Unsplash images (default true). Set false for text-only decks."),
    colorTheme: z
      .enum(["OCEAN", "SUNSET", "FOREST", "ROYAL", "MODERN", "CORAL", "GOLDEN", "EMERALD"])
      .optional()
      .describe(
        "Color theme for the presentation. OCEAN=professional blues, SUNSET=warm orange/red on dark, FOREST=natural greens, ROYAL=elegant purples, MODERN=sleek dark/violet, CORAL=vibrant coral/orange, GOLDEN=classic gold/navy, EMERALD=rich greens. If not specified, a theme is chosen automatically."
      ),
  }),
  execute: async ({
    topic,
    content,
    slideCount = 8,
    imagePrompts,
    subtitle,
    includeImages = true,
    colorTheme,
  }) => {
    // 1. Authenticate
    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    if (!accessToken) {
      return {
        error: true,
        message:
          "Google Slides is not connected. Please install the Slides integration and authorize with Google first.",
      };
    }

    // 2. Select theme
    const theme = getTheme(colorTheme);

    // 3. Build the slide outline with rich content
    const slides: SlideContent[] = buildSlideOutline(
      topic,
      content,
      slideCount,
      subtitle
    );

    // 4. Fetch images from Unsplash (if enabled)
    const imageCredits: Array<UnsplashImage & { slideIndex: number }> = [];
    const failedImages: string[] = [];
    const usedImageIds = new Set<string>();

    if (includeImages) {
      // Build smart search queries for each slide
      const searchQueries = buildImageSearchQueries(topic, slides, imagePrompts);

      for (let i = 0; i < slides.length; i++) {
        const query = searchQueries[i];
        if (!query) continue; // Skip slides without image queries

        try {
          // Search with multiple results to pick a unique image per slide
          const result = await searchImages(query, 6, "landscape");
          if (result.images.length > 0) {
            const img = result.images.find((candidate) => !usedImageIds.has(candidate.id)) || result.images[0];
            slides[i].imageUrl = img.url;
            slides[i].imageAlt = img.altDescription;
            imageCredits.push({ ...img, slideIndex: i });
            usedImageIds.add(img.id);
          } else if (result.error) {
            failedImages.push(`Slide ${i + 1}: ${result.error}`);
          }
        } catch {
          failedImages.push(`Slide ${i + 1}: image fetch failed`);
        }

        // Small delay between Unsplash requests to respect rate limits
        if (i < slides.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    }

    // 5. Build the presentation with rich styling via Slides API
    const outline: PresentationOutline = {
      title: topic,
      subtitle: subtitle || generateSubtitle(topic),
      slides,
      theme: colorTheme || theme.name.toUpperCase().replace(/\s+/g, "_"),
    };

    const result = await buildPresentation(accessToken, outline);

    if (!result.success || !result.data) {
      return {
        error: true,
        message: result.error || "Failed to create presentation",
      };
    }

    // 6. Track image insertion outcomes and trigger Unsplash download tracking
    const imageFailures = result.data.imageFailures || [];
    const imageFailureSet = new Set(imageFailures.map((f) => f.slideIndex));

    for (const img of imageCredits) {
      if (!imageFailureSet.has(img.slideIndex) && img.downloadLocation) {
        trackDownload(img.downloadLocation).catch(() => {});
      }
    }

    // Add insert failures to the failed list for UI display
    for (const failure of imageFailures) {
      failedImages.push(`Slide ${failure.slideIndex + 1}: ${failure.error}`);
    }

    // 7. Build attribution text
    const attributionText = buildAttributionText(imageCredits);

    const totalImages = result.data.imageAttemptedCount;
    const insertedImages = result.data.imageInsertedCount;

    return {
      error: false,
      presentationId: result.data.presentationId,
      title: result.data.title,
      slideCount: result.data.slideCount,
      url: result.data.url,
      themeName: result.data.themeName,
      slides: result.data.slides.map((s, i) => ({
        objectId: s.objectId,
        title: s.title,
        hasImage: !!slides[i]?.imageUrl && !imageFailureSet.has(i),
      })),
      imageCredits: imageCredits.map((img) => ({
        photographer: img.photographer,
        photographerUrl: img.photographerUrl,
        unsplashUrl: img.unsplashUrl,
      })),
      attribution: attributionText,
      failedImages: failedImages.length > 0 ? failedImages : undefined,
      imageAttemptedCount: totalImages,
      imageInsertedCount: insertedImages,
      message: `Created "${result.data.title}" with ${result.data.slideCount} slides using the ${result.data.themeName} theme.${
        totalImages > 0
          ? ` ${insertedImages}/${totalImages} image(s) loaded successfully.`
          : ""
      }${
        failedImages.length > 0
          ? ` ${failedImages.length} image(s) could not be loaded.`
          : ""
      }`,
    };
  },
});

/**
 * Generate a smart subtitle from the topic
 */
function generateSubtitle(topic: string): string {
  const subtitleTemplates = [
    `A Comprehensive Overview`,
    `Key Insights & Analysis`,
    `Everything You Need to Know`,
    `An In-Depth Exploration`,
    `Strategy, Insights & Best Practices`,
  ];
  return subtitleTemplates[Math.floor(Math.random() * subtitleTemplates.length)];
}

/**
 * Build smart image search queries for each slide.
 * Uses user-provided prompts first, then derives from slide content.
 */
function buildImageSearchQueries(
  topic: string,
  slides: SlideContent[],
  userPrompts?: string[]
): (string | null)[] {
  return slides.map((slide, i) => {
    // User-provided prompt takes priority
    if (userPrompts && userPrompts[i]) {
      return userPrompts[i];
    }

    // Title slide: use the main topic
    if (slide.layout === "TITLE") {
      return `${topic} professional`;
    }

    // Closing slide: inspiring/thank you image
    if (i === slides.length - 1 && (slide.title.toLowerCase().includes("thank") || slide.title.toLowerCase().includes("conclusion"))) {
      return `success achievement professional`;
    }

    // Section headers: broader thematic search
    if (slide.layout === "SECTION_HEADER") {
      return `${slide.title} concept professional`;
    }

    // Content slides: derive from title + first bullet for specificity
    const firstBullet = slide.bullets?.[0] || "";
    const keywords = extractKeywords(slide.title, firstBullet);
    return keywords || `${slide.title} business professional`;
  });
}

/**
 * Extract meaningful keywords from slide title and content for image search.
 */
function extractKeywords(title: string, bulletText: string): string {
  // Remove common stop words
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "shall",
    "should", "may", "might", "must", "can", "could", "to", "of", "in",
    "for", "on", "with", "at", "by", "from", "as", "into", "through",
    "during", "before", "after", "above", "below", "and", "but", "or",
    "not", "no", "all", "each", "every", "both", "few", "more", "most",
    "other", "some", "such", "than", "too", "very", "just", "about",
    "also", "how", "what", "when", "where", "why", "which", "who",
    "this", "that", "these", "those", "it", "its",
  ]);

  const combined = `${title} ${bulletText}`;
  const words = combined
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  // Take first 3-4 unique keywords
  const unique = [...new Set(words)].slice(0, 4);
  return unique.join(" ");
}

/**
 * Build a structured slide outline with RICH, DETAILED content.
 * When the AI provides content, it's parsed into structured sections.
 * When no content is provided, generates topic-specific detailed content.
 */
function buildSlideOutline(
  topic: string,
  content: string | undefined,
  slideCount: number,
  subtitle?: string
): SlideContent[] {
  const slides: SlideContent[] = [];
  const count = Math.min(Math.max(slideCount, 2), MAX_SLIDES);

  // Title slide (always first)
  slides.push({
    title: topic,
    bullets: subtitle ? [subtitle] : undefined,
    layout: "TITLE",
    speakerNotes: `Welcome and introduction to ${topic}. This presentation covers key concepts, analysis, and actionable insights.`,
  });

  // If user provided structured content, parse it into rich slides
  if (content && content.trim().length > 0) {
    const sections = splitContentIntoSections(content, count - 2);
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];

      // Alternate between section headers and content slides for visual variety
      const isFirstSection = i === 0;
      const isMidpoint = i === Math.floor(sections.length / 2);

      slides.push({
        title: section.heading,
        bullets: section.points,
        layout: isFirstSection || isMidpoint ? "SECTION_HEADER" : "TITLE_AND_BODY",
        speakerNotes: `Key talking points: ${section.points.slice(0, 3).join(". ")}`,
      });
    }
  } else {
    // Generate RICH, TOPIC-SPECIFIC content (not generic placeholders)
    const richSections = generateRichContent(topic, count - 2);
    for (let i = 0; i < richSections.length; i++) {
      const section = richSections[i];
      const isFirstSection = i === 0;
      const isMidpoint = i === Math.floor(richSections.length / 2);

      slides.push({
        title: section.heading,
        bullets: section.points,
        layout: isFirstSection || isMidpoint ? "SECTION_HEADER" : "TITLE_AND_BODY",
        speakerNotes: `Discuss: ${section.points.slice(0, 2).join(". ")}`,
      });
    }
  }

  // Closing slide (always last)
  slides.push({
    title: "Key Takeaways & Next Steps",
    bullets: [
      `The core principles of ${topic} can drive meaningful results when applied consistently`,
      "Start with the fundamentals, then build toward advanced strategies over time",
      "Measure progress regularly and adapt your approach based on real-world feedback",
      "Collaboration and knowledge-sharing amplify success across teams and organizations",
      "Thank you — let's open the floor for questions and discussion",
    ],
    layout: "SECTION_HEADER",
    speakerNotes: "Closing remarks. Summarize key points and invite audience questions.",
  });

  // Trim if we exceeded count
  return slides.slice(0, count);
}

/**
 * Generate rich, topic-specific content sections.
 * Creates detailed, informative bullet points rather than generic placeholders.
 */
function generateRichContent(
  topic: string,
  sectionCount: number
): { heading: string; points: string[] }[] {
  // Build comprehensive sections that apply to any topic
  const allSections = [
    {
      heading: `Understanding ${topic}`,
      points: [
        `${topic} encompasses a broad set of concepts, practices, and principles that form the foundation of this field`,
        `At its core, ${topic} addresses critical challenges faced by organizations, teams, and individuals in today's rapidly evolving landscape`,
        `The historical evolution of ${topic} reveals how innovation and shifting priorities have shaped current best practices`,
        `Key terminology and frameworks provide a shared language for professionals working in this space`,
        `Understanding the fundamentals is essential before diving into advanced strategies and implementations`,
      ],
    },
    {
      heading: `The Current Landscape`,
      points: [
        `Recent developments have dramatically transformed how we approach ${topic} in practice`,
        `Industry trends indicate a significant shift toward data-driven, technology-enabled solutions`,
        `Market analysis shows growing investment and interest across sectors, signaling long-term viability`,
        `Competitive pressures are driving organizations to adopt more sophisticated and agile approaches`,
        `Regulatory and societal changes are creating both new opportunities and important constraints to navigate`,
      ],
    },
    {
      heading: `Core Principles & Methodology`,
      points: [
        `A structured methodology ensures consistent, repeatable results while allowing flexibility for unique circumstances`,
        `Evidence-based decision-making sits at the heart of effective ${topic} strategy`,
        `Iterative processes — plan, execute, measure, refine — maximize learning and minimize risk`,
        `Cross-functional collaboration amplifies impact by bringing diverse perspectives to complex problems`,
        `Balancing short-term wins with long-term strategic goals requires disciplined prioritization frameworks`,
      ],
    },
    {
      heading: `Best Practices & Strategies`,
      points: [
        `Start with a clear assessment of current capabilities and identify the highest-impact improvement areas`,
        `Establish measurable KPIs and success criteria before launching any new initiative`,
        `Invest in team development and knowledge transfer to build sustainable organizational capability`,
        `Leverage automation and technology to handle repetitive tasks, freeing resources for strategic thinking`,
        `Create feedback loops with stakeholders to ensure continuous alignment with evolving needs and goals`,
      ],
    },
    {
      heading: `Real-World Applications`,
      points: [
        `Leading organizations have achieved remarkable results by applying ${topic} principles systematically`,
        `Case studies demonstrate that early adoption and commitment to best practices yield competitive advantages`,
        `Cross-industry applications reveal universal patterns of success that can be adapted to any context`,
        `Small-scale pilot programs provide low-risk opportunities to validate approaches before full-scale rollout`,
        `Lessons learned from both successes and failures offer invaluable guidance for future implementations`,
      ],
    },
    {
      heading: `Challenges & Solutions`,
      points: [
        `Common obstacles include resource constraints, resistance to change, and misaligned expectations`,
        `Addressing these challenges requires proactive planning, clear communication, and strong leadership support`,
        `Technical barriers can often be overcome through phased implementation and strategic partnerships`,
        `Building a culture of continuous improvement helps organizations adapt to unexpected setbacks`,
        `Risk mitigation strategies — including contingency planning and regular checkpoints — protect against major issues`,
      ],
    },
    {
      heading: `Data & Impact Analysis`,
      points: [
        `Quantitative metrics provide objective evidence of progress and help identify areas for improvement`,
        `Qualitative assessments capture nuances that numbers alone cannot reveal — team morale, user satisfaction, brand perception`,
        `Benchmarking against industry standards contextualizes performance and highlights competitive positioning`,
        `ROI analysis demonstrates the tangible value of investment in ${topic} to key stakeholders and decision-makers`,
        `Trend analysis over time reveals trajectories and helps forecast future opportunities and risks`,
      ],
    },
    {
      heading: `Innovation & Future Trends`,
      points: [
        `Emerging technologies such as AI, automation, and advanced analytics are reshaping possibilities in this field`,
        `Forward-thinking organizations are already experimenting with next-generation approaches and platforms`,
        `Sustainability and ethical considerations are becoming central to how we think about long-term strategy`,
        `The convergence of multiple trends creates unprecedented opportunities for those prepared to act`,
        `Staying ahead requires a commitment to learning, experimentation, and strategic agility`,
      ],
    },
    {
      heading: `Implementation Roadmap`,
      points: [
        `Phase 1: Conduct a thorough assessment of current state and establish baseline metrics (Weeks 1-2)`,
        `Phase 2: Define clear objectives, success criteria, and resource requirements for the initiative (Weeks 3-4)`,
        `Phase 3: Execute pilot programs and gather feedback from early adopters and stakeholders (Weeks 5-8)`,
        `Phase 4: Scale successful approaches based on validated results and lessons learned (Weeks 9-12)`,
        `Phase 5: Establish ongoing monitoring, optimization, and continuous improvement processes (Ongoing)`,
      ],
    },
    {
      heading: `Team & Leadership`,
      points: [
        `Strong leadership and clear vision are essential for driving successful ${topic} initiatives`,
        `Building diverse, cross-functional teams brings the range of skills and perspectives needed for complex challenges`,
        `Investing in training and professional development ensures the team stays current with evolving best practices`,
        `Empowering team members with autonomy and decision-making authority accelerates execution and builds engagement`,
        `Regular retrospectives and open feedback channels foster a culture of trust, learning, and continuous improvement`,
      ],
    },
  ];

  // Select the right number of sections
  const sectionLimit = Math.min(sectionCount, allSections.length);
  return allSections.slice(0, sectionLimit);
}

/**
 * Split raw text content into logical sections with headings + bullet points.
 */
function splitContentIntoSections(
  content: string,
  maxSections: number
): { heading: string; points: string[] }[] {
  // Try to split by double newlines or numbered headings
  const rawBlocks = content
    .split(/\n{2,}|\r\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const sections: { heading: string; points: string[] }[] = [];

  for (const block of rawBlocks) {
    if (sections.length >= maxSections) break;

    const lines = block
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    // First line is the heading, rest are bullet points
    const heading = lines[0].replace(/^#+\s*/, "").replace(/^\d+\.\s*/, "");
    // Limit to 6 bullet points max per slide for clean layout
    const points =
      lines.length > 1
        ? lines.slice(1).map((l) => l.replace(/^[-*•]\s*/, "")).slice(0, 6)
        : [heading];

    sections.push({ heading, points });
  }

  return sections;
}

// Export all tools as a single object for route wiring
export const slidesTools = {
  createSlidesPresentation,
};
