"use client";

import { useState } from "react";
import { 
  FileTextIcon, 
  CheckIcon, 
  XIcon,
  Loader2Icon,
  PlusIcon,
  TrashIcon,
  ExternalLinkIcon,
  ListIcon,
  TextIcon,
  CircleDotIcon,
  CheckSquareIcon,
  ChevronDownIcon,
  GaugeIcon,
  CalendarIcon,
  ClockIcon,
  SparklesIcon,
  GripVerticalIcon,
  CopyIcon,
  CheckCheckIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "motion/react";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type QuestionType = 
  | "SHORT_ANSWER"
  | "PARAGRAPH"
  | "MULTIPLE_CHOICE"
  | "CHECKBOX"
  | "DROPDOWN"
  | "LINEAR_SCALE"
  | "DATE"
  | "TIME";

interface Question {
  title: string;
  type: QuestionType;
  required?: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  index?: number;
}

interface FormData {
  title: string;
  description: string;
  questions: Question[];
}

interface CreatedFormResult {
  formId: string;
  title: string;
  responderUri: string;
  questionCount: number;
}

interface FormCreationConfirmationProps {
  toolCallId: string;
  formData: FormData;
  reasoning: string;
}

const QUESTION_TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
  SHORT_ANSWER: <TextIcon className="w-4 h-4" />,
  PARAGRAPH: <ListIcon className="w-4 h-4" />,
  MULTIPLE_CHOICE: <CircleDotIcon className="w-4 h-4" />,
  CHECKBOX: <CheckSquareIcon className="w-4 h-4" />,
  DROPDOWN: <ChevronDownIcon className="w-4 h-4" />,
  LINEAR_SCALE: <GaugeIcon className="w-4 h-4" />,
  DATE: <CalendarIcon className="w-4 h-4" />,
  TIME: <ClockIcon className="w-4 h-4" />,
};

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  SHORT_ANSWER: "Short Answer",
  PARAGRAPH: "Paragraph",
  MULTIPLE_CHOICE: "Multiple Choice",
  CHECKBOX: "Checkboxes",
  DROPDOWN: "Dropdown",
  LINEAR_SCALE: "Linear Scale",
  DATE: "Date",
  TIME: "Time",
};

/**
 * Component to display Form ID with copy functionality
 * This helps users save the form ID for checking responses later
 */
function FormIdDisplay({ formId }: { formId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy form ID:", err);
    }
  };

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Form ID (save this to check responses later)</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          {copied ? (
            <>
              <CheckCheckIcon className="h-3.5 w-3.5" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <CopyIcon className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <code className="block text-xs font-mono bg-background/50 rounded px-2 py-1.5 break-all select-all">
        {formId}
      </code>
      <p className="text-[11px] text-muted-foreground/70">
        💡 Tip: Say <span className="font-medium">&quot;@forms check responses for {formId.substring(0, 8)}...&quot;</span> to fetch new submissions
      </p>
    </div>
  );
}

