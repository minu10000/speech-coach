// ===== practice.js =====

// 다국어 지원을 위한 헬퍼 함수
function t(key) {
  if (window.i18n && typeof window.i18n.t === 'function') {
    return window.i18n.t(key);
  }
  const fallbacks = {
    'practice-status-ready': '준비',
    'practice-status-recording': '녹음 중',
    'practice-status-complete': '완료',
    'practice-btn-start': '🎤 녹음 시작',
    'practice-btn-stop': '⏹ 녹음 중지',
    'practice-transcript-ph': '녹음을 시작하면 여기에 인식된 텍스트가 표시됩니다...',
    'practice-stat-total': '전체 시간',
    'practice-stat-speak': '발화 시간',
    'practice-stat-silence': '침묵 시간',
    'practice-stat-silence-rate': '침묵 비율',
    'practice-stat-word': '단어 수',
    'practice-stat-wpm': '분당 단어 (WPM)',
    'practice-feedback-title': '분석 결과',
    'practice-audio-title': '🔊 내 녹음 파일',
    'practice-btn-feedback': 'AI 상세 피드백 보기',
    'practice-btn-save': '💾 결과 저장',
    'practice-alert-no-speech': '음성을 인식할 수 없습니다. 다시 시도해주세요.',
    'practice-alert-browser-not-supported': '이 브라우저는 음성 인식을 지원하지 않습니다.\nChrome 브라우저를 사용해 주세요.'
  };
  return fallbacks[key] || key;
}

// IndexedDB 설정 (오디오 저장용)
const DB_NAME = 'SpeechCoachDB';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

let db = null;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };
    
    request.onerror = (e) => {
      reject(e);
    };
  });
}

async function saveAudioToDB(id, audioBlob) {
  if (!db) await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ id: id, audio: audioBlob });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject();
  });
}

async function getAudioFromDB(id) {
  if (!db) await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject();
  });
}

// 데이터베이스 초기화
openDatabase().catch(console.error);

let recognition = null;
let mediaRecorder = null;
let timerInterval = null;
let silenceTimer = null;

let isRecording = false;
let startTime = null;
let totalSeconds = 0;
let speakSeconds = 0;
let silenceSeconds = 0;
let silenceCount = 0;
let isSilent = false;
let silenceStart = null;

let finalTranscript = '';
let interimTranscript = '';
let wordList = [];

// 오디오 재생용 변수
let audioBlob = null;
let audioUrl = null;
let audioElement = null;
let isPlaying = false;
let audioProgressInterval = null;
let currentRecordId = null;

// 음성 인식 언어 (기본값: 한국어)
let speechLanguage = localStorage.getItem('sc_speech_lang') || 'ko-KR';

