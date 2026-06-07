import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function queryLLM(messages, temperature = 0.1) {
  if (!API_KEY) {
    throw new Error('Missing OpenRouter API Key in environment variables.');
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': 'https://github.com/Sebaxis/inkfinance',
        'X-Title': 'InkFinance'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        temperature: temperature
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error in queryLLM:', error);
    throw error;
  }
}

// Clean JSON response from AI (strip ```json and ``` if they exist)
export function parseCleanJson(text) {
  let cleanText = text;
  // Check for markdown blocks
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(json)?\n/, '').replace(/\n```$/, '');
  }
  cleanText = cleanText.trim();
  return JSON.parse(cleanText);
}
