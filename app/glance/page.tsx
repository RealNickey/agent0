import { DashboardGlance } from "@/components/dashboard-glance";

export default function GlancePage() {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url("/at-a-glance.jpg")' }}
    >
      <DashboardGlance />
    </div>
  );
}
