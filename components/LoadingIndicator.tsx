import { Loader2 } from "lucide-react";
import React from "react";

interface LoadingIndicatorProps {
  message?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = "Loading...",
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 animate-fadeIn">
      <div className="relative mb-4">
        {/* Spinning loader */}
        <Loader2
          size={48}
          className="text-purple-400 animate-spin"
          strokeWidth={2}
        />
      </div>

      {/* Animated dots */}
      <div className="flex space-x-2 mb-4">
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
        <div
          className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"
          style={{ animationDelay: "0.2s" }}
        ></div>
        <div
          className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"
          style={{ animationDelay: "0.4s" }}
        ></div>
      </div>

      <p className="text-slate-300 text-center max-w-md">{message}</p>

      {/* Shimmer effect bar */}
      <div className="w-64 h-1 bg-slate-700 rounded-full mt-4 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-transparent via-purple-500 to-transparent w-1/3 animate-shimmer"></div>
      </div>
    </div>
  );
};
