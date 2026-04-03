// ===== ai-feedback.js =====
// AI 피드백 생성 서비스 (Gemini & OpenAI 지원)

const AIFeedbackService = {
  // AI 피드백 생성 (메인 함수)
  async generateFeedback(record) {
    const currentAPI = APIConfig.currentAPI;
    
    if (currentAPI === 'gemini') {
      return await this.generateWithGemini(record);
    } else {
      return await this.generateWithOpenAI(record);
    }
  },

  // Gemini API 로 피드백 생성 (재시도 로직 포함)
  async generateWithGemini(record, retryCount = 0) {
    const apiKey = APIConfig.gemini.apiKey;
    if (!apiKey || apiKey === '') {
      throw new Error('Gemini API 키가 설정되지 않았습니다. 상단 설정 아이콘에서 API 키를 입력해주세요.');
    }

    const prompt = this.createFeedbackPrompt(record);
    
    // 모델명 수정
    const model = APIConfig.gemini.model || 'gemini-1.5-flash-latest';
    const url = `${APIConfig.gemini.endpoint}/models/${model}:generateContent?key=${apiKey}`;
    
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMsg = error.error?.message || '알 수 없는 오류';
        
        // 쿼터 초과 시 재시도 또는 대체 모델 시도
        if (errorMsg.includes('Quota exceeded') || errorMsg.includes('rate limit')) {
          if (retryCount < 2) {
            const waitTime = Math.pow(2, retryCount) * 3000; // 지수 백오프: 3 초, 6 초
            console.log(`쿼터 초과. ${waitTime/1000}초 후 재시도... (${retryCount + 1}/2)`);
            
            // 사용자에게 알림
            if (retryCount === 0) {
              showToast({
                type: 'warning',
                title: 'API 쿼터 초과',
                message: `${waitTime/1000}초 후 재시도합니다...`,
                duration: 3000
              });
            }
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return await this.generateWithGemini(record, retryCount + 1);
          } else {
            throw new Error('Gemini API 쿼터 초과. 잠시 후 다시 시도하거나 OpenAI API 사용을 권장합니다.');
          }
        }
        
        throw new Error(`Gemini API 오류: ${errorMsg}`);
      }

      const data = await response.json();
      const feedback = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!feedback) {
        throw new Error('AI 가 피드백을 생성하지 못했습니다.');
      }

      return this.parseFeedbackJSON(feedback);
      
    } catch (error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('네트워크 오류입니다. 인터넷 연결을 확인하세요.');
      }
      throw error;
    }
  },

  // OpenAI API 로 피드백 생성
  async generateWithOpenAI(record) {
    const apiKey = APIConfig.openai.apiKey;
    if (!apiKey) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }

    const prompt = this.createFeedbackPrompt(record);
    
    const response = await fetch(APIConfig.openai.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: APIConfig.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional speech coach. Analyze the user\'s speech data and provide detailed, actionable feedback in Korean. Always respond with valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API 오류: ${error.error?.message || '알 수 없는 오류'}`);
    }

    const data = await response.json();
    const feedback = data.choices?.[0]?.message?.content;
    
    if (!feedback) {
      throw new Error('AI 가 피드백을 생성하지 못했습니다.');
    }

    return this.parseFeedbackJSON(feedback);
  },

  // AI 피드백 프롬프트 생성 (점수 측정 포함)
  createFeedbackPrompt(record) {
    const noSpeech = record.wordCount === 0 || record.transcript.trim() === '';
    
    return `
당신은 전문 스피치 코치입니다. 아래 speech practice 데이터를 분석하여 **상세한 피드백과 점수**를 제공해주세요.

## 분석 데이터
- **녹음 날짜**: ${record.date}
- **전체 시간**: ${record.totalTime}초
- **발화 시간**: ${record.speakTime}초
- **침묵 시간**: ${record.silenceTime}초
- **침묵 비율**: ${record.silenceRate}%
- **분당 단어 (WPM)**: ${record.wpm}
- **총 단어 수**: ${record.wordCount}개
- **추임새 (음, 어 등)**: ${record.fillerCount}회
- **인식된 텍스트**: "${record.transcript || '음성 인식 안됨'}"

${noSpeech ? 
'⚠️ 주의: 음성이 제대로 인식되지 않았습니다. 모든 점수를 0 점으로 처리하고 마이크 설정 확인을 안내해주세요.'
: ''}

## 점수 채점 기준 (총 100 점)

### 1. 침묵 관리 (25 점)
- 0-15%: 25 점 (완벽)
- 16-25%: 20 점 (좋음)
- 26-35%: 15 점 (보통)
- 36-50%: 10 점 (개선 필요)
- 51% 이상: 5 점 (심각)

### 2. 말하기 속도 (25 점)
- 150-200 WPM: 25 점 (최적)
- 130-149 또는 201-220 WPM: 20 점 (좋음)
- 100-129 또는 221-250 WPM: 15 점 (보통)
- 80-99 또는 251-280 WPM: 10 점 (개선 필요)
- 80 미만 또는 280 초과: 5 점 (심각)

### 3. 언어 습관 (25 점)
- 0 회: 25 점 (완벽)
- 1-2 회: 20 점 (좋음)
- 3-5 회: 15 점 (보통)
- 6-10 회: 10 점 (개선 필요)
- 11 회 이상: 5 점 (심각)

### 4. 발음/발화량 (25 점)
- 100 단어 이상: 25 점 (완벽)
- 60-99 단어: 20 점 (좋음)
- 30-59 단어: 15 점 (보통)
- 10-29 단어: 10 점 (개선 필요)
- 10 단어 미만: 5 점 (심각)

## 출력 형식 (반드시 JSON 으로 응답)
다음과 같은 JSON 형식으로만 응답하세요. 다른 설명은 절대 포함하지 마세요.

{
  "scores": {
    "overall": 0~100,
    "silence": 0~25,
    "speed": 0~25,
    "filler": 0~25,
    "words": 0~25
  },
  "overall_comment": "종합 점수에 대한 총평 (2-3 문장)",
  "strengths": ["강점 1", "강점 2", "강점 3"],
  "weaknesses": [
    {
      "category": "침묵|속도|추임새|발음",
      "issue": "발견된 문제",
      "suggestion": "구체적인 개선 방법"
    }
  ],
  "action_items": [
    {
      "title": "연습 제목",
      "description": "구체적인 연습 방법 (50 자 이상)"
    }
  ],
  "encouragement": "사용자를 격려하는 마지막 멘트 (1-2 문장)"
}

## 중요
1. **반드시 객관적으로 채점**하세요
2. **JSON 형식만 출력**하세요 (다른 설명 금지)
3. **한국어로 답변**하세요
4. 음성이 인식되지 않으면 모든 점수를 0 으로 처리하세요

JSON 만 출력하세요.
`.trim();
  },

  // AI 응답 파싱 (JSON 추출)
  parseFeedbackJSON(text) {
    try {
      // 코드 블록 마크다운 제거 (```json ... ```)
      let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // 첫 번째 { 부터 마지막 } 까지 추출
      const startIdx = cleaned.indexOf('{');
      const endIdx = cleaned.lastIndexOf('}');
      
      if (startIdx === -1 || endIdx === -1) {
        throw new Error('JSON 형식을 찾을 수 없습니다.');
      }
      
      const jsonStr = cleaned.substring(startIdx, endIdx + 1);
      const parsed = JSON.parse(jsonStr);
      
      // 유효성 검사
      if (!parsed.overall_comment || !parsed.strengths || !parsed.action_items) {
        throw new Error('필수 필드가 누락되었습니다.');
      }
      
      return parsed;
    } catch (e) {
      console.error('JSON 파싱 오류:', e, '원본:', text);
      throw new Error('AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.');
    }
  },

  // 피드백 HTML 렌더링 (AI 점수 사용)
  renderFeedbackHTML(feedback, record) {
    const noSpeech = record.wordCount === 0 || record.transcript.trim() === '';
    
    // AI 가 매긴 점수 사용
    const scores = feedback.scores || {
      overall: record.score || 0,
      silence: Math.round((record.silenceRate <= 20 ? 25 : record.silenceRate <= 40 ? 20 : 15)),
      speed: Math.round((record.wpm >= 150 && record.wpm <= 200 ? 25 : record.wpm >= 100 && record.wpm <= 250 ? 20 : 15)),
      filler: Math.round((record.fillerCount === 0 ? 25 : record.fillerCount <= 5 ? 20 : 15)),
      words: Math.round((record.wordCount >= 100 ? 25 : record.wordCount >= 50 ? 20 : 15))
    };
    
    // 25 점 만점을 100 점으로 변환
    const silenceScore100 = Math.round((scores.silence / 25) * 100);
    const speedScore100 = Math.round((scores.speed / 25) * 100);
    const fillerScore100 = Math.round((scores.filler / 25) * 100);
    const wordsScore100 = Math.round((scores.words / 25) * 100);

    if (noSpeech) {
      return `
        <div class="ai-feedback-card">
          <div class="ai-feedback-header">
            <span class="ai-badge">⚠️ 음성 인식 안됨</span>
          </div>
          <div class="ai-feedback-content">
            <p><strong>음성이 제대로 인식되지 않았습니다.</strong></p>
            <ul>
              <li>마이크가 제대로 연결되었는지 확인하세요.</li>
              <li>브라우저에서 마이크 권한을 허용하세요.</li>
              <li>조금 더 크고 명확한 소리로 말해주세요.</li>
              <li>준비가 되면 다시 연습하기를 눌러 녹음을 시작하세요.</li>
            </ul>
          </div>
        </div>
      `;
    }

    const strengthsHTML = feedback.strengths.map(s => 
      `<li class="strength-item">✅ ${s}</li>`
    ).join('');

    const weaknessesHTML = (feedback.weaknesses || []).map(w => `
      <div class="weakness-item">
        <div class="weakness-header">
          <span class="weakness-category">${w.category}</span>
          <strong>${w.issue}</strong>
        </div>
        <div class="weakness-suggestion">💡 ${w.suggestion}</div>
      </div>
    `).join('');

    const actionItemsHTML = feedback.action_items.map((item, i) => `
      <div class="action-item">
        <div class="act-num">${i + 1}</div>
        <div class="act-content">
          <strong>${item.title}</strong>
          <p>${item.description}</p>
        </div>
      </div>
    `).join('');

    return `
      <div class="ai-feedback-card">
        <div class="ai-feedback-header">
          <div>
            <span class="ai-badge">🤖 AI 분석 완료</span>
            <span class="ai-model-badge">${APIConfig.currentAPI === 'gemini' ? 'Gemini' : 'OpenAI'}</span>
          </div>
          <div style="text-align:right;">
            <div style="font-size:2rem;font-weight:900;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${scores.overall}점</div>
            <div style="font-size:0.75rem;color:var(--text-dim);">AI 채점</div>
          </div>
        </div>
        
        <!-- AI 채점 상세 -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.8rem;margin-bottom:1.5rem;">
          <div style="background:rgba(123,99,248,0.1);border-radius:12px;padding:1rem;text-align:center;">
            <div style="font-size:0.7rem;color:var(--text-dim);margin-bottom:0.3rem;">침묵 관리</div>
            <div style="font-size:1.3rem;font-weight:900;color:#a78bfa;">${scores.silence}/25</div>
          </div>
          <div style="background:rgba(168,85,247,0.1);border-radius:12px;padding:1rem;text-align:center;">
            <div style="font-size:0.7rem;color:var(--text-dim);margin-bottom:0.3rem;">말하기 속도</div>
            <div style="font-size:1.3rem;font-weight:900;color:#c084fc;">${scores.speed}/25</div>
          </div>
          <div style="background:rgba(139,92,246,0.1);border-radius:12px;padding:1rem;text-align:center;">
            <div style="font-size:0.7rem;color:var(--text-dim);margin-bottom:0.3rem;">언어 습관</div>
            <div style="font-size:1.3rem;font-weight:900;color:#8b5cf6;">${scores.filler}/25</div>
          </div>
          <div style="background:rgba(147,51,234,0.1);border-radius:12px;padding:1rem;text-align:center;">
            <div style="font-size:0.7rem;color:var(--text-dim);margin-bottom:0.3rem;">발음/발화량</div>
            <div style="font-size:1.3rem;font-weight:900;color:#a855f7;">${scores.words}/25</div>
          </div>
        </div>
        
        <div class="ai-feedback-section">
          <div class="ai-section-title">📊 종합 평가</div>
          <p class="ai-overall-comment">${feedback.overall_comment}</p>
        </div>
        
        <div class="ai-feedback-section">
          <div class="ai-section-title">✅ 잘한 점</div>
          <ul class="ai-strengths-list">
            ${strengthsHTML}
          </ul>
        </div>
        
        ${(feedback.weaknesses || []).length > 0 ? `
        <div class="ai-feedback-section">
          <div class="ai-section-title">⚠️ 개선이 필요한 점</div>
          <div class="ai-weaknesses-list">
            ${weaknessesHTML}
          </div>
        </div>
        ` : ''}
        
        <div class="ai-feedback-section">
          <div class="ai-section-title">🎯 이번 주 연습 목표</div>
          <div class="ai-action-items">
            ${actionItemsHTML}
          </div>
        </div>
        
        <div class="ai-feedback-section ai-encouragement">
          <p>${feedback.encouragement}</p>
        </div>
      </div>
    `;
  }
};

