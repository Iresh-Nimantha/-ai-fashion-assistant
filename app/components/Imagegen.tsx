import React, { useState, useEffect } from "react";
import { ImageIcon, Download, Loader2, AlertCircle } from "lucide-react";

// Don't import or initialize the API globally
// We'll handle this inside the component

interface ImagegenProps {
  responseText?: string;
  darkMode?: boolean;
  apiKey?: string; // New prop to pass API key from parent
}

type AspectRatio = "1:1" | "4:3" | "16:9" | "3:4" | "9:16";

const aspectRatioDimensions: Record<
  AspectRatio,
  { width: number; height: number }
> = {
  "1:1": { width: 1024, height: 1024 },
  "4:3": { width: 1024, height: 768 },
  "16:9": { width: 1024, height: 576 },
  "3:4": { width: 768, height: 1024 },
  "9:16": { width: 576, height: 1024 },
};

const Imagegen: React.FC<ImagegenProps> = ({
  responseText = "",
  darkMode = true,
  apiKey, // Get API key from props
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [apiKeyInput, setApiKeyInput] = useState<string>(apiKey || "");
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(!apiKey);

  // Environment variable handling - use dynamic access for better error handling
  const envApiKey =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_GEMINI_IMAGE_API_KEY
      : null;

  // Theme classes
  const themeClasses = darkMode
    ? "bg-zeus-charcoal border-zeus-navy text-zeus-white"
    : "bg-white border-gray-200 text-gray-900";

  // Extract fashion description from the response text
  useEffect(() => {
    if (responseText) {
      const lines = responseText.split("\n");
      const styleLines = lines.filter((line) =>
        /(style|dress|outfit|color|wearing|fabric|pattern|design|accessories|details)/i.test(
          line
        )
      );

      let extractedPrompt = "";
      if (styleLines.length > 0) {
        extractedPrompt = styleLines
          .slice(0, 5)
          .map((line) => line.replace(/\*\*/g, "").trim())
          .join(". ");

        extractedPrompt = `A high quality fashion photography of ${extractedPrompt}. Professional fashion photography, studio lighting, high resolution, photorealistic, detailed texture, fashion editorial style, clean background, perfect composition.`;
      } else {
        extractedPrompt =
          "A high quality fashion photography of stylish clothing and accessories. Professional fashion photography, studio lighting, high resolution, photorealistic, fashion editorial style.";
      }

      setPrompt(extractedPrompt);
    }
  }, [responseText]);

  const generateImage = async () => {
    if (!prompt) return;

    // Use API key from state, props, or environment variable
    const currentApiKey = apiKeyInput || apiKey || envApiKey;

    if (!currentApiKey) {
      setError("Please provide a Google Gemini API key to generate images");
      setShowApiKeyInput(true);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Import GoogleGenAI dynamically to prevent issues at build time
      const { GoogleGenAI, Modality } = await import("@google/genai");

      // Initialize the API with the key
      const ai = new GoogleGenAI({ apiKey: currentApiKey });

      const dimensions = aspectRatioDimensions[aspectRatio];
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-preview-image-generation",
        contents: prompt,
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
          generationConfig: {
            width: dimensions.width,
            height: dimensions.height,
          },
        },
      });

      const candidates = response.candidates;
      if (!candidates || !candidates[0]?.content?.parts) {
        throw new Error("Invalid response from API");
      }

      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          const imageData = part.inlineData.data;
          const imageUrl = `data:image/png;base64,${imageData}`;
          setGeneratedImage(imageUrl);
          break;
        }
      }
    } catch (err: any) {
      console.error("Error generating image:", err);
      if (err.message.includes("API key")) {
        setError("Invalid API key. Please check your Google Gemini API key.");
        setShowApiKeyInput(true);
      } else if (err.message.includes("Failed to fetch")) {
        setError(
          "Network error: Please check your internet connection and try again."
        );
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

  const saveApiKey = () => {
    if (apiKeyInput.trim()) {
      // Store in session storage for temporary persistence
      if (typeof window !== "undefined") {
        sessionStorage.setItem("gemini_api_key", apiKeyInput.trim());
      }
      setShowApiKeyInput(false);
      setError(null);
    }
  };

  return (
    <div
      className={`rounded-xl shadow-lg overflow-hidden ${themeClasses} mb-6`}
    >
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
          <label
            className={`text-sm font-medium ${
              darkMode ? "text-zeus-silver" : "text-gray-600"
            }`}
          >
            Generation Prompt
          </label>
          <div
            className={`mt-2 p-3 rounded-lg ${
              darkMode ? "bg-zeus-navy" : "bg-gray-50"
            } text-sm`}
          >
            <p className="line-clamp-3">{prompt}</p>
          </div>
        </div>

        <div className="mb-4">
          <label
            className={`text-sm font-medium ${
              darkMode ? "text-zeus-silver" : "text-gray-600"
            }`}
          >
            Aspect Ratio
          </label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            className={`mt-2 w-full p-2 rounded-lg ${
              darkMode ? "bg-zeus-navy text-white" : "bg-gray-50 text-gray-900"
            } border ${
              darkMode ? "border-gray-700" : "border-gray-200"
            } focus:outline-none focus:ring-2 focus:ring-zeus-gold`}
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
            <p className="text-zeus-gold font-medium">
              Generating fashion image...
            </p>
            <p className="text-xs text-zeus-silver mt-1">
              This may take up to 30 seconds
            </p>
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
