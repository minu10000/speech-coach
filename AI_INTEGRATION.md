# 🤖 AI API 통합 완료

## 📋 생성된 파일

### 1. `js/api-config.js`
API 설정을 관리하는 파일입니다.

**주요 기능:**
- Gemini API 와 OpenAI API 키 저장/관리
- API 선택 (Gemini 또는 OpenAI)
- API 설정 모달 UI 제어
- localStorage 를 통한 키 저장

**주요 함수:**
```javascript
setGeminiAPIKey(key)        // Gemini API 키 설정
setOpenAIAPIKey(key)        // OpenAI API 키 설정
setCurrentAPI(apiName)      // 현재 API 변경 ('gemini' 또는 'openai')
isAPIKeySet(apiName)        // API 키 설정 여부 확인
openAPISettings()           // API 설정 모달 열기
closeAPISettings()          // API 설정 모달 닫기
saveAPISettings()           // API 설정 저장
resetAPISettings()          // API 설정 초기화
```

---

### 2. `js/ai-feedback.js`
AI 피드백을 생성하는 서비스 파일입니다.

**주요 기능:**
- Gemini API 를 통한 피드백 생성
- OpenAI API 를 통한 피드백 생성
- AI 응답 JSON 파싱
- 피드백 HTML 렌더링

**주요 함수:**
```javascript
AIFeedbackService.generateFeedback(record)  // 메인 함수: AI 피드백 생성
AIFeedbackService.generateWithGemini(record) // Gemini API 사용
AIFeedbackService.generateWithOpenAI(record) // OpenAI API 사용
AIFeedbackService.createFeedbackPrompt(record) // AI 프롬프트 생성
AIFeedbackService.parseFeedbackJSON(text)   // JSON 파싱
AIFeedbackService.renderFeedbackHTML(feedback, record) // HTML 렌더링
generateAIFeedback() // 버튼 클릭 핸들러
```

**프롬프트 예시:**
```javascript
// AI 가 분석할 데이터와 출력 형식을 정의
{
  "overall_comment": "종합 평",
  "strengths": ["강점 1", "강점 2"],
  "weaknesses": [{"category": "...", "issue": "...", "suggestion": "..."}],
  "action_items": [{"title": "...", "description": "..."}],
  "encouragement": "격려 멘트"
}
```

---

## 🎨 수정된 파일

### 1. `feedback.html`
AI 피드백 UI 추가

**추가된 요소:**
- AI 피드백 생성 버튼
- API 상태 배지 (우측 상단)
- AI 피드백 표시 영역
- API 설정 모달
- 관련 CSS 스타일

**새로운 CSS 클래스:**
```css
.api-status-badge          // API 상태 배지
.ai-feedback-card          // AI 피드백 카드
.ai-feedback-generate-btn  // AI 피드백 생성 버튼
.ai-loading               // 로딩 상태
.ai-error                 // 오류 상태
.modal-overlay            // 모달 오버레이
```

---

### 2. `practice.html`
API 설정 스크립트 추가

**변경 사항:**
- `api-config.js` 스크립트 추가

---

### 3. `README.md`
프로젝트 문서 업데이트

**추가된 내용:**
- AI 피드백 기능 설명
- API 키 발급 가이드
- 프로젝트 구조 업데이트
- 사용 팁

---

### 4. `API_SETUP.md` (새 파일)
API 키 설정 상세 가이드

**내용:**
- Gemini API 키 발급 방법 (단계별)
- OpenAI API 키 발급 방법 (단계별)
- API 키 설정 방법
- 사용 요금 안내
- 보안 안내
- 자주 묻는 질문 (FAQ)
- 문제 해결

---

## 🚀 사용 방법

### 1. 기본 사용 흐름

```
1. practice.html 에서 연습 진행
   ↓
2. "결과 저장" 버튼 클릭
   ↓
3. feedback.html 로 자동 이동
   ↓
4. "AI 상세 피드백 생성하기" 버튼 클릭
   ↓
5. AI 가 분석한 상세 피드백 확인
```

### 2. API 키 설정 (첫 사용 시)

```
1. feedback.html 에서 우측 상단 API 상태 배지 클릭
   ↓
2. 모달 창에서 API 선택 (Gemini 또는 OpenAI)
   ↓
3. 해당 API 키 입력
   ↓
4. "저장" 버튼 클릭
   ↓
5. 이제 AI 피드백 사용 가능!
```

