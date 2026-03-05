import { tool } from "ai";
import { z } from "zod";
import { getValidAccessToken } from "@/lib/google-calendar";

/**
 * Google Sheets Tools for Agent0
 *
 * These tools allow the AI agent to interact with Google Sheets API directly.
 * Users invoke these tools using @sheets mentions in their prompts.
 *
 * Available operations:
 * - createSpreadsheet: Create a new Google Spreadsheet
 * - readRange: Read cell values from a range
 * - writeRange: Write data to a cell range
 * - appendRows: Append rows after the last row with data
 * - formatRange: Apply formatting (bold, colors, alignment)
 * - createChart: Create a chart from spreadsheet data
 * - searchSheets: Search for spreadsheets by name
 * - formulaHelper: Insert formulas into cells
 */

// Google Sheets API base URL
const SHEETS_API_BASE = "https://sheets.googleapis.com/v4";

// Google Drive API base URL (for search)
const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

// Default user ID for development (matches what we use in auth routes)
const DEFAULT_USER_ID = "default-user";

// Get access token from token store
async function getAccessToken(): Promise<string | null> {
  return await getValidAccessToken(DEFAULT_USER_ID);
}

/**
 * Make authenticated request to Google Sheets API (or any Google API)
 */
async function sheetsRequest<T>(
  accessToken: string,
  url: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: Record<string, unknown>
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };

    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          errorData.error?.message ||
          `API request failed: ${response.statusText}`,
      };
    }

    // Handle 204 No Content (e.g., for delete operations)
    if (response.status === 204) {
      return { success: true };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// ─── Tool Definitions ────────────────────────────────────────────────────────

/**
 * Create a new Google Spreadsheet
 */
const createSpreadsheet = tool({
  description:
    "Create a new Google Spreadsheet. Returns the spreadsheet ID and URL.",
  inputSchema: z.object({
    title: z.string().describe("The title of the new spreadsheet"),
    sheetNames: z
      .array(z.string())
      .optional()
      .describe(
        "Optional array of sheet/tab names to create (defaults to a single 'Sheet1')"
      ),
  }),
  execute: async ({ title, sheetNames }) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return {
        error:
          "Not authenticated with Google. Please connect your Google account first.",
      };
    }

    const sheets =
      sheetNames && sheetNames.length > 0
        ? sheetNames.map((name) => ({
            properties: { title: name },
          }))
        : undefined;

    const result = await sheetsRequest<{
      spreadsheetId: string;
      spreadsheetUrl: string;
      properties: { title: string };
    }>(accessToken, `${SHEETS_API_BASE}/spreadsheets`, "POST", {
      properties: { title },
      ...(sheets ? { sheets } : {}),
    });

    if (!result.success || !result.data) {
      return { error: result.error || "Failed to create spreadsheet" };
    }

    return {
      spreadsheetId: result.data.spreadsheetId,
      url: result.data.spreadsheetUrl,
      title: result.data.properties.title,
    };
  },
});

/**
 * Read cell values from a specified range
 */
const readRange = tool({
  description:
    "Read cell values from a Google Spreadsheet range. Returns data as a 2D array.",
  inputSchema: z.object({
    spreadsheetId: z.string().describe("The ID of the spreadsheet"),
    range: z
      .string()
      .describe("The A1 notation range to read, e.g. 'Sheet1!A1:D50'"),
  }),
  execute: async ({ spreadsheetId, range }) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return {
        error:
          "Not authenticated with Google. Please connect your Google account first.",
      };
    }

    const encodedRange = encodeURIComponent(range);
    const result = await sheetsRequest<{
      range: string;
      majorDimension: string;
      values: string[][];
    }>(
      accessToken,
      `${SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodedRange}`
    );

    if (!result.success || !result.data) {
      return { error: result.error || "Failed to read range" };
    }

    return {
      range: result.data.range,
      values: result.data.values || [],
      rowCount: result.data.values?.length || 0,
    };
  },
});

