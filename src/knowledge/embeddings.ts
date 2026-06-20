import type { Env } from '../types';

/**
 * Embed a single string using Azure OpenAI text-embedding-3-small (1536 dims).
 * Returns a float array ready to store as VECTOR(1536) in Supabase.
 */
export async function embedText(text: string, env: Env): Promise<number[]> {
  const url = `${env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT}/embeddings?api-version=${env.AZURE_OPENAI_API_VERSION}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': env.AZURE_OPENAI_API_KEY,
    },
    body: JSON.stringify({ input: text }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embedding API error ${response.status}: ${err}`);
  }

  const json = await response.json<{ data: Array<{ embedding: number[] }> }>();
  return json.data[0].embedding;
}
