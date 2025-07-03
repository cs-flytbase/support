"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { 
  MessageCircle, 
  Plus, 
  Send, 
  Paperclip, 
  ArrowUp, 
  Square, 
  X,
  Menu,
  Trash2,
  Edit3,
  MoreHorizontal,
  Sparkles
} from "lucide-react";
import { useState, useRef, useEffect, createContext, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Types
interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: Message[];
}

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface AssetCard {
  id: string;
  title: string;
  description: string;
  type: "code" | "document" | "image" | "data";
  content: string;
  createdAt: Date;
}

// Sidebar Context
interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

// Prompt Input Components
type PromptInputContextType = {
  isLoading: boolean;
  value: string;
  setValue: (value: string) => void;
  maxHeight: number | string;
  onSubmit?: () => void;
  disabled?: boolean;
};

const PromptInputContext = createContext<PromptInputContextType>({
  isLoading: false,
  value: "",
  setValue: () => {},
  maxHeight: 240,
  onSubmit: undefined,
  disabled: false,
});

function usePromptInput() {
  const context = useContext(PromptInputContext);
  if (!context) {
    throw new Error("usePromptInput must be used within a PromptInput");
  }
  return context;
}

type PromptInputProps = {
  isLoading?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  maxHeight?: number | string;
  onSubmit?: () => void;
  children: React.ReactNode;
  className?: string;
};

function PromptInput({
  className,
  isLoading = false,
  maxHeight = 240,
  value,
  onValueChange,
  onSubmit,
  children,
}: PromptInputProps) {
  const [internalValue, setInternalValue] = useState(value || "");

  const handleChange = (newValue: string) => {
    setInternalValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <TooltipProvider>
      <PromptInputContext.Provider
        value={{
          isLoading,
          value: value ?? internalValue,
          setValue: onValueChange ?? handleChange,
          maxHeight,
          onSubmit,
        }}
      >
        <div
          className={cn(
            "border border-neutral-700 bg-neutral-800 rounded-3xl p-2 shadow-xs",
            className
          )}
        >
          {children}
        </div>
      </PromptInputContext.Provider>
    </TooltipProvider>
  );
}

export type PromptInputTextareaProps = {
  disableAutosize?: boolean;
} & React.ComponentProps<typeof Textarea>;

function PromptInputTextarea({
  className,
  onKeyDown,
  disableAutosize = false,
  ...props
}: PromptInputTextareaProps) {
  const { value, setValue, maxHeight, onSubmit, disabled } = usePromptInput();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (disableAutosize) return;
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height =
      typeof maxHeight === "number"
        ? `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`
        : `min(${textareaRef.current.scrollHeight}px, ${maxHeight})`;
  }, [value, maxHeight, disableAutosize]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
    onKeyDown?.(e);
  };

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      className={cn(
        "text-white min-h-[44px] w-full resize-none border-none bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
        className
      )}
      rows={1}
      disabled={disabled}
      {...props}
    />
  );
}

type PromptInputActionsProps = React.HTMLAttributes<HTMLDivElement>;

function PromptInputActions({
  children,
  className,
  ...props
}: PromptInputActionsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      {children}
    </div>
  );
}

type PromptInputActionProps = {
  className?: string;
  tooltip: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
} & React.ComponentProps<typeof Tooltip>;