/**
 * Write data to a specified range
 */
const writeRange = tool({
  description:
    "Write data to a Google Spreadsheet range. Overwrites existing data in the range.",
  inputSchema: z.object({
    spreadsheetId: z.string().describe("The ID of the spreadsheet"),
    range: z
      .string()
      .describe("The A1 notation range to write to, e.g. 'Sheet1!A1:D5'"),
    values: z
      .array(z.array(z.union([z.string(), z.number()])))
      .describe("2D array of values to write (rows × columns)"),
  }),
  execute: async ({ spreadsheetId, range, values }) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return {
        error:
          "Not authenticated with Google. Please connect your Google account first.",
      };
    }

    const encodedRange = encodeURIComponent(range);
    const result = await sheetsRequest<{
      updatedRange: string;
      updatedRows: number;
      updatedColumns: number;
      updatedCells: number;
    }>(
      accessToken,
      `${SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
      "PUT",
      {
        range,
        majorDimension: "ROWS",
        values,
      }
    );

    if (!result.success || !result.data) {
      return { error: result.error || "Failed to write range" };
    }

    return {
      updatedRange: result.data.updatedRange,
      updatedRows: result.data.updatedRows,
      updatedColumns: result.data.updatedColumns,
      updatedCells: result.data.updatedCells,
    };
  },
});

/**
 * Append rows after the last row with data
 */
const appendRows = tool({
  description:
    "Append rows to a Google Spreadsheet after the last row that contains data.",
  inputSchema: z.object({
    spreadsheetId: z.string().describe("The ID of the spreadsheet"),
    range: z
      .string()
      .describe(
        "The A1 notation range to search for a table, e.g. 'Sheet1!A:Z'"
      ),
    values: z
      .array(z.array(z.union([z.string(), z.number()])))
      .describe("2D array of row values to append"),
  }),
  execute: async ({ spreadsheetId, range, values }) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return {
        error:
          "Not authenticated with Google. Please connect your Google account first.",
      };
    }

    const encodedRange = encodeURIComponent(range);
    const result = await sheetsRequest<{
      tableRange: string;
      updates: {
        updatedRange: string;
        updatedRows: number;
        updatedColumns: number;
        updatedCells: number;
      };
    }>(
      accessToken,
      `${SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED`,
      "POST",
      {
        range,
        majorDimension: "ROWS",
        values,
      }
    );

    if (!result.success || !result.data) {
      return { error: result.error || "Failed to append rows" };
    }

    return {
      tableRange: result.data.tableRange,
      updatedRange: result.data.updates?.updatedRange,
      updatedRows: result.data.updates?.updatedRows,
      updatedCells: result.data.updates?.updatedCells,
    };
  },
});

/**
 * Apply formatting to a range using batchUpdate
 */
const formatRange = tool({
  description:
    "Apply formatting to a cell range in a Google Spreadsheet (bold, background color, alignment).",
  inputSchema: z.object({
    spreadsheetId: z.string().describe("The ID of the spreadsheet"),
    sheetId: z
      .number()
      .default(0)
      .describe("The numeric sheet/tab ID (default 0 for first sheet)"),
    startRowIndex: z.number().describe("Start row index (0-based, inclusive)"),
    endRowIndex: z.number().describe("End row index (0-based, exclusive)"),
    startColumnIndex: z
      .number()
      .describe("Start column index (0-based, inclusive)"),
    endColumnIndex: z
      .number()
      .describe("End column index (0-based, exclusive)"),
    bold: z.boolean().optional().describe("Whether to bold the text"),
    backgroundColor: z
      .object({
        r: z.number().min(0).max(1).describe("Red component 0-1"),
        g: z.number().min(0).max(1).describe("Green component 0-1"),
        b: z.number().min(0).max(1).describe("Blue component 0-1"),
        a: z.number().min(0).max(1).optional().describe("Alpha component 0-1"),
      })
      .optional()
      .describe("Background color as RGBA (values 0-1)"),
    horizontalAlignment: z
      .string()
      .optional()
      .describe(
        "Horizontal alignment: LEFT, CENTER, RIGHT"
      ),
  }),
  execute: async ({
    spreadsheetId,
    sheetId,
    startRowIndex,
    endRowIndex,
    startColumnIndex,
    endColumnIndex,
    bold,
    backgroundColor,
    horizontalAlignment,
  }) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return {
        error:
          "Not authenticated with Google. Please connect your Google account first.",
      };
    }

    // Build the cell format
    const userEnteredFormat: Record<string, unknown> = {};
    const fields: string[] = [];

    if (bold !== undefined) {
      userEnteredFormat.textFormat = { bold };
      fields.push("userEnteredFormat.textFormat.bold");
    }

    if (backgroundColor) {
      userEnteredFormat.backgroundColor = {
        red: backgroundColor.r,
        green: backgroundColor.g,
        blue: backgroundColor.b,
        alpha: backgroundColor.a ?? 1,
      };
      fields.push("userEnteredFormat.backgroundColor");
    }

    if (horizontalAlignment) {
      userEnteredFormat.horizontalAlignment = horizontalAlignment;
      fields.push("userEnteredFormat.horizontalAlignment");
    }

    if (fields.length === 0) {
      return { error: "No formatting options specified" };
    }

    const result = await sheetsRequest<{
      replies: unknown[];
    }>(
      accessToken,
      `${SHEETS_API_BASE}/spreadsheets/${spreadsheetId}:batchUpdate`,
      "POST",
      {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex,
                endRowIndex,
                startColumnIndex,
                endColumnIndex,
              },
              cell: { userEnteredFormat },
              fields: fields.join(","),
            },
          },
        ],
      }
    );

    if (!result.success) {
      return { error: result.error || "Failed to format range" };
    }

    return {
      success: true,
      message: `Formatted range (rows ${startRowIndex}-${endRowIndex}, cols ${startColumnIndex}-${endColumnIndex})`,
    };
  },
});

/**
 * Create a chart from spreadsheet data using batchUpdate
 */
const createChart = tool({
  description:
    "Create a chart in a Google Spreadsheet from a data range.",
  inputSchema: z.object({
    spreadsheetId: z.string().describe("The ID of the spreadsheet"),
    sheetId: z.number().describe("The numeric sheet/tab ID containing the data"),
    chartType: z
      .enum(["BAR", "LINE", "PIE", "COLUMN", "AREA"])
      .describe("The type of chart to create"),
    title: z.string().describe("The chart title"),
    dataRange: z
      .object({
        startRowIndex: z.number().describe("Start row index (0-based)"),
        endRowIndex: z.number().describe("End row index (0-based, exclusive)"),
        startColumnIndex: z.number().describe("Start column index (0-based)"),
        endColumnIndex: z
          .number()
          .describe("End column index (0-based, exclusive)"),
      })
      .describe("The data range for the chart"),
  }),
  execute: async ({ spreadsheetId, sheetId, chartType, title, dataRange }) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return {
        error:
          "Not authenticated with Google. Please connect your Google account first.",
      };
    }

    const chartSpec: Record<string, unknown> = {
      title,
      basicChart: {
        chartType,
        legendPosition: "BOTTOM_LEGEND",
        domains: [
          {
            domain: {
              sourceRange: {
                sources: [
                  {
                    sheetId,
                    startRowIndex: dataRange.startRowIndex,
                    endRowIndex: dataRange.endRowIndex,
                    startColumnIndex: dataRange.startColumnIndex,
                    endColumnIndex: dataRange.startColumnIndex + 1,
                  },
                ],
              },
            },
          },
        ],
        series: [
          {
            series: {
              sourceRange: {
                sources: [
                  {
                    sheetId,
                    startRowIndex: dataRange.startRowIndex,
                    endRowIndex: dataRange.endRowIndex,
                    startColumnIndex: dataRange.startColumnIndex + 1,
                    endColumnIndex: dataRange.endColumnIndex,
                  },
                ],
              },
            },
            targetAxis: "LEFT_AXIS",
          },
        ],
        headerCount: 1,
      },
    };

    const result = await sheetsRequest<{
      replies: Array<{
        addChart?: {
          chart: { chartId: number };
        };
      }>;
    }>(
      accessToken,
      `${SHEETS_API_BASE}/spreadsheets/${spreadsheetId}:batchUpdate`,
      "POST",
      {
        requests: [
          {
            addChart: {
              chart: {
                spec: chartSpec,
                position: {
                  overlayPosition: {
                    anchorCell: {
                      sheetId,
                      rowIndex: dataRange.endRowIndex + 1,
                      columnIndex: 0,
                    },
                  },
                },
              },
            },
          },
        ],
      }
    );

    if (!result.success || !result.data) {
      return { error: result.error || "Failed to create chart" };
    }

    const chartId =
      result.data.replies?.[0]?.addChart?.chart?.chartId;

    return {
      success: true,
      chartId,
      message: `Created ${chartType} chart "${title}"`,
    };
  },
});

/**
 * Search for spreadsheets by name using Google Drive API
 */
const searchSheets = tool({
  description:
    "Search for Google Spreadsheets by name. Returns matching spreadsheets with ID, name, and link.",
  inputSchema: z.object({
    query: z.string().describe("Search query to match against spreadsheet names"),
  }),
  execute: async ({ query }) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return {
        error:
          "Not authenticated with Google. Please connect your Google account first.",
      };
    }

    const driveQuery = `mimeType='application/vnd.google-apps.spreadsheet' and name contains '${query.replace(/'/g, "\\'")}'`;
    const params = new URLSearchParams({
      q: driveQuery,
      fields: "files(id,name,webViewLink,modifiedTime)",
      orderBy: "modifiedTime desc",
      pageSize: "20",
    });

    const result = await sheetsRequest<{
      files: Array<{
        id: string;
        name: string;
        webViewLink: string;
        modifiedTime: string;
      }>;
    }>(accessToken, `${DRIVE_API_BASE}/files?${params.toString()}`);

    if (!result.success || !result.data) {
      return { error: result.error || "Failed to search spreadsheets" };
    }

    return {
      spreadsheets: result.data.files.map((f) => ({
        id: f.id,
        name: f.name,
        url: f.webViewLink,
        lastModified: f.modifiedTime,
      })),
      count: result.data.files.length,
    };
  },
});

