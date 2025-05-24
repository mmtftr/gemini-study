
import React from 'react';
import { CheckCircle, XCircle, Lightbulb, MessageCircle, Loader2, LogOut } from 'lucide-react';
import type { Question, AnswerOption } from '../types';

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
  isQuizGenerationComplete,
  isWaitingForNextStreamedQuestion,
  onExitQuizRequest,
}) => {

  const getNextButtonText = () => {
    // isWaitingForNextStreamedQuestion is true if the question AFTER the current one is streaming.
    if (isAnswered && isWaitingForNextStreamedQuestion) return "Loading next...";
    // If we are at the last question of the effective total, and generation is complete.
    if (questionNumber >= totalQuestions && isQuizGenerationComplete) return 'Show Results';
    return 'Next Question';
  };
  
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center gap-2">
        <h2 className="text-xl font-semibold text-sky-300">Question {questionNumber}/{totalQuestions}</h2>
        <div className="flex gap-2 flex-wrap">
          <button
              onClick={onToggleHint}
              className="flex items-center px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-slate-900 text-sm font-medium rounded-md shadow-sm transition-colors duration-150 disabled:opacity-50"
              title={showHint ? "Hide hint" : "Show hint"}
              disabled={isAnswered} 
              aria-pressed={showHint}
          >
              <Lightbulb size={16} className="mr-1.5" />
              {showHint ? 'Hide' : 'Hint'}
          </button>
          <button
              onClick={onStartChat}
              className="flex items-center px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm transition-colors duration-150"
              title="Discuss this question with AI"
              aria-label="Discuss this question"
          >
              <MessageCircle size={16} className="mr-1.5" />
              Discuss
          </button>
          <button
              onClick={onExitQuizRequest}
              className="flex items-center px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md shadow-sm transition-colors duration-150"
              title="Exit Quiz"
              aria-label="Exit Quiz"
          >
              <LogOut size={16} className="mr-1.5" />
              Exit
          </button>
        </div>
      </div>

      {showHint && !isAnswered && (
        <div className="p-3 bg-slate-700 rounded-lg my-3 text-slate-300 border border-yellow-500/50" role="tooltip">
          <strong className="text-yellow-400">Hint:</strong> {question.hint}
        </div>
      )}

      <p className="text-2xl font-medium text-slate-100 leading-relaxed" id="question-text">{question.question}</p>
      
      <div className="space-y-3" role="radiogroup" aria-labelledby="question-text">
        {question.answerOptions.map((option, index) => {
          const isSelected = selectedAnswer?.text === option.text;
          let buttonClass = "w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ease-in-out transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 flex items-center justify-between ";
          
          if (isAnswered) {
            if (option.isCorrect) {
              buttonClass += "bg-green-500/20 border-green-500 text-green-300 ring-green-500";
            } else if (isSelected && !option.isCorrect) {
              buttonClass += "bg-red-500/20 border-red-500 text-red-300 ring-red-500";
            } else {
              buttonClass += "bg-slate-700 border-slate-600 text-slate-300 opacity-60 cursor-not-allowed";
            }
          } else {
            buttonClass += "bg-slate-700 hover:bg-slate-600 border-slate-600 hover:border-purple-500 text-slate-100 focus:ring-purple-500";
            if (isSelected && !isAnswered) { 
                buttonClass += " ring-2 ring-purple-500 border-purple-500"; 
            }
          }

          return (
            <button
              key={index}
              onClick={() => !isAnswered && onAnswerSelect(option)}
              className={buttonClass}
              disabled={isAnswered}
              role="radio"
              aria-checked={isSelected}
            >
              <span className="flex-grow mr-2">{option.text}</span>
              {isAnswered && option.isCorrect && <CheckCircle size={20} className="text-green-400 ml-2 shrink-0" />}
              {isAnswered && isSelected && !option.isCorrect && <XCircle size={20} className="text-red-400 ml-2 shrink-0" />}
            </button>
          );
        })}
      </div>

      {isAnswered && selectedAnswer && (
        <div className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600 animate-fadeInUp space-y-3" role="status">
          <div>
            <h3 className="text-lg font-semibold text-sky-400 mb-1">Your Answer: {selectedAnswer.text}</h3>
            <p className={`text-sm ${selectedAnswer.isCorrect ? 'text-green-300' : 'text-red-300'}`}>
                {selectedAnswer.isCorrect ? 'This is correct!' : 'This is incorrect.'}
            </p>
            <p className="text-slate-300 mt-1"><strong className="font-medium text-slate-200">Rationale:</strong> {selectedAnswer.rationale}</p>
          </div>
          {!selectedAnswer.isCorrect && question.answerOptions.find(opt => opt.isCorrect) && (
            <div className="pt-3 border-t border-slate-600">
              <h3 className="text-lg font-semibold text-green-400 mb-1">Correct Answer: {question.answerOptions.find(opt => opt.isCorrect)?.text}</h3>
              <p className="text-slate-300 mt-1"><strong className="font-medium text-slate-200">Rationale:</strong> {question.answerOptions.find(opt => opt.isCorrect)?.rationale}</p>
            </div>
          )}
        </div>
      )}

      {isAnswered && (
        <button
          onClick={onNextQuestion}
          disabled={isWaitingForNextStreamedQuestion}
          className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-pink-500 transition duration-150 ease-in-out transform hover:scale-105 disabled:opacity-70 disabled:cursor-wait flex items-center justify-center"
        >
          {isWaitingForNextStreamedQuestion && <Loader2 size={20} className="mr-2 animate-spin"/>}
          {getNextButtonText()}
        </button>
      )}
    </div>
  );
};