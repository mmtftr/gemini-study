

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Course, CourseTextContent, QuizData, QuizAttempt, Question } from './types';
// Fix: Import StoreNames and IndexNames from idb
// Fix: Import IndexKey for more specific typing
import type { StoreNames, IndexNames, IndexKey } from 'idb';

const DB_NAME = 'GeminiQuizDB';
const DB_VERSION = 1; // Keep version same, no schema structure change, only adding methods

interface QuizMasterDB extends DBSchema {
  courses: {
    key: number;
    value: Course;
    indexes: { 'name': string, 'createdAt': Date };
  };
  courseTextContents: {
    key: number;
    value: CourseTextContent;
    indexes: { 'courseId': number, 'createdAt': Date };
  };
  quizzes: { // Stores the structure of generated quizzes
    key: number;
    value: QuizData & { id?: number }; // Ensure id is part of the value for storage
    indexes: { 'courseId': number, 'topic': string, 'createdAt': Date };
  };
  quizAttempts: { // Stores user's attempts and AI summaries
    key: number;
    value: QuizAttempt;
    indexes: { 'quizId': number, 'courseId': number, 'attemptedAt': Date };
  };
}

let dbPromise: Promise<IDBPDatabase<QuizMasterDB>>;

function getDb(): Promise<IDBPDatabase<QuizMasterDB>> {
  if (!dbPromise) {
    dbPromise = openDB<QuizMasterDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`Upgrading DB from version ${oldVersion} to ${newVersion}`);
        if (oldVersion < 1) {
          const courseStore = db.createObjectStore('courses', {
            keyPath: 'id',
            autoIncrement: true,
          });
          courseStore.createIndex('name', 'name', { unique: true });
          courseStore.createIndex('createdAt', 'createdAt');

          const contentStore = db.createObjectStore('courseTextContents', {
            keyPath: 'id',
            autoIncrement: true,
          });
          contentStore.createIndex('courseId', 'courseId');
          contentStore.createIndex('createdAt', 'createdAt');

          const quizStore = db.createObjectStore('quizzes', {
            keyPath: 'id',
            autoIncrement: true,
          });
          quizStore.createIndex('courseId', 'courseId');
          quizStore.createIndex('topic', 'topic');
          quizStore.createIndex('createdAt', 'createdAt');
          
          const attemptStore = db.createObjectStore('quizAttempts', {
            keyPath: 'id',
            autoIncrement: true,
          });
          attemptStore.createIndex('quizId', 'quizId');
          attemptStore.createIndex('courseId', 'courseId');
          attemptStore.createIndex('attemptedAt', 'attemptedAt');
        }
      },
    });
  }
  return dbPromise;
}

// Helper function to delete items by index
// Fix: Use StoreNames and IndexNames from idb for stronger typing with the library
// Fix: Use more specific IndexKey for the 'key' parameter
async function deleteFromIndex<
    CurrentStoreName extends StoreNames<QuizMasterDB>,
    IdxName extends IndexNames<QuizMasterDB, CurrentStoreName>
>(
    storeName: CurrentStoreName, 
    indexName: IdxName, 
    key: IDBKeyRange | IndexKey<QuizMasterDB, CurrentStoreName, IdxName>
): Promise<void> {
    const db = await getDb();
    // Fix: Ensure storeName is correctly typed for transaction
    const tx = db.transaction(storeName, 'readwrite');
    // Fix: Ensure storeName is correctly typed for objectStore
    const store = tx.objectStore(storeName);
    // Fix: indexName is already correctly typed due to IndexNames generic constraint
    const index = store.index(indexName);
    // Fix: Ensure key is compatible with openCursor. This should be fine as IDBValidKey | IDBKeyRange is accepted.
    // The IndexKey type ensures 'key' is compatible with the specific index.
    let cursor = await index.openCursor(key);
    while (cursor) {
        // store.delete is fine with primaryKey type
        await store.delete(cursor.primaryKey);
        cursor = await cursor.continue();
    }
    await tx.done;
}


// Courses
export async function addCourse(name: string): Promise<number> {
  const db = await getDb();
  return db.add('courses', { name, createdAt: new Date() });
}

