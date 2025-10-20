import indexHtml from "./frontend/index.html"
import { analyzeWineImage, validateImageBase64, autoGenerateWineInfo, step1_findVivinoUrl, step2_extractBasicInfo, step3_enrichInfo, step4_searchImages, preStep_extractFromImage } from "./api/gemini"
import { testConnection, supabase } from "./db/supabase"
import { generateQueryEmbedding, generateWineEmbedding, generateWineEmbeddingText } from "./api/openai"
import type { Wine } from "./frontend/types"

const PORT = process.env.PORT || 3000

// Supabase 연결 테스트
await testConnection()

Bun.serve({
  port: PORT,

  async fetch(req) {
    const url = new URL(req.url)

    // 이미지 파일 서빙
    if (url.pathname.startsWith('/img/')) {
      const filePath = `./src/frontend${url.pathname}`
      const file = Bun.file(filePath)

      if (await file.exists()) {
        return new Response(file)
      }

      return new Response('Image not found', { status: 404 })
    }

    // 404 for unmatched routes
    return new Response('Not found', { status: 404 })
  },

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

    // API: 와인 추가 (Create Wine with Auto-Embedding)
    "/api/wines": {
      POST: async (req) => {
        try {
          console.log('🍷 Creating new wine with auto-embedding...')

          const wine = await req.json()

          // 1. Insert wine into database
          const { data: newWine, error: insertError } = await supabase
            .from('wines')
            .insert(wine)
            .select()
            .single()

          if (insertError) {
            throw new Error(`Failed to insert wine: ${insertError.message}`)
          }

          console.log(`✅ Wine created (ID: ${newWine.id})`)

          // 2. Generate and save embedding
          try {
            const embedding = await generateWineEmbedding(newWine)

            const { error: embedError } = await (supabase
              .from('wine_embeddings')
              .insert({
                wine_id: newWine.id,
                embedding: embedding,
                metadata: {
                  title: newWine.title,
                  winery: newWine.winery,
                  type: newWine.type,
                  vintage: newWine.vintage
                }
              }) as any)

            if (embedError) {
              console.error('⚠️  Failed to generate embedding:', embedError.message)
              // Don't fail the request if embedding fails
            } else {
              console.log(`✅ Embedding generated for wine ${newWine.id}`)
            }
          } catch (embedError: any) {
            console.error('⚠️  Embedding generation error:', embedError.message)
            // Don't fail the request if embedding fails
          }

          return Response.json({
            success: true,
            data: newWine
          })

        } catch (error: any) {
          console.error('❌ Wine creation error:', error)
          return Response.json({
            success: false,
            error: error.message || '와인 추가에 실패했습니다'
          }, { status: 500 })
        }
      },

      // Update Wine
      PUT: async (req) => {
        try {
          const url = new URL(req.url)
          const id = url.searchParams.get('id')

          if (!id) {
            return Response.json({
              success: false,
              error: 'Wine ID is required'
            }, { status: 400 })
          }

          console.log(`🔄 Updating wine ${id} with auto-embedding...`)

          const wine = await req.json()

          // 1. Update wine in database
          const { data: updatedWine, error: updateError } = await supabase
            .from('wines')
            .update(wine)
            .eq('id', id)
            .select()
            .single()

          if (updateError) {
            throw new Error(`Failed to update wine: ${updateError.message}`)
          }

          console.log(`✅ Wine ${id} updated`)

          // 2. Regenerate embedding
          try {
            const embedding = await generateWineEmbedding(updatedWine)

            const { error: embedError } = await (supabase
              .from('wine_embeddings')
              .upsert({
                wine_id: updatedWine.id,
                embedding: embedding,
                metadata: {
                  title: updatedWine.title,
                  winery: updatedWine.winery,
                  type: updatedWine.type,
                  vintage: updatedWine.vintage
                }
              }) as any)

            if (embedError) {
              console.error('⚠️  Failed to regenerate embedding:', embedError.message)
            } else {
              console.log(`✅ Embedding regenerated for wine ${id}`)
            }
          } catch (embedError: any) {
            console.error('⚠️  Embedding regeneration error:', embedError.message)
          }

          return Response.json({
            success: true,
            data: updatedWine
          })

        } catch (error: any) {
          console.error('❌ Wine update error:', error)
          return Response.json({
            success: false,
            error: error.message || '와인 수정에 실패했습니다'
          }, { status: 500 })
        }
      },

      // Delete Wine
      DELETE: async (req) => {
        try {
          const url = new URL(req.url)
          const id = url.searchParams.get('id')

          if (!id) {
            return Response.json({
              success: false,
              error: 'Wine ID is required'
            }, { status: 400 })
          }

          console.log(`🗑️  Deleting wine ${id}...`)

          // Delete wine (CASCADE will auto-delete embedding)
          const { error: deleteError } = await supabase
            .from('wines')
            .delete()
            .eq('id', id)

          if (deleteError) {
            throw new Error(`Failed to delete wine: ${deleteError.message}`)
          }

          console.log(`✅ Wine ${id} deleted (embedding auto-deleted via CASCADE)`)

          return Response.json({
            success: true,
            data: { id: parseInt(id) }
          })

        } catch (error: any) {
          console.error('❌ Wine deletion error:', error)
          return Response.json({
            success: false,
            error: error.message || '와인 삭제에 실패했습니다'
          }, { status: 500 })
        }
      }
    },

    // API: 시맨틱 검색 (Semantic Search with RAG)
    "/api/search/semantic": {
      POST: async (req) => {
        try {
          console.log('🔍 Semantic search request received')

          const body = await req.json()
          const { query, limit = 20 } = body

          if (!query || typeof query !== 'string') {
            return Response.json({
              success: false,
              error: '검색어를 입력해주세요'
            }, { status: 400 })
          }

          console.log(`📝 Query: "${query}", Limit: ${limit}`)

          // 1. Generate query embedding
          const queryEmbedding = await generateQueryEmbedding(query)
          console.log(`✅ Query embedding generated (${queryEmbedding.length} dimensions)`)

          // 2. Perform cosine similarity search using pgvector
          // @ts-ignore - Supabase RPC type issue
          const { data: results, error } = await supabase.rpc('match_wines', {
            query_embedding: queryEmbedding,
            match_threshold: 0.5,  // Minimum similarity threshold
            match_count: limit
          })

          if (error) {
            console.error('❌ Semantic search error:', error)
            throw new Error(`Database search failed: ${error.message}`)
          }

          console.log(`✅ Found ${(results as any[])?.length || 0} matching wines`)

          return Response.json({
            success: true,
            data: {
              wines: (results as any[]) || [],
              count: (results as any[])?.length || 0
            }
          })

        } catch (error: any) {
          console.error('❌ Semantic search error:', error)
          return Response.json({
            success: false,
            error: error.message || '시맨틱 검색에 실패했습니다'
          }, { status: 500 })
        }
      }
    },

    // API: 임베딩 일괄 재생성 (Batch Regenerate Embeddings)
    "/api/embeddings/regenerate": {
      POST: async (req) => {
        try {
          console.log('🔄 Starting batch embedding regeneration...')

          // 1. Fetch all wines from database
          const { data: wines, error: fetchError } = await supabase
            .from('wines')
            .select('*')
            .order('id')

          if (fetchError) {
            throw new Error(`Failed to fetch wines: ${fetchError.message}`)
          }

          if (!wines || wines.length === 0) {
            return Response.json({
              success: true,
              message: 'No wines found in database',
              data: { processed: 0, failed: 0 }
            })
          }

          console.log(`📊 Processing ${wines.length} wines...`)

          // 2. Generate embeddings for each wine
          let processed = 0
          let failed = 0
          const errors: { wine_id: number; error: string }[] = []

          for (const wine of wines as Wine[]) {
            try {
              console.log(`[${processed + failed + 1}/${wines.length}] Processing wine ID ${wine.id}: ${wine.title}`)

              // Generate embedding text
              const embeddingText = generateWineEmbeddingText(wine)

              // Generate embedding vector
              const embedding = await generateWineEmbedding(wine)

              // Upsert to wine_embeddings table
              // @ts-ignore - Supabase type issue with wine_embeddings
              const { error: upsertError } = await supabase
                .from('wine_embeddings')
                .upsert({
                  wine_id: wine.id,
                  embedding: embedding,
                  metadata: {
                    title: wine.title,
                    winery: wine.winery,
                    type: wine.type,
                    vintage: wine.vintage,
                    embedding_text_length: embeddingText.length
                  },
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'wine_id'
                })

              if (upsertError) {
                throw new Error(`Upsert failed: ${upsertError.message}`)
              }

              processed++
              console.log(`✅ Wine ID ${wine.id} processed successfully`)

              // Add small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 100))

            } catch (error: any) {
              failed++
              const errorMsg = error.message || 'Unknown error'
              console.error(`❌ Failed to process wine ID ${wine.id}:`, errorMsg)
              errors.push({ wine_id: wine.id, error: errorMsg })
            }
          }

          console.log(`✅ Batch regeneration complete: ${processed} processed, ${failed} failed`)

          return Response.json({
            success: true,
            message: `Processed ${processed} wines, ${failed} failed`,
            data: {
              total: wines.length,
              processed,
              failed,
              errors: errors.slice(0, 10)  // Return first 10 errors
            }
          })

        } catch (error: any) {
          console.error('❌ Batch regeneration error:', error)
          return Response.json({
            success: false,
            error: error.message || '임베딩 재생성에 실패했습니다'
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
            gemini: 'configured',
            openai: process.env.OPENAI_API_KEY ? 'configured' : 'not configured'
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
