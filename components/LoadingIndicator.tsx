
import React from 'react';

interface LoadingIndicatorProps {
  message?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center animate-pulse">
      <div className="w-16 h-16 border-4 border-t-transparent border-purple-500 rounded-full animate-spin"></div>
      <p className="text-xl text-slate-300 font-medium">{message}</p>
    </div>
  );
};
