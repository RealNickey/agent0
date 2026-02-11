import { useCallback } from "react";

interface UseIntegrationHandlersProps {
  addedIntegrations: string[];
  setAddedIntegrations: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveIntegration: React.Dispatch<React.SetStateAction<string | null>>;
  activeIntegration: string | null;
  setIsCalendarConnected: React.Dispatch<React.SetStateAction<boolean>>;
  setIsFormsConnected: React.Dispatch<React.SetStateAction<boolean>>;
  setIsTasksConnected: React.Dispatch<React.SetStateAction<boolean>>;
  setIsGithubConnected: React.Dispatch<React.SetStateAction<boolean>>;
  onIntegrationsChange?: () => void; // New callback
}

export function useIntegrationHandlers({
  addedIntegrations,
  setAddedIntegrations,
  setActiveIntegration,
  activeIntegration,
  setIsCalendarConnected,
  setIsFormsConnected,
  setIsTasksConnected,
  setIsGithubConnected,
  onIntegrationsChange,
}: UseIntegrationHandlersProps) {
  const reloadIntegrations = useCallback(async () => {
    try {
      const res = await fetch("/api/tools/installed");
      const data = await res.json();
      if (data.tools && Array.isArray(data.tools)) {
        setAddedIntegrations(data.tools.map((t: any) => t.id));
      }
    } catch (e) {
      console.error("Failed to reload installed tools", e);
    }
  }, [setAddedIntegrations]);

  const handleAddIntegration = useCallback(async (id: string) => {
    if (!addedIntegrations.includes(id)) {
      setAddedIntegrations((prev) => [...prev, id]);
    }
    setActiveIntegration(id);

    try {
      await fetch("/api/tools/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId: id }),
      });
      
      const authResponse = await fetch("/api/auth/google?action=status");
      const authData = await authResponse.json();
      
      if (id === "calendar" && !authData.hasCalendarScopes) {
        const width = 600, height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        window.open("/api/auth/google", "GoogleAuth", `width=${width},height=${height},left=${left},top=${top}`);
      } else if (id === "calendar") {
        setIsCalendarConnected(true);
      }

      if (id === "forms" && !authData.hasFormsScopes) {
        const width = 600, height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        window.open("/api/auth/google?service=forms", "GoogleFormsAuth", `width=${width},height=${height},left=${left},top=${top}`);
      } else if (id === "forms") {
        setIsFormsConnected(true);
      }

      if (id === "tasks" && !authData.hasTasksScopes) {
        const width = 600, height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        window.open("/api/auth/google?service=tasks", "GoogleTasksAuth", `width=${width},height=${height},left=${left},top=${top}`);
      } else if (id === "tasks") {
        setIsTasksConnected(true);
      }

      // GitHub uses its own OAuth provider
      if (id === "github") {
        const ghStatus = await fetch("/api/auth/github?action=status");
        const ghData = await ghStatus.json();
        if (!ghData.connected) {
          const width = 600, height = 700;
          const left = window.screen.width / 2 - width / 2;
          const top = window.screen.height / 2 - height / 2;
          window.open("/api/auth/github", "GitHubAuth", `width=${width},height=${height},left=${left},top=${top}`);
        } else {
          setIsGithubConnected(true);
        }
      }
      
      await reloadIntegrations();
      
      // Notify parent component of integration changes
      onIntegrationsChange?.();
    } catch (error) {
      console.error("Failed to install tool", error);
      setAddedIntegrations((prev) => prev.filter(i => i !== id));
    }
  }, [addedIntegrations, reloadIntegrations, setAddedIntegrations, setActiveIntegration, setIsCalendarConnected, setIsFormsConnected, setIsTasksConnected, setIsGithubConnected, onIntegrationsChange]);

  const handleRemoveIntegration = useCallback(async (id: string) => {
    setAddedIntegrations((prev) => prev.filter((i) => i !== id));
    if (activeIntegration === id) {
      setActiveIntegration(null);
    }
    
    try {
      await fetch("/api/tools/install", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId: id }),
      });

      if (id === "calendar") {
        await fetch("/api/auth/google", { method: "DELETE" });
        setIsCalendarConnected(false);
      }

      if (id === "forms") {
        await fetch("/api/auth/google", { method: "DELETE" });
        setIsFormsConnected(false);
      }

      if (id === "tasks") {
        await fetch("/api/auth/google", { method: "DELETE" });
        setIsTasksConnected(false);
      }

      if (id === "github") {
        await fetch("/api/auth/github", { method: "DELETE" });
        setIsGithubConnected(false);
      }
      
      await reloadIntegrations();
      
      // Notify parent component of integration changes
      onIntegrationsChange?.();
    } catch (error) {
      console.error("Failed to uninstall tool", error);
      setAddedIntegrations((prev) => [...prev, id]);
    }
  }, [activeIntegration, reloadIntegrations, setAddedIntegrations, setActiveIntegration, setIsCalendarConnected, setIsFormsConnected, setIsTasksConnected, setIsGithubConnected, onIntegrationsChange]);

  return {
    reloadIntegrations,
    handleAddIntegration,
    handleRemoveIntegration,
  };
}
