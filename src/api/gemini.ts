import { GoogleGenerativeAI } from "@google/generative-ai"
import type { Wine, GeminiWineAnalysis } from "../frontend/types"
import { findVivinoUrl, fetchVivinoPageHtml, searchWineImages } from "./google-search"

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
    // @ts-ignore - Gemini SDK 타입 정의 문제
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
        groundingChunks: (metadata as any).groundingChunks?.length || 0
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

  // ```json ... ``` 및 ```python 제거
  cleaned = cleaned.replace(/```json\s*/g, '')
  cleaned = cleaned.replace(/```python\s*/g, '')
  cleaned = cleaned.replace(/```\s*/g, '')

  // 백틱 제거
  cleaned = cleaned.replace(/`/g, '')

  // JSON만 추출 (첫 { 부터 마지막 })
  const startIdx = cleaned.indexOf('{')
  const endIdx = cleaned.lastIndexOf('}')

  if (startIdx !== -1 && endIdx !== -1) {
    cleaned = cleaned.substring(startIdx, endIdx + 1)
  }

  // JSON 문자열 값 안의 작은 따옴표를 이스케이프 처리
  // "title": "The Guv'nor" 같은 경우를 처리
  try {
    // 이미 valid JSON이면 그대로 반환
    JSON.parse(cleaned)
    return cleaned
  } catch {
    // JSON 파싱 실패하면 작은 따옴표 이스케이프 시도
    cleaned = cleaned.replace(/:\s*"([^"]*)'([^"]*)"/g, (match, p1, p2) => {
      return `: "${p1}\\'${p2}"`
    })
  }

  return cleaned
}

// ===== Pre-Step: 사진에서 와인 정보 추출 =====

/**
 * Pre-Step: 와인 사진에서 기본 정보 추출
 * 이미지를 분석하여 와인명, 와이너리 등을 텍스트로 반환
 */
async function extractWineInfoFromImage(imageBase64: string): Promise<{ searchQuery: string, winery?: string }> {
  console.time('⏱️  Pre-Step: Extract wine info from image')

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

  const prompt = `이 와인 라벨 사진을 분석해서 다음 정보를 추출해주세요:

1. 와인명 (Wine Name): 라벨에 가장 크게 표시된 와인의 이름
2. 와이너리 (Winery/Producer): 생산자 또는 브랜드명
3. 빈티지 (Vintage): 생산 연도 (있으면)
4. 품종 (Variety): 포도 품종 (있으면)
5. 국가/지역 (Country/Region): 생산 국가나 지역 (있으면)
6. 기타 식별 가능한 정보

이 정보들을 **모두 일렬로 나열**하여 Google 검색에 사용할 수 있는 검색어를 만들어주세요.
가능한 많은 정보를 포함할수록 정확한 검색이 가능합니다.

응답 형식 (JSON):
{
  "searchQuery": "와이너리 와인명 빈티지 품종 지역 등 모든 정보를 띄어쓰기로 연결",
  "winery": "와이너리명"
}

예시:
{
  "searchQuery": "Montes Reserva Cabernet Sauvignon 2023 Colchagua Valley Chile",
  "winery": "Montes"
}`

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64
          }
        }
      ]
    }]
  })

  const response = result.response
  const text = response.text()

  console.log('📄 Pre-Step raw response:', text.substring(0, 300))

  const jsonText = cleanJsonResponse(text)
  const parsed = JSON.parse(jsonText)

  console.timeEnd('⏱️  Pre-Step: Extract wine info from image')
  console.log('✅ Pre-Step completed:', parsed)

  return parsed
}

/**
 * Pre-Step export 함수: 이미지에서 와인 정보 추출
 */
export async function preStep_extractFromImage(imageBase64: string): Promise<{ searchQuery: string, winery?: string }> {
  return await extractWineInfoFromImage(imageBase64)
}

// ===== TypeScript 타입 정의 =====

interface BasicWineInfo {
  title: string
  vintage?: number | null
  type?: string | null
  winery: string
  variety: string | null
  price: number | null
  abv: number | null
  points: number | null
  country: string | null
  province: string | null
  region_1: string | null
  region_2: string | null
  vivino_url: string
}

