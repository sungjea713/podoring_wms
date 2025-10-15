import indexHtml from "./frontend/index.html"
import { analyzeWineImage, validateImageBase64, autoGenerateWineInfo, step1_findVivinoUrl, step2_extractBasicInfo, step3_enrichInfo, step4_searchImages, preStep_extractFromImage } from "./api/gemini"
import { testConnection } from "./db/supabase"

const PORT = process.env.PORT || 3000

// Supabase 연결 테스트
await testConnection()

Bun.serve({
  port: PORT,

  routes: {
    // 메인 페이지
    "/": indexHtml,

    // API: 와인 라벨 스캔
    "/api/wines/scan": {
      POST: async (req) => {
        try {
          console.log('📸 Received wine scan request')

          const formData = await req.formData()
          const imageFile = formData.get('image') as File

          if (!imageFile) {
            return Response.json({
              success: false,
              error: '이미지 파일이 없습니다'
            }, { status: 400 })
          }

          // 이미지를 Base64로 변환
          const imageBuffer = await imageFile.arrayBuffer()
          const imageBase64 = Buffer.from(imageBuffer).toString('base64')

          // 유효성 검사
          if (!validateImageBase64(imageBase64)) {
            return Response.json({
              success: false,
              error: '유효하지 않은 이미지 형식입니다'
            }, { status: 400 })
          }

          console.log('📊 Image size:', imageFile.size, 'bytes')

          // Gemini API로 분석 (2단계: 이미지 분석 + 웹 검색)
          const wineInfo = await analyzeWineImage(imageBase64)

          return Response.json({
            success: true,
            data: wineInfo
          })

        } catch (error: any) {
          console.error('❌ Scan error:', error)
          return Response.json({
            success: false,
            error: error.message || '와인 분석에 실패했습니다'
          }, { status: 500 })
        }
      }
    },

    // API: 와인 자동 생성 (통합 - 기존 호환성 유지)
    "/api/wines/auto-generate": {
      POST: async (req) => {
        try {
          console.log('🤖 Received auto-generate request')

          const body = await req.json()
          const { title, winery } = body

          // 유효성 검사
          if (!title) {
            return Response.json({
              success: false,
              error: '와인명을 입력해주세요'
            }, { status: 400 })
          }

          console.log(`📝 Input: ${title}${winery ? ` - ${winery}` : ''}`)

          // Gemini API로 자동 생성 (와이너리는 선택사항)
          const wineInfo = await autoGenerateWineInfo(title, winery)

          return Response.json({
            success: true,
            data: wineInfo
          })

        } catch (error: any) {
          console.error('❌ Auto-generate error:', error)
          return Response.json({
            success: false,
            error: error.message || '자동 생성에 실패했습니다'
          }, { status: 500 })
        }
      }
    },

    // API: Step 1 - Google Search로 Vivino URL 찾기
    "/api/wines/auto-generate/step1": {
      POST: async (req) => {
        try {
          console.log('🔍 Step 1: Finding Vivino URL')

          const body = await req.json()
          const { title, winery } = body

          if (!title) {
            return Response.json({
              success: false,
              error: '와인명을 입력해주세요'
            }, { status: 400 })
          }

          const result = await step1_findVivinoUrl(title, winery)

          return Response.json({
            success: true,
            data: result
          })

        } catch (error: any) {
          console.error('❌ Step 1 error:', error)
          return Response.json({
            success: false,
            error: error.message || 'Vivino URL 검색 실패'
          }, { status: 500 })
        }
      }
    },

    // API: Step 2 - Vivino에서 기본 정보 추출
    "/api/wines/auto-generate/step2": {
      POST: async (req) => {
        try {
          console.log('📄 Step 2: Extracting basic info from Vivino')

          const body = await req.json()
          const { vivinoUrl } = body

          if (!vivinoUrl) {
            return Response.json({
              success: false,
              error: 'vivinoUrl을 입력해주세요'
            }, { status: 400 })
          }

          const result = await step2_extractBasicInfo(vivinoUrl)

          return Response.json({
            success: true,
            data: result
          })

        } catch (error: any) {
          console.error('❌ Step 2 error:', error)
          return Response.json({
            success: false,
            error: error.message || 'Vivino 기본 정보 추출 실패'
          }, { status: 500 })
        }
      }
    },

    // API: Step 3 - Grounding으로 추가 정보 수집
    "/api/wines/auto-generate/step3": {
      POST: async (req) => {
        try {
          console.log('🌐 Step 3: Enriching with grounding search')

          const body = await req.json()
          const { basicInfo } = body

          if (!basicInfo || !basicInfo.title || !basicInfo.winery) {
            return Response.json({
              success: false,
              error: 'basicInfo가 유효하지 않습니다'
            }, { status: 400 })
          }

          const result = await step3_enrichInfo(basicInfo)

          return Response.json({
            success: true,
            data: result
          })

        } catch (error: any) {
          console.error('❌ Step 3 error:', error)
          return Response.json({
            success: false,
            error: error.message || '추가 정보 수집 실패'
          }, { status: 500 })
        }
      }
    },

    "/api/wines/auto-generate/step4": {
      POST: async (req) => {
        try {
          console.log('🖼️  Step 4: Searching wine images')

          const body = await req.json()
          const { title, winery } = body

          if (!title) {
            return Response.json({
              success: false,
              error: '와인명이 필요합니다'
            }, { status: 400 })
          }

          const imageUrls = await step4_searchImages(title, winery)

          return Response.json({
            success: true,
            data: { imageUrls }
          })

        } catch (error: any) {
          console.error('❌ Step 4 error:', error)
          return Response.json({
            success: false,
            error: error.message || '이미지 검색 실패'
          }, { status: 500 })
        }
      }
    },

    // API: Pre-Step - 사진에서 와인 정보 추출
    "/api/wines/auto-generate/prestep": {
      POST: async (req) => {
        try {
          console.log('📸 Pre-Step: Extracting wine info from photo')

          const formData = await req.formData()
          const imageFile = formData.get('image') as File

          if (!imageFile) {
            return Response.json({
              success: false,
              error: '이미지 파일이 없습니다'
            }, { status: 400 })
          }

          // 이미지를 Base64로 변환
          const imageBuffer = await imageFile.arrayBuffer()
          const imageBase64 = Buffer.from(imageBuffer).toString('base64')

          // 유효성 검사
          if (!validateImageBase64(imageBase64)) {
            return Response.json({
              success: false,
              error: '유효하지 않은 이미지 형식입니다'
            }, { status: 400 })
          }

          // Pre-Step 실행
          const result = await preStep_extractFromImage(imageBase64)

          return Response.json({
            success: true,
            data: result
          })

        } catch (error: any) {
          console.error('❌ Pre-Step error:', error)
          return Response.json({
            success: false,
            error: error.message || '사진 분석 실패'
          }, { status: 500 })
        }
      }
    },

    // Health check
    "/api/health": {
      GET: () => {
        return Response.json({
          status: 'ok',
          timestamp: new Date().toISOString(),
          services: {
            database: 'connected',
            gemini: 'configured'
          }
        })
      }
    }
  },

  development: {
    hmr: true,
    console: true,
  }
})

console.log(`
🍷 Podoring WMS is running!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Local:   http://localhost:${PORT}
  Health:  http://localhost:${PORT}/api/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