// 피드백 생성 버튼 핸들러
async function generateAIFeedback() {
  const btn = document.getElementById('generateAIFeedbackBtn');
  const container = document.getElementById('aiFeedbackContainer');
  
  if (!btn || !container) return;
  
  // API 키 확인
  const currentAPI = APIConfig.currentAPI;
  if (!isAPIKeySet(currentAPI)) {
    showToast({
      type: 'warning',
      title: 'API 키 필요',
      message: `${currentAPI === 'gemini' ? 'Gemini' : 'OpenAI'} API 키를 설정해주세요.`,
      duration: 4000,
      icon: '🔑'
    });
    openAPISettings();
    return;
  }
  
  // 로딩 상태
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> AI 분석 중...';
  container.innerHTML = `
    <div class="ai-loading">
      <div class="ai-loading-spinner"></div>
      <p>음성을 분석하고 있습니다...</p>
      <p class="ai-loading-sub">약 5-10 초 소요</p>
    </div>
  `;
  
  try {
    // 데이터 가져오기
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const recordKey = user ? 'sc_last_record_' + user.id : 'sc_guest_record';
    const recordStorage = user ? localStorage : sessionStorage;
    const record = JSON.parse(recordStorage.getItem(recordKey) || 'null');
    
    if (!record) {
      throw new Error('분석할 데이터가 없습니다. 먼저 연습을 진행해주세요.');
    }
    
    // AI 피드백 생성
    const feedback = await AIFeedbackService.generateFeedback(record);
    
    // AI 피드백을 전역 변수에 저장 (feedback.js 에서 사용)
    window.aiGeneratedFeedback = feedback;
    
    // HTML 렌더링
    container.innerHTML = AIFeedbackService.renderFeedbackHTML(feedback, record);
    
    // 기존 피드백 페이지도 업데이트 (점수 반영)
    if (typeof renderFeedback === 'function') {
      renderFeedback();
    }
    
    // 버튼 원복
    btn.innerHTML = '🔄 다시 생성';
    btn.disabled = false;
    
    showToast({
      type: 'success',
      title: 'AI 피드백 생성 완료',
      message: '상세 분석을 확인하세요.',
      duration: 3000
    });
    
  } catch (error) {
    console.error('AI 피드백 오류:', error);
    container.innerHTML = `
      <div class="ai-error">
        <span class="ai-error-icon">❌</span>
        <p><strong>피드백 생성 실패</strong></p>
        <p>${error.message}</p>
        <button onclick="generateAIFeedback()" class="btn btn-primary btn-sm">다시 시도</button>
      </div>
    `;
    btn.disabled = false;
    btn.innerHTML = '🎤 AI 피드백 생성';
    
    showToast({
      type: 'error',
      title: 'AI 피드백 실패',
      message: error.message,
      duration: 5000
    });
  }
}

// 다국어 지원용 헬퍼
function t(key) {
  if (window.i18n && typeof window.i18n.t === 'function') {
    return window.i18n.t(key);
  }
  return key;
}
