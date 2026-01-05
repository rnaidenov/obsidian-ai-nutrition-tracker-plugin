import { requestUrl } from 'obsidian';

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  messages: OpenRouterMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function sendOpenRouterRequest(
  config: OpenRouterConfig,
  requestFn: typeof requestUrl = requestUrl
): Promise<OpenRouterResponse> {
  const response = await requestFn({
    url: 'https://openrouter.ai/api/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://obsidian.md',
      'X-Title': 'Nutrition Tracker Plugin'
    },
    body: JSON.stringify({
      model: config.model,
      messages: config.messages,
      response_format: { type: 'json_object' },
      max_tokens: config.maxTokens || 1000,
      temperature: config.temperature !== undefined ? config.temperature : 0.3
    })
  });

  if (response.status !== 200) {
    throw new Error(`OpenRouter API error: ${response.status} - ${response.text}`);
  }

  const data = response.json;

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid response format from OpenRouter API');
  }

  return data as OpenRouterResponse;
}
