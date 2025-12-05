"use client";

import { useEffect, useState, useRef } from "react";
import { 
  PromptInput,
  PromptInputProvider,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputAttachments,
  PromptInputAttachment,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  PromptInputTools,
  type PromptInputMessage,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";

// Chrome extension types
interface ChromeStorage {
  local: {
    get: (keys: string[], callback: (result: any) => void) => void;
    remove: (keys: string[]) => void;
  };
}

declare global {
  interface Window {
    chrome?: {
      storage?: ChromeStorage;
    };
  }
}

interface ScreenshotContext {
  screenshot: string;
  pageUrl: string;
  pageTitle: string;
  selectedText?: string | null;
  timestamp: number;
}

export default function Home() {
  const [screenshotContext, setScreenshotContext] = useState<ScreenshotContext | null>(null);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string; files?: any[] }>>([]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 font-sans dark:from-black dark:to-zinc-900 p-4">
      <main className="flex h-[90vh] w-full max-w-5xl flex-col bg-white dark:bg-zinc-950 rounded-xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 bg-white dark:bg-zinc-900">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Agent0 AI Assistant
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Screenshot-enhanced conversations
          </p>
        </div>

        {/* Conversation Area */}
        <div className="flex-1 overflow-hidden">
          <Conversation className="h-full">
            <ConversationContent className="px-6 py-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div className="space-y-3 max-w-md">
                    <div className="text-6xl mb-4">🤖</div>
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                      Welcome to Agent0
                    </h2>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      Use <kbd className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono">
                        Ctrl+Shift+S
                      </kbd> in your browser to capture screenshots and ask questions about them.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <Message key={idx} from={msg.role}>
                    <MessageContent>
                      {msg.files && msg.files.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {msg.files.map((file, fileIdx) => (
                            <img
                              key={fileIdx}
                              src={file.url}
                              alt={file.filename}
                              className="max-w-sm rounded-lg border border-zinc-200 dark:border-zinc-700"
                            />
                          ))}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </MessageContent>
                  </Message>
                ))
              )}
            </ConversationContent>
          </Conversation>
        </div>

        {/* Input Area */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <PromptInputProvider>
            <InputWithScreenshot 
              screenshotContext={screenshotContext}
              setScreenshotContext={setScreenshotContext}
              onSubmit={(message: PromptInputMessage) => {
                const files = [...message.files];
                
                // Build context message
                let contextMessage = message.text;
                if (screenshotContext) {
                  const parts = [`Screenshot from: ${screenshotContext.pageTitle}`];
                  parts.push(`URL: ${screenshotContext.pageUrl}`);
                  if (screenshotContext.selectedText) {
                    parts.push(`Selected text: "${screenshotContext.selectedText}"`);
                  }
                  contextMessage = `${parts.join('\n')}\n\n${message.text || 'What can you tell me about this screenshot?'}`;
                }

                // Add user message
                setMessages(prev => [...prev, { 
                  role: "user", 
                  content: contextMessage,
                  files 
                }]);

                // Clear screenshot context after use
                setScreenshotContext(null);

                // TODO: Integrate with your AI backend
                setTimeout(() => {
                  setMessages(prev => [...prev, {
                    role: "assistant",
                    content: "I can see your screenshot. How can I help you with it?"
                  }]);
                }, 1000);
              }}
            />
          </PromptInputProvider>
        </div>
      </main>
    </div>
  );
}