function PromptInputAction({
  tooltip,
  children,
  className,
  side = "top",
  ...props
}: PromptInputActionProps) {
  const { disabled } = usePromptInput();

  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild disabled={disabled}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className={cn("bg-neutral-700 text-white border-neutral-600", className)}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

// Main Chat Interface Component
function ChatInterface() {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [leftSidebarView, setLeftSidebarView] = useState<"chats" | "assets">("chats");
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const [chats, setChats] = useState<Chat[]>([
    {
      id: "1",
      title: "React Components Help",
      lastMessage: "How do I create a reusable button component?",
      timestamp: new Date(),
      messages: [
        {
          id: "1",
          content: "How do I create a reusable button component?",
          role: "user",
          timestamp: new Date(),
        },
        {
          id: "2",
          content: "I'll help you create a reusable button component in React. Here's a comprehensive example...",
          role: "assistant",
          timestamp: new Date(),
        },
      ],
    },
    {
      id: "2",
      title: "TypeScript Best Practices",
      lastMessage: "What are some TypeScript best practices?",
      timestamp: new Date(Date.now() - 3600000),
      messages: [],
    },
  ]);
  
  const [activeChat, setActiveChat] = useState<string>("1");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [assets, setAssets] = useState<AssetCard[]>([
    {
      id: "1",
      title: "Button Component",
      description: "Reusable React button component with TypeScript",
      type: "code",
      content: "export const Button = ({ children, ...props }) => { return <button {...props}>{children}</button>; }",
      createdAt: new Date(),
    },
    {
      id: "2",
      title: "API Documentation",
      description: "REST API endpoints documentation",
      type: "document",
      content: "# API Documentation\n\n## Endpoints\n\n### GET /api/users\nReturns list of users...",
      createdAt: new Date(Date.now() - 1800000),
    },
  ]);

  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (input.trim() || files.length > 0) {
      setIsLoading(true);
      
      // Add user message
      const newMessage: Message = {
        id: Date.now().toString(),
        content: input,
        role: "user",
        timestamp: new Date(),
      };

      setChats(prev => prev.map(chat => 
        chat.id === activeChat 
          ? { ...chat, messages: [...chat.messages, newMessage], lastMessage: input }
          : chat
      ));

      // Simulate AI response
      setTimeout(() => {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: "I understand your question. Let me help you with that...",
          role: "assistant",
          timestamp: new Date(),
        };

        setChats(prev => prev.map(chat => 
          chat.id === activeChat 
            ? { ...chat, messages: [...chat.messages, aiResponse] }
            : chat
        ));

        setIsLoading(false);
        setInput("");
        setFiles([]);
      }, 2000);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (uploadInputRef?.current) {
      uploadInputRef.current.value = "";
    }
  };

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: "New Chat",
      lastMessage: "",
      timestamp: new Date(),
      messages: [],
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChat(newChat.id);
  };

  const addAsset = () => {
    const newAsset: AssetCard = {
      id: Date.now().toString(),
      title: "New Asset",
      description: "Click to edit description",
      type: "document",
      content: "",
      createdAt: new Date(),
    };
    setAssets(prev => [newAsset, ...prev]);
  };

  const removeAsset = (id: string) => {
    setAssets(prev => prev.filter(asset => asset.id !== id));
  };

  const filteredAssets = assets.filter(asset =>
    asset.title.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
    asset.description.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
    asset.content.toLowerCase().includes(assetSearchQuery.toLowerCase())
  );

  const currentChat = chats.find(chat => chat.id === activeChat);

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Left Sidebar - Chat List */}
      <SidebarProvider open={leftSidebarOpen} setOpen={setLeftSidebarOpen}>
        <motion.div
          className="bg-neutral-900 border-r border-neutral-800 flex flex-col"
          animate={{ width: leftSidebarOpen ? "300px" : "60px" }}
          transition={{ duration: 0.3 }}
        >
          <div className="p-4 border-b border-neutral-800">
            <div className="flex items-center justify-between">
              {leftSidebarOpen && (
                <h2 className="text-lg font-semibold text-white">
                  {leftSidebarView === "chats" ? "Chats" : "Assets"}
                </h2>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:text-white hover:bg-neutral-800"
                onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
            {leftSidebarOpen && (
              <>
                <div className="flex gap-1 mt-3 p-1 bg-neutral-800 rounded-lg">
                  <Button
                    variant={leftSidebarView === "chats" ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "flex-1 h-8 rounded-md",
                      leftSidebarView === "chats" 
                        ? "bg-white text-black hover:bg-gray-200" 
                        : "text-white hover:text-white hover:bg-neutral-700"
                    )}
                    onClick={() => setLeftSidebarView("chats")}
                  >
                    Chats
                  </Button>
                  <Button
                    variant={leftSidebarView === "assets" ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "flex-1 h-8 rounded-md",
                      leftSidebarView === "assets" 
                        ? "bg-white text-black hover:bg-gray-200" 
                        : "text-white hover:text-white hover:bg-neutral-700"
                    )}
                    onClick={() => setLeftSidebarView("assets")}
                  >
                    Assets
                  </Button>
                </div>
                {leftSidebarView === "chats" ? (
                  <Button
                    onClick={createNewChat}
                    className="w-full mt-3 bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700 rounded-lg"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Chat
                  </Button>
                ) : (
                  <div className="mt-3 space-y-2">
                    <Input
                      placeholder="Search assets..."
                      value={assetSearchQuery}
                      onChange={(e) => setAssetSearchQuery(e.target.value)}
                      className="w-full bg-neutral-800 border-neutral-700 text-white placeholder-gray-500 rounded-lg"
                    />
                    <Button
                      onClick={addAsset}
                      className="w-full bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700 rounded-lg"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Asset
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
          
          <ScrollArea className="flex-1 h-0">
            <div className="p-2">
              {leftSidebarView === "chats" ? (
                chats.map((chat) => (
                  <motion.div
                    key={chat.id}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer mb-2 transition-colors",
                      activeChat === chat.id 
                        ? "bg-neutral-800 border border-neutral-700" 
                        : "hover:bg-neutral-800"
                    )}
                    onClick={() => setActiveChat(chat.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {leftSidebarOpen ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <MessageCircle className="h-4 w-4 text-white" />
                          <h3 className="font-medium text-sm truncate text-white">{chat.title}</h3>
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {chat.lastMessage || "No messages yet"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {chat.timestamp.toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        <MessageCircle className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </motion.div>
                ))
              ) : (
                filteredAssets.map((asset) => (
                  <motion.div
                    key={asset.id}
                    className="p-3 rounded-lg cursor-pointer mb-2 hover:bg-neutral-800 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {leftSidebarOpen ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            asset.type === "code" && "bg-blue-500",
                            asset.type === "document" && "bg-green-500",
                            asset.type === "image" && "bg-purple-500",
                            asset.type === "data" && "bg-orange-500"
                          )} />
                          <h3 className="font-medium text-sm truncate text-white">{asset.title}</h3>
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {asset.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {asset.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          asset.type === "code" && "bg-blue-500",
                          asset.type === "document" && "bg-green-500",
                          asset.type === "image" && "bg-purple-500",
                          asset.type === "data" && "bg-orange-500"
                        )} />
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </motion.div>
      </SidebarProvider>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-black">
        {/* Chat Header */}
        <div className="border-b border-neutral-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-white" />
              <h1 className="text-xl font-semibold text-white">
                {currentChat?.title || "Select a chat"}
              </h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:text-white hover:bg-neutral-800"
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4 bg-black h-0">
          <div className="space-y-4 max-w-4xl mx-auto">
            {currentChat?.messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] p-4 rounded-2xl",
                    message.role === "user"
                      ? "bg-neutral-200 text-black"
                      : "bg-neutral-800 text-white"
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-neutral-800 p-4 rounded-2xl">
                  <div className="flex space-x-1">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-neutral-800 bg-black">
          <div className="max-w-4xl mx-auto">
            <PromptInput
              value={input}
              onValueChange={setInput}
              isLoading={isLoading}
              onSubmit={handleSubmit}
              className="w-full"
            >
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="bg-neutral-700 flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                    >
                      <Paperclip className="size-4 text-white" />
                      <span className="max-w-[120px] truncate text-white">{file.name}</span>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="hover:bg-neutral-600 rounded-full p-1 text-white hover:text-white"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <PromptInputTextarea placeholder="Ask me anything..." />

              <PromptInputActions className="flex items-center justify-between gap-2 pt-2">
                <PromptInputAction tooltip="Attach files">
                  <label
                    htmlFor="file-upload"
                    className="hover:bg-neutral-700 flex h-8 w-8 cursor-pointer items-center justify-center rounded-2xl"
                  >
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <Paperclip className="text-white size-5" />
                  </label>
                </PromptInputAction>

                <PromptInputAction
                  tooltip={isLoading ? "Stop generation" : "Send message"}
                >
                  <Button
                    variant="default"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-white hover:bg-gray-200 text-black"
                    onClick={handleSubmit}
                  >
                    {isLoading ? (
                      <Square className="size-5 fill-current" />
                    ) : (
                      <ArrowUp className="size-5" />
                    )}
                  </Button>
                </PromptInputAction>
              </PromptInputActions>
            </PromptInput>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Artifacts */}
      <AnimatePresence>
        {rightSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "350px", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-neutral-900 border-l border-neutral-800 flex flex-col h-full"
          >
            <div className="p-4 border-b border-neutral-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-white">Assets</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:text-white hover:bg-neutral-800"
                  onClick={() => setRightSidebarOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Button
                onClick={addAsset}
                className="w-full bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700 rounded-lg"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Card
              </Button>
            </div>
            
            <ScrollArea className="flex-1 h-0">
              <div className="p-4 space-y-4">
                {assets.map((asset) => (
                  <motion.div
                    key={asset.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    layout
                  >
                    <Card className="group hover:shadow-md transition-shadow bg-neutral-800 border-neutral-700 rounded-xl">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm font-medium break-words text-white">
                              {asset.title}
                            </CardTitle>
                            <CardDescription className="text-xs mt-1 break-words text-gray-400">
                              {asset.description}
                            </CardDescription>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-gray-400 hover:text-white hover:bg-neutral-700"
                            onClick={() => removeAsset(asset.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                          <span className="capitalize">{asset.type}</span>
                          <span>{asset.createdAt.toLocaleDateString()}</span>
                        </div>
                        {asset.content && (
                          <div className="mt-2 p-3 bg-neutral-700 rounded text-xs font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto text-gray-300">
                            {asset.content.length > 200 
                              ? `${asset.content.substring(0, 200)}...` 
                              : asset.content
                            }
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Demo() {
  return <ChatInterface />;
}