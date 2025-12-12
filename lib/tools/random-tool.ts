import { z } from "zod";
import type { ToolExtension } from "@/lib/tool-registry";

/**
 * Random Generator Tool
 * Generates random numbers, UUIDs, or picks random items
 */
export const randomTool: ToolExtension = {
  id: "random",
  name: "Random Generator",
  description: "Generate random numbers, UUIDs, or pick random items from a list",
  icon: "🎲",
  parameters: z.object({
    type: z.enum(["number", "uuid", "pick"]).describe("Type of random generation"),
    min: z.number().optional().describe("Minimum value for number generation"),
    max: z.number().optional().describe("Maximum value for number generation"),
    items: z.array(z.string()).optional().describe("List of items to pick from"),
  }),
  execute: async (params: { type: "number" | "uuid" | "pick"; min?: number; max?: number; items?: string[] }) => {
    switch (params.type) {
      case "number": {
        const min = params.min ?? 0;
        const max = params.max ?? 100;
        const result = Math.floor(Math.random() * (max - min + 1)) + min;
        return {
          type: "number",
          min,
          max,
          result,
        };
      }
      case "uuid": {
        const uuid = crypto.randomUUID();
        return {
          type: "uuid",
          result: uuid,
        };
      }
      case "pick": {
        if (!params.items || params.items.length === 0) {
          return {
            error: true,
            message: "No items provided to pick from",
          };
        }
        const randomIndex = Math.floor(Math.random() * params.items.length);
        return {
          type: "pick",
          items: params.items,
          result: params.items[randomIndex],
          index: randomIndex,
        };
      }
      default:
        return {
          error: true,
          message: "Invalid random type",
        };
    }
  },
};
