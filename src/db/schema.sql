-- Podoring WMS Database Schema
-- Execute this in Supabase SQL Editor

-- wines 테이블 (A-데이터베이스)
CREATE TABLE IF NOT EXISTS wines (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  points DECIMAL(3,1),
  vintage INTEGER,
  type TEXT CHECK (type IN ('Red wine', 'White wine', 'Rosé wine', 'Sparkling wine', 'Dessert wine')),
  variety TEXT,
  region_2 TEXT,
  region_1 TEXT,
  province TEXT,
  country TEXT,
  winery TEXT,
  price INTEGER,
  abv DECIMAL(4,2),
  description TEXT,
  taste TEXT,
  acidity INTEGER CHECK (acidity BETWEEN 1 AND 5),
  sweetness INTEGER CHECK (sweetness BETWEEN 1 AND 5),
  tannin INTEGER CHECK (tannin BETWEEN 1 AND 5),
  body INTEGER CHECK (body BETWEEN 1 AND 5),
  cost_effectiveness INTEGER CHECK (cost_effectiveness BETWEEN 1 AND 5),
  image TEXT,
  vivino_url TEXT,
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- inventory 테이블 (B-데이터베이스)
-- 선반: A/B/C, 행: 1-8, 열: 1-4
CREATE TABLE IF NOT EXISTS inventory (
  id BIGSERIAL PRIMARY KEY,
  wine_id BIGINT NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  shelf TEXT NOT NULL CHECK (shelf IN ('A', 'B', 'C')),
  row INTEGER NOT NULL CHECK (row BETWEEN 1 AND 8),
  col INTEGER NOT NULL CHECK (col BETWEEN 1 AND 4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_location UNIQUE (shelf, row, col)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_wines_title ON wines USING GIN (to_tsvector('simple', title));
CREATE INDEX IF NOT EXISTS idx_wines_type ON wines(type);
CREATE INDEX IF NOT EXISTS idx_wines_country ON wines(country);
CREATE INDEX IF NOT EXISTS idx_wines_variety ON wines(variety);
CREATE INDEX IF NOT EXISTS idx_wines_stock ON wines(stock);
CREATE INDEX IF NOT EXISTS idx_inventory_wine_id ON inventory(wine_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory(shelf, row, col);

-- 트리거 함수: 재고 자동 계산
CREATE OR REPLACE FUNCTION update_wine_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE wines
    SET stock = stock + 1,
        updated_at = NOW()
    WHERE id = NEW.wine_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE wines
    SET stock = GREATEST(stock - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.wine_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_wine_stock_insert ON inventory;
CREATE TRIGGER trigger_update_wine_stock_insert
AFTER INSERT ON inventory
FOR EACH ROW
EXECUTE FUNCTION update_wine_stock();

DROP TRIGGER IF EXISTS trigger_update_wine_stock_delete ON inventory;
CREATE TRIGGER trigger_update_wine_stock_delete
AFTER DELETE ON inventory
FOR EACH ROW
EXECUTE FUNCTION update_wine_stock();

-- 뷰: 재고 상세 정보 (JOIN)
CREATE OR REPLACE VIEW inventory_details AS
SELECT
  i.id,
  i.wine_id,
  i.shelf,
  i.row,
  i.col,
  w.title,
  w.vintage,
  w.type,
  w.variety,
  w.winery,
  w.image,
  w.price,
  w.stock,
  i.created_at
FROM inventory i
JOIN wines w ON i.wine_id = w.id;

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_wines_updated_at ON wines;
CREATE TRIGGER trigger_wines_updated_at
BEFORE UPDATE ON wines
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE 'Podoring WMS schema created successfully!';
  RAISE NOTICE 'Tables: wines, inventory';
  RAISE NOTICE 'View: inventory_details';
  RAISE NOTICE 'Triggers: auto-update stock count and updated_at';
END $$;
