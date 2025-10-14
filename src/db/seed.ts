import { supabase } from './supabase'

// 로컬 CSV 파일 경로
const CSV_FILE_PATH = './data/wine.csv'

interface RawWineData {
  title: string
  points: string
  vintage: string
  type: string
  variety: string
  region_2: string
  region_1: string
  province: string
  country: string
  winery: string
  price: string
  abv: string
  description: string
  taste: string
  acidity: string
  sweetness: string
  tannin: string
  body: string
  'cost-effectiveness': string
  image: string
  vivino_url: string
}

/**
 * CSV 파싱 함수 (쉼표 구분, 따옴표 처리, 멀티라인 지원)
 */
function parseCSV(csv: string): RawWineData[] {
  // UTF-8 BOM 제거
  const cleanCsv = csv.replace(/^\uFEFF/, '')

  // 전체 CSV를 한 번에 파싱 (멀티라인 필드 처리)
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < cleanCsv.length; i++) {
    const char = cleanCsv[i]
    const nextChar = cleanCsv[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // 이중 따옴표 ("") -> 하나의 따옴표로
        currentField += '"'
        i++
      } else {
        // 따옴표 시작/종료
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // 필드 구분자
      currentRow.push(currentField)
      currentField = ''
    } else if (char === '\n' && !inQuotes) {
      // 행 구분자
      currentRow.push(currentField)
      if (currentRow.some(f => f.trim().length > 0)) {
        rows.push(currentRow)
      }
      currentRow = []
      currentField = ''
    } else if (char === '\r' && nextChar === '\n' && !inQuotes) {
      // Windows 줄바꿈 (\r\n)
      currentRow.push(currentField)
      if (currentRow.some(f => f.trim().length > 0)) {
        rows.push(currentRow)
      }
      currentRow = []
      currentField = ''
      i++ // \n 건너뛰기
    } else {
      currentField += char
    }
  }

  // 마지막 행 처리
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField)
    if (currentRow.some(f => f.trim().length > 0)) {
      rows.push(currentRow)
    }
  }

  if (rows.length === 0) {
    return []
  }

  // 헤더와 데이터 분리
  const headers = rows[0].map(h => h.trim())
  const wines: RawWineData[] = []

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i]
    const wine: any = {}

    headers.forEach((header, index) => {
      wine[header] = values[index]?.trim() || ''
    })

    wines.push(wine)
  }

  return wines
}

/**
 * 1~5 범위 검증
 */
function parseRating(value: string): 1 | 2 | 3 | 4 | 5 | null {
  const num = parseInt(value)
  if (isNaN(num) || num < 1 || num > 5) return null
  return num as 1 | 2 | 3 | 4 | 5
}

/**
 * 원시 데이터를 Wine 타입으로 변환
 */
function transformWineData(raw: RawWineData): any {
  return {
    title: raw.title || '',
    points: raw.points ? parseFloat(raw.points) : null,
    vintage: raw.vintage ? parseInt(raw.vintage) : null,
    type: raw.type || null,
    variety: raw.variety || null,
    region_2: raw.region_2 || null,
    region_1: raw.region_1 || null,
    province: raw.province || null,
    country: raw.country || null,
    winery: raw.winery || null,
    price: raw.price ? parseInt(raw.price.replace(/[^0-9]/g, '')) : null,
    abv: raw.abv ? parseFloat(raw.abv.replace('%', '').trim()) : null,
    description: raw.description || null,
    taste: raw.taste || null,
    acidity: parseRating(raw.acidity),
    sweetness: parseRating(raw.sweetness),
    tannin: parseRating(raw.tannin),
    body: parseRating(raw.body),
    cost_effectiveness: parseRating(raw['cost-effectiveness']),
    image: raw.image || null,
    vivino_url: raw.vivino_url || null,
  }
}

/**
 * 메인 seed 함수
 */
async function seed() {
  console.log('🌱 Starting seed process...')

  try {
    // 1. 로컬 CSV 파일 읽기
    console.log('📥 Reading CSV file...')
    const file = Bun.file(CSV_FILE_PATH)
    const csvText = await file.text()
    console.log(`✅ Read ${csvText.length} bytes`)

    // 2. CSV 파싱
    console.log('📊 Parsing CSV data...')
    const rawWines = parseCSV(csvText)
    console.log(`✅ Parsed ${rawWines.length} wines`)

    if (rawWines.length === 0) {
      throw new Error('No wine data found in CSV')
    }

    // 3. 데이터 변환
    console.log('🔄 Transforming data...')
    const wines = rawWines
      .filter(raw => raw.title && raw.title.trim().length > 0) // 제목 없는 행 제외
      .map(transformWineData)

    console.log(`✅ Transformed ${wines.length} wines`)

    if (wines.length === 0) {
      throw new Error('No valid wine data after transformation')
    }

    // 4. 기존 데이터 확인
    console.log('🔍 Checking existing wines...')
    const { count: existingCount } = await supabase
      .from('wines')
      .select('*', { count: 'exact', head: true })

    console.log(`📌 Existing wines: ${existingCount || 0}`)

    if (existingCount && existingCount > 0) {
      console.log('⚠️  Database already has wines.')
      console.log('   To clear: Run "DELETE FROM wines;" in Supabase SQL Editor')
      console.log('   Then run this script again.')
      return
    }

    // 5. Supabase에 삽입 (배치 처리)
    console.log('💾 Inserting wines into Supabase...')

    const batchSize = 10
    let inserted = 0
    let errors = 0

    for (let i = 0; i < wines.length; i += batchSize) {
      const batch = wines.slice(i, i + batchSize)

      const { data, error } = await supabase
        .from('wines')
        .insert(batch as any)
        .select()

      if (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message)
        errors++
        continue
      }

      inserted += data?.length || 0
      console.log(`   Batch ${Math.floor(i / batchSize) + 1}: ${data?.length} wines inserted`)
    }

    // 6. 완료
    console.log('')
    console.log('✅ Seed completed!')
    console.log(`   Total inserted: ${inserted} wines`)
    console.log(`   Errors: ${errors} batches`)

    // 7. 검증
    const { count: finalCount } = await supabase
      .from('wines')
      .select('*', { count: 'exact', head: true })

    console.log(`   Database now has: ${finalCount} wines`)

    // 8. 샘플 데이터 출력
    const { data: samples } = await supabase
      .from('wines')
      .select('id, title, vintage, country, winery')
      .limit(5)

    console.log('')
    console.log('📋 Sample wines:')
    samples?.forEach((wine: any) => {
      console.log(`   - ${wine.title} (${wine.vintage}) - ${wine.winery}, ${wine.country}`)
    })

  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

// 실행
seed()
  .then(() => {
    console.log('\n🎉 Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
