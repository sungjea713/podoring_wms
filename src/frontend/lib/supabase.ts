import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types'

// 브라우저용 Supabase 클라이언트
const supabaseUrl = 'https://cglthkapppsmflmfkite.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnbHRoa2FwcHBzbWZsbWZraXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MzUyMjcsImV4cCI6MjA3NjAxMTIyN30.2r-STA1-G5xSa9IGfihBCzCnzdJikvz_rnOIig1Khbo'

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    },
    fetch: fetch.bind(globalThis)
  }
})
