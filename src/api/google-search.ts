/**
 * Google Custom Search API를 사용해서 Vivino 와인 페이지 URL 찾기
 */

const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY
const GOOGLE_CSE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID

if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
  console.warn('⚠️ Google Custom Search API keys not found in environment variables')
}

interface GoogleSearchResult {
  link: string
  title: string
  snippet: string
}

interface GoogleSearchResponse {
  items?: GoogleSearchResult[]
}

interface ImageSearchResult {
  link: string
  title: string
  snippet?: string
}

/**
 * Google Custom Search API로 Vivino 와인 페이지 URL 검색
 */
export async function findVivinoUrl(title: string, winery?: string): Promise<string | null> {
  if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    console.log('❌ Google Search API not configured')
    return null
  }

  try {
    // 검색 쿼리 구성
    const searchQuery = winery ? `${winery} ${title} vivino` : `${title} vivino`

    console.log(`🔍 Google Search: "${searchQuery}"`)

    // Google Custom Search API 호출
    const searchUrl =
      `https://www.googleapis.com/customsearch/v1?` +
      `key=${GOOGLE_API_KEY}&` +
      `cx=${GOOGLE_CSE_ID}&` +
      `q=${encodeURIComponent(searchQuery)}`

    const response = await fetch(searchUrl)

    if (!response.ok) {
      console.log(`❌ Google Search API error: ${response.status}`)
      return null
    }

    const data: GoogleSearchResponse = await response.json()

    // Vivino URL 찾기
    const vivinoResults = data.items?.filter(item =>
      item.link.includes('vivino.com/') && item.link.match(/\/w\/\d+/)
    )

    if (!vivinoResults || vivinoResults.length === 0) {
      console.log('❌ No Vivino URLs found in search results')
      return null
    }

    const firstVivinoUrl = vivinoResults[0].link

    console.log(`✅ Found Vivino URL: ${firstVivinoUrl}`)

    return firstVivinoUrl

  } catch (error) {
    console.error('❌ Google Search error:', error)
    return null
  }
}

/**
 * Vivino 페이지 HTML 직접 가져오기
 */
export async function fetchVivinoPageHtml(url: string): Promise<string | null> {
  try {
    console.log(`📄 Fetching Vivino HTML: ${url}`)

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    })

    if (!response.ok) {
      console.log(`❌ Vivino HTML fetch error: ${response.status}`)
      return null
    }

    const html = await response.text()

    console.log(`✅ Fetched HTML (${html.length} chars)`)

    return html

  } catch (error) {
    console.error('❌ Vivino HTML fetch error:', error)
    return null
  }
}

/**
 * Google Custom Search API로 와인 이미지 URL 검색 (10개)
 */
export async function searchWineImages(wineTitle: string, winery?: string): Promise<string[]> {
  if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    console.log('❌ Google Search API not configured')
    return []
  }

  try {
    // 검색 쿼리 구성
    const searchQuery = winery ? `${winery} ${wineTitle} wine bottle` : `${wineTitle} wine bottle`

    console.log(`🖼️  Google Image Search: "${searchQuery}"`)

    // Google Custom Search API 호출 (이미지 검색 모드)
    const searchUrl =
      `https://www.googleapis.com/customsearch/v1?` +
      `key=${GOOGLE_API_KEY}&` +
      `cx=${GOOGLE_CSE_ID}&` +
      `q=${encodeURIComponent(searchQuery)}&` +
      `searchType=image&` +  // 이미지 검색
      `num=10`  // 10개 결과

    const response = await fetch(searchUrl)

    if (!response.ok) {
      console.log(`❌ Google Image Search API error: ${response.status}`)
      return []
    }

    const data: GoogleSearchResponse = await response.json()

    if (!data.items || data.items.length === 0) {
      console.log('❌ No image results found')
      return []
    }

    const imageUrls = data.items.map(item => item.link)

    console.log(`✅ Found ${imageUrls.length} image URLs`)
    imageUrls.forEach((url, index) => {
      console.log(`   ${index + 1}. ${url}`)
    })

    return imageUrls

  } catch (error) {
    console.error('❌ Google Image Search error:', error)
    return []
  }
}
