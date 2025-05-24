import { GoogleGenAI } from "@google/genai";
import type { GeminiModel, Question, UserAnswer } from "../types";

// Store for user-provided API key
let userApiKey: string | null = null;

export function setApiKey(apiKey: string) {
  userApiKey = apiKey;
}

export function getApiKey(): string | null {
  return userApiKey;
}

export function clearApiKey() {
  userApiKey = null;
}

function getAiInstance(): GoogleGenAI | null {
  if (!userApiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey: userApiKey });
}

// Course generation with Google search grounding
export async function generateCourseContent(
  topic: string,
  modelName: GeminiModel = GeminiModel.FLASH_2_0
): Promise<{
  courseTitle: string;
  documents: Array<{ title: string; content: string }>;
}> {
  const ai = getAiInstance();
  if (!ai) {
    throw new Error(
      "No API key provided. Please provide your Gemini API key to use this feature."
    );
  }

  const prompt = `You are an expert course designer. Create a comprehensive learning course about "${topic}".

IMPORTANT: Use current, accurate information from web search to ensure the content is up-to-date and factual.

Please provide:
1. A clear, engaging course title
2. 3-4 course documents/chapters covering different aspects of the topic

Format your response as JSON:
{
  "courseTitle": "Your Course Title Here",
  "documents": [
    {
      "title": "Document 1 Title",
      "content": "Comprehensive content for document 1 with current information, examples, and explanations"
    },
    {
      "title": "Document 2 Title",
      "content": "Comprehensive content for document 2 with current information, examples, and explanations"
    }
  ]
}

Make each document substantial (300-800 words) and educational. Include:
- Key concepts and definitions
- Real-world examples and applications
- Current trends or recent developments (use web search for this)
- Important facts and figures

Ensure the content is accurate, well-structured, and suitable for creating quiz questions.`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [prompt],
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response received from AI model");
    }

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not find valid JSON in AI response");
    }

    const parsedResponse = JSON.parse(jsonMatch[0]);

    if (
      !parsedResponse.courseTitle ||
      !parsedResponse.documents ||
      !Array.isArray(parsedResponse.documents)
    ) {
      throw new Error("Invalid response format from AI model");
    }

    return {
      courseTitle: parsedResponse.courseTitle,
      documents: parsedResponse.documents,
    };
  } catch (error) {
    console.error("Error generating course content:", error);
    let errorMessage = "Failed to generate course content.";
    if (error instanceof Error) {
      if (error.message.toLowerCase().includes("api key not valid")) {
        errorMessage = "API Key is not valid. Please check your configuration.";
      } else if (error.message.includes("JSON")) {
        errorMessage = "Failed to parse AI response. Please try again.";
      } else {
        errorMessage += ` ${error.message}`;
      }
    }
    throw new Error(errorMessage);
  }
}

const QUESTION_DELIMITER = "\n###END_OF_QUESTION_JSON###\n";