export async function getAllCourses(): Promise<Course[]> {
  const db = await getDb();
  return db.getAllFromIndex('courses', 'createdAt');
}

export async function getCourseById(id: number): Promise<Course | undefined> {
  const db = await getDb();
  return db.get('courses', id);
}

export async function updateCourse(id: number, name: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('courses', 'readwrite');
  const store = tx.objectStore('courses');
  const course = await store.get(id);
  if (course) {
    await store.put({ ...course, name });
  }
  await tx.done;
}

export async function deleteCourse(id: number): Promise<void> {
  const db = await getDb();
  // Cascading deletes should be handled by calling service
  await db.delete('courses', id);
}

// Course Text Content
export async function addCourseTextContent(courseId: number, title: string, textContent: string): Promise<number> {
  const db = await getDb();
  return db.add('courseTextContents', { courseId, title, textContent, createdAt: new Date() });
}

export async function getCourseTextContents(courseId: number): Promise<CourseTextContent[]> {
  const db = await getDb();
  return db.getAllFromIndex('courseTextContents', 'courseId', courseId);
}

export async function getCourseTextContentById(id: number): Promise<CourseTextContent | undefined> {
    const db = await getDb();
    return db.get('courseTextContents', id);
}

export async function updateCourseTextContent(id: number, title: string, textContent: string): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('courseTextContents', 'readwrite');
    const store = tx.objectStore('courseTextContents');
    const content = await store.get(id);
    if (content) {
        await store.put({ ...content, title, textContent });
    }
    await tx.done;
}

export async function deleteCourseTextContent(id: number): Promise<void> {
    const db = await getDb();
    await db.delete('courseTextContents', id);
}

export async function deleteCourseTextContentsByCourseId(courseId: number): Promise<void> {
    await deleteFromIndex('courseTextContents', 'courseId', courseId);
}


// Quizzes (Structure)
export async function addQuizStructure(quizData: QuizData): Promise<number> {
  const db = await getDb();
  const dataToStore = { ...quizData, createdAt: quizData.createdAt || new Date() };
  return db.add('quizzes', dataToStore as QuizData & { id?: number});
}

export async function getQuizStructureById(id: number): Promise<(QuizData & { id: number }) | undefined> {
  const db = await getDb();
  return db.get('quizzes', id) as Promise<(QuizData & { id: number }) | undefined>;
}

export async function deleteQuizStructuresByCourseId(courseId: number): Promise<void> {
    if (courseId === 0 || courseId === undefined) { // Handle quizzes not tied to a specific course if necessary, or skip
        console.log("Skipping deletion of quiz structures not associated with a specific courseId or courseId is 0/undefined.");
        return;
    }
    await deleteFromIndex('quizzes', 'courseId', courseId);
}


// Quiz Attempts
export async function addQuizAttempt(attempt: Omit<QuizAttempt, 'id' | 'attemptedAt'>): Promise<number> {
  const db = await getDb();
  const attemptToStore: QuizAttempt = {
    ...attempt,
    attemptedAt: new Date(),
  } as QuizAttempt; 
  return db.add('quizAttempts', attemptToStore);
}

export async function getQuizAttemptsForCourse(courseId: number): Promise<QuizAttempt[]> {
  const db = await getDb();
  return db.getAllFromIndex('quizAttempts', 'courseId', courseId);
}

export async function getQuizAttemptById(id: number): Promise<QuizAttempt | undefined> {
    const db = await getDb();
    return db.get('quizAttempts', id);
}

export async function deleteQuizAttempt(id: number): Promise<void> {
    const db = await getDb();
    await db.delete('quizAttempts', id);
}

export async function deleteQuizAttemptsByCourseId(courseId: number): Promise<void> {
     if (courseId === 0 || courseId === undefined) { // Handle attempts not tied to a specific course or courseId is 0/undefined
        console.log("Skipping deletion of quiz attempts not associated with a specific courseId or courseId is 0/undefined.");
        return;
    }
    await deleteFromIndex('quizAttempts', 'courseId', courseId);
}

// Initialize DB on load
getDb().then(() => console.log("Database initialized successfully."))
         .catch(err => console.error("Failed to initialize database:", err));
