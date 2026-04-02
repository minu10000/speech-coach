// ===== api-config.js =====
// API 설정 관리 (Gemini & OpenAI)

const APIConfig = {
  // 현재 선택된 API ('gemini' 또는 'openai')
  currentAPI: 'gemini',
  
  // Gemini API 설정
  gemini: {
    apiKey: '여기에_새_API_키_붙여넣기',
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
    modal.classList.add('show');
  }
}

// API 설정 모달 닫기
function closeAPISettings() {
  const modal = document.getElementById('apiSettingsModal');
  if (modal) {
    modal.classList.remove('show');
  }
}

// API 키 저장
function saveAPISettings() {
  const geminiKey = document.getElementById('geminiKeyInput').value.trim();
  const openaiKey = document.getElementById('openaiKeyInput').value.trim();
  const selectedAPI = document.getElementById('apiSelect').value;
  
  if (geminiKey) setGeminiAPIKey(geminiKey);
  if (openaiKey) setOpenAIAPIKey(openaiKey);
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
  
  statusEl.innerHTML = `
    <span class="api-status-badge ${isSet ? 'status-connected' : 'status-disconnected'}">
      ${isSet ? '✅' : '⚠️'} ${currentAPI === 'gemini' ? 'Gemini' : 'OpenAI'}
      ${!isSet ? ' (API 키 필요)' : ''}
    </span>
  `;
  
  statusEl.onclick = openAPISettings;
  statusEl.style.cursor = 'pointer';
}

// 페이지 로드 시 API 상태 확인
document.addEventListener('DOMContentLoaded', () => {
  updateAPIStatusUI();
});
