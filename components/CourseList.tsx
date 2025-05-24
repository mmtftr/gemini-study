import {
  ChevronRight,
  GraduationCap,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import React, { useState } from "react";
import type { Course } from "../types";

interface CourseListProps {
  courses: Course[];
  onCreateCourse: (name: string) => void;
  onSelectCourse: (course: Course) => void;
  onSetupNewQuiz: () => void;
  onEditCourseName: (courseId: number, newName: string) => Promise<void>;
  onDeleteCourse: (courseId: number) => void;
  onGenerateCourse: (topic: string) => Promise<void>;
  isLoading: boolean;
}

export const CourseList: React.FC<CourseListProps> = ({
  courses,
  onCreateCourse,
  onSelectCourse,
  onSetupNewQuiz,
  onGenerateCourse,
  isLoading,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [generateTopic, setGenerateTopic] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCourseName.trim()) {
      onCreateCourse(newCourseName.trim());
      setNewCourseName("");
      setShowCreateForm(false);
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (generateTopic.trim()) {
      onGenerateCourse(generateTopic.trim());
      setGenerateTopic("");
      setShowGenerateForm(false);
    }
  };

  const closeAllForms = () => {
    setShowCreateForm(false);
    setShowGenerateForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-sky-300">Your Courses</h2>
        <div className="flex gap-3">
          <button
            onClick={() => {
              closeAllForms();
              setShowGenerateForm(!showGenerateForm);
            }}
            className="flex items-center bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-medium py-2 px-4 rounded-lg shadow-md transition-smooth hover-lift"
            disabled={isLoading}
          >
            <Sparkles size={20} className="mr-2" />
            Generate Course
          </button>
          <button
            onClick={() => {
              closeAllForms();
              setShowCreateForm(!showCreateForm);
            }}
            className="flex items-center bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition-smooth hover-lift"
            disabled={isLoading}
          >
            <PlusCircle size={20} className="mr-2" />
            Manual Course
          </button>
        </div>
      </div>

      {showGenerateForm && (
        <div className={`form-reveal ${showGenerateForm ? "open" : ""}`}>
          <form
            onSubmit={handleGenerate}
            className="p-4 bg-gradient-to-r from-green-900/30 to-teal-900/30 border border-green-500/30 rounded-lg space-y-3"
          >
            <div className="flex items-center mb-2">
              <Sparkles className="w-5 h-5 text-green-400 mr-2" />
              <h3 className="text-lg font-semibold text-green-300">
                AI Course Generation
              </h3>
            </div>
            <p className="text-sm text-green-200/80 mb-3">
              Let AI create a comprehensive course with multiple documents using
              current web information
            </p>
            <div>
              <label
                htmlFor="generateTopic"
                className="block text-sm font-medium text-green-300 mb-1"
              >
                Course Topic
              </label>
              <input
                type="text"
                id="generateTopic"
                value={generateTopic}
                onChange={(e) => setGenerateTopic(e.target.value)}
                className="w-full p-3 bg-slate-700 border border-green-500/50 rounded-lg shadow-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none placeholder-slate-400 text-slate-100 transition-smooth"
                placeholder="e.g., Machine Learning Fundamentals, Modern History, Climate Change"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md transition-smooth"
                disabled={isLoading}
              >
                {isLoading ? "Generating..." : "Generate Course"}
              </button>
              <button
                type="button"
                onClick={() => setShowGenerateForm(false)}
                className="px-4 py-2.5 bg-slate-600 hover:bg-slate-500 text-white font-medium rounded-lg transition-smooth"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showCreateForm && (
        <div className={`form-reveal ${showCreateForm ? "open" : ""}`}>
          <form
            onSubmit={handleCreate}
            className="p-4 bg-slate-700/50 rounded-lg space-y-3"
          >
            <div>
              <label
                htmlFor="newCourseName"
                className="block text-sm font-medium text-sky-300 mb-1"
              >
                Course Name
              </label>
              <input
                type="text"
                id="newCourseName"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none placeholder-slate-400 text-slate-100 transition-smooth"
                placeholder="e.g., Introduction to History"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md transition-smooth"
                disabled={isLoading}
              >
                Create Empty Course
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2.5 bg-slate-600 hover:bg-slate-500 text-white font-medium rounded-lg transition-smooth"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {courses.length === 0 && !showCreateForm && !showGenerateForm && (
        <div className="text-center py-8 px-4 bg-slate-700/30 rounded-lg">
          <GraduationCap
            size={64}
            strokeWidth={1.5}
            className="mx-auto text-slate-500 mb-4"
          />
          <p className="text-slate-300 text-lg mb-2">No courses yet.</p>
          <p className="text-slate-400 mb-4">
            Get started by creating your first course or generating one with AI.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setShowGenerateForm(true)}
              className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-medium py-2.5 px-5 rounded-lg shadow-md transition-smooth hover-lift flex items-center justify-center"
              disabled={isLoading}
            >
              <Sparkles size={20} className="mr-2" />
              Generate Course with AI
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-5 rounded-lg shadow-md transition-smooth hover-lift"
              disabled={isLoading}
            >
              Create Empty Course
            </button>
          </div>
        </div>
      )}

      {courses.length > 0 && (
        <div>
          <ul className="space-y-3">
            {courses.map((course, index) => (
              <li key={course.id}>
                <button
                  onClick={() => onSelectCourse(course)}
                  className="w-full text-left p-4 bg-slate-700 hover:bg-slate-600/70 border border-slate-600 rounded-lg shadow-sm transition-smooth hover-lift focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 flex justify-between items-center group"
                  disabled={isLoading}
                >
                  <div>
                    <h3 className="text-lg font-medium text-purple-300 group-hover:text-purple-200 transition-smooth">
                      {course.name}
                    </h3>
                    <p className="text-xs text-slate-400 transition-smooth">
                      Created: {new Date(course.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight
                    size={20}
                    className="text-slate-500 group-hover:text-purple-300 transform transition-smooth group-hover:translate-x-1 group-focus:translate-x-1"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-8 pt-6 border-t border-slate-700 text-center">
        <p className="text-slate-400 mb-3">
          Or, jump straight into a quiz on any topic:
        </p>
        <button
          onClick={onSetupNewQuiz}
          className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-2.5 px-6 rounded-lg shadow-md transition-smooth hover-lift"
          disabled={isLoading}
        >
          Setup a New General Quiz
        </button>
      </div>
    </div>
  );
};
