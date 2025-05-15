"use client";

import React, { useState, useEffect, useCallback } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  Upload,
  X,
  Loader2,
  Sparkles,
  LightbulbIcon,
  Camera,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

// Configuration moved to a separate constant
const CONFIG = {
  API_KEY: "AIzaSyCwfP90K1RoQow4YW5U2j8V-0ECF3d-5as",
  MODEL: "gemini-1.5-flash",
};

const AIFashionAssistant = () => {
  const [image, setImage] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [history, setHistory] = useState([]);
  const [styleTags, setStyleTags] = useState([]);
  const [showTips, setShowTips] = useState(false);

  // Initialize Gemini API
  const genAI = new GoogleGenerativeAI(CONFIG.API_KEY);

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
  };

  // Submit to Gemini API for analysis with enhanced prompt
  const handleSubmit = async () => {
    if (!image) return;

    setLoading(true);
    setResponseText("");

    try {
      const model = genAI.getGenerativeModel({ model: CONFIG.MODEL });
      const imagePart = await fileToGenerativePart(image);

      // Enhanced structured prompt for better results - CORRECTED VERSION
      const prompt = `Analyze this outfit/fashion image and provide detailed style recommendations, including skin tone and height considerations.

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
* Proportion-balancing techniques based on height

Please note: 
- Use clear descriptions without asterisk emphasis
- Specify if skin tone/height analysis is inconclusive
- Acknowledge this as general advice, not professional styling
`;

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [imagePart, { text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7, // Add slight creativity
          maxOutputTokens: 800, // Ensure comprehensive response
        },
      });

      const response = await result.response;
      const text =
        typeof response.text === "function"
          ? await response.text()
          : response.text;

      setResponseText(text);

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
        },
      ]);
    } catch (error) {
      console.error("Error:", error);
      setResponseText(
        "Sorry, there was an error analyzing your image. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0A0A] via-[#36454F] to-[#0A0A0A] py-12 px-4">
      <div className="max-w-3xl mx-auto bg-[#C0C0C0]/10 backdrop-blur-md rounded-xl shadow-2xl p-8 border border-[#D4AF37]/20">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-3">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#4B0082] via-[#D4AF37] to-[#4B0082] rounded-full blur opacity-30"></div>
              <div className="relative bg-gradient-to-r from-[#4B0082] via-[#D4AF37] to-[#4B0082] p-3 rounded-full">
                <Camera size={28} className="text-[#C0C0C0]" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-serif font-bold bg-gradient-to-r from-[#C0C0C0] via-[#D4AF37] to-[#C0C0C0] bg-clip-text text-transparent mb-2">
            AI Fashion Assistant
          </h1>
          <p className="text-[#C0C0C0]/80">
            Upload an outfit photo for personalized style recommendations
          </p>

          {/* Style tags */}
          {styleTags.length > 0 && (
            <div className="flex flex-wrap justify-center mt-4 gap-2">
              {styleTags.map((tag, index) => (
                <div
                  key={index}
                  className="px-3 py-1 bg-[#4B0082]/20 border border-[#D4AF37]/30 rounded-full text-sm text-[#C0C0C0] font-medium"
                >
                  {tag}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 mb-6 text-center transition-all duration-300
            ${
              dragActive
                ? "border-[#D4AF37] bg-[#4B0082]/20"
                : "border-[#36454F] hover:border-[#D4AF37] hover:bg-[#4B0082]/10"
            }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <input
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
        </div>

        {/* Action Button */}
        <button
          onClick={handleSubmit}
          disabled={loading || !image}
          className={`w-full py-4 px-6 rounded-lg font-medium text-[#C0C0C0] transition-all duration-300
            ${
              loading || !image
                ? "bg-[#36454F] cursor-not-allowed"
                : "bg-gradient-to-r from-[#4B0082] via-[#D4AF37] to-[#4B0082] hover:from-[#4B0082]/90 hover:via-[#D4AF37]/90 hover:to-[#4B0082]/90 shadow-lg hover:shadow-xl"
            }`}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <Loader2 className="animate-spin h-5 w-5 mr-3" />
              Analyzing your outfit...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <Sparkles className="h-5 w-5 mr-2" />
              Get Fashion Suggestions
            </div>
          )}
        </button>

        {/* Enhanced Results Section with Style Cards */}
        {responseText && (
          <div className="mt-8">
            <div className="flex items-center mb-4">
              <Sparkles className="text-[#D4AF37] mr-2" size={20} />
              <h2 className="text-xl font-serif font-semibold text-[#C0C0C0]">
                Your Style Recommendations
              </h2>
            </div>

            {/* Style Analysis Card */}
            <div className="p-6 bg-[#0A0A0A]/50 backdrop-blur-sm rounded-xl shadow-lg mb-6 border border-[#D4AF37]/20">
              <div className="relative">
                {/* Decorative elements */}
                <div className="absolute -top-3 -left-3 w-12 h-12 rounded-full bg-gradient-to-r from-[#4B0082]/30 to-[#D4AF37]/30 opacity-50"></div>
                <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-gradient-to-r from-[#D4AF37]/30 to-[#4B0082]/30 opacity-30"></div>

                {/* Content */}
                <div className="relative z-10">
                  <div
                    className="prose prose-invert max-w-full"
                    style={{
                      color: "#C0C0C0",
                      background: "rgba(10,10,10,0.7)",
                      borderRadius: "1rem",
                      padding: "2rem",
                      border: "1px solid #D4AF37",
                    }}
                  >
                    <ReactMarkdown
                      components={{
                        h2: ({ node, ...props }) => (
                          <h2
                            style={{ color: "#D4AF37", fontFamily: "serif" }}
                            {...props}
                          />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3
                            style={{ color: "#4B0082", fontFamily: "serif" }}
                            {...props}
                          />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong style={{ color: "#D4AF37" }} {...props} />
                        ),
                        li: ({ node, ...props }) => (
                          <li style={{ color: "#C0C0C0" }} {...props} />
                        ),
                      }}
                    >
                      {responseText}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Summary Card */}
            <div className="p-5 bg-[#0A0A0A]/50 backdrop-blur-sm rounded-xl shadow-lg border border-[#D4AF37]/20">
              <h3 className="text-md font-serif font-bold text-[#C0C0C0] mb-3 flex items-center">
                <svg
                  className="w-4 h-4 mr-2 text-[#D4AF37]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Quick Style Summary
              </h3>
              <div className="flex flex-wrap gap-2">
                {responseText
                  .split("\n")
                  .filter((line) => line.includes(":") && line.length < 50)
                  .slice(0, 5)
                  .map((item, idx) => {
                    const [category] = item.split(":", 1);
                    return (
                      <div
                        key={idx}
                        className="bg-[#4B0082]/20 border border-[#D4AF37]/30 px-3 py-1 rounded-full text-sm text-[#C0C0C0] font-medium"
                      >
                        {category}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* History Section */}
        {history.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setHistoryExpanded(!historyExpanded)}
              className="flex items-center text-[#C0C0C0] hover:text-[#D4AF37] font-medium transition-colors"
            >
              {historyExpanded ? "Hide" : "Show"} Previous Analyses (
              {history.length})
              <svg
                className={`ml-1 h-5 w-5 transform transition-transform ${
                  historyExpanded ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {historyExpanded && (
              <div className="mt-4 space-y-4">
                {history.map((item, index) => (
                  <div
                    key={item.id}
                    className="border border-[#D4AF37]/20 rounded-lg p-4 hover:border-[#D4AF37]/40 transition-colors cursor-pointer bg-[#0A0A0A]/50 backdrop-blur-sm"
                    onClick={() => {
                      setImage(null);
                      setPreview(item.preview);
                      setResponseText(item.response);
                    }}
                  >
                    <div className="flex">
                      <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-purple-50">
                        <img
                          src={item.preview}
                          alt="History item"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="ml-4 flex-1 overflow-hidden">
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-gray-800">
                            Analysis #{history.length - index}
                          </p>
                          <span className="text-xs text-gray-400">
                            {item.timestamp || "Previous"}
                          </span>
                        </div>

                        {/* Extract style categories */}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.response
                            .split("\n")
                            .filter(
                              (line) =>
                                line.includes("Style") && line.includes(":")
                            )
                            .slice(0, 1)
                            .map((styleLine, i) => {
                              // Extract text after "Style" and ":"
                              const styleText = styleLine.split(":")[1] || "";
                              return (
                                <span
                                  key={i}
                                  className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded"
                                >
                                  {styleText
                                    .trim()
                                    .split(" ")
                                    .slice(0, 3)
                                    .join(" ")}
                                </span>
                              );
                            })}
                        </div>

                        <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                          {item.response.substring(0, 120)}...
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div className="mt-8">
        <button
          onClick={() => setShowTips(!showTips)}
          className="flex items-center mx-auto text-[#C0C0C0]/80 hover:text-[#D4AF37] text-sm font-medium transition-colors"
        >
          <LightbulbIcon size={16} className="mr-1" />
          {showTips ? "Hide Tips" : "Photography Tips for Better Analysis"}
        </button>

        {showTips && (
          <div className="mt-4 p-4 bg-[#0A0A0A]/50 backdrop-blur-sm rounded-lg text-sm text-[#C0C0C0] border border-[#D4AF37]/20">
            <h4 className="font-serif font-bold mb-2 text-[#D4AF37]">
              Tips for Better Fashion Analysis:
            </h4>
            <ul className="space-y-2">
              <li className="flex">
                <span className="text-[#D4AF37] mr-2">•</span>
                <span>
                  <b>Good lighting:</b> Take photos in natural daylight for
                  accurate color analysis
                </span>
              </li>
              <li className="flex">
                <span className="text-[#D4AF37] mr-2">•</span>
                <span>
                  <b>Full outfit:</b> Capture the entire outfit including shoes
                  when possible
                </span>
              </li>
              <li className="flex">
                <span className="text-[#D4AF37] mr-2">•</span>
                <span>
                  <b>Clear background:</b> Use a neutral background to focus on
                  the clothing
                </span>
              </li>
              <li className="flex">
                <span className="text-[#D4AF37] mr-2">•</span>
                <span>
                  <b>Multiple angles:</b> Try uploading different perspectives
                  for comprehensive advice
                </span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center mt-8 text-[#C0C0C0]/60 text-sm">
        Powered by Google Gemini AI • Created by AI Fashion Assistant
      </div>
    </div>
  );
};

export default AIFashionAssistant;
