import { HelpCircle, MessageCircle, X } from "lucide-react";
import { marked } from "marked";
import React from "react";
import type { AnswerOption, Question } from "../types";

interface QuizPlayerProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswerSelect: (answer: AnswerOption) => void;
  onNextQuestion: () => void;
  selectedAnswer: AnswerOption | null;
  isAnswered: boolean;
  showHint: boolean;
  onToggleHint: () => void;
  onStartChat: () => void;
  isQuizGenerationComplete: boolean;
  isWaitingForNextStreamedQuestion: boolean;
  onExitQuizRequest: () => void;
}

export const QuizPlayer: React.FC<QuizPlayerProps> = ({
  question,
  questionNumber,
  totalQuestions,
  onAnswerSelect,
  onNextQuestion,
  selectedAnswer,
  isAnswered,
  showHint,
  onToggleHint,
  onStartChat,
  isWaitingForNextStreamedQuestion,
  onExitQuizRequest,
}) => {

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="w-full bg-slate-700 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-smooth"
          style={{
            width: `${(questionNumber / totalQuestions) * 100}%`,
          }}
        ></div>
      </div>

      {/* Question Header */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-400">
          Question {questionNumber} of {totalQuestions}
        </span>
        <button
          onClick={onExitQuizRequest}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-full transition-smooth"
          title="Exit Quiz"
          aria-label="Exit Quiz"
        >
          <X size={18} />
        </button>
      </div>

      {/* Question */}
      <div>
        <h2 className="text-xl md:text-2xl font-semibold text-sky-300 mb-4 leading-relaxed">
          {question.question}
        </h2>

        {/* Hint */}
        {question.hint && (
          <div className="mb-4">
            <button
              onClick={onToggleHint}
              className="flex items-center text-sm text-yellow-400 hover:text-yellow-300 transition-smooth"
              disabled={isAnswered}
            >
              <HelpCircle size={16} className="mr-1" />
              {showHint ? "Hide Hint" : "Show Hint"}
            </button>
            {showHint && (
              <div className="mt-2 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg animate-slideInDown">
                <p className="text-sm text-yellow-200">{question.hint}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Answer Options */}
      <div className="space-y-3">
        {question.answerOptions.map((option, index) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = option.isCorrect;
          const showAsCorrect = isAnswered && isCorrect;
          const showAsIncorrect = isAnswered && isSelected && !isCorrect;

          return (
            <div key={index}>
              <button
                onClick={() => onAnswerSelect(option)}
                disabled={isAnswered}
                className={`w-full text-left p-4 rounded-lg border transition-smooth hover-lift focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed ${
                  showAsCorrect
                    ? "bg-green-900/50 border-green-500 text-green-100"
                    : showAsIncorrect
                    ? "bg-red-900/50 border-red-500 text-red-100"
                    : isSelected
                    ? "bg-purple-700/50 border-purple-400 text-purple-100"
                    : "bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600/70 hover:border-slate-500"
                }`}
              >
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-slate-600 text-slate-300 rounded-full flex items-center justify-center text-sm font-medium mr-3 transition-smooth">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="flex-1">{option.text}</span>
                </div>
              </button>

              {/* Rationale (shown after answering) */}
              {isAnswered && isSelected && (
                <div className="mt-2 p-3 bg-slate-800/50 border border-slate-600 rounded-lg animate-slideInDown">
                  <div
                    className="prose prose-sm prose-invert text-slate-300"
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(option.rationale) as string,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      {isAnswered && (
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            onClick={onStartChat}
            className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-md transition-smooth"
          >
            <MessageCircle size={20} className="mr-2" />
            Discuss This Question
          </button>

          <button
            onClick={onNextQuestion}
            disabled={isWaitingForNextStreamedQuestion}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md transition-smooth disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isWaitingForNextStreamedQuestion
              ? "Loading next question..."
              : questionNumber < totalQuestions
              ? "Next Question"
              : "View Results"}
          </button>
        </div>
      )}

      {/* Loading indicator for streaming */}
      {isWaitingForNextStreamedQuestion && (
        <div className="flex items-center justify-center py-4">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
            <div
              className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>
          <span className="ml-3 text-slate-400 text-sm">
            Generating next question...
          </span>
        </div>
      )}
    </div>
  );
};
