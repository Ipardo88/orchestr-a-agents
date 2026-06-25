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

// ── Tool calling ──────────────────────────────────────────────────────────────

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string — parse before use
  };
}

interface OpenAIToolResponse {
  choices: Array<{
    message: {
      content: string | null;
      tool_calls?: ToolCall[];
    };
  }>;
}

export async function callOpenAIWithTools(
  apiKey: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  tools: readonly object[],
  maxTokens = 900,
): Promise<{ content: string; toolCalls: ToolCall[] }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      tools: [...tools],
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${res.status}: ${err}`);
  }

  const data = await res.json() as OpenAIToolResponse;
  const msg = data.choices[0].message;
  return {
    content: msg.content ?? '',
    toolCalls: msg.tool_calls ?? [],
  };
}
