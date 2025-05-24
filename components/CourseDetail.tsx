import { Check, Edit3, Play, Plus, Trash2, X } from "lucide-react";
import { marked } from "marked";
import React, { useState } from "react";
import type {
  Course,
  CourseTextContent,
  GeminiModel,
  QuizAttempt,
} from "../types";
import { GeminiModel as GeminiModelEnum } from "../types";

interface CourseDetailProps {
  course: Course;
  contents: CourseTextContent[];
  attempts: QuizAttempt[];
  onAddContent: (
    courseId: number,
    title: string,
    textContent: string
  ) => Promise<void>;
  onDeleteContent: (contentId: number) => void;
  onBackToList: () => void;
  onStartQuizFromCourseContent: (
    numQuestions: number,
    model: GeminiModel
  ) => void;
  onViewAttempt: (attempt: QuizAttempt) => void;
  selectedModel: GeminiModel;
  onModelChange: (model: GeminiModel) => void;
  initialNumQuestions: number;
  onUpdateContent: (
    contentId: number,
    title: string,
    textContent: string
  ) => Promise<void>;
  onDeleteAttempt: (attemptId: number) => void;
  onEditCourseName: (courseId: number, newName: string) => Promise<void>;
  onDeleteCourse: (courseId: number) => void;
  isLoading: boolean;
}

