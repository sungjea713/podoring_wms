import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAddWine, useUpdateWine } from '../hooks/useWines'
import type { Wine } from '../types'

interface WineFormModalProps {
  wine?: Wine | null
  onClose: () => void
}

export function WineFormModal({ wine, onClose }: WineFormModalProps) {
  const isEdit = !!wine
  const addWine = useAddWine()
  const updateWine = useUpdateWine()

  const [imagePreview, setImagePreview] = useState<'loading' | 'error' | 'success' | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)

  const [formData, setFormData] = useState<{
    title: string
    vintage: number
    winery: string
    country: string
    province: string
    region_1: string
    region_2: string
    type: 'Red wine' | 'White wine' | 'Rosé wine' | 'Sparkling wine' | 'Dessert wine'
    variety: string
    price: number
    abv: number
    points: number
    acidity: 1 | 2 | 3 | 4 | 5
    sweetness: 1 | 2 | 3 | 4 | 5
    tannin: 1 | 2 | 3 | 4 | 5
    body: 1 | 2 | 3 | 4 | 5
    cost_effectiveness: 1 | 2 | 3 | 4 | 5
    description: string
    taste: string
    image: string
    vivino_url: string
  }>({
    title: '',
    vintage: 0,
    winery: '',
    country: '',
    province: '',
    region_1: '',
    region_2: '',
    type: 'Red wine',
    variety: '',
    price: 0,
    abv: 0,
    points: 0,
    acidity: 3,
    sweetness: 3,
    tannin: 3,
    body: 3,
    cost_effectiveness: 3,
    description: '',
    taste: '',
    image: '',
    vivino_url: ''
  })

  useEffect(() => {
    if (wine) {
      setFormData({
        title: wine.title || '',
        vintage: wine.vintage || new Date().getFullYear(),
        winery: wine.winery || '',
        country: wine.country || '',
        province: wine.province || '',
        region_1: wine.region_1 || '',
        region_2: wine.region_2 || '',
        type: wine.type || 'Red wine',
        variety: wine.variety || '',
        price: wine.price || 0,
        abv: wine.abv || 0,
        points: wine.points || 0,
        acidity: wine.acidity || 3,
        sweetness: wine.sweetness || 3,
        tannin: wine.tannin || 3,
        body: wine.body || 3,
        cost_effectiveness: wine.cost_effectiveness || 3,
        description: wine.description || '',
        taste: wine.taste || '',
        image: wine.image || '',
        vivino_url: wine.vivino_url || ''
      })
      // 수정 모드일 때 이미지가 있으면 미리보기 로딩
      if (wine.image) {
        setImagePreview('loading')
      }
    }
  }, [wine])

  // 이미지 URL이 변경될 때마다 미리보기 업데이트
  useEffect(() => {
    if (formData.image) {
      setImagePreview('loading')
    } else {
      setImagePreview(null)
    }
  }, [formData.image])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (isEdit) {
        await updateWine.mutateAsync({ id: wine.id, ...formData })
      } else {
        await addWine.mutateAsync(formData)
      }
      onClose()
    } catch (error: any) {
      alert('저장 실패: ' + error.message)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target

    let finalValue: any = value
    if (type === 'number') {
      finalValue = parseFloat(value) || 0
    }

    // Rating 필드는 1-5 범위로 제한
    if (['acidity', 'sweetness', 'tannin', 'body', 'cost_effectiveness'].includes(name)) {
      const numValue = parseInt(value) as 1 | 2 | 3 | 4 | 5
      finalValue = Math.min(5, Math.max(1, numValue)) as 1 | 2 | 3 | 4 | 5
    }

    setFormData((prev) => ({
      ...prev,
      [name]: finalValue
    }))
  }

  const handleAutoGenerate = async () => {
    // 유효성 검사: 와인명만 필수
    if (!formData.title) {
      alert('와인명을 먼저 입력해주세요!')
      return
    }

    setIsGenerating(true)

    try {
      // ===== 1단계: Google Search로 Vivino URL 찾기 =====
      setStreamingText('🔍 1단계: Google Search로 Vivino URL 검색 중...')

      const step1Response = await fetch('/api/wines/auto-generate/step1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          winery: formData.winery || undefined,
        }),
      })

      const step1Result = await step1Response.json()
      if (!step1Result.success) throw new Error(step1Result.error)

      // 1단계 완료: vivino_url 즉시 업데이트
      const vivinoUrl = step1Result.data.vivino_url
      setFormData(prev => ({ ...prev, vivino_url: vivinoUrl }))
      setStreamingText(`✅ 1단계 완료: Vivino URL 찾음`)
      await new Promise(resolve => setTimeout(resolve, 800))

      // ===== 2단계: Vivino에서 기본 정보 추출 =====
      setStreamingText('📄 2단계: Vivino에서 기본 정보 추출 중...')

      const step2Response = await fetch('/api/wines/auto-generate/step2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vivinoUrl,
        }),
      })

      const step2Result = await step2Response.json()
      if (!step2Result.success) throw new Error(step2Result.error)

      // 2단계 완료: 기본 정보 즉시 업데이트
      setFormData(prev => ({ ...prev, ...step2Result.data }))
      setStreamingText(`✅ 2단계 완료: 기본 정보 추출 완료`)
      await new Promise(resolve => setTimeout(resolve, 800))

      // ===== 3단계 & 4단계: 병렬 실행 =====
      setStreamingText('🚀 3단계 & 4단계: 와인 정보와 이미지 검색 중...')

      const [step3Response, step4Response] = await Promise.all([
        fetch('/api/wines/auto-generate/step3', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            basicInfo: step2Result.data,
          }),
        }),
        fetch('/api/wines/auto-generate/step4', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: step2Result.data.title,
            winery: step2Result.data.winery,
          }),
        })
      ])

      const step3Result = await step3Response.json()
      const step4Result = await step4Response.json()

      if (!step3Result.success) throw new Error(step3Result.error)
      if (!step4Result.success) throw new Error(step4Result.error)

      // 3단계 완료: 추가 정보 즉시 업데이트
      setFormData(prev => ({ ...prev, ...step3Result.data }))

      // 4단계 완료: 이미지 URL 목록 저장
      setImageUrls(step4Result.data.imageUrls || [])

      setStreamingText(`✅ 3단계 & 4단계 완료: 모든 정보 생성 완료! (${step4Result.data.imageUrls?.length || 0}개 이미지 발견)`)

      setTimeout(() => {
        alert('와인 정보가 자동으로 채워졌습니다! 아래에서 이미지를 선택하세요.')
      }, 500)

    } catch (error: any) {
      setStreamingText('❌ 생성 실패')
      alert('자동 생성 실패: ' + error.message)
    } finally {
      setTimeout(() => {
        setIsGenerating(false)
        setStreamingText('')
      }, 1000)
    }
  }

  const handlePhotoCapture = async () => {
    // 카메라 또는 파일 선택 input 트리거
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment' // 후면 카메라 사용

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setIsGenerating(true)

      try {
        // Pre-Step: 사진에서 와인 정보 추출
        setStreamingText('📸 Pre-Step: 사진에서 와인 정보 추출 중...')

        const preStepFormData = new FormData()
        preStepFormData.append('image', file)

        const preStepResponse = await fetch('/api/wines/auto-generate/prestep', {
          method: 'POST',
          body: preStepFormData,
        })

        const preStepResult = await preStepResponse.json()
        if (!preStepResult.success) throw new Error(preStepResult.error)

        const { searchQuery, winery } = preStepResult.data
        setStreamingText(`✅ Pre-Step 완료: "${searchQuery}" 인식`)
        await new Promise(resolve => setTimeout(resolve, 800))

        // 이제 Step 1-4 실행 (검색어 사용)
        // Step 1: Vivino URL 찾기
        setStreamingText('🔍 1단계: Vivino URL 검색 중...')

        const step1Response = await fetch('/api/wines/auto-generate/step1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: searchQuery,
            winery: winery || undefined,
          }),
        })

        const step1Result = await step1Response.json()
        if (!step1Result.success) throw new Error(step1Result.error)

        const vivinoUrl = step1Result.data.vivino_url
        setFormData(prev => ({ ...prev, vivino_url: vivinoUrl }))
        setStreamingText(`✅ 1단계 완료`)
        await new Promise(resolve => setTimeout(resolve, 800))

        // Step 2: Vivino 기본 정보 추출
        setStreamingText('📄 2단계: Vivino에서 기본 정보 추출 중...')

        const step2Response = await fetch('/api/wines/auto-generate/step2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vivinoUrl }),
        })

        const step2Result = await step2Response.json()
        if (!step2Result.success) throw new Error(step2Result.error)

        setFormData(prev => ({ ...prev, ...step2Result.data }))
        setStreamingText(`✅ 2단계 완료`)
        await new Promise(resolve => setTimeout(resolve, 800))

        // Step 3 & 4: 병렬 실행
        setStreamingText('🚀 3단계 & 4단계: 추가 정보 및 이미지 검색 중...')

        const [step3Response, step4Response] = await Promise.all([
          fetch('/api/wines/auto-generate/step3', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ basicInfo: step2Result.data }),
          }),
          fetch('/api/wines/auto-generate/step4', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: step2Result.data.title,
              winery: step2Result.data.winery,
            }),
          })
        ])

        const step3Result = await step3Response.json()
        const step4Result = await step4Response.json()

        if (!step3Result.success) throw new Error(step3Result.error)
        if (!step4Result.success) throw new Error(step4Result.error)

        setFormData(prev => ({ ...prev, ...step3Result.data }))
        setImageUrls(step4Result.data.imageUrls || [])

        setStreamingText(`✅ 모든 단계 완료! 사진으로부터 와인 정보 생성 성공!`)

        setTimeout(() => {
          alert('사진으로부터 와인 정보가 자동으로 채워졌습니다! 아래에서 이미지를 선택하세요.')
        }, 500)

      } catch (error: any) {
        setStreamingText('❌ 생성 실패')
        alert('사진 분석 실패: ' + error.message)
      } finally {
        setTimeout(() => {
          setIsGenerating(false)
          setStreamingText('')
        }, 1000)
      }
    }

    input.click()
  }

  const modalContent = (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center overflow-y-auto p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col my-4"
        onClick={(e) => e.stopPropagation()}
      >
          {/* Header - Fixed */}
          <div className="p-6 border-b border-gray-200 flex-shrink-0 bg-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold text-gray-900">
                {isEdit ? '와인 수정' : '와인 추가'}
              </h3>
              {!isEdit && (
                <>
                  <button
                    type="button"
                    onClick={handlePhotoCapture}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                  >
                    📸 사진으로 추가
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoGenerate}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                  >
                    {isGenerating ? '생성 중...' : '🤖 AI 자동 생성'}
                  </button>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Form - Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} id="wine-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg text-gray-900 border-b pb-2">기본 정보</h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  와인명 *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wine-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    빈티지
                  </label>
                  <input
                    type="number"
                    name="vintage"
                    value={formData.vintage}
                    onChange={handleChange}
                    onFocus={() => {
                      if (formData.vintage === 0) {
                        setFormData((prev) => ({ ...prev, vintage: '' as any }))
                      }
                    }}
                    min="1900"
                    max="2100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wine-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    타입 *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wine-500 focus:border-transparent"
                  >
                    <option value="Red wine">Red wine</option>
                    <option value="White wine">White wine</option>
                    <option value="Rosé wine">Rosé wine</option>
                    <option value="Sparkling wine">Sparkling wine</option>
                    <option value="Dessert wine">Dessert wine</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  와이너리
                </label>
                <input
                  type="text"
                  name="winery"
                  value={formData.winery}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wine-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  품종
                </label>
                <input
                  type="text"
                  name="variety"
                  value={formData.variety}
                  onChange={handleChange}
                  placeholder="예: Cabernet Sauvignon"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wine-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    가격 (₩)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wine-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    알코올 (%)
                  </label>
                  <input
                    type="number"
                    name="abv"
                    value={formData.abv}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wine-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* 지역 정보 */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg text-gray-900 border-b pb-2">지역 정보</h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  국가
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wine-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Province
                </label>
                <input
                  type="text"
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wine-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region 1
                </label>
                <input
                  type="text"
                  name="region_1"
                  value={formData.region_1}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wine-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region 2
                </label>
                <input
                  type="text"
                  name="region_2"
                  value={formData.region_2}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wine-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  VIVINO 평점
                </label>
                <input
                  type="number"
                  name="points"
                  value={formData.points}
                  onChange={handleChange}
                  min="0"
                  max="5"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wine-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* 특성 정보 및 이미지 */}
            <div className="space-y-3">
              {/* 방사형 그래프 */}
              <RadarChart
                acidity={formData.acidity}
                sweetness={formData.sweetness}
                tannin={formData.tannin}
                body={formData.body}
                costEffectiveness={formData.cost_effectiveness}
              />

              <h4 className="font-semibold text-lg text-gray-900 border-b pb-2">특성 (1-5)</h4>

              <RatingInput
                label="산도"
                name="acidity"
                value={formData.acidity}
                onChange={handleChange}
              />

              <RatingInput
                label="당도"
                name="sweetness"
                value={formData.sweetness}
                onChange={handleChange}
              />

              <RatingInput
                label="타닌"
                name="tannin"
                value={formData.tannin}
                onChange={handleChange}
              />

              <RatingInput
                label="바디"
                name="body"
                value={formData.body}
                onChange={handleChange}
              />

              <RatingInput
                label="가성비"
                name="cost_effectiveness"
                value={formData.cost_effectiveness}
                onChange={handleChange}
              />
            </div>

            {/* 설명 */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg text-gray-900 border-b pb-2">상세 정보</h4>

              {/* 이미지 미리보기 */}
              <div>
                {formData.image && (
                  <div>
                    <div className="w-48 h-48 border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center mx-auto">
                      {imagePreview === 'loading' && (
                        <img
                          src={formData.image}
                          alt="Wine preview"
                          className="w-full h-full object-contain"
                          onLoad={() => setImagePreview('success')}
                          onError={() => setImagePreview('error')}
                        />
                      )}
                      {imagePreview === 'success' && (
                        <img
                          src={formData.image}
                          alt="Wine preview"
                          className="w-full h-full object-contain"
                        />
                      )}
                      {imagePreview === 'error' && (
                        <div className="text-center p-2">
                          <div className="text-gray-400 mb-1 text-2xl">🖼️</div>
                          <div className="text-xs text-gray-500">이미지 로드 실패</div>
                        </div>
                      )}
                      {imagePreview === null && formData.image && (
                        <div className="text-gray-400">로딩 중...</div>
                      )}
                    </div>
                    {imagePreview === 'error' && (
                      <p className="mt-2 text-xs text-red-600 text-center">잘못된 이미지 URL입니다</p>
                    )}
                  </div>
                )}
              </div>

              {/* 이미지 URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이미지 URL
                </label>
                <input
                  type="url"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wine-500 focus:border-transparent"
                />

                {/* 이미지 선택 UI - 가로 스크롤 */}
                {imageUrls.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 mb-2">
                      📸 발견된 이미지 ({imageUrls.length}개) - 클릭하여 선택
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {imageUrls.map((url, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, image: url }))
                            setSelectedImageIndex(index)
                          }}
                          className={`flex-shrink-0 w-24 h-32 border-2 rounded-lg cursor-pointer transition-all hover:shadow-lg ${
                            selectedImageIndex === index
                              ? 'border-wine-500 ring-2 ring-wine-300'
                              : 'border-gray-300 hover:border-wine-300'
                          }`}
                        >
                          <img
                            src={url}
                            alt={`Wine image ${index + 1}`}
                            className="w-full h-full object-contain rounded-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" font-size="14" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E'
                            }}
                          />
                          {selectedImageIndex === index && (
                            <div className="absolute top-1 right-1 bg-wine-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                              ✓
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wine-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  테이스팅 노트
                </label>
                <textarea
                  name="taste"
                  value={formData.taste}
                  onChange={handleChange}
                  rows={4}
                  placeholder="예: cherry, raspberry, vanilla, oak..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wine-500 focus:border-transparent"
                />
              </div>

              {/* Vivino URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vivino URL
                </label>
                <input
                  type="url"
                  name="vivino_url"
                  value={formData.vivino_url}
                  onChange={handleChange}
                  placeholder="https://vivino.com/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wine-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          </form>
        </div>

        {/* Footer - Fixed */}
        <div className="p-6 border-t border-gray-200 flex-shrink-0 flex justify-end space-x-3 bg-gray-50 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            form="wine-form"
            disabled={addWine.isPending || updateWine.isPending}
            className="px-6 py-2 bg-wine-600 text-white rounded-lg hover:bg-wine-700 transition-colors disabled:opacity-50"
          >
            {addWine.isPending || updateWine.isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )

  // 현재 진행 단계 계산 (진행 바용)
  const getCurrentProgress = () => {
    if (streamingText.includes('1단계')) return 33
    if (streamingText.includes('2단계')) return 66
    if (streamingText.includes('3단계') && !streamingText.includes('완료')) return 100
    if (streamingText.includes('완료')) return 100
    return 0
  }

  // 로딩 오버레이 (스트리밍 텍스트 + 진행 바 포함)
  const loadingOverlay = isGenerating && (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-70 flex items-center justify-center"
      style={{ zIndex: 10000 }}
    >
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
        <div className="flex flex-col items-center gap-6">
          {/* 스피너 */}
          <div className="w-16 h-16 border-4 border-wine-200 border-t-wine-600 rounded-full animate-spin"></div>

          {/* 타이틀 */}
          <div className="text-gray-800 text-xl font-semibold">와인 정보 생성 중...</div>

          {/* 진행 상황 텍스트 */}
          {streamingText && (
            <div className="text-gray-600 text-sm text-center animate-pulse">
              {streamingText}
            </div>
          )}

          {/* 진행 바 */}
          <div className="w-full">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-wine-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${getCurrentProgress()}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 text-center mt-2">
              {getCurrentProgress()}% 완료
            </div>
          </div>

          {/* 단계별 인디케이터 */}
          <div className="flex items-center justify-between w-full text-xs">
            <div className={`flex flex-col items-center ${getCurrentProgress() >= 33 ? 'text-wine-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${getCurrentProgress() >= 33 ? 'bg-wine-100' : 'bg-gray-100'}`}>
                {getCurrentProgress() >= 33 ? '✓' : '1'}
              </div>
              <span className="text-center">URL<br/>검색</span>
            </div>
            <div className={`flex-1 h-0.5 mx-2 ${getCurrentProgress() >= 66 ? 'bg-wine-600' : 'bg-gray-300'}`}></div>
            <div className={`flex flex-col items-center ${getCurrentProgress() >= 66 ? 'text-wine-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${getCurrentProgress() >= 66 ? 'bg-wine-100' : 'bg-gray-100'}`}>
                {getCurrentProgress() >= 66 ? '✓' : '2'}
              </div>
              <span className="text-center">기본<br/>정보</span>
            </div>
            <div className={`flex-1 h-0.5 mx-2 ${getCurrentProgress() >= 100 ? 'bg-wine-600' : 'bg-gray-300'}`}></div>
            <div className={`flex flex-col items-center ${getCurrentProgress() >= 100 ? 'text-wine-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${getCurrentProgress() >= 100 ? 'bg-wine-100' : 'bg-gray-100'}`}>
                {getCurrentProgress() >= 100 ? '✓' : '3'}
              </div>
              <span className="text-center">추가<br/>정보</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(
    <>
      {modalContent}
      {loadingOverlay}
    </>,
    document.body
  )
}

interface RatingInputProps {
  label: string
  name: string
  value: number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function RatingInput({ label, name, value, onChange }: RatingInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}: {value}
      </label>
      <input
        type="range"
        name={name}
        value={value}
        onChange={onChange}
        min="1"
        max="5"
        step="1"
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-wine-600"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
        <span>5</span>
      </div>
    </div>
  )
}

interface RadarChartProps {
  acidity: number
  sweetness: number
  tannin: number
  body: number
  costEffectiveness: number
}

function RadarChart({ acidity, sweetness, tannin, body, costEffectiveness }: RadarChartProps) {
  const size = 220
  const center = size / 2
  const maxRadius = size / 2 - 25
  const levels = 5

  // 5개 데이터 포인트 (시계방향: 12시부터)
  const data = [
    { label: '산도', value: acidity },
    { label: '당도', value: sweetness },
    { label: '타닌', value: tannin },
    { label: '바디', value: body },
    { label: '가성비', value: costEffectiveness }
  ]

  // 각 점의 각도 계산 (12시 방향부터 시작, 시계방향)
  const angleStep = (Math.PI * 2) / data.length

  // 극좌표를 직교좌표로 변환
  const getPoint = (value: number, index: number) => {
    const angle = angleStep * index - Math.PI / 2 // -90도 회전 (12시 방향부터 시작)
    const radius = (value / 5) * maxRadius
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    }
  }

  // 데이터 포인트들을 연결한 path
  const dataPath = data
    .map((item, index) => {
      const point = getPoint(item.value, index)
      return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    })
    .join(' ') + ' Z'

  // 레이블 위치 계산
  const getLabelPoint = (index: number) => {
    const angle = angleStep * index - Math.PI / 2
    const radius = maxRadius + 15
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    }
  }

  return (
    <div className="flex justify-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* 배경 동심원 (1-5단계) */}
        {Array.from({ length: levels }).map((_, i) => {
          const r = ((i + 1) / levels) * maxRadius
          return (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={r}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          )
        })}

        {/* 축선 */}
        {data.map((_, index) => {
          const point = getPoint(5, index)
          return (
            <line
              key={index}
              x1={center}
              y1={center}
              x2={point.x}
              y2={point.y}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          )
        })}

        {/* 데이터 영역 */}
        <path
          d={dataPath}
          fill="rgba(220, 38, 38, 0.2)"
          stroke="#dc2626"
          strokeWidth="2"
        />

        {/* 데이터 포인트 */}
        {data.map((item, index) => {
          const point = getPoint(item.value, index)
          return (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#dc2626"
            />
          )
        })}

        {/* 레이블 */}
        {data.map((item, index) => {
          const labelPoint = getLabelPoint(index)
          return (
            <text
              key={index}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-medium fill-gray-700"
            >
              {item.label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