interface EnrichedWineInfo {
  description: string | null
  taste: string | null
  acidity: number | null
  sweetness: number | null
  tannin: number | null
  body: number | null
  cost_effectiveness: number | null
}

// ===== 2단계: Vivino URL에서 기본 정보만 추출 =====

/**
 * 2단계 (Grounding 없음): Vivino URL에서 기본 정보 추출
 * Gemini가 URL을 직접 접속하여 기본 정보만 추출
 */
async function extractBasicInfoFromVivino(
  vivinoUrl: string
): Promise<BasicWineInfo> {
  console.time('⏱️  Step 2: Extract basic info from Vivino (No Grounding)')

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

  const prompt = `${vivinoUrl} 이 사이트에서 와인 기본 정보를 추출해서 JSON으로 알려줘.

다음 정보만 추출:
- title (와인 전체 이름)
- winery (와이너리)
- variety (포도 품종. 포도 품종이 여러개이면 "Blend(malbec, cabernet sauvignon, merlot)" 형식으로 표시)
- price (가격을 원화(KRW)로 변환, 숫자만. 달러로 표시되어 있으면 1달러 = 1300원으로 계산)
- abv (알코올 도수)
- points (Vivino 평점, 1.0~5.0)
- country (국가)
- province (주/도)
- region_1 (지역)
- region_2 (세부 지역)

JSON 형식만 반환:
{
  "title": "와인 전체 이름",
  "winery": "와이너리",
  "variety": "Cabernet Sauvignon 또는 Blend(malbec, cabernet sauvignon)",
  "price": 25000,
  "abv": 13.5,
  "points": 4.2,
  "country": "국가",
  "province": "주/도",
  "region_1": "지역",
  "region_2": null
}`.trim()

  // Grounding 없이 실행 (Gemini가 URL 직접 접속)
  const result = await model.generateContent(prompt)
  const response = result.response
  const text = response.text()

  console.log('📄 Step 2 (No Grounding) raw response:', text.substring(0, 200) + '...')

  const jsonText = cleanJsonResponse(text)
  const parsed = JSON.parse(jsonText)

  console.timeEnd('⏱️  Step 2: Extract basic info from Vivino (No Grounding)')

  return {
    ...parsed,
    vivino_url: vivinoUrl
  }
}

/**
 * 2단계 (Grounding 사용): Vivino URL에서 기본 정보 추출
 * Google Search Grounding을 사용하여 더 정확한 정보 추출
 */
async function extractBasicInfoFromVivinoWithGrounding(
  vivinoUrl: string
): Promise<BasicWineInfo> {
  console.time('⏱️  Step 2: Extract basic info from Vivino (With Grounding)')

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

  const prompt = `다음 Vivino URL에서 와인 정보를 추출하세요: ${vivinoUrl}

**검색 전략 (총 7개 쿼리 사용):**
1. title 검색 (1개 쿼리)
2. winery 검색 (1개 쿼리)
3. variety 검색 - 모든 포도 품종 확인 (1개 쿼리)
4. price 검색 (1개 쿼리)
5. abv 검색 (1개 쿼리)
6. points 검색 - Vivino 평점 (1개 쿼리)
7. country, province, region_1, region_2 한 번에 검색 (1개 쿼리)

**중요 형식 규칙:**
- variety: 품종이 여러 개면 반드시 "Blend(Cabernet Sauvignon, Merlot, Malbec)" 형식
- variety: 품종이 하나만 있으면 "Cabernet Sauvignon" 형식
- price: 원화로 변환 (USD × 1300)
- points: 정확한 Vivino 평점 (1.0~5.0)
- 지역 정보: country > province > region_1 > region_2 순서로 계층 구조

JSON 형식으로 반환:
{
  "title": "와인 전체 이름",
  "winery": "와이너리명",
  "variety": "Cabernet Sauvignon" 또는 "Blend(Cabernet Sauvignon, Merlot, Malbec)",
  "price": 25000,
  "abv": 13.5,
  "points": 4.2,
  "country": "Chile",
  "province": "Central Valley",
  "region_1": "Colchagua Valley",
  "region_2": null
}`.trim()

  // Grounding 활성화 (최적화된 프롬프트로 쿼리 수 최소화)
  // @ts-ignore - Gemini SDK 타입 정의 문제
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ googleSearch: {} }]
  })

  const response = result.response
  const text = response.text()

  console.log('📄 Step 2 (With Grounding) raw response length:', text.length)
  console.log('📄 Step 2 (With Grounding) raw response:', text.substring(0, 500))

  // Grounding metadata 출력
  if (response.candidates?.[0].groundingMetadata) {
    const metadata = response.candidates[0].groundingMetadata
    console.log('🔍 Step 2 Grounding queries used:', metadata.webSearchQueries?.length || 0)
    if (metadata.webSearchQueries && metadata.webSearchQueries.length > 0) {
      console.log('🔍 Step 2 검색 쿼리 목록:')
      metadata.webSearchQueries.forEach((query: string, index: number) => {
        console.log(`   ${index + 1}. "${query}"`)
      })
    }
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Gemini returned empty response in Step 2')
  }

  const jsonText = cleanJsonResponse(text)

  if (!jsonText || jsonText.trim().length === 0) {
    throw new Error(`Failed to extract JSON from response. Raw text: ${text}`)
  }

  const parsed = JSON.parse(jsonText)

  console.timeEnd('⏱️  Step 2: Extract basic info from Vivino (With Grounding)')

  return {
    ...parsed,
    vivino_url: vivinoUrl
  }
}

