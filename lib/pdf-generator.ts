import { jsPDF } from "jspdf";

interface PDFContent {
  userPrompt: string;
  aiResponse: string;
  title?: string;
  timestamp?: Date;
}

interface TextSegment {
  text: string;
  bold: boolean;
}

// Parse markdown text to extract bold segments
function parseMarkdownLine(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the bold part
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        bold: false,
      });
    }
    // Add bold text
    segments.push({
      text: match[1],
      bold: true,
    });
    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      bold: false,
    });
  }

  return segments.length > 0 ? segments : [{ text, bold: false }];
}

export function generateChatPDF({
  userPrompt,
  aiResponse,
  title = "AI Generated Content",
  timestamp = new Date(),
}: PDFContent): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Check if we need a new page
  const checkPageBreak = (y: number, requiredSpace: number = 10): number => {
    if (y > pageHeight - margin - requiredSpace) {
      doc.addPage();
      return margin;
    }
    return y;
  };

  // Render a line with mixed bold/normal text
  const renderFormattedLine = (
    line: string,
    x: number,
    y: number,
    maxWidth: number,
    fontSize: number
  ): number => {
    doc.setFontSize(fontSize);
    
    // Check for bullet points
    let indent = 0;
    let processedLine = line;
    
    if (line.match(/^\s*[\*\-]\s+/)) {
      // It's a bullet point
      indent = 5;
      processedLine = line.replace(/^\s*[\*\-]\s+/, "");
      doc.setFont("helvetica", "normal");
      doc.text("•", x, y);
    }
    
    const segments = parseMarkdownLine(processedLine);
    let currentX = x + indent;
    
    // First, calculate if line fits or needs wrapping
    let totalWidth = 0;
    for (const segment of segments) {
      doc.setFont("helvetica", segment.bold ? "bold" : "normal");
      totalWidth += doc.getTextWidth(segment.text);
    }
    
    if (totalWidth <= maxWidth - indent) {
      // Line fits, render with formatting
      for (const segment of segments) {
        doc.setFont("helvetica", segment.bold ? "bold" : "normal");
        doc.text(segment.text, currentX, y);
        currentX += doc.getTextWidth(segment.text);
      }
      return y + 5;
    } else {
      // Line needs wrapping - render segments with word wrap
      const words: { word: string; bold: boolean }[] = [];
      for (const segment of segments) {
        const segmentWords = segment.text.split(/(\s+)/);
        for (const word of segmentWords) {
          if (word) {
            words.push({ word, bold: segment.bold });
          }
        }
      }
      
      let lineX = x + indent;
      let lineY = y;
      
      for (const { word, bold } of words) {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        const wordWidth = doc.getTextWidth(word);
        
        if (lineX + wordWidth > x + maxWidth && word.trim()) {
          // Move to next line
          lineY += 5;
          lineY = checkPageBreak(lineY);
          lineX = x + indent;
        }
        
        doc.text(word, lineX, lineY);
        lineX += wordWidth;
      }
      
      return lineY + 5;
    }
  };

  // Render formatted text block
  const renderFormattedText = (
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    fontSize: number
  ): number => {
    const lines = text.split("\n");
    
    for (const line of lines) {
      y = checkPageBreak(y);
      
      if (line.trim() === "") {
        y += 3; // Empty line spacing
        continue;
      }
      
      y = renderFormattedLine(line, x, y, maxWidth, fontSize);
    }
    
    return y;
  };

  // === Header Section ===
  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(59, 130, 246); // Blue color
  
  const titleLines = doc.splitTextToSize(title, contentWidth);
  for (const line of titleLines) {
    yPos = checkPageBreak(yPos);
    doc.text(line, margin, yPos);
    yPos += 8;
  }
  yPos += 2;

  // Timestamp
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(128, 128, 128);
  const formattedDate = timestamp.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Generated on ${formattedDate}`, margin, yPos);
  yPos += 10;

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 12;

  // === User Prompt Section ===
  doc.setTextColor(59, 130, 246);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("YOUR PROMPT", margin, yPos);
  yPos += 8;

  // User prompt content
  doc.setTextColor(55, 65, 81);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  const promptLines = doc.splitTextToSize(userPrompt, contentWidth);
  for (const line of promptLines) {
    yPos = checkPageBreak(yPos);
    doc.text(line, margin, yPos);
    yPos += 5;
  }
  yPos += 10;

  // === AI Response Section ===
  doc.setTextColor(16, 185, 129); // Green color
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("AI RESPONSE", margin, yPos);
  yPos += 8;

  // AI response content with formatting
  doc.setTextColor(31, 41, 55);
  yPos = renderFormattedText(aiResponse, margin, yPos, contentWidth, 10);

  // === Footer ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text("Generated by Agent0", margin, pageHeight - 10);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: "right" });
  }

  // Generate filename from title
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
  const dateStr = timestamp.toISOString().split("T")[0];
  const filename = `agent0-${safeTitle}-${dateStr}.pdf`;

  // Download the PDF
  doc.save(filename);
}

// Helper to extract a title from the AI response or user prompt
export function generateTitle(userPrompt: string, aiResponse: string): string {
  // Try to extract first meaningful line from response
  const firstLine = aiResponse.split("\n").find((line) => line.trim().length > 0);
  
  if (firstLine) {
    // Remove markdown formatting
    const cleanLine = firstLine
      .replace(/^#+\s*/, "") // Remove heading markers
      .replace(/\*\*/g, "") // Remove bold
      .replace(/\*/g, "") // Remove italic
      .replace(/`/g, "") // Remove code
      .trim();
    
    if (cleanLine.length > 5 && cleanLine.length <= 60) {
      return cleanLine;
    }
  }
  
  // Fall back to user prompt
  const cleanPrompt = userPrompt.trim().substring(0, 50);
  return cleanPrompt.length > 5 ? cleanPrompt : "AI Generated Content";
}
