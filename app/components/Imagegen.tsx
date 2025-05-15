import React, { useState, useEffect } from "react";
import { ImageIcon, Download, Loader2, AlertCircle } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface ImagegenProps {
  responseText?: string;
  darkMode?: boolean;
}

type AspectRatio = "1:1" | "4:3" | "16:9" | "3:4" | "9:16";

const aspectRatioDimensions: Record<AspectRatio, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "4:3": { width: 1024, height: 768 },
  "16:9": { width: 1024, height: 576 },
  "3:4": { width: 768, height: 1024 },
  "9:16": { width: 576, height: 1024 },
};

const Imagegen: React.FC<ImagegenProps> = ({
  responseText = "",
  darkMode = true,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");

  // Theme classes
  const themeClasses = darkMode
    ? "bg-zeus-charcoal border-zeus-navy text-zeus-white"
    : "bg-white border-gray-200 text-gray-900";

  // Extract fashion description from the response text
  useEffect(() => {
    if (responseText) {
      const lines = responseText.split("\n");
      const styleLines = lines.filter((line) =>
        /(style|dress|outfit|color|wearing|fabric|pattern|design|accessories|details)/i.test(line)
      );

      let extractedPrompt = "";
      if (styleLines.length > 0) {
        extractedPrompt = styleLines
          .slice(0, 5)
          .map((line) => line.replace(/\*\*/g, "").trim())
          .join(". ");

        extractedPrompt = `A high quality fashion photography of ${extractedPrompt}. Professional fashion photography, studio lighting, high resolution, photorealistic, detailed texture, fashion editorial style, clean background, perfect composition.`;
      } else {
        extractedPrompt = "A high quality fashion photography of stylish clothing and accessories. Professional fashion photography, studio lighting, high resolution, photorealistic, fashion editorial style.";
      }

      setPrompt(extractedPrompt);
    }
  }, [responseText]);

  const generateImage = async () => {
    if (!prompt) return;

    setIsGenerating(true);
    setError(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINIFLASH_API_KEY;
      
      if (!apiKey) {
        throw new Error("API key not found. Please check your environment variables.");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-preview-image-generation",
        generationConfig: {
          temperature: 0.9,
          topK: 32,
          topP: 1,
          maxOutputTokens: 2048,
        }
      });

      const dimensions = aspectRatioDimensions[aspectRatio];
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Generate a fashion image with these specifications:
                ${prompt}
                Aspect ratio: ${aspectRatio} (${dimensions.width}x${dimensions.height})
                Style: Professional fashion photography
                Quality: High resolution, photorealistic
                Please generate an image that matches this description.`
              }
            ],
          },
        ]
      });

      const response = await result.response;
      
      if (!response.candidates || response.candidates.length === 0) {
        throw new Error("No response received from the API");
      }

      const parts = response.candidates[0].content.parts;
      let imageData = null;

      for (const part of parts) {
        if (part.inlineData) {
          imageData = part.inlineData.data;
          break;
        }
      }

      if (imageData) {
        const imageUrl = `data:image/png;base64,${imageData}`;
        setGeneratedImage(imageUrl);
      } else {
        throw new Error("No image data found in the response. Please try again.");
      }
    } catch (err: any) {
      console.error("Error generating image:", err);
      if (err.message.includes("API key")) {
        setError("Invalid API key. Please check your environment variables.");
      } else if (err.message.includes("Failed to fetch")) {
        setError("Network error: Please check your internet connection and try again.");
      } else {
        setError(err.message || "Failed to generate image. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `fashion-generated-image-${aspectRatio}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`rounded-xl shadow-lg overflow-hidden ${themeClasses} mb-6`}>
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-zeus-gold rounded-full">
            <ImageIcon size={14} className="text-white" />
          </div>
          <h3 className="text-lg font-medium">AI Image Generator</h3>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4">
          <label className={`text-sm font-medium ${darkMode ? "text-zeus-silver" : "text-gray-600"}`}>
            Generation Prompt
          </label>
          <div className={`mt-2 p-3 rounded-lg ${darkMode ? "bg-zeus-navy" : "bg-gray-50"} text-sm`}>
            <p className="line-clamp-3">{prompt}</p>
          </div>
        </div>

        <div className="mb-4">
          <label className={`text-sm font-medium ${darkMode ? "text-zeus-silver" : "text-gray-600"}`}>
            Aspect Ratio
          </label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            className={`mt-2 w-full p-2 rounded-lg ${
              darkMode ? "bg-zeus-navy text-white" : "bg-gray-50 text-gray-900"
            } border ${darkMode ? "border-gray-700" : "border-gray-200"} focus:outline-none focus:ring-2 focus:ring-zeus-gold`}
          >
            <option value="1:1">Square (1:1)</option>
            <option value="4:3">Landscape (4:3)</option>
            <option value="16:9">Widescreen (16:9)</option>
            <option value="3:4">Portrait (3:4)</option>
            <option value="9:16">Mobile (9:16)</option>
          </select>
        </div>

        <button
          onClick={generateImage}
          disabled={isGenerating || !prompt}
          className={`w-full py-3 px-4 flex items-center justify-center rounded-lg text-white font-medium transition-all mb-4 ${
            isGenerating || !prompt
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-zeus-navy via-zeus-gold to-zeus-navy hover:opacity-90"
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 size={20} className="animate-spin mr-2" />
              Generating...
            </>
          ) : (
            <>
              <ImageIcon size={20} className="mr-2" />
              Generate Fashion Image
            </>
          )}
        </button>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {generatedImage && !isGenerating && (
          <div className="mb-4">
            <div className="relative rounded-lg overflow-hidden bg-black/20">
              <img
                src={generatedImage}
                alt="Generated fashion"
                className="w-full h-auto"
              />
              <button
                onClick={downloadImage}
                className="absolute bottom-3 right-3 bg-zeus-navy/80 hover:bg-zeus-navy p-2 rounded-full shadow-lg transition-colors"
                title="Download image"
              >
                <Download size={18} className="text-zeus-gold" />
              </button>
            </div>
            <p className="mt-2 text-xs text-center text-zeus-silver">
              Image generated using Google Gemini ({aspectRatio})
            </p>
          </div>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center justify-center h-64 bg-black/10 rounded-lg">
            <div className="w-10 h-10 border-4 border-zeus-gold border-t-transparent rounded-full mb-4 animate-spin"></div>
            <p className="text-zeus-gold font-medium">Generating fashion image...</p>
            <p className="text-xs text-zeus-silver mt-1">This may take up to 30 seconds</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-700 flex justify-between text-xs text-zeus-silver">
        <span>Powered by Google</span>
        <span>Gemini 2.0</span>
      </div>
    </div>
  );
};

export default Imagegen; 