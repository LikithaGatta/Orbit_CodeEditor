"use client";

import type React from "react";
import { createPortal } from "react-dom";
import { useState, useEffect, useRef } from "react";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

import {
  Loader2,
  Send,
  User,
  Copy,
  X,
  Code,
  Sparkles,
  MessageSquare,
  RefreshCw,
  Settings,
  Zap,
  Brain,
  Search,
  Filter,
  Download,
} from "lucide-react";

import { cn } from "@/lib/utils";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import "katex/dist/katex.min.css";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  id: string;
  timestamp: Date;
  type?:
    | "chat"
    | "code_review"
    | "suggestion"
    | "error_fix"
    | "optimization";
  tokens?: number;
  model?: string;
}

interface AIChatSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MessageTypeIndicator: React.FC<{
  type?: string;
  model?: string;
  tokens?: number;
}> = ({ type, model, tokens }) => {
  const getTypeConfig = (messageType?: string) => {
    switch (messageType) {
      case "code_review":
        return {
          icon: Code,
          color: "text-blue-400",
          label: "Code Review",
        };

      case "suggestion":
        return {
          icon: Sparkles,
          color: "text-purple-400",
          label: "Suggestion",
        };

      case "error_fix":
        return {
          icon: RefreshCw,
          color: "text-red-400",
          label: "Error Fix",
        };

      case "optimization":
        return {
          icon: Zap,
          color: "text-yellow-400",
          label: "Optimization",
        };

      default:
        return {
          icon: MessageSquare,
          color: "text-zinc-400",
          label: "Chat",
        };
    }
  };

  const config = getTypeConfig(type);
  const Icon = config.icon;

  return (
    <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-1">
        <Icon className={cn("h-3 w-3 shrink-0", config.color)} />

        <span
          className={cn(
            "truncate text-xs font-medium",
            config.color
          )}
        >
          {config.label}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2 text-xs text-zinc-500">
        {model && (
          <span className="max-w-[120px] truncate">
            {model}
          </span>
        )}

        {tokens && <span>{tokens} tokens</span>}
      </div>
    </div>
  );
};

