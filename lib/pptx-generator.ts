import PptxGenJS from "pptxgenjs";
import type { SlideDefinition, SlideOutline, SlideTheme } from "@/types/slides";

const DEFAULT_THEME: SlideTheme = {
  primaryColor: "#2563eb",
  secondaryColor: "#111827",
  accentColor: "#0ea5e9",
  fontFamily: "Aptos",
};

const SLIDE_WIDTH = 13.333;
const SLIDE_HEIGHT = 7.5;

const normalizeColor = (color?: string, fallback?: string) =>
  (color || fallback || "#000000").replace("#", "").toUpperCase();

const getTheme = (theme?: SlideTheme): SlideTheme => ({
  primaryColor: theme?.primaryColor || DEFAULT_THEME.primaryColor,
  secondaryColor: theme?.secondaryColor || DEFAULT_THEME.secondaryColor,
  accentColor: theme?.accentColor || DEFAULT_THEME.accentColor,
  fontFamily: theme?.fontFamily || DEFAULT_THEME.fontFamily,
});

const addSlideTitle = (slide: PptxGenJS.Slide, title: string, color: string, fontFace: string) => {
  slide.addText(title, {
    x: 0.6,
    y: 0.4,
    w: SLIDE_WIDTH - 1.2,
    h: 0.6,
    fontFace,
    fontSize: 32,
    color,
    bold: true,
  });
};

const addBullets = (slide: PptxGenJS.Slide, bullets: string[], color: string, fontFace: string) => {
  if (!bullets.length) return;
  slide.addText(bullets.join("\n"), {
    x: 0.9,
    y: 1.4,
    w: SLIDE_WIDTH - 1.8,
    h: 4.8,
    fontFace,
    fontSize: 20,
    color,
    bullet: true,
    paraSpaceAfter: 6,
  });
};

const addSpeakerNotes = (slide: PptxGenJS.Slide, notes?: string) => {
  if (notes) {
    slide.addNotes(notes);
  }
};

const addImage = (slide: PptxGenJS.Slide, imageUrl?: string) => {
  if (!imageUrl) return;
  slide.addImage({
    path: imageUrl,
    x: 0.6,
    y: 1.5,
    w: SLIDE_WIDTH - 1.2,
    h: 5.4,
  });
};

const addSubtitle = (slide: PptxGenJS.Slide, subtitle: string | undefined, color: string, fontFace: string) => {
  if (!subtitle) return;
  slide.addText(subtitle, {
    x: 0.9,
    y: 1.2,
    w: SLIDE_WIDTH - 1.8,
    h: 0.5,
    fontFace,
    fontSize: 20,
    color,
  });
};

const renderSlide = (pptx: PptxGenJS, slideData: SlideDefinition, theme: SlideTheme) => {
  const slide = pptx.addSlide();
  const primary = normalizeColor(theme.primaryColor);
  const secondary = normalizeColor(theme.secondaryColor);
  const accent = normalizeColor(theme.accentColor);

  switch (slideData.type) {
    case "title":
      slide.addText(slideData.title || "Untitled", {
        x: 0.9,
        y: 2.0,
        w: SLIDE_WIDTH - 1.8,
        h: 1.2,
        fontFace: theme.fontFamily,
        fontSize: 44,
        color: primary,
        bold: true,
        align: "center",
      });
      if (slideData.subtitle) {
        slide.addText(slideData.subtitle, {
          x: 1.2,
          y: 3.4,
          w: SLIDE_WIDTH - 2.4,
          h: 0.6,
          fontFace: theme.fontFamily,
          fontSize: 24,
          color: secondary,
          align: "center",
        });
      }
      break;
    case "section-divider":
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: SLIDE_WIDTH,
        h: SLIDE_HEIGHT,
        fill: { color: accent },
        line: { color: accent },
      });
      slide.addText(slideData.title || "Section", {
        x: 0.9,
        y: 3.0,
        w: SLIDE_WIDTH - 1.8,
        h: 1.0,
        fontFace: theme.fontFamily,
        fontSize: 40,
        color: "FFFFFF",
        bold: true,
        align: "center",
      });
      if (slideData.subtitle) {
        slide.addText(slideData.subtitle, {
          x: 1.2,
          y: 4.1,
          w: SLIDE_WIDTH - 2.4,
          h: 0.5,
          fontFace: theme.fontFamily,
          fontSize: 20,
          color: "FFFFFF",
          align: "center",
        });
      }
      break;
    case "two-column": {
      addSlideTitle(slide, slideData.title || "", primary, theme.fontFamily);
      const midpoint = Math.ceil(slideData.content.length / 2);
      const left = slideData.content.slice(0, midpoint);
      const right = slideData.content.slice(midpoint);

      slide.addText(left.join("\n"), {
        x: 0.8,
        y: 1.4,
        w: 5.8,
        h: 4.8,
        fontFace: theme.fontFamily,
        fontSize: 18,
        color: secondary,
        bullet: true,
        paraSpaceAfter: 6,
      });
      slide.addText(right.join("\n"), {
        x: 6.7,
        y: 1.4,
        w: 5.8,
        h: 4.8,
        fontFace: theme.fontFamily,
        fontSize: 18,
        color: secondary,
        bullet: true,
        paraSpaceAfter: 6,
      });
      break;
    }
    case "image-focus":
      addSlideTitle(slide, slideData.title || "", primary, theme.fontFamily);
      addImage(slide, slideData.imageUrl);
      if (!slideData.imageUrl) {
        slide.addText("(Image pending)", {
          x: 1.2,
          y: 3.5,
          w: SLIDE_WIDTH - 2.4,
          h: 0.6,
          fontFace: theme.fontFamily,
          fontSize: 18,
          color: secondary,
          align: "center",
        });
      }
      break;
    case "quote":
      addSlideTitle(slide, slideData.title || "", primary, theme.fontFamily);
      slide.addText(slideData.quoteText || slideData.content.join(" ") || "", {
        x: 1.0,
        y: 2.2,
        w: SLIDE_WIDTH - 2.0,
        h: 2.5,
        fontFace: theme.fontFamily,
        fontSize: 28,
        color: secondary,
        italic: true,
        align: "center",
        valign: "middle",
      });
      if (slideData.quoteAttribution) {
        slide.addText(`— ${slideData.quoteAttribution}`, {
          x: 1.0,
          y: 4.8,
          w: SLIDE_WIDTH - 2.0,
          h: 0.5,
          fontFace: theme.fontFamily,
          fontSize: 18,
          color: secondary,
          align: "center",
        });
      }
      break;
    case "content":
    default:
      addSlideTitle(slide, slideData.title || "", primary, theme.fontFamily);
      addSubtitle(slide, slideData.subtitle, secondary, theme.fontFamily);
      addBullets(slide, slideData.content, secondary, theme.fontFamily);
      if (slideData.imageUrl) {
        slide.addImage({
          path: slideData.imageUrl,
          x: 7.2,
          y: 1.6,
          w: 5.4,
          h: 4.0,
        });
      }
      break;
  }

  addSpeakerNotes(slide, slideData.speakerNotes);
};

export async function generatePresentationPptx(outline: SlideOutline): Promise<Buffer> {
  const theme = getTheme(outline.theme);
  const pptx = new PptxGenJS();

  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Agent0";
  pptx.title = outline.title || "Presentation";
  pptx.theme = {
    headFontFace: theme.fontFamily,
    bodyFontFace: theme.fontFamily,
  };

  outline.slides.forEach((slide) => renderSlide(pptx, slide, theme));

  const output = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
}