// Component to handle screenshot detection and input
function InputWithScreenshot({ 
  screenshotContext, 
  setScreenshotContext,
  onSubmit 
}: { 
  screenshotContext: ScreenshotContext | null;
  setScreenshotContext: (ctx: ScreenshotContext | null) => void;
  onSubmit: (message: PromptInputMessage) => void;
}) {
  const controller = usePromptInputController();
  const hasAddedScreenshot = useRef(false);

  // Reset hasAddedScreenshot flag when screenshot context is cleared
  useEffect(() => {
    if (screenshotContext === null) {
      hasAddedScreenshot.current = false;
    }
  }, [screenshotContext]);

  // Check for screenshot from browser extension
  useEffect(() => {
    const checkForScreenshot = async () => {
      const params = new URLSearchParams(window.location.search);
      const hasScreenshot = params.get('screenshot') === 'true';
      
      console.log('[Screenshot] Checking for screenshot. hasScreenshot:', hasScreenshot);
      console.log('[Screenshot] Controller available:', !!controller);
      console.log('[Screenshot] Controller.attachments:', !!controller?.attachments);

      if (hasScreenshot && typeof window !== 'undefined' && window.chrome?.storage) {
        console.log('[Screenshot] Extension storage detected, checking for screenshot...');
        setTimeout(() => {
          window.chrome!.storage!.local.get(['pendingScreenshot'], (result: any) => {
            console.log('[Screenshot] Chrome storage result:', result);
            
            if (result.pendingScreenshot) {
              const data = result.pendingScreenshot;
              
              // Verify timestamp is recent (within 5 minutes)
              const isRecent = Date.now() - data.timestamp < 5 * 60 * 1000;
              
              if (isRecent && !hasAddedScreenshot.current) {
                hasAddedScreenshot.current = true;
                setScreenshotContext(data);
                
                console.log('[Screenshot] Screenshot detected from extension:', {
                  pageTitle: data.pageTitle,
                  pageUrl: data.pageUrl,
                  hasSelectedText: !!data.selectedText
                });
                
                // Add screenshot to attachments using the blob
                try {
                  const blob = dataURLtoBlob(data.screenshot);
                  const file = new File([blob], 'screenshot.png', { type: 'image/png' });
                  
                  console.log('[Screenshot] Created file:', {
                    name: file.name,
                    type: file.type,
                    size: file.size
                  });
                  
                  // Retry logic to ensure controller is ready
                  let attempts = 0;
                  const maxAttempts = 10;
                  const tryAddFile = () => {
                    attempts++;
                    console.log(`[Screenshot] Attempt ${attempts}/${maxAttempts} to add file`);
                    
                    if (controller && controller.attachments) {
                      console.log('[Screenshot] Controller ready, adding file...');
                      controller.attachments.add([file]);
                      console.log('[Screenshot] File added successfully!');
                      console.log('[Screenshot] Current attachments count:', controller.attachments.files?.length || 0);
                    } else if (attempts < maxAttempts) {
                      console.log('[Screenshot] Controller not ready, retrying in 200ms...');
                      setTimeout(tryAddFile, 200);
                    } else {
                      console.error('[Screenshot] Failed to add file after', maxAttempts, 'attempts');
                      console.error('[Screenshot] Controller:', controller);
                      console.error('[Screenshot] Attachments:', controller?.attachments);
                    }
                  };
                  
                  setTimeout(tryAddFile, 100);
                } catch (error) {
                  console.error('Error creating file from screenshot:', error);
                }
                
                // Clean up from storage
                window.chrome!.storage!.local.remove(['pendingScreenshot']);
                
                // Clean URL
                window.history.replaceState({}, '', '/');
              }
            }
          });
        }, 500);
      }
    };

    checkForScreenshot();
  }, [controller, setScreenshotContext]);

  return (
    <PromptInput onSubmit={onSubmit} accept="image/*" multiple>
      <PromptInputAttachments>
        {(attachment) => (
          <ScreenshotAttachment 
            data={attachment} 
            screenshotContext={screenshotContext}
          />
        )}
      </PromptInputAttachments>
      
      <PromptInputTextarea placeholder="Ask about your screenshot or anything else..." />
      
      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
        </PromptInputTools>
        
        <PromptInputSubmit />
      </PromptInputFooter>
    </PromptInput>
  );
}

// Custom attachment component with screenshot context tooltip
function ScreenshotAttachment({ 
  data, 
  screenshotContext 
}: { 
  data: any;
  screenshotContext: ScreenshotContext | null;
}) {
  // Check if this is the screenshot from extension
  const isScreenshot = data.filename && data.filename.includes('screenshot.png') && screenshotContext;

  if (isScreenshot) {
    return (
      <div className="relative group">
        <PromptInputAttachment data={data} />
        {/* Tooltip with context */}
        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50 w-max max-w-xs">
          <div className="bg-zinc-900 dark:bg-zinc-800 text-white text-xs rounded-lg p-3 shadow-lg border border-zinc-700">
            <div className="space-y-1.5">
              <div className="font-semibold text-sm">{screenshotContext.pageTitle}</div>
              <div className="text-zinc-300 dark:text-zinc-400 text-xs break-all">
                {screenshotContext.pageUrl}
              </div>
              {screenshotContext.selectedText && (
                <div className="text-zinc-300 dark:text-zinc-400 italic text-xs pt-1 border-t border-zinc-700">
                  "{screenshotContext.selectedText.substring(0, 80)}{screenshotContext.selectedText.length > 80 ? '...' : ''}"
                </div>
              )}
            </div>
            {/* Arrow */}
            <div className="absolute -bottom-1 left-4 w-2 h-2 bg-zinc-900 dark:bg-zinc-800 border-r border-b border-zinc-700 transform rotate-45"></div>
          </div>
        </div>
      </div>
    );
  }

  return <PromptInputAttachment data={data} />;
}

// Helper function to convert data URL to Blob
function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
