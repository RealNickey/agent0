
export type SlideType = "title" | "content" | "section-divider" | "two-column" | "image-focus" | "quote";

export interface SlideDefinition {
  id: string;
  type: SlideType;
  title: string;
  subtitle?: string;
  content: string[];
  speakerNotes?: string;
  imageQuery?: string;
  imageUrl?: string;
  quoteText?: string;
  quoteAttribution?: string;
}

export interface SlideOutline {
  title: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
  };
  slides: SlideDefinition[];
}

function safeColor(input: string, fallback: string) {
  const normalized = (input || "").replace("#", "").trim();
  return /^[0-9A-Fa-f]{6}$/.test(normalized) ? normalized : fallback;
}

export async function generatePptxBuffer(outline: SlideOutline): Promise<Buffer> {
  const runtimeRequire = eval("require");
  const PptxGenJS = runtimeRequire("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Agent0";
  pptx.company = "Agent0";
  pptx.subject = outline.title;
  pptx.title = outline.title;

  const primary = safeColor(outline.theme?.primaryColor, "1D4ED8");
  const secondary = safeColor(outline.theme?.secondaryColor, "0F172A");
  const accent = safeColor(outline.theme?.accentColor, "F59E0B");
  const fontFace = outline.theme?.fontFamily || "Aptos";

  for (const slideDef of outline.slides) {
    const slide = pptx.addSlide();

    switch (slideDef.type) {
      case "title":
        slide.background = { color: primary };
        slide.addText(slideDef.title, { x: 0.7, y: 1.8, w: 12, h: 1, color: "FFFFFF", fontFace, fontSize: 38, bold: true });
        if (slideDef.subtitle) {
          slide.addText(slideDef.subtitle, { x: 0.7, y: 3.0, w: 12, h: 1, color: "E2E8F0", fontFace, fontSize: 20 });
        }
        break;

      case "section-divider":
        slide.background = { color: secondary };
        slide.addShape(pptx.ShapeType.rect, { x: 0.7, y: 2.8, w: 2.3, h: 0.1, fill: { color: accent }, line: { color: accent } });
        slide.addText(slideDef.title, { x: 0.7, y: 3.1, w: 12, h: 1, color: "FFFFFF", fontFace, fontSize: 34, bold: true });
        break;

      case "two-column":
        slide.addText(slideDef.title, { x: 0.6, y: 0.4, w: 12, h: 0.8, color: secondary, fontFace, fontSize: 30, bold: true });
        slide.addShape(pptx.ShapeType.line, { x: 6.6, y: 1.5, w: 0, h: 5.4, line: { color: "CBD5E1", pt: 1 } });
        slide.addText((slideDef.content || []).slice(0, Math.ceil(slideDef.content.length / 2)).map((t) => ({ text: `• ${t}`, options: { bullet: { indent: 16 } } })), { x: 0.8, y: 1.6, w: 5.4, h: 4.8, color: "1E293B", fontFace, fontSize: 18 });
        slide.addText((slideDef.content || []).slice(Math.ceil(slideDef.content.length / 2)).map((t) => ({ text: `• ${t}`, options: { bullet: { indent: 16 } } })), { x: 6.9, y: 1.6, w: 5.4, h: 4.8, color: "1E293B", fontFace, fontSize: 18 });
        break;

      case "image-focus":
        slide.addText(slideDef.title, { x: 0.6, y: 0.4, w: 12, h: 0.7, color: secondary, fontFace, fontSize: 28, bold: true });
        if (slideDef.imageUrl) {
          slide.addImage({ path: slideDef.imageUrl, x: 0.8, y: 1.2, w: 11.7, h: 4.8 });
        }
        if (slideDef.subtitle) {
          slide.addText(slideDef.subtitle, { x: 0.8, y: 6.2, w: 11.7, h: 0.5, color: "334155", fontFace, fontSize: 16, italic: true });
        }
        break;

      case "quote":
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 7.5, fill: { color: "F8FAFC" }, line: { color: "F8FAFC" } });
        slide.addText(`“${slideDef.quoteText || slideDef.title}”`, { x: 1.2, y: 2.1, w: 10.8, h: 2.2, color: secondary, fontFace, fontSize: 34, italic: true, align: "center", valign: "mid" });
        if (slideDef.quoteAttribution) {
          slide.addText(`— ${slideDef.quoteAttribution}`, { x: 1.2, y: 4.8, w: 10.8, h: 0.6, color: primary, fontFace, fontSize: 16, align: "center" });
        }
        break;

      case "content":
      default:
        slide.addText(slideDef.title, { x: 0.6, y: 0.4, w: 12, h: 0.7, color: secondary, fontFace, fontSize: 30, bold: true });
        slide.addText((slideDef.content || []).map((t) => ({ text: `• ${t}`, options: { bullet: { indent: 16 } } })), { x: 0.9, y: 1.5, w: slideDef.imageUrl ? 6.2 : 11.4, h: 5.5, color: "1E293B", fontFace, fontSize: 20, breakLine: true });
        if (slideDef.imageUrl) {
          slide.addImage({ path: slideDef.imageUrl, x: 7.3, y: 1.6, w: 5.4, h: 4.2 });
        }
        break;
    }

    if (slideDef.speakerNotes) {
      slide.addNotes(slideDef.speakerNotes);
    }
  }

  const arrayBuffer = await pptx.write({ outputType: "arraybuffer" });
  return Buffer.from(arrayBuffer);
}
