import Link from "next/link";
import { SignedIn, UserButton } from "@clerk/nextjs";
import { Sparkles } from "lucide-react";

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border/50 bg-background/80 px-6 backdrop-blur-lg">
      <Link href="/" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold">Agent0</span>
      </Link>
      
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          Powered by Gemini Flash
        </span>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  );
}
