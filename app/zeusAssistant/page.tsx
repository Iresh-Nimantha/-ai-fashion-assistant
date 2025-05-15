"use client";

import React, { useState, useEffect, useRef, useMemo, ChangeEvent, DragEvent } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Imagegen from "../components/Imagegen";
import {
  Upload,
  X,
  Loader2,
  Sparkles,
  LightbulbIcon,
  Camera,
  History,
  ChevronRight,
  Settings,
  Zap,
  Download,
  Copy,
  Check,
  RefreshCw,
  Share2,
  ArrowRight,
  Maximize2,
  Minimize2,
  Split,
  BookOpen,
  ImageIcon,
  ToggleRight,
  ToggleLeft,
  Sun,
  Moon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import ChatBubble from "../components/ChatBubble";

// Type definitions
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
  [K in 'standard' | 'professional' | 'quick']: AnalysisMode;
};

// Advanced prompts for different analysis modes
const ANALYSIS_MODES: AnalysisModes = {
  standard: {
    name: "Standard Analysis",
    description: "Complete outfit analysis with basic recommendations",
    icon: <Sparkles size={16} />,
    prompt: `Analyze this outfit/fashion image and provide detailed style recommendations, including skin tone and height considerations.

Format your response with these sections (using bold headings):

**Skin Tone Analysis:**
* Identify predominant skin tone category (Fair, Light, Medium, Olive, Tan, Deep)
* Analyze undertones (Cool, Warm, Neutral)
* Suggest complementary colors for clothing/jewelry based on skin tone
* Recommend seasonal color variations (spring/summer/fall/winter)

**Dress Summary:**
* Identify garment type and silhouette
* Describe neckline, sleeve length, and hemline
* Note fabric type and texture
* Identify any patterns or embellishments

**Body Proportion Recommendations:**
* Estimate height range from image (Petite: <5'4", Average: 5'4"-5'7", Tall: >5'7")
* Suggest styles to enhance proportions:
  - For petite: Vertical lines, high-waisted cuts
  - For tall: Wide-leg pants, long jackets
  - For all: Balance ratios between top/bottom

**Personalized Style Suggestions:**
* Recommend 3 clothing items that complement both skin tone and body type
* Suggest 2 accessory types (jewelry metals, scarf patterns) matching skin undertones
* Propose footwear styles appropriate for estimated height
* Recommend necklines that flatter face shape and body proportions

**Adaptive Styling Tips:**
* Day-to-night transformation suggestions
* Seasonal layering ideas
* Color combination strategies using skin tone palette
* Proportion-balancing techniques based on height`,
    maxTokens: 800,
  },
  professional: {
    name: "Professional Stylist",
    description: "Advanced analysis with stylist insights",
    icon: <BookOpen size={16} />,
    prompt: `As a professional fashion stylist with 15+ years experience in editorial and celebrity styling, analyze this outfit with expert-level attention to detail.

Focus on these areas with advanced fashion terminology:

**Expert Style Classification:**
* Identify precise style categories (e.g., "minimalist Scandinavian" vs simply "minimal")
* Reference specific designer influences visible in the styling
* Note fashion eras/movements/subcultures reflected in the look

**Elite Color Theory Analysis:**
* Professional color wheel positioning and harmony assessment
* Advanced seasonal color theory analysis (e.g., "Deep Winter" vs just "Winter")
* Color psychology impact and emotional response to palette
* Contrast ratio analysis between outfit components

**Luxury Fabric & Construction Assessment:**
* Identify specific fabrics, weights, weaves, and draping characteristics
* Note visible construction techniques and their effect on silhouette
* Analyze how fabric choice impacts overall look sophistication

**High-End Styling Potential:**
* Professional styling techniques to elevate the look
* Editorial-worthy composition suggestions
* Red carpet/special event adaptation possibilities
* Contemporary trend alignment or intentional divergence

**Fashion Forward Recommendations:**
* Cite specific current designer collections with complementary pieces
* Suggest luxury alternatives for each element
* Advanced accessorizing strategies from recent fashion weeks
* Outfit evolution possibilities for coming fashion seasons`,
    maxTokens: 1000,
  },
  quick: {
    name: "Quick Style Tips",
    description: "Fast analysis with key recommendations",
    icon: <Zap size={16} />,
    prompt: `Give a super concise style analysis of this outfit image. Keep it brief but insightful!

Provide just these four short sections:

**Style Summary:**
One-sentence overview of the style category and overall look

**Best Features:**
Bulletpoint the 2-3 strongest elements of this outfit

**Quick Improvement Tips:**
Bulletpoint 2-3 simple changes that would enhance this outfit

**Perfect For:**
List 1-2 ideal occasions/settings where this outfit would shine`,
    maxTokens: 400,
  },
};

