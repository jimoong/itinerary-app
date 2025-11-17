import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

type AIProvider = 'openai' | 'gemini';

const AI_PROVIDER: AIProvider = (process.env.AI_PROVIDER as AIProvider) || 'openai'; // Note: If using Gemini, make sure your API key has the required permissions
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-pro';

// Timeout settings (in milliseconds)
const OPENAI_TIMEOUT = parseInt(process.env.OPENAI_TIMEOUT || '30000'); // 30 seconds
const GEMINI_TIMEOUT = parseInt(process.env.GEMINI_TIMEOUT || '30000'); // 30 seconds

console.log(`[aiProvider] Using AI provider: ${AI_PROVIDER}`);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

console.log('[aiProvider] OpenAI API key:', process.env.OPENAI_API_KEY ? 'YES (present)' : 'NO (missing)');
console.log('[aiProvider] Gemini API key:', process.env.GOOGLE_GEMINI_API_KEY ? 'YES (present)' : 'NO (missing)');

export interface AIResponse {
  content: string;
}

export async function callAI(prompt: string): Promise<AIResponse> {
  console.log(`[aiProvider] Calling ${AI_PROVIDER} with model: ${AI_PROVIDER === 'openai' ? OPENAI_MODEL : GEMINI_MODEL}`);

  if (AI_PROVIDER === 'gemini') {
    return callGemini(prompt);
  } else {
    return callOpenAI(prompt);
  }
}

async function callOpenAI(prompt: string): Promise<AIResponse> {
  try {
    console.log(`[aiProvider] OpenAI request with ${OPENAI_TIMEOUT}ms timeout`);
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`OpenAI request timeout after ${OPENAI_TIMEOUT}ms`)), OPENAI_TIMEOUT);
    });

    const completion = await Promise.race([
      openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a travel planning assistant. Always respond with valid JSON only, no additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
      timeoutPromise
    ]);

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return { content };
  } catch (error) {
    console.error('[aiProvider] OpenAI error:', error);
    throw error;
  }
}

async function callGemini(prompt: string): Promise<AIResponse> {
  try {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not set');
    }

    console.log(`[aiProvider] Gemini streaming request with ${GEMINI_TIMEOUT}ms timeout`);

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Gemini request timeout after ${GEMINI_TIMEOUT}ms`)), GEMINI_TIMEOUT);
    });

    const streamResult = await Promise.race([
      model.generateContentStream({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are a travel planning assistant. Always respond with valid JSON only, no additional text.\n\n${prompt}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        }
      }),
      timeoutPromise
    ]);

    // Collect the streamed content
    let content = '';
    for await (const chunk of streamResult.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        content += chunkText;
      }
    }

    if (!content) {
      throw new Error('No response text from Gemini streaming');
    }

    console.log(`[aiProvider] Gemini streaming completed, received ${content.length} characters`);
    return { content };
  } catch (error) {
    console.error('[aiProvider] Gemini error:', error);
    throw error;
  }
}

export { openai, genAI };

