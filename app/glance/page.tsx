import { AtAGlance } from "@/components/at-a-glance";

export const metadata = {
  title: "At a Glance",
};

export default function GlancePage() {
  return (
    <main
      className="min-h-screen w-full flex items-center justify-center p-8"
      style={{
        backgroundImage: "url('/at-a-glance.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#1a1a2e",
      }}
    >
      {/* Subtle dark overlay for legibility */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" aria-hidden />
      <div className="relative z-10 max-w-4xl w-full">
        <AtAGlance />
      </div>
    </main>
  );
}