export function FormCreationConfirmation({
  toolCallId,
  formData,
  reasoning,
}: FormCreationConfirmationProps) {
  const [form, setForm] = useState<FormData>({
    title: formData.title || "",
    description: formData.description || "",
    questions: formData.questions || [],
  });
  
  const [status, setStatus] = useState<"pending" | "creating" | "created" | "rejected" | "error">("pending");
  const [createdForm, setCreatedForm] = useState<CreatedFormResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFormChange = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
    setForm(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      ),
    }));
  };

  const handleAddOption = (questionIndex: number) => {
    setForm(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === questionIndex 
          ? { ...q, options: [...(q.options || []), `Option ${(q.options?.length || 0) + 1}`] }
          : q
      ),
    }));
  };

  const handleRemoveOption = (questionIndex: number, optionIndex: number) => {
    setForm(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === questionIndex 
          ? { ...q, options: q.options?.filter((_, oi) => oi !== optionIndex) }
          : q
      ),
    }));
  };

  const handleAddQuestion = () => {
    setForm(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          title: "",
          type: "SHORT_ANSWER" as QuestionType,
          required: false,
        },
      ],
    }));
  };

  const handleRemoveQuestion = (index: number) => {
    setForm(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  const handleConfirm = async () => {
    setStatus("creating");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/forms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          questions: form.questions,
        }),
      });

      const result = await response.json();

      if (result.error) {
        setStatus("error");
        setErrorMessage(result.message || "Failed to create form");
      } else {
        setStatus("created");
        setCreatedForm({
          formId: result.formId,
          title: result.title || form.title,
          responderUri: result.responderUri,
          questionCount: result.questionCount || form.questions.length,
        });
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to create form");
    }
  };

  const handleReject = () => {
    setStatus("rejected");
  };

  const isValid = form.title && form.questions.length > 0 && form.questions.every(q => q.title);

  // Show created form success state
  if (status === "created" && createdForm) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-lg my-4 not-prose"
      >
        <div className="rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/5 via-green-500/3 to-transparent backdrop-blur-sm shadow-lg overflow-hidden">
          <div className="border-b border-green-500/10 bg-gradient-to-br from-green-500/5 to-transparent p-4">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="p-2 rounded-lg bg-green-500/10 text-green-600 ring-1 ring-green-500/20"
              >
                <CheckIcon className="w-5 h-5" />
              </motion.div>
              <div className="flex-1">
                <h3 className="font-semibold text-base text-green-700 dark:text-green-400">Form Created Successfully</h3>
                <p className="text-xs text-green-600/70 dark:text-green-500/70 mt-0.5">Ready to collect responses</p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <h4 className="font-semibold text-lg">{createdForm.title}</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileTextIcon className="h-4 w-4" />
              <span>{createdForm.questionCount} question{createdForm.questionCount !== 1 ? 's' : ''}</span>
            </div>
            
            {/* Form ID Section - for checking responses later */}
            <FormIdDisplay formId={createdForm.formId} />
            
            {createdForm.responderUri && (
              <Button variant="outline" size="sm" className="w-full mt-4 gap-2" asChild>
                <a href={createdForm.responderUri} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon className="h-4 w-4" />
                  Open Form
                </a>
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Show rejected state
  if (status === "rejected") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg my-4 not-prose"
      >
        <div className="rounded-xl border border-muted bg-muted/5 p-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <XIcon className="w-5 h-5" />
            <span>Form creation cancelled</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Show error state
  if (status === "error") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg my-4 not-prose"
      >
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-center gap-3 text-destructive">
            <XIcon className="w-5 h-5" />
            <span>{errorMessage || "Failed to create form"}</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3"
            onClick={() => setStatus("pending")}
          >
            Try Again
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-full max-w-2xl my-4 not-prose"
    >
      <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-purple-500/3 to-transparent backdrop-blur-sm shadow-lg overflow-hidden">
        {/* Header */}
        <div className="border-b border-purple-500/10 bg-gradient-to-br from-purple-500/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 ring-1 ring-purple-500/20">
              <FileTextIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">Review Form</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Review and edit before creating</p>
            </div>
          </div>
        </div>

        {/* AI Reasoning */}
        {reasoning && (
          <div className="px-4 pt-4">
            <ChainOfThought defaultOpen={false}>
              <ChainOfThoughtHeader>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <SparklesIcon className="w-4 h-4" />
                  <span>AI Reasoning</span>
                </div>
              </ChainOfThoughtHeader>
              <ChainOfThoughtContent>
                <ChainOfThoughtStep label="Inferred Structure">
                  {reasoning}
                </ChainOfThoughtStep>
              </ChainOfThoughtContent>
            </ChainOfThought>
          </div>
        )}

        {/* Form Content */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="form-title">Form Title</Label>
            <Input
              id="form-title"
              value={form.title}
              onChange={(e) => handleFormChange("title", e.target.value)}
              placeholder="Enter form title"
              className="bg-background/50"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="form-description">Description (optional)</Label>
            <Textarea
              id="form-description"
              value={form.description}
              onChange={(e) => handleFormChange("description", e.target.value)}
              placeholder="Enter form description"
              className="bg-background/50 min-h-[60px]"
            />
          </div>

          {/* Questions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Questions ({form.questions.length})</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddQuestion}
                className="gap-1"
              >
                <PlusIcon className="w-3 h-3" />
                Add Question
              </Button>
            </div>

            <AnimatePresence mode="popLayout">
              {form.questions.map((question, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  layout
                  className="rounded-lg border border-border/50 bg-background/30 p-3 space-y-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex items-center gap-1 text-muted-foreground mt-2">
                      <GripVerticalIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">{index + 1}.</span>
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <Input
                        value={question.title}
                        onChange={(e) => handleQuestionChange(index, "title", e.target.value)}
                        placeholder="Question text"
                        className="bg-background/50"
                      />
                      
                      <div className="flex items-center gap-2">
                        <Select
                          value={question.type}
                          onValueChange={(value) => handleQuestionChange(index, "type", value)}
                        >
                          <SelectTrigger className="w-[180px] bg-background/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((type) => (
                              <SelectItem key={type} value={type}>
                                <div className="flex items-center gap-2">
                                  {QUESTION_TYPE_ICONS[type]}
                                  <span>{QUESTION_TYPE_LABELS[type]}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={question.required || false}
                            onChange={(e) => handleQuestionChange(index, "required", e.target.checked)}
                            className="rounded border-muted"
                          />
                          Required
                        </label>
                      </div>

                      {/* Options for choice questions */}
                      {(question.type === "MULTIPLE_CHOICE" || 
                        question.type === "CHECKBOX" || 
                        question.type === "DROPDOWN") && (
                        <div className="space-y-2 pl-4 border-l-2 border-muted">
                          {(question.options || ["Option 1", "Option 2"]).map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              <div className="w-4 h-4 flex items-center justify-center text-muted-foreground">
                                {question.type === "CHECKBOX" ? (
                                  <CheckSquareIcon className="w-3 h-3" />
                                ) : (
                                  <CircleDotIcon className="w-3 h-3" />
                                )}
                              </div>
                              <Input
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...(question.options || [])];
                                  newOptions[optIndex] = e.target.value;
                                  handleQuestionChange(index, "options", newOptions);
                                }}
                                className="flex-1 h-8 bg-background/50"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveOption(index, optIndex)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              >
                                <XIcon className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddOption(index)}
                            className="text-muted-foreground"
                          >
                            <PlusIcon className="w-3 h-3 mr-1" />
                            Add option
                          </Button>
                        </div>
                      )}

                      {/* Scale settings */}
                      {question.type === "LINEAR_SCALE" && (
                        <div className="flex items-center gap-3 pl-4 border-l-2 border-muted">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={question.scaleMin || 1}
                              onChange={(e) => handleQuestionChange(index, "scaleMin", parseInt(e.target.value))}
                              className="w-16 h-8 bg-background/50"
                              min={0}
                              max={1}
                            />
                            <span className="text-sm text-muted-foreground">to</span>
                            <Input
                              type="number"
                              value={question.scaleMax || 5}
                              onChange={(e) => handleQuestionChange(index, "scaleMax", parseInt(e.target.value))}
                              className="w-16 h-8 bg-background/50"
                              min={2}
                              max={10}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveQuestion(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-purple-500/10 p-4 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            onClick={handleReject}
            disabled={status === "creating"}
          >
            <XIcon className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || status === "creating"}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {status === "creating" ? (
              <>
                <Loader2Icon className="w-4 h-4 mr-1 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckIcon className="w-4 h-4 mr-1" />
                Create Form
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