// ===== 3단계: Grounding으로 추가 정보 수집 =====

/**
 * 3단계: Grounding Search로 추가 정보 수집
 * Google Search를 활용하여 description, taste, 특성 5가지, 이미지 추출
 */
async function enrichWithGroundingSearch(
  basicInfo: BasicWineInfo
): Promise<EnrichedWineInfo> {
  console.time('⏱️  Step 3: Enrich with grounding search')

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

  const searchQuery = `${basicInfo.winery} ${basicInfo.title} wine review`

  const prompt = `${searchQuery} 와인에 대한 리뷰를 검색해서 다음 정보를 JSON으로 반환:

- description: 와인 설명 영어로 3-4문장
- taste: 테이스팅 노트 (예: vanilla, oak, cherry, blackberry)
- acidity, sweetness, tannin, body, cost_effectiveness: 각각 1~5 정수

JSON만 반환:
{
  "description": "...",
  "taste": "vanilla, oak, cherry",
  "acidity": 4,
  "sweetness": 2,
  "tannin": 3,
  "body": 4,
  "cost_effectiveness": 4
}`.trim()

  // @ts-ignore - Gemini SDK 타입 정의 문제
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ googleSearch: {} }]  // Grounding 활성화
  })

  const response = result.response
  const text = response.text()

  console.log('🌐 Step 3 raw response:', text.substring(0, 200) + '...')

  // Grounding metadata 출력
  if (response.candidates?.[0].groundingMetadata) {
    const metadata = response.candidates[0].groundingMetadata
    console.log('🔍 Step 3 Grounding queries used:', metadata.webSearchQueries?.length || 0)
    if (metadata.webSearchQueries && metadata.webSearchQueries.length > 0) {
      console.log('🔍 Step 3 검색 쿼리 목록:')
      metadata.webSearchQueries.forEach((query: string, index: number) => {
        console.log(`   ${index + 1}. "${query}"`)
      })
    }
  }

  const jsonText = cleanJsonResponse(text)
  const parsed = JSON.parse(jsonText)

  console.timeEnd('⏱️  Step 3: Enrich with grounding search')

  return parsed
}

// ===== 메인 함수: 3단계 통합 =====

/**
 * 자동 생성: 와인명으로 상세 정보 검색
 *
 * 3단계 워크플로우:
 * 1. Google Custom Search API로 Vivino URL 검색 (0.5-1초)
 * 2. Gemini로 Vivino에서 기본 정보 추출 (10-20초)
 * 3. Gemini Grounding으로 추가 정보 수집 (10-20초)
 */
