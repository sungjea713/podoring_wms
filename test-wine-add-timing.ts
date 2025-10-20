#!/usr/bin/env bun

import { supabase } from "./src/db/supabase"
import { generateWineEmbedding } from "./src/api/openai"
import type { Wine } from "./src/frontend/types"

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
console.log("🧪 와인 추가 + 임베딩 생성 시간 측정")
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

const testWine: Partial<Wine> = {
  title: "Test Wine Château Margaux",
  vintage: 2020,
  type: "Red wine",
  variety: "Cabernet Sauvignon",
  country: "France",
  province: "Bordeaux",
  region_1: "Médoc",
  region_2: "Margaux",
  winery: "Château Margaux",
  price: 500000,
  abv: 13.5,
  points: 4.8,
  description: "An exceptional Bordeaux wine with complex aromas of blackcurrant, cedar, and tobacco. Full-bodied with elegant tannins and a long finish.",
  taste: "blackcurrant, cedar, tobacco, vanilla, oak, dark chocolate, plum, leather",
  acidity: 4,
  sweetness: 1,
  tannin: 5,
  body: 5,
  cost_effectiveness: 2,
  image: "https://example.com/test.jpg",
  vivino_url: "https://www.vivino.com/test",
  stock: 10
}

async function main() {
  const totalStart = Date.now()

  try {
    // Step 1: Supabase에 와인 추가
    console.log("📝 Step 1: Supabase에 와인 데이터 추가 중...")
    const insertStart = Date.now()

    const { data: wine, error: insertError } = await supabase
      .from('wines')
      .insert(testWine)
      .select()
      .single()

    const insertTime = Date.now() - insertStart

    if (insertError) {
      throw insertError
    }

    console.log(`✅ 와인 추가 완료 (ID: ${wine.id})`)
    console.log(`   소요 시간: ${insertTime}ms (${(insertTime / 1000).toFixed(3)}초)\n`)

    // Step 2: 임베딩 생성
    console.log("🤖 Step 2: OpenAI로 임베딩 생성 중...")
    const embedStart = Date.now()

    const embedding = await generateWineEmbedding(wine)

    const embedTime = Date.now() - embedStart

    console.log(`✅ 임베딩 생성 완료 (1536 dimensions)`)
    console.log(`   소요 시간: ${embedTime}ms (${(embedTime / 1000).toFixed(3)}초)\n`)

    // Step 3: wine_embeddings 테이블에 저장
    console.log("💾 Step 3: wine_embeddings 테이블에 저장 중...")
    const saveStart = Date.now()

    const { error: embedError } = await supabase
      .from('wine_embeddings')
      .upsert({
        wine_id: wine.id,
        embedding: embedding,
        metadata: {
          title: wine.title,
          winery: wine.winery,
          type: wine.type,
          vintage: wine.vintage
        }
      })

    const saveTime = Date.now() - saveStart

    if (embedError) {
      throw embedError
    }

    console.log(`✅ 임베딩 저장 완료`)
    console.log(`   소요 시간: ${saveTime}ms (${(saveTime / 1000).toFixed(3)}초)\n`)

    // 총 시간
    const totalTime = Date.now() - totalStart

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("📊 시간 측정 결과:")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log(`1. 와인 데이터 추가:  ${String(insertTime).padStart(6)}ms (${(insertTime / 1000).toFixed(3)}초)`)
    console.log(`2. 임베딩 생성:       ${String(embedTime).padStart(6)}ms (${(embedTime / 1000).toFixed(3)}초)`)
    console.log(`3. 임베딩 저장:       ${String(saveTime).padStart(6)}ms (${(saveTime / 1000).toFixed(3)}초)`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`총 소요 시간:         ${String(totalTime).padStart(6)}ms (${(totalTime / 1000).toFixed(3)}초)`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

    console.log("💡 결론:")
    console.log(`   - 사용자가 와인을 추가하면 약 ${(totalTime / 1000).toFixed(1)}초 후에`)
    console.log(`     시맨틱 검색이 가능해집니다.`)
    console.log(`   - 대부분의 시간(${((embedTime / totalTime) * 100).toFixed(0)}%)은 OpenAI API 호출에 사용됩니다.\n`)

    // 테스트 와인 삭제
    console.log("🧹 테스트 데이터 정리 중...")
    await supabase.from('wines').delete().eq('id', wine.id)
    console.log("✅ 테스트 와인 삭제 완료 (임베딩도 CASCADE로 자동 삭제됨)\n")

  } catch (error: any) {
    console.error("❌ Error:", error.message)
    process.exit(1)
  }
}

main()
