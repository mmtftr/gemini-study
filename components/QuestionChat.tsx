
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { marked } from 'marked';
import type { Question } from '../types';
import { ErrorMessage } from './ErrorMessage';
import { GeminiModel } from '../types';


interface QuestionChatProps {
  question: Question;
  onBackToQuiz: () => void;
  modelName: GeminiModel;
  userSelectedAnswerText?: string; // User's chosen answer
  isUserAnswerCorrect?: boolean;   // Was the user's answer correct?
  correctAnswerText?: string;      // The text of the actual correct answer (if user was wrong)
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  id: string; // For unique key prop
}

const API_KEY = process.env.API_KEY;

marked.setOptions({
  gfm: true, 
  breaks: true, 
});

export const QuestionChat: React.FC<QuestionChatProps> = ({ 
    question, 
    onBackToQuiz, 
    modelName,
    userSelectedAnswerText,
    isUserAnswerCorrect,
    correctAnswerText 
}) => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const createSystemInstruction = () => {
    let instruction = `You are a helpful AI tutor. The user is working on a specific quiz question.
The question is: "${question.question}"
The available answer options are:
${question.answerOptions.map(opt => `- ${opt.text} (Rationale for this option hints: ${opt.rationale})`).join('\n')}
`;

    if (userSelectedAnswerText !== undefined && isUserAnswerCorrect !== undefined) {
        instruction += `\nThe user has ALREADY ANSWERED this question.
- Their selected answer was: "${userSelectedAnswerText}"
- This answer was ${isUserAnswerCorrect ? 'CORRECT.' : 'INCORRECT.'}
${!isUserAnswerCorrect && correctAnswerText ? `- The actual correct answer was: "${correctAnswerText}" (Rationale for correct answer: ${question.answerOptions.find(opt => opt.text === correctAnswerText)?.rationale || 'N/A'})` : ''}

Your role is now to:
1. If the user was correct, help them solidify their understanding. Discuss why their choice was right and perhaps why other options were tempting but wrong.
2. If the user was incorrect, help them understand their mistake. Explain the concept related to the correct answer and why their chosen option was not the best fit, considering its rationale and the correct answer's rationale.
3. Encourage them to explore the topic further.
4. DO NOT simply state "You were right/wrong." Engage in a discussion.
5. DO NOT reveal the correct answer if they were wrong and ask for it directly without trying to understand first. Guide them.
`;
    } else {
        instruction += `\nYour role is to:
1. Help the user understand the underlying concepts related to the question BEFORE they answer.
2. Explain why certain options might be plausible or tricky, based on their provided rationales if relevant, but don't just repeat them.
3. Guide them towards the correct thinking process.
4. DO NOT, under any circumstances, reveal the correct answer directly (e.g., "Option B is correct").
5. DO NOT state whether a specific option is correct or incorrect.
6. If the user asks directly for the answer, or asks if an option is correct, politely decline and redirect them to think about the concepts or ask for their own thoughts first. For example, say "I can't tell you the answer directly, but what are your thoughts on...?"
`;
    }
    instruction += `
7. Encourage the user to think critically. Ask them probing questions.
8. Keep your explanations concise and easy to understand. Use Markdown for formatting if it helps clarity (e.g., lists, bolding).
`;
    return instruction;
  }


  useEffect(() => {
    if (!API_KEY) {
      setError("API Key is not configured. Chat feature is unavailable.");
      console.error("API_KEY for Gemini is not configured for chat.");
      return;
    }
    setError(null);
    setIsLoading(true); 

    const systemInstruction = createSystemInstruction();

    try {
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      const newChat = ai.chats.create({
        model: modelName,
        config: {
          systemInstruction: systemInstruction,
        },
      });
      setChat(newChat);
      
      let initialModelMessage = `Hello! I'm here to help you with the question: "${question.question.substring(0,50)}...". `;
      if (userSelectedAnswerText !== undefined) {
        initialModelMessage += `You answered "${userSelectedAnswerText}", which was ${isUserAnswerCorrect ? 'correct' : 'incorrect'}. How can I help you understand this question better?`;
      } else {
        initialModelMessage += `What are your initial thoughts or where are you stuck?`;
      }
      setChatHistory([{role: 'model', text: initialModelMessage, id: Date.now().toString()}]);

    } catch (e) {
        console.error("Failed to initialize chat:", e);
        setError(e instanceof Error ? e.message : "Failed to initialize chat service.");
    } finally {
        setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, modelName, userSelectedAnswerText, isUserAnswerCorrect, correctAnswerText]); // System instruction depends on these


  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!userInput.trim() || !chat || isLoading) return;

    const messageToSend = userInput.trim();
    const userMessageId = `user-${Date.now()}`;
    setChatHistory(prev => [...prev, { role: 'user', text: messageToSend, id: userMessageId }]);
    setUserInput('');
    setIsLoading(true);
    setError(null);

    const modelMessageId = `model-${Date.now()}`;
    setChatHistory(prev => [...prev, { role: 'model', text: 'Thinking...', id: modelMessageId }]);
    
    try {
      const responseStream = await chat.sendMessageStream({ message: messageToSend });
      let modelResponseText = "";
      
      for await (const chunk of responseStream) {
        modelResponseText += chunk.text;
        setChatHistory(prev => prev.map(msg => 
            msg.id === modelMessageId ? { ...msg, text: modelResponseText } : msg
        ));
      }
       setChatHistory(prev => prev.map(msg => 
        msg.id === modelMessageId ? { ...msg, text: modelResponseText || "Sorry, I couldn't generate a response for that." } : msg
      ));

    } catch (err) {
      console.error("Error sending message to Gemini:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to get response: ${errorMessage}`);
      setChatHistory(prev => prev.map(msg => 
        msg.id === modelMessageId ? { ...msg, text: `Sorry, I encountered an error: ${errorMessage}` } : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  if (!API_KEY && !error) { 
      return <ErrorMessage message="API Key is not configured. Chat feature is unavailable."/>
  }

  return (
    <div className="flex flex-col h-[70vh] max-h-[600px] bg-slate-800 rounded-lg shadow-xl animate-fadeInUp">
      <header className="p-4 border-b border-slate-700 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-sky-300 truncate" title={question.question}>
          Discuss: {question.question.length > 40 ? question.question.substring(0,37) + "..." : question.question}
        </h3>
        <button
          onClick={onBackToQuiz}
          className="bg-slate-600 hover:bg-slate-500 text-slate-100 font-medium py-1.5 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-slate-500 transition duration-150 text-sm"
        >
          Back to Quiz
        </button>
      </header>

      {error && <div className="p-3"><ErrorMessage message={error} /></div>}

      <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto scroll-smooth">
        {chatHistory.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] p-3 rounded-xl shadow prose prose-sm prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5
                ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-none prose-strong:text-white' 
                                      : 'bg-slate-700 text-slate-200 rounded-bl-none prose-strong:text-slate-100'}
                ${msg.text === 'Thinking...' ? 'italic text-slate-400' : ''}
              `}
              dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) as string }}
            />
          </div>
        ))}
         {isLoading && chatHistory.length > 0 && chatHistory[chatHistory.length-1].role === 'user' && !error && (
           <div className="flex justify-start">
             <div className="max-w-[70%] p-3 rounded-xl shadow bg-slate-700 text-slate-400 italic rounded-bl-none">
                Typing...
             </div>
           </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700 flex items-center gap-3">
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder={isLoading ? "Waiting for response..." : "Ask about the question..."}
          className="flex-grow p-3 bg-slate-700 border border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none placeholder-slate-400 text-slate-100 resize-none"
          rows={2}
          disabled={isLoading || !chat || !!error}
          aria-label="Your message"
        />
        <button
          type="submit"
          disabled={isLoading || !userInput.trim() || !chat || !!error}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-5 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-pink-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
};
