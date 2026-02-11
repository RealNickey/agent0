import { useEffect } from "react";
import type { FileAttachment } from "@/components/ai-elements/attachments-preview";

export function useExtensionListeners(
  setAttachments: React.Dispatch<React.SetStateAction<FileAttachment[]>>,
  setInputValue: React.Dispatch<React.SetStateAction<string>>,
  setIsCalendarConnected: React.Dispatch<React.SetStateAction<boolean>>,
  setIsFormsConnected: React.Dispatch<React.SetStateAction<boolean>>,
  setIsTasksConnected: React.Dispatch<React.SetStateAction<boolean>>,
  setEnableSearch: React.Dispatch<React.SetStateAction<boolean>>,
  setIsGithubConnected: React.Dispatch<React.SetStateAction<boolean>>
) {
  useEffect(() => {
    console.log('Setting up extension message listener');
    
    const setControlledTextareaValue = (textarea: HTMLTextAreaElement, value: string) => {
      const proto = window.HTMLTextAreaElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
      const setter = descriptor?.set;
      if (setter) {
        setter.call(textarea, value);
      } else {
        textarea.value = value;
      }
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    };

    const handleExtensionMessage = (event: MessageEvent) => {
      console.log('Received message event:', {
        type: event.data?.type,
        origin: event.origin,
        windowOrigin: window.location.origin,
        data: event.data
      });
      
      // Only accept same-origin messages
      if (event.origin !== window.location.origin) {
        console.log('Rejected message - origin mismatch');
        return;
      }

      if (event.data?.type === 'AGENT0_SCREENSHOT') {
        const { screenshot, pageUrl, pageTitle, selectedText } = event.data.data;
        
        const filename = `${pageTitle || 'Screenshot'}.png`;
        const screenshotAttachment: FileAttachment = {
          name: filename,
          type: 'image/png',
          size: screenshot.length,
          url: screenshot,
        };
        
        setAttachments((prev) => [...prev, screenshotAttachment]);
        
        if (selectedText) {
          setInputValue((prev) => {
            const context = `[Screenshot from: ${pageTitle}]\n${selectedText}\n\n${prev}`;
            return context;
          });
        } else if (pageUrl) {
          setInputValue((prev) => {
            const context = `[Screenshot from: ${pageTitle || pageUrl}]\n\n${prev}`;
            return context;
          });
        }
        
        setTimeout(() => {
          const textarea = document.querySelector('textarea[placeholder="Send a message..."]') as HTMLTextAreaElement;
          textarea?.focus();
        }, 100);
        
        console.log('Screenshot received and attached:', {
          pageTitle,
          pageUrl,
          hasSelectedText: !!selectedText
        });
      } else if (event.data?.type === 'AGENT0_CONTEXT_TEXT') {
        const data = event.data?.data || {};
        const selectedText = typeof data.selectedText === "string" ? data.selectedText.trim() : "";
        if (!selectedText) return;

        const context = `${selectedText}\n\n`;
        const textarea = document.querySelector('textarea[placeholder="Send a message..."]') as HTMLTextAreaElement | null;
        if (!textarea) return;

        const existing = textarea.value || "";
        setControlledTextareaValue(textarea, `${context}${existing}`);
        textarea.focus();
      } else if (event.data?.type === 'AGENT0_SUMMARIZE_PAGE') {
        console.log('Received AGENT0_SUMMARIZE_PAGE message:', event.data);
        
        const { pageUrl, pageTitle, pageContent, fileData, fileName } = event.data.data;
        
        // Validate required data
        if (!fileData || !fileName) {
          console.error('Missing required data:', { hasFileData: !!fileData, fileName });
          return;
        }
        
        console.log('Processing page summarization:', {
          fileName,
          pageTitle,
          pageUrl,
          contentLength: pageContent?.length,
          fileDataLength: fileData.length
        });
        
        // Create file attachment from the extracted page content
        const fileAttachment: FileAttachment = {
          name: fileName,
          type: 'text/plain',
          size: fileData.length,
          url: fileData,
        };
        
        setAttachments((prev) => {
          console.log('Adding file attachment:', fileName);
          return [...prev, fileAttachment];
        });
        
        // Auto-enable search for fact-checking
        setEnableSearch(true);
        
        setTimeout(() => {
          const textarea = document.querySelector('textarea[placeholder="Send a message..."]') as HTMLTextAreaElement;
          textarea?.focus();
        }, 100);
        
        console.log('Page content successfully loaded for summarization');
      }
    };

    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        console.log('Google Calendar Auth success received');
        setIsCalendarConnected(true);
      }
      if (event.data?.type === 'GOOGLE_FORMS_AUTH_SUCCESS') {
        console.log('Google Forms Auth success received');
        setIsFormsConnected(true);
      }
      if (event.data?.type === 'GOOGLE_TASKS_AUTH_SUCCESS') {
        console.log('Google Tasks Auth success received');
        setIsTasksConnected(true);
      }
      if (event.data?.type === 'GITHUB_AUTH_SUCCESS') {
        console.log('GitHub Auth success received');
        setIsGithubConnected(true);
      }
    };
    
    console.log('Adding message event listener');
    window.addEventListener('message', handleExtensionMessage);
    window.addEventListener('message', handleAuthMessage);
    
    // Check for any pending summarization data that arrived before the listener was ready
    if ((window as any).__agent0PendingSummarization) {
      console.log('Found pending summarization data, processing now...');
      const pendingData = (window as any).__agent0PendingSummarization;
      delete (window as any).__agent0PendingSummarization;
      
      // Process the pending data
      setTimeout(() => {
        handleExtensionMessage({
          origin: window.location.origin,
          data: {
            type: 'AGENT0_SUMMARIZE_PAGE',
            data: pendingData
          }
        } as MessageEvent);
      }, 100);
    }
    
    console.log('Extension message listener is ready');
    
    return () => {
      console.log('Removing message event listener');
      window.removeEventListener('message', handleExtensionMessage);
      window.removeEventListener('message', handleAuthMessage);
    };
  }, [setAttachments, setInputValue, setIsCalendarConnected, setIsFormsConnected, setIsTasksConnected, setEnableSearch, setIsGithubConnected]);
}
