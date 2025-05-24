
import React, { useState } from 'react';
import { PlusCircle, ChevronRight, GraduationCap } from 'lucide-react';
import type { Course } from '../types';

interface CourseListProps {
  courses: Course[];
  onCreateCourse: (name: string) => void;
  onSelectCourse: (course: Course) => void;
  onSetupNewQuiz: () => void; 
  onEditCourseName: (courseId: number, newName: string) => Promise<void>;
  onDeleteCourse: (courseId: number) => void;
  isLoading: boolean; 
}

export const CourseList: React.FC<CourseListProps> = ({ 
    courses, 
    onCreateCourse, 
    onSelectCourse, 
    onSetupNewQuiz,
    isLoading 
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCourseName.trim()) {
      onCreateCourse(newCourseName.trim());
      setNewCourseName('');
      setShowCreateForm(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-sky-300">Your Courses</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105"
          disabled={isLoading}
        >
          <PlusCircle size={20} className="mr-2" />
          {showCreateForm ? 'Cancel' : 'New Course'}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreate} className="p-4 bg-slate-700/50 rounded-lg space-y-3 animate-fadeInDown">
          <div>
            <label htmlFor="newCourseName" className="block text-sm font-medium text-sky-300 mb-1">
              Course Name
            </label>
            <input
              type="text"
              id="newCourseName"
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none placeholder-slate-400 text-slate-100"
              placeholder="e.g., Introduction to History"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md transition duration-150"
            disabled={isLoading}
          >
            Create Course
          </button>
        </form>
      )}

      {courses.length === 0 && !showCreateForm && (
        <div className="text-center py-8 px-4 bg-slate-700/30 rounded-lg">
          <GraduationCap size={64} strokeWidth={1.5} className="mx-auto text-slate-500 mb-4" />
          <p className="text-slate-300 text-lg mb-2">No courses yet.</p>
          <p className="text-slate-400 mb-4">Get started by creating your first course to organize your learning material.</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-5 rounded-lg shadow-md transition duration-150"
            disabled={isLoading}
          >
            Create Your First Course
          </button>
        </div>
      )}

      {courses.length > 0 && (
        <ul className="space-y-3">
          {courses.map(course => (
            <li key={course.id}>
              <button
                onClick={() => onSelectCourse(course)}
                className="w-full text-left p-4 bg-slate-700 hover:bg-slate-600/70 border border-slate-600 rounded-lg shadow-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 flex justify-between items-center group"
                disabled={isLoading}
              >
                <div>
                  <h3 className="text-lg font-medium text-purple-300 group-hover:text-purple-200">{course.name}</h3>
                  <p className="text-xs text-slate-400">Created: {new Date(course.createdAt).toLocaleDateString()}</p>
                </div>
                <ChevronRight size={20} className="text-slate-500 group-hover:text-purple-300 transform transition-transform group-focus:translate-x-1" />
              </button>
            </li>
          ))}
        </ul>
      )}
       <div className="mt-8 pt-6 border-t border-slate-700 text-center">
          <p className="text-slate-400 mb-3">Or, jump straight into a quiz on any topic:</p>
          <button
            onClick={onSetupNewQuiz}
            className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-2.5 px-6 rounded-lg shadow-md transition duration-150"
            disabled={isLoading}
          >
            Setup a New General Quiz
          </button>
        </div>
    </div>
  );
};