// Configuration moved to a separate constant
const CONFIG = {
  API_KEY: process.env.NEXT_PUBLIC_GEMINIFLASH_API_KEY || '',
  MODEL: "gemini-1.5-flash",
} as const;

// Add error handling for missing API key
if (!CONFIG.API_KEY) {
  console.error('API key is not configured. Please add NEXT_PUBLIC_GEMINIFLASH_API_KEY to your .env.local file');
}

// Convert file to base64 for Gemini API
const fileToGenerativePart = async (file: File) => {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const base64Data = result.split(",")[1];
        if (base64Data) {
          resolve(base64Data);
        } else {
          reject(new Error('Failed to extract base64 data'));
        }
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data: base64,
      mimeType: file.type,
    },
  };
};

// Initialize the model with error handling
const initializeModel = () => {
  try {
    if (!CONFIG.API_KEY) {
      throw new Error('API key is not configured');
    }
    const genAI = new GoogleGenerativeAI(CONFIG.API_KEY);
    return genAI.getGenerativeModel({ model: CONFIG.MODEL });
  } catch (error) {
    console.error('Error initializing Gemini model:', error);
    return null;
  }
};

const AIFashionAssistant = () => {
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
  const [selectedMode, setSelectedMode] = useState<keyof typeof ANALYSIS_MODES>("standard");
  const [showOptions, setShowOptions] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [activeTab, setActiveTab] = useState("upload");
  const [darkMode, setDarkMode] = useState(true);
  const [viewMode, setViewMode] = useState<"split" | "input" | "output">("split");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  const [captureDevice, setCaptureDevice] = useState(false);

  // Animation variants
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

  // Theme classes
  const themeClasses = darkMode
    ? "bg-zeus-black text-zeus-white"
    : "bg-gray-100 text-gray-900";

  const cardThemeClasses = darkMode
    ? "bg-zeus-charcoal border-zeus-navy"
    : "bg-white border-gray-200";

  // Check if it's a mobile device
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // Initialize the model
  const model = useMemo(() => initializeModel(), []);

  // Add error handling for model initialization
  useEffect(() => {
    if (!model) {
      setError('Failed to initialize AI model. Please check your API key configuration.');
    }
  }, [model]);

  // Handle file selection
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement> | DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);

    let file: File | undefined;
    if ('files' in e.target && e.target.files?.[0]) {
      file = e.target.files[0];
    } else if ('dataTransfer' in e && e.dataTransfer?.files?.[0]) {
      file = e.dataTransfer.files[0];
    }

    if (file && file.type.startsWith("image/")) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setActiveTab("upload");
    }
  };

  // Activate camera capture
  const activateCamera = () => {
    setCaptureDevice(true);
    const input = fileInputRef.current;
    if (!input) return;

    if (navigator.mediaDevices) {
      input.setAttribute("capture", "environment");
      input.click();
    } else {
      input.click();
    }
  };

  // Drag and drop handlers
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

  // Clear selected image
  const clearImage = () => {
    setImage(null);
    setPreview("");
    setStyleTags([]);
    setResponseText("");
    setShowResults(false);
  };

  // Copy response to clipboard
  const copyToClipboard = () => {
    const textToCopy = responseText.replace(/\*\*/g, "");
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Download response as markdown
  const downloadResponse = () => {
    const element = document.createElement("a");
    const file = new Blob([responseText], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    element.download = "fashion-analysis.md";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Toggle view modes
  const toggleViewMode = () => {
    if (viewMode === "split") setViewMode("output");
    else if (viewMode === "output") setViewMode("input");
    else setViewMode("split");
  };

  // Loader animation for AI analysis
  const LoaderAnimation = () => (
    <div className="flex flex-col items-center justify-center h-40">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-10 h-10 border-4 border-zeus-gold border-t-transparent rounded-full mb-4"
      />
      <div className="flex flex-col items-center">
        <span className="text-zeus-gold font-bold tracking-wide mb-1">
          Analyzing your outfit...
        </span>
        <span className="text-black text-sm">
          Using {ANALYSIS_MODES[selectedMode].name}
        </span>
      </div>
    </div>
  );

  // Function to load a history item
  const loadHistoryItem = (item: HistoryItem) => {
    setPreview(item.preview);
    setResponseText(item.response);
    setSelectedMode(item.mode);
    setShowResults(true);
    setHistoryExpanded(false);
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], "history-image.jpg", {
          type: "image/jpeg",
        });
        setImage(file);
      }, "image/jpeg");
    };
    img.src = item.preview;
  };

  // Update handleSubmit with better error handling
  const handleSubmit = async () => {
    if (!image) return;
    if (!model) {
      setError('AI model is not initialized. Please check your API key configuration.');
      return;
    }

    setLoading(true);
    setResponseText("");
    setShowResults(false);
    setError(null);

    try {
      const imagePart = await fileToGenerativePart(image);

      // Get the selected mode's prompt
      const selectedPrompt = ANALYSIS_MODES[selectedMode].prompt;
      const maxTokens = ANALYSIS_MODES[selectedMode].maxTokens;

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [imagePart, { text: selectedPrompt }],
          },
        ],
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: maxTokens,
        },
      });

      const response = await result.response;
      const text = typeof response.text === "function" ? await response.text() : response.text;

      setResponseText(text);
      setShowResults(true);

      // Extract style tags for highlighting
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
              (word) =>
                word.length > 3 &&
                ![
                  "style",
                  "with",
                  "that",
                  "this",
                  "your",
                  "would",
                  "could",
                  "should",
                ].includes(word.toLowerCase())
            );
          return words[0] || "";
        })
        .filter((tag) => tag.length > 0)
        .slice(0, 5);

      setStyleTags(extractedTags);

      // Save to history with timestamp
      const now = new Date();
      const timestamp = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      setHistory((prev) => [
        ...prev,
        {
          id: Date.now(),
          preview: preview,
          response: text,
          timestamp: timestamp,
          mode: selectedMode,
        },
      ]);

      // Auto set view mode to split on desktop or output on mobile
      if (isMobile) {
        setViewMode("output");
      } else {
        setViewMode("split");
      }

      // Scroll to response if on mobile
      if (isMobile && responseRef.current) {
        responseRef.current.scrollIntoView({ behavior: "smooth" });
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "An error occurred while analyzing your image. Please try again.");
      setResponseText("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${themeClasses} font-zeus flex flex-col`}>
      {/* Main Header */}
      <header
        className={`py-3 px-4 ${
          darkMode ? "bg-zeus-navy" : "bg-white border-b border-gray-200"
        } sticky top-0 z-30 rounded-2xl mt-3`}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Zeus Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="relative h-12 w-12 flex-shrink-0">
              <img
                src="/logo.jpg"
                alt="Zeus Logo"
                className="rounded-full object-cover h-full w-full border-2 border-zeus-gold"
              />
            </div>
            <div>
              <h1 className="text-xl zeus-heading">
                <span className="text-blac">Zeus</span>
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
          {/* Light/Dark Mode Switch */}
          <div className="ml-6 flex items-center">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`
                w-16 h-9 flex items-center rounded-full px-1 transition-colors duration-300 relative
                focus:outline-none focus:ring-2 focus:ring-zeus-gold
                ${
                  darkMode
                    ? "bg-gradient-to-r from-zeus-gold to-yellow-400"
                    : "bg-gradient-to-r from-zeus-navy to-blue-900"
                }
                shadow-md active:scale-95
              `}
              aria-label="Toggle light/dark mode"
              type="button"
            >
              {/* Animated track icons */}
              <span className="absolute left-2 top-1/2 -translate-y-1/2">
                <Sun
                  className={`w-4 h-4 transition-colors duration-300 ${
                    darkMode
                      ? "text-yellow-200 opacity-60"
                      : "text-zeus-gold opacity-100"
                  }`}
                />
              </span>
              <span className="absolute right-2 top-1/2 -translate-y-1/2">
                <Moon
                  className={`w-4 h-4 transition-colors duration-300 ${
                    darkMode
                      ? "text-zeus-navy opacity-100"
                      : "text-blue-200 opacity-60"
                  }`}
                />
              </span>
              {/* Animated knob */}
              <span
                className={`
                  w-7 h-7 rounded-full bg-white shadow-lg flex items-center justify-center
                  transform transition-transform duration-300 z-10
                  ${darkMode ? "translate-x-7" : "translate-x-0"}
                  border-2 border-zeus-gold
                `}
              >
                {darkMode ? (
                  <Moon className="w-4 h-4 text-zeus-navy transition-transform duration-300" />
                ) : (
                  <Sun className="w-4 h-4 text-zeus-gold transition-transform duration-300" />
                )}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* History Sidebar */}
      <AnimatePresence>
        {historyExpanded && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`fixed right-0 top-0 bottom-0 w-full md:w-80 ${
              darkMode ? "bg-zeus-navy" : "bg-white"
            } shadow-xl z-50 flex flex-col`}
          >
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="zeus-heading text-lg">Analysis History</h2>
              <button
                onClick={() => setHistoryExpanded(false)}
                className="p-1.5 rounded-full hover:bg-zeus-navy"
              >
                <X size={18} className="text-zeus-silver" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <History
                    size={40}
                    className="text-zeus-silver opacity-30 mb-3"
                  />
                  <p className="text-zeus-silver">No analysis history yet</p>
                  <p className="text-sm text-zeus-silver opacity-70 mt-2">
                    Your fashion analyses will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-3 rounded-lg cursor-pointer ${
                        darkMode
                          ? "hover:bg-zeus-charcoal"
                          : "hover:bg-gray-100"
                      } transition-colors`}
                      onClick={() => loadHistoryItem(item)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-14 w-14 rounded-md overflow-hidden flex-shrink-0 bg-black">
                          <img
                            src={item.preview}
                            alt="History"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs ${
                                darkMode ? "text-zeus-silver" : "text-gray-500"
                              }`}
                            >
                              {item.timestamp}
                            </span>
                            <span className="text-xs bg-zeus-navy text-zeus-gold px-2 py-0.5 rounded-full">
                              {ANALYSIS_MODES[item.mode || "standard"].name}
                            </span>
                          </div>
                          <p
                            className={`text-sm mt-1 truncate ${
                              darkMode ? "text-zeus-white" : "text-gray-800"
                            }`}
                          >
                            {item.response.split("\n")[0].replace(/\*\*/g, "")}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {history.length > 0 && (
              <div className="p-3 border-t border-gray-700">
                <button
                  onClick={() => {
                    if (
                      confirm("Are you sure you want to clear all history?")
                    ) {
                      setHistory([]);
                    }
                  }}
                  className="text-sm text-zeus-silver hover:text-zeus-gold transition-colors w-full text-center"
                >
                  Clear History
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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

        {/* Left Panel (Input) - Only shown in split view or input view */}
        {(viewMode === "split" || viewMode === "input" || !showResults) && (
          <div
            className={`flex-1 p-4 ${
              viewMode === "split" ? "md:w-1/2" : "w-full"
            } transition-all duration-300`}
            style={{
              display:
                isMobile && viewMode === "output" && showResults
                  ? "none"
                  : "block",
            }}
          >
            {/* Tabs for different input methods */}
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
                onClick={() => activateCamera()}
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
                className={`relative border-2 border-dashed rounded-xl p-8 mx-6 mb-6 text-center transition-all duration-300
                  ${
                    dragActive
                      ? "border-zeus-gold bg-zeus-navy/20"
                      : `border-zeus-silver hover:border-zeus-gold ${
                          darkMode
                            ? "hover:bg-zeus-navy/10"
                            : "hover:bg-gray-50"
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
                        onClick={() => setSelectedMode(key as keyof typeof ANALYSIS_MODES)}
                        className={`p-2 rounded text-xs text-center transition-all ${
                          selectedMode === key as keyof typeof ANALYSIS_MODES
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

                  <div className="text-xs text-center opacity-75">
                    {ANALYSIS_MODES[selectedMode].description}
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
                            style={{
                              width: `${temperature * 100}%`,
                            }}
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

              {/* Add the Imagegen component here */}
              {showResults && responseText && (
                <div className="mt-6">
                  <Imagegen responseText={responseText} darkMode={darkMode} />
                </div>
              )}

              {/* Tips card */}
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
                          <li>
                            Stand against a neutral background for best results
                          </li>
                          <li>
                            For composition photos, place items cleanly without
                            overlap
                          </li>
                          <li>Choose high-resolution, clear images</li>
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}

        {/* Right Panel (Output) - Only shown in split view or output view */}
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
              {/* Header with view toggle */}
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
                  {/* Mobile view toggle button */}
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
                  {/* Copy button */}
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
                  {/* Download button */}
                  <button
                    onClick={downloadResponse}
                    className="p-1.5 rounded-full hover:bg-zeus-navy"
                    title="Download as Markdown"
                  >
                    <Download size={16} className="text-zeus-silver" />
                  </button>
                  {/* Fullscreen toggle */}
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
                  <LoaderAnimation />
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
                  className="px-3 py-1.5 bg-zeus-navy hover:bg-zeus-navy/70 text-sm rounded-lg flex items-center text-zeus-gold transition-colors"
                >
                  <RefreshCw size={14} className="mr-1.5" />
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer
        className={`py-3 text-center text-xs ${
          darkMode ? "text-zeus-silver" : "text-gray-500"
        }`}
      >
        <p>Powered by {new Date().getFullYear()} ©️ EmA AI Solutions</p>
      </footer>

      <ChatBubble analysis={responseText} model={model} />
    </div>
  );
};

export default AIFashionAssistant; 