export const AIChatSidePanel: React.FC<AIChatSidePanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [chatMode, setChatMode] = useState<
    "chat" | "review" | "fix" | "optimize"
  >("chat");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [autoSave, setAutoSave] = useState(true);
  const [streamResponse, setStreamResponse] = useState(true);

  const [model, setModel] = useState<string>("llama3.2");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [messages, isLoading]);

  const getChatModePrompt = (
    mode: string,
    content: string
  ): string => {
    switch (mode) {
      case "review":
        return `Please review this code and provide detailed suggestions for improvement, including performance, security, and best practices:

**Request:**
${content}`;

      case "fix":
        return `Please help fix issues in this code, including bugs, errors, and potential problems:

**Problem:**
${content}`;

      case "optimize":
        return `Please analyze this code for performance optimizations and suggest improvements:

**Code to optimize:**
${content}`;

      default:
        return content;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) {
      return;
    }

    const messageType =
      chatMode === "chat"
        ? "chat"
        : chatMode === "review"
          ? "code_review"
          : chatMode === "fix"
            ? "error_fix"
            : "optimization";

    const userContent = input.trim();

    const newMessage: ChatMessage = {
      role: "user",
      content: userContent,
      timestamp: new Date(),
      id: `${Date.now()}-user`,
      type: messageType,
    };

    setMessages((previousMessages) => [
      ...previousMessages,
      newMessage,
    ]);

    setInput("");
    setIsLoading(true);

    try {
      const contextualMessage = getChatModePrompt(
        chatMode,
        userContent
      );

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: contextualMessage,
          history: messages.slice(-10).map((message) => ({
            role: message.role,
            content: message.content,
          })),
          stream: streamResponse,
          mode: chatMode,
          model,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Request failed with status ${response.status}`
        );
      }

      const data = await response.json();

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: "assistant",
          content:
            data.response ||
            "I received an empty response from the AI service.",
          timestamp: new Date(),
          id: `${Date.now()}-assistant`,
          type: messageType,
          tokens: data.tokens,
          model: data.model || model,
        },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: "assistant",
          content:
            "I'm having trouble connecting right now. Please check that your AI service is running and try again.",
          timestamp: new Date(),
          id: `${Date.now()}-error`,
          type: "chat",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const exportChat = () => {
    const chatData = {
      messages,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob(
      [JSON.stringify(chatData, null, 2)],
      {
        type: "application/json",
      }
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `ai-chat-${
      new Date().toISOString().split("T")[0]
    }.json`;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
  };

  const filteredMessages = messages
    .filter((message) => {
      if (filterType === "all") {
        return true;
      }

      return message.type === filterType;
    })
    .filter((message) => {
      if (!searchTerm.trim()) {
        return true;
      }

      return message.content
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    });

  /*
   * Render the panel directly into document.body.
   *
   * This prevents the AI panel from being clipped by:
   * - overflow-hidden parent containers
   * - resizable panels
   * - editor stacking contexts
   * - WebContainer layout containers
   */
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <TooltipProvider>
      <div className="pointer-events-none fixed inset-0 z-[99999]">
        {/* AI Side Panel */}
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Enhanced AI Assistant"
          className="
            pointer-events-auto
            absolute
            right-0
            top-0
            flex
            h-[100dvh]
            w-full
            min-w-0
            flex-col
            overflow-hidden
            border-l
            border-zinc-800
            bg-zinc-950
            shadow-2xl
            sm:w-[50vw]
            sm:max-w-[760px]
          "
        >
          {/* Header */}
          <div className="shrink-0 border-b border-zinc-800 bg-zinc-900/95">
            {/* Header Top Row */}
            <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-4 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-900">
                  <Image
                    src="/ollama-logo.svg"
                    alt="Orbit Logo"
                    width={26}
                    height={26}
                  />
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-zinc-100 sm:text-lg">
                    AI Assistant
                  </h2>

                  <p className="text-xs text-zinc-400 sm:text-sm">
                    {messages.length} messages
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="AI assistant settings"
                      className="
                        h-8
                        w-8
                        p-0
                        text-zinc-400
                        hover:bg-zinc-800
                        hover:text-zinc-100
                      "
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    className="z-[100000]"
                  >
                    <DropdownMenuCheckboxItem
                      checked={autoSave}
                      onCheckedChange={setAutoSave}
                    >
                      Auto-save conversations
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuCheckboxItem
                      checked={streamResponse}
                      onCheckedChange={setStreamResponse}
                    >
                      Stream responses
                    </DropdownMenuCheckboxItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={exportChat}>
                      <Download className="mr-2 h-4 w-4" />
                      Export Chat
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setMessages([])}
                    >
                      Clear All Messages
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  aria-label="Close AI assistant"
                  className="
                    h-8
                    w-8
                    p-0
                    text-zinc-400
                    hover:bg-zinc-800
                    hover:text-zinc-100
                  "
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Chat Mode Tabs */}
            <div className="overflow-x-auto px-4 pb-3 sm:px-5">
              <Tabs
                value={chatMode}
                onValueChange={(value) =>
                  setChatMode(
                    value as
                      | "chat"
                      | "review"
                      | "fix"
                      | "optimize"
                  )
                }
              >
                <TabsList className="grid h-9 w-full min-w-[300px] grid-cols-4 bg-zinc-800/80">
                  <TabsTrigger
                    value="chat"
                    className="flex items-center justify-center gap-1 text-xs"
                  >
                    <MessageSquare className="h-3 w-3" />
                    Chat
                  </TabsTrigger>

                  <TabsTrigger
                    value="review"
                    className="flex items-center justify-center gap-1 text-xs"
                  >
                    <Code className="h-3 w-3" />
                    Review
                  </TabsTrigger>

                  <TabsTrigger
                    value="fix"
                    className="flex items-center justify-center gap-1 text-xs"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Fix
                  </TabsTrigger>

                  <TabsTrigger
                    value="optimize"
                    className="flex items-center justify-center gap-1 text-xs"
                  >
                    <Zap className="h-3 w-3" />
                    Optimize
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Controls */}
            <div className="flex min-w-0 flex-wrap items-center gap-2 px-4 pb-4 sm:px-5">
              <div className="flex min-w-0 shrink-0 items-center gap-2 text-xs text-zinc-400">
                <span className="text-zinc-500">
                  Model:
                </span>

                <select
                  value={model}
                  onChange={(event) =>
                    setModel(event.target.value)
                  }
                  className="
                    h-8
                    max-w-[130px]
                    rounded-md
                    border
                    border-zinc-700
                    bg-zinc-900
                    px-2
                    text-xs
                    text-zinc-200
                    outline-none
                    focus:border-blue-500
                    focus:ring-1
                    focus:ring-blue-500
                  "
                >
                  <option value="llama3.2">
                    llama3.2
                  </option>

                  <option value="codellama">
                    codellama
                  </option>

                  <option value="llama2">
                    llama2
                  </option>
                </select>
              </div>

              <div className="relative min-w-[120px] flex-1">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" />

                <Input
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                  className="
                    h-8
                    w-full
                    min-w-0
                    border-zinc-700/50
                    bg-zinc-800/50
                    pl-7
                    text-xs
                    text-zinc-100
                    placeholder:text-zinc-500
                  "
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Filter messages"
                    className="
                      h-8
                      w-8
                      shrink-0
                      p-0
                      text-zinc-400
                      hover:bg-zinc-800
                      hover:text-zinc-100
                    "
                  >
                    <Filter className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="z-[100000]"
                >
                  <DropdownMenuItem
                    onClick={() => setFilterType("all")}
                  >
                    All Messages
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setFilterType("chat")}
                  >
                    Chat Only
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setFilterType("code_review")}
                  >
                    Code Reviews
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setFilterType("error_fix")}
                  >
                    Error Fixes
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setFilterType("optimization")}
                  >
                    Optimizations
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages */}
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-zinc-950">
            <div className="mx-auto w-full max-w-3xl space-y-5 p-4 sm:p-5">
              {filteredMessages.length === 0 && !isLoading && (
                <div className="py-10 text-center text-zinc-500 sm:py-16">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900">
                    <Brain className="h-7 w-7 text-zinc-400" />
                  </div>

                  <h3 className="mb-2 text-lg font-semibold text-zinc-300">
                    Enhanced AI Assistant
                  </h3>

                  <p className="mx-auto mb-5 max-w-md text-sm leading-relaxed text-zinc-400">
                    Ask questions, review code, fix errors, or
                    improve your application.
                  </p>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[
                      "Review my React component for performance",
                      "Fix TypeScript compilation errors",
                      "Optimize database query performance",
                      "Add comprehensive error handling",
                      "Implement security best practices",
                      "Refactor code for better maintainability",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setInput(suggestion)}
                        className="
                          rounded-lg
                          bg-zinc-800
                          px-3
                          py-2
                          text-left
                          text-sm
                          text-zinc-300
                          transition-colors
                          hover:bg-zinc-700
                        "
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "group flex min-w-0 items-start gap-2 sm:gap-3",
                    message.role === "user"
                      ? "justify-end"
                      : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 sm:h-9 sm:w-9">
                      <Brain className="h-4 w-4 text-zinc-400 sm:h-5 sm:w-5" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "min-w-0 max-w-[calc(100%-44px)] overflow-hidden rounded-xl shadow-sm sm:max-w-[85%]",
                      message.role === "user"
                        ? "rounded-br-md bg-zinc-900/70 p-3 text-white sm:p-4"
                        : "rounded-bl-md border border-zinc-800/50 bg-zinc-900/80 p-3 text-zinc-100 backdrop-blur-sm sm:p-4"
                    )}
                  >
                    {message.role === "assistant" && (
                      <MessageTypeIndicator
                        type={message.type}
                        model={message.model}
                        tokens={message.tokens}
                      />
                    )}

                    <div className="prose prose-invert prose-sm max-w-none break-words [overflow-wrap:anywhere]">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          code: ({
                            children,
                            className,
                            ...props
                          }) => {
                            const isInline =
                              !className?.includes("language-");

                            if (isInline) {
                              return (
                                <code
                                  {...props}
                                  className="rounded bg-zinc-800 px-1 py-0.5 text-sm"
                                >
                                  {children}
                                </code>
                              );
                            }

                            return (
                              <div className="my-3 max-w-full overflow-hidden rounded-lg bg-zinc-800 p-3 sm:p-4">
                                <pre className="max-w-full overflow-x-auto text-xs text-zinc-100 sm:text-sm">
                                  <code
                                    className={className}
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                </pre>
                              </div>
                            );
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>

                    <div className="mt-3 flex min-w-0 items-center justify-between gap-2 border-t border-zinc-700/30 pt-2">
                      <div className="shrink-0 text-[10px] text-zinc-500 sm:text-xs">
                        {message.timestamp.toLocaleTimeString()}
                      </div>

                      <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigator.clipboard.writeText(
                              message.content
                            )
                          }
                          className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-200"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setInput(message.content)
                          }
                          className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-200"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 shrink-0 border border-zinc-700 bg-zinc-800 sm:h-9 sm:w-9">
                      <AvatarFallback className="bg-zinc-700 text-zinc-300">
                        <User className="h-4 w-4 sm:h-5 sm:w-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex min-w-0 items-start gap-2 sm:gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 sm:h-9 sm:w-9">
                    <Brain className="h-4 w-4 text-zinc-400 sm:h-5 sm:w-5" />
                  </div>

                  <div className="flex min-w-0 max-w-full items-center gap-3 rounded-xl rounded-bl-md border border-zinc-800/50 bg-zinc-900/80 p-4">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-400" />

                    <span className="text-sm text-zinc-300">
                      {chatMode === "review"
                        ? "Analyzing code structure and patterns..."
                        : chatMode === "fix"
                          ? "Identifying issues and solutions..."
                          : chatMode === "optimize"
                            ? "Analyzing performance bottlenecks..."
                            : "Processing your request..."}
                    </span>
                  </div>
                </div>
              )}

              <div
                ref={messagesEndRef}
                className="h-1"
              />
            </div>
          </div>

          {/* Input */}
          <form
            onSubmit={handleSendMessage}
            className="
              shrink-0
              border-t
              border-zinc-800
              bg-zinc-900/95
              p-3
              backdrop-blur-sm
              sm:p-4
            "
          >
            <div className="flex min-w-0 items-end gap-2 sm:gap-3">
              <div className="relative min-w-0 flex-1">
                <Textarea
                  placeholder={
                    chatMode === "chat"
                      ? "Ask about your code or paste code to analyze..."
                      : chatMode === "review"
                        ? "Describe what you'd like me to review..."
                        : chatMode === "fix"
                          ? "Describe the issue you're experiencing..."
                          : "Describe what you'd like me to optimize..."
                  }
                  value={input}
                  onChange={(event) =>
                    setInput(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      (event.metaKey || event.ctrlKey)
                    ) {
                      event.preventDefault();
                      handleSendMessage(event as any);
                    }
                  }}
                  disabled={isLoading}
                  className="
                    min-h-[44px]
                    max-h-32
                    resize-none
                    border-zinc-700/50
                    bg-zinc-800/50
                    pr-12
                    text-zinc-100
                    placeholder:text-zinc-500
                    focus:border-blue-500
                    focus:ring-blue-500/20
                  "
                  rows={1}
                />

                <div className="absolute bottom-3 right-3">
                  <kbd className="hidden rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-500 sm:inline-block">
                    ⌘↵
                  </kbd>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="
                  h-11
                  w-11
                  shrink-0
                  bg-blue-600
                  p-0
                  text-white
                  transition-colors
                  hover:bg-blue-700
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  sm:w-auto
                  sm:px-4
                "
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}

                <span className="sr-only sm:not-sr-only sm:ml-2">
                  Send
                </span>
              </Button>
            </div>
          </form>
        </aside>
      </div>
    </TooltipProvider>,
    document.body
  );
};