'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftIcon, CheckIcon, DownloadIcon, SearchIcon, WrenchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { SerializableToolExtension } from '@/lib/tool-registry';

const STORAGE_KEY = 'agent0-installed-tools';

export default function Marketplace() {
  const [availableTools, setAvailableTools] = useState<SerializableToolExtension[]>([]);
  const [installedTools, setInstalledTools] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch available tools from API
    fetch('/api/tools/available')
      .then((res) => res.json())
      .then((data) => {
        setAvailableTools(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch tools:', err);
        setLoading(false);
      });

    // Load installed tools from localStorage
    const installed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    setInstalledTools(installed);
  }, []);

  const installTool = (toolId: string) => {
    const updated = [...installedTools, toolId];
    setInstalledTools(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const uninstallTool = (toolId: string) => {
    const updated = installedTools.filter((id) => id !== toolId);
    setInstalledTools(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const filteredTools = availableTools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon className="size-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <WrenchIcon className="size-6 text-primary" />
            <h1 className="text-xl font-bold">Tool Marketplace</h1>
          </div>
          <Badge variant="secondary" className="ml-2">
            {availableTools.length} tools
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 flex gap-4">
          <Card className="flex-1 max-w-xs">
            <CardHeader className="pb-2">
              <CardDescription>Installed</CardDescription>
              <CardTitle className="text-3xl">{installedTools.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="flex-1 max-w-xs">
            <CardHeader className="pb-2">
              <CardDescription>Available</CardDescription>
              <CardTitle className="text-3xl">{availableTools.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tools Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="size-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.3s]" />
              <span className="size-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.15s]" />
              <span className="size-2 rounded-full bg-foreground/40 animate-bounce" />
            </div>
          </div>
        ) : filteredTools.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <WrenchIcon className="size-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No tools found</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTools.map((tool, index) => {
              const isInstalled = installedTools.includes(tool.id);
              
              return (
                <motion.div
                  key={tool.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="h-full flex flex-col">
                    <CardHeader className="flex-1">
                      <div className="flex items-start gap-3">
                        {tool.icon && (
                          <span className="text-3xl shrink-0">{tool.icon}</span>
                        )}
                        <div className="min-w-0">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            {tool.name}
                            {isInstalled && (
                              <Badge variant="outline" className="text-xs">
                                <CheckIcon className="size-3 mr-1" />
                                Installed
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {tool.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardFooter className="pt-0">
                      {isInstalled ? (
                        <Button
                          variant="outline"
                          onClick={() => uninstallTool(tool.id)}
                          className="w-full"
                        >
                          Uninstall
                        </Button>
                      ) : (
                        <Button
                          onClick={() => installTool(tool.id)}
                          className="w-full"
                        >
                          <DownloadIcon className="size-4 mr-2" />
                          Install
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-12 rounded-lg border bg-muted/30 p-6">
          <h2 className="font-semibold mb-2">How to use tools</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Install the tools you want to use from this marketplace</li>
            <li>Go back to the chat and type <code className="bg-muted px-1.5 py-0.5 rounded">@</code> to see available tools</li>
            <li>Select a tool to add it to your message</li>
            <li>The AI will automatically use the tool when appropriate</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
