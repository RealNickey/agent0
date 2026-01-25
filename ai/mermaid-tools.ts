import { tool } from "ai";
import { z } from "zod";

export const renderMermaid = tool({
  description: "Render a specific Mermaid diagram code directly. Use this when the user asks to 'draw', 'show', 'create' a diagram using mermaid.",
  inputSchema: z.object({
    code: z.string().describe("The mermaid diagram code to render. Do not include markdown code block backticks."),
    caption: z.string().optional().describe("A caption for the diagram."),
  }),
  execute: async ({ code, caption }) => {
    // The execution is just a pass-through to confirm the code was generated.
    return {
      code,
      caption,
    };
  },
});

export const mermaidTools = {
  renderMermaid,
};
