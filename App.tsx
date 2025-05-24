import { Github, Info, Keyboard, Settings } from "lucide-react"; // Added Info and Github icons
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ApiKeySetup } from "./components/ApiKeySetup"; // Added
import { ConfirmModal } from "./components/ConfirmModal";
import { CourseDetail } from "./components/CourseDetail";
import { CourseList } from "./components/CourseList";
import { ErrorMessage } from "./components/ErrorMessage";
import { InfoModal } from "./components/InfoModal"; // Added
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
import {
  clearApiKey,
  generateCourseContent,
  getApiKey,
  setApiKey,
} from "./services/geminiService"; // Added generateCourseContent
import { GameState, GeminiModel } from "./types";

// Declare global window property for View Transitions API helper
declare global {
  interface Window {
    viewTransition: (callback: () => void) => void;
  }
}

const storedApiKey = localStorage.getItem("gemini_api_key");
const storedModel = localStorage.getItem("default_model") as GeminiModel;
const infoModalShown = localStorage.getItem("info_modal_shown");

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING);
  const [previousGameState, setPreviousGameState] = useState<GameState>(
    GameState.COURSE_LIST,
  );
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] =
    useState<string>("Loading app...");
  const [selectedModel, setSelectedModel] = useState<GeminiModel>(
    storedModel || GeminiModel.FLASH,
  );
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [hasApiKey, setHasApiKey] = useState<boolean>(!!storedApiKey); // Added
  const [showApiKeySettings, setShowApiKeySettings] = useState<boolean>(false); // Added
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false); // Added

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
    isExternalModalOpen:
      !!modalConfig?.isOpen || showApiKeySettings || showInfoModal,
  });

  // View Transitions for specific user actions
  const navigateToSetup = useCallback(() => {
    window.viewTransition(() => {
      quizHook.resetQuizState();
      setGameState(GameState.SETUP);
    });
  }, [quizHook]);

  const navigateToCourseDetail = useCallback(() => {
    window.viewTransition(() => {
      courseHook.setViewingQuizAttempt(null);
      setGameState(GameState.COURSE_DETAIL);
    });
  }, [courseHook]);

  const navigateToCoursesWithResets = useCallback(() => {
    window.viewTransition(() => {
      quizHook.resetQuizState();
      courseHook.navigateToCourseList();
    });
  }, [quizHook, courseHook]);

  // API Key management
  const handleApiKeyProvided = useCallback(
    (apiKey: string, model: GeminiModel) => {
      setApiKey(apiKey);
      setHasApiKey(true);
      setSelectedModel(model); // Set the selected model from API key setup
      setShowApiKeySettings(false);
      // Store in localStorage for persistence
      localStorage.setItem("gemini_api_key", apiKey);
      localStorage.setItem("default_model", model);
    },
    [],
  );

  const handleClearApiKey = useCallback(() => {
    clearApiKey();
    setHasApiKey(false);
    localStorage.removeItem("gemini_api_key");
    localStorage.removeItem("default_model");
    localStorage.removeItem("info_modal_shown");
    // Reset to course list when API key is cleared
    setGameState(GameState.COURSE_LIST);
  }, []);

  // Course generation with AI
  const handleGenerateCourse = useCallback(
    async (topic: string) => {
      setLoadingMessage(`Generating course content for "${topic}"...`);
      setError(null);
      try {
        const { courseTitle, documents } = await generateCourseContent(
          topic,
          GeminiModel.FLASH,
        );

        // Create the course
        const courseId = await db.addCourse(courseTitle);

        // Add each document as course content
        for (const doc of documents) {
          await db.addCourseTextContent(courseId, doc.title, doc.content);
        }

        // Load the new course and navigate to it
        const newCourse = await db.getCourseById(courseId);
        if (newCourse) {
          courseHook.setCurrentCourse(newCourse);
          await courseHook.loadCourseDetails(newCourse);
          setGameState(GameState.COURSE_DETAIL);

          // Refresh the course list
          const allCourses = await db.getAllCourses();
          courseHook.setInitialCourses(allCourses);
        }
      } catch (err) {
        console.error("Failed to generate course:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to generate course. Please try again.",
        );
      }
      setLoadingMessage("");
    },
    [courseHook, setLoadingMessage, setError],
  );

  // Check for stored API key and show info modal on first load
  useEffect(() => {
    if (storedApiKey) {
      setApiKey(storedApiKey);
      setHasApiKey(true);
      if (storedModel && Object.values(GeminiModel).includes(storedModel)) {
        setSelectedModel(storedModel);
      }

      // Show info modal on first entry
      if (!infoModalShown) {
        setShowInfoModal(true);
        localStorage.setItem("info_modal_shown", "true");
      }
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
        return "Loading Gemini Study";
      default:
        return "Gemini Study";
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 animate-fadeIn">
        <div className="w-full max-w-md bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 animate-scaleIn">
          <h2 className="text-2xl font-bold text-sky-300 mb-4">
            API Key & Model Settings
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <p className="text-sm text-slate-300 mb-2">Current API Key:</p>
              <p className="text-xs text-slate-400 font-mono break-all">
                {getApiKey()?.substring(0, 10)}...{getApiKey()?.substring(-4)}
              </p>
            </div>

            <div>
              <label
                htmlFor="settingsModel"
                className="block text-sm font-medium text-sky-300 mb-2"
              >
                Default AI Model
              </label>
              <select
                id="settingsModel"
                value={selectedModel}
                onChange={(e) =>
                  setSelectedModel(e.target.value as GeminiModel)
                }
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-slate-100"
              >
                <option value={GeminiModel.FLASH}>
                  Gemini 2.5 Flash (Faster, Good for most uses)
                </option>
                <option value={GeminiModel.PRO}>
                  Gemini 2.5 Pro (Slightly Slower, Potentially Higher Quality)
                </option>
                <option value={GeminiModel.FLASH_2_0}>
                  Gemini 2.0 Flash (Latest, with Google Search access)
                </option>
              </select>
              <p className="text-xs text-slate-400 mt-1">
                This will be used as the default for new quizzes
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowApiKeySettings(false)}
                className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-medium py-2 px-4 rounded-lg transition-smooth"
              >
                Close
              </button>
              <button
                onClick={handleClearApiKey}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-smooth"
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
          <div className="main-content">
            {shouldShowPersistentError && <ErrorMessage message={error} />}
            <CourseList
              courses={courseHook.courses}
              onCreateCourse={courseHook.handleCreateCourse}
              onSelectCourse={courseHook.handleSelectCourse}
              onSetupNewQuiz={navigateToSetup}
              onEditCourseName={courseHook.handleUpdateCourseName}
              onDeleteCourse={courseHook.handleDeleteCourseRequest}
              onGenerateCourse={handleGenerateCourse}
              isLoading={
                !!loadingMessage && gameState === GameState.COURSE_LIST
              }
            />
          </div>
        );
      case GameState.COURSE_DETAIL:
        if (courseHook.currentCourse) {
          return (
            <div className="main-content">
              {shouldShowPersistentError && <ErrorMessage message={error} />}
              <CourseDetail
                course={courseHook.currentCourse}
                contents={courseHook.currentCourseContents}
                attempts={courseHook.currentCourseQuizAttempts}
                onAddContent={courseHook.handleAddCourseContent}
                onUpdateContent={courseHook.handleUpdateCourseContent}
                onDeleteContent={courseHook.handleDeleteCourseContentRequest}
                onDeleteAttempt={courseHook.handleDeleteQuizAttemptRequest}
                onBackToList={navigateToCoursesWithResets}
                onStartQuizFromCourseContent={(numQ, model) => {
                  const combinedContextText =
                    courseHook.currentCourseContents.length > 0
                      ? courseHook.currentCourseContents
                          .map(
                            (cc) =>
                              `Content Title: ${cc.title}\n${cc.textContent}`,
                          )
                          .join("\n\n---\n\n")
                      : undefined;
                  quizHook.handleQuizGeneration(
                    courseHook.currentCourse!.name,
                    numQ,
                    model,
                    combinedContextText,
                    courseHook.currentCourse!.id,
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
            </div>
          );
        }
        navigateToCoursesWithResets();
        return <LoadingIndicator message="Redirecting to course list..." />;

      case GameState.QUIZ_HISTORY_DETAIL:
        if (courseHook.viewingQuizAttempt) {
          return (
            <div className="main-content">
              {shouldShowPersistentError && <ErrorMessage message={error} />}
              <QuizHistoryDetail
                attempt={courseHook.viewingQuizAttempt}
                onBack={navigateToCourseDetail}
                onRetakeQuiz={quizHook.handleRetakeQuiz}
              />
            </div>
          );
        }
        setGameState(GameState.COURSE_DETAIL);
        return <LoadingIndicator message="Loading attempt details..." />;

      case GameState.SETUP:
        return (
          <div className="main-content">
            {shouldShowPersistentError && <ErrorMessage message={error} />}
            <QuizSetupForm
              onGenerateQuiz={quizHook.handleQuizGeneration}
              initialNumQuestions={numQuestions}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              onNavigateToCourses={navigateToCoursesWithResets}
            />
          </div>
        );
      case GameState.GENERATING_QUIZ:
        return (
          <div className="main-content">
            <LoadingIndicator
              message={loadingMessage || "Generating quiz..."}
            />
          </div>
        );

      case GameState.PLAYING:
      case GameState.SHOW_ANSWER:
        // Primary loader: if the *current question data* isn't available.
        if (!currentQFromDisplay) {
          if (
            quizHook.isQuizGenerationComplete &&
            quizHook.displayedQuestions.length === 0
          ) {
            // Edge case: Generation finished, but 0 questions.
            const fallbackState = quizHook.currentQuizSourceCourseId
              ? GameState.COURSE_DETAIL
              : GameState.SETUP;
            return (
              <div className="main-content">
                <ErrorMessage
                  message={
                    error ||
                    "Quiz generation finished, but no questions are available. Try a different topic or model."
                  }
                />
                <button
                  onClick={() => setGameState(fallbackState)}
                  className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-smooth"
                >
                  Back
                </button>
              </div>
            );
          } else {
            return (
              <div className="main-content">
                <LoadingIndicator
                  message={
                    loadingMessage ||
                    `Loading question ${
                      quizHook.currentQuestionIndex + 1
                    } of ${numQuestions}...`
                  }
                />
              </div>
            );
          }
        }

        return (
          <div className="main-content">
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
              isWaitingForNextStreamedQuestion={quizPlayerIsWaitingForNext}
              onExitQuizRequest={quizHook.handleExitQuizRequest}
            />
          </div>
        );

      case GameState.SUMMARIZING_RESULTS:
        return (
          <div className="main-content">
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
          </div>
        );
      case GameState.RESULTS:
        return (
          <div className="main-content">
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
          </div>
        );
      case GameState.CHATTING_QUESTION:
        if (currentQFromDisplay) {
          const userAnswerForChat = quizHook.userAnswers.find(
            (ua) => ua.questionText === currentQFromDisplay.question,
          );
          return (
            <div className="main-content">
              <QuestionChat
                question={currentQFromDisplay}
                onBackToQuiz={() => quizHook.handleEndChat(previousGameState)}
                modelName={selectedModel}
                userSelectedAnswerText={userAnswerForChat?.selectedAnswerText}
                isUserAnswerCorrect={userAnswerForChat?.isCorrect}
                correctAnswerText={userAnswerForChat?.correctAnswerText}
              />
            </div>
          );
        }
        setError("Cannot start chat: current question is not available.");
        setGameState(previousGameState);
        return null;
      default:
        console.warn(
          "Reached unknown game state:",
          gameState,
          "Falling back to COURSE_LIST.",
        );
        setGameState(GameState.COURSE_LIST);
        return <LoadingIndicator message="Unknown state, redirecting..." />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 transition-smooth">
      {showShortcutGuide && (
        <div className="animate-fadeIn">
          <ShortcutGuide onClose={toggleShortcutGuide} />
        </div>
      )}
      {showInfoModal && (
        <InfoModal
          isOpen={showInfoModal}
          onClose={() => setShowInfoModal(false)}
        />
      )}
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
      <header className="mb-8 text-center w-full max-w-3xl relative main-header">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 mt-8 md:mt-4 break-words px-2 transition-smooth">
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

        {/* API Key Settings and Info Buttons */}
        <div className="absolute top-0 right-0 flex gap-2">
          <button
            onClick={() => setShowInfoModal(true)}
            className="p-2 text-slate-400 hover:text-slate-300 transition-smooth"
            title="App Information"
            aria-label="App Information"
          >
            <Info className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowApiKeySettings(true)}
            className="p-2 text-slate-400 hover:text-slate-300 transition-smooth"
            title="API Key Settings"
            aria-label="API Key Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>
      <main className="w-full max-w-2xl md:max-w-3xl bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 transition-smooth animate-scaleIn">
        {renderContent()}
      </main>
      <footer className="mt-12 text-center text-slate-500 text-sm flex items-center justify-center gap-3">
        <p>Made with ❤️ and 🤖. &copy; {new Date().getFullYear()}</p>
        <a
          href="https://github.com/mmtftr/gemini-study"
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-full hover:bg-slate-700 transition-smooth"
          title="View on GitHub"
          aria-label="View on GitHub"
        >
          <Github className="w-5 h-5 text-slate-400 hover:text-slate-300 transition-smooth" />
        </a>
        <button
          onClick={toggleShortcutGuide}
          className="p-1.5 rounded-full cursor-pointer hover:bg-slate-700 transition-smooth"
          title="View Keyboard Shortcuts"
          aria-label="View Keyboard Shortcuts"
        >
          <Keyboard className="w-5 h-5 text-slate-400 hover:text-slate-300 transition-smooth" />
        </button>
      </footer>
    </div>
  );
};

export default App;
