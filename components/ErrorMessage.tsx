
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  if (!message) return null;
  return (
    <div 
      className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg relative mb-6 flex items-start space-x-3 animate-fadeIn" 
      role="alert"
    >
      <AlertTriangle size={24} className="text-red-400 mt-0.5 shrink-0" />
      <div>
        <strong className="font-bold text-red-200">Oops! Something went wrong.</strong>
        <span className="block sm:inline ml-1 text-red-300">{message}</span>
      </div>
    </div>
  );
};