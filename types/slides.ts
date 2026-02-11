export type SlideType =
  | "title"
  | "content"
  | "section-divider"
  | "two-column"
  | "image-focus"
  | "quote";

export interface SlideTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
}

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
  theme: SlideTheme;
  slides: SlideDefinition[];
}

export interface SlideOutlineRejection {
  rejected: true;
  reason?: string;
}

export type SlideOutlineOutput = SlideOutline | SlideOutlineRejection;

export interface SlideImageAssignment {
  slideId: string;
  imageUrl: string;
  altDescription?: string;
  photographer?: string;
}
