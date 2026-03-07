"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UploadCloudIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type FileDropZoneProps = {
  onFilesDropped: (files: File[]) => void;
  children: React.ReactNode;
  className?: string;
  accept?: string;
};

export function FileDropZone({ 
  onFilesDropped, 
  children, 
  className,
  accept = "image/*,application/pdf,.txt,.md,.json,.csv,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.tsv,.html,.odt,.ods,.odp"
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  // Check if file type is accepted
  const isAcceptedFile = useCallback((file: File) => {
    if (!accept) return true;
    
    const acceptTypes = accept.split(",").map(t => t.trim());
    const fileType = file.type;
    const nameParts = file.name.split(".");
    const fileExtension = nameParts.length > 1 ? `.${nameParts.pop()?.toLowerCase()}` : "";
    
    return acceptTypes.some(acceptType => {
      if (acceptType.startsWith(".")) {
        // Extension match - skip if file has no extension
        if (!fileExtension) return false;
        return fileExtension === acceptType.toLowerCase();
      } else if (acceptType.endsWith("/*")) {
        // Wildcard match (e.g., image/*)
        const typePrefix = acceptType.replace("/*", "");
        return fileType.startsWith(typePrefix);
      } else {
        // Exact MIME type match
        return fileType === acceptType;
      }
    });
  }, [accept]);

  // Generate human-readable file types description from accept prop
  const getSupportedTypesDescription = useCallback(() => {
    if (!accept) return "All files are supported";
    
    const acceptTypes = accept.split(",").map(t => t.trim());
    const typeNames: string[] = [];
    
    acceptTypes.forEach(t => {
      if (t === "image/*") typeNames.push("Images");
      else if (t === "application/pdf") typeNames.push("PDFs");
      else if (t.startsWith(".")) typeNames.push(t.toUpperCase().slice(1) + " files");
      else if (t.startsWith("text/")) typeNames.push("Text files");
    });
    
    // Remove duplicates and join
    const unique = [...new Set(typeNames)];
    if (unique.length === 0) return "Various file types are supported";
    return unique.join(", ") + " are supported";
  }, [accept]);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    
    // Check if it's a file being dragged
    if (e.dataTransfer?.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const validFiles = Array.from(files).filter(isAcceptedFile);
      if (validFiles.length > 0) {
        onFilesDropped(validFiles);
      }
    }
  }, [onFilesDropped, isAcceptedFile]);

  useEffect(() => {
    // Add event listeners to the window for global drag and drop
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return (
    <div className={cn("relative", className)}>
      {children}
      
      {/* Full-page drop overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col items-center gap-4 p-12 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <UploadCloudIcon className="size-16 text-primary" />
              </motion.div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-foreground">
                  Drop files here
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {getSupportedTypesDescription()}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
