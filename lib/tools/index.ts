/**
 * Tool Registry Initialization
 * 
 * This file registers all available tools with the tool registry.
 * Import this file in your app initialization to make tools available.
 */

import { toolRegistry } from "@/lib/tool-registry";
import { weatherTool } from "./weather-tool";
import { calculatorTool } from "./calculator-tool";
import { randomTool } from "./random-tool";

// Register all built-in tools
export function registerBuiltInTools() {
  console.log('[Tools] Registering built-in tools...');
  toolRegistry.register(weatherTool);
  toolRegistry.register(calculatorTool);
  toolRegistry.register(randomTool);
  console.log('[Tools] Registered tools:', toolRegistry.getAll().map(t => t.id));
}

// Auto-register tools when this module is imported
registerBuiltInTools();

// Export individual tools for direct access
export { weatherTool, calculatorTool, randomTool };

// Export the registry for external use
export { toolRegistry };
