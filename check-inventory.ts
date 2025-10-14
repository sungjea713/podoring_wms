import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://cglthkapppsmflmfkite.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnbHRoa2FwcHBzbWZsbWZraXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MzUyMjcsImV4cCI6MjA3NjAxMTIyN30.2r-STA1-G5xSa9IGfihBCzCnzdJikvz_rnOIig1Khbo'
)

// 1. 인벤토리 개수 확인
const { data: inventory, error: invError } = await supabase
  .from('inventory')
  .select('*')

if (invError) {
  console.error('❌ Inventory error:', invError)
} else {
  console.log('📦 Total inventory items:', inventory.length)
  if (inventory.length > 0) {
    console.log('Sample:', inventory[0])
  }
}

// 2. 재고가 있는 와인 확인
const { data: wines, error: wineError } = await supabase
  .from('wines')
  .select('id, title, stock')
  .gt('stock', 0)

if (wineError) {
  console.error('❌ Wines error:', wineError)
} else {
  console.log('\n🍷 Wines with stock > 0:', wines.length)
  wines.forEach((w: any) => {
    console.log(`  - ${w.title}: stock = ${w.stock}`)
  })
}
