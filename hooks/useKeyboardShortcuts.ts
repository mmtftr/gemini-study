

import { useState, useEffect, useCallback } from 'react';
import { GameState, Question, AnswerOption } from '../types';

interface KeyboardShortcutProps {
  gameState: GameState;
  currentQuestion: Question | undefined;
  displayedQuestions: Question[];
  currentQuestionIndex: number;
  handleAnswerSelect: (answer: AnswerOption) => void;
  toggleHint: () => void;
  handleStartChat: () => void;
  handleNextQuestion: () => void;
  // Fix: Renamed props for clarity and to resolve App.tsx issues
  closeExternalModal: () => void;
  isExternalModalOpen: boolean;
  isEditing: () => boolean; // Function to check if an input field is focused
}

export const useKeyboardShortcuts = ({
  gameState,
  currentQuestion,
  handleAnswerSelect,
  toggleHint,
  handleStartChat,
  handleNextQuestion,
  // Fix: Use renamed props
  closeExternalModal,
  isExternalModalOpen,
  isEditing,
}: KeyboardShortcutProps) => {
  const [showShortcutGuide, setShowShortcutGuide] = useState<boolean>(false);

  const toggleShortcutGuide = useCallback(() => {
    setShowShortcutGuide(prev => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Fix: Adjusted Escape key logic
      if (event.key === 'Escape') {
        if (showShortcutGuide) { // If shortcut guide is open, Esc closes it.
          toggleShortcutGuide();
          return;
        }
        if (isExternalModalOpen) { // If another modal (e.g., ConfirmModal) is open
          closeExternalModal(); // Call prop to close that modal.
          return;
        }
      }

      if (isEditing() || gameState === GameState.CHATTING_QUESTION) {
        return;
      }

      if (gameState === GameState.PLAYING && currentQuestion) {
        if (event.key >= '1' && event.key <= '4') {
          event.preventDefault();
          const answerIndex = parseInt(event.key, 10) - 1;
          if (currentQuestion.answerOptions[answerIndex]) {
            handleAnswerSelect(currentQuestion.answerOptions[answerIndex]);
          }
        } else if (event.key.toLowerCase() === 'h') {
          event.preventDefault();
          toggleHint();
        } else if (event.key.toLowerCase() === 'd') {
          event.preventDefault();
          handleStartChat();
        }
      } else if (gameState === GameState.SHOW_ANSWER) {
        if (event.key === 'ArrowRight' || (event.key >= '1' && event.key <= '4')) {
          event.preventDefault();
          handleNextQuestion();
        } else if (event.key.toLowerCase() === 'd') {
          event.preventDefault();
          handleStartChat();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    gameState,
    currentQuestion,
    handleAnswerSelect,
    toggleHint,
    handleStartChat,
    handleNextQuestion,
    showShortcutGuide,
    // Fix: Use renamed props in dependency array
    closeExternalModal,
    isExternalModalOpen,
    isEditing,
    toggleShortcutGuide, // Added toggleShortcutGuide as it's used in Escape logic
    // currentQuestionIndex, displayedQuestions, // Not directly used in handlers but good for context
  ]);

  return {
    showShortcutGuide,
    toggleShortcutGuide,
  };
};
