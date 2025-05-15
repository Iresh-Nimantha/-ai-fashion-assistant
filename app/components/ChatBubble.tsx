"use client";

import React, { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { MessageCircle, X, BookOpen, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface ChatBubbleProps {
  model?: any;
  analysis?: string;
  title?: string;
  welcomeMessage?: string;
  placeholder?: string;
  suggestions?: string[];
  userName?: string;
  avatar?: string;
  className?: string;
  onError?: (error: any) => void;
}

interface ChatMessage {
  role: "user" | "ai";
  text: string;
  timestamp: Date;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  model,
  analysis = "",
  title = "Zeus Fashion Assistant",
  welcomeMessage = "Welcome to Zeus Fashion! How can I help you with your shopping experience today?",
  placeholder = "Ask anything....",
  suggestions: propSuggestions,
  userName = "You",
  avatar,
  className = "",
  onError,
}) => {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();

  // Determine which suggestions to use based on the current route
  const suggestions = React.useMemo(() => {
    if (pathname === "/zeusAssistant") {
      return [
        "Give me more fashion tips",
        "Upload an outfit photo to get started!",
        "What can you tell me about my style?",
        "How can I improve my look?",
      ];
    }

    // Use prop suggestions if provided, otherwise fall back to defaults
    return (
      propSuggestions || [
        "What are your store hours?",
        "How can I track my order?",
        "What's your return policy?",
        "Do you ship internationally?",
        "What are your latest collections?",
        "How do I find my size?",
        "What are your store locations?",
      ]
    );
  }, [pathname, propSuggestions]);

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }

    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open, chatMessages, chatLoading]);

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatMessages((prev) => [
      ...prev,
      { role: "user", text: userMessage, timestamp: new Date() },
    ]);
    setChatInput("");
    setChatLoading(true);
    setShowSuggestions(false);

    try {
      // Use the analysis as context for generating a response
      // This is a simplified response mechanism based on your second code sample
      const aiResponse = `Based on the analysis: "${analysis}", here's my advice: ${generateResponse(
        userMessage
      )}`;

      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          { role: "ai", text: aiResponse, timestamp: new Date() },
        ]);
        setChatLoading(false);
      }, 1000); // Simulate a delay for AI response
    } catch (err) {
      console.error("Chat error:", err);
      if (onError) {
        onError(err);
      }
      setChatMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Sorry, there was an error processing your request. Please try again in a moment.",
          timestamp: new Date(),
        },
      ]);
      setChatLoading(false);
    }
  };

  // Simple function to generate responses based on input
  const generateResponse = (input: string) => {
    // You can expand this with more sophisticated logic
    if (input.toLowerCase().includes("size")) {
      return "Our size guides are available on each product page. Would you like me to help you find your perfect fit?";
    } else if (input.toLowerCase().includes("return")) {
      return "Our return policy allows returns within 30 days of purchase. Items must be unworn with tags attached.";
    } else if (input.toLowerCase().includes("shipping")) {
      return "We offer standard shipping (3-5 days) and express shipping (1-2 days) options. International shipping is available to most countries.";
    } else {
      return "I'm here to help with your fashion needs. Is there anything specific about our collections you'd like to know?";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setChatInput(suggestion);
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Don't render anything until mounted
  if (!mounted) {
    return null;
  }

  return (
    <div
      className={`fixed z-50 bottom-6 right-6 flex flex-col items-end ${className}`}
    >
      {open ? (
        <div className="w-[420px] max-w-[90vw] shadow-2xl rounded-2xl overflow-hidden bg-zeus-charcoal border-2 border-zeus-gold animate-fade-in-up">
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 bg-zeus-navy border-b border-zeus-silver">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-zeus-gold flex items-center justify-center mr-3">
                <Image src="/logo.jpg" alt="AI Logo" width={32} height={32} />
              </div>
              <span className="font-bold text-zeus-gold text-lg">{title}</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-full hover:bg-zeus-gold/20 transition"
              aria-label="Close chat"
            >
              <X size={20} className="text-zeus-gold" />
            </button>
          </div>

          {/* Chat Messages Area */}
          <div className="max-h-[450px] min-h-[320px] overflow-y-auto px-4 py-4 bg-zeus-charcoal flex flex-col gap-4">
            {/* Welcome Message or Analysis */}
            {chatMessages.length === 0 && (
              <div className="mb-4 pb-4 border-b border-zeus-silver/20">
                <p className="text-zeus-silver text-sm text-center">
                  {welcomeMessage}
                </p>
                {analysis && (
                  <p className="text-zeus-silver/70 text-xs mt-2 italic">
                    Analysis context loaded: {analysis.substring(0, 50)}
                    {analysis.length > 50 ? "..." : ""}
                  </p>
                )}
              </div>
            )}

            {/* Chat Messages */}
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                } mb-2`}
              >
                {msg.role === "ai" && (
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-zeus-gold flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                    <Image
                      src="/logo.jpg"
                      alt="AI Logo"
                      width={32}
                      height={32}
                    />
                  </div>
                )}
                <div className="flex flex-col">
                  <div
                    className={`rounded-2xl px-4 py-3 max-w-[280px] text-sm shadow-lg ${
                      msg.role === "user"
                        ? "bg-zeus-gold text-white rounded-tr-sm"
                        : "bg-zeus-navy text-zeus-silver rounded-tl-sm"
                    }`}
                  >
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                  <span
                    className={`text-xs text-zeus-silver/70 mt-1 ${
                      msg.role === "user" ? "text-right" : "text-left ml-2"
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-zeus-silver/30 flex items-center justify-center ml-2 mt-1 flex-shrink-0">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt="User"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-zeus-silver text-sm font-semibold">
                        {userName.charAt(0)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {chatLoading && (
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-zeus-gold flex items-center justify-center mr-2">
                  <BookOpen size={16} className="text-zeus-navy" />
                </div>
                <div className="bg-zeus-navy rounded-2xl px-4 py-3 inline-block">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-zeus-silver/60 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-zeus-silver/60 animate-pulse delay-100"></div>
                    <div className="w-2 h-2 rounded-full bg-zeus-silver/60 animate-pulse delay-200"></div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Reply Suggestions */}
            {showSuggestions && chatMessages.length === 0 && !chatLoading && (
              <div className="mt-2 mb-2">
                <p className="text-zeus-silver/70 text-xs mb-2 ml-1">
                  Suggested questions:
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="bg-zeus-navy/50 hover:bg-zeus-navy text-zeus-silver rounded-full px-3 py-1.5 text-xs transition-colors border border-zeus-silver/30"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-zeus-silver/30 bg-zeus-navy/30 p-3">
            <form
              className="flex items-end bg-zeus-navy/50 rounded-xl border border-zeus-silver/30 focus-within:border-zeus-gold transition-colors"
              onSubmit={(e) => {
                e.preventDefault();
                handleChatSend();
              }}
            >
              <textarea
                ref={inputRef}
                className="flex-1 px-2 py-3 bg-transparent text-zeus-white text-sm focus:outline-none resize-none min-h-[20px] max-h-[120px]"
                placeholder={placeholder}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={chatLoading}
                rows={1}
                style={{
                  height: "auto",
                  minHeight: "40px",
                }}
              />

              <div className="flex items-center pr-2">
                <button
                  type="submit"
                  className={`ml-1 p-2 rounded-full ${
                    chatInput.trim() && !chatLoading
                      ? "bg-zeus-gold text-white hover:bg-zeus-gold/80"
                      : "bg-zeus-navy/50 text-zeus-silver/50"
                  } transition-colors`}
                  disabled={chatLoading || !chatInput.trim()}
                >
                  <Send size={18} />
                </button>
              </div>
            </form>

            <div className="flex justify-center mt-2">
              <p className="text-zeus-silver/50 text-xs">
                Powered by AI •{" "}
                <a href="#" className="underline hover:text-zeus-gold">
                  Terms & Privacy
                </a>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="group w-16 h-16 rounded-full bg-zeus-gold flex items-center justify-center shadow-xl hover:scale-105 transition-all duration-300 hover:bg-zeus-navy border-2 border-zeus-gold"
          aria-label="Open chat"
        >
          <MessageCircle
            size={30}
            className="text-white group-hover:text-zeus-gold transition-colors"
          />
        </button>
      )}
    </div>
  );
};

// Export as a dynamic component with no SSR
export default dynamic(() => Promise.resolve(ChatBubble), {
  ssr: false,
});
