import type { Env } from '../types';

/**
 * Embed a single string using OpenAI text-embedding-3-small (1536 dims).
 * Returns a float array ready to store as VECTOR(1536) in Supabase.
 */
export async function embedText(text: string, env: Env): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ input: text, model: 'text-embedding-3-small' }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embedding API error ${response.status}: ${err}`);
  }

  const json = await response.json<{ data: Array<{ embedding: number[] }> }>();
  return json.data[0].embedding;
}
