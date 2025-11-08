"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  MessageCircle,
  X,
  BookOpen,
  Send,
  CircleUserRound,
  Upload,
  Trash,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { getStoreSuggestions, getStoreAnswer } from "@/app/utils/storeData";

// ============ Types ============
type Role = "user" | "ai";
interface ChatMessage {
  role: Role;
  text: string;
  timestamp: Date;
}

type MsgTextPart = { type: "text"; text: string };
type MsgImagePart = { type: "image_url"; image_url: { url: string } };
type MsgPart = MsgTextPart | MsgImagePart;

type OAIMessage =
  | { role: "system"; content: MsgPart[] }
  | { role: "user"; content: MsgPart[] }
  | { role: "assistant"; content: MsgPart[] };

// ============ Helpers ============
function toOpenAIMessages(
  history: ChatMessage[],
  imageUrl?: string
): OAIMessage[] {
  const msgs: OAIMessage[] = history.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: [{ type: "text", text: m.text }],
  }));

  if (imageUrl) {
    const last = msgs.length > 0 ? msgs[msgs.length - 1] : null;
    if (last && last.role === "user") {
      last.content.push({ type: "image_url", image_url: { url: imageUrl } });
    }
  }
  return msgs;
}

function normalizeAssistantContent(content: any): string {
  if (typeof content === "string") return content as string;
  if (Array.isArray(content)) {
    return content
      .map((c: any) =>
        c?.type === "text" && typeof c?.text === "string" ? c.text : ""
      )
      .join("\n");
  }
  return "";
}

function detectLanguage(text: string): string {
  const t = text.trim();
  if (!t) return "en";
  if (/[අ-ෆ]/.test(t)) return "si";
  if (/[அ-ஹ]/.test(t)) return "ta";
  if (/[ऀ-ॿ]/.test(t)) return "hi";
  if (/[ぁ-ゟ゠-ヿ]/.test(t)) return "ja";
  if (/[가-힣]/.test(t)) return "ko";
  if (/[А-Яа-я]/.test(t)) return "ru";
  if (/[áéíóúñü¿¡]/i.test(t)) return "es";
  if (/[çâêûôàèùëïüœæ]/i.test(t)) return "fr";
  if (/[äöüß]/i.test(t)) return "de";
  return "en";
}

async function translateClient(text: string, target: string): Promise<string> {
  try {
    const r = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, target }),
    });
    if (!r.ok) return text;
    const { translated } = await r.json();
    return typeof translated === "string" ? translated : text;
  } catch {
    return text;
  }
}

async function callVLM(messages: OAIMessage[], lang: string): Promise<string> {
  const systemLanguageHint: MsgTextPart = {
    type: "text",
    text: `Always reply in ${lang}. If the user mixes languages, prefer ${lang}. Use concise markdown.`,
  };
  const system: OAIMessage = { role: "system", content: [systemLanguageHint] };

  const r = await fetch("/api/vlm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "Qwen/Qwen2.5-VL-7B-Instruct",
      messages: [system, ...messages],
      temperature: 0.6,
      max_tokens: 512,
    }),
  });
  if (!r.ok) throw new Error(await r.text());
  const json = await r.json();
  const content = json?.choices?.[0]?.message?.content;
  return normalizeAssistantContent(content);
}

