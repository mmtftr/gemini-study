export interface AnswerOption {
  text: string;
  rationale: string;
  isCorrect: boolean;
}

export interface Question {
  question: string;
  answerOptions: AnswerOption[];
  hint: string;
}

export interface QuizData {
  // Represents the structure of a generated quiz
  id?: number; // Optional: ID if stored in DB
  courseId?: number; // Optional: if linked to a course
  topic: string;
  modelUsed: string;
  numQuestionsRequested?: number; // Original request
  questions: Question[];
  createdAt?: Date;
}

export enum GameState {
  SETUP = "SETUP",
  LOADING = "LOADING",
  GENERATING_QUIZ = "GENERATING_QUIZ",
  PLAYING = "PLAYING",
  SHOW_ANSWER = "SHOW_ANSWER",
  RESULTS = "RESULTS",
  SUMMARIZING_RESULTS = "SUMMARIZING_RESULTS", // New state for AI summary generation
  CHATTING_QUESTION = "CHATTING_QUESTION",
  COURSE_LIST = "COURSE_LIST", // New state for showing courses
  COURSE_DETAIL = "COURSE_DETAIL", // New state for course details and content management
  QUIZ_HISTORY_DETAIL = "QUIZ_HISTORY_DETAIL", // New state for showing specific quiz attempt summary
}

export enum GeminiModel {
  FLASH = "gemini-2.5-flash-preview-04-17",
  PRO = "gemini-2.5-pro-preview-05-06",
  FLASH_2_0 = "gemini-2.0-flash",
}

// Database specific types
export interface Course {
  id?: number;
  name: string;
  createdAt: Date;
}

export interface CourseTextContent {
  id?: number;
  courseId: number;
  title: string; // e.g., "Chapter 1 Notes" or "Uploaded Content 1"
  textContent: string;
  createdAt: Date;
}

export interface UserAnswer {
  questionText: string;
  selectedAnswerText: string;
  correctAnswerText: string;
  isCorrect: boolean;
  rationale: string; // Rationale of the selected answer
}

export interface QuizAttempt {
  id?: number;
  quizId: number; // Links to the QuizData.id of the generated quiz structure
  courseId: number; // Denormalized for easier querying by course
  score: number;
  totalQuestionsInAttempt: number;
  userAnswers: UserAnswer[];
  aiSummary?: string; // AI-generated summary of performance
  attemptedAt: Date;
  modelUsed: string; // Model used for the quiz itself
  quizTopic: string; // Topic of the quiz
}

// For grounding metadata if used (not primary for this app but good to have)
export interface GroundingChunkWeb {
  uri: string;
  title: string;
}
export interface GroundingChunk {
  web?: GroundingChunkWeb;
}
export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
}