export async function autoGenerateWineInfo(title: string, winery?: string): Promise<Partial<Wine> & { imageUrls?: string[] }> {
  console.log(`🤖 Auto-generating wine info for: ${title}${winery ? ` - ${winery}` : ''}`)

  try {
    // ===== Step 1: Google Custom Search로 Vivino URL 찾기 =====
    console.time('⏱️  Step 1: Google Search')
    const vivinoUrl = await findVivinoUrl(title, winery)
    console.timeEnd('⏱️  Step 1: Google Search')

    if (!vivinoUrl) {
      throw new Error('Vivino URL을 찾을 수 없습니다')
    }

    console.log(`✅ Step 1 completed: ${vivinoUrl}`)

    // ===== Step 2: Vivino에서 기본 정보 추출 (Grounding 사용) =====
    const basicInfo = await extractBasicInfoFromVivinoWithGrounding(vivinoUrl)
    console.log('✅ Step 2 completed:', Object.keys(basicInfo))

    // ===== Step 3 & 4: 병렬 실행 =====
    console.log('🚀 Step 3 & 4: 병렬 실행 시작...')
    const [enrichedInfo, imageUrls] = await Promise.all([
      enrichWithGroundingSearch(basicInfo),
      searchWineImages(basicInfo.title, basicInfo.winery)
    ])
    console.log('✅ Step 3 completed:', Object.keys(enrichedInfo))
    console.log(`✅ Step 4 completed: Found ${imageUrls.length} image URLs`)

    const finalResult = { ...basicInfo, ...enrichedInfo, imageUrls } as Partial<Wine> & { imageUrls?: string[] }

    console.log('🎉 All steps completed!')

    return finalResult

  } catch (error) {
    console.error('❌ Auto-generation failed:', error)
    throw new Error(`자동 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
  }
}

// ===== Export 추가 함수들 =====

/**
 * Step 1만 실행: Google Search로 Vivino URL 찾기
 */
export async function step1_findVivinoUrl(title: string, winery?: string): Promise<{ vivino_url: string }> {
  console.time('⏱️  Step 1: Google Search')
  const vivinoUrl = await findVivinoUrl(title, winery)
  console.timeEnd('⏱️  Step 1: Google Search')

  if (!vivinoUrl) {
    throw new Error('Vivino URL을 찾을 수 없습니다')
  }

  console.log(`✅ Step 1 completed: ${vivinoUrl}`)
  return { vivino_url: vivinoUrl }
}

/**
 * Step 2만 실행: Vivino에서 기본 정보 추출 (Grounding 사용 - 더 정확함)
 */
export async function step2_extractBasicInfo(vivinoUrl: string): Promise<BasicWineInfo> {
  const basicInfo = await extractBasicInfoFromVivinoWithGrounding(vivinoUrl)
  console.log('✅ Step 2 completed:', Object.keys(basicInfo))
  return basicInfo
}

/**
 * Step 2만 실행: Vivino에서 기본 정보 추출 (Grounding 사용)
 */
export async function step2_extractBasicInfoWithGrounding(vivinoUrl: string): Promise<BasicWineInfo> {
  const basicInfo = await extractBasicInfoFromVivinoWithGrounding(vivinoUrl)
  console.log('✅ Step 2 (With Grounding) completed:', Object.keys(basicInfo))
  return basicInfo
}

/**
 * Step 3만 실행: Grounding으로 추가 정보 수집
 */
export async function step3_enrichInfo(basicInfo: BasicWineInfo): Promise<Partial<Wine>> {
  const enrichedInfo = await enrichWithGroundingSearch(basicInfo)
  console.log('✅ Step 3 completed:', Object.keys(enrichedInfo))

  return { ...basicInfo, ...enrichedInfo } as Partial<Wine>
}

/**
 * Step 4만 실행: Google Image Search로 와인 이미지 URL 찾기 (5개)
 */
export async function step4_searchImages(wineTitle: string, winery?: string): Promise<string[]> {
  console.time('⏱️  Step 4: Search wine images')
  const imageUrls = await searchWineImages(wineTitle, winery)
  console.timeEnd('⏱️  Step 4: Search wine images')

  console.log(`✅ Step 4 completed: Found ${imageUrls.length} image URLs`)
  return imageUrls
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
