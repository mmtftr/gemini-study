import { Keyboard, Settings } from "lucide-react"; // Added Settings icon
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ApiKeySetup } from "./components/ApiKeySetup"; // Added
import { ConfirmModal } from "./components/ConfirmModal";
import { CourseDetail } from "./components/CourseDetail";
import { CourseList } from "./components/CourseList";
import { ErrorMessage } from "./components/ErrorMessage";
import { LoadingIndicator } from "./components/LoadingIndicator";
import { QuestionChat } from "./components/QuestionChat";
import { QuizHistoryDetail } from "./components/QuizHistoryDetail";
import { QuizPlayer } from "./components/QuizPlayer";
import { QuizResults } from "./components/QuizResults";
import { QuizSetupForm } from "./components/QuizSetupForm";
import { ShortcutGuide } from "./components/ShortcutGuide";

import { useCourseManagement } from "./hooks/useCourseManagement";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useModalManagement } from "./hooks/useModalManagement";
import { useQuizManagement } from "./hooks/useQuizManagement";

import * as db from "./db";
import { clearApiKey, getApiKey, setApiKey } from "./services/geminiService"; // Added
import { GameState, GeminiModel } from "./types";

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING);
  const [previousGameState, setPreviousGameState] = useState<GameState>(
    GameState.COURSE_LIST
  );
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] =
    useState<string>("Loading app...");
  const [selectedModel, setSelectedModel] = useState<GeminiModel>(
    GeminiModel.FLASH
  );
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false); // Added
  const [showApiKeySettings, setShowApiKeySettings] = useState<boolean>(false); // Added

  // Initialize Hooks - ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { modalConfig, openModal, closeModal, confirmModalAction } =
    useModalManagement();

  const courseHook = useCourseManagement({
    setLoadingMessage,
    setError,
    setGameState,
    openModal,
    currentGameState: gameState,
  });

  const quizHook = useQuizManagement({
    setLoadingMessage,
    setError,
    setGameState,
    setPreviousGameState,
    openModal,
    currentCourse: courseHook.currentCourse,
    navigateToCourseList: courseHook.navigateToCourseList,
    loadCourseDetails: courseHook.loadCourseDetails,
    setSelectedCourse: courseHook.setCurrentCourse,
    currentNumQuestions: numQuestions,
    setNumQuestionsState: setNumQuestions,
    currentSelectedModel: selectedModel,
    setSelectedModelGlobal: setSelectedModel,
    currentGameState: gameState,
  });

  const { showShortcutGuide, toggleShortcutGuide } = useKeyboardShortcuts({
    gameState,
    currentQuestion: quizHook.displayedQuestions[quizHook.currentQuestionIndex],
    displayedQuestions: quizHook.displayedQuestions,
    currentQuestionIndex: quizHook.currentQuestionIndex,
    handleAnswerSelect: quizHook.handleAnswerSelect,
    toggleHint: quizHook.toggleHint,
    handleStartChat: quizHook.handleStartChat,
    handleNextQuestion: quizHook.handleNextQuestion,
    closeExternalModal: closeModal,
    isEditing: () => {
      const activeElement = document.activeElement;
      return (
        !!activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          (activeElement as HTMLElement).isContentEditable)
      );
    },
    isExternalModalOpen: !!modalConfig?.isOpen || showApiKeySettings,
  });

  // API Key management
  const handleApiKeyProvided = useCallback((apiKey: string) => {
    setApiKey(apiKey);
    setHasApiKey(true);
    setShowApiKeySettings(false);
    // Store in localStorage for persistence
    localStorage.setItem("gemini_api_key", apiKey);
  }, []);

  const handleClearApiKey = useCallback(() => {
    clearApiKey();
    setHasApiKey(false);
    localStorage.removeItem("gemini_api_key");
    // Reset to course list when API key is cleared
    setGameState(GameState.COURSE_LIST);
  }, []);

  // Check for stored API key on app load
  useEffect(() => {
    const storedApiKey = localStorage.getItem("gemini_api_key");
    if (storedApiKey) {
      setApiKey(storedApiKey);
      setHasApiKey(true);
    }
  }, []);

  // Initial data loading
  useEffect(() => {
    if (!hasApiKey) {
      setLoadingMessage("");
      return;
    }

    const loadInitialData = async () => {
      setLoadingMessage("Loading courses...");
      try {
        const fetchedCourses = await db.getAllCourses();
        courseHook.setInitialCourses(fetchedCourses);
        setGameState(GameState.COURSE_LIST);
        setError(null);
      } catch (err) {
        console.error("Failed to load initial data:", err);
        setError("Could not load app data. Please try refreshing.");
        setGameState(GameState.SETUP);
      }
      setLoadingMessage("");
    };
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasApiKey]);

  const navigateToCourseListWithResets = useCallback(() => {
    quizHook.resetQuizState();
    courseHook.navigateToCourseList();
  }, [quizHook, courseHook]);

  // Flag for QuizPlayer: True if the current question is the last loaded, and more are expected from the stream.
  const quizPlayerIsWaitingForNext = useMemo(() => {
    const isEffectivelyLastLoadedQuestion =
      quizHook.currentQuestionIndex === quizHook.displayedQuestions.length - 1;
    const moreQuestionsExpectedFromServer =
      !quizHook.isQuizGenerationComplete &&
      quizHook.displayedQuestions.length < numQuestions;
    return isEffectivelyLastLoadedQuestion && moreQuestionsExpectedFromServer;
  }, [
    quizHook.currentQuestionIndex,
    quizHook.displayedQuestions.length,
    quizHook.isQuizGenerationComplete,
    numQuestions,
  ]);

  const pageTitle = useMemo(() => {
    switch (gameState) {
      case GameState.COURSE_LIST:
        return "My Courses";
      case GameState.COURSE_DETAIL:
        return courseHook.currentCourse?.name || "Course Details";
      case GameState.QUIZ_HISTORY_DETAIL:
        return courseHook.viewingQuizAttempt?.quizTopic
          ? `Attempt: ${courseHook.viewingQuizAttempt.quizTopic}`
          : "Quiz Attempt Details";
      case GameState.SETUP:
        return "New Quiz Setup";
      case GameState.GENERATING_QUIZ:
        return `Generating: ${quizHook.quizTopic || "Quiz"}...`;
      case GameState.PLAYING:
      case GameState.SHOW_ANSWER:
        // Title reflects loading only if current question data isn't displayed yet
        if (
          !quizHook.displayedQuestions[quizHook.currentQuestionIndex] &&
          !quizHook.isQuizGenerationComplete &&
          gameState === GameState.PLAYING
        ) {
          return (
            loadingMessage ||
            `Waiting for question ${quizHook.currentQuestionIndex + 1}...`
          );
        }
        return `Quiz: ${quizHook.quizTopic || "Loading..."}`;
      case GameState.RESULTS:
      case GameState.SUMMARIZING_RESULTS:
        return `Results: ${quizHook.quizTopic}`;
      case GameState.CHATTING_QUESTION:
        return `Discuss: ${quizHook.quizTopic}`;
      case GameState.LOADING:
        return "Loading Quiz Master";
      default:
        return "Gemini Quiz Master";
    }
  }, [
    gameState,
    courseHook.currentCourse,
    quizHook.quizTopic,
    courseHook.viewingQuizAttempt,
    loadingMessage,
    quizHook.displayedQuestions,
    quizHook.currentQuestionIndex,
    quizHook.isQuizGenerationComplete,
  ]);

  // Show API key setup if no API key is provided
  if (!hasApiKey) {
    return <ApiKeySetup onApiKeyProvided={handleApiKeyProvided} />;
  }

  // Show API key settings modal
  if (showApiKeySettings) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="w-full max-w-md bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8">
          <h2 className="text-2xl font-bold text-sky-300 mb-4">
            API Key Settings
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <p className="text-sm text-slate-300 mb-2">Current API Key:</p>
              <p className="text-xs text-slate-400 font-mono break-all">
                {getApiKey()?.substring(0, 10)}...{getApiKey()?.substring(-4)}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowApiKeySettings(false)}
                className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearApiKey}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Clear & Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    const currentQFromDisplay =
      quizHook.displayedQuestions[quizHook.currentQuestionIndex];
    const isLoadingAppLevel =
      (gameState === GameState.LOADING ||
        (loadingMessage &&
          gameState !== GameState.PLAYING &&
          gameState !== GameState.SHOW_ANSWER)) &&
      gameState !== GameState.GENERATING_QUIZ &&
      gameState !== GameState.SUMMARIZING_RESULTS;

    if (isLoadingAppLevel) {
      return <LoadingIndicator message={loadingMessage || "Loading..."} />;
    }

    const shouldShowPersistentError =
      error &&
      (gameState === GameState.SETUP ||
        gameState === GameState.COURSE_LIST ||
        gameState === GameState.COURSE_DETAIL ||
        (gameState === GameState.RESULTS &&
          error &&
          !quizHook.isSummaryLoading) ||
        (gameState === GameState.QUIZ_HISTORY_DETAIL && error));

    switch (gameState) {
      case GameState.COURSE_LIST:
        return (
          <>
            {shouldShowPersistentError && <ErrorMessage message={error} />}
            <CourseList
              courses={courseHook.courses}
              onCreateCourse={courseHook.handleCreateCourse}
              onSelectCourse={courseHook.handleSelectCourse}
              onSetupNewQuiz={() => {
                quizHook.resetQuizState();
                setGameState(GameState.SETUP);
              }}
              onEditCourseName={courseHook.handleUpdateCourseName}
              onDeleteCourse={courseHook.handleDeleteCourseRequest}
              isLoading={
                !!loadingMessage && gameState === GameState.COURSE_LIST
              }
            />
          </>
        );
      case GameState.COURSE_DETAIL:
        if (courseHook.currentCourse) {
          return (
            <>
              {shouldShowPersistentError && <ErrorMessage message={error} />}
              <CourseDetail
                course={courseHook.currentCourse}
                contents={courseHook.currentCourseContents}
                attempts={courseHook.currentCourseQuizAttempts}
                onAddContent={courseHook.handleAddCourseContent}
                onUpdateContent={courseHook.handleUpdateCourseContent}
                onDeleteContent={courseHook.handleDeleteCourseContentRequest}
                onDeleteAttempt={courseHook.handleDeleteQuizAttemptRequest}
                onBackToList={navigateToCourseListWithResets}
                onStartQuizFromCourseContent={(numQ, model) => {
                  const combinedContextText =
                    courseHook.currentCourseContents.length > 0
                      ? courseHook.currentCourseContents
                          .map(
                            (cc) =>
                              `Content Title: ${cc.title}\n${cc.textContent}`
                          )
                          .join("\n\n---\n\n")
                      : undefined;
                  quizHook.handleQuizGeneration(
                    courseHook.currentCourse!.name,
                    numQ,
                    model,
                    combinedContextText,
                    courseHook.currentCourse!.id
                  );
                }}
                onViewAttempt={courseHook.handleViewQuizAttempt}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                initialNumQuestions={numQuestions}
                onEditCourseName={courseHook.handleUpdateCourseName}
                onDeleteCourse={courseHook.handleDeleteCourseRequest}
                isLoading={
                  !!loadingMessage && gameState === GameState.COURSE_DETAIL
                }
              />
            </>
          );
        }
        navigateToCourseListWithResets();
        return <LoadingIndicator message="Redirecting to course list..." />;

      case GameState.QUIZ_HISTORY_DETAIL:
        if (courseHook.viewingQuizAttempt) {
          return (
            <>
              {shouldShowPersistentError && <ErrorMessage message={error} />}
              <QuizHistoryDetail
                attempt={courseHook.viewingQuizAttempt}
                onBack={() => {
                  courseHook.setViewingQuizAttempt(null);
                  setGameState(GameState.COURSE_DETAIL);
                }}
                onRetakeQuiz={quizHook.handleRetakeQuiz}
              />
            </>
          );
        }
        setGameState(GameState.COURSE_DETAIL);
        return <LoadingIndicator message="Loading attempt details..." />;

      case GameState.SETUP:
        return (
          <>
            {shouldShowPersistentError && <ErrorMessage message={error} />}
            <QuizSetupForm
              onGenerateQuiz={quizHook.handleQuizGeneration}
              initialNumQuestions={numQuestions}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              onNavigateToCourses={navigateToCourseListWithResets}
            />
          </>
        );
      case GameState.GENERATING_QUIZ:
        return (
          <LoadingIndicator message={loadingMessage || "Generating quiz..."} />
        );

      case GameState.PLAYING:
      case GameState.SHOW_ANSWER:
        // Primary loader: if the *current question data* isn't available.
        if (!currentQFromDisplay) {
          // Fix for line 209: Removed redundant `gameState !== GameState.GENERATING_QUIZ`
          // as gameState is already PLAYING or SHOW_ANSWER here.
          if (
            quizHook.isQuizGenerationComplete &&
            quizHook.displayedQuestions.length === 0
          ) {
            // Edge case: Generation finished, but 0 questions.
            const fallbackState = quizHook.currentQuizSourceCourseId
              ? GameState.COURSE_DETAIL
              : GameState.SETUP;
            return (
              <>
                <ErrorMessage
                  message={
                    error ||
                    "Quiz generation finished, but no questions are available. Try a different topic or model."
                  }
                />
                <button
                  onClick={() => setGameState(fallbackState)}
                  className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg"
                >
                  Back
                </button>
              </>
            );
            // Fix for line 219: Changed `else if (gameState !== GameState.GENERATING_QUIZ)` to `else`
            // as `gameState !== GameState.GENERATING_QUIZ` is always true here.
          } else {
            return (
              <LoadingIndicator
                message={
                  loadingMessage ||
                  `Loading question ${
                    quizHook.currentQuestionIndex + 1
                  } of ${numQuestions}...`
                }
              />
            );
          }
        }

        // At this point, currentQFromDisplay MUST be available.
        // The `if (currentQFromDisplay)` check is implicitly true.
        // The original code block from lines 248-253 related to a fallback loader if currentQFromDisplay was null
        // is unreachable due to the exhaustive checks above and has been removed (this addresses error for original line 250).
        return (
          <>
            {error &&
              (gameState === GameState.PLAYING ||
                gameState === GameState.SHOW_ANSWER) &&
              !error.startsWith("Note:") && <ErrorMessage message={error} />}
            {error && error.startsWith("Note:") && (
              <p className="text-sm text-yellow-400 bg-slate-700 p-2 rounded-md mb-3">
                {error}
              </p>
            )}
            <QuizPlayer
              question={currentQFromDisplay}
              questionNumber={quizHook.currentQuestionIndex + 1}
              totalQuestions={numQuestions}
              onAnswerSelect={quizHook.handleAnswerSelect}
              onNextQuestion={quizHook.handleNextQuestion}
              selectedAnswer={quizHook.selectedAnswer}
              isAnswered={gameState === GameState.SHOW_ANSWER}
              showHint={quizHook.showHint}
              onToggleHint={quizHook.toggleHint}
              onStartChat={quizHook.handleStartChat}
              isQuizGenerationComplete={quizHook.isQuizGenerationComplete}
              isWaitingForNextStreamedQuestion={quizPlayerIsWaitingForNext} // Use the new flag
              onExitQuizRequest={quizHook.handleExitQuizRequest}
            />
          </>
        );

      case GameState.SUMMARIZING_RESULTS:
        return (
          <QuizResults
            score={quizHook.score}
            totalQuestions={quizHook.displayedQuestions.length}
            onRestart={quizHook.handleRestartQuizSetup}
            onSaveAndExit={() => quizHook.handleSaveAndExit(false)}
            aiSummary={null}
            isSummaryLoading={true}
            quizTopic={quizHook.quizTopic}
            onRetakeCurrentQuiz={
              quizHook.generatedQuizData
                ? quizHook.handleStartRetakeCurrentGeneratedQuiz
                : undefined
            }
            isRetakeEnabled={
              !!quizHook.generatedQuizData &&
              !!quizHook.generatedQuizData.questions &&
              quizHook.generatedQuizData.questions.length > 0
            }
          />
        );
      case GameState.RESULTS:
        return (
          <>
            {shouldShowPersistentError && <ErrorMessage message={error} />}
            <QuizResults
              score={quizHook.score}
              totalQuestions={quizHook.displayedQuestions.length}
              onRestart={quizHook.handleRestartQuizSetup}
              onSaveAndExit={() => quizHook.handleSaveAndExit(false)}
              aiSummary={quizHook.aiPerformanceSummary}
              isSummaryLoading={quizHook.isSummaryLoading}
              quizTopic={quizHook.quizTopic}
              onRetakeCurrentQuiz={
                quizHook.generatedQuizData
                  ? quizHook.handleStartRetakeCurrentGeneratedQuiz
                  : undefined
              }
              isRetakeEnabled={
                !!quizHook.generatedQuizData &&
                !!quizHook.generatedQuizData.questions &&
                quizHook.generatedQuizData.questions.length > 0
              }
            />
          </>
        );
      case GameState.CHATTING_QUESTION:
        if (currentQFromDisplay) {
          const userAnswerForChat = quizHook.userAnswers.find(
            (ua) => ua.questionText === currentQFromDisplay.question
          );
          return (
            <QuestionChat
              question={currentQFromDisplay}
              onBackToQuiz={() => quizHook.handleEndChat(previousGameState)}
              modelName={selectedModel}
              userSelectedAnswerText={userAnswerForChat?.selectedAnswerText}
              isUserAnswerCorrect={userAnswerForChat?.isCorrect}
              correctAnswerText={userAnswerForChat?.correctAnswerText}
            />
          );
        }
        setError("Cannot start chat: current question is not available.");
        setGameState(previousGameState);
        return null;
      default:
        console.warn(
          "Reached unknown game state:",
          gameState,
          "Falling back to COURSE_LIST."
        );
        setGameState(GameState.COURSE_LIST);
        return <LoadingIndicator message="Unknown state, redirecting..." />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {showShortcutGuide && <ShortcutGuide onClose={toggleShortcutGuide} />}
      {modalConfig?.isOpen && (
        <ConfirmModal
          isOpen={modalConfig.isOpen}
          onClose={closeModal}
          onConfirm={confirmModalAction}
          title={modalConfig.title}
          message={modalConfig.message}
          confirmButtonText={modalConfig.confirmButtonText}
          cancelButtonText={modalConfig.cancelButtonText}
        />
      )}
      <header className="mb-8 text-center w-full max-w-3xl relative">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 mt-8 md:mt-4 break-words px-2">
          {pageTitle}
        </h1>
        {(gameState === GameState.PLAYING ||
          gameState === GameState.SHOW_ANSWER ||
          gameState === GameState.CHATTING_QUESTION) &&
          courseHook.currentCourse &&
          quizHook.currentQuizSourceCourseId ===
            courseHook.currentCourse.id && (
            <p className="text-slate-400 mt-1 text-sm">
              From course: {courseHook.currentCourse.name}
            </p>
          )}
        {gameState === GameState.COURSE_LIST && (
          <p className="text-slate-300 mt-2 text-lg">
            Manage your learning content and generate quizzes.
          </p>
        )}

        {/* API Key Settings Button */}
        <button
          onClick={() => setShowApiKeySettings(true)}
          className="absolute top-0 right-0 p-2 text-slate-400 hover:text-slate-300 transition-colors"
          title="API Key Settings"
          aria-label="API Key Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>
      <main className="w-full max-w-2xl md:max-w-3xl bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 transition-all duration-300 ease-in-out">
        {renderContent()}
      </main>
      <footer className="mt-12 text-center text-slate-500 text-sm flex items-center justify-center gap-3">
        <p>Powered by Google Gemini API. &copy; {new Date().getFullYear()}</p>
        <button
          onClick={toggleShortcutGuide}
          className="p-1.5 rounded-full hover:bg-slate-700 transition-colors"
          title="View Keyboard Shortcuts"
          aria-label="View Keyboard Shortcuts"
        >
          <Keyboard className="w-5 h-5 text-slate-400 hover:text-slate-300" />
        </button>
      </footer>
    </div>
  );
};

export default App;
