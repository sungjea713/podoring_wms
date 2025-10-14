import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://cglthkapppsmflmfkite.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnbHRoa2FwcHBzbWZsbWZraXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MzUyMjcsImV4cCI6MjA3NjAxMTIyN30.2r-STA1-G5xSa9IGfihBCzCnzdJikvz_rnOIig1Khbo'
)

const { data, error } = await supabase
  .from('wines')
  .select('id, title, image_url, country')
  .limit(5)

if (error) {
  console.error('Error:', error)
} else {
  console.log('Sample wines:')
  data.forEach((wine: any) => {
    console.log(`- ${wine.title}`)
    console.log(`  image_url: ${wine.image_url || 'NULL'}`)
    console.log(`  country: ${wine.country || 'NULL'}`)
  })
}
