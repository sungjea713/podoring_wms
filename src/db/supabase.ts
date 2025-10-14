import { createClient } from '@supabase/supabase-js'
import type { Database } from '../frontend/types'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local file.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey)

// 연결 테스트 함수
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('wines').select('count').limit(1)
    if (error) throw error
    console.log('✅ Supabase connected successfully')
    return true
  } catch (error) {
    console.error('❌ Supabase connection failed:', error)
    return false
  }
}
