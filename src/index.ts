import indexHtml from "./frontend/index.html"
import { analyzeWineImage, validateImageBase64 } from "./api/gemini"
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
