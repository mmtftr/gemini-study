import { useCallback, useState } from "react";
import * as db from "../db";
import {
  generateQuizQuestions,
  summarizeQuizPerformance,
} from "../services/geminiService";
import type {
  AnswerOption,
  Course,
  Question,
  QuizAttempt,
  QuizData,
  UserAnswer,
} from "../types";
import { GameState, GeminiModel } from "../types";
import type { useModalManagement } from "./useModalManagement";

interface UseQuizManagementProps {
  setLoadingMessage: (message: string) => void;
  setError: (error: string | null) => void;
  setGameState: (state: GameState) => void;
  setPreviousGameState: (state: GameState) => void; // Added
  openModal: ReturnType<typeof useModalManagement>["openModal"];
  currentCourse: Course | null; // From useCourseManagement
  navigateToCourseList: () => void; // From useCourseManagement via App
  loadCourseDetails: (course?: Course) => Promise<void>; // From useCourseManagement via App
  setSelectedCourse: (course: Course | null) => void; // From useCourseManagement via App
  currentNumQuestions: number; // From App state
  setNumQuestionsState: (num: number) => void; // From App state
  currentSelectedModel: GeminiModel; // From App state
  setSelectedModelGlobal: (model: GeminiModel) => void; // From App state
  // Fix: Add currentGameState prop
  currentGameState: GameState;
}

