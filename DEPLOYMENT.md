# Railway 배포 가이드

Podoring WMS를 Railway에 배포하는 방법을 안내합니다.

## 사전 준비

1. **Railway 계정 생성**
   - [Railway](https://railway.app)에 가입
   - GitHub 계정으로 로그인 권장

2. **필수 환경 변수 준비**
   - Supabase URL 및 Anon Key
   - Gemini API Key
   - Google Custom Search API Key 및 CSE ID

## 배포 방법

### 방법 1: Railway CLI를 통한 배포 (권장)

1. **Railway CLI 로그인**
   ```bash
   railway login
   ```
   - 브라우저가 열리면 로그인 진행

2. **새 프로젝트 생성**
   ```bash
   railway init
   ```
   - 프로젝트 이름 입력 (예: podoring-wms)

3. **환경 변수 설정**
   ```bash
   railway variables set SUPABASE_URL="your_supabase_url"
   railway variables set SUPABASE_ANON_KEY="your_supabase_anon_key"
   railway variables set GEMINI_API_KEY="your_gemini_api_key"
   railway variables set GOOGLE_API_KEY="your_google_api_key"
   railway variables set GOOGLE_CSE_ID="your_cse_id"
   railway variables set NODE_ENV="production"
   ```

4. **배포 실행**
   ```bash
   railway up
   ```

5. **도메인 생성**
   ```bash
   railway domain
   ```
   - 또는 Railway Dashboard에서 Settings → Networking → Generate Domain

### 방법 2: GitHub 연동을 통한 배포

1. **GitHub 저장소에 코드 Push**
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push origin main
   ```

2. **Railway Dashboard에서 프로젝트 생성**
   - [Railway Dashboard](https://railway.app/dashboard) 접속
   - "New Project" 클릭
   - "Deploy from GitHub repo" 선택
   - 저장소 선택 (podoring_wms)

3. **환경 변수 설정**
   - Settings → Variables 탭 이동
   - 아래 환경 변수들을 추가:
     ```
     SUPABASE_URL=your_supabase_url
     SUPABASE_ANON_KEY=your_supabase_anon_key
     GEMINI_API_KEY=your_gemini_api_key
     GOOGLE_API_KEY=your_google_api_key
     GOOGLE_CSE_ID=your_cse_id
     NODE_ENV=production
     ```

4. **배포 확인**
   - Deployments 탭에서 배포 진행 상황 확인
   - 배포 완료 후 Settings → Networking에서 도메인 생성

## 배포 설정 파일

프로젝트에는 다음 배포 설정 파일들이 포함되어 있습니다:

- **railway.toml**: Railway 배포 설정
  - Builder: Nixpacks
  - Start Command: `bun run start`
  - Healthcheck: `/api/health`

- **nixpacks.toml**: Bun 환경 빌드 설정
  - Bun 런타임 사용
  - 의존성 설치: `bun install --frozen-lockfile`

## 배포 후 확인사항

1. **헬스체크 확인**
   ```bash
   curl https://your-app.railway.app/api/health
   ```
   응답: `{"status":"ok"}`

2. **Supabase 연결 확인**
   - 로그에서 "Supabase connected successfully" 메시지 확인

3. **대시보드 접속**
   - 배포된 URL로 접속하여 정상 작동 확인

## 트러블슈팅

### 빌드 실패 시
- Railway 로그 확인: Deployments → View Logs
- Bun 버전 호환성 확인
- 환경 변수가 올바르게 설정되었는지 확인

### 런타임 에러 시
- 환경 변수 누락 확인
- Supabase 연결 정보 확인
- Railway 로그에서 에러 메시지 확인

### PORT 이슈
- Railway는 자동으로 PORT 환경 변수를 설정합니다
- 애플리케이션은 `Bun.env.PORT` 또는 3000 포트를 사용합니다

## 로컬 테스트

배포 전 프로덕션 모드로 로컬 테스트:

```bash
NODE_ENV=production bun run start
```

## 비용

Railway는 다음과 같은 요금제를 제공합니다:
- **Free Trial**: $5 크레딧 (약 한 달 사용 가능)
- **Developer Plan**: $5/월 (시작 크레딧) + 사용량 기반
- **Team Plan**: $20/월 + 사용량 기반

자세한 내용: [Railway Pricing](https://railway.app/pricing)

## 참고 링크

- [Railway Documentation](https://docs.railway.app/)
- [Bun Documentation](https://bun.sh/docs)
- [Supabase Documentation](https://supabase.com/docs)
