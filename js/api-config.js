// ===== api-config.js =====
// API 설정 관리 (Gemini & OpenAI)

const APIConfig = {
  // 현재 선택된 API ('gemini' 또는 'openai')
  currentAPI: 'gemini',

  // Gemini API 설정
  gemini: {
    apiKey: 'AIzaSyBJBrY9fP36ZVyQbUr4B0fygggXRE_WQpM',
    model: 'gemini-2.0-flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta'
  },
  
  // OpenAI API 설정
  openai: {
    apiKey: '', // 예: 'sk-XXXXXXXXXXXXX'
    model: 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions'
  }
};

// API 키 설정 함수
function setGeminiAPIKey(key) {
  APIConfig.gemini.apiKey = key;
  localStorage.setItem('sc_gemini_key', key);
}

function setOpenAIAPIKey(key) {
  APIConfig.openai.apiKey = key;
  localStorage.setItem('sc_openai_key', key);
}

// 현재 API 변경
function setCurrentAPI(apiName) {
  APIConfig.currentAPI = apiName;
  localStorage.setItem('sc_ai_api', apiName);
}

// API 키 확인
function isAPIKeySet(apiName) {
  if (apiName === 'gemini') {
    return !!APIConfig.gemini.apiKey;
  } else if (apiName === 'openai') {
    return !!APIConfig.openai.apiKey;
  }
  return false;
}

// API 설정 모달 열기
function openAPISettings() {
  const modal = document.getElementById('apiSettingsModal');
  if (modal) {
    document.getElementById('geminiKeyInput').value = APIConfig.gemini.apiKey;
    document.getElementById('openaiKeyInput').value = APIConfig.openai.apiKey;
    document.getElementById('apiSelect').value = APIConfig.currentAPI;
    modal.style.display = 'flex';
    updateAPIStatusUI();
  }
}

// API 설정 모달 닫기
function closeAPISettings() {
  const modal = document.getElementById('apiSettingsModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// API 키 저장
function saveAPISettings() {
  const geminiKey = document.getElementById('geminiKeyInput').value.trim();
  const openaiKey = document.getElementById('openaiKeyInput').value.trim();
  const selectedAPI = document.getElementById('apiSelect').value;

  if (geminiKey) {
    APIConfig.gemini.apiKey = geminiKey;
    localStorage.setItem('sc_gemini_key', geminiKey);
  }
  if (openaiKey) {
    APIConfig.openai.apiKey = openaiKey;
    localStorage.setItem('sc_openai_key', openaiKey);
  }
  setCurrentAPI(selectedAPI);

  closeAPISettings();

  showToast({
    type: 'success',
    title: 'API 설정이 저장되었습니다',
    message: `현재 API: ${selectedAPI === 'gemini' ? 'Gemini' : 'OpenAI'}`,
    duration: 3000
  });
}

// API 설정 초기화
function resetAPISettings() {
  if (confirm('정말 API 키를 모두 삭제하시겠습니까?')) {
    localStorage.removeItem('sc_gemini_key');
    localStorage.removeItem('sc_openai_key');
    localStorage.removeItem('sc_ai_api');
    
    APIConfig.gemini.apiKey = '';
    APIConfig.openai.apiKey = '';
    APIConfig.currentAPI = 'gemini';
    
    document.getElementById('geminiKeyInput').value = '';
    document.getElementById('openaiKeyInput').value = '';
    document.getElementById('apiSelect').value = 'gemini';
    
    showToast({
      type: 'info',
      title: 'API 키가 초기화되었습니다',
      message: '다시 설정해주세요.',
      duration: 3000
    });
  }
}

// API 설정 UI 업데이트
function updateAPIStatusUI() {
  const statusEl = document.getElementById('apiStatus');
  if (!statusEl) return;

  const currentAPI = APIConfig.currentAPI;
  const isSet = isAPIKeySet(currentAPI);
  const apiKey = currentAPI === 'gemini' ? APIConfig.gemini.apiKey : APIConfig.openai.apiKey;
  const maskedKey = apiKey ? apiKey.substring(0, 6) + '****' : '미설정';

  statusEl.innerHTML = `
    <div style="margin-bottom:0.5rem;">
      <strong>${isSet ? '✅' : '⚠️'} ${currentAPI === 'gemini' ? 'Gemini' : 'OpenAI'}</strong>
      ${!isSet ? '<br><span style="color:#ef4444;">API 키가 필요합니다!</span>' : `<br><span style="color:#666;">키: ${maskedKey}</span>`}
    </div>
    <div style="font-size:0.75rem;color:#888;">
      💡 Gemini API 키는 <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:#8b5cf6;">Google AI Studio</a>에서 무료로 발급받을 수 있습니다.
    </div>
  `;
}

// 모달 외부 클릭 시 닫기
document.addEventListener('click', (e) => {
  const modal = document.getElementById('apiSettingsModal');
  if (modal && modal.style.display === 'flex' && e.target === modal) {
    closeAPISettings();
  }
});

// 페이지 로드 시 API 상태 확인
document.addEventListener('DOMContentLoaded', () => {
  // 하드코딩된 API 키를 무조건 사용 (localStorage 덮어쓰기 방지)
  APIConfig.gemini.apiKey = 'AIzaSyBJBrY9fP36ZVyQbUr4B0fygggXRE_WQpM';
  localStorage.setItem('sc_gemini_key', APIConfig.gemini.apiKey);

  const savedAPI = localStorage.getItem('sc_ai_api');
  if (savedAPI) APIConfig.currentAPI = savedAPI;

  console.log('[API Config] Current API:', APIConfig.currentAPI);
  console.log('[API Config] Gemini key set:', !!APIConfig.gemini.apiKey);
});
