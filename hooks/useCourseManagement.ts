
import { useState, useEffect, useCallback } from 'react';
import * as db from '../db';
import type { Course, CourseTextContent, QuizAttempt } from '../types';
import { GameState } from '../types';
import type { useModalManagement } from './useModalManagement';

interface UseCourseManagementProps {
  setLoadingMessage: (message: string) => void;
  setError: (error: string | null) => void;
  setGameState: (state: GameState) => void;
  openModal: ReturnType<typeof useModalManagement>['openModal'];
  currentGameState: GameState; // To know when to load details
  initialCourses?: Course[]; // Optional initial data
}

export const useCourseManagement = ({
  setLoadingMessage,
  setError,
  setGameState,
  openModal,
  currentGameState,
  initialCourses = [],
}: UseCourseManagementProps) => {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [currentCourseContents, setCurrentCourseContents] = useState<CourseTextContent[]>([]);
  const [currentCourseQuizAttempts, setCurrentCourseQuizAttempts] = useState<QuizAttempt[]>([]);
  const [viewingQuizAttempt, setViewingQuizAttempt] = useState<QuizAttempt | null>(null);

  const loadCourses = useCallback(async () => {
    setLoadingMessage('Loading courses...');
    setError(null);
    try {
      const fetchedCourses = await db.getAllCourses();
      setCourses(fetchedCourses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (err) {
      console.error("Failed to load courses:", err);
      setError("Could not load courses.");
    }
    setLoadingMessage('');
  }, [setLoadingMessage, setError]);

  const loadCourseDetails = useCallback(async (courseToLoad?: Course) => {
    const targetCourse = courseToLoad || currentCourse;
    if (targetCourse && targetCourse.id) {
      setLoadingMessage(`Loading details for ${targetCourse.name}...`);
      setError(null);
      try {
        const contents = await db.getCourseTextContents(targetCourse.id);
        setCurrentCourseContents(contents.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()));
        const attempts = await db.getQuizAttemptsForCourse(targetCourse.id);
        setCurrentCourseQuizAttempts(attempts.sort((a, b) => b.attemptedAt.getTime() - a.attemptedAt.getTime()));
      } catch (err) {
        console.error("Failed to load course details:", err);
        setError(`Could not load details for course ${targetCourse.name}.`);
      }
      setLoadingMessage('');
    }
  }, [currentCourse, setLoadingMessage, setError]);


  useEffect(() => {
    if (currentGameState === GameState.COURSE_LIST && courses.length === 0) {
      // loadCourses(); // Initial load handled in App.tsx or by initialCourses prop
    } else if (currentGameState === GameState.COURSE_DETAIL && currentCourse) {
      loadCourseDetails();
    }
  }, [currentCourse, currentGameState, loadCourseDetails, courses.length]);


  const navigateToCourseList = useCallback(() => {
    setCurrentCourse(null);
    setCurrentCourseContents([]);
    setCurrentCourseQuizAttempts([]);
    setViewingQuizAttempt(null);
    setGameState(GameState.COURSE_LIST);
    setError(null);
  }, [setGameState, setError]);

  const handleCreateCourse = async (name: string) => {
    setError(null);
    setLoadingMessage("Creating course...");
    try {
      const newCourseId = await db.addCourse(name);
      const newCourse = await db.getCourseById(newCourseId);
      if (newCourse) {
        setCourses(prev => [newCourse, ...prev].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
        setCurrentCourse(newCourse);
        setGameState(GameState.COURSE_DETAIL);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create course.");
    }
    setLoadingMessage("");
  };

  const handleUpdateCourseName = async (courseId: number, newName: string) => {
    setError(null);
    setLoadingMessage("Updating course name...");
    try {
      await db.updateCourse(courseId, newName);
      setCourses(prevCourses => prevCourses.map(c => c.id === courseId ? { ...c, name: newName } : c)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      if (currentCourse && currentCourse.id === courseId) {
        setCurrentCourse(prev => prev ? { ...prev, name: newName } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update course name.");
    }
    setLoadingMessage("");
  };

  const handleDeleteCourseRequest = (courseId: number) => {
    const courseToDelete = courses.find(c => c.id === courseId);
    openModal({
      title: "Delete Course",
      message: `Are you sure you want to delete the course "${courseToDelete?.name || 'this course'}"? This will also delete all its content and quiz history. This action cannot be undone.`,
      confirmButtonText: "Delete Course",
      itemType: 'course',
      onConfirm: async () => {
        setError(null);
        setLoadingMessage("Deleting course...");
        try {
          await db.deleteCourseTextContentsByCourseId(courseId);
          await db.deleteQuizAttemptsByCourseId(courseId);
          await db.deleteQuizStructuresByCourseId(courseId);
          await db.deleteCourse(courseId);

          setCourses(prev => prev.filter(c => c.id !== courseId));
          if (currentCourse && currentCourse.id === courseId) {
            navigateToCourseList();
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not delete course.");
        }
        setLoadingMessage("");
      }
    });
  };

  const handleSelectCourse = (course: Course) => {
    setCurrentCourse(course);
    setViewingQuizAttempt(null); // Clear any viewed attempt when selecting a new course
    setGameState(GameState.COURSE_DETAIL);
  };

  const handleAddCourseContent = async (courseId: number, title: string, textContent: string) => {
    setError(null);
    setLoadingMessage("Adding content...");
    try {
      await db.addCourseTextContent(courseId, title, textContent);
      if (currentCourse && currentCourse.id === courseId) {
        loadCourseDetails(currentCourse);
      }
    } catch (err) {
      console.error("Failed to add course content:", err);
      setError(err instanceof Error ? err.message : "Could not add content.");
    }
    setLoadingMessage("");
  };

  const handleUpdateCourseContent = async (contentId: number, title: string, textContent: string) => {
    if (!currentCourse || !currentCourse.id) return;
    setError(null);
    setLoadingMessage("Updating content...");
    try {
      await db.updateCourseTextContent(contentId, title, textContent);
      loadCourseDetails(currentCourse);
    } catch (err) {
      console.error("Failed to update course content:", err);
      setError(err instanceof Error ? err.message : "Could not update content.");
    }
    setLoadingMessage("");
  };

  const handleDeleteCourseContentRequest = (contentId: number) => {
    const contentToDelete = currentCourseContents.find(cc => cc.id === contentId);
    openModal({
      title: "Delete Course Content",
      message: `Are you sure you want to delete the content block "${contentToDelete?.title || 'this content'}"? This action cannot be undone.`,
      confirmButtonText: "Delete Content",
      itemType: 'courseContent',
      onConfirm: async () => {
        if (!currentCourse || !currentCourse.id) return;
        setError(null);
        setLoadingMessage("Deleting content...");
        try {
          await db.deleteCourseTextContent(contentId);
          loadCourseDetails(currentCourse);
        } catch (err) {
          console.error("Failed to delete course content:", err);
          setError(err instanceof Error ? err.message : "Could not delete content.");
        }
        setLoadingMessage("");
      }
    });
  };

  const handleViewQuizAttempt = (attempt: QuizAttempt) => {
    setViewingQuizAttempt(attempt);
    setGameState(GameState.QUIZ_HISTORY_DETAIL);
  };

  const handleDeleteQuizAttemptRequest = (attemptId: number) => {
    const attemptToDelete = currentCourseQuizAttempts.find(qa => qa.id === attemptId);
    openModal({
      title: "Delete Quiz Attempt",
      message: `Are you sure you want to delete this quiz attempt for "${attemptToDelete?.quizTopic || 'this quiz'}"? This action cannot be undone.`,
      confirmButtonText: "Delete Attempt",
      itemType: 'quizAttempt',
      onConfirm: async () => {
        if (!currentCourse || !currentCourse.id) return;
        setError(null);
        setLoadingMessage("Deleting quiz attempt...");
        try {
          await db.deleteQuizAttempt(attemptId);
          loadCourseDetails(currentCourse);
        } catch (err) {
          console.error("Failed to delete quiz attempt:", err);
          setError(err instanceof Error ? err.message : "Could not delete quiz attempt.");
        }
        setLoadingMessage("");
      }
    });
  };

  const setInitialCourses = (loadedCourses: Course[]) => {
    setCourses(loadedCourses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
  };


  return {
    courses,
    currentCourse,
    setCurrentCourse, // Expose for quiz management to set course after save
    currentCourseContents,
    currentCourseQuizAttempts,
    viewingQuizAttempt,
    setViewingQuizAttempt, // Expose for QuizHistoryDetail back navigation
    loadCourses,
    loadCourseDetails,
    navigateToCourseList,
    handleCreateCourse,
    handleUpdateCourseName,
    handleDeleteCourseRequest,
    handleSelectCourse,
    handleAddCourseContent,
    handleUpdateCourseContent,
    handleDeleteCourseContentRequest,
    handleViewQuizAttempt,
    handleDeleteQuizAttemptRequest,
    setInitialCourses, // For initial load in App.tsx
  };
};
