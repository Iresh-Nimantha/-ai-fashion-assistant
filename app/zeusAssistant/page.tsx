"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  ChangeEvent,
  DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  X,
  Loader2,
  Sparkles,
  LightbulbIcon,
  Camera,
  History,
  ChevronRight,
  Zap,
  Download,
  Copy,
  Check,
  RefreshCw,
  ArrowRight,
  Maximize2,
  Minimize2,
  Split,
  BookOpen,
  ImageIcon,
  Sun,
  Moon,
  Bot,
  Home,
  ArrowLeft,
} from "lucide-react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import ChatBubble from "../components/ChatBubble";
import Imagegen from "../components/Imagegen";
import FooterMenu from "../sections/FooterMenu";

interface HistoryItem {
  id: number;
  preview: string;
  response: string;
  timestamp: string;
  mode: keyof typeof ANALYSIS_MODES;
}

interface AnalysisMode {
  name: string;
  description: string;
  icon: React.ReactElement;
  prompt: string;
  maxTokens: number;
}

type AnalysisModes = {
  [K in "standard" | "professional" | "quick"]: AnalysisMode;
};

const ANALYSIS_MODES: AnalysisModes = {
  standard: {
    name: "Standard Analysis",
    description: "Complete outfit analysis with basic recommendations",
    icon: <Sparkles size={16} />,
    prompt: `Analyze this outfit/fashion image and provide detailed style recommendations, including skin tone, dress summary, body proportion tips, personalized items, and adaptive styling, using bold markdown section headings.`,
    maxTokens: 800,
  },
  professional: {
    name: "Professional Stylist",
    description: "Advanced analysis with stylist insights",
    icon: <BookOpen size={16} />,
    prompt: `As a professional stylist, provide expert-level analysis: precise style classification, advanced color theory, fabric/construction assessment, high-end styling potential, and fashion-forward recommendations.`,
    maxTokens: 1000,
  },
  quick: {
    name: "Quick Style Tips",
    description: "Fast analysis with key recommendations",
    icon: <Zap size={16} />,
    prompt: `Give a concise style analysis with four brief sections: Style Summary; Best Features (2-3 bullets); Quick Improvement Tips (2-3 bullets); Perfect For (1-2 occasions).`,
    maxTokens: 400,
  },
};

type Part =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type ChatMessage =
  | { role: "system"; content: Part[] }
  | { role: "user"; content: Part[] }
  | { role: "assistant"; content: Part[] };

