import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ChatInterface } from "@/components/dashboard/chat-interface";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader />
      <ChatInterface />
    </div>
  );
}
