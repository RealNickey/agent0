import fs from "fs";
import path from "path";

// File path for local installed tools storage
const TOOLS_FILE_PATH = path.join(process.cwd(), ".installed-tools.json");

interface InstalledTool {
  id: string;
  installedAt: string;
  config?: Record<string, any>;
}

// In-memory cache
let installedTools: Map<string, InstalledTool> = new Map();

// Initialize from file
try {
  if (fs.existsSync(TOOLS_FILE_PATH)) {
    const data = fs.readFileSync(TOOLS_FILE_PATH, "utf-8");
    const json = JSON.parse(data);
    installedTools = new Map(Object.entries(json));
  } else {
    // Default installed tools (weather and slides are always installed for now)
    installedTools.set("weather", {
      id: "weather",
      installedAt: new Date().toISOString(),
    });
    installedTools.set("slides", {
      id: "slides",
      installedAt: new Date().toISOString(),
    });
    installedTools.set("research", {
      id: "research",
      installedAt: new Date().toISOString(),
    });
    saveToolsToFile();
  }
} catch (error) {
  console.error("Failed to load installed tools from file:", error);
}

function saveToolsToFile() {
  try {
    const obj = Object.fromEntries(installedTools);
    fs.writeFileSync(TOOLS_FILE_PATH, JSON.stringify(obj, null, 2));
  } catch (error) {
    console.error("Failed to save installed tools to file:", error);
  }
}

export function getInstalledTools(): InstalledTool[] {
  // Always reload from file to ensure sync across processes
  try {
    if (fs.existsSync(TOOLS_FILE_PATH)) {
      const data = fs.readFileSync(TOOLS_FILE_PATH, "utf-8");
      const json = JSON.parse(data);
      installedTools = new Map(Object.entries(json));
    }
  } catch (error) {}
  
  return Array.from(installedTools.values());
}

export function isToolInstalled(toolId: string): boolean {
  return installedTools.has(toolId);
}

export function addInstalledTool(toolId: string, config?: Record<string, any>): void {
  installedTools.set(toolId, {
    id: toolId,
    installedAt: new Date().toISOString(),
    config,
  });
  saveToolsToFile();
}

export function removeInstalledTool(toolId: string): void {
  installedTools.delete(toolId);
  saveToolsToFile();
}