const constructStreamingPrompt = (
  topic: string,
  numQuestions: number,
  modelName: string,
  contextText?: string
): string => {
  const questionSchema = `{
  "question": "(string) The text of the question.",
  "answerOptions": [
    {"text": "(string) The text of an answer option. DO NOT number or prefix.", "rationale": "(string) CRITICAL. Why this option is plausible/misleading, or affirms the principle if correct. Do NOT state 'Correct' or 'Incorrect'.", "isCorrect": "(boolean) True if this option is correct, false otherwise. Only ONE true per question."}
  ],
  "hint": "(string) A short sentence guiding thought, not revealing the answer."
}`;

  let prompt = `You are a helpful AI assistant that generates quiz questions.
Your task is to generate ${numQuestions} quiz questions about the topic: "${topic}".
`;

  if (contextText) {
    prompt += `\nIMPORTANT: Base your questions PRIMARILY on the following provided content. If the content is too short or unsuitable for all ${numQuestions} questions, you may supplement with general knowledge about the topic, but prioritize the provided text.
Provided Content:
---
${contextText}
---
`;
  } else {
    prompt += `\nGenerate questions based on general knowledge about the topic "${topic}".\n`;
  }

  prompt += `
For EACH question, you MUST output a single, complete, valid JSON object that strictly adheres to the following schema:
${questionSchema}

After EACH JSON question object, you MUST output the exact delimiter string: ${JSON.stringify(
    QUESTION_DELIMITER
  ).slice(1, -1)}
(This means a newline, then ###END_OF_QUESTION_JSON###, then a newline).

DO NOT wrap all questions in a single parent JSON object or array.
DO NOT use any other introductory/concluding text outside of the JSON objects and their specified delimiters.

General instructions for question content:
- Ensure each question has 4 multiple-choice answer options unless the topic strongly dictates true/false (in which case, 2 options). Default to 4.
- Ensure only ONE answerOption has "isCorrect": true.
- Ensure all specified fields (question, answerOptions, hint, text, rationale, isCorrect) are present and correctly typed for every part of the quiz.
- Avoid "all of the above" or "none of the above" type options.
- Rationales are crucial: they should explain the underlying concept for correct answers or the misconception for incorrect ones, without explicitly stating "correct" or "incorrect".
- LaTeX Escaping: If using LaTeX, escape backslashes (e.g., \\frac becomes \\\\frac).

Example of ONE question's output, followed by the delimiter:
\`\`\`json
{
  "question": "What is the powerhouse of the cell?",
  "answerOptions": [
    {"text": "Nucleus", "rationale": "The nucleus contains genetic material and controls cell activities, but it's not the primary energy producer.", "isCorrect": false},
    {"text": "Mitochondrion", "rationale": "Mitochondria are responsible for generating most of the cell's supply of ATP through cellular respiration.", "isCorrect": true},
    {"text": "Ribosome", "rationale": "Ribosomes are involved in protein synthesis, not energy production.", "isCorrect": false},
    {"text": "Endoplasmic Reticulum", "rationale": "The endoplasmic reticulum is involved in protein and lipid synthesis and transport, not primary energy generation.", "isCorrect": false}
  ],
  "hint": "Think about where cellular respiration primarily occurs."
}
\`\`\`${QUESTION_DELIMITER}
Now, generate the quiz for the topic "${topic}" with ${numQuestions} questions using the model ${modelName}.
Remember to output each question as a separate JSON object followed by the delimiter ${JSON.stringify(
    QUESTION_DELIMITER
  ).slice(1, -1)}.
`;
  return prompt;
};

function validateQuestion(question: any, index: number): question is Question {
  if (!question || typeof question !== "object") {
    throw new Error(`Streamed question ${index + 1} data is not an object.`);
  }
  if (typeof question.question !== "string" || !question.question) {
    throw new Error(
      `Streamed question ${
        index + 1
      } is missing or has an invalid "question" field.`
    );
  }
  if (
    !Array.isArray(question.answerOptions) ||
    question.answerOptions.length < 2
  ) {
    throw new Error(
      `Streamed question ${index + 1} ("${question.question.substring(
        0,
        30
      )}...") has invalid or insufficient "answerOptions".`
    );
  }
  if (typeof question.hint !== "string") {
    // Allow empty hint, but it must be a string
    // throw new Error(`Streamed question ${index + 1} ("${question.question.substring(0,30)}...") has an invalid "hint" field.`);
  }

  let correctCount = 0;
  for (const opt of question.answerOptions) {
    if (typeof opt.text !== "string" || !opt.text)
      throw new Error(
        `Invalid answer option text for question ${
          index + 1
        } ("${question.question.substring(0, 30)}...").`
      );
    if (typeof opt.rationale !== "string" || !opt.rationale)
      throw new Error(
        `Invalid answer option rationale for question ${
          index + 1
        } ("${question.question.substring(0, 30)}...").`
      );
    if (typeof opt.isCorrect !== "boolean")
      throw new Error(
        `Invalid answer option isCorrect flag for question ${
          index + 1
        } ("${question.question.substring(0, 30)}...").`
      );
    if (opt.isCorrect) correctCount++;
  }
  if (correctCount !== 1) {
    throw new Error(
      `Streamed question ${index + 1} ("${question.question.substring(
        0,
        30
      )}...") must have exactly one correct answer, found ${correctCount}.`
    );
  }
  return true;
}

function extractJsonFromString(str: string): string {
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = str.match(fenceRegex);
  if (match && match[2]) {
    return match[2].trim();
  }
  return str.trim(); // Trim in case it's raw JSON with surrounding whitespace
}

