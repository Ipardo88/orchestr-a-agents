import { AzureOpenAI } from 'openai';

export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
}

type AzureConfig = {
  endpoint: string;
  apiKey: string;
  deployment: string;
  apiVersion: string;
};

/** Plain-text chat — for conversational (non-JSON) responses like the AI Coach. */
export async function callOpenAIText(
  config: AzureConfig,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  maxTokens = 800,
): Promise<{ content: string; usage: AIUsage }> {
  const client = new AzureOpenAI({
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    deployment: config.deployment,
    apiVersion: config.apiVersion,
  });

  const response = await client.chat.completions.create({
    model: config.deployment,
    max_tokens: maxTokens,
    messages,
  });

  return {
    content: response.choices[0]?.message?.content ?? '',
    usage: {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    },
  };
}

/** JSON-mode chat — for structured agent outputs. */
export async function callOpenAI<T>(
  config: {
    endpoint: string;
    apiKey: string;
    deployment: string;
    apiVersion: string;
  },
  systemPrompt: string,
  userPrompt: string,
): Promise<{ result: T; usage: AIUsage }> {
  const client = new AzureOpenAI({
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    deployment: config.deployment,
    apiVersion: config.apiVersion,
  });

  const response = await client.chat.completions.create({
    model: config.deployment,
    max_tokens: 2048,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const text = response.choices[0]?.message?.content ?? '';
  const result = JSON.parse(text) as T;

  return {
    result,
    usage: {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    },
  };
}
