import { z } from "zod";

export interface ToolExtension {
  id: string;
  name: string;
  description: string;
  icon?: string;
  parameters: z.ZodSchema;
  execute: (params: any) => Promise<any>;
}

export interface SerializableToolExtension {
  id: string;
  name: string;
  description: string;
  icon?: string;
  parameters: Record<string, any>;
}

class ToolRegistry {
  private tools = new Map<string, ToolExtension>();

  register(tool: ToolExtension) {
    this.tools.set(tool.id, tool);
  }

  unregister(id: string) {
    this.tools.delete(id);
  }

  search(query: string): ToolExtension[] {
    if (!query) {
      return Array.from(this.tools.values());
    }
    return Array.from(this.tools.values()).filter(
      (tool) =>
        tool.name.toLowerCase().includes(query.toLowerCase()) ||
        tool.description.toLowerCase().includes(query.toLowerCase()) ||
        tool.id.toLowerCase().includes(query.toLowerCase())
    );
  }

  get(id: string): ToolExtension | undefined {
    return this.tools.get(id);
  }

  getAll(): ToolExtension[] {
    return Array.from(this.tools.values());
  }

  getAllSerializable(): SerializableToolExtension[] {
    return Array.from(this.tools.values()).map((tool) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      icon: tool.icon,
      parameters: tool.parameters instanceof z.ZodSchema 
        ? this.zodToJsonSchema(tool.parameters)
        : tool.parameters,
    }));
  }

  private zodToJsonSchema(schema: z.ZodSchema): Record<string, any> {
    // Simple conversion for basic schemas
    // For complex schemas, consider using zod-to-json-schema library
    try {
      const def = (schema as any)._def;
      if (def?.typeName === "ZodObject") {
        const shape = def.shape();
        const properties: Record<string, any> = {};
        const required: string[] = [];
        
        for (const [key, value] of Object.entries(shape)) {
          const fieldDef = (value as any)._def;
          properties[key] = {
            type: this.getZodType(fieldDef?.typeName),
            description: fieldDef?.description || "",
          };
          if (!fieldDef?.isOptional) {
            required.push(key);
          }
        }
        
        return {
          type: "object",
          properties,
          required: required.length > 0 ? required : undefined,
        };
      }
    } catch {
      // Fallback for complex schemas
    }
    return { type: "object", properties: {} };
  }

  private getZodType(typeName: string): string {
    switch (typeName) {
      case "ZodString":
        return "string";
      case "ZodNumber":
        return "number";
      case "ZodBoolean":
        return "boolean";
      case "ZodArray":
        return "array";
      default:
        return "string";
    }
  }
}

export const toolRegistry = new ToolRegistry();