export async function* generateQuizQuestions(
  topic: string,
  numQuestions: number,
  modelName: string,
  contextText?: string
): AsyncGenerator<Question, void, undefined> {
  const ai = getAiInstance();
  if (!ai) {
    throw new Error(
      "No API key provided. Please provide your Gemini API key to use this feature."
    );
  }

  const prompt = constructStreamingPrompt(
    topic,
    numQuestions,
    modelName,
    contextText
  );
  let buffer = "";
  let questionIndex = 0;

  try {
    const responseStream = await ai.models.generateContentStream({
      model: modelName,
      contents: prompt,
      config: {
        // temperature: 0.7, // Default is fine for structured output
      },
    });

    for await (const chunk of responseStream) {
      buffer += chunk.text;

      let delimiterIndex = buffer.indexOf(QUESTION_DELIMITER);
      while (delimiterIndex !== -1) {
        let jsonStringSegment = buffer.substring(0, delimiterIndex).trim();
        buffer = buffer.substring(delimiterIndex + QUESTION_DELIMITER.length);

        if (jsonStringSegment) {
          try {
            // Delimiter is handled by the splitting, jsonStringSegment should be clean of it.
            const cleanedJsonString = extractJsonFromString(jsonStringSegment);
            const parsedQuestion = JSON.parse(cleanedJsonString);
            if (validateQuestion(parsedQuestion, questionIndex)) {
              yield parsedQuestion as Question;
              questionIndex++;
              if (questionIndex >= numQuestions) {
                return;
              }
            }
          } catch (e) {
            console.error(
              "Failed to parse or validate streamed question JSON (from loop):",
              `"${jsonStringSegment}"`,
              e
            );
            // Optionally, continue to the next question or re-throw if critical
          }
        }
        delimiterIndex = buffer.indexOf(QUESTION_DELIMITER);
      }
    }

    // After the loop, process any remaining content in the buffer
    let finalChunk = buffer.trim();
    if (finalChunk) {
      let jsonStringSegment = finalChunk; // Initially, the whole remaining chunk

      // Remove any trailing delimiter from jsonStringSegment
      // This ensures that extractJsonFromString gets a clean potential JSON string (fenced or not)
      const coreDelimiter = "###END_OF_QUESTION_JSON###";
      const fullDelimiterWithNewlines = QUESTION_DELIMITER; // "\n###END_OF_QUESTION_JSON###\n"

      if (jsonStringSegment.endsWith(fullDelimiterWithNewlines)) {
        jsonStringSegment = jsonStringSegment
          .substring(
            0,
            jsonStringSegment.length - fullDelimiterWithNewlines.length
          )
          .trim();
      } else if (jsonStringSegment.endsWith("\n" + coreDelimiter)) {
        // Common case if it's the very end of stream
        jsonStringSegment = jsonStringSegment
          .substring(
            0,
            jsonStringSegment.length - ("\n" + coreDelimiter).length
          )
          .trim();
      } else if (jsonStringSegment.endsWith(coreDelimiter)) {
        // If no newline before it (e.g. if QUESTION_DELIMITER was just coreDelimiter)
        jsonStringSegment = jsonStringSegment
          .substring(0, jsonStringSegment.length - coreDelimiter.length)
          .trim();
      }
      // If coreDelimiter was `###END_OF_QUESTION_JSON###\n`, it would be caught by trim() mostly,
      // but explicitly checking helps if trim isn't perfect or if there are other non-whitespace chars.

      // Now jsonStringSegment should be free of any TRAILING delimiter.
      // It might be "```json { ... } ```" or just "{ ... }" or empty if only delimiter was left.

      if (jsonStringSegment) {
        let cleanedJsonString = "";
        try {
          cleanedJsonString = extractJsonFromString(jsonStringSegment);
          const parsedQuestion = JSON.parse(cleanedJsonString);
          if (validateQuestion(parsedQuestion, questionIndex)) {
            yield parsedQuestion as Question;
            questionIndex++;
          }
        } catch (e) {
          console.error(
            "Failed to parse remaining buffer content (final attempt)."
          );
          console.error(
            "Original final chunk (from buffer, trimmed):",
            `"${finalChunk}"`
          );
          console.error(
            "Segment after attempting to remove TRAILING delimiter (this was given to extractJsonFromString):",
            `"${jsonStringSegment}"`
          );
          console.error(
            "Content after extractJsonFromString (this was passed to JSON.parse):",
            `"${cleanedJsonString}"`
          );
          console.error("Error object:", e);
        }
      }
    }

    if (questionIndex < numQuestions) {
      console.warn(
        `Requested ${numQuestions} questions, but only ${questionIndex} were successfully generated and streamed.`
      );
      // It's okay if fewer questions are generated, the app should handle it.
    }
  } catch (error) {
    console.error("Error during Gemini API stream for quiz generation:", error);
    let errorMessage = `Failed to stream quiz questions.`;
    if (error instanceof Error) {
      if (error.message.toLowerCase().includes("api key not valid")) {
        errorMessage = "API Key is not valid. Please check your configuration.";
      } else if (
        error.message.includes(
          " responsabile per la generazione della risposta."
        )
      ) {
        // A common Italian safety message part
        errorMessage =
          "The model could not generate a response, possibly due to safety filters or an issue with the prompt/content. Please try a different topic or adjust content.";
      } else if (error.message.includes("Candidate was blocked due to")) {
        // Another safety block message
        errorMessage =
          "The model's response was blocked, likely due to safety filters. Please try modifying the topic or content.";
      } else {
        errorMessage += ` ${error.message}`;
      }
    } else {
      errorMessage += ` ${String(error)}`;
    }
    throw new Error(errorMessage);
  }
}

