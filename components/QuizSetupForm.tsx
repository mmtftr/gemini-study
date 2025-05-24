import React, { useState } from "react";
import { GeminiModel } from "../types";

interface QuizSetupFormProps {
  onGenerateQuiz: (
    topic: string,
    numQuestions: number,
    model: GeminiModel,
  ) => void;
  initialNumQuestions: number;
  selectedModel: GeminiModel;
  onNavigateToCourses: () => void;
}

export const QuizSetupForm: React.FC<QuizSetupFormProps> = ({
  onGenerateQuiz,
  initialNumQuestions,
  selectedModel,
  onNavigateToCourses,
}) => {
  const [topic, setTopic] = useState<string>("");
  const [numQuestions, setNumQuestions] = useState<number>(initialNumQuestions);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim() && numQuestions > 0) {
      onGenerateQuiz(topic.trim(), numQuestions, selectedModel);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-sky-300 mb-2">
          Setup New Quiz
        </h2>
        <p className="text-slate-400">
          Generate a quiz on any topic you'd like to learn about
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="topic"
            className="block text-sm font-medium text-sky-300 mb-2"
          >
            Quiz Topic
          </label>
          <input
            type="text"
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., The Solar System, React Hooks, Machine Learning"
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none placeholder-slate-400 text-slate-100 transition-smooth"
            required
            aria-label="Quiz Topic"
          />
        </div>

        <div>
          <label
            htmlFor="numQuestions"
            className="block text-sm font-medium text-sky-300 mb-2"
          >
            Number of Questions
          </label>
          <input
            type="number"
            id="numQuestions"
            value={numQuestions}
            onChange={(e) =>
              setNumQuestions(
                Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)),
              )
            }
            min="1"
            max="20"
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-slate-100 transition-smooth"
            required
            aria-label="Number of Questions"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-pink-500 transition-smooth transform hover:scale-[1.02]"
          disabled={!topic.trim()}
        >
          Generate Quiz
        </button>

        <button
          type="button"
          onClick={onNavigateToCourses}
          className="w-full bg-slate-600 hover:bg-slate-500 text-sky-200 font-medium py-2.5 px-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500 transition-smooth"
        >
          Manage Courses & Content
        </button>
      </form>
    </div>
  );
};
