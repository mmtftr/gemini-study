
import React from 'react';
import { marked } from 'marked';
import { Trophy } from 'lucide-react';

interface QuizResultsProps {
  score: number;
  totalQuestions: number;
  onRestart: () => void;
  onSaveAndExit?: () => void; 
  aiSummary?: string | null; 
  isSummaryLoading?: boolean;
  quizTopic: string;
  onRetakeCurrentQuiz?: () => void;
  isRetakeEnabled?: boolean;
}

export const QuizResults: React.FC<QuizResultsProps> = ({ 
  score, 
  totalQuestions, 
  onRestart,
  onSaveAndExit,
  aiSummary,
  isSummaryLoading,
  quizTopic,
  onRetakeCurrentQuiz,
  isRetakeEnabled
}) => {
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  let message = '';
  let iconColor = 'text-yellow-400';

  if (percentage >= 80) {
    message = "Excellent work! You're a quiz master!";
    iconColor = 'text-green-400';
  } else if (percentage >= 60) {
    message = "Good job! You know your stuff.";
    iconColor = 'text-sky-400';
  } else if (percentage >= 40) {
    message = "Not bad! Keep practicing.";
    iconColor = 'text-orange-400';
  } else {
    message = "Keep learning and try again!";
    iconColor = 'text-red-400';
  }

  return (
    <div className="text-center space-y-8 animate-fadeInUp">
      <Trophy size={48} className={`mx-auto ${iconColor}`} />
      <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">Quiz Completed!</h2>
       <p className="text-lg text-slate-400 -mt-2">Topic: {quizTopic}</p>
      <p className="text-2xl text-slate-200">
        You scored <strong className="text-3xl text-yellow-400">{score}</strong> out of <strong className="text-3xl text-yellow-400">{totalQuestions}</strong>
      </p>
      <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
        {percentage}%
      </p>
      <p className="text-xl text-slate-300">{message}</p>

      {isSummaryLoading && (
        <div className="my-6 p-4 bg-slate-700/50 rounded-lg">
          <p className="text-sky-300 animate-pulse">Generating AI performance summary...</p>
        </div>
      )}

      {aiSummary && !isSummaryLoading && (
        <div className="my-6 p-4 bg-slate-700/80 rounded-lg border border-slate-600 text-left prose prose-sm prose-invert max-w-full">
          <h3 className="text-xl font-semibold text-sky-300 mb-3 text-center">AI Performance Summary</h3>
          <div dangerouslySetInnerHTML={{ __html: marked.parse(aiSummary) as string }} />
        </div>
      )}
      
      <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-4 sm:justify-center">
        {onSaveAndExit && (
          <button
            onClick={onSaveAndExit}
            className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-teal-500 transition duration-150 ease-in-out transform hover:scale-105"
            disabled={isSummaryLoading}
          >
            {isSummaryLoading ? "Saving..." : "Save & View Courses"}
          </button>
        )}
        {isRetakeEnabled && onRetakeCurrentQuiz && (
            <button
                onClick={onRetakeCurrentQuiz}
                className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500 transition duration-150 ease-in-out transform hover:scale-105"
                disabled={isSummaryLoading}
            >
                Retake This Quiz
            </button>
        )}
        <button
          onClick={onRestart}
          className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-pink-500 transition duration-150 ease-in-out transform hover:scale-105"
        >
          Play Another Quiz
        </button>
      </div>
    </div>
  );
};