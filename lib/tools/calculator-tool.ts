import { z } from "zod";
import type { ToolExtension } from "@/lib/tool-registry";

/**
 * Calculator Tool
 * Performs basic arithmetic calculations
 */
export const calculatorTool: ToolExtension = {
  id: "calculator",
  name: "Calculator",
  description: "Use this tool to perform mathematical calculations. Accepts arithmetic expressions with numbers and operators (+, -, *, /, %, parentheses). Examples: '5 + 5', '10 * 3 - 2', '(100 / 4) + 25'",
  icon: "🧮",
  parameters: z.object({
    expression: z.string().describe("The mathematical expression to calculate. Must contain only numbers and operators (+, -, *, /, %, parentheses). Example: '5 + 5'"),
  }),
  execute: async (params: { expression: string }) => {
    try {
      // Simple safe expression evaluator
      // Only allows numbers and basic operators
      const sanitized = params.expression.replace(/[^0-9+\-*/().%\s]/g, '');
      
      // Check if expression contains only valid characters
      const hasInvalidChars = params.expression.replace(/[\s0-9+\-*/().%]/g, '').length > 0;
      if (hasInvalidChars) {
        return {
          error: true,
          message: "Expression contains invalid characters. Only numbers and +, -, *, /, (, ), % are allowed.",
        };
      }
      
      // Use Function constructor for evaluation
      // eslint-disable-next-line no-new-func
      const result = new Function(`return (${sanitized})`)();
      
      if (typeof result !== 'number' || !isFinite(result)) {
        return {
          error: true,
          message: "Invalid calculation result",
        };
      }
      
      return {
        expression: params.expression,
        result,
        formatted: result.toLocaleString(),
      };
    } catch (error) {
      return {
        error: true,
        message: error instanceof Error ? error.message : "Calculation failed",
      };
    }
  },
};
