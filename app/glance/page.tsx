import { AtAGlance } from "@/components/at-a-glance";

export const metadata = {
  title: "At a Glance",
  description: "Your dynamic at-a-glance dashboard",
};

export default function GlancePage() {
  return (
    <main
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: "url('/at-a-glance.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#0f1b2d",
      }}
    >
      {/* Subtle dark overlay to ensure text is readable over any background image */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "rgba(0,0,0,0.35)" }}
      />

      <div className="relative z-10 px-6 py-10 max-w-5xl w-full">
        <AtAGlance />
      </div>
    </main>
  );
}
