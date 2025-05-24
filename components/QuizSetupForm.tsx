
import React, { useState, useEffect } from 'react';
import { GeminiModel, type Course, type CourseTextContent } from '../types';
import * as db from '../db'; // Assuming db.ts is in the parent directory

interface QuizSetupFormProps {
  onGenerateQuiz: (topic: string, numQuestions: number, model: GeminiModel, contextText?: string, courseId?: number) => void;
  initialNumQuestions: number;
  selectedModel: GeminiModel;
  onModelChange: (model: GeminiModel) => void;
  onNavigateToCourses: () => void;
}

export const QuizSetupForm: React.FC<QuizSetupFormProps> = ({ 
  onGenerateQuiz, 
  initialNumQuestions,
  selectedModel,
  onModelChange,
  onNavigateToCourses
}) => {
  const [topic, setTopic] = useState<string>('');
  const [numQuestions, setNumQuestions] = useState<number>(initialNumQuestions);
  const [generationSource, setGenerationSource] = useState<'topic' | 'course'>('topic');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('');
  const [courseContents, setCourseContents] = useState<CourseTextContent[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState<boolean>(false);

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoadingCourses(true);
      try {
        const fetchedCourses = await db.getAllCourses();
        setCourses(fetchedCourses.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime())); // Show newest first
      } catch (error) {
        console.error("Failed to fetch courses:", error);
      }
      setIsLoadingCourses(false);
    };
    if (generationSource === 'course') {
      fetchCourses();
    }
  }, [generationSource]);

  useEffect(() => {
    const fetchCourseContents = async () => {
      if (selectedCourseId) {
        try {
          const contents = await db.getCourseTextContents(selectedCourseId as number);
          setCourseContents(contents);
        } catch (error) {
          console.error("Failed to fetch course contents:", error);
          setCourseContents([]);
        }
      } else {
        setCourseContents([]);
      }
    };
    if (generationSource === 'course' && selectedCourseId) {
      fetchCourseContents();
    }
  }, [selectedCourseId, generationSource]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numQuestions <= 0) return;

    if (generationSource === 'topic' && topic.trim()) {
      onGenerateQuiz(topic.trim(), numQuestions, selectedModel);
    } else if (generationSource === 'course' && selectedCourseId) {
      const selectedCourse = courses.find(c => c.id === selectedCourseId);
      if (!selectedCourse) {
        alert("Selected course not found.");
        return;
      }
      if (courseContents.length === 0) {
        alert("Selected course has no text content. Please add content to the course first or choose 'General Topic'.");
        return;
      }
      const combinedContextText = courseContents.map(cc => `Content Title: ${cc.title}\n${cc.textContent}`).join('\n\n---\n\n');
      onGenerateQuiz(selectedCourse.name, numQuestions, selectedModel, combinedContextText, selectedCourse.id);
    } else {
      alert("Please fill in the topic or select a course with content.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
      <div>
        <label htmlFor="generationSource" className="block text-sm font-medium text-sky-300 mb-1">
          Quiz Source
        </label>
        <select
          id="generationSource"
          value={generationSource}
          onChange={(e) => setGenerationSource(e.target.value as 'topic' | 'course')}
          className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-slate-100"
        >
          <option value="topic">General Topic</option>
          <option value="course">From My Course Content</option>
        </select>
      </div>

      {generationSource === 'topic' && (
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-sky-300 mb-1">
            Quiz Topic
          </label>
          <input
            type="text"
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., The Solar System, React Hooks"
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none placeholder-slate-400 text-slate-100"
            required={generationSource === 'topic'}
            aria-label="Quiz Topic"
          />
        </div>
      )}

      {generationSource === 'course' && (
        <div>
          <label htmlFor="courseSelect" className="block text-sm font-medium text-sky-300 mb-1">
            Select Course
          </label>
          {isLoadingCourses ? <p className="text-slate-400">Loading courses...</p> : (
            courses.length > 0 ? (
              <select
                id="courseSelect"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-slate-100"
                required={generationSource === 'course'}
              >
                <option value="" disabled>-- Select a Course --</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.name}</option>
                ))}
              </select>
            ) : (
              <p className="text-slate-400">No courses found. 
                <button type="button" onClick={onNavigateToCourses} className="ml-1 text-purple-400 hover:text-purple-300 underline">Create one?</button>
              </p>
            )
          )}
          {selectedCourseId && courseContents.length > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              Using {courseContents.length} text content block(s) from this course.
            </p>
          )}
           {selectedCourseId && courseContents.length === 0 && generationSource === 'course' && (
            <p className="text-xs text-yellow-400 mt-1">
              This course has no text content. Add content in the Course Details.
            </p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="numQuestions" className="block text-sm font-medium text-sky-300 mb-1">
          Number of Questions
        </label>
        <input
          type="number"
          id="numQuestions"
          value={numQuestions}
          onChange={(e) => setNumQuestions(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))}
          min="1"
          max="20" 
          className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-slate-100"
          required
          aria-label="Number of Questions"
        />
      </div>
      <div>
        <label htmlFor="model" className="block text-sm font-medium text-sky-300 mb-1">
          Select AI Model
        </label>
        <select
          id="model"
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value as GeminiModel)}
          className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-slate-100"
          aria-label="Select AI Model"
        >
          <option value={GeminiModel.FLASH}>Gemini 2.5 Flash (Faster, Good for most uses)</option>
          <option value={GeminiModel.PRO}>Gemini 2.5 Pro (Slightly Slower, Potentially Higher Quality)</option>
        </select>
      </div>
      <button
        type="submit"
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-pink-500 transition duration-150 ease-in-out transform hover:scale-105"
        // Fix: Ensure the disabled condition evaluates to a boolean
        disabled={generationSource === 'course' && (!selectedCourseId || (courseContents.length === 0 && !!selectedCourseId))}
      >
        Generate Quiz
      </button>
       <button
        type="button"
        onClick={onNavigateToCourses}
        className="mt-4 w-full bg-slate-600 hover:bg-slate-500 text-sky-200 font-medium py-2.5 px-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500 transition duration-150 ease-in-out"
      >
        Manage Courses & Content
      </button>
    </form>
  );
};
