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

// OpenAI-compatible multi-part content
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

// Language detection (simple heuristic)
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

// Extract headings/bullets from analysis to propose follow-ups
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

// Upload image via /api/upload and return a public URL
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
  responseText?: string; // pass analysis on /zeusAssistant to enable suggestions
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
  // Treat null/undefined/whitespace-only as not existing
  const hasAnalysis = useMemo(
    () => !!responseText && responseText.trim().length > 0,
    [responseText]
  );
  // Build suggestion pool (only if responseText exists on /zeusAssistant)
  const poolSuggestions = useMemo(() => {
    if (useVLM) {
      if (!hasAnalysis) return []; // no top suggestions until analysis exists
      const staticAdvanced = [
        "Suggest 3 alternative color palettes that complement my skin tone and explain why.",
        "Recommend silhouette adjustments to balance my proportions (tops, bottoms, hemlines).",
        "Curate a 7‑piece capsule with mix‑and‑match outfit pairings.",
        "Give fabric and construction guidelines to prefer vs. avoid and why.",
        "Propose accessory rules (scale, metal tones, textures) with do’s and don’ts.",
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
      const merged = [...staticAdvanced, ...derived].filter((s) => {
        const k = s.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      return merged.slice(0, 24);
    }
    return getStoreSuggestions();
  }, [useVLM, hasAnalysis, responseText]);
  // Rotate suggestions 4 at a time
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
  useEffect(() => {
    console.log(
      "hasAnalysis",
      hasAnalysis,
      "pool",
      poolSuggestions.length,
      "visible",
      visibleSuggestions.length
    );
  }, [hasAnalysis, poolSuggestions, visibleSuggestions]);

  useEffect(() => {
    if (open && messagesEndRef.current)
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    if (open && inputRef.current) inputRef.current.focus();
  }, [open, chatMessages, chatLoading]);

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
    const lang = detectLanguage(userText || "hi"); // default hint if only image

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
      if (useVLM && attachedImage) {
        imageUrl = await uploadImage(attachedImage);
      }

      let aiText = "";
      if (useVLM) {
        const historyMessages = toOpenAIMessages(
          [...chatMessages, userMessage],
          imageUrl
        );
        aiText = await callVLM(historyMessages, lang);
      } else {
        // Outside /zeusAssistant: try store first if there's text; if no text or unknown, go AI
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
        } else {
          useAI = true; // image-only on non-assistant route -> AI
        }

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

  // Top-of-thread visibility
  const showTopSuggestions =
    showSuggestions &&
    chatMessages.length === 0 &&
    !chatLoading &&
    visibleSuggestions.length > 0 &&
    (!useVLM || (useVLM && hasAnalysis));

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
              <span className="font-bold text-zeus-gold text-lg">
                {useVLM ? "Zeus Fashion Assistant" : "Zeus Store Helper"}
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-full hover:bg-zeus-gold/20 transition"
              aria-label="Close chat"
            >
              <X size={20} className="text-zeus-gold" />
            </button>
          </div>

          {/* Messages */}
          <div className="max-h-[450px] min-h-[320px] overflow-y-auto px-4 py-4 bg-zeus-charcoal flex flex-col gap-4">
            {chatMessages.length === 0 && (
              <div className="mb-4 pb-4 border-b border-zeus-silver/20">
                <p className="text-zeus-silver text-sm text-center">
                  {routeWelcome}
                </p>
                {useVLM && !responseText && (
                  <p className="text-zeus-silver/60 text-xs mt-2 text-center">
                    Upload an outfit image and ask a question to get started.
                  </p>
                )}
              </div>
            )}

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
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>

                  {/* Inline post-reply suggestions under AI answers */}
                  {msg.role === "ai" && peekSuggestions(3).length > 0 && (
                    <div className="mt-2 ml-10">
                      <p className="text-zeus-silver/60 text-[11px] mb-1">
                        Suggested next:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {peekSuggestions(3).map((s, i) => (
                          <button
                            key={`${idx}-inline-suggest-${i}`}
                            onClick={() => handleSuggestionClick(s)}
                            className="bg-zeus-navy/40 hover:bg-zeus-navy text-zeus-silver rounded-full px-2.5 py-1 text-[11px] transition-colors border border-zeus-silver/20"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-zeus-silver/30 flex items-center justify-center ml-2 mt-1 flex-shrink-0">
                    <CircleUserRound className="w-8 h-8 rounded-full" />
                  </div>
                )}
              </div>
            ))}

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

            {/* Top-of-thread suggestions (gate by responseText on /zeusAssistant) */}
            {showTopSuggestions && (
              <div className="mt-2 mb-2">
                <p className="text-zeus-silver/70 text-xs mb-2 ml-1">
                  Suggested questions:
                </p>
                <div className="flex flex-wrap gap-2">
                  {visibleSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(s)}
                      className="bg-zeus-navy/50 hover:bg-zeus-navy text-zeus-silver rounded-full px-3 py-1.5 text-xs transition-colors border border-zeus-silver/30"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input and image attach */}
          <div className="border-t border-zeus-silver/30 bg-zeus-navy/30 p-3">
            {/* Attached image preview */}
            {attachedPreview && (
              <div className="mb-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachedPreview}
                  alt="preview"
                  className="h-16 w-16 object-cover rounded-md border border-zeus-silver/30"
                />
                <button
                  onClick={clearImage}
                  className="px-2 py-1 text-xs rounded-md bg-red-600/70 hover:bg-red-600 text-white flex items-center gap-1"
                  title="Remove image"
                >
                  <Trash size={14} /> Remove
                </button>
              </div>
            )}

            <form
              className="flex items-end bg-zeus-navy/50 rounded-xl border border-zeus-silver/30 focus-within:border-zeus-gold transition-colors"
              onSubmit={(e) => {
                e.preventDefault();
                handleChatSend();
              }}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="ml-2 mb-2 p-2 rounded-md bg-zeus-navy/60 hover:bg-zeus-navy text-zeus-silver/90"
                title="Attach image"
              >
                <Upload size={18} />
              </button>
              <textarea
                ref={inputRef}
                className="flex-1 px-2 py-3 bg-transparent text-zeus-white text-sm focus:outline-none resize-none min-h-[20px] max-h-[120px]"
                placeholder={placeholder}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatLoading}
                rows={1}
                style={{ height: "auto", minHeight: "40px" }}
              />
              <div className="flex items-center pr-2">
                <button
                  type="submit"
                  className={`ml-1 p-2 rounded-full ${
                    (chatInput.trim() || attachedImage) && !chatLoading
                      ? "bg-zeus-gold text-white hover:bg-zeus-gold/80"
                      : "bg-zeus-navy/50 text-zeus-silver/50"
                  } transition-colors`}
                  disabled={
                    chatLoading || (!chatInput.trim() && !attachedImage)
                  }
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />

            <div className="flex justify-center mt-2">
              <p className="text-zeus-silver/50 text-xs">
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

export default dynamic(() => Promise.resolve(ChatBubble), { ssr: false });