// Main page component - no props needed for Next.js pages
export default function ZeusAssistantPage() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileBottomTab, setMobileBottomTab] = useState<
    "home" | "imagegen" | "chat" | null
  >(null);
  const [image, setImage] = useState<File | null>(null);
  const [responseText, setResponseText] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [styleTags, setStyleTags] = useState<string[]>([]);
  const [showTips, setShowTips] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedMode, setSelectedMode] =
    useState<keyof typeof ANALYSIS_MODES>("standard");
  const [showOptions, setShowOptions] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [activeTab, setActiveTab] = useState("upload");
  const [darkMode, setDarkMode] = useState(true);
  const [viewMode, setViewMode] = useState<"split" | "input" | "output">(
    "split"
  );

  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  const closeMobilePanel = () => {
    setMobileBottomTab(null);
    if (isMobile) setViewMode("split");
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const model = useMemo(
    () => ({ name: "Qwen2.5-VL-7B-Instruct", baseUrl: "/api/vlm" }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    async function runSample() {
      try {
        const system: ChatMessage = {
          role: "system",
          content: [
            {
              type: "text",
              text: "You are a fashion stylist. Return concise markdown with bold section headings.",
            },
          ],
        };
        const user: ChatMessage = {
          role: "user",
          content: [
            {
              type: "text",
              text: "Give a short fashion analysis template for testing.",
            },
          ],
        };
        const sample = await callVLM([system, user], 300, 0.4);
        if (!cancelled) {
          setResponseText(sample || "Style analysis ready.");
        }
      } catch (e) {
        console.error(e);
      }
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  const themeClasses = darkMode
    ? "bg-zeus-black text-zeus-white"
    : "bg-gray-100 text-gray-900";
  const cardThemeClasses = darkMode
    ? "bg-zeus-charcoal border-zeus-navy"
    : "bg-white border-gray-200";

  const handleFileSelect = (
    e: ChangeEvent<HTMLInputElement> | DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    setDragActive(false);

    let file: File | undefined;
    if ("files" in e.target && (e.target as HTMLInputElement).files?.[0]) {
      file = (e.target as HTMLInputElement).files![0];
    } else if (
      "dataTransfer" in e &&
      (e as DragEvent<HTMLDivElement>).dataTransfer?.files?.[0]
    ) {
      file = (e as DragEvent<HTMLDivElement>).dataTransfer!.files![0];
    }

    if (file && file.type.startsWith("image/")) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setActiveTab("upload");
    }
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e);
  };

  const clearImage = () => {
    setImage(null);
    setPreview("");
    setStyleTags([]);
    setResponseText("");
    setShowResults(false);
  };

  const copyToClipboard = () => {
    const textToCopy = responseText.replace(/\*\*/g, "");
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadResponse = () => {
    const element = document.createElement("a");
    const file = new Blob([responseText], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    element.download = "fashion-analysis.md";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const toggleViewMode = () => {
    if (viewMode === "split") setViewMode("output");
    else if (viewMode === "output") setViewMode("input");
    else setViewMode("split");
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setPreview(item.preview);
    setResponseText(item.response);
    setSelectedMode(item.mode);
    setShowResults(true);
    setHistoryExpanded(false);
  };

  async function uploadImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    if (!r.ok) throw new Error(await r.text());
    const { url, error } = await r.json();
    if (error) throw new Error(error);
    return url as string;
  }

  async function callVLM(
    messages: ChatMessage[],
    max_tokens: number,
    temperature: number
  ): Promise<string> {
    const r = await fetch("/api/vlm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-VL-7B-Instruct",
        messages,
        temperature,
        max_tokens,
      }),
    });
    if (!r.ok) throw new Error(await r.text());
    const json = await r.json();
    const content = json?.choices?.[0]?.message?.content;
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

  const handleSubmit = async () => {
    if (!image) return;

    setLoading(true);
    setResponseText("");
    setShowResults(false);
    setError(null);

    try {
      const imageUrl = await uploadImage(image);

      const selectedPrompt = ANALYSIS_MODES[selectedMode].prompt;
      const maxTokens = ANALYSIS_MODES[selectedMode].maxTokens;

      const systemPrompt =
        "You are a helpful fashion stylist. Analyze the image and respond in clean, structured markdown with bold section headings as requested.";

      const messages: ChatMessage[] = [
        { role: "system", content: [{ type: "text", text: systemPrompt }] },
        {
          role: "user",
          content: [
            { type: "text", text: selectedPrompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ];

      const text = await callVLM(messages, maxTokens, temperature);
      setResponseText(text);
      setShowResults(true);

      const extractedTags = text
        .split("\n")
        .filter(
          (line) =>
            (line.includes("style") ||
              line.includes("Style") ||
              line.includes("look") ||
              line.includes("fashion")) &&
            !line.includes("**") &&
            line.length < 100
        )
        .map((line) => {
          const words = line
            .replace(/[^\w\s]/gi, " ")
            .split(" ")
            .filter(
              (w) =>
                w.length > 3 &&
                ![
                  "style",
                  "with",
                  "that",
                  "this",
                  "your",
                  "would",
                  "could",
                  "should",
                ].includes(w.toLowerCase())
            );
          return words[0] || "";
        })
        .filter((tag) => tag.length > 0)
        .slice(0, 5);

      setStyleTags(extractedTags);

      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setHistory((prev) => [
        ...prev,
        {
          id: Date.now(),
          preview,
          response: text,
          timestamp,
          mode: selectedMode,
        },
      ]);

      if (isMobile) setViewMode("output");
      else setViewMode("split");
      if (isMobile && responseRef.current)
        responseRef.current.scrollIntoView({ behavior: "smooth" });
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "An error occurred while analyzing your image. Please try again."
      );
      setResponseText("");
    } finally {
      setLoading(false);
    }
  };
  const handleArrowClick = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      // Only navigate on desktop (lg breakpoint ~1024px)
      router.push("/");
    }
  };
  return (
    <div className={`min-h-screen ${themeClasses} font-zeus flex flex-col`}>
      {/* Header */}
      <header
        className={`py-3 px-4 ${
          darkMode ? "bg-zeus-navy" : "bg-white border-b border-gray-200"
        } sticky top-0 z-30 rounded-2xl mt-3`}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div>
              <ArrowLeft
                onClick={handleArrowClick}
                className={`w-6 h-6 cursor-pointer transition-transform duration-200 hover:scale-110 -ml-8 ${
                  darkMode ? "text-white" : "text-zeus-navy"
                }`}
              />
            </div>
            <div className="relative h-12 w-12 flex-shrink-0">
              <img
                src="/logo.jpg"
                alt="Zeus Logo"
                className="rounded-full object-cover h-full w-full border-2 border-zeus-gold"
              />
            </div>
            <div>
              <h1 className="text-xl zeus-heading">
                <span className="text-black">Zeus</span>
                <span className={darkMode ? "text-white" : "text-zeus-navy"}>
                  {" "}
                  Fashion Studio
                </span>
              </h1>
              <div className="flex items-center mt-1">
                <span
                  className={`inline-block w-2 h-2 rounded-full mr-1 ${
                    loading ? "bg-green-400 animate-pulse" : "bg-zeus-gold"
                  }`}
                ></span>
                <span
                  className={`text-xs ${
                    darkMode ? "text-zeus-silver" : "text-gray-500"
                  }`}
                >
                  {loading ? "Processing" : "Ready"}
                </span>
              </div>
            </div>
          </div>
          <div className="ml-6 flex items-center">
            {/* Dark Mode Toggle Button */}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* View Mode Toggle - Desktop */}
        {showResults && !isMobile && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20">
            <div
              className={`inline-flex rounded-full p-1 ${
                darkMode ? "bg-zeus-navy" : "bg-white"
              } shadow-lg`}
            >
              <button
                onClick={() => setViewMode("input")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  viewMode === "input"
                    ? "bg-zeus-gold text-white"
                    : `${darkMode ? "text-zeus-silver" : "text-gray-600"}`
                }`}
              >
                Photo
              </button>
              <button
                onClick={() => setViewMode("split")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  viewMode === "split"
                    ? "bg-zeus-gold text-white"
                    : `${darkMode ? "text-zeus-silver" : "text-gray-600"}`
                }`}
              >
                Split
              </button>
              <button
                onClick={() => setViewMode("output")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  viewMode === "output"
                    ? "bg-zeus-gold text-white"
                    : `${darkMode ? "text-zeus-silver" : "text-gray-600"}`
                }`}
              >
                Results
              </button>
            </div>
          </div>
        )}

        {/* Left Panel (Input) */}
        {(viewMode === "split" || viewMode === "input" || !showResults) && (
          <div
            className={`flex-1 p-4 pb-20 ${
              viewMode === "split" ? "md:w-1/2" : "w-full"
            } transition-all duration-300`}
            style={{
              display:
                isMobile && viewMode === "output" && showResults
                  ? "none"
                  : "block",
            }}
          >
            {/* Tabs */}
            <div className="flex border-b border-gray-700 mb-6">
              <button
                onClick={() => setActiveTab("upload")}
                className={`px-4 py-2 text-sm font-medium flex items-center ${
                  activeTab === "upload"
                    ? "border-b-2 border-zeus-gold text-zeus-gold"
                    : `${
                        darkMode ? "text-zeus-silver" : "text-gray-500"
                      } hover:text-zeus-gold`
                }`}
              >
                <Upload size={16} className="mr-2" />
                Upload
              </button>
              <button
                onClick={() => {
                  const input = fileInputRef.current;
                  if (input) {
                    input.setAttribute("capture", "environment");
                    input.click();
                  }
                }}
                className={`px-4 py-2 text-sm font-medium flex items-center ${
                  activeTab === "camera"
                    ? "border-b-2 border-zeus-gold text-zeus-gold"
                    : `${
                        darkMode ? "text-zeus-silver" : "text-gray-500"
                      } hover:text-zeus-gold`
                }`}
              >
                <Camera size={16} className="mr-2" />
                Camera
              </button>
            </div>

            {/* Input Card */}
            <motion.div
              className={`${cardThemeClasses} rounded-xl shadow-lg overflow-hidden transition-all duration-300`}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Header */}
              <motion.div className="text-center p-6" variants={itemVariants}>
                <div className="flex justify-center items-center mb-3">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-zeus-navy via-zeus-gold to-zeus-navy rounded-full blur opacity-30"></div>
                    <div className="relative bg-gradient-to-r from-zeus-navy via-zeus-gold to-zeus-navy p-3 rounded-full">
                      <Camera size={28} className="text-zeus-white" />
                    </div>
                  </div>
                </div>
                <h2 className="text-2xl zeus-heading mb-2">
                  AI Fashion Assistant
                </h2>
                <p
                  className={`${
                    darkMode ? "text-zeus-silver" : "text-gray-500"
                  }`}
                >
                  Upload an outfit photo for personalized style recommendations
                </p>

                {/* Style tags */}
                {styleTags.length > 0 && (
                  <div className="flex flex-wrap justify-center mt-4 gap-2">
                    {styleTags.map((tag, index) => (
                      <motion.div
                        key={index}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.1 + 0.5 }}
                        className="px-3 py-1 bg-zeus-navy border border-zeus-gold rounded-full text-sm text-zeus-gold font-medium"
                      >
                        {tag}
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Upload Area */}
              <motion.div
                variants={itemVariants}
                className={`relative border-2 border-dashed rounded-xl p-8 mx-6 mb-6 text-center transition-all duration-300 ${
                  dragActive
                    ? "border-zeus-gold bg-zeus-navy/20"
                    : `border-zeus-silver hover:border-zeus-gold ${
                        darkMode ? "hover:bg-zeus-navy/10" : "hover:bg-gray-50"
                      }`
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />

                {preview ? (
                  <div className="relative">
                    <img
                      src={preview}
                      alt="Outfit preview"
                      className="max-h-64 mx-auto rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearImage();
                      }}
                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                    >
                      <X size={18} className="text-gray-700" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8 text-gray-500">
                    <Upload size={32} className="mb-3 text-purple-400" />
                    <p className="text-lg font-medium">
                      Drag & drop your outfit photo here
                    </p>
                    <p className="text-sm mt-2">
                      or click to select from your device
                    </p>
                    <p className="text-xs mt-4 max-w-md mx-auto">
                      Supported formats: JPG, PNG, WEBP
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Analysis Mode Selection */}
              <motion.div variants={itemVariants} className="mx-6 mb-6">
                <div
                  className={`p-4 rounded-lg ${
                    darkMode ? "bg-zeus-navy/30" : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium">Analysis Mode</h3>
                    <button
                      onClick={() => setShowOptions(!showOptions)}
                      className="text-xs flex items-center text-zeus-gold hover:underline"
                    >
                      Advanced options
                      <ChevronRight
                        size={14}
                        className={`ml-1 transition-transform ${
                          showOptions ? "rotate-90" : ""
                        }`}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {Object.entries(ANALYSIS_MODES).map(([key, mode]) => (
                      <button
                        key={key}
                        onClick={() =>
                          setSelectedMode(key as keyof typeof ANALYSIS_MODES)
                        }
                        className={`p-2 rounded text-xs text-center transition-all ${
                          selectedMode === (key as keyof typeof ANALYSIS_MODES)
                            ? "bg-zeus-gold text-white shadow-md"
                            : `${
                                darkMode
                                  ? "bg-zeus-charcoal text-zeus-silver hover:bg-zeus-navy"
                                  : "bg-white text-gray-600 hover:bg-gray-100"
                              } border border-gray-600`
                        }`}
                      >
                        <div className="flex justify-center mb-1">
                          {mode.icon}
                        </div>
                        {mode.name}
                      </button>
                    ))}
                  </div>

                  {showOptions && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4 pt-4 border-t border-gray-700"
                    >
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-medium">
                            Creativity Level: {temperature.toFixed(1)}
                          </label>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={temperature}
                          onChange={(e) =>
                            setTemperature(parseFloat(e.target.value))
                          }
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-zeus-gold"
                            style={{ width: `${temperature * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div variants={itemVariants} className="flex px-6 pb-6">
                <button
                  onClick={handleSubmit}
                  disabled={!image || loading}
                  className={`flex-1 py-3 px-4 flex items-center justify-center rounded-lg text-white font-medium transition-all ${
                    !image || loading
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-zeus-navy via-zeus-gold to-zeus-navy hover:opacity-90"
                  }`}
                >
                  {loading ? (
                    <Loader2 size={20} className="animate-spin mr-2" />
                  ) : (
                    <Sparkles size={20} className="mr-2" />
                  )}
                  {loading ? "Analyzing..." : "Analyze Outfit"}
                </button>
              </motion.div>

              {showResults && responseText && !isMobile && (
                <div className="mt-6">
                  <Imagegen responseText={responseText} darkMode={darkMode} />
                </div>
              )}

              {/* Tips */}
              {!preview && (
                <motion.div
                  variants={itemVariants}
                  className={`mx-6 mb-6 p-4 rounded-lg ${
                    darkMode ? "bg-zeus-navy/30" : "bg-gray-50"
                  }`}
                >
                  <div
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => setShowTips(!showTips)}
                  >
                    <div className="flex items-center">
                      <LightbulbIcon
                        size={16}
                        className="text-zeus-gold mr-2"
                      />
                      <h3 className="text-sm font-medium">Photo Tips</h3>
                    </div>
                    <ChevronRight
                      size={16}
                      className={`transition-transform ${
                        showTips ? "rotate-90" : ""
                      }`}
                    />
                  </div>

                  <AnimatePresence>
                    {showTips && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ul className="mt-3 text-xs space-y-2 pl-6 list-disc">
                          <li>Use good lighting for accurate color analysis</li>
                          <li>Capture the full outfit from head to toe</li>
                          <li>Stand against a neutral background</li>
                          <li>Keep items cleanly placed for flat lays</li>
                          <li>Choose high-resolution images</li>
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}

        {/* Right Panel (Output) */}
        {(viewMode === "split" || viewMode === "output") && showResults && (
          <div
            ref={responseRef}
            className={`flex-1 p-4 ${
              viewMode === "split" ? "md:w-1/2" : "w-full"
            } transition-all duration-300`}
          >
            <div
              className={`${cardThemeClasses} rounded-xl shadow-lg overflow-hidden h-full flex flex-col mb-6`}
            >
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-zeus-gold rounded-full">
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <h3 className="text-lg font-medium">
                    {ANALYSIS_MODES[selectedMode].name} Results
                  </h3>
                </div>
                <div className="flex space-x-2">
                  {isMobile && (
                    <button
                      onClick={toggleViewMode}
                      className="p-1.5 rounded-full hover:bg-zeus-navy"
                    >
                      {viewMode === "output" ? (
                        <ArrowRight size={16} className="text-zeus-silver" />
                      ) : (
                        <Split size={16} className="text-zeus-silver" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={copyToClipboard}
                    className="p-1.5 rounded-full hover:bg-zeus-navy"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check size={16} className="text-green-400" />
                    ) : (
                      <Copy size={16} className="text-zeus-silver" />
                    )}
                  </button>
                  <button
                    onClick={downloadResponse}
                    className="p-1.5 rounded-full hover:bg-zeus-navy"
                    title="Download as Markdown"
                  >
                    <Download size={16} className="text-zeus-silver" />
                  </button>
                  <button
                    onClick={() => setFullscreen(!fullscreen)}
                    className="p-1.5 rounded-full hover:bg-zeus-navy"
                  >
                    {fullscreen ? (
                      <Minimize2 size={16} className="text-zeus-silver" />
                    ) : (
                      <Maximize2 size={16} className="text-zeus-silver" />
                    )}
                  </button>
                </div>
              </div>

              {/* Response Content */}
              <div
                className={`flex-1 overflow-y-auto p-6 ${
                  fullscreen ? "h-[calc(100vh-200px)]" : ""
                }`}
              >
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-40">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        ease: "linear",
                      }}
                      className="w-10 h-10 border-4 border-zeus-gold border-t-transparent rounded-full mb-4"
                    />
                    <div className="flex flex-col items-center">
                      <span className="text-zeus-gold font-bold tracking-wide mb-1">
                        Analyzing your outfit...
                      </span>
                      <span className="text-black text-sm ">
                        Using {ANALYSIS_MODES[selectedMode].name}
                      </span>
                    </div>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="prose prose-invert max-w-none"
                  >
                    <ReactMarkdown
                      children={responseText}
                      components={{
                        h1: ({ node, ...props }) => (
                          <h1
                            className="text-2xl font-bold mb-4 pb-2 border-b border-gray-700"
                            {...props}
                          />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2
                            className="text-xl font-bold mt-6 mb-3 text-zeus-gold"
                            {...props}
                          />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3
                            className="text-lg font-medium mt-4 mb-2"
                            {...props}
                          />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul className="list-disc pl-5 space-y-2" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="text-zeus-silver" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                          <p className="mb-4" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong
                            className="font-bold text-zeus-gold"
                            {...props}
                          />
                        ),
                      }}
                    />
                  </motion.div>
                )}
              </div>

              {/* Action Footer */}
              <div className="p-4 border-t border-gray-700 flex justify-between">
                <button
                  onClick={clearImage}
                  className="px-3 py-1.5 text-sm flex items-center text-zeus-silver hover:text-white transition-colors"
                >
                  <RefreshCw size={14} className="mr-1.5" />
                  New Analysis
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="mb-20 px-3 py-1.5 bg-zeus-navy hover:bg-zeus-navy/70 text-sm rounded-lg flex items-center text-zeus-gold transition-colors"
                >
                  <RefreshCw size={14} className="mr-1.5" />
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <>
          <AnimatePresence>
            {mobileBottomTab && mobileBottomTab !== "home" && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed bottom-16 left-2 right-2 z-40 bg-zeus-navy backdrop-blur-md rounded-2xl pt-2 shadow-2xl flex flex-col border-2 border-zeus-gold"
                style={{ maxHeight: "calc(100vh - 80px)" }}
              >
                {/* Header */}
                <div className="flex justify-between items-center px-2 ">
                  <div className="flex items-center gap-2">
                    {mobileBottomTab === "imagegen" ? null : (
                      <Image
                        src="/logo.jpg"
                        alt="AI Logo"
                        width={32}
                        height={32}
                      />
                    )}
                    <span className="font-semibold text-white text-lg">
                      {mobileBottomTab === "imagegen"
                        ? "Image Tools"
                        : "Zeus Fashion Assistant"}
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileBottomTab(null)}
                    className="p-2 rounded-full hover:bg-gray-700 transition"
                    aria-label="Close tab"
                  >
                    <X size={20} className="text-white" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-2">
                  {mobileBottomTab === "imagegen" ? (
                    <Imagegen responseText={responseText} darkMode={true} />
                  ) : (
                    <div className="flex flex-col h-[70vh]">
                      <ChatBubble
                        responseText={responseText}
                        className="flex-1 h-full overflow-y-auto"
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom nav buttons */}
          <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center bg-gray-950/95 backdrop-blur-md py-3 px-2 border-t border-gray-800 shadow-[0_-2px_10px_rgba(0,0,0,0.4)] rounded-t-3xl">
            {/* Home Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push("/")}
              className={`flex flex-col items-center justify-center flex-1 transition-all duration-200 ${
                mobileBottomTab === "home"
                  ? "text-yellow-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <div
                className={`p-2 rounded-full ${
                  mobileBottomTab === "home"
                    ? "bg-yellow-400/20 shadow-lg"
                    : "hover:bg-gray-800/60"
                } transition-all`}
              >
                <Home size={22} />
              </div>
              <span className="text-xs font-medium mt-1">Home</span>
            </motion.button>

            {/* Image Tools Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() =>
                setMobileBottomTab((prev) =>
                  prev === "imagegen" ? null : "imagegen"
                )
              }
              className={`flex flex-col items-center justify-center flex-1 transition-all duration-200 ${
                mobileBottomTab === "imagegen"
                  ? "text-yellow-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <div
                className={`p-2 rounded-full ${
                  mobileBottomTab === "imagegen"
                    ? "bg-yellow-400/20 shadow-lg"
                    : "hover:bg-gray-800/60"
                } transition-all`}
              >
                <ImageIcon size={22} />
              </div>
              <span className="text-xs font-medium mt-1">Image</span>
            </motion.button>

            {/* Chat Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() =>
                setMobileBottomTab((prev) => (prev === "chat" ? null : "chat"))
              }
              className={`flex flex-col items-center justify-center flex-1 transition-all duration-200 ${
                mobileBottomTab === "chat"
                  ? "text-yellow-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <div
                className={`p-2 rounded-full ${
                  mobileBottomTab === "chat"
                    ? "bg-yellow-400/20 shadow-lg"
                    : "hover:bg-gray-800/60"
                } transition-all`}
              >
                <Bot size={22} />
              </div>
              <span className="text-xs font-medium mt-1">Chat</span>
            </motion.button>
          </div>
        </>
      )}

      {/* Desktop ChatBubble */}
      {!isMobile && <ChatBubble responseText={responseText} />}

      {/* Footer */}
      {!isMobile && (
        <footer
          className={`py-3 text-center text-xs ${
            darkMode ? "text-zeus-silver" : "text-gray-500"
          }`}
        >
          Powered by {new Date().getFullYear()} ©️ EmA AI Solutions
        </footer>
      )}
    </div>
  );
}
