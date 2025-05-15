"use client";

import React, { useState, useEffect, useRef } from "react";
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

// Interface for component props
interface AIFashionAssistantProps {
  onResult?: (result: string) => void;
}

// Configuration moved to a separate constant
const CONFIG = {
  API_KEY: process.env.GEMINIFLASH_API_KEY,
  MODEL: "gemini-1.5-flash",
};

// Advanced prompts for different analysis modes
const ANALYSIS_MODES = {
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

const AIFashionAssistant: React.FC<AIFashionAssistantProps> = ({
  onResult,
}) => {
  // Added text input state for the simplified approach
  const [textInput, setTextInput] = useState("");
  const [image, setImage] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [history, setHistory] = useState([]);
  const [styleTags, setStyleTags] = useState([]);
  const [showTips, setShowTips] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedMode, setSelectedMode] = useState("standard");
  const [showOptions, setShowOptions] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [activeTab, setActiveTab] = useState("upload");
  const [darkMode, setDarkMode] = useState(true);
  const [viewMode, setViewMode] = useState("split"); // "split", "input", "output"
  const fileInputRef = useRef(null);
  const responseRef = useRef(null);
  const [captureDevice, setCaptureDevice] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false); // Added for text-based analysis option

  // Initialize the model
  const genAI = new GoogleGenerativeAI(CONFIG.API_KEY);
  const model = genAI.getGenerativeModel({ model: CONFIG.MODEL });

  // Convert file to base64 for Gemini API
  const fileToGenerativePart = async (file) => {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
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

  // Handle file selection
  const handleFileSelect = (e) => {
    e.preventDefault();
    setDragActive(false);

    const file =
      e.target.files?.[0] || (e.dataTransfer?.files && e.dataTransfer.files[0]);

    if (file && file.type.startsWith("image/")) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      // Switch to upload tab if not already there
      setActiveTab("upload");
    }
  };

  // Activate camera capture
  const activateCamera = () => {
    setCaptureDevice(true);
    // If we're on mobile, use the camera directly
    if (fileInputRef.current && navigator.mediaDevices) {
      fileInputRef.current.setAttribute("capture", "environment");
      fileInputRef.current.click();
    } else {
      fileInputRef.current.click();
    }
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
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

  // Text-based analysis function - NEW ADDITION
  const handleTextAnalysis = async () => {
    if (!textInput) return;
    setLoading(true);
    setResponseText("");
    setShowResults(false);

    try {
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Fashion analysis for: ${textInput}. ${ANALYSIS_MODES[selectedMode].prompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: ANALYSIS_MODES[selectedMode].maxTokens,
        },
      });

      const response = await result.response;
      const text =
        typeof response.text === "function"
          ? await response.text()
          : response.text;

      setResponseText(text);
      setShowResults(true);

      // Call onResult callback if provided
      if (onResult) {
        onResult(text);
      }

      // Save to history
      const now = new Date();
      const timestamp = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      setHistory((prev) => [
        ...prev,
        {
          id: Date.now(),
          textInput: textInput,
          response: text,
          timestamp: timestamp,
          mode: selectedMode,
          isTextAnalysis: true,
        },
      ]);

      // Auto set view mode to output
      setViewMode("output");

      // Scroll to response if on mobile
      if (window.innerWidth < 768 && responseRef.current) {
        responseRef.current.scrollIntoView({ behavior: "smooth" });
      }
    } catch (error) {
      console.error("Error:", error);
      setResponseText(
        "Sorry, there was an error analyzing your description. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Submit to Gemini API for analysis with enhanced prompt
  const handleSubmit = async () => {
    if (!image) return;
    setLoading(true);
    setResponseText("");
    setShowResults(false); // Reset animation

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
      const text =
        typeof response.text === "function"
          ? await response.text()
          : response.text;

      setResponseText(text);
      setShowResults(true); // Trigger animation to show results

      // Call onResult callback if provided
      if (onResult) {
        onResult(text);
      }

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
          // Extract meaningful terms
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
          isTextAnalysis: false,
        },
      ]);

      // Auto set view mode to split on desktop or output on mobile
      const isMobile = window.innerWidth < 768;
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
      setResponseText(
        "Sorry, there was an error analyzing your image. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Function to load a history item
  const loadHistoryItem = (item) => {
    setResponseText(item.response);
    setSelectedMode(item.mode || "standard");
    setShowResults(true);
    setHistoryExpanded(false);

    if (item.isTextAnalysis) {
      // Load text input analysis
      setTextInput(item.textInput);
      setActiveTab("text"); // Switch to text tab
      setShowTextInput(true);
      setPreview("");
      setImage(null);
    } else {
      // Load image analysis
      setPreview(item.preview);
      setActiveTab("upload");
      setShowTextInput(false);

      // Create a temporary object URL for the history item
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          const file = new File([blob], "history-image.jpg", {
            type: "image/jpeg",
          });
          setImage(file);
        });
      };
      img.src = item.preview;
    }
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
          Analyzing your {activeTab === "text" ? "description" : "outfit"}...
        </span>
        <span className="text-black text-sm">
          Using {ANALYSIS_MODES[selectedMode].name}
        </span>
      </div>
    </div>
  );

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
                        {item.isTextAnalysis ? (
                          <div className="h-14 w-14 rounded-md overflow-hidden flex-shrink-0 bg-zeus-navy flex items-center justify-center">
                            <ImageIcon size={24} className="text-zeus-gold" />
                          </div>
                        ) : (
                          <div className="h-14 w-14 rounded-md overflow-hidden flex-shrink-0 bg-black">
                            <img
                              src={item.preview}
                              alt="History"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
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
                            {item.isTextAnalysis
                              ? item.textInput
                              : item.response
                                  .split("\n")[0]
                                  .replace(/\*\*/g, "")}
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
                Input
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
                onClick={() => {
                  setActiveTab("upload");
                  setShowTextInput(false);
                }}
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
                      } hover: text-zeus-gold`
                }`}
              >
                <Camera size={16} className="mr-2" />
                Camera
              </button>
              <button
                onClick={() => {
                  setActiveTab("text");
                  setShowTextInput(true);
                }}
                className={`px-4 py-2 text-sm font-medium flex items-center ${
                  activeTab === "text"
                    ? "border-b-2 border-zeus-gold text-zeus-gold"
                    : `${
                        darkMode ? "text-zeus-silver" : "text-gray-500"
                      } hover:text-zeus-gold`
                }`}
              >
                <BookOpen size={16} className="mr-2" />
                Describe
              </button>
              <button
                onClick={() => {
                  setActiveTab("imagegen");
                  setShowTextInput(false);
                }}
                className={`px-4 py-2 text-sm font-medium flex items-center ${
                  activeTab === "imagegen"
                    ? "border-b-2 border-zeus-gold text-zeus-gold"
                    : `${
                        darkMode ? "text-zeus-silver" : "text-gray-500"
                      } hover:text-zeus-gold`
                }`}
              >
                <Sparkles size={16} className="mr-2" />
                AI Generate
              </button>
            </div>

            {/* Input section with card UI */}
            <div
              className={`rounded-xl overflow-hidden ${cardThemeClasses} border shadow-sm mb-6 transition-all duration-300`}
            >
              {/* Text Input Area */}
              {activeTab === "text" && showTextInput && (
                <div className="p-4">
                  <h3
                    className={`text-lg font-medium mb-3 ${
                      darkMode ? "text-zeus-white" : "text-gray-800"
                    }`}
                  >
                    Describe Your Outfit
                  </h3>
                  <p
                    className={`text-sm mb-4 ${
                      darkMode ? "text-zeus-silver" : "text-gray-600"
                    }`}
                  >
                    Provide a detailed description of the outfit you want
                    analyzed
                  </p>

                  <div className="relative">
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Describe the outfit in detail (e.g. black leather jacket over white t-shirt with dark blue slim jeans and brown chelsea boots)"
                      className={`w-full p-3 border ${
                        darkMode
                          ? "bg-zeus-navy border-zeus-charcoal text-zeus-white"
                          : "bg-white border-gray-300 text-gray-900"
                      } rounded-lg focus:ring-2 focus:ring-zeus-gold focus:border-transparent min-h-[150px]`}
                    />
                  </div>

                  <div className="mt-4 flex justify-between items-center">
                    <div>
                      <p
                        className={`text-xs ${
                          darkMode ? "text-zeus-silver" : "text-gray-500"
                        }`}
                      >
                        {textInput.length} / 500 characters
                      </p>
                    </div>
                    <button
                      onClick={handleTextAnalysis}
                      disabled={!textInput || loading}
                      className={`${
                        !textInput || loading
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-zeus-gold hover:bg-yellow-500"
                      } text-white px-4 py-2 rounded-lg flex items-center transition-colors`}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin mr-2" size={16} />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2" size={16} />
                          Analyze Outfit
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Image Upload Area */}
              {activeTab === "upload" && (
                <div
                  className={`${
                    preview ? "p-0" : "p-6"
                  } transition-all duration-300`}
                >
                  {!preview ? (
                    <div
                      className={`relative border-2 border-dashed rounded-lg min-h-[300px] ${
                        darkMode
                          ? "border-zeus-navy bg-zeus-charcoal/50"
                          : "border-gray-300 bg-gray-100/50"
                      } ${
                        dragActive ? "border-zeus-gold bg-zeus-navy/10" : ""
                      } flex flex-col items-center justify-center p-6`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-input"
                      />

                      <div className="flex flex-col items-center max-w-md text-center">
                        <div
                          className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                            darkMode ? "bg-zeus-charcoal" : "bg-gray-200"
                          }`}
                        >
                          <Upload
                            size={24}
                            className={
                              darkMode ? "text-zeus-gold" : "text-gray-500"
                            }
                          />
                        </div>
                        <h3
                          className={`text-lg font-medium ${
                            darkMode ? "text-zeus-white" : "text-gray-700"
                          }`}
                        >
                          Upload a Fashion Image
                        </h3>
                        <p
                          className={`text-sm mt-2 ${
                            darkMode ? "text-zeus-silver" : "text-gray-500"
                          }`}
                        >
                          Drag and drop your image here or click the button
                          below
                        </p>

                        <div className="mt-6 flex flex-col sm:flex-row gap-3">
                          <label
                            htmlFor="file-input"
                            className="bg-zeus-gold hover:bg-yellow-500 transition-colors text-white py-2 px-4 rounded-lg cursor-pointer flex items-center justify-center"
                          >
                            <Upload size={16} className="mr-2" />
                            Select Image
                          </label>
                          <button
                            onClick={activateCamera}
                            className={`${
                              darkMode
                                ? "bg-zeus-navy hover:bg-zeus-charcoal"
                                : "bg-white hover:bg-gray-100 border border-gray-300"
                            } transition-colors ${
                              darkMode ? "text-zeus-silver" : "text-gray-700"
                            } py-2 px-4 rounded-lg cursor-pointer flex items-center justify-center`}
                          >
                            <Camera size={16} className="mr-2" />
                            Use Camera
                          </button>
                        </div>

                        <p
                          className={`text-xs mt-4 ${
                            darkMode ? "text-zeus-silver" : "text-gray-500"
                          }`}
                        >
                          Supports JPG, PNG, WEBP up to 5MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full rounded-lg object-contain max-h-[500px]"
                      />
                      <div className="absolute top-2 right-2 flex space-x-2">
                        <button
                          onClick={clearImage}
                          className="w-8 h-8 bg-black bg-opacity-60 rounded-full flex items-center justify-center hover:bg-opacity-80 transition-opacity"
                        >
                          <X size={16} className="text-white" />
                        </button>
                      </div>

                      {/* Image selected UI with analysis button */}
                      <div
                        className={`p-4 mt-2 border-t ${
                          darkMode ? "border-gray-700" : "border-gray-200"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span
                            className={`text-sm ${
                              darkMode ? "text-zeus-silver" : "text-gray-500"
                            }`}
                          >
                            Image ready for analysis
                          </span>
                          <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`${
                              loading
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-zeus-gold hover:bg-yellow-500"
                            } text-white px-4 py-2 rounded-lg flex items-center transition-colors`}
                          >
                            {loading ? (
                              <>
                                <Loader2
                                  className="animate-spin mr-2"
                                  size={16}
                                />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Sparkles className="mr-2" size={16} />
                                Analyze Outfit
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI Image Generator (Stub UI) */}
              {activeTab === "imagegen" && <Imagegen darkMode={darkMode} />}
            </div>

            {/* Analysis Options Card */}
            <div
              className={`rounded-xl ${cardThemeClasses} border shadow-sm mb-6 overflow-hidden transition-all duration-300`}
            >
              <div
                className={`p-4 flex justify-between items-center cursor-pointer ${
                  darkMode ? "hover:bg-zeus-charcoal/50" : "hover:bg-gray-50"
                } transition-colors`}
                onClick={() => setShowOptions(!showOptions)}
              >
                <div className="flex items-center">
                  <Settings
                    size={18}
                    className={`mr-2 ${
                      darkMode ? "text-zeus-gold" : "text-gray-700"
                    }`}
                  />
                  <h3
                    className={`font-medium ${
                      darkMode ? "text-zeus-white" : "text-gray-800"
                    }`}
                  >
                    Analysis Options
                  </h3>
                </div>
                <div>
                  <ChevronRight
                    size={18}
                    className={`transform transition-transform ${
                      showOptions ? "rotate-90" : ""
                    } ${darkMode ? "text-zeus-silver" : "text-gray-500"}`}
                  />
                </div>
              </div>

              <AnimatePresence>
                {showOptions && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-2">
                      {/* Analysis Mode Selector */}
                      <div className="mb-5">
                        <label
                          className={`block text-sm font-medium mb-2 ${
                            darkMode ? "text-zeus-silver" : "text-gray-600"
                          }`}
                        >
                          Analysis Detail Level
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {Object.entries(ANALYSIS_MODES).map(([key, mode]) => (
                            <div
                              key={key}
                              onClick={() => setSelectedMode(key)}
                              className={`${
                                selectedMode === key
                                  ? "border-zeus-gold bg-zeus-gold bg-opacity-10"
                                  : `${
                                      darkMode
                                        ? "border-zeus-navy bg-zeus-navy"
                                        : "border-gray-200 bg-white"
                                    }`
                              } border rounded-lg p-3 cursor-pointer transition-colors`}
                            >
                              <div className="flex items-center">
                                {mode.icon}
                                <span
                                  className={`ml-2 font-medium text-sm ${
                                    selectedMode === key
                                      ? "text-zeus-gold"
                                      : `${
                                          darkMode
                                            ? "text-zeus-white"
                                            : "text-gray-800"
                                        }`
                                  }`}
                                >
                                  {mode.name}
                                </span>
                              </div>
                              <p
                                className={`mt-1 text-xs ${
                                  darkMode
                                    ? "text-zeus-silver"
                                    : "text-gray-500"
                                }`}
                              >
                                {mode.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Temperature Slider */}
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-2">
                          <label
                            className={`block text-sm font-medium ${
                              darkMode ? "text-zeus-silver" : "text-gray-600"
                            }`}
                          >
                            Creativity Level
                          </label>
                          <span
                            className={`text-xs ${
                              darkMode ? "text-zeus-silver" : "text-gray-500"
                            }`}
                          >
                            {temperature < 0.3
                              ? "Conservative"
                              : temperature < 0.7
                              ? "Balanced"
                              : "Creative"}
                          </span>
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
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-zeus-gold"
                        />
                        <div className="flex justify-between mt-1">
                          <span
                            className={`text-xs ${
                              darkMode ? "text-zeus-silver" : "text-gray-500"
                            }`}
                          >
                            Precise
                          </span>
                          <span
                            className={`text-xs ${
                              darkMode ? "text-zeus-silver" : "text-gray-500"
                            }`}
                          >
                            Creative
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Tips Card */}
            <div
              className={`rounded-xl ${cardThemeClasses} border shadow-sm overflow-hidden transition-all duration-300`}
            >
              <div
                className={`p-4 flex justify-between items-center cursor-pointer ${
                  darkMode ? "hover:bg-zeus-charcoal/50" : "hover:bg-gray-50"
                } transition-colors`}
                onClick={() => setShowTips(!showTips)}
              >
                <div className="flex items-center">
                  <LightbulbIcon
                    size={18}
                    className={`mr-2 ${
                      darkMode ? "text-zeus-gold" : "text-gray-700"
                    }`}
                  />
                  <h3
                    className={`font-medium ${
                      darkMode ? "text-zeus-white" : "text-gray-800"
                    }`}
                  >
                    Tips for Better Results
                  </h3>
                </div>
                <div>
                  <ChevronRight
                    size={18}
                    className={`transform transition-transform ${
                      showTips ? "rotate-90" : ""
                    } ${darkMode ? "text-zeus-silver" : "text-gray-500"}`}
                  />
                </div>
              </div>

              <AnimatePresence>
                {showTips && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-2">
                      <ul
                        className={`space-y-2 text-sm ${
                          darkMode ? "text-zeus-silver" : "text-gray-600"
                        }`}
                      >
                        <li className="flex items-start">
                          <div
                            className={`mt-1 mr-2 min-w-[18px] h-[18px] rounded-full ${
                              darkMode
                                ? "bg-zeus-navy text-zeus-gold"
                                : "bg-gray-100 text-gray-500"
                            } flex items-center justify-center text-xs font-bold`}
                          >
                            1
                          </div>
                          Use clear, well-lit photos that show the entire outfit
                        </li>
                        <li className="flex items-start">
                          <div
                            className={`mt-1 mr-2 min-w-[18px] h-[18px] rounded-full ${
                              darkMode
                                ? "bg-zeus-navy text-zeus-gold"
                                : "bg-gray-100 text-gray-500"
                            } flex items-center justify-center text-xs font-bold`}
                          >
                            2
                          </div>
                          Front-facing photos work best for complete analysis
                        </li>
                        <li className="flex items-start">
                          <div
                            className={`mt-1 mr-2 min-w-[18px] h-[18px] rounded-full ${
                              darkMode
                                ? "bg-zeus-navy text-zeus-gold"
                                : "bg-gray-100 text-gray-500"
                            } flex items-center justify-center text-xs font-bold`}
                          >
                            3
                          </div>
                          For text descriptions, include details about colors,
                          materials, and fit
                        </li>
                        <li className="flex items-start">
                          <div
                            className={`mt-1 mr-2 min-w-[18px] h-[18px] rounded-full ${
                              darkMode
                                ? "bg-zeus-navy text-zeus-gold"
                                : "bg-gray-100 text-gray-500"
                            } flex items-center justify-center text-xs font-bold`}
                          >
                            4
                          </div>
                          Try different analysis modes for varied perspectives
                        </li>
                        <li className="flex items-start">
                          <div
                            className={`mt-1 mr-2 min-w-[18px] h-[18px] rounded-full ${
                              darkMode
                                ? "bg-zeus-navy text-zeus-gold"
                                : "bg-gray-100 text-gray-500"
                            } flex items-center justify-center text-xs font-bold`}
                          >
                            5
                          </div>
                          Higher creativity levels give more unique suggestions
                        </li>
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
              className={`rounded-xl ${cardThemeClasses} border shadow-sm overflow-hidden transition-all duration-300 mb-4`}
            >
              <div className="flex justify-between items-center p-4 border-b border-gray-700">
                <div className="flex items-center">
                  <Sparkles
                    size={18}
                    className={`mr-2 ${
                      darkMode ? "text-zeus-gold" : "text-gray-700"
                    }`}
                  />
                  <h3
                    className={`font-medium ${
                      darkMode ? "text-zeus-white" : "text-gray-800"
                    }`}
                  >
                    AI Fashion Analysis
                  </h3>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={copyToClipboard}
                    className={`p-1.5 rounded-full ${
                      darkMode ? "hover:bg-zeus-charcoal" : "hover:bg-gray-100"
                    } transition-colors`}
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check
                        size={16}
                        className={
                          darkMode ? "text-green-400" : "text-green-500"
                        }
                      />
                    ) : (
                      <Copy
                        size={16}
                        className={
                          darkMode ? "text-zeus-silver" : "text-gray-500"
                        }
                      />
                    )}
                  </button>
                  <button
                    onClick={downloadResponse}
                    className={`p-1.5 rounded-full ${
                      darkMode ? "hover:bg-zeus-charcoal" : "hover:bg-gray-100"
                    } transition-colors`}
                    title="Download as markdown"
                  >
                    <Download
                      size={16}
                      className={
                        darkMode ? "text-zeus-silver" : "text-gray-500"
                      }
                    />
                  </button>
                  {/* View mode toggle - Mobile only */}
                  {isMobile && (
                    <button
                      onClick={toggleViewMode}
                      className={`p-1.5 rounded-full ${
                        darkMode
                          ? "hover:bg-zeus-charcoal"
                          : "hover:bg-gray-100"
                      } transition-colors`}
                      title="Toggle view"
                    >
                      {viewMode === "output" ? (
                        <ArrowRight
                          size={16}
                          className={
                            darkMode ? "text-zeus-silver" : "text-gray-500"
                          }
                        />
                      ) : (
                        <Split
                          size={16}
                          className={
                            darkMode ? "text-zeus-silver" : "text-gray-500"
                          }
                        />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="p-5">
                {loading ? (
                  <LoaderAnimation />
                ) : (
                  <motion.div
                    key="response"
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                    className={`prose ${
                      darkMode ? "prose-invert" : ""
                    } max-w-none`}
                  >
                    <ReactMarkdown
                      components={{
                        h1: ({ node, ...props }) => (
                          <motion.h1
                            variants={itemVariants}
                            className="text-xl font-bold mb-4 text-zeus-gold"
                            {...props}
                          />
                        ),
                        h2: ({ node, ...props }) => (
                          <motion.h2
                            variants={itemVariants}
                            className={`text-lg font-bold mt-6 mb-3 ${
                              darkMode ? "text-zeus-gold" : "text-zeus-navy"
                            }`}
                            {...props}
                          />
                        ),
                        h3: ({ node, ...props }) => (
                          <motion.h3
                            variants={itemVariants}
                            className={`text-md font-bold mt-4 mb-2 ${
                              darkMode ? "text-zeus-white" : "text-gray-800"
                            }`}
                            {...props}
                          />
                        ),
                        p: ({ node, ...props }) => (
                          <motion.p
                            variants={itemVariants}
                            className={`mb-4 ${
                              darkMode ? "text-zeus-silver" : "text-gray-700"
                            }`}
                            {...props}
                          />
                        ),
                        ul: ({ node, ...props }) => (
                          <motion.ul
                            variants={itemVariants}
                            className="list-disc pl-5 mb-4 space-y-1"
                            {...props}
                          />
                        ),
                        li: ({ node, ...props }) => (
                          <motion.li
                            variants={itemVariants}
                            className={`${
                              darkMode ? "text-zeus-silver" : "text-gray-700"
                            }`}
                            {...props}
                          />
                        ),
                        strong: ({ node, ...props }) => (
                          <motion.strong
                            variants={itemVariants}
                            className={`font-bold ${
                              darkMode ? "text-zeus-white" : "text-gray-900"
                            }`}
                            {...props}
                          />
                        ),
                      }}
                    >
                      {responseText}
                    </ReactMarkdown>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Style Tags Section */}
            {styleTags.length > 0 && !loading && (
              <div
                className={`rounded-xl ${cardThemeClasses} border shadow-sm p-4 mb-6 transition-all duration-300`}
              >
                <h3
                  className={`text-sm font-medium mb-3 ${
                    darkMode ? "text-zeus-white" : "text-gray-800"
                  }`}
                >
                  Style Keywords
                </h3>
                <div className="flex flex-wrap gap-2">
                  {styleTags.map((tag, index) => (
                    <motion.span
                      key={index}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        delay: index * 0.1,
                        type: "spring",
                        stiffness: 300,
                      }}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        darkMode
                          ? "bg-zeus-navy text-zeus-gold"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      #{tag}
                    </motion.span>
                  ))}
                </div>
              </div>
            )}

            {/* Share section */}
            {!loading && showResults && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator
                        .share({
                          title: "My Zeus AI Fashion Analysis",
                          text: "Check out this AI fashion analysis I got!",
                          url: window.location.href,
                        })
                        .catch((error) => console.log("Error sharing", error));
                    } else {
                      // Fallback copy url
                      navigator.clipboard.writeText(window.location.href);
                      alert("Link copied to clipboard!");
                    }
                  }}
                  className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${
                    darkMode
                      ? "bg-zeus-navy hover:bg-zeus-charcoal text-zeus-silver"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  } transition-colors`}
                >
                  <Share2 size={14} className="mr-1.5" />
                  Share Analysis
                </button>

                <button
                  onClick={() => setHistoryExpanded(true)}
                  className={`ml-3 inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${
                    darkMode
                      ? "bg-zeus-navy hover:bg-zeus-charcoal text-zeus-silver"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  } transition-colors`}
                >
                  <History size={14} className="mr-1.5" />
                  History
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* History Toggle Button (Fixed) */}
      <div className="fixed bottom-5 right-5">
        <button
          onClick={() => setHistoryExpanded(true)}
          className="w-12 h-12 rounded-full bg-zeus-navy shadow-lg flex items-center justify-center hover:bg-opacity-90 transition-colors"
          aria-label="Show history"
        >
          <History size={20} className="text-zeus-gold" />
        </button>
      </div>
    </div>
  );
};

export default AIFashionAssistant;
import {
  Upload,
  X,
  Loader2,
  Sparkles,
  LightbulbIcon,
  Camera,
  History,
  // Remove unused imports
} from "lucide-react";
import {
  Upload,
  X,
  Loader2,
  Sparkles,
  LightbulbIcon,
  Camera,
  History,
  // Remove unused imports
} from "lucide-react";
