export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
}

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const CHAT_MODEL = 'gpt-4o-mini';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

interface OpenAIResponse {
  choices: Array<{ message: { content: string | null } }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

async function openAIFetch(apiKey: string, body: object): Promise<OpenAIResponse> {
  const res = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI ${res.status}: ${errText}`);
  }

  return res.json() as Promise<OpenAIResponse>;
}

/** Plain-text chat — for conversational (non-JSON) responses like the AI Coach. */
export async function callOpenAIText(
  apiKey: string,
  messages: ChatMessage[],
  maxTokens = 800,
): Promise<{ content: string; usage: AIUsage }> {
  const data = await openAIFetch(apiKey, {
    model: CHAT_MODEL,
    messages,
    max_tokens: maxTokens,
  });

  return {
    content: data.choices[0]?.message?.content ?? '',
    usage: {
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    },
  };
}

/** JSON-mode chat — for structured agent outputs. */
export async function callOpenAI<T>(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<{ result: T; usage: AIUsage }> {
  const data = await openAIFetch(apiKey, {
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 2048,
    response_format: { type: 'json_object' },
  });

  const text = data.choices[0]?.message?.content ?? '';
  const result = JSON.parse(text) as T;

  return {
    result,
    usage: {
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    },
  };
}
