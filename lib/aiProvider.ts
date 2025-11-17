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
  // Comprehensive logging
  console.log(`[aiProvider] ========== AI Request Start ==========`);
  console.log(`[aiProvider] Prompt length: ${prompt.length} characters`);
  console.log(`[aiProvider] Primary provider: ${AI_PROVIDER}`);
  console.log(`[aiProvider] Model: ${AI_PROVIDER === 'openai' ? OPENAI_MODEL : GEMINI_MODEL}`);
  console.log(`[aiProvider] Timeout: ${AI_PROVIDER === 'openai' ? OPENAI_TIMEOUT : GEMINI_TIMEOUT}ms`);
  console.log(`[aiProvider] OpenAI key available: ${process.env.OPENAI_API_KEY ? 'YES' : 'NO'}`);
  console.log(`[aiProvider] Gemini key available: ${process.env.GOOGLE_GEMINI_API_KEY ? 'YES' : 'NO'}`);

  try {
    if (AI_PROVIDER === 'gemini') {
      const result = await callGemini(prompt);
      console.log(`[aiProvider] ========== AI Request Success (Gemini) ==========`);
      return result;
    } else {
      const result = await callOpenAI(prompt);
      console.log(`[aiProvider] ========== AI Request Success (OpenAI) ==========`);
      return result;
    }
  } catch (error) {
    console.error(`[aiProvider] ========== AI Request Failed ==========`);
    console.error(`[aiProvider] Primary provider (${AI_PROVIDER}) failed:`, error);
    
    // Auto-fallback: If Gemini fails and OpenAI key exists, try OpenAI
    if (AI_PROVIDER === 'gemini' && process.env.OPENAI_API_KEY) {
      console.log('[aiProvider] ========== Attempting Automatic Fallback to OpenAI ==========');
      console.log(`[aiProvider] Fallback model: ${OPENAI_MODEL}`);
      console.log(`[aiProvider] Fallback timeout: ${OPENAI_TIMEOUT}ms`);
      
      try {
        const result = await callOpenAI(prompt);
        console.log('[aiProvider] ========== Fallback Success (OpenAI) ==========');
        return result;
      } catch (fallbackError) {
        console.error('[aiProvider] ========== Fallback Failed ==========');
        console.error('[aiProvider] OpenAI fallback also failed:', fallbackError);
        console.error('[aiProvider] Throwing original Gemini error');
        throw error; // Throw original Gemini error
      }
    }
    
    throw error;
  }
}

async function callOpenAI(prompt: string): Promise<AIResponse> {
  try {
    console.log(`[aiProvider] OpenAI: Starting request`);
    console.log(`[aiProvider] OpenAI: Model=${OPENAI_MODEL}, Timeout=${OPENAI_TIMEOUT}ms`);
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        const timeoutError = new Error(`OpenAI request timeout after ${OPENAI_TIMEOUT}ms`);
        timeoutError.name = 'TimeoutError';
        reject(timeoutError);
      }, OPENAI_TIMEOUT);
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
      const emptyError = new Error(`No response from OpenAI (model: ${OPENAI_MODEL}, timeout: ${OPENAI_TIMEOUT}ms)`);
      emptyError.name = 'EmptyResponseError';
      throw emptyError;
    }

    console.log(`[aiProvider] OpenAI: Request completed successfully`);
    console.log(`[aiProvider] OpenAI: Response length=${content.length} characters`);
    return { content };
  } catch (error) {
    console.error('[aiProvider] OpenAI: Error occurred');
    console.error(`[aiProvider] OpenAI: Error type: ${error instanceof Error ? error.name : 'Unknown'}`);
    console.error(`[aiProvider] OpenAI: Error message:`, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function callGemini(prompt: string): Promise<AIResponse> {
  let partialContent = '';
  let chunkCount = 0;
  
  try {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not set');
    }

    console.log(`[aiProvider] Gemini: Starting streaming request`);
    console.log(`[aiProvider] Gemini: Model=${GEMINI_MODEL}, Timeout=${GEMINI_TIMEOUT}ms`);

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        const timeoutError = new Error(`Gemini request timeout after ${GEMINI_TIMEOUT}ms (received ${chunkCount} chunks, ${partialContent.length} chars so far)`);
        timeoutError.name = 'TimeoutError';
        reject(timeoutError);
      }, GEMINI_TIMEOUT);
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
    console.log(`[aiProvider] Gemini: Stream started, collecting chunks...`);
    for await (const chunk of streamResult.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        partialContent += chunkText;
        chunkCount++;
        if (chunkCount % 5 === 0) {
          console.log(`[aiProvider] Gemini: Received ${chunkCount} chunks, ${partialContent.length} chars so far`);
        }
      }
    }

    if (!partialContent) {
      const emptyError = new Error(`No response text from Gemini streaming (model: ${GEMINI_MODEL}, timeout: ${GEMINI_TIMEOUT}ms)`);
      emptyError.name = 'EmptyResponseError';
      throw emptyError;
    }

    console.log(`[aiProvider] Gemini: Streaming completed successfully`);
    console.log(`[aiProvider] Gemini: Total chunks=${chunkCount}, Total characters=${partialContent.length}`);
    return { content: partialContent };
  } catch (error) {
    console.error('[aiProvider] Gemini: Error occurred');
    console.error(`[aiProvider] Gemini: Error type: ${error instanceof Error ? error.name : 'Unknown'}`);
    console.error(`[aiProvider] Gemini: Error message:`, error instanceof Error ? error.message : error);
    console.error(`[aiProvider] Gemini: Partial content received: ${partialContent.length} characters in ${chunkCount} chunks`);
    
    if (partialContent.length > 0) {
      console.error(`[aiProvider] Gemini: First 200 chars of partial content: ${partialContent.substring(0, 200)}`);
    }
    
    throw error;
  }
}

export { openai, genAI };

