import { BarChart3, BookOpen, Brain, MessageCircle, X } from "lucide-react";
import React, { useEffect } from "react";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isOpen && event.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
    >
      <div
        className="bg-slate-800 p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-2xl relative border border-slate-700 animate-fadeInUp max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-full transition-colors"
          aria-label="Close info modal"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-6">
          <h2
            id="info-modal-title"
            className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 mb-2"
          >
            Welcome to Gemini Quiz Master
          </h2>
          <p className="text-slate-300 text-lg">
            Your AI-powered learning companion
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <BookOpen className="w-8 h-8 text-purple-400 mt-1 shrink-0" />
            <div>
              <h3 className="text-xl font-semibold text-sky-300 mb-2">
                Course Management
              </h3>
              <p className="text-slate-300">
                Create and organize your learning materials into courses. Add
                text content, documents, and notes that will be used to generate
                personalized quizzes. Edit and manage your content library with
                ease.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <Brain className="w-8 h-8 text-green-400 mt-1 shrink-0" />
            <div>
              <h3 className="text-xl font-semibold text-sky-300 mb-2">
                AI-Generated Quizzes
              </h3>
              <p className="text-slate-300">
                Generate intelligent quizzes from your course content or any
                topic using Google's Gemini AI. Choose between different AI
                models for varying quality and speed. Questions are streamed in
                real-time with detailed explanations and hints.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <MessageCircle className="w-8 h-8 text-blue-400 mt-1 shrink-0" />
            <div>
              <h3 className="text-xl font-semibold text-sky-300 mb-2">
                Interactive Learning
              </h3>
              <p className="text-slate-300">
                Discuss any question with AI tutoring support. Get explanations
                for your answers, understand concepts better, and explore topics
                in depth through natural conversation.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <BarChart3 className="w-8 h-8 text-yellow-400 mt-1 shrink-0" />
            <div>
              <h3 className="text-xl font-semibold text-sky-300 mb-2">
                Performance Analysis
              </h3>
              <p className="text-slate-300">
                Track your progress with detailed AI-powered performance
                analysis. Get personalized feedback, identify strengths and
                areas for improvement, and receive targeted study
                recommendations.
              </p>
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <h4 className="text-lg font-semibold text-purple-300 mb-2">
              Getting Started
            </h4>
            <ol className="text-slate-300 space-y-1 text-sm">
              <li>1. Create a course and add your learning materials</li>
              <li>2. Generate a quiz from your content or choose any topic</li>
              <li>3. Take the quiz and get instant feedback</li>
              <li>
                4. Review performance analysis and improve your understanding
              </li>
            </ol>
          </div>

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-300 mb-2">
              🔒 Privacy & Security
            </h4>
            <p className="text-xs text-blue-200">
              Your API key and all course data are stored locally in your
              browser. Nothing is sent to external servers except direct
              communication with Google's Gemini API.
            </p>
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <button
            onClick={onClose}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-pink-500 transition duration-150 ease-in-out transform hover:scale-105"
          >
            Start Learning!
          </button>
        </div>
      </div>
    </div>
  );
};
