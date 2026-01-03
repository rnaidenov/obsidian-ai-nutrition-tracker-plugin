import { FoodItem } from '../../types/nutrition';
import * as PromptBuilder from './prompt-builder';
import * as ResponseParser from './response-parser';
import * as ImageUtils from './image-utils';
import * as OpenRouterClient from './openrouter-client';

export interface LLMDeps {
  apiKey: string;
  model: string;
  useCustomModel: boolean;
  customModelName: string;
}

export async function processFood(
  deps: LLMDeps,
  description: string,
  images?: File[]
): Promise<FoodItem[]> {
  // 1. Validation
  if (!deps.apiKey) {
    throw new Error('OpenRouter API key not configured. Please set it in plugin settings.');
  }

  if (deps.useCustomModel && !deps.customModelName.trim()) {
    throw new Error('Custom model is enabled but no model name is specified. Please set a custom model name in plugin settings.');
  }

  try {
    // 2. Build prompt (pure)
    const prompt = PromptBuilder.buildNutritionPrompt(description);
    const model = PromptBuilder.getEffectiveModel(
      deps.useCustomModel,
      deps.customModelName,
      deps.model
    );

    // 3. Process images (I/O)
    const imageUrls = images && images.length > 0
      ? await ImageUtils.imagesToBase64DataUrls(images)
      : undefined;

    // 4. Build messages (pure)
    const systemMessage = PromptBuilder.buildSystemMessage();
    const userContent = PromptBuilder.buildUserMessageContent(prompt, imageUrls);

    const messages: OpenRouterClient.OpenRouterMessage[] = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userContent }
    ];

    // 5. API call (I/O)
    const response = await OpenRouterClient.sendOpenRouterRequest({
      apiKey: deps.apiKey,
      model,
      messages,
      maxTokens: 1000,
      temperature: 0.3
    });

    // 6. Parse response (pure)
    const content = response.choices[0].message.content;
    const foodItems = ResponseParser.parseNutritionResponse(content);

    return foodItems;
  } catch (error) {
    console.error('LLM Service Error:', error);
    throw error;
  }
}

// Re-export for convenience
export * from './prompt-builder';
export * from './response-parser';
export * from './image-utils';
export * from './openrouter-client';
