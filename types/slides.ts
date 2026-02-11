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

export interface SlideDefinition {
  id: string;
  type: "title" | "content" | "section-divider" | "two-column" | "image-focus" | "quote";
  title: string;
  subtitle?: string;
  content: string[];          // bullet points
  speakerNotes?: string;
  imageQuery?: string;         // Unsplash search query
  imageUrl?: string;           // Assigned after search
  quoteText?: string;          // For quote slides
  quoteAttribution?: string;
}
