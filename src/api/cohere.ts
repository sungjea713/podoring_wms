/**
 * Cohere API Integration for Wine Search Reranking
 * Uses rerank-english-v3.0 model to improve semantic search results
 */

import { CohereClient } from 'cohere-ai'
import { generateWineEmbeddingText } from './openai'
import type { Wine } from '../frontend/types'

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || '',
})

const RERANK_MODEL = 'rerank-english-v3.0'

/**
 * Rerank wines using Cohere Rerank API
 * @param query - User search query (English)
 * @param wines - Array of candidate wines from pgvector
 * @param topN - Number of top results to return (default: 3)
 * @returns Reranked wines with relevance scores
 */
export async function rerankWines(
  query: string,
  wines: Wine[],
  topN: number = 3
): Promise<Array<Wine & { relevance_score: number }>> {
  try {
    if (wines.length === 0) {
      console.log('[Cohere] No wines to rerank')
      return []
    }

    console.log(`[Cohere] Reranking ${wines.length} wines for query: "${query}"`)

    // 1. Convert wines to text documents
    const documents = wines.map((wine) => generateWineEmbeddingText(wine))

    console.log(`[Cohere] Documents generated, average length: ${Math.round(documents.reduce((sum, doc) => sum + doc.length, 0) / documents.length)} chars`)

    // 2. Call Cohere Rerank API
    const reranked = await cohere.rerank({
      model: RERANK_MODEL,
      query: query,
      documents: documents,
      topN: topN,
      returnDocuments: false, // We already have the wine objects
    })

    console.log(`[Cohere] Rerank complete, returning top ${reranked.results.length} results`)

    // 3. Map reranked results back to wine objects with relevance scores
    const results = reranked.results.map((result) => ({
      ...wines[result.index],
      relevance_score: result.relevanceScore,
    }))

    // Log top results for debugging
    results.forEach((wine, i) => {
      console.log(`[Cohere]   ${i + 1}. ${wine.title} (score: ${wine.relevance_score.toFixed(4)})`)
    })

    return results
  } catch (error) {
    console.error('[Cohere] Error reranking wines:', error)
    throw new Error(`Failed to rerank wines: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Check if Cohere API is configured
 */
export function isCohereConfigured(): boolean {
  return !!process.env.COHERE_API_KEY && process.env.COHERE_API_KEY.length > 0
}
