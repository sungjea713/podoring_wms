import { GoogleGenerativeAI } from "@google/generative-ai"

const apiKey = process.env.GEMINI_API_KEY

if (!apiKey) {
  throw new Error('Missing GEMINI_API_KEY')
}

const genAI = new GoogleGenerativeAI(apiKey)
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

const prompt = `https://www.vivino.com/en/montes-montes-alpha-cabernet-sauvignon/w/71294 이 사이트에서 와인 명, 빈티지, 알콜, 이미지 url을 추출해서 알려줘`

console.log('🤖 Sending prompt to Gemini...')
console.time('⏱️  Gemini Response Time')

const result = await model.generateContent(prompt)
const response = result.response
const text = response.text()

console.timeEnd('⏱️  Gemini Response Time')
console.log('\n📄 Response:')
console.log(text)
