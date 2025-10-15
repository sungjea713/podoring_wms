import { preStep_extractFromImage, step1_findVivinoUrl, step2_extractBasicInfo, step3_enrichInfo, step4_searchImages } from "./src/api/gemini"
import { readFileSync } from "fs"
import { resolve } from "path"

const IMAGE_PATH = "./src/img/wine_image_test.jpeg"

console.log('📸 사진에서 와인 정보 자동 생성 전체 테스트')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`이미지 경로: ${IMAGE_PATH}`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

async function testPhotoToWineWorkflow() {
  const startTime = Date.now()

  try {
    // 이미지 파일 읽기
    const imagePath = resolve(IMAGE_PATH)
    const imageBuffer = readFileSync(imagePath)
    const imageBase64 = imageBuffer.toString('base64')

    console.log('✅ 이미지 로드 완료:', imageBuffer.length, 'bytes\n')

    // ===== Pre-Step: 사진에서 와인 정보 추출 =====
    console.log('📸 Pre-Step: 사진에서 와인 정보 추출 중...\n')
    const preStepResult = await preStep_extractFromImage(imageBase64)

    console.log('\n✅ Pre-Step 완료!')
    console.log('📊 결과:')
    console.log('  - 검색어:', preStepResult.searchQuery)
    console.log('  - 와이너리:', preStepResult.winery || 'N/A')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // ===== 1단계: Google Search로 Vivino URL 찾기 =====
    console.log('🔍 1단계: Google Search로 Vivino URL 검색 중...\n')
    const step1Result = await step1_findVivinoUrl(preStepResult.searchQuery, preStepResult.winery)

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

    // ===== 3단계 & 4단계: 병렬 실행 =====
    console.log('🚀 3단계 & 4단계: 병렬 실행 시작...\n')
    console.log('   - 3단계: Grounding으로 추가 정보 수집')
    console.log('   - 4단계: Google Image Search로 이미지 URL 검색\n')

    const parallelStartTime = Date.now()

    // Promise.all로 병렬 실행
    const [step3Result, step4Result] = await Promise.all([
      step3_enrichInfo(step2Result),
      step4_searchImages(step2Result.title, step2Result.winery)
    ])

    const parallelEndTime = Date.now()
    const parallelTime = ((parallelEndTime - parallelStartTime) / 1000).toFixed(2)

    console.log(`\n✅ 3단계 & 4단계 병렬 실행 완료! (${parallelTime}초)`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    console.log('📊 3단계 결과 (추가 정보):')
    console.log('  - Description:', step3Result.description ? step3Result.description.substring(0, 100) + '...' : 'N/A')
    console.log('  - Taste:', step3Result.taste)
    console.log('  - Wine Characteristics:', {
      acidity: step3Result.acidity,
      sweetness: step3Result.sweetness,
      tannin: step3Result.tannin,
      body: step3Result.body,
      cost_effectiveness: step3Result.cost_effectiveness
    })
    console.log('\n📊 4단계 결과 (이미지 URL):')
    if (step4Result.length > 0) {
      step4Result.forEach((url, index) => {
        console.log(`  ${index + 1}. ${url}`)
      })
    } else {
      console.log('  ❌ 이미지를 찾을 수 없습니다')
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const endTime = Date.now()
    const totalTime = ((endTime - startTime) / 1000).toFixed(2)

    // ===== 최종 결과 =====
    console.log('\n🎉 모든 단계 완료!')
    console.log(`⏱️  총 소요 시간: ${totalTime}초\n`)
    console.log('📋 최종 와인 정보:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🖼️  사진에서 인식한 정보:')
    console.log(`  - 검색어: ${preStepResult.searchQuery}`)
    console.log(`  - 와이너리: ${preStepResult.winery || 'N/A'}`)
    console.log('\n기본 정보:')
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
    console.log(`  - Vivino URL: ${step3Result.vivino_url}`)
    console.log(`\n이미지 URL 후보 (${step4Result.length}개):`)
    step4Result.forEach((url, index) => {
      console.log(`  ${index + 1}. ${url}`)
    })
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    console.log('\n✨ 사진 → 완전한 와인 정보 자동 생성 성공! ✨')

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error)
    console.error(error)
  }
}

// 테스트 실행
testPhotoToWineWorkflow()
