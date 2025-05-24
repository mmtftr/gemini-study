import { Check, Edit3, Play, Plus, Sparkles, Trash2, X } from "lucide-react";
import { marked } from "marked";
import React, { useState } from "react";
import type {
  Course,
  CourseTextContent,
  GeminiModel,
  QuizAttempt,
} from "../types";
import { generateSingleContent } from "../services/geminiService";

interface CourseDetailProps {
  course: Course;
  contents: CourseTextContent[];
  attempts: QuizAttempt[];
  onAddContent: (
    courseId: number,
    title: string,
    textContent: string,
  ) => Promise<void>;
  onDeleteContent: (contentId: number) => void;
  onBackToList: () => void;
  onStartQuizFromCourseContent: (
    numQuestions: number,
    model: GeminiModel,
  ) => void;
  onViewAttempt: (attempt: QuizAttempt) => void;
  selectedModel: GeminiModel;
  initialNumQuestions: number;
  onUpdateContent: (
    contentId: number,
    title: string,
    textContent: string,
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
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newContentTitle.trim() && newContentText.trim() && course.id) {
      await onAddContent(
        course.id,
        newContentTitle.trim(),
        newContentText.trim(),
      );
      setNewContentTitle("");
      setNewContentText("");
      setShowAddContentForm(false);
    }
  };

  const handleGenerateFromPrompt = async () => {
    if (!newContentText.trim()) return;

    setIsGeneratingContent(true);
    try {
      const content = await generateSingleContent(
        newContentText,
        selectedModel,
      );

      setNewContentTitle(content.title);
      setNewContentText(content.content);
    } catch (error) {
      console.error("Error generating content:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to generate content. Please try again.",
      );
    } finally {
      setIsGeneratingContent(false);
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
        editText.trim(),
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
    <div className="space-y-8">
      <button
        onClick={onBackToList}
        className="text-sm text-purple-300 hover:text-purple-200 mb-4 transition-smooth"
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
            className="flex items-center bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-3 rounded-md shadow-sm transition-smooth"
            disabled={isLoading}
          >
            <Plus size={20} className="mr-1.5" />
            {showAddContentForm ? "Cancel Add" : "Add Text Content"}
          </button>
        </div>

        {showAddContentForm && (
          <form
            onSubmit={handleAddSubmit}
            className="p-4 bg-slate-700/50 rounded-lg space-y-3 mb-6"
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
                className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-1 focus:ring-purple-500 outline-none placeholder-slate-400 text-slate-100 transition-smooth"
                placeholder="e.g., Chapter 1 Summary"
                required
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label
                  htmlFor="newContentText"
                  className="block text-sm font-medium text-sky-300"
                >
                  Content / Prompt
                </label>
                <button
                  type="button"
                  onClick={handleGenerateFromPrompt}
                  disabled={isGeneratingContent || !newContentText.trim()}
                  className="flex items-center text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-1 px-2 rounded transition-smooth disabled:opacity-50"
                >
                  <Sparkles size={12} className="mr-1" />
                  {isGeneratingContent
                    ? "Generating..."
                    : "Generate from Prompt"}
                </button>
              </div>
              <textarea
                id="newContentText"
                value={newContentText}
                onChange={(e) => setNewContentText(e.target.value)}
                rows={8}
                className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-1 focus:ring-purple-500 outline-none placeholder-slate-400 text-slate-100 transition-smooth"
                placeholder="Enter a prompt like 'Explain machine learning basics' or paste your course text material here..."
                required
              />
              <p className="text-xs text-slate-400 mt-1">
                💡 Tip: Enter a short prompt and click "Generate from Prompt" to
                create comprehensive content, or paste existing material
                directly.
              </p>
            </div>
            <button
              type="submit"
              disabled={isLoading || isGeneratingContent}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md shadow transition-smooth disabled:opacity-70"
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

        {contents.length > 0 && (
          <ul className="space-y-3">
            {contents.map((content, _index) => (
              <li
                key={content.id}
                className="p-4 bg-slate-700 border border-slate-600 rounded-lg shadow relative transition-smooth hover:bg-slate-600/50"
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
                        className="w-full p-2.5 bg-slate-600 border border-slate-500 rounded-md shadow-sm focus:ring-1 focus:ring-purple-500 outline-none text-slate-100 transition-smooth"
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
                        className="w-full p-2.5 bg-slate-600 border border-slate-500 rounded-md shadow-sm focus:ring-1 focus:ring-purple-500 outline-none text-slate-100 transition-smooth"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        disabled={
                          isLoading || !editTitle.trim() || !editText.trim()
                        }
                        className="flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-smooth disabled:opacity-50"
                      >
                        <Check size={16} className="mr-1" />
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium rounded-md transition-smooth"
                      >
                        <X size={16} className="mr-1" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div>
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
                        className="p-1.5 bg-blue-500/20 hover:bg-blue-500/40 rounded-md text-blue-400 hover:text-blue-300 transition-smooth disabled:opacity-50"
                        aria-label="Edit content"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() =>
                          content.id && handleDeleteRequest(content.id)
                        }
                        disabled={isLoading || !content.id}
                        className="p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded-md text-red-400 hover:text-red-300 transition-smooth disabled:opacity-50"
                        aria-label="Delete content"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
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
                    Math.max(
                      1,
                      Math.min(20, parseInt(e.target.value, 10) || 1),
                    ),
                  )
                }
                min="1"
                max="20"
                className="w-full md:w-1/2 p-2.5 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-1 focus:ring-purple-500 outline-none text-slate-100 transition-smooth"
              />
            </div>
            <button
              onClick={() =>
                onStartQuizFromCourseContent(numQuizQuestions, selectedModel)
              }
              className="w-full md:w-auto flex items-center justify-center bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-semibold py-2.5 px-5 rounded-lg shadow-md transition-smooth"
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
        {attempts.length > 0 && (
          <ul className="space-y-3">
            {attempts.map((attempt, _index) => (
              <li key={attempt.id}>
                <button
                  onClick={() => onViewAttempt(attempt)}
                  className="w-full text-left p-4 bg-slate-700 hover:bg-slate-600/70 border border-slate-600 rounded-lg shadow-sm transition-smooth focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 group"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-md font-semibold text-purple-300 group-hover:text-purple-200 transition-smooth">
                        Quiz on: {attempt.quizTopic}
                      </h4>
                      <p className="text-xs text-slate-400 transition-smooth">
                        Attempted:{" "}
                        {new Date(attempt.attemptedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold transition-smooth ${
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
                          (attempt.score / attempt.totalQuestionsInAttempt) *
                            100,
                        )}
                        %)
                      </p>
                      <p className="text-xs text-slate-500 group-hover:text-purple-300 transition-smooth">
                        View Summary &rarr;
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
