import PptxGenJS from "pptxgenjs";
import { SlideOutline, SlideDefinition } from "@/types/slides";

export async function generatePresentation(outline: SlideOutline): Promise<Buffer> {
  const pres = new PptxGenJS();

  // Set presentation properties
  pres.title = outline.title;
  pres.company = "AI Agent Presentation";

  // Define theme colors
  const primaryColor = outline.theme.primaryColor || "000000";
  const secondaryColor = outline.theme.secondaryColor || "666666";
  const accentColor = outline.theme.accentColor || "0078D7";
  const fontFamily = outline.theme.fontFamily || "Arial";

  // Helper to add common elements
  const addSlideHeader = (slide: PptxGenJS.Slide, title: string) => {
    slide.addText(title, {
      x: 0.5,
      y: 0.5,
      w: "90%",
      h: 1,
      fontSize: 32,
      fontFace: fontFamily,
      color: primaryColor,
      bold: true,
      align: "left",
    });
  };

  for (const slideDef of outline.slides) {
    const slide = pres.addSlide();

    // Add speaker notes
    if (slideDef.speakerNotes) {
      slide.addNotes(slideDef.speakerNotes);
    }

    switch (slideDef.type) {
      case "title":
        slide.addText(slideDef.title, {
          x: 0.5,
          y: "35%",
          w: "90%",
          h: 1.5,
          fontSize: 48,
          fontFace: fontFamily,
          color: primaryColor,
          bold: true,
          align: "center",
        });
        if (slideDef.subtitle) {
          slide.addText(slideDef.subtitle, {
            x: 1,
            y: "55%",
            w: "80%",
            h: 1,
            fontSize: 24,
            fontFace: fontFamily,
            color: secondaryColor,
            align: "center",
          });
        }
        // Background image if available
        if (slideDef.imageUrl) {
          slide.background = { path: slideDef.imageUrl };
          // Add semi-transparent overlay to make text readable?
          // PptxGenJS doesn't support overlay easily on background,
          // so maybe add image as object sent to back.
          // For now, let's assume title slides might not have image or image is handled by user choice.
          // If image is present, we might want to put it on side or as background.
          // Let's use background for title slide if provided.
        }
        break;

      case "section-divider":
        slide.background = { color: primaryColor };
        slide.addText(slideDef.title, {
          x: 0.5,
          y: "40%",
          w: "90%",
          h: 1.5,
          fontSize: 40,
          fontFace: fontFamily,
          color: "FFFFFF",
          bold: true,
          align: "center",
        });
        break;

      case "two-column":
        addSlideHeader(slide, slideDef.title);
        // Left column (text)
        if (slideDef.content && slideDef.content.length > 0) {
          slide.addText(slideDef.content.map(c => ({ text: c, options: { breakLine: true } })), {
            x: 0.5,
            y: 1.8,
            w: "45%",
            h: "70%",
            fontSize: 18,
            fontFace: fontFamily,
            color: secondaryColor,
            bullet: true,
            valign: "top",
          });
        }
        // Right column (image or more text)
        if (slideDef.imageUrl) {
          slide.addImage({
            path: slideDef.imageUrl,
            x: "52%",
            y: 1.8,
            w: "43%",
            h: 4.5,
            sizing: { type: "contain", w: "43%", h: 4.5 }
          });
        } else {
           // If no image, maybe second half of bullets?
           // For now, leave empty or assume content splits?
           // Let's just put image placeholder text
           slide.addText("Image Placeholder", {
             x: "52%", y: 1.8, w: "43%", h: 4.5,
             fontSize: 14, color: "CCCCCC", align: "center", valign: "middle",
             shape: pres.ShapeType.rect, line: { color: "CCCCCC", width: 1 }
           });
        }
        break;

      case "image-focus":
        // Title smaller at top or overlay
        slide.addText(slideDef.title, {
          x: 0.5,
          y: 0.2,
          w: "90%",
          h: 0.8,
          fontSize: 28,
          fontFace: fontFamily,
          color: primaryColor,
          bold: true,
        });

        if (slideDef.imageUrl) {
          slide.addImage({
            path: slideDef.imageUrl,
            x: 0.5,
            y: 1.2,
            w: "90%",
            h: 5.0,
            sizing: { type: "contain", w: "90%", h: 5.0 }
          });
        }

        // Caption
        if (slideDef.content && slideDef.content.length > 0) {
           slide.addText(slideDef.content[0], {
             x: 0.5,
             y: 6.3,
             w: "90%",
             h: 0.5,
             fontSize: 14,
             fontFace: fontFamily,
             color: secondaryColor,
             align: "center"
           });
        }
        break;

      case "quote":
        slide.background = { color: "F5F5F5" }; // Light gray
        slide.addText(slideDef.quoteText || slideDef.content[0] || "No quote provided", {
          x: 1.5,
          y: "30%",
          w: "70%",
          h: 2,
          fontSize: 32,
          fontFace: fontFamily,
          color: primaryColor,
          italic: true,
          align: "center",
        });
        if (slideDef.quoteAttribution) {
          slide.addText(`— ${slideDef.quoteAttribution}`, {
            x: 2,
            y: "60%",
            w: "60%",
            h: 0.5,
            fontSize: 20,
            fontFace: fontFamily,
            color: secondaryColor,
            align: "right",
          });
        }
        break;

      case "content":
      default:
        addSlideHeader(slide, slideDef.title);

        const contentWidth = slideDef.imageUrl ? "55%" : "90%";

        if (slideDef.content && slideDef.content.length > 0) {
          slide.addText(slideDef.content.map(c => ({ text: c, options: { breakLine: true } })), {
            x: 0.5,
            y: 1.8,
            w: contentWidth,
            h: "70%",
            fontSize: 18,
            fontFace: fontFamily,
            color: secondaryColor,
            bullet: true,
            valign: "top",
          });
        }

        if (slideDef.imageUrl) {
          slide.addImage({
            path: slideDef.imageUrl,
            x: "60%",
            y: 1.8,
            w: "35%",
            h: 4,
            sizing: { type: "contain", w: "35%", h: 4 }
          });
        }
        break;
    }
  }

  // Generate buffer
  return (await pres.write("nodebuffer")) as Buffer;
}
