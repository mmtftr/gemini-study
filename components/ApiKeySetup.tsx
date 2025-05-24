import { ExternalLink, Key } from "lucide-react";
import React, { useState } from "react";
import { GeminiModel } from "../types";

interface ApiKeySetupProps {
  onApiKeyProvided: (apiKey: string, selectedModel: GeminiModel) => void;
}

export const ApiKeySetup: React.FC<ApiKeySetupProps> = ({
  onApiKeyProvided,
}) => {
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState<GeminiModel>(
    GeminiModel.FLASH
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      setIsLoading(true);
      onApiKeyProvided(apiKey.trim(), selectedModel);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="w-full max-w-md bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Key className="w-16 h-16 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
            Welcome to Gemini Quiz Master
          </h1>
          <p className="text-slate-300 mt-2">
            Enter your Google Gemini API key to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="apiKey"
              className="block text-sm font-medium text-sky-300 mb-2"
            >
              Gemini API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key..."
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none placeholder-slate-400 text-slate-100"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label
              htmlFor="model"
              className="block text-sm font-medium text-sky-300 mb-2"
            >
              Default AI Model
            </label>
            <select
              id="model"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as GeminiModel)}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-slate-100"
              disabled={isLoading}
            >
              <option value={GeminiModel.FLASH}>
                Gemini 2.5 Flash (Faster, Good for most uses)
              </option>
              <option value={GeminiModel.PRO}>
                Gemini 2.5 Pro (Slightly Slower, Potentially Higher Quality)
              </option>
              <option value={GeminiModel.FLASH_2_0}>
                Gemini 2.0 Flash (Latest, with Google Search access)
              </option>
            </select>
            <p className="text-xs text-slate-400 mt-1">
              You can change this later for individual quizzes
            </p>
          </div>

          <button
            type="submit"
            disabled={!apiKey.trim() || isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-pink-500 transition duration-150 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? "Setting up..." : "Start Using Quiz Master"}
          </button>
        </form>

        <div className="mt-8 p-4 bg-slate-700/50 rounded-lg">
          <h3 className="text-sm font-semibold text-sky-300 mb-2">
            Need an API key?
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Get your free Gemini API key from Google AI Studio
          </p>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Get API Key
          </a>
        </div>

        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-300 mb-2">
            🔒 Privacy Notice
          </h4>
          <p className="text-xs text-blue-200">
            Your API key is stored locally in your browser and is never sent to
            our servers. It's only used to communicate directly with Google's
            Gemini API.
          </p>
        </div>
      </div>
    </div>
  );
};