---

## 🔑 API 키 발급처

### Gemini API (추천 - 무료)
- **URL**: https://aistudio.google.com/app/apikey
- **무료 한도**: 분당 60 회 요청
- **권장**: 개인 사용자에게 충분

### OpenAI API
- **URL**: https://platform.openai.com/api-keys
- **요금**: 종량제 (gpt-4o-mini: 100 만 토큰당 $0.15)
- **특징**: 고품질 분석

---

## 💡 구현 세부사항

### API 호출 흐름

```javascript
// 1. 사용자가 "AI 피드백 생성" 버튼 클릭
generateAIFeedback()

// 2. 현재 설정된 API 확인
const currentAPI = APIConfig.currentAPI  // 'gemini' 또는 'openai'

// 3. 해당 API 로 피드백 요청
if (currentAPI === 'gemini') {
  await AIFeedbackService.generateWithGemini(record)
} else {
  await AIFeedbackService.generateWithOpenAI(record)
}

// 4. AI 응답을 JSON 으로 파싱
const feedback = AIFeedbackService.parseFeedbackJSON(response)

// 5. HTML 로 렌더링
container.innerHTML = AIFeedbackService.renderFeedbackHTML(feedback, record)
```

### Gemini API 요청 예시

```javascript
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

const requestBody = {
  contents: [{
    parts: [{ text: prompt }]
  }],
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048,
  }
};

const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestBody)
});
```

### OpenAI API 요청 예시

```javascript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a professional speech coach...' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 2048
  })
});
```

---

## 🔒 보안 고려사항

### API 키 저장
- **저장소**: 브라우저 localStorage
- **키 이름**: 
  - `sc_gemini_key` - Gemini API 키
  - `sc_openai_key` - OpenAI API 키
  - `sc_ai_api` - 현재 선택된 API ('gemini' 또는 'openai')

### 보안 주의사항
1. API 키는 클라이언트 (브라우저) 에만 저장됨
2. 서버로 전송되지 않음
3. 사용자가 직접 API 에 요청
4. 타인과 키 공유 금지

---

## 📊 AI 피드백 예시

### 출력 예시

```json
{
  "overall_comment": "전반적으로 훌륭한 스피치입니다. 특히 말하기 속도가 매우 적절했습니다.",
  "strengths": [
    "침묵 비율이 15% 로 매우 낮습니다",
    "분당 165 단어로 최적의 속도를 유지했습니다",
    "추임새가 전혀 없었습니다"
  ],
  "weaknesses": [
    {
      "category": "발음",
      "issue": "일부 단어가 불명확하게 발음되었습니다",
      "description": "받침 발음을 더 명확히 하면 좋습니다"
    }
  ],
  "action_items": [
    {
      "title": "받침 발음 연습",
      "description": "받침이 있는 단어를 의식적으로 또박또박 발음하는 연습을 하루 10 분간 하세요."
    }
  ],
  "encouragement": "이미 훌륭한 실력을 갖추셨습니다. 조금만 더 신경 써보세요!"
}
```

---

## 🎯 다음 단계 (개선 아이디어)

1. **음성 파일 업로드**: 녹음 파일을 AI 에 전송하여 더 정교한 분석
2. **음성 톤 분석**: 피치, 강세,イント네이션 분석
3. **비교 분석**: 이전 연습과 비교하여 성장 추적
4. **맞춤형 연습 프로그램**: 약점 기반 자동 연습 커리큘럼
5. **실시간 코칭**: 연습 중 실시간으로 피드백 제공

---

## ❓ 문제 해결

### "API 키가 설정되지 않았습니다"
- 우측 상단 API 상태 배지 클릭 → API 키 입력 → 저장

### "네트워크 오류"
- 인터넷 연결 확인
- 브라우저 방화벽 확인
- VPN 사용 중이면 해제

### "JSON 파싱 오류"
- AI 응답 형식이 올바르지 않음
- 다시 시도하거나 다른 API 사용

### 요금이 너무 많이 나옴
- Gemini 무료 플랜 사용 (분당 60 회)
- OpenAI 사용량 제한 설정

---

## 📞 지원

문제가 발생하면:
1. 브라우저 콘솔 (F12) 확인
2. API_SETUP.md 참조
3. GitHub 이슈 생성

---

**🎤 AI 와 함께 더 나은 스피치를 만들어보세요!**
