import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

type AIProvider = 'openai' | 'gemini';

const AI_PROVIDER: AIProvider = (process.env.AI_PROVIDER as AIProvider) || 'openai';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

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
    const completion = await openai.chat.completions.create({
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
    });

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
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    
    const result = await model.generateContent({
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
    });

    const content = result.response.text();
    if (!content) {
      throw new Error('No response from Gemini');
    }

    return { content };
  } catch (error) {
    console.error('[aiProvider] Gemini error:', error);
    throw error;
  }
}

export { openai, genAI };