export const CourseDetail: React.FC<CourseDetailProps> = ({
  course,
  contents,
  attempts,
  onAddContent,
  onDeleteContent,
  onBackToList,
  onStartQuizFromCourseContent,
  onViewAttempt,
  selectedModel,
  onModelChange,
  initialNumQuestions,
  onUpdateContent,
  isLoading,
}) => {
  const [showAddContentForm, setShowAddContentForm] = useState(false);
  const [newContentTitle, setNewContentTitle] = useState("");
  const [newContentText, setNewContentText] = useState("");
  const [numQuizQuestions, setNumQuizQuestions] = useState(initialNumQuestions);
  const [editingContentId, setEditingContentId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newContentTitle.trim() && newContentText.trim() && course.id) {
      await onAddContent(
        course.id,
        newContentTitle.trim(),
        newContentText.trim()
      );
      setNewContentTitle("");
      setNewContentText("");
      setShowAddContentForm(false);
    }
  };

  const handleDeleteRequest = (contentId: number) => {
    onDeleteContent(contentId);
  };

  const handleStartEdit = (content: CourseTextContent) => {
    if (content.id) {
      setEditingContentId(content.id);
      setEditTitle(content.title);
      setEditText(content.textContent);
    }
  };

  const handleSaveEdit = async () => {
    if (editingContentId && editTitle.trim() && editText.trim()) {
      await onUpdateContent(
        editingContentId,
        editTitle.trim(),
        editText.trim()
      );
      setEditingContentId(null);
      setEditTitle("");
      setEditText("");
    }
  };

  const handleCancelEdit = () => {
    setEditingContentId(null);
    setEditTitle("");
    setEditText("");
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <button
        onClick={onBackToList}
        className="text-sm text-purple-300 hover:text-purple-200 mb-4"
      >
        &larr; Back to Courses
      </button>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-semibold text-sky-300">
            Course Content
          </h3>
          <button
            onClick={() => setShowAddContentForm(!showAddContentForm)}
            className="flex items-center bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-3 rounded-md shadow-sm transition-colors"
            disabled={isLoading}
          >
            <Plus size={20} className="mr-1.5" />
            {showAddContentForm ? "Cancel Add" : "Add Text Content"}
          </button>
        </div>

        {showAddContentForm && (
          <form
            onSubmit={handleAddSubmit}
            className="p-4 bg-slate-700/50 rounded-lg space-y-3 mb-6 animate-fadeInDown"
          >
            <div>
              <label
                htmlFor="newContentTitle"
                className="block text-sm font-medium text-sky-300 mb-1"
              >
                Content Title
              </label>
              <input
                type="text"
                id="newContentTitle"
                value={newContentTitle}
                onChange={(e) => setNewContentTitle(e.target.value)}
                className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-1 focus:ring-purple-500 outline-none placeholder-slate-400 text-slate-100"
                placeholder="e.g., Chapter 1 Summary"
                required
              />
            </div>
            <div>
              <label
                htmlFor="newContentText"
                className="block text-sm font-medium text-sky-300 mb-1"
              >
                Text Content
              </label>
              <textarea
                id="newContentText"
                value={newContentText}
                onChange={(e) => setNewContentText(e.target.value)}
                rows={8}
                className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-1 focus:ring-purple-500 outline-none placeholder-slate-400 text-slate-100"
                placeholder="Paste or type your course text material here..."
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md shadow transition disabled:opacity-70"
            >
              {isLoading ? "Saving..." : "Save Content"}
            </button>
          </form>
        )}

        {contents.length === 0 && !showAddContentForm && (
          <p className="text-slate-400 text-center py-4">
            No text content added to this course yet. Add some to generate
            quizzes from it!
          </p>
        )}
        <ul className="space-y-3">
          {contents.map((content) => (
            <li
              key={content.id}
              className="p-4 bg-slate-700 border border-slate-600 rounded-lg shadow relative"
            >
              {editingContentId === content.id ? (
                // Edit mode
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-sky-300 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full p-2.5 bg-slate-600 border border-slate-500 rounded-md shadow-sm focus:ring-1 focus:ring-purple-500 outline-none text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-sky-300 mb-1">
                      Content
                    </label>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={8}
                      className="w-full p-2.5 bg-slate-600 border border-slate-500 rounded-md shadow-sm focus:ring-1 focus:ring-purple-500 outline-none text-slate-100"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={
                        isLoading || !editTitle.trim() || !editText.trim()
                      }
                      className="flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition disabled:opacity-50"
                    >
                      <Check size={16} className="mr-1" />
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium rounded-md transition"
                    >
                      <X size={16} className="mr-1" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <>
                  <h4 className="text-md font-semibold text-purple-300 mb-1">
                    {content.title}
                  </h4>
                  <div
                    className="prose prose-sm prose-invert max-h-28 overflow-y-auto text-slate-300 mb-2"
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(content.textContent) as string,
                    }}
                  ></div>
                  <p className="text-xs text-slate-500">
                    Added: {new Date(content.createdAt).toLocaleDateString()}
                  </p>

                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={() => handleStartEdit(content)}
                      disabled={isLoading || !content.id}
                      className="p-1.5 bg-blue-500/20 hover:bg-blue-500/40 rounded-md text-blue-400 hover:text-blue-300 transition disabled:opacity-50"
                      aria-label="Edit content"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() =>
                        content.id && handleDeleteRequest(content.id)
                      }
                      disabled={isLoading || !content.id}
                      className="p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded-md text-red-400 hover:text-red-300 transition disabled:opacity-50"
                      aria-label="Delete content"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      {(contents.length > 0 || course.name) && (
        <section className="mt-8 pt-6 border-t border-slate-700">
          <h3 className="text-2xl font-semibold text-sky-300 mb-1">
            Generate Quiz
          </h3>
          {contents.length === 0 && (
            <p className="text-sm text-yellow-400 mb-3">
              No text content in this course. Quiz will be generated based on
              the course title: "{course.name}".
            </p>
          )}
          {contents.length > 0 && (
            <p className="text-sm text-slate-400 mb-3">
              Using {contents.length} text block(s) from this course to generate
              the quiz.
            </p>
          )}
          <div className="p-4 bg-slate-700/50 rounded-lg space-y-4">
            <div>
              <label
                htmlFor="numCourseQuizQuestions"
                className="block text-sm font-medium text-sky-300 mb-1"
              >
                Number of Questions
              </label>
              <input
                type="number"
                id="numCourseQuizQuestions"
                value={numQuizQuestions}
                onChange={(e) =>
                  setNumQuizQuestions(
                    Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1))
                  )
                }
                min="1"
                max="20"
                className="w-full md:w-1/2 p-2.5 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-1 focus:ring-purple-500 outline-none text-slate-100"
              />
            </div>
            <div>
              <label
                htmlFor="courseQuizModel"
                className="block text-sm font-medium text-sky-300 mb-1"
              >
                AI Model
              </label>
              <select
                id="courseQuizModel"
                value={selectedModel}
                onChange={(e) =>
                  onModelChange(e.target.value as GeminiModelEnum)
                }
                className="w-full md:w-1/2 p-2.5 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-1 focus:ring-purple-500 outline-none text-slate-100"
              >
                <option value={GeminiModelEnum.FLASH}>Gemini 2.5 Flash</option>
                <option value={GeminiModelEnum.PRO}>Gemini 2.5 Pro</option>
                <option value={GeminiModelEnum.FLASH_2_0}>
                  Gemini 2.0 Flash
                </option>
              </select>
            </div>
            <button
              onClick={() =>
                onStartQuizFromCourseContent(numQuizQuestions, selectedModel)
              }
              className="w-full md:w-auto flex items-center justify-center bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-semibold py-2.5 px-5 rounded-lg shadow-md transition"
              disabled={isLoading}
            >
              <Play size={20} className="mr-2" />
              Start Quiz
            </button>
          </div>
        </section>
      )}

      <section className="mt-8 pt-6 border-t border-slate-700">
        <h3 className="text-2xl font-semibold text-sky-300 mb-4">
          Quiz History for this Course
        </h3>
        {attempts.length === 0 && (
          <p className="text-slate-400 text-center py-4">
            No quizzes taken for this course yet.
          </p>
        )}
        <ul className="space-y-3">
          {attempts.map((attempt) => (
            <li key={attempt.id}>
              <button
                onClick={() => onViewAttempt(attempt)}
                className="w-full text-left p-4 bg-slate-700 hover:bg-slate-600/70 border border-slate-600 rounded-lg shadow-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 group"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-md font-semibold text-purple-300 group-hover:text-purple-200">
                      Quiz on: {attempt.quizTopic}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Attempted:{" "}
                      {new Date(attempt.attemptedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-bold ${
                        attempt.score / attempt.totalQuestionsInAttempt >= 0.7
                          ? "text-green-400"
                          : attempt.score / attempt.totalQuestionsInAttempt >=
                            0.4
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      {attempt.score}/{attempt.totalQuestionsInAttempt} (
                      {Math.round(
                        (attempt.score / attempt.totalQuestionsInAttempt) * 100
                      )}
                      %)
                    </p>
                    <p className="text-xs text-slate-500 group-hover:text-purple-300">
                      View Summary &rarr;
                    </p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