export const useQuizManagement = ({
  setLoadingMessage,
  setError,
  setGameState,
  setPreviousGameState,
  openModal,
  currentCourse,
  navigateToCourseList,
  loadCourseDetails,
  setSelectedCourse,
  currentNumQuestions,
  setNumQuestionsState,
  currentSelectedModel,
  setSelectedModelGlobal,
  // Fix: Destructure currentGameState prop
  currentGameState,
}: UseQuizManagementProps) => {
  const [quizTopic, setQuizTopic] = useState<string>("");
  const [generatedQuizData, setGeneratedQuizData] = useState<QuizData | null>(
    null
  );
  const [displayedQuestions, setDisplayedQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerOption | null>(
    null
  );
  const [showHint, setShowHint] = useState<boolean>(false);
  const [currentQuizSourceCourseId, setCurrentQuizSourceCourseId] = useState<
    number | undefined
  >(undefined);
  const [isQuizGenerationComplete, setIsQuizGenerationComplete] =
    useState<boolean>(false);
  const [aiPerformanceSummary, setAiPerformanceSummary] = useState<
    string | null
  >(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(false);

  const resetQuizState = useCallback(
    (maintainNumQuestions = false, maintainModel = false) => {
      setQuizTopic("");
      setGeneratedQuizData(null);
      setDisplayedQuestions([]);
      setCurrentQuestionIndex(0);
      setScore(0);
      setUserAnswers([]);
      setSelectedAnswer(null);
      setShowHint(false);
      setAiPerformanceSummary(null);
      setIsSummaryLoading(false);
      setCurrentQuizSourceCourseId(undefined);
      setIsQuizGenerationComplete(false);
      if (!maintainNumQuestions) setNumQuestionsState(5);
      if (!maintainModel) setSelectedModelGlobal(GeminiModel.FLASH);
    },
    [setNumQuestionsState, setSelectedModelGlobal]
  );

  const handleQuizGeneration = useCallback(
    async (
      topic: string,
      questionsCount: number,
      model: GeminiModel,
      contextText?: string,
      courseId?: number
    ) => {
      resetQuizState(true, true); // Maintain current numQuestions and model from UI selections
      setGameState(GameState.GENERATING_QUIZ);
      setError(null);
      setQuizTopic(topic);
      setNumQuestionsState(questionsCount); // Ensure numQuestions is set from the form
      setSelectedModelGlobal(model); // Ensure model is set from the form
      setCurrentQuizSourceCourseId(courseId);
      setIsQuizGenerationComplete(false);
      setLoadingMessage(`Initializing quiz generation for "${topic}"...`);

      let allGeneratedQuestions: Question[] = [];
      let switchedToPlayingInLoop = false;

      try {
        for await (const question of generateQuizQuestions(
          topic,
          questionsCount,
          model,
          contextText
        )) {
          allGeneratedQuestions.push(question);
          setDisplayedQuestions((prev) => [...prev, question]); // Stream to UI
          setLoadingMessage(
            `Generated question ${allGeneratedQuestions.length} of ${questionsCount}...`
          );

          if (allGeneratedQuestions.length === 1 && !switchedToPlayingInLoop) {
            setGameState(GameState.PLAYING);
            switchedToPlayingInLoop = true;
          }
        }

        if (allGeneratedQuestions.length === 0) {
          setError(
            "No questions were generated. The model might have had an issue or the topic/content was too restrictive. Try a different topic or model."
          );
          setGameState(courseId ? GameState.COURSE_DETAIL : GameState.SETUP);
        } else {
          const fullQuiz: QuizData = {
            topic,
            questions: allGeneratedQuestions,
            modelUsed: model,
            numQuestionsRequested: questionsCount,
            courseId: courseId,
          };
          setGeneratedQuizData(fullQuiz);
          if (!switchedToPlayingInLoop) {
            setGameState(GameState.PLAYING);
          }
        }
      } catch (err) {
        console.error(err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "An unknown error occurred while generating the quiz stream.";
        setError(errorMessage);
        if (allGeneratedQuestions.length > 0) {
          setGeneratedQuizData({
            topic,
            questions: allGeneratedQuestions,
            modelUsed: model,
            numQuestionsRequested: questionsCount,
            courseId,
          });
          if (!switchedToPlayingInLoop) setGameState(GameState.PLAYING);
        } else {
          setGameState(
            currentQuizSourceCourseId
              ? GameState.COURSE_DETAIL
              : GameState.SETUP
          );
        }
      } finally {
        setIsQuizGenerationComplete(true);
        if (
          allGeneratedQuestions.length > 0 &&
          allGeneratedQuestions.length < questionsCount
        ) {
          setNumQuestionsState(allGeneratedQuestions.length); // Update numQuestions to actual generated
          // Fix: Correctly type functional update for setError
          // Fix: The error message "Cannot find name 'error'" for lines 127-129 (original) indicates 'error' variable was not in scope.
          // Removed the problematic else-if block that relied on an undefined 'error' variable.
          // The note about generated questions count will be appended if an error already exists, or set as the error.
          // FIX: Pass a direct string to setError to match its prop type (error: string | null) => void
          setError(
            `Note: Generated ${allGeneratedQuestions.length} out of ${questionsCount} requested questions. The quiz will proceed with the generated ones.`
          );
        }
        setLoadingMessage("");
      }
    },
    [
      resetQuizState,
      setGameState,
      setError,
      setQuizTopic,
      setNumQuestionsState,
      setSelectedModelGlobal,
      setLoadingMessage,
      currentQuizSourceCourseId,
    ]
  );

  const handleAnswerSelect = useCallback(
    (answer: AnswerOption) => {
      // Fix: Use currentGameState prop
      if (currentGameState !== GameState.PLAYING) return;

      setSelectedAnswer(answer);
      const currentQ = displayedQuestions[currentQuestionIndex];
      const correctAnswer = currentQ.answerOptions.find((opt) => opt.isCorrect);

      const userAnswer: UserAnswer = {
        questionText: currentQ.question,
        selectedAnswerText: answer.text,
        correctAnswerText: correctAnswer?.text || "N/A",
        isCorrect: answer.isCorrect,
        rationale: answer.rationale,
      };
      setUserAnswers((prev) => [...prev, userAnswer]);

      if (answer.isCorrect) {
        setScore((prevScore) => prevScore + 1);
      }
      setGameState(GameState.SHOW_ANSWER);
    },
    [displayedQuestions, currentQuestionIndex, currentGameState, setGameState]
  );

  const handleNextQuestion = useCallback(async () => {
    setSelectedAnswer(null);
    setShowHint(false);
    setLoadingMessage("");

    if (currentQuestionIndex < displayedQuestions.length - 1) {
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
      setGameState(GameState.PLAYING);
    } else if (currentQuestionIndex === displayedQuestions.length - 1) {
      // Fix: Use currentNumQuestions (which is state from App.tsx via props) instead of numQuestions (which is not defined here)
      if (
        !isQuizGenerationComplete &&
        displayedQuestions.length < currentNumQuestions
      ) {
        setGameState(GameState.PLAYING);
        setLoadingMessage(
          `Waiting for question ${
            displayedQuestions.length + 1
          } of ${currentNumQuestions}...`
        );
      } else {
        setGameState(GameState.SUMMARIZING_RESULTS);
        setIsSummaryLoading(true);
        setAiPerformanceSummary(null);
        setError(null);
        try {
          if (!displayedQuestions || displayedQuestions.length === 0)
            throw new Error("No questions available for summary.");
          const summary = await summarizeQuizPerformance(
            generatedQuizData?.questions || displayedQuestions,
            userAnswers,
            score,
            displayedQuestions.length,
            currentSelectedModel
          );
          setAiPerformanceSummary(summary);
        } catch (err) {
          console.error("Error generating AI summary:", err);
          setError(
            err instanceof Error
              ? err.message
              : "Failed to generate AI summary."
          );
        } finally {
          setIsSummaryLoading(false);
          setGameState(GameState.RESULTS);
          setLoadingMessage("");
        }
      }
    } else {
      console.warn("Unexpected state in handleNextQuestion.");
      if (isQuizGenerationComplete) {
        setGameState(GameState.RESULTS);
      }
    }
  }, [
    currentQuestionIndex,
    displayedQuestions,
    userAnswers,
    score,
    currentSelectedModel,
    isQuizGenerationComplete,
    currentNumQuestions,
    generatedQuizData,
    setGameState,
    setLoadingMessage,
    setError,
  ]);

  const handleSaveAndExit = useCallback(
    async (isPartialExit = false) => {
      const summaryToSave = isPartialExit ? undefined : aiPerformanceSummary;

      if (!generatedQuizData || !generatedQuizData.questions.length) {
        setError("No full quiz data structure to save.");
        // Fix: Use currentGameState prop
        setGameState(
          currentCourse ? GameState.COURSE_DETAIL : GameState.COURSE_LIST
        );
        return;
      }
      if (userAnswers.length === 0 && isPartialExit) {
        resetQuizState();
        setGameState(
          currentQuizSourceCourseId ? GameState.COURSE_DETAIL : GameState.SETUP
        );
        return;
      }

      setLoadingMessage("Saving quiz attempt...");
      setError(null);
      try {
        let quizStructureId = generatedQuizData.id;
        if (!quizStructureId) {
          quizStructureId = await db.addQuizStructure({
            ...generatedQuizData,
            courseId: currentQuizSourceCourseId,
          });
          setGeneratedQuizData((prevData) =>
            prevData ? { ...prevData, id: quizStructureId } : null
          );
        }

        await db.addQuizAttempt({
          quizId: quizStructureId,
          courseId: currentQuizSourceCourseId || 0,
          score: score,
          totalQuestionsInAttempt: userAnswers.length,
          userAnswers: userAnswers,
          aiSummary: summaryToSave || undefined,
          modelUsed: currentSelectedModel,
          quizTopic: quizTopic,
        });

        if (currentQuizSourceCourseId && summaryToSave) {
          const analysisTitle = `Performance Analysis for Quiz: ${quizTopic} - ${new Date().toLocaleDateString()}`;
          const analysisContent = `AI-generated analysis:\n${summaryToSave}`;
          await db.addCourseTextContent(
            currentQuizSourceCourseId,
            analysisTitle,
            analysisContent
          );
        }

        resetQuizState();
        if (currentQuizSourceCourseId) {
          setGameState(GameState.COURSE_DETAIL);
          if (currentCourse && currentCourse.id === currentQuizSourceCourseId) {
            await loadCourseDetails(currentCourse); // Reload details for the current course
          } else {
            const sourceCourse = await db.getCourseById(
              currentQuizSourceCourseId
            );
            if (sourceCourse) {
              setSelectedCourse(sourceCourse); // Update App's current course via hook
              await loadCourseDetails(sourceCourse);
            } else {
              navigateToCourseList(); // Fallback
            }
          }
        } else {
          navigateToCourseList();
        }
      } catch (err) {
        console.error("Error saving quiz attempt:", err);
        setError(
          err instanceof Error ? err.message : "Failed to save quiz attempt."
        );
      } finally {
        setLoadingMessage("");
      }
    },
    [
      generatedQuizData,
      score,
      userAnswers,
      aiPerformanceSummary,
      currentSelectedModel,
      quizTopic,
      currentQuizSourceCourseId,
      currentCourse,
      resetQuizState,
      setGameState,
      setLoadingMessage,
      setError,
      navigateToCourseList,
      loadCourseDetails,
      setSelectedCourse,
    ]
  );

  const handleRestartQuizSetup = useCallback(() => {
    resetQuizState();
    setGameState(GameState.SETUP);
  }, [resetQuizState, setGameState]);

  const handleRetakeQuiz = useCallback(
    async (attempt: QuizAttempt) => {
      setLoadingMessage("Loading quiz for retake...");
      setError(null);
      try {
        const quizStructure = await db.getQuizStructureById(attempt.quizId);
        if (
          !quizStructure ||
          !quizStructure.questions ||
          quizStructure.questions.length === 0
        ) {
          setError(
            "Could not find the original quiz questions. It might have been deleted or was incomplete."
          );
          setLoadingMessage("");
          return;
        }
        resetQuizState(false, false);

        setQuizTopic(quizStructure.topic);
        setNumQuestionsState(quizStructure.questions.length);
        setSelectedModelGlobal(quizStructure.modelUsed as GeminiModel);
        setCurrentQuizSourceCourseId(quizStructure.courseId);

        setGeneratedQuizData(quizStructure);
        setDisplayedQuestions(quizStructure.questions);

        setIsQuizGenerationComplete(true);
        setGameState(GameState.PLAYING);
      } catch (err) {
        console.error("Error retaking quiz:", err);
        setError(
          err instanceof Error
            ? err.message
            : "An error occurred while trying to retake the quiz."
        );
      }
      setLoadingMessage("");
    },
    [
      resetQuizState,
      setQuizTopic,
      setNumQuestionsState,
      setSelectedModelGlobal,
      setGameState,
      setLoadingMessage,
      setError,
    ]
  );

  const handleStartRetakeCurrentGeneratedQuiz = useCallback(() => {
    if (
      !generatedQuizData ||
      !generatedQuizData.questions ||
      generatedQuizData.questions.length === 0
    ) {
      setError("Cannot retake, current quiz data is not available.");
      return;
    }
    setError(null);
    const currentQuizData = generatedQuizData; // Capture before reset

    resetQuizState(false, false);

    setQuizTopic(currentQuizData.topic);
    setNumQuestionsState(currentQuizData.questions.length);
    setSelectedModelGlobal(currentQuizData.modelUsed as GeminiModel);
    setCurrentQuizSourceCourseId(currentQuizData.courseId);

    setGeneratedQuizData(currentQuizData);
    setDisplayedQuestions(currentQuizData.questions);

    setIsQuizGenerationComplete(true);
    setGameState(GameState.PLAYING);
  }, [
    generatedQuizData,
    resetQuizState,
    setQuizTopic,
    setNumQuestionsState,
    setSelectedModelGlobal,
    setGameState,
    setError,
  ]);

  const toggleHint = useCallback(() => {
    // Fix: Use currentGameState prop
    if (currentGameState === GameState.PLAYING) {
      setShowHint((prev) => !prev);
    }
  }, [currentGameState]);

  const handleStartChat = useCallback(() => {
    if (displayedQuestions[currentQuestionIndex]) {
      // Fix: Use currentGameState prop
      setPreviousGameState(currentGameState);
      setGameState(GameState.CHATTING_QUESTION);
    }
  }, [
    currentGameState,
    displayedQuestions,
    currentQuestionIndex,
    setGameState,
    setPreviousGameState,
  ]);

  const handleEndChat = useCallback(
    (newPreviousState?: GameState) => {
      // Allow overriding previous state if needed
      // Fix: Use currentGameState prop as fallback
      setGameState(newPreviousState || currentGameState); // Fallback to currentGameState if no override
    },
    [currentGameState, setGameState]
  );

  const handleExitQuizRequest = useCallback(() => {
    openModal({
      title: "Exit Quiz",
      message:
        "Are you sure you want to exit the quiz? If you've answered any questions, your progress so far will be saved. If not, the quiz attempt won't be saved.",
      confirmButtonText: "Exit Quiz",
      itemType: "exitQuiz",
      onConfirm: () => handleSaveAndExit(true), // isPartialExit = true
    });
  }, [openModal, handleSaveAndExit]);

  return {
    quizTopic,
    generatedQuizData,
    displayedQuestions,
    currentQuestionIndex,
    score,
    userAnswers,
    selectedAnswer,
    showHint,
    currentQuizSourceCourseId,
    isQuizGenerationComplete,
    aiPerformanceSummary,
    isSummaryLoading,
    resetQuizState,
    handleQuizGeneration,
    handleAnswerSelect,
    handleNextQuestion,
    handleSaveAndExit,
    handleRestartQuizSetup,
    handleRetakeQuiz,
    handleStartRetakeCurrentGeneratedQuiz,
    toggleHint,
    handleStartChat,
    handleEndChat,
    handleExitQuizRequest,
  };
};
