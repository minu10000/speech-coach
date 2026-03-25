// ===== stats-detail.js =====
// 다국어 지원용 헬퍼 함수
function t(key) {
  if (window.i18n && typeof window.i18n.t === 'function') {
    return window.i18n.t(key);
  }
  const fallbacks = {
    'detail-stat-silence': '침묵 비율',
    'detail-stat-wpm': '분당 단어 수',
    'detail-stat-words': '단어',
    'detail-stat-fillers': '습관어',
    'detail-chart-title': '영역별 점수',
    'detail-audio-title': '🔊 녹음 파일',
    'detail-transcript-title': '📝 인식된 텍스트',
    'detail-action-title': '📌 개선 제안',
    'detail-category-silence': '침묵 관리',
    'detail-category-speed': '말하기 속도',
    'detail-category-filler': '언어 습관',
    'detail-category-words': '발음/발화량'
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

let currentRecord = null;
let compareRecord = null;
let radarChartInstance = null;
let audioElement = null;
let audioUrl = null;
let isPlaying = false;
let audioProgressInterval = null;

// URL 에서 recordId 가져오기
function getRecordIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatTime(sec) {
  if (!sec || sec < 60) return (sec || 0) + '초';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}분 ${s > 0 ? s + '초' : ''}`;
}

function getGradeInfo(score) {
  if (score >= 90) return { label: '완벽 (전문가 수준)', cls: 'badge-success', color: '#10b981' };
  if (score >= 80) return { label: '우수', cls: 'badge-primary', color: '#6366f1' };
  if (score >= 70) return { label: '양호', cls: 'badge-primary', color: '#6366f1' };
  if (score >= 60) return { label: '보통', cls: 'badge-warning', color: '#f59e0b' };
  return { label: '연습 필요', cls: 'badge-danger', color: '#ef4444' };
}

function getCategoryScore(value, type) {
  if (type === 'silence') {
    if (value <= 20) return 100;
    if (value <= 35) return 75;
    if (value <= 50) return 50;
    return 25;
  }
  if (type === 'speed') {
    if (value >= 150 && value <= 200) return 100;
    if (value >= 120 && value <= 230) return 75;
    if (value >= 90 && value <= 260) return 50;
    return 25;
  }
  if (type === 'filler') {
    if (value === 0) return 100;
    if (value <= 2) return 80;
    if (value <= 5) return 55;
    return 30;
  }
  if (type === 'words') {
    if (value >= 100) return 100;
    if (value >= 60) return 80;
    if (value >= 30) return 60;
    return 40;
  }
  return 50;
}

function getScoreColor(score) {
  if (score >= 90) return '#10b981';
  if (score >= 80) return '#6366f1';
  if (score >= 70) return '#8b5cf6';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function loadRecords() {
  const user = getCurrentUser();
  if (user) {
    return getUserRecords(user.id);
  }
  // 게스트 모드 - sessionStorage 에서 읽기
  const guestRecord = sessionStorage.getItem('sc_guest_record');
  return guestRecord ? [JSON.parse(guestRecord)] : [];
}

function createRadarChart(ctx, scores, label) {
  if (radarChartInstance) {
    radarChartInstance.destroy();
  }

  const labels = [
    t('detail-category-silence') || '침묵 관리',
    t('detail-category-speed') || '말하기 속도',
    t('detail-category-filler') || '언어 습관',
    t('detail-category-words') || '발음/발화량'
  ];
  const data = [scores.silence, scores.speed, scores.filler, scores.words];
  const bgColor = getScoreColor(scores.overall);

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [{
        label: label || '내 점수',
        data: data,
        backgroundColor: bgColor + '33',
        borderColor: bgColor,
        pointBackgroundColor: bgColor,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: bgColor,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: { color: 'rgba(139, 92, 246, 0.2)' },
          grid: { color: 'rgba(139, 92, 246, 0.15)' },
          pointLabels: { color: '#e2e8f0', font: { size: 12, weight: '600' } },
          ticks: {
            backdropColor: 'transparent',
            color: 'rgba(255, 255, 255, 0.5)',
            stepSize: 20,
            max: 100
          },
          suggestedMin: 0,
          suggestedMax: 100
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#e2e8f0',
          bodyColor: '#e2e8f0',
          borderColor: 'rgba(139, 92, 246, 0.5)',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return context.parsed.r + '점';
            }
          }
        }
      },
      animation: { duration: 1500, easing: 'easeOutQuart' }
    }
  });
}

function createCompareChart(ctx, scores1, scores2) {
  if (radarChartInstance) {
    radarChartInstance.destroy();
  }

  const labels = [
    t('detail-category-silence') || '침묵 관리',
    t('detail-category-speed') || '말하기 속도',
    t('detail-category-filler') || '언어 습관',
    t('detail-category-words') || '발음/발화량'
  ];

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [
        {
          label: '현재 기록',
          data: [scores1.silence, scores1.speed, scores1.filler, scores1.words],
          backgroundColor: 'rgba(123, 99, 248, 0.2)',
          borderColor: '#6366f1',
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#fff',
          borderWidth: 2,
          pointRadius: 4
        },
        {
          label: '비교 기록',
          data: [scores2.silence, scores2.speed, scores2.filler, scores2.words],
          backgroundColor: 'rgba(244, 98, 106, 0.2)',
          borderColor: '#f4626a',
          pointBackgroundColor: '#f4626a',
          pointBorderColor: '#fff',
          borderWidth: 2,
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: { color: 'rgba(139, 92, 246, 0.2)' },
          grid: { color: 'rgba(139, 92, 246, 0.15)' },
          pointLabels: { color: '#e2e8f0', font: { size: 12, weight: '600' } },
          ticks: {
            backdropColor: 'transparent',
            color: 'rgba(255, 255, 255, 0.5)',
            stepSize: 20,
            max: 100
          },
          suggestedMin: 0,
          suggestedMax: 100
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: '#e2e8f0', usePointStyle: true }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#e2e8f0',
          bodyColor: '#e2e8f0',
          borderColor: 'rgba(139, 92, 246, 0.5)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ' + context.parsed.r + '점';
            }
          }
        }
      }
    }
  });
}

function toggleAudioPlay() {
  if (!audioElement) return;
  
  if (isPlaying) {
    audioElement.pause();
    isPlaying = false;
    clearInterval(audioProgressInterval);
    updatePlayPauseIcon();
  } else {
    audioElement.play();
    isPlaying = true;
    updatePlayPauseIcon();
    
    audioProgressInterval = setInterval(() => {
      if (audioElement && !audioElement.paused) {
        const percent = (audioElement.currentTime / audioElement.duration) * 100;
        document.getElementById('audioProgressBar').style.width = percent + '%';
        document.getElementById('audioTime').textContent = 
          `${formatTime(Math.floor(audioElement.currentTime))} / ${formatTime(Math.floor(audioElement.duration))}`;
      }
    }, 100);
  }
}

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

function seekAudio(event) {
  if (!audioElement) return;
  
  const progress = event.currentTarget;
  const rect = progress.getBoundingClientRect();
  const percent = (event.clientX - rect.left) / rect.width;
  
  audioElement.currentTime = percent * audioElement.duration;
  document.getElementById('audioProgressBar').style.width = (percent * 100) + '%';
}

function selectCompareRecord() {
  const records = loadRecords();
  const currentId = parseInt(getRecordIdFromUrl());

  // 새로운 모달 사용
  showCompareModal(records, currentId, function(selectedRecord) {
    compareRecord = selectedRecord;
    renderCompareSection();
  });
}

function renderCompareSection() {
  if (!compareRecord) return;
  
  const container = document.getElementById('compareSection');
  if (!container) return;
  
  const silenceScore1 = getCategoryScore(currentRecord.silenceRate, 'silence');
  const speedScore1 = getCategoryScore(currentRecord.wpm, 'speed');
  const fillerScore1 = getCategoryScore(currentRecord.fillerCount, 'filler');
  const wordsScore1 = getCategoryScore(currentRecord.wordCount, 'words');
  
  const silenceScore2 = getCategoryScore(compareRecord.silenceRate, 'silence');
  const speedScore2 = getCategoryScore(compareRecord.wpm, 'speed');
  const fillerScore2 = getCategoryScore(compareRecord.fillerCount, 'filler');
  const wordsScore2 = getCategoryScore(compareRecord.wordCount, 'words');
  
  container.innerHTML = `
    <div class="chart-wrap">
      <div class="chart-title">📊 기록 비교</div>
      <div class="chart-container">
        <canvas id="compareChart"></canvas>
      </div>
    </div>
    
    <div class="detail-grid">
      <div class="stat-card">
        <div class="stat-title">현재 기록</div>
        <div style="font-size:1.1rem;font-weight:700;margin-bottom:0.5rem;">${currentRecord.date}</div>
        <div style="font-size:0.85rem;color:var(--text-dim);line-height:1.8;">
          <div>점수: <strong style="color:var(--text);">${currentRecord.score}점</strong></div>
          <div>시간: ${formatTime(currentRecord.totalTime)}</div>
          <div>단어: ${currentRecord.wordCount}개</div>
          <div>WPM: ${currentRecord.wpm}</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-title">비교 기록</div>
        <div style="font-size:1.1rem;font-weight:700;margin-bottom:0.5rem;">${compareRecord.date}</div>
        <div style="font-size:0.85rem;color:var(--text-dim);line-height:1.8;">
          <div>점수: <strong style="color:var(--text);">${compareRecord.score}점</strong></div>
          <div>시간: ${formatTime(compareRecord.totalTime)}</div>
          <div>단어: ${compareRecord.wordCount}개</div>
          <div>WPM: ${compareRecord.wpm}</div>
        </div>
      </div>
    </div>
  `;
  
  // 비교 차트 생성
  setTimeout(() => {
    const ctx = document.getElementById('compareChart');
    if (ctx) {
      createCompareChart(ctx,
        { silence: silenceScore1, speed: speedScore1, filler: fillerScore1, words: wordsScore1, overall: currentRecord.score },
        { silence: silenceScore2, speed: speedScore2, filler: fillerScore2, words: wordsScore2, overall: compareRecord.score }
      );
    }
  }, 100);
}

function renderDetail() {
  const recordId = parseInt(getRecordIdFromUrl());
  const records = loadRecords();
  
  currentRecord = records.find(r => r.id === recordId);
  
  if (!currentRecord) {
    document.getElementById('detailContent').innerHTML = `
      <div class="empty-state" style="text-align:center;padding:5rem 2rem;color:var(--text-dim);">
        <div style="font-size:3.5rem;opacity:0.4;margin-bottom:1rem;">📊</div>
        <h3>기록을 찾을 수 없습니다</h3>
        <p>삭제되었거나 존재하지 않는 기록입니다.</p>
        <a href="stats.html" class="btn btn-primary" style="margin-top:1rem;">기록 목록으로</a>
      </div>
    `;
    document.getElementById('compareBar').style.display = 'none';
    return;
  }
  
  const grade = getGradeInfo(currentRecord.score);
  const silenceScore = getCategoryScore(currentRecord.silenceRate, 'silence');
  const speedScore = getCategoryScore(currentRecord.wpm, 'speed');
  const fillerScore = getCategoryScore(currentRecord.fillerCount, 'filler');
  const wordsScore = getCategoryScore(currentRecord.wordCount, 'words');
  
  document.getElementById('detailContent').innerHTML = `
    <!-- 종합 점수 -->
    <div class="score-card">
      <div class="score-label">종합 점수</div>
      <div class="score-number">${currentRecord.score}</div>
      <div class="score-max">/ 100 점</div>
      <span class="score-grade badge ${grade.cls}">${grade.label}</span>
      <div style="margin-top:1rem;font-size:0.85rem;color:var(--text-dim);">${currentRecord.date} 연습</div>
    </div>
    
    <!-- 레이더 차트 -->
    <div class="chart-wrap">
      <div class="chart-title">영역별 분석</div>
      <div class="chart-container">
        <canvas id="radarChart"></canvas>
      </div>
    </div>
    
    <!-- 상세 통계 -->
    <div class="detail-grid">
      <div class="stat-card">
        <div class="stat-title">🤫 침묵 관리</div>
        <div class="stat-value" style="color:${getScoreColor(silenceScore)}">${silenceScore}점</div>
        <div class="stat-desc">
          침묵 비율: ${currentRecord.silenceRate}%<br>
          침묵 시간: ${formatTime(currentRecord.silenceTime)}<br>
          발화 시간: ${formatTime(currentRecord.speakTime)}
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-title">⚡ 말하기 속도</div>
        <div class="stat-value" style="color:${getScoreColor(speedScore)}">${speedScore}점</div>
        <div class="stat-desc">
          측정 속도: ${currentRecord.wpm} WPM<br>
          최적 범위: 150~200 WPM<br>
          전체 시간: ${formatTime(currentRecord.totalTime)}
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-title">💬 언어 습관</div>
        <div class="stat-value" style="color:${getScoreColor(fillerScore)}">${fillerScore}점</div>
        <div class="stat-desc">
          추임새 횟수: ${currentRecord.fillerCount}회<br>
          총 단어 수: ${currentRecord.wordCount}단어<br>
          추임새 비율: ${currentRecord.wordCount > 0 ? Math.round((currentRecord.fillerCount / currentRecord.wordCount) * 100) : 0}%
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-title">🗣 발음 & 발화량</div>
        <div class="stat-value" style="color:${getScoreColor(wordsScore)}">${wordsScore}점</div>
        <div class="stat-desc">
          총 단어 수: ${currentRecord.wordCount}단어<br>
          발화 시간: ${formatTime(currentRecord.speakTime)}<br>
          전체 시간: ${formatTime(currentRecord.totalTime)}
        </div>
      </div>
    </div>
    
    <!-- 오디오 플레이어 (녹음 파일) -->
    <div class="audio-wrap" id="audioWrap">
      <div class="audio-title">🔊 녹음 파일</div>
      <div class="audio-controls">
        <button class="audio-btn" id="audioPlayBtn" onclick="toggleAudioPlay()">
          <svg id="playIcon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          <svg id="pauseIcon" viewBox="0 0 24 24" style="display:none;"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
        </button>
        <div class="audio-progress" id="audioProgress" onclick="seekAudio(event)">
          <div class="audio-progress-bar" id="audioProgressBar"></div>
        </div>
        <div class="audio-time" id="audioTime">0:00 / 0:00</div>
      </div>
      <div class="no-audio" id="noAudio" style="display:none;">녹음 파일이 없습니다.</div>
    </div>
    
    <!-- 음성 인식 내용 -->
    <div class="transcript-wrap">
      <div class="transcript-title">📝 인식된 발화 내용</div>
      <div class="transcript-text">${currentRecord.transcript || '인식된 내용이 없습니다.'}</div>
    </div>
    
    <!-- 비교 섹션 -->
    <div id="compareSection"></div>
  `;
  
  // 레이더 차트 생성
  setTimeout(() => {
    const ctx = document.getElementById('radarChart');
    if (ctx) {
      createRadarChart(ctx, {
        silence: silenceScore,
        speed: speedScore,
        filler: fillerScore,
        words: wordsScore,
        overall: currentRecord.score
      }, '내 점수');
    }
    
    // 오디오 플레이어 초기화
    initAudioPlayer();
  }, 100);
}

async function initAudioPlayer() {
  const audioWrap = document.getElementById('audioWrap');
  const noAudio = document.getElementById('noAudio');
  const audioControls = document.querySelector('.audio-controls');
  
  if (!audioWrap || !currentRecord) return;
  
  try {
    // IndexedDB 에서 오디오 로드
    const record = await getAudioFromDB(currentRecord.id);
    
    if (record && record.audio) {
      audioBlob = record.audio;
      audioUrl = URL.createObjectURL(audioBlob);
      audioElement = new Audio(audioUrl);
      
      audioElement.addEventListener('ended', () => {
        isPlaying = false;
        updatePlayPauseIcon();
        clearInterval(audioProgressInterval);
        document.getElementById('audioProgressBar').style.width = '0%';
        document.getElementById('audioTime').textContent = `0:00 / ${formatTime(Math.floor(audioElement.duration))}`;
      });
      
      document.getElementById('audioTime').textContent = `0:00 / ${formatTime(Math.floor(audioElement.duration))}`;
      
      if (audioControls) audioControls.style.display = 'flex';
      if (noAudio) noAudio.style.display = 'none';
    } else {
      if (audioControls) audioControls.style.display = 'none';
      if (noAudio) {
        noAudio.style.display = 'block';
        noAudio.textContent = '녹음 파일이 없습니다.';
      }
    }
  } catch (err) {
    console.error('오디오 로드 실패:', err);
    if (audioControls) audioControls.style.display = 'none';
    if (noAudio) {
      noAudio.style.display = 'block';
      noAudio.textContent = '녹음 파일을 불러올 수 없습니다.';
    }
  }
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
  // 네비게이션 바 로그인 상태 반영
  if (typeof applyNavAuth === 'function') {
    applyNavAuth();
  }
  renderDetail();
});

// 언어 변경 시 차트 재생성
window.addEventListener('languageChanged', () => {
  renderDetail();
});
