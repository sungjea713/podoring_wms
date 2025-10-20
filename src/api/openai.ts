/**
 * OpenAI API Integration for Wine Embeddings
 * Uses text-embedding-3-small model for semantic search
 */

import OpenAI from 'openai'
import type { Wine } from '../types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536

/**
 * Generate embedding text from wine data
 * Includes all wine columns in natural language format (English only)
 */
export function generateWineEmbeddingText(wine: Partial<Wine>): string {
  const parts: string[] = []

  if (wine.title) parts.push(`Title: ${wine.title}`)
  if (wine.vintage) parts.push(`Vintage: ${wine.vintage}`)
  if (wine.type) parts.push(`Type: ${wine.type}`)
  if (wine.variety) parts.push(`Variety: ${wine.variety}`)

  // Region (combined)
  const regionParts: string[] = []
  if (wine.region_2) regionParts.push(wine.region_2)
  if (wine.region_1) regionParts.push(wine.region_1)
  if (wine.province) regionParts.push(wine.province)
  if (regionParts.length > 0) {
    parts.push(`Region: ${regionParts.join(', ')}`)
  }

  if (wine.country) parts.push(`Country: ${wine.country}`)
  if (wine.winery) parts.push(`Winery: ${wine.winery}`)
  if (wine.price) parts.push(`Price: ${wine.price} KRW`)
  if (wine.abv) parts.push(`ABV: ${wine.abv}%`)
  if (wine.points) parts.push(`Points: ${wine.points}`)
  if (wine.description) parts.push(`Description: ${wine.description}`)
  if (wine.taste) parts.push(`Taste: ${wine.taste}`)
  if (wine.acidity) parts.push(`Acidity: ${wine.acidity}/5`)
  if (wine.sweetness) parts.push(`Sweetness: ${wine.sweetness}/5`)
  if (wine.tannin) parts.push(`Tannin: ${wine.tannin}/5`)
  if (wine.body) parts.push(`Body: ${wine.body}/5`)
  if (wine.cost_effectiveness) parts.push(`Cost Effectiveness: ${wine.cost_effectiveness}/5`)

  return parts.join(' ')
}

/**
 * Generate embedding vector for text using OpenAI API
 * @param text - Text to embed
 * @returns Embedding vector (1536 dimensions)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    })

    return response.data[0].embedding
  } catch (error) {
    console.error('[OpenAI] Error generating embedding:', error)
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate embedding for a wine
 * @param wine - Wine data
 * @returns Embedding vector
 */
export async function generateWineEmbedding(wine: Partial<Wine>): Promise<number[]> {
  const text = generateWineEmbeddingText(wine)
  console.log(`[OpenAI] Generating embedding for wine: ${wine.title || 'Unknown'}`)
  console.log(`[OpenAI] Embedding text length: ${text.length} chars`)

  return generateEmbedding(text)
}

/**
 * Generate embeddings for multiple wines in batch
 * @param wines - Array of wine data
 * @returns Array of embedding vectors
 */
export async function generateWineEmbeddingsBatch(wines: Partial<Wine>[]): Promise<number[][]> {
  console.log(`[OpenAI] Generating embeddings for ${wines.length} wines...`)

  // Process in parallel with rate limiting (max 100 concurrent requests)
  const batchSize = 100
  const results: number[][] = []

  for (let i = 0; i < wines.length; i += batchSize) {
    const batch = wines.slice(i, i + batchSize)
    console.log(`[OpenAI] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(wines.length / batchSize)}`)

    const batchResults = await Promise.all(
      batch.map(async (wine) => {
        try {
          return await generateWineEmbedding(wine)
        } catch (error) {
          console.error(`[OpenAI] Failed to generate embedding for wine ${wine.id}:`, error)
          throw error
        }
      })
    )

    results.push(...batchResults)
  }

  console.log(`[OpenAI] Generated ${results.length} embeddings successfully`)
  return results
}

/**
 * Generate query embedding for semantic search
 * @param query - Search query (English)
 * @returns Embedding vector
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  console.log(`[OpenAI] Generating query embedding: "${query}"`)
  return generateEmbedding(query)
}