export async function summarizeQuizPerformance(
  quizQuestions: Question[], // Full list of questions in the quiz structure
  userAnswers: UserAnswer[], // User's answers for the questions they attempted
  score: number,
  totalQuestionsAttempted: number, // Number of questions the user actually saw and answered
  modelName: GeminiModel,
  previousAnalyses?: string[] // Previous performance analyses for this course
): Promise<string> {
  const ai = getAiInstance();
  if (!ai) {
    throw new Error(
      "No API key provided. Please provide your Gemini API key to use this feature."
    );
  }

  let prompt = `You are an AI tutor. A user has just completed a quiz. Your task is to provide a constructive, analytical summary of their performance.

Quiz Performance:
- Score: ${score} out of ${totalQuestionsAttempted} (${Math.round(
    (score / totalQuestionsAttempted) * 100
  )}%)`;

  if (previousAnalyses && previousAnalyses.length > 0) {
    prompt += `

Previous Performance Analyses:
${previousAnalyses
  .map(
    (analysis, index) => `
Analysis ${index + 1}:
${analysis}
---`
  )
  .join("\n")}

Consider these previous analyses to identify patterns of improvement or recurring issues.`;
  }

  prompt += `

User's Answers and Question Details:
${userAnswers
  .map((ua, index) => {
    // Find the full question object for the current user answer
    const questionObj = quizQuestions.find(
      (q) => q.question === ua.questionText
    );
    const correctAnswerObj = questionObj?.answerOptions.find(
      (opt) => opt.isCorrect
    );
    // The 'rationale' in UserAnswer IS the rationale for the option the user selected.
    const selectedOptionRationale = ua.rationale;

    return `
Question ${index + 1}: ${ua.questionText}
  - User's Answer: "${ua.selectedAnswerText}" (${
      ua.isCorrect ? "Correct" : "Incorrect"
    })
  - Rationale for the option user selected: ${selectedOptionRationale || "N/A"}
  ${
    !ua.isCorrect && correctAnswerObj
      ? `  - Correct Answer was: "${
          correctAnswerObj.text
        }" (Rationale for correct answer: ${
          correctAnswerObj.rationale || "N/A"
        })`
      : ""
  }
`;
  })
  .join("\n")}

Instructions for Your Summary:
1. Start with a brief encouraging comment about their effort and performance.
2. Analyze their performance concisely with bullet points under clear headings ("Strengths:" and "Areas for Improvement:").
   - For strengths, highlight concepts they understood well.
   - For areas of improvement, focus on patterns in incorrect answers and specific concepts to review.
3. Suggest 2-3 key topics for further study based on their mistakes.
4. Keep the summary concise (2-3 paragraphs maximum) and actionable.${
    previousAnalyses && previousAnalyses.length > 0
      ? `
5. Compare their current performance to previous attempts and note any improvements or new challenges.`
      : ""
  }
6. Use Markdown format for readability.

Your summary:
`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        temperature: 0.5,
      },
    });
    return response.text || "Unable to generate performance summary.";
  } catch (error) {
    console.error(
      "Error during Gemini API call for performance summary:",
      error
    );
    let errorMessage = `Failed to generate performance summary.`;
    if (error instanceof Error) {
      errorMessage += ` ${error.message}`;
    } else {
      errorMessage += ` ${String(error)}`;
    }
    throw new Error(errorMessage);
  }
}
