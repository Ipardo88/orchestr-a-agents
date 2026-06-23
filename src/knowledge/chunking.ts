import type { Env } from '../types';

const DEFAULT_CHUNK_TOKENS = 400;
const CHARS_PER_TOKEN = 4; // rough approximation

/**
 * Split text into overlapping chunks by paragraph boundary.
 * Each chunk targets ~maxTokens tokens with 10% overlap.
 */
export function semanticChunk(text: string, maxTokens = DEFAULT_CHUNK_TOKENS): string[] {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  const overlapChars = Math.floor(maxChars * 0.1);
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      // overlap: keep tail of current chunk
      const tail = current.slice(-overlapChars);
      current = tail + '\n\n' + para;
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text.trim()];
}

/**
 * Generate a 3-sentence document summary — used as context prefix for each chunk.
 * Implements the Anthropic contextual chunking pattern.
 */
export async function generateDocumentSummary(text: string, env: Env): Promise<string> {
  return callAzure(
    `Summarise this document in 3 sentences. Focus on the main topic, the framework or methodology it describes, and its business application. Document:\n\n${text.slice(0, 4000)}`,
    env,
  );
}

/**
 * Prepend document context to a chunk so the embedding captures where the chunk fits.
 * This is the Anthropic "contextual retrieval" technique.
 */
export async function contextualizeChunk(
  docSummary: string,
  chunk: string,
  env: Env,
): Promise<string> {
  const context = await callAzure(
    `Here is a document summary:\n${docSummary}\n\nHere is a chunk from that document:\n${chunk}\n\nWrite 2-3 sentences that situate this chunk within the document. Explain what topic it covers and why it matters. Be concise — this will be prepended to the chunk for search indexing.`,
    env,
  );
  return `${context}\n\n${chunk}`;
}

async function callAzure(prompt: string, env: Env): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI error ${response.status}: ${await response.text()}`);
  }

  const json = await response.json<{ choices: Array<{ message: { content: string } }> }>();
  return json.choices[0].message.content.trim();
}
