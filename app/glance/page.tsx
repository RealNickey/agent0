import { AtAGlance } from "@/components/at-a-glance";

export default function GlancePage() {
  return (
    <main
      className="min-h-screen w-full flex items-center justify-center"
      style={{
        backgroundImage: "url('/at-a-glance.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        /* Sky-gradient fallback used when the image is not present */
        background:
          "url('/at-a-glance.jpg') center/cover no-repeat, linear-gradient(160deg, #87ceeb 0%, #b0d8f0 30%, #f4a567 70%, #e8734a 100%)",
      }}
    >
      <AtAGlance
      />
    </main>
  );
}
