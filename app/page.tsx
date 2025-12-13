import { ChatUI } from "@/components/chat-ui";
import { ExtensionContextBridge } from "@/components/extension-context-bridge";

export default function Home() {
  return (
    <>
      <ExtensionContextBridge />
      <ChatUI />
    </>
  );
}
