import { GoogleGenerativeAI } from "@google/generative-ai"
import type { Wine, GeminiWineAnalysis } from "../frontend/types"

const apiKey = process.env.GEMINI_API_KEY

if (!apiKey) {
  throw new Error('Missing GEMINI_API_KEY environment variable')
}

const genAI = new GoogleGenerativeAI(apiKey)

// 1단계: 이미지에서 기본 정보 추출
const STEP1_IMAGE_ANALYSIS_PROMPT = `
당신은 와인 라벨 분석 전문가입니다.
이미지를 보고 와인 라벨에서 다음 정보를 추출하세요:

추출할 정보:
- title: 와인명 (정확한 스펠링)
- vintage: 생산 연도 (숫자만)
- winery: 와이너리명
- variety: 포도 품종 (있으면)
- country: 생산 국가 (있으면)
- region_1: 지역 (있으면)
- abv: 알코올 도수 (숫자만, 예: 14.5)

JSON만 반환:
{
  "title": "와인명",
  "vintage": 2021,
  "winery": "와이너리명",
  "variety": "품종",
  "country": "국가",
  "region_1": "지역",
  "abv": 14.5
}
`

// 2단계: 웹 검색으로 상세 정보 추출
const STEP2_DETAILED_SEARCH_PROMPT = `
다음 와인에 대한 상세 정보를 웹 검색을 통해 찾아주세요:

{WINE_INFO}

다음 정보를 JSON 형식으로 반환:
- title: 와인 전체 이름
- points: Vivino 평점 (1.0~5.0 사이, 소수점 1자리)
- vintage: 생산 연도
- type: "Red wine", "White wine", "Rosé wine", "Sparkling wine", "Dessert wine" 중 하나
- variety: 포도 품종
- region_2: 세세부 도시명/지역
- region_1: 세부 도시명/지역
- province: 주, 도
- country: 생산 국가
- winery: 와이너리
- price: 한국 가격 (원화, 숫자만)
- abv: 알코올 도수
- description: 와인에 대한 간단 설명 (2-3문장)
- taste: 테이스트 노트 (예: oak, vanilla, cherry, chocolate)
- acidity: 산도 (1~5 사이 정수)
- sweetness: 당도 (1~5 사이 정수)
- tannin: 탄닌 (1~5 사이 정수)
- body: 바디감 (1~5 사이 정수)
- cost_effectiveness: 가성비 (1~5 사이 정수)
- image: 와인 이미지 URL
- vivino_url: Vivino 페이지 URL

정보를 찾을 수 없으면 null로 반환하세요.

JSON 형식:
{
  "title": "...",
  "points": 4.2,
  "vintage": 2021,
  "type": "Red wine",
  "variety": "...",
  "region_2": "...",
  "region_1": "...",
  "province": "...",
  "country": "...",
  "winery": "...",
  "price": 30000,
  "abv": 14.5,
  "description": "...",
  "taste": "oak, cherry, vanilla",
  "acidity": 4,
  "sweetness": 1,
  "tannin": 3,
  "body": 4,
  "cost_effectiveness": 4,
  "image": "https://...",
  "vivino_url": "https://www.vivino.com/..."
}
`

/**
 * 1단계: 와인 라벨 이미지 분석
 * 이미지에서 기본 정보 추출
 */
async function analyzeWineLabel(imageBase64: string): Promise<Partial<Wine>> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    })

    const result = await model.generateContent([
      STEP1_IMAGE_ANALYSIS_PROMPT,
      {
        inlineData: {
          data: imageBase64,
          mimeType: "image/jpeg"
        }
      }
    ])

    const text = result.response.text()
    console.log('Step 1 - Image analysis:', text)

    // JSON 파싱
    const jsonText = cleanJsonResponse(text)
    const parsed = JSON.parse(jsonText)

    return parsed

  } catch (error) {
    console.error('Step 1 error:', error)
    throw new Error(`이미지 분석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
  }
}

/**
 * 2단계: 웹 검색으로 상세 정보 수집
 * Google Search Grounding 사용
 */
async function searchWineDetails(basicInfo: Partial<Wine>): Promise<Partial<Wine>> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      // Google Search grounding 활성화
    })

    // 검색 쿼리 생성
    const wineInfoStr = `
와인명: ${basicInfo.title}
빈티지: ${basicInfo.vintage}
와이너리: ${basicInfo.winery}
품종: ${basicInfo.variety || '알 수 없음'}
국가: ${basicInfo.country || '알 수 없음'}
    `.trim()

    const prompt = STEP2_DETAILED_SEARCH_PROMPT.replace('{WINE_INFO}', wineInfoStr)

    // Google Search grounding을 사용한 생성
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],  // Grounding 활성화
    })

    const response = result.response
    const text = response.text()
    console.log('Step 2 - Detailed search:', text)

    // Grounding metadata 확인
    if (response.candidates && response.candidates[0].groundingMetadata) {
      const metadata = response.candidates[0].groundingMetadata
      console.log('Grounding metadata:', {
        webSearchQueries: metadata.webSearchQueries,
        groundingChunks: metadata.groundingChunks?.length || 0
      })
    }

    // JSON 파싱
    const jsonText = cleanJsonResponse(text)
    const parsed = JSON.parse(jsonText)

    return parsed

  } catch (error) {
    console.error('Step 2 error:', error)
    throw new Error(`웹 검색 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
  }
}

/**
 * 메인 함수: 와인 이미지 분석 (2단계 통합)
 */
export async function analyzeWineImage(imageBase64: string): Promise<Partial<Wine>> {
  console.log('🔍 Starting wine analysis...')

  try {
    // 1단계: 이미지에서 기본 정보 추출
    console.log('📸 Step 1: Analyzing image...')
    const basicInfo = await analyzeWineLabel(imageBase64)

    if (!basicInfo.title) {
      throw new Error('와인명을 찾을 수 없습니다. 라벨이 명확한 사진을 다시 촬영해주세요.')
    }

    console.log('✅ Step 1 completed:', basicInfo)

    // 2단계: 웹 검색으로 상세 정보 수집
    console.log('🌐 Step 2: Searching detailed information...')
    const detailedInfo = await searchWineDetails(basicInfo)

    console.log('✅ Step 2 completed')

    // 두 단계 결과 병합 (2단계 우선)
    const finalResult = {
      ...basicInfo,
      ...detailedInfo,
    }

    console.log('✅ Analysis completed:', finalResult)

    return finalResult

  } catch (error) {
    console.error('❌ Analysis failed:', error)
    throw error
  }
}

/**
 * JSON 응답 정리 (마크다운 제거)
 */
function cleanJsonResponse(text: string): string {
  let cleaned = text.trim()

  // ```json ... ``` 제거
  cleaned = cleaned.replace(/```json\s*/g, '')
  cleaned = cleaned.replace(/```\s*/g, '')

  // 백틱 제거
  cleaned = cleaned.replace(/`/g, '')

  // JSON만 추출 (첫 { 부터 마지막 })
  const startIdx = cleaned.indexOf('{')
  const endIdx = cleaned.lastIndexOf('}')

  if (startIdx !== -1 && endIdx !== -1) {
    cleaned = cleaned.substring(startIdx, endIdx + 1)
  }

  return cleaned
}

/**
 * 이미지 Base64 유효성 검사
 */
export function validateImageBase64(base64: string): boolean {
  if (!base64 || base64.length === 0) {
    return false
  }

  // Base64 길이 체크 (최소 100자, 최대 10MB)
  if (base64.length < 100 || base64.length > 10 * 1024 * 1024 * 4 / 3) {
    return false
  }

  return true
}
