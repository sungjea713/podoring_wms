import { step1_findVivinoUrl, step2_extractBasicInfo, step2_extractBasicInfoWithGrounding } from "./src/api/gemini"

const WINE_TITLE = "Montes Reserva Cabernet"
const WINERY = "Montes"

console.log('🍷 2단계 비교 테스트: Grounding 없음 vs Grounding 사용')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`와인명: ${WINE_TITLE}`)
console.log(`와이너리: ${WINERY}`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

async function compareStep2Methods() {
  try {
    // ===== 1단계: Vivino URL 찾기 =====
    console.log('🔍 1단계: Google Search로 Vivino URL 검색 중...\n')
    const step1Result = await step1_findVivinoUrl(WINE_TITLE, WINERY)
    const vivinoUrl = step1Result.vivino_url

    console.log(`✅ 1단계 완료: ${vivinoUrl}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // ===== 2단계-A: Grounding 없이 추출 =====
    console.log('📄 2단계-A: Vivino에서 기본 정보 추출 (Grounding 없음)\n')
    const step2NoGrounding = await step2_extractBasicInfo(vivinoUrl)

    console.log('\n✅ 2단계-A 완료!')
    console.log('📊 결과 (Grounding 없음):')
    console.log(JSON.stringify(step2NoGrounding, null, 2))
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // ===== 2단계-B: Grounding 사용 추출 =====
    console.log('📄 2단계-B: Vivino에서 기본 정보 추출 (Grounding 사용)\n')
    const step2WithGrounding = await step2_extractBasicInfoWithGrounding(vivinoUrl)

    console.log('\n✅ 2단계-B 완료!')
    console.log('📊 결과 (Grounding 사용):')
    console.log(JSON.stringify(step2WithGrounding, null, 2))
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // ===== 비교 =====
    console.log('🔍 비교 분석')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n주요 필드 비교:\n')

    const compareField = (fieldName: string, label: string) => {
      const valueA = step2NoGrounding[fieldName as keyof typeof step2NoGrounding]
      const valueB = step2WithGrounding[fieldName as keyof typeof step2WithGrounding]
      const same = valueA === valueB ? '✅ 동일' : '❌ 다름'
      console.log(`${label}:`)
      console.log(`  Grounding 없음: ${valueA}`)
      console.log(`  Grounding 사용: ${valueB}`)
      console.log(`  ${same}\n`)
    }

    compareField('title', '와인명')
    compareField('winery', '와이너리')
    compareField('variety', '품종')
    compareField('price', '가격')
    compareField('abv', '알코올')
    compareField('points', 'Vivino 평점 ⭐')
    compareField('country', '국가')
    compareField('province', 'Province')
    compareField('region_1', 'Region 1')

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // 평점 차이 강조
    if (step2NoGrounding.points !== step2WithGrounding.points) {
      console.log('\n⚠️  평점이 다릅니다!')
      console.log(`   Grounding 없음: ${step2NoGrounding.points}`)
      console.log(`   Grounding 사용: ${step2WithGrounding.points}`)
      console.log(`   차이: ${Math.abs((step2NoGrounding.points || 0) - (step2WithGrounding.points || 0)).toFixed(1)}점`)
    }

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error)
  }
}

// 테스트 실행
compareStep2Methods()
