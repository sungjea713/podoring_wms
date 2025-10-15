import { step1_findVivinoUrl, step2_extractBasicInfo, step3_enrichInfo } from "./src/api/gemini"

const WINE_TITLE = "Montes Reserva Cabernet"
const WINERY = "Montes"

console.log('🍷 최종 3단계 와인 자동 생성 테스트 (2단계, 3단계 모두 Grounding 사용)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`와인명: ${WINE_TITLE}`)
console.log(`와이너리: ${WINERY}`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

async function test3StageWorkflowFinal() {
  const startTime = Date.now()

  try {
    // ===== 1단계: Google Search로 Vivino URL 찾기 =====
    console.log('🔍 1단계: Google Search로 Vivino URL 검색 중...\n')
    const step1Result = await step1_findVivinoUrl(WINE_TITLE, WINERY)

    console.log('\n✅ 1단계 완료!')
    console.log('📊 결과:', step1Result)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    const vivinoUrl = step1Result.vivino_url

    // ===== 2단계: Vivino에서 기본 정보 추출 (Grounding 사용) =====
    console.log('📄 2단계: Vivino에서 기본 정보 추출 중 (Grounding 사용)...\n')
    const step2Result = await step2_extractBasicInfo(vivinoUrl)

    console.log('\n✅ 2단계 완료!')
    console.log('📊 결과:')
    console.log(JSON.stringify(step2Result, null, 2))
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // ===== 3단계: Grounding으로 추가 정보 수집 =====
    console.log('🌐 3단계: 구글 검색으로 추가 정보 수집 중...\n')
    const step3Result = await step3_enrichInfo(step2Result)

    console.log('\n✅ 3단계 완료!')
    console.log('📊 결과:')
    console.log(JSON.stringify(step3Result, null, 2))
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    const endTime = Date.now()
    const totalTime = ((endTime - startTime) / 1000).toFixed(2)

    // ===== 최종 결과 =====
    console.log('🎉 모든 단계 완료!')
    console.log(`⏱️  총 소요 시간: ${totalTime}초\n`)
    console.log('📋 최종 와인 정보:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('기본 정보:')
    console.log(`  - 와인명: ${step3Result.title}`)
    console.log(`  - 와이너리: ${step3Result.winery}`)
    console.log(`  - 품종: ${step3Result.variety}`)
    console.log(`  - 가격: ${step3Result.price ? `${step3Result.price.toLocaleString()}원` : 'N/A'}`)
    console.log(`  - 알코올: ${step3Result.abv}%`)
    console.log(`  - Vivino 평점: ${step3Result.points}/5.0 ⭐`)
    console.log(`\n지역 정보:`)
    console.log(`  - 국가: ${step3Result.country}`)
    console.log(`  - Province: ${step3Result.province || 'N/A'}`)
    console.log(`  - Region 1: ${step3Result.region_1 || 'N/A'}`)
    console.log(`  - Region 2: ${step3Result.region_2 || 'N/A'}`)
    console.log(`\n추가 정보:`)
    console.log(`  - Description: ${step3Result.description ? step3Result.description.substring(0, 100) + '...' : 'N/A'}`)
    console.log(`  - Taste: ${step3Result.taste || 'N/A'}`)
    console.log(`  - Acidity: ${step3Result.acidity}/5`)
    console.log(`  - Sweetness: ${step3Result.sweetness}/5`)
    console.log(`  - Tannin: ${step3Result.tannin}/5`)
    console.log(`  - Body: ${step3Result.body}/5`)
    console.log(`  - Cost Effectiveness: ${step3Result.cost_effectiveness}/5`)
    console.log(`  - Image: ${step3Result.image || 'N/A'}`)
    console.log(`  - Vivino URL: ${step3Result.vivino_url}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error)
    console.error(error)
  }
}

// 테스트 실행
test3StageWorkflowFinal()