function deriveSuggestionsFromResponseText(responseText: string): string[] {
  if (!responseText) return [];
  const lines = responseText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const candidates: string[] = [];
  for (const line of lines) {
    const isHeading = /^#{1,4}\s+/.test(line);
    const looksLikeBullet = /^[-*•]\s+/.test(line);
    const shortInfo = line.length <= 90;
    if ((isHeading || looksLikeBullet) && shortInfo) {
      const cleaned = line
        .replace(/^#{1,4}\s+/, "")
        .replace(/^[-*•]\s+/, "")
        .replace(/\*\*/g, "")
        .trim();
      if (cleaned) candidates.push(cleaned);
    }
  }
  if (candidates.length === 0) {
    const firstPara = lines.find((l) => l.length > 20) || "";
    const parts = firstPara
      .split(/[.;]/)
      .map((p) => p.trim())
      .filter((p) => p.length > 10 && p.length < 90);
    candidates.push(...parts);
  }
  const seen = new Set<string>();
  const unique = candidates.filter((c) => {
    const key = c.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.slice(0, 12);
}

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/upload", { method: "POST", body: fd });
  if (!r.ok) throw new Error(await r.text());
  const { url, error } = await r.json();
  if (error) throw new Error(error);
  return url as string;
}

// ============ Component ============
const ChatBubble: React.FC<{
  title?: string;
  welcomeMessage?: string;
  placeholder?: string;
  className?: string;
  userName?: string;
  avatar?: string;
  onError?: (e: any) => void;
  responseText?: string;
}> = ({
  title = "Zeus Assistant",
  welcomeMessage = "Hi! Ask about hours, returns, tracking, shipping, sizes, locations, or latest collections.",
  placeholder = "Type your question...",
  className = "",
  userName = "You",
  avatar,
  onError,
  responseText = "",
}) => {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const useVLM = pathname === "/zeusAssistant";

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Suggestions
  const hasAnalysis = useMemo(
    () => !!responseText && responseText.trim().length > 0,
    [responseText]
  );
  const poolSuggestions = useMemo(() => {
    if (useVLM) {
      if (!hasAnalysis) return [];
      const staticAdvanced = [
        "Suggest 3 alternative color palettes that complement my skin tone and explain why.",
        "Recommend silhouette adjustments to balance my proportions (tops, bottoms, hemlines).",
        "Curate a 7‑piece capsule with mix‑and‑match outfit pairings.",
        "Give fabric and construction guidelines to prefer vs. avoid and why.",
        "Propose accessory rules (scale, metal tones, textures) with do's and don'ts.",
        "Create occasion‑based outfits (work, date night, smart‑casual) from this analysis.",
        "Translate this style into seasonal updates with layering strategies.",
        "Provide a shopping checklist with priorities and budget tiers (save vs. invest).",
        "Suggest print/pattern scales that suit my frame, plus 3 references to search.",
        "Offer tailoring notes (shoulder, sleeve, waist, hem) for ideal fit.",
        "Convert this look into streetwear/minimal/classic variants—what changes?",
        "Give maintenance care tips for the recommended fabrics.",
      ];
      const derived = deriveSuggestionsFromResponseText(responseText!);
      const seen = new Set<string>();
      return [...staticAdvanced, ...derived]
        .filter((s) => {
          const k = s.toLowerCase();
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .slice(0, 24);
    }
    return getStoreSuggestions();
  }, [useVLM, hasAnalysis, responseText]);

  const [suggestionsQueue, setSuggestionsQueue] =
    useState<string[]>(poolSuggestions);
  const [visibleSuggestions, setVisibleSuggestions] = useState<string[]>(
    poolSuggestions.slice(0, 4)
  );
  const [showSuggestions, setShowSuggestions] = useState(true);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const arr = poolSuggestions ?? [];
    setSuggestionsQueue(arr);
    setVisibleSuggestions(arr.slice(0, 4));
  }, [poolSuggestions]);

  const rotateSuggestions = () => {
    if (suggestionsQueue.length <= 4) {
      setVisibleSuggestions(suggestionsQueue);
      return;
    }
    const nextQueue = suggestionsQueue
      .slice(4)
      .concat(suggestionsQueue.slice(0, 4));
    setSuggestionsQueue(nextQueue);
    setVisibleSuggestions(nextQueue.slice(0, 4));
  };

  const peekSuggestions = (n: number): string[] => {
    if (suggestionsQueue.length === 0) return [];
    return suggestionsQueue.slice(0, Math.min(n, suggestionsQueue.length));
  };

  const handleFilePick = () => fileInputRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type.startsWith("image/")) {
      setAttachedImage(f);
      setAttachedPreview(URL.createObjectURL(f));
    }
  };
  const clearImage = () => {
    setAttachedImage(null);
    if (attachedPreview) URL.revokeObjectURL(attachedPreview);
    setAttachedPreview("");
  };

  const handleChatSend = async () => {
    if ((!chatInput.trim() && !attachedImage) || chatLoading) return;

    const userText = chatInput.trim();
    const lang = detectLanguage(userText || "hi");
    const userMessageText = userText || "(image attached)";
    const userMessage: ChatMessage = {
      role: "user",
      text: userMessageText,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setChatLoading(true);
    setShowSuggestions(false);

    try {
      let imageUrl: string | undefined;
      if (useVLM && attachedImage) imageUrl = await uploadImage(attachedImage);

      let aiText = "";
      if (useVLM) {
        const historyMessages = toOpenAIMessages(
          [...chatMessages, userMessage],
          imageUrl
        );
        aiText = await callVLM(historyMessages, lang);
      } else {
        let useAI = false;
        let storeAnswer = "";
        if (userText) {
          storeAnswer = getStoreAnswer(userText);
          const isUnknown =
            storeAnswer.includes(
              "I'm not sure about that specific information"
            ) ||
            storeAnswer.toLowerCase().includes("contact our customer service");
          useAI = isUnknown;
        } else useAI = true;
        if (!useAI) {
          aiText =
            lang === "en"
              ? storeAnswer
              : await translateClient(storeAnswer, lang);
        } else {
          const historyMessages = toOpenAIMessages(
            [...chatMessages, userMessage],
            imageUrl
          );
          aiText = await callVLM(historyMessages, lang);
        }
      }

      const aiMessage: ChatMessage = {
        role: "ai",
        text: aiText || "…",
        timestamp: new Date(),
      };
      setTimeout(() => {
        setChatMessages((prev) => [...prev, aiMessage]);
        setChatLoading(false);
        rotateSuggestions();
        setShowSuggestions(true);
      }, 250);
    } catch (e: any) {
      console.error("Chat error:", e);
      onError?.(e);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Sorry, there was an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
      setChatLoading(false);
    } finally {
      clearImage();
    }
  };

  const handleSuggestionClick = (s: string) => {
    setChatInput(s);
    inputRef.current?.focus();
  };

  if (!mounted) return null;

  const routeWelcome = useVLM
    ? "Fashion pro mode: Ask deeper style questions, upload a look for analysis, or request refined recommendations."
    : welcomeMessage;

  const showTopSuggestions =
    showSuggestions &&
    chatMessages.length === 0 &&
    !chatLoading &&
    visibleSuggestions.length > 0 &&
    (!useVLM || (useVLM && hasAnalysis));

  // ============ Mobile Full-Screen View ============
  if (useVLM && isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex top-12 h-[70vh] flex-col m-2 pb-10 rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl border border-amber-500/20 backdrop-blur-xl">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-600/5 pointer-events-none"></div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 relative z-10 scrollbar-thin scrollbar-thumb-amber-500/30 scrollbar-track-transparent">
          {chatMessages.length === 0 && (
            <div className="text-center py-8 px-4 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-amber-500/10 backdrop-blur-sm">
              <div className="flex justify-center mb-3">
                <div className="p-3 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-slate-200 text-sm font-medium leading-relaxed">
                {routeWelcome}
              </p>
              {!responseText && (
                <p className="text-slate-400 text-xs mt-3 leading-relaxed">
                  Upload an outfit image and ask a question to get started.
                </p>
              )}
            </div>
          )}

          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              } animate-fade-in`}
            >
              {msg.role === "ai" && (
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/20">
                  <Image
                    src="/logo.jpg"
                    alt="AI"
                    width={36}
                    height={36}
                    className="object-cover"
                  />
                </div>
              )}

              <div className="flex flex-col max-w-[82%]">
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg backdrop-blur-sm ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-tr-md shadow-amber-500/30"
                      : "bg-gradient-to-br from-slate-800/90 to-slate-900/90 text-slate-100 rounded-tl-md border border-slate-700/50"
                  }`}
                >
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
                <span
                  className={`text-[10px] text-slate-400 mt-1.5 font-medium ${
                    msg.role === "user" ? "text-right" : "text-left"
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>

                {msg.role === "ai" && peekSuggestions(3).length > 0 && (
                  <div className="mt-3">
                    <p className="text-slate-400 text-[10px] mb-2 font-medium uppercase tracking-wide">
                      Continue with:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {peekSuggestions(3).map((s, i) => (
                        <button
                          key={`${idx}-inline-${i}`}
                          onClick={() => handleSuggestionClick(s)}
                          className="bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 rounded-xl px-3 py-1.5 text-[11px] transition-all border border-slate-700/50 hover:border-amber-500/30 hover:shadow-md hover:shadow-amber-500/10 active:scale-95"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center flex-shrink-0 shadow-lg border border-slate-600/30">
                  <CircleUserRound className="w-5 h-5 text-slate-300" />
                </div>
              )}
            </div>
          ))}

          {chatLoading && (
            <div className="flex items-center gap-3 animate-fade-in">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <BookOpen size={18} className="text-white animate-pulse" />
              </div>
              <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl px-5 py-3 border border-slate-700/50 shadow-lg">
                <div className="flex space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500/70 animate-bounce"></div>
                  <div
                    className="w-2 h-2 rounded-full bg-amber-500/70 animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-amber-500/70 animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {showTopSuggestions && (
            <div className="mt-2 text-center animate-fade-in">
              <p className="text-slate-400 text-xs mb-3 font-medium uppercase tracking-wide">
                Suggested questions
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {visibleSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
                    className="bg-slate-800/50 hover:bg-slate-700/70 text-slate-200 rounded-xl px-3 py-2 text-xs transition-all border border-slate-700/50 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 active:scale-95"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-700/50 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl p-4 relative z-10">
          {attachedPreview && (
            <div className="mb-3 flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <img
                src={attachedPreview}
                alt="preview"
                className="h-16 w-16 object-cover rounded-lg border-2 border-amber-500/30 shadow-md"
              />
              <button
                onClick={clearImage}
                className="px-3 py-1.5 text-xs rounded-lg bg-red-600/80 hover:bg-red-600 text-white flex items-center gap-1.5 transition-all shadow-md hover:shadow-lg active:scale-95"
                title="Remove image"
              >
                <Trash size={14} /> Remove
              </button>
            </div>
          )}

          <form
            className="flex items-end bg-slate-800/50 rounded-2xl border border-slate-700/50 focus-within:border-amber-500/50 focus-within:shadow-lg focus-within:shadow-amber-500/10 transition-all backdrop-blur-sm"
            onSubmit={(e) => {
              e.preventDefault();
              handleChatSend();
            }}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="ml-2 mb-2 p-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-amber-400 transition-all active:scale-95"
              title="Attach image"
            >
              <Upload size={18} />
            </button>
            <textarea
              ref={inputRef}
              className="flex-1 px-3 py-3 bg-transparent text-slate-100 text-sm focus:outline-none resize-none placeholder:text-slate-500"
              placeholder={placeholder}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatLoading}
              rows={1}
              style={{ minHeight: "44px", maxHeight: "120px" }}
            />
            <button
              type="submit"
              className={`mr-2 mb-2 p-2.5 rounded-xl transition-all ${
                (chatInput.trim() || attachedImage) && !chatLoading
                  ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 active:scale-95"
                  : "bg-slate-700/30 text-slate-600"
              }`}
              disabled={chatLoading || (!chatInput.trim() && !attachedImage)}
            >
              <Send size={18} />
            </button>
          </form>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />

          <div className="flex justify-center mt-3">
            <p className="text-slate-500 text-[10px] font-medium">
              Powered by Qwen2.5‑VL via HF Router
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============ Desktop Bubble View ============
  return (
    <div
      className={`fixed z-50 bottom-6 right-6 flex flex-col items-end ${className}`}
    >
      {open ? (
        <div className="w-[440px] max-w-[90vw] rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-amber-500/30 shadow-2xl shadow-amber-500/20 animate-fade-in backdrop-blur-xl">
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-600/5 pointer-events-none"></div>

          {/* Header */}
          <div className="relative flex justify-between items-center px-5 py-4 bg-gradient-to-r from-slate-900/95 to-slate-800/95 border-b border-slate-700/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 ring-2 ring-amber-400/20">
                <Image
                  src="/logo.jpg"
                  alt="AI"
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
              </div>
              <div>
                <span className="font-bold text-amber-400 text-lg tracking-tight">
                  {useVLM ? "Zeus Fashion Assistant" : "Zeus Store Helper"}
                </span>
                <p className="text-slate-400 text-[10px] font-medium">
                  Always here to help
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-xl hover:bg-slate-700/50 transition-all active:scale-95 group"
              aria-label="Close chat"
            >
              <X
                size={20}
                className="text-slate-400 group-hover:text-amber-400 transition-colors"
              />
            </button>
          </div>

          {/* Messages */}
          <div className="max-h-[480px] min-h-[340px] overflow-y-auto px-5 py-5 bg-gradient-to-br from-slate-900/50 to-slate-800/50 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-amber-500/30 scrollbar-track-transparent relative">
            {chatMessages.length === 0 && (
              <div className="mb-4 py-6 px-5 rounded-2xl bg-gradient-to-br from-slate-800/70 to-slate-900/70 border border-amber-500/10 backdrop-blur-sm">
                <div className="flex justify-center mb-3">
                  <div className="p-3 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-slate-200 text-sm text-center font-medium leading-relaxed">
                  {routeWelcome}
                </p>
                {useVLM && !responseText && (
                  <p className="text-slate-400 text-xs mt-3 text-center leading-relaxed">
                    Upload an outfit image and ask a question to get started.
                  </p>
                )}
              </div>
            )}

            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                } mb-2 animate-fade-in`}
              >
                {msg.role === "ai" && (
                  <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/20 mt-1">
                    <Image
                      src="/logo.jpg"
                      alt="AI"
                      width={36}
                      height={36}
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="flex flex-col max-w-[300px]">
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg backdrop-blur-sm ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-tr-md shadow-amber-500/30"
                        : "bg-gradient-to-br from-slate-800/90 to-slate-900/90 text-slate-100 rounded-tl-md border border-slate-700/50"
                    }`}
                  >
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] text-slate-400 mt-1.5 font-medium ${
                      msg.role === "user" ? "text-right" : "text-left ml-1"
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>

                  {msg.role === "ai" && peekSuggestions(3).length > 0 && (
                    <div className="mt-3 ml-1">
                      <p className="text-slate-400 text-[10px] mb-2 font-medium uppercase tracking-wide">
                        Continue with:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {peekSuggestions(3).map((s, i) => (
                          <button
                            key={`${idx}-inline-${i}`}
                            onClick={() => handleSuggestionClick(s)}
                            className="bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 rounded-xl px-3 py-1.5 text-[11px] transition-all border border-slate-700/50 hover:border-amber-500/30 hover:shadow-md hover:shadow-amber-500/10 active:scale-95"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center flex-shrink-0 shadow-lg border border-slate-600/30 mt-1">
                    <CircleUserRound className="w-5 h-5 text-slate-300" />
                  </div>
                )}
              </div>
            ))}

            {chatLoading && (
              <div className="flex items-center gap-3 animate-fade-in">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <BookOpen size={18} className="text-white animate-pulse" />
                </div>
                <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl px-5 py-3 border border-slate-700/50 shadow-lg">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500/70 animate-bounce"></div>
                    <div
                      className="w-2 h-2 rounded-full bg-amber-500/70 animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 rounded-full bg-amber-500/70 animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {showTopSuggestions && (
              <div className="mt-2 mb-2 animate-fade-in">
                <p className="text-slate-400 text-xs mb-3 ml-1 font-medium uppercase tracking-wide">
                  Suggested questions
                </p>
                <div className="flex flex-wrap gap-2">
                  {visibleSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(s)}
                      className="bg-slate-800/50 hover:bg-slate-700/70 text-slate-200 rounded-xl px-3 py-2 text-xs transition-all border border-slate-700/50 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 active:scale-95"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-700/50 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl p-4 relative">
            {attachedPreview && (
              <div className="mb-3 flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <img
                  src={attachedPreview}
                  alt="preview"
                  className="h-16 w-16 object-cover rounded-lg border-2 border-amber-500/30 shadow-md"
                />
                <button
                  onClick={clearImage}
                  className="px-3 py-1.5 text-xs rounded-lg bg-red-600/80 hover:bg-red-600 text-white flex items-center gap-1.5 transition-all shadow-md hover:shadow-lg active:scale-95"
                  title="Remove image"
                >
                  <Trash size={14} /> Remove
                </button>
              </div>
            )}

            <form
              className="flex items-end bg-slate-800/50 rounded-2xl border border-slate-700/50 focus-within:border-amber-500/50 focus-within:shadow-lg focus-within:shadow-amber-500/10 transition-all backdrop-blur-sm"
              onSubmit={(e) => {
                e.preventDefault();
                handleChatSend();
              }}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="ml-2 mb-2 p-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-amber-400 transition-all active:scale-95"
                title="Attach image"
              >
                <Upload size={18} />
              </button>
              <textarea
                ref={inputRef}
                className="flex-1 px-3 py-3 bg-transparent text-slate-100 text-sm focus:outline-none resize-none placeholder:text-slate-500"
                placeholder={placeholder}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatLoading}
                rows={1}
                style={{ minHeight: "44px", maxHeight: "120px" }}
              />
              <button
                type="submit"
                className={`mr-2 mb-2 p-2.5 rounded-xl transition-all ${
                  (chatInput.trim() || attachedImage) && !chatLoading
                    ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 active:scale-95"
                    : "bg-slate-700/30 text-slate-600"
                }`}
                disabled={chatLoading || (!chatInput.trim() && !attachedImage)}
              >
                <Send size={18} />
              </button>
            </form>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />

            <div className="flex justify-center mt-3">
              <p className="text-slate-500 text-[10px] font-medium">
                {useVLM
                  ? "Powered by Qwen2.5‑VL via HF Router"
                  : "Powered by store knowledge"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="group relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-2xl shadow-amber-500/40 hover:shadow-amber-500/60 hover:scale-110 transition-all duration-300 border-2 border-amber-400/30 overflow-hidden"
          aria-label="Open chat"
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-amber-600/20 animate-pulse"></div>

          {/* Icon with glow effect */}
          <div className="relative">
            <MessageCircle
              size={32}
              className="text-white drop-shadow-lg group-hover:scale-110 transition-transform duration-300"
            />
          </div>

          {/* Notification badge (optional - can be conditionally rendered) */}
          <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 shadow-lg"></div>
        </button>
      )}
    </div>
  );
};

export default dynamic(() => Promise.resolve(ChatBubble), { ssr: false });
