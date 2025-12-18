import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ingestDocument, listDocuments, deleteDocument } from "@/lib/embeddings";

const ingestSchema = z.object({
  content: z.string().min(1, "Content is required"),
  metadata: z
    .object({
      title: z.string().optional(),
      category: z.string().optional(),
      source: z.string().optional(),
    })
    .optional(),
});

const deleteSchema = z.object({
  id: z.string().uuid("Invalid document ID"),
});

/**
 * POST /api/documents
 * Ingest a new document into the knowledge base
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ingestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.errors,
        },
        { status: 400 }
      );
    }

    const { content, metadata } = parsed.data;

    const result = await ingestDocument(content, {
      ...metadata,
      ingestedAt: new Date().toISOString(),
      source: metadata?.source || "api",
    });

    return NextResponse.json({
      success: true,
      message: `Document ingested successfully. Created ${result.chunksCreated} chunk(s).`,
      chunksCreated: result.chunksCreated,
    });
  } catch (error) {
    console.error("Document ingestion error:", error);
    return NextResponse.json(
      {
        error: "Failed to ingest document",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/documents
 * List all documents in the knowledge base
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const documents = await listDocuments(Math.min(limit, 100)); // Cap at 100

    return NextResponse.json({
      documents,
      count: documents.length,
    });
  } catch (error) {
    console.error("List documents error:", error);
    return NextResponse.json(
      {
        error: "Failed to list documents",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents
 * Delete a document from the knowledge base
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.errors,
        },
        { status: 400 }
      );
    }

    await deleteDocument(parsed.data.id);

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete document",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
