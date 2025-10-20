-- Podoring WMS - Wine Embeddings & RAG Search Migration
-- Execute this in Supabase SQL Editor

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create wine_embeddings table
CREATE TABLE IF NOT EXISTS wine_embeddings (
  id BIGSERIAL PRIMARY KEY,
  wine_id BIGINT UNIQUE NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  embedding VECTOR(1536) NOT NULL,  -- OpenAI text-embedding-3-small
  metadata JSONB,                    -- Wine info snapshot for debugging
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS wine_embeddings_embedding_idx
ON wine_embeddings
USING hnsw (embedding vector_cosine_ops);

-- 4. Create index on wine_id for faster lookups
CREATE INDEX IF NOT EXISTS wine_embeddings_wine_id_idx
ON wine_embeddings(wine_id);

-- 5. Trigger function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wine_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_wine_embeddings_updated_at ON wine_embeddings;
CREATE TRIGGER trigger_wine_embeddings_updated_at
BEFORE UPDATE ON wine_embeddings
FOR EACH ROW
EXECUTE FUNCTION update_wine_embeddings_updated_at();

-- 7. Helper function: Generate embedding text from wine data
CREATE OR REPLACE FUNCTION generate_wine_embedding_text(wine_row wines)
RETURNS TEXT AS $$
DECLARE
  embedding_text TEXT := '';
BEGIN
  -- Title
  IF wine_row.title IS NOT NULL THEN
    embedding_text := embedding_text || 'Title: ' || wine_row.title || ' ';
  END IF;

  -- Vintage
  IF wine_row.vintage IS NOT NULL THEN
    embedding_text := embedding_text || 'Vintage: ' || wine_row.vintage || ' ';
  END IF;

  -- Type
  IF wine_row.type IS NOT NULL THEN
    embedding_text := embedding_text || 'Type: ' || wine_row.type || ' ';
  END IF;

  -- Variety
  IF wine_row.variety IS NOT NULL THEN
    embedding_text := embedding_text || 'Variety: ' || wine_row.variety || ' ';
  END IF;

  -- Region
  IF wine_row.region_2 IS NOT NULL OR wine_row.region_1 IS NOT NULL OR wine_row.province IS NOT NULL THEN
    embedding_text := embedding_text || 'Region: ';
    IF wine_row.region_2 IS NOT NULL THEN
      embedding_text := embedding_text || wine_row.region_2 || ', ';
    END IF;
    IF wine_row.region_1 IS NOT NULL THEN
      embedding_text := embedding_text || wine_row.region_1 || ', ';
    END IF;
    IF wine_row.province IS NOT NULL THEN
      embedding_text := embedding_text || wine_row.province || ' ';
    END IF;
  END IF;

  -- Country
  IF wine_row.country IS NOT NULL THEN
    embedding_text := embedding_text || 'Country: ' || wine_row.country || ' ';
  END IF;

  -- Winery
  IF wine_row.winery IS NOT NULL THEN
    embedding_text := embedding_text || 'Winery: ' || wine_row.winery || ' ';
  END IF;

  -- Price
  IF wine_row.price IS NOT NULL THEN
    embedding_text := embedding_text || 'Price: ' || wine_row.price || ' KRW ';
  END IF;

  -- ABV
  IF wine_row.abv IS NOT NULL THEN
    embedding_text := embedding_text || 'ABV: ' || wine_row.abv || '% ';
  END IF;

  -- Points
  IF wine_row.points IS NOT NULL THEN
    embedding_text := embedding_text || 'Points: ' || wine_row.points || ' ';
  END IF;

  -- Description
  IF wine_row.description IS NOT NULL THEN
    embedding_text := embedding_text || 'Description: ' || wine_row.description || ' ';
  END IF;

  -- Taste
  IF wine_row.taste IS NOT NULL THEN
    embedding_text := embedding_text || 'Taste: ' || wine_row.taste || ' ';
  END IF;

  -- Acidity
  IF wine_row.acidity IS NOT NULL THEN
    embedding_text := embedding_text || 'Acidity: ' || wine_row.acidity || '/5 ';
  END IF;

  -- Sweetness
  IF wine_row.sweetness IS NOT NULL THEN
    embedding_text := embedding_text || 'Sweetness: ' || wine_row.sweetness || '/5 ';
  END IF;

  -- Tannin
  IF wine_row.tannin IS NOT NULL THEN
    embedding_text := embedding_text || 'Tannin: ' || wine_row.tannin || '/5 ';
  END IF;

  -- Body
  IF wine_row.body IS NOT NULL THEN
    embedding_text := embedding_text || 'Body: ' || wine_row.body || '/5 ';
  END IF;

  -- Cost Effectiveness
  IF wine_row.cost_effectiveness IS NOT NULL THEN
    embedding_text := embedding_text || 'Cost Effectiveness: ' || wine_row.cost_effectiveness || '/5 ';
  END IF;

  RETURN TRIM(embedding_text);
END;
$$ LANGUAGE plpgsql;

-- 8. RPC Function: Semantic search using cosine similarity
CREATE OR REPLACE FUNCTION match_wines(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  vintage INTEGER,
  type TEXT,
  variety TEXT,
  region_2 TEXT,
  region_1 TEXT,
  province TEXT,
  country TEXT,
  winery TEXT,
  price INTEGER,
  abv DECIMAL,
  points DECIMAL,
  description TEXT,
  taste TEXT,
  acidity INTEGER,
  sweetness INTEGER,
  tannin INTEGER,
  body INTEGER,
  cost_effectiveness INTEGER,
  image TEXT,
  vivino_url TEXT,
  stock INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.title,
    w.vintage,
    w.type,
    w.variety,
    w.region_2,
    w.region_1,
    w.province,
    w.country,
    w.winery,
    w.price,
    w.abv,
    w.points,
    w.description,
    w.taste,
    w.acidity,
    w.sweetness,
    w.tannin,
    w.body,
    w.cost_effectiveness,
    w.image,
    w.vivino_url,
    w.stock,
    w.created_at,
    w.updated_at,
    1 - (we.embedding <=> query_embedding) AS similarity
  FROM wines w
  JOIN wine_embeddings we ON w.id = we.wine_id
  WHERE 1 - (we.embedding <=> query_embedding) > match_threshold
  ORDER BY we.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Completion message
DO $$
BEGIN
  RAISE NOTICE 'Wine embeddings migration completed successfully!';
  RAISE NOTICE 'Created: wine_embeddings table with pgvector support';
  RAISE NOTICE 'Created: HNSW index for cosine similarity search';
  RAISE NOTICE 'Created: Helper function generate_wine_embedding_text()';
  RAISE NOTICE 'Created: RPC function match_wines() for semantic search';
  RAISE NOTICE 'Next step: Run embedding generation via API endpoint /api/embeddings/regenerate';
END $$;
