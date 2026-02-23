import React from "react";
import { MusicWidget } from "@/components/music-widget";

export default function MSComponentPage() {
  return (
    <div 
      className="flex items-center justify-center min-h-screen w-full bg-cover bg-center bg-no-repeat selection:bg-[#8ca7bc]/30 text-foreground"
      style={{ backgroundImage: 'url("/Dashboard.png")' }}
    >
      <MusicWidget />
    </div>
  );
}
