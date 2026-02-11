"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SlidesApprovalProps {
  part: any;
  addToolApprovalResponse?: (arg: { id: string; approved: boolean }) => void;
}

export function SlidesApproval({ part, addToolApprovalResponse }: SlidesApprovalProps) {
  const outline = part?.args?.outline;
  const slideTitles = outline?.slides?.map((s: any) => s.title) || [];

  return (
    <Card className="p-4 space-y-3">
      <h3 className="text-sm font-semibold">Ready to create Google Slides presentation?</h3>
      <p className="text-xs text-muted-foreground">{outline?.title} · {outline?.slides?.length || 0} slides</p>
      <ul className="text-xs text-muted-foreground list-disc pl-4 max-h-40 overflow-auto">
        {slideTitles.map((title: string, i: number) => <li key={`${title}-${i}`}>{title}</li>)}
      </ul>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => addToolApprovalResponse?.({ id: part.approval.id, approved: false })}>Cancel</Button>
        <Button onClick={() => addToolApprovalResponse?.({ id: part.approval.id, approved: true })}>Create & Upload</Button>
      </div>
    </Card>
  );
}
