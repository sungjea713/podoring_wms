/**
 * OpenAI API 테스트 스크립트
 * 간단한 질문을 하고 답변을 받아봅니다
 */

import OpenAI from 'openai'

// .env.local에서 API 키 로드
const apiKey = process.env.OPENAI_API_KEY

console.log('🔑 OpenAI API 키 확인...')
console.log(`   키 앞부분: ${apiKey?.slice(0, 20)}...`)
console.log(`   키 뒷부분: ...${apiKey?.slice(-10)}`)
console.log('')

if (!apiKey) {
  console.error('❌ OPENAI_API_KEY 환경 변수가 설정되지 않았습니다!')
  console.error('   .env.local 파일을 확인해주세요.')
  process.exit(1)
}

const openai = new OpenAI({
  apiKey: apiKey,
})

async function testOpenAI() {
  try {
    console.log('📤 OpenAI API에 질문 보내는 중...')
    console.log('   질문: "What is 2+2?"')
    console.log('')

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: 'What is 2+2? Please answer in one sentence.',
        },
      ],
      max_tokens: 50,
    })

    console.log('✅ 응답 받음!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`답변: ${response.choices[0].message.content}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('✅ OpenAI API 키가 정상적으로 작동합니다!')
    console.log('')
    console.log('📊 응답 정보:')
    console.log(`   모델: ${response.model}`)
    console.log(`   사용 토큰: ${response.usage?.total_tokens}`)
    console.log(`   완료 이유: ${response.choices[0].finish_reason}`)

  } catch (error: any) {
    console.error('❌ OpenAI API 오류 발생!')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    if (error.status === 401) {
      console.error('🔐 인증 오류 (401): API 키가 유효하지 않습니다')
      console.error(`   에러 메시지: ${error.message}`)
      console.error('')
      console.error('💡 해결 방법:')
      console.error('   1. https://platform.openai.com/api-keys 에서 새 API 키 생성')
      console.error('   2. .env.local 파일의 OPENAI_API_KEY 업데이트')
      console.error('   3. 이 스크립트를 다시 실행')
    } else if (error.status === 429) {
      console.error('⏱️  요청 제한 초과 (429): 너무 많은 요청을 보냈습니다')
      console.error(`   에러 메시지: ${error.message}`)
    } else if (error.status === 402) {
      console.error('💳 결제 필요 (402): 계정에 크레딧이 부족합니다')
      console.error(`   에러 메시지: ${error.message}`)
      console.error('')
      console.error('💡 해결 방법:')
      console.error('   1. https://platform.openai.com/account/billing 에서 결제 수단 추가')
      console.error('   2. 크레딧 충전')
    } else {
      console.error(`❓ 알 수 없는 오류 (${error.status}):`)
      console.error(`   에러 메시지: ${error.message}`)
      console.error('')
      console.error('전체 오류 정보:')
      console.error(error)
    }

    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    process.exit(1)
  }
}

// 테스트 실행
console.log('🧪 OpenAI API 테스트 시작')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('')

testOpenAI()
