
import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react'; // Changed
import type { QuizAttempt, UserAnswer } from '../types';
import { marked } from 'marked';

interface QuizHistoryDetailProps {
  attempt: QuizAttempt;
  onBack: () => void;
  onRetakeQuiz: (attempt: QuizAttempt) => Promise<void>;
}

export const QuizHistoryDetail: React.FC<QuizHistoryDetailProps> = ({ attempt, onBack, onRetakeQuiz }) => {
  const percentage = Math.round((attempt.score / attempt.totalQuestionsInAttempt) * 100);

  return (
    <div className="space-y-6 animate-fadeIn">
      <button onClick={onBack} className="text-sm text-purple-300 hover:text-purple-200 mb-2">&larr; Back to Course Details</button>
      
      <header className="pb-4 border-b border-slate-700">
        <h2 className="text-3xl font-semibold text-sky-300">Quiz Attempt Summary</h2>
        <p className="text-slate-400">Topic: {attempt.quizTopic}</p>
        <p className="text-slate-400">Attempted: {new Date(attempt.attemptedAt).toLocaleString()}</p>
        <p className="text-xl mt-2">
          Score: <strong className={`font-bold ${percentage >= 70 ? 'text-green-400' : percentage >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
            {attempt.score}/{attempt.totalQuestionsInAttempt} ({percentage}%)
          </strong>
        </p>
         <p className="text-xs text-slate-500">Quiz Model: {attempt.modelUsed}</p>
      </header>

      {attempt.aiSummary && (
        <section>
          <h3 className="text-xl font-semibold text-sky-400 mb-2">AI Performance Analysis</h3>
          <div 
            className="prose prose-sm prose-invert max-w-none p-4 bg-slate-700/70 rounded-lg border border-slate-600"
            dangerouslySetInnerHTML={{ __html: marked.parse(attempt.aiSummary) as string }} 
          />
        </section>
      )}

      <section>
        <h3 className="text-xl font-semibold text-sky-400 mb-3">Your Answers:</h3>
        <ul className="space-y-4">
          {attempt.userAnswers.map((ua, index) => (
            <li key={index} className="p-4 bg-slate-700 border border-slate-600 rounded-lg">
              <p className="font-medium text-slate-200 mb-1">Q{index + 1}: {ua.questionText}</p>
              <div className={`flex items-center mb-1 ${ua.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                {ua.isCorrect ? <CheckCircle2 size={20} className="mr-2 shrink-0" /> : <XCircle size={20} className="mr-2 shrink-0" />}
                <span>Your answer: "{ua.selectedAnswerText}"</span>
              </div>
              {!ua.isCorrect && (
                <p className="text-sky-300 mb-1">Correct answer: "{ua.correctAnswerText}"</p>
              )}
              {ua.rationale && <p className="text-xs text-slate-400 mt-1 italic">Rationale for your choice: "{ua.rationale}"</p>}
            </li>
          ))}
        </ul>
      </section>
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button
            onClick={() => onRetakeQuiz(attempt)}
            className="w-full sm:w-auto flex-1 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md transition"
        >
            Retake This Quiz
        </button>
        <button
            onClick={onBack}
            className="w-full sm:w-auto flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md transition"
        >
            Back to Course Details
        </button>
      </div>
    </div>
  );
};