/**
 * Write a formula to a specific cell
 */
const formulaHelper = tool({
  description:
    "Insert a formula into a specific cell in a Google Spreadsheet.",
  inputSchema: z.object({
    spreadsheetId: z.string().describe("The ID of the spreadsheet"),
    cell: z
      .string()
      .describe("The A1 notation cell reference, e.g. 'E2' or 'Sheet1!E2'"),
    formula: z
      .string()
      .describe("The formula string, e.g. '=SUM(B2:B50)' or '=AVERAGE(C2:C10)'"),
  }),
  execute: async ({ spreadsheetId, cell, formula }) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return {
        error:
          "Not authenticated with Google. Please connect your Google account first.",
      };
    }

    const encodedCell = encodeURIComponent(cell);
    const result = await sheetsRequest<{
      updatedRange: string;
      updatedCells: number;
    }>(
      accessToken,
      `${SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodedCell}?valueInputOption=USER_ENTERED`,
      "PUT",
      {
        range: cell,
        majorDimension: "ROWS",
        values: [[formula]],
      }
    );

    if (!result.success || !result.data) {
      return { error: result.error || "Failed to write formula" };
    }

    return {
      cell: result.data.updatedRange,
      formula,
      success: true,
    };
  },
});

// ─── Export ───────────────────────────────────────────────────────────────────

export const sheetsTools = {
  createSpreadsheet,
  readRange,
  writeRange,
  appendRows,
  formatRange,
  createChart,
  searchSheets,
  formulaHelper,
};