const SILENCE_THRESHOLD = 3;

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${pad(s)}`;
}

function updateTimerDisplay() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  totalSeconds = elapsed;
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  document.getElementById('timerDisplay').textContent = `${pad(m)}:${pad(s)}`;
  updateStats();
}

function updateStats() {
  document.getElementById('totalTime').textContent = formatTime(totalSeconds);
  document.getElementById('speakTime').textContent = formatTime(speakSeconds);
  document.getElementById('silenceTime').textContent = formatTime(silenceSeconds);

  const rate = totalSeconds > 0 ? Math.round((silenceSeconds / totalSeconds) * 100) : 0;
  document.getElementById('silenceRate').textContent = rate + '%';

  const words = finalTranscript.trim().split(/\s+/).filter(w => w.length > 0);
  document.getElementById('wordCount').textContent = words.length;

  const minutes = totalSeconds / 60;
  const wpm = minutes > 0 ? Math.round(words.length / minutes) : 0;
  document.getElementById('wpm').textContent = wpm;
}

function setStatus(type, text) {
  const badge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  badge.className = 'status-badge status-' + type;
  statusText.textContent = text;
}

function toggleRecording() {
  const btn = document.getElementById('recordBtn');
  
  if (isRecording) {
    // 녹음 중이면 중지
    stopRecording();
  } else {
    // 녹음이 꺼져있으면 시작
    startRecording();
  }
}

async function startRecording() {
  if (isRecording) return; // 이미 녹음 중인 경우 중복 시작 방지
  
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('이 브라우저는 음성 인식을 지원하지 않습니다.\nChrome 브라우저를 사용해 주세요.');
    return;
  }

  isRecording = true;
  startTime = Date.now();
  finalTranscript = '';
  interimTranscript = '';
  speakSeconds = 0;
  silenceSeconds = 0;
  silenceCount = 0;
  isSilent = false;

  // 이전 오디오 초기화
  if (audioElement) {
    audioElement.pause();
    audioElement = null;
  }
  if (audioUrl) {
    URL.revokeObjectURL(audioUrl);
    audioUrl = null;
  }
  audioBlob = null;
  document.getElementById('audioPlayerWrap').classList.remove('show');

  const btn = document.getElementById('recordBtn');
  btn.textContent = '⏹ 녹음 중지';
  btn.classList.remove('btn-primary');
  btn.classList.add('btn-danger');
  document.getElementById('saveSection').style.display = 'none';
  document.getElementById('feedbackBox').style.display = 'none';
  document.getElementById('transcriptText').innerHTML = '<span class="interim">듣고 있습니다...</span>';

  setStatus('recording', '녹음 중');

  timerInterval = setInterval(updateTimerDisplay, 1000);

  startSpeechRecognition();
  startSilenceDetection();
  
  // 오디오 녹음 시작
  startAudioRecording();
}

function startSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  
  // 사용자가 선택한 언어 사용
  recognition.lang = speechLanguage;
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = function (event) {
    interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript + ' ';
        resetSilenceTimer();
      } else {
        interimTranscript += event.results[i][0].transcript;
        resetSilenceTimer();
      }
    }
    renderTranscript();
    updateStats();
  };

  recognition.onerror = function (e) {
    if (e.error === 'no-speech') return;
    console.warn('음성 인식 오류:', e.error);
  };

  recognition.onend = function () {
    if (isRecording) {
      recognition.start();
    }
  };

  recognition.start();
}

function startSilenceDetection() {
  let lastSpeakTime = Date.now();

  function tick() {
    if (!isRecording) return;
    const now = Date.now();
    const elapsed = (now - lastSpeakTime) / 1000;

    if (elapsed >= SILENCE_THRESHOLD) {
      if (!isSilent) {
        isSilent = true;
        silenceStart = lastSpeakTime + SILENCE_THRESHOLD * 1000;
        silenceCount++;
      }
      silenceSeconds = Math.floor((now - silenceStart) / 1000) +
        (isSilent ? 0 : 0);
    } else {
      if (isSilent) {
        isSilent = false;
      }
    }

    updateStats();
    requestAnimationFrame(tick);
  }

  document.addEventListener('sc_speech_detected', function () {
    lastSpeakTime = Date.now();
    if (isSilent) {
      const silenceDuration = (Date.now() - silenceStart) / 1000;
      silenceSeconds += Math.floor(silenceDuration);
      isSilent = false;
    }
  });

  tick();
}

function resetSilenceTimer() {
  speakSeconds = Math.floor((Date.now() - startTime) / 1000) - silenceSeconds;
  document.dispatchEvent(new Event('sc_speech_detected'));
}

// 오디오 녹음 시작
async function startAudioRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    const chunks = [];

    mediaRecorder.ondataavailable = (e) => {
      chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      audioBlob = new Blob(chunks, { type: 'audio/webm' });
      audioUrl = URL.createObjectURL(audioBlob);
      
      // 오디오 플레이어 표시
      const playerWrap = document.getElementById('audioPlayerWrap');
      playerWrap.classList.add('show');
      
      // 오디오 요소 생성
      audioElement = new Audio(audioUrl);
      audioElement.addEventListener('ended', () => {
        isPlaying = false;
        updatePlayPauseIcon();
        clearInterval(audioProgressInterval);
        document.getElementById('audioProgressBar').style.width = '0%';
        document.getElementById('audioTime').textContent = `0:00 / ${formatTime(Math.floor(audioElement.duration))}`;
      });
      
      document.getElementById('audioTime').textContent = `0:00 / ${formatTime(Math.floor(audioElement.duration))}`;
    };

    mediaRecorder.start();
  } catch (err) {
    console.error('오디오 녹음 실패:', err);
  }
}

// 오디오 녹음 중지
function stopAudioRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
}

function renderTranscript() {
  const el = document.getElementById('transcriptText');
  if (!finalTranscript && !interimTranscript) {
    el.innerHTML = '<span class="interim">듣고 있습니다...</span>';
    return;
  }
  el.innerHTML = finalTranscript +
    (interimTranscript ? `<span class="interim">${interimTranscript}</span>` : '');
}

function stopRecording() {
  if (!isRecording) return; // 이미 중지된 경우 중복 실행 방지

  isRecording = false;
  clearInterval(timerInterval);

  if (recognition) {
    recognition.onend = null;
    recognition.stop();
    recognition = null;
  }

  // 오디오 녹음 중지
  stopAudioRecording();

  totalSeconds = Math.floor((Date.now() - startTime) / 1000);
  speakSeconds = totalSeconds - silenceSeconds;
  if (speakSeconds < 0) speakSeconds = 0;

  const btn = document.getElementById('recordBtn');
  btn.textContent = '🎤 녹음 시작';
  btn.classList.remove('btn-danger');
  btn.classList.add('btn-primary');

  setStatus('complete', '완료');
  updateStats();
  showFeedback();

  document.getElementById('saveSection').style.display = 'flex';
}

function showFeedback() {
  const words = finalTranscript.trim().split(/\s+/).filter(w => w.length > 0);
  const wpm = totalSeconds > 0 ? Math.round(words.length / (totalSeconds / 60)) : 0;
  const silenceRate = totalSeconds > 0 ? Math.round((silenceSeconds / totalSeconds) * 100) : 0;

  const fillers = ['음', '어', '그래서', '뭐', '그냥', '근데', '아'];
  let fillerCount = 0;
  fillers.forEach(f => {
    const regex = new RegExp(f, 'g');
    const matches = finalTranscript.match(regex);
    if (matches) fillerCount += matches.length;
  });

  const items = [];

  if (silenceRate <= 20) {
    items.push({ icon: '✅', text: `침묵 비율 ${silenceRate}% - 매우 좋습니다!` });
  } else if (silenceRate <= 40) {
    items.push({ icon: '⚠️', text: `침묵 비율 ${silenceRate}% - 조금 줄여보세요.` });
  } else {
    items.push({ icon: '❌', text: `침묵 비율 ${silenceRate}% - 침묵이 너무 많습니다.` });
  }

  if (wpm >= 150 && wpm <= 200) {
    items.push({ icon: '✅', text: `말하기 속도 ${wpm} WPM - 최적 속도입니다!` });
  } else if (wpm < 100) {
    items.push({ icon: '⚠️', text: `말하기 속도 ${wpm} WPM - 너무 느립니다. 조금 빠르게 말해보세요.` });
  } else if (wpm > 250) {
    items.push({ icon: '⚠️', text: `말하기 속도 ${wpm} WPM - 너무 빠릅니다. 천천히 말해보세요.` });
  } else {
    items.push({ icon: '💡', text: `말하기 속도 ${wpm} WPM - 적정 범위(150~200)에 가깝습니다.` });
  }

  if (fillerCount === 0) {
    items.push({ icon: '✅', text: '습관적 추임새가 감지되지 않았습니다!' });
  } else {
    items.push({ icon: '⚠️', text: `추임새(음, 어, 그래서 등) ${fillerCount}회 감지. 의식적으로 줄여보세요.` });
  }

  if (words.length < 20) {
    items.push({ icon: '💡', text: '발화량이 적습니다. 더 많이 말하는 연습을 해보세요.' });
  } else {
    items.push({ icon: '✅', text: `총 ${words.length}단어 발화 - 충분한 내용을 말했습니다.` });
  }

  // 간단한 분석 결과만 표시하고 상세 피드백은 AI 피드백 페이지로 안내
  const aiFeedbackPrompt = document.getElementById('aiFeedbackPrompt');
  if (aiFeedbackPrompt) {
    aiFeedbackPrompt.style.display = 'block';
  }
}

async function saveResult() {
  const words = finalTranscript.trim().split(/\s+/).filter(w => w.length > 0);
  const wpm = totalSeconds > 0 ? Math.round(words.length / (totalSeconds / 60)) : 0;
  const silenceRate = totalSeconds > 0 ? Math.round((silenceSeconds / totalSeconds) * 100) : 0;

  const fillers = ['음', '어', '그래서', '뭐', '그냥', '근데', '아', '저기', '그러니까'];
  let fillerCount = 0;
  fillers.forEach(f => {
    const regex = new RegExp(f, 'g');
    const matches = finalTranscript.match(regex);
    if (matches) fillerCount += matches.length;
  });

  // 최소 녹음 시간 체크 (5 초 미만 - 경고만 표시)
  if (totalSeconds < 5) {
    showToast({
      type: 'warning',
      title: '녹음 시간이 짧습니다',
      message: '5 초 미만 녹음 (' + totalSeconds + '초) 은 정확한 분석이 어렵습니다. 10 초 이상 말하기를 추천합니다.',
      duration: 4000,
      icon: '⚠️'
    });
    // 저장 계속 진행
  }

  // 단어가 하나도 없는 경우 - 경고만 표시하고 저장 진행
  if (words.length === 0) {
    showToast({
      type: 'warning',
      title: '인식된 음성이 없습니다',
      message: '음성이 인식되지 않았지만 기록은 저장됩니다. 다시 시도하거나 계속 진행하세요.',
      duration: 4000,
      icon: '⚠️'
    });
    // 저장은 계속 진행 (return 제거)
  }

  // 점수 계산 (더 엄격하고 정확하게 - 4 가지 항목 각 25 점)
  let score = 100;

  // 1. 침묵 비율 (25 점 감점)
  if (silenceRate > 50) score -= 25;
  else if (silenceRate > 35) score -= 18;
  else if (silenceRate > 25) score -= 10;
  else if (silenceRate > 15) score -= 5;

  // 2. 말하기 속도 (25 점 감점)
  if (wpm < 80 || wpm > 280) score -= 25;
  else if (wpm < 100 || wpm > 250) score -= 18;
  else if (wpm < 130 || wpm > 220) score -= 10;
  else if (wpm < 150 || wpm > 200) score -= 5;

  // 3. 추임새 (25 점 감점)
  if (fillerCount > 10) score -= 25;
  else if (fillerCount > 6) score -= 18;
  else if (fillerCount > 3) score -= 10;
  else if (fillerCount > 1) score -= 5;

  // 4. 발화량 (25 점 감점)
  if (words.length < 10) score -= 25;
  else if (words.length < 20) score -= 18;
  else if (words.length < 30) score -= 10;
  else if (words.length < 50) score -= 5;

  // 최소 점수 0 점
  score = Math.max(0, Math.min(100, score));

  const record = {
    id: Date.now(),
    date: new Date().toLocaleString('ko-KR'),
    totalTime: totalSeconds,
    speakTime: speakSeconds,
    silenceTime: silenceSeconds,
    silenceRate,
    wordCount: words.length,
    wpm,
    fillerCount,
    score,
    transcript: finalTranscript.trim().slice(0, 500),
  };

  // 오디오 저장
  currentRecordId = record.id;
  if (audioBlob) {
    try {
      await saveAudioToDB(record.id, audioBlob);
    } catch (err) {
      console.error('오디오 저장 실패:', err);
    }
  }

  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (user) {
    saveUserRecord(user.id, record);
    localStorage.setItem('sc_last_record_' + user.id, JSON.stringify(record));
    showToast({
      type: 'success',
      title: '결과가 저장되었습니다!',
      message: 'AI 피드백 페이지에서 상세 분석을 확인하세요.',
      duration: 3000
    });
    setTimeout(() => {
      window.location.href = 'feedback.html';
    }, 1000);
  } else {
    // 게스트 모드 - sessionStorage 에 저장 (창 닫으면 삭제)
    sessionStorage.setItem('sc_guest_record', JSON.stringify(record));
    showToast({
      type: 'info',
      title: '결과가 저장되었습니다',
      message: '게스트 모드 - 창을 닫으면 기록이 삭제됩니다',
      duration: 4000,
      icon: 'lock'
    });
    setTimeout(() => {
      window.location.href = 'feedback.html';
    }, 1500);
  }
}

function resetPractice() {
  if (isRecording) stopRecording();

  // 오디오 초기화
  if (audioElement) {
    audioElement.pause();
    audioElement = null;
  }
  if (audioUrl) {
    URL.revokeObjectURL(audioUrl);
    audioUrl = null;
  }
  audioBlob = null;
  isPlaying = false;
  clearInterval(audioProgressInterval);

  finalTranscript = '';
  interimTranscript = '';
  totalSeconds = 0;
  speakSeconds = 0;
  silenceSeconds = 0;
  silenceCount = 0;

  document.getElementById('timerDisplay').textContent = '00:00';
  document.getElementById('transcriptText').innerHTML = `<span class="transcript-placeholder">${t('practice-transcript-ph')}</span>`;
  const aiFeedbackPrompt = document.getElementById('aiFeedbackPrompt');
  if (aiFeedbackPrompt) aiFeedbackPrompt.style.display = 'none';
  document.getElementById('saveSection').style.display = 'none';
  document.getElementById('audioPlayerWrap').classList.remove('show');
  const btn = document.getElementById('recordBtn');
  btn.textContent = t('practice-btn-start');
  btn.classList.remove('btn-danger');
  btn.classList.add('btn-primary');
  setStatus('ready', t('practice-status-ready'));
  updateStats();
}

// 오디오 재생/일시정지 토글
function toggleAudioPlay() {
  if (!audioElement) return;
  
  if (isPlaying) {
    audioElement.pause();
    isPlaying = false;
    clearInterval(audioProgressInterval);
  } else {
    audioElement.play();
    isPlaying = true;
    updatePlayPauseIcon();
    
    // 진행률 업데이트
    audioProgressInterval = setInterval(() => {
      if (audioElement && !audioElement.paused) {
        const percent = (audioElement.currentTime / audioElement.duration) * 100;
        document.getElementById('audioProgressBar').style.width = percent + '%';
        document.getElementById('audioTime').textContent = 
          `${formatTime(Math.floor(audioElement.currentTime))} / ${formatTime(Math.floor(audioElement.duration))}`;
      }
    }, 100);
  }
  
  updatePlayPauseIcon();
}

// 재생/일시정지 아이콘 업데이트
function updatePlayPauseIcon() {
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  
  if (isPlaying) {
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
  } else {
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
  }
}

// 오디오_seek_기능
function seekAudio(event) {
  if (!audioElement || !audioUrl) return;
  
  const progress = event.currentTarget;
  const rect = progress.getBoundingClientRect();
  const percent = (event.clientX - rect.left) / rect.width;
  
  audioElement.currentTime = percent * audioElement.duration;
  document.getElementById('audioProgressBar').style.width = (percent * 100) + '%';
}
