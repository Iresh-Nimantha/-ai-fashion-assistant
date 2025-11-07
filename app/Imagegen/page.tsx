"use client";
import React, { useState, useEffect } from "react";
import { ImageIcon, Download, Loader2 } from "lucide-react";

interface ImagegenProps {
  responseText?: string;
  darkMode?: boolean;
}

const VLM_MODEL_NAME = "Qwen/Qwen2.5-VL-7B-Instruct";

// Supported output aspect ratios
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
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");

  // Extract style keywords from responseText
  useEffect(() => {
    if (!responseText) return;

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
    } else {
      extractedPrompt = "stylish clothing and accessories";
    }

    // Add multi-angle collage instruction
    const fullPrompt = `A high quality fashion photograph of ${extractedPrompt}. Generate a realistic fashion image collage showing the full outfit from multiple angles: front view, back view, left side, right side, and close-up details. Professional studio lighting, photorealistic, high-resolution, fashion editorial style, clean background.`;

    setPrompt(fullPrompt);
  }, [responseText]);

  // Call backend API to generate image
  async function requestImageFromVLM(
    textPrompt: string,
    ratio: AspectRatio
  ): Promise<string> {
    const { width, height } = aspectRatioDimensions[ratio];

    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: textPrompt, width, height }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Image generation failed.");
    }

    const json = await res.json();
    return json.image;
  }

  const generateImage = async () => {
    if (!prompt) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const dataUri = await requestImageFromVLM(prompt, aspectRatio);
      setGeneratedImage(dataUri);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate image.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `fashion-${aspectRatio}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className={`rounded-xl shadow-lg overflow-hidden ${
        darkMode
          ? "bg-zeus-charcoal border-zeus-navy text-white"
          : "bg-white border-gray-200 text-gray-900"
      } mb-6`}
    >
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-zeus-gold rounded-full">
            <ImageIcon size={14} className="text-white" />
          </div>
          <h3 className="text-lg font-medium">AI Fashion Image Generator</h3>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-400">
            Generation Prompt
          </label>
          <div
            className={`mt-2 p-3 rounded-lg ${
              darkMode ? "bg-zeus-navy text-white" : "bg-gray-50 text-gray-900"
            } text-sm`}
          >
            <p className="line-clamp-5">{prompt}</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-gray-400">
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
            <p className="mt-2 text-xs text-center text-gray-400">
              Generated via Hugging Face Router ({aspectRatio})
            </p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-700 flex justify-between text-xs text-gray-400">
        <span>Powered by Hugging Face</span>
        <span>{VLM_MODEL_NAME}</span>
      </div>
    </div>
  );
};

export default Imagegen;
