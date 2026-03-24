// ===== profile.js =====
// 다국어 지원용 헬퍼 함수
function t(key) {
  if (window.i18n && typeof window.i18n.t === 'function') {
    return window.i18n.t(key);
  }
  const fallbacks = {
    'profile-category-silence': '침묵 관리',
    'profile-category-speed': '말하기 속도',
    'profile-category-filler': '언어 습관',
    'profile-category-words': '발음/발화량'
  };
  return fallbacks[key] || key;
}

let radarChartInstance = null;

// IndexedDB 설정
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
    
    request.onerror = (e) => reject(e);
  });
}

openDatabase().catch(console.error);

// 사용자 정보 가져오기 (auth.js 와 통일)
function getCurrentUser() {
  const session = localStorage.getItem('sc_session');
  if (!session) return null;
  try {
    return JSON.parse(session);
  } catch {
    return null;
  }
}

// 연습 기록 가져오기
function getUserRecords(userId) {
  const key = 'sc_records_' + userId;
  return JSON.parse(localStorage.getItem(key) || '[]');
}

// 카테고리 점수 계산
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

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

// 프로필 이미지 로드
function loadProfileImage() {
  const user = getCurrentUser();
  const img = document.getElementById('profileImg');
  
  if (user && user.profileImage) {
    img.src = user.profileImage;
  } else {
    // 기본 프로필 이미지 (초기셜)
    img.src = 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#7B61FF;stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:#A855F7;stop-opacity:0.3" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r="70" fill="url(#grad)"/>
        <circle cx="70" cy="55" r="25" fill="#7B61FF" opacity="0.6"/>
        <ellipse cx="70" cy="115" rx="35" ry="25" fill="#7B61FF" opacity="0.6"/>
      </svg>
    `);
  }
}

// 프로필 정보 로드
function loadProfileInfo() {
  const user = getCurrentUser();
  
  if (user) {
    document.getElementById('profileName').textContent = user.nickname || user.username || '게스트';
    document.getElementById('profileJoined').textContent = '가입일: ' + (user.joinDate || '알 수 없음');
    
    const bioEl = document.getElementById('profileBio');
    if (user.bio) {
      bioEl.textContent = user.bio;
      bioEl.classList.remove('empty');
    } else {
      bioEl.textContent = '아직 자기소개를 작성하지 않았습니다.';
      bioEl.classList.add('empty');
    }
  } else {
    document.getElementById('profileName').textContent = '게스트';
    document.getElementById('profileJoined').textContent = '게스트 모드';
    document.getElementById('profileBio').textContent = '로그인하면 더 많은 기능을 이용할 수 있습니다.';
  }
}

// 프로필 이미지 변경
document.getElementById('profileInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    const base64 = event.target.result;
    const user = getCurrentUser();
    if (!user) return;
    
    // auth.js 의 updateCurrentUser 사용
    user.profileImage = base64;
    if (typeof updateCurrentUser === 'function') {
      updateCurrentUser(user);
    } else {
      saveCurrentUser(user);
    }
    document.getElementById('profileImg').src = base64;
  };
  reader.readAsDataURL(file);
});

// 닉네임 변경 모달
function openNameModal() {
  const user = getCurrentUser();
  document.getElementById('newNameInput').value = user ? (user.nickname || user.username || '') : '';
  document.getElementById('nameModal').classList.add('show');
}

function closeNameModal() {
  document.getElementById('nameModal').classList.remove('show');
}

function saveNewName() {
  const newName = document.getElementById('newNameInput').value.trim();
  if (!newName) {
    showToast({
      type: 'warning',
      title: '닉네임을 입력해주세요',
      duration: 3000
    });
    return;
  }

  const user = getCurrentUser();
  if (!user) return;
  
  user.nickname = newName;
  
  // auth.js 의 updateCurrentUser 사용
  if (typeof updateCurrentUser === 'function') {
    updateCurrentUser(user);
  } else {
    saveCurrentUser(user);
  }

  document.getElementById('profileName').textContent = newName;
  closeNameModal();
  showToast({
    type: 'success',
    title: '닉네임이 변경되었습니다!',
    duration: 3000
  });
}

document.getElementById('editNameBtn').addEventListener('click', openNameModal);

// 자기소개 수정 모달
function openBioModal() {
  const user = getCurrentUser();
  document.getElementById('newBioInput').value = user ? (user.bio || '') : '';
  document.getElementById('bioModal').classList.add('show');
}

function closeBioModal() {
  document.getElementById('bioModal').classList.remove('show');
}

function saveNewBio() {
  const newBio = document.getElementById('newBioInput').value.trim();

  const user = getCurrentUser();
  if (!user) return;
  
  user.bio = newBio;
  
  // auth.js 의 updateCurrentUser 사용
  if (typeof updateCurrentUser === 'function') {
    updateCurrentUser(user);
  } else {
    saveCurrentUser(user);
  }

  const bioEl = document.getElementById('profileBio');
  if (newBio) {
    bioEl.textContent = newBio;
    bioEl.classList.remove('empty');
  } else {
    bioEl.textContent = '아직 자기소개를 작성하지 않았습니다.';
    bioEl.classList.add('empty');
  }

  closeBioModal();
  showToast({
    type: 'success',
    title: '자기소개가 저장되었습니다!',
    duration: 3000
  });
}

document.getElementById('editBioBtn').addEventListener('click', openBioModal);

// 통계 로드
function loadStats() {
  const user = getCurrentUser();
  const records = user ? getUserRecords(user.id) : JSON.parse(localStorage.getItem('sc_records') || '[]');
  
  if (records.length === 0) {
    document.getElementById('totalCount').textContent = '0';
    document.getElementById('totalTime').textContent = '0 분';
    document.getElementById('avgScore').textContent = '0';
    document.getElementById('bestScore').textContent = '0';
    
    document.getElementById('skillSilence').textContent = '0 점';
    document.getElementById('skillSpeed').textContent = '0 점';
    document.getElementById('skillFiller').textContent = '0 점';
    document.getElementById('skillWords').textContent = '0 점';
    
    document.getElementById('skillSilenceBar').style.width = '0%';
    document.getElementById('skillSpeedBar').style.width = '0%';
    document.getElementById('skillFillerBar').style.width = '0%';
    document.getElementById('skillWordsBar').style.width = '0%';
    
    document.getElementById('recentRecords').innerHTML = `
      <div class="empty-state">
        <span class="e-icon">📝</span>
        <h3>아직 기록이 없습니다</h3>
        <p>연습을 시작해보세요!</p>
      </div>
    `;
    
    // 빈 차트
    createRadarChart([0, 0, 0, 0]);
    return;
  }
  
  // 종합 통계
  const totalCount = records.length;
  const totalTime = records.reduce((sum, r) => sum + (r.totalTime || 0), 0);
  const avgScore = Math.round(records.reduce((sum, r) => sum + (r.score || 0), 0) / records.length);
  const bestScore = Math.max(...records.map(r => r.score || 0));
  
  document.getElementById('totalCount').textContent = totalCount;
  document.getElementById('totalTime').textContent = Math.round(totalTime / 60) + '분';
  document.getElementById('avgScore').textContent = avgScore;
  document.getElementById('bestScore').textContent = bestScore;
  
  // kill 분석
  const avgSilence = Math.round(records.reduce((sum, r) => sum + getCategoryScore(r.silenceRate, 'silence'), 0) / records.length);
  const avgSpeed = Math.round(records.reduce((sum, r) => sum + getCategoryScore(r.wpm, 'speed'), 0) / records.length);
  const avgFiller = Math.round(records.reduce((sum, r) => sum + getCategoryScore(r.fillerCount, 'filler'), 0) / records.length);
  const avgWords = Math.round(records.reduce((sum, r) => sum + getCategoryScore(r.wordCount, 'words'), 0) / records.length);
  
  document.getElementById('skillSilence').textContent = avgSilence + '점';
  document.getElementById('skillSpeed').textContent = avgSpeed + '점';
  document.getElementById('skillFiller').textContent = avgFiller + '점';
  document.getElementById('skillWords').textContent = avgWords + '점';
  
  setTimeout(() => {
    document.getElementById('skillSilenceBar').style.width = avgSilence + '%';
    document.getElementById('skillSpeedBar').style.width = avgSpeed + '%';
    document.getElementById('skillFillerBar').style.width = avgFiller + '%';
    document.getElementById('skillWordsBar').style.width = avgWords + '%';
  }, 100);
  
  // 레이더 차트
  createRadarChart([avgSilence, avgSpeed, avgFiller, avgWords]);
  
  // 최근 기록 5 개
  const recentRecords = records.slice(0, 5);
  const recentEl = document.getElementById('recentRecords');
  recentEl.innerHTML = recentRecords.map((r, i) => `
    <div class="recent-item">
      <div>
        <div class="recent-date">${r.date}</div>
        <div style="font-size:0.8rem;color:var(--text-dim);">연습 #${records.length - i}</div>
      </div>
      <div class="recent-score">${r.score}점</div>
    </div>
  `).join('');
}

// 레이더 차트 생성
function createRadarChart(data) {
  const ctx = document.getElementById('radarChart');
  if (!ctx) return;

  if (radarChartInstance) {
    radarChartInstance.destroy();
  }

  const hasData = data.some(v => v > 0);

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: [
        t('profile-category-silence') || '침묵 관리',
        t('profile-category-speed') || '말하기 속도',
        t('profile-category-filler') || '언어 습관',
        t('profile-category-words') || '발음/발화량'
      ],
      datasets: [{
        label: '내 실력',
        data: hasData ? data : [20, 20, 20, 20],
        backgroundColor: hasData ? 'rgba(123, 99, 248, 0.2)' : 'rgba(139, 92, 246, 0.1)',
        borderColor: hasData ? '#6366f1' : '#8b5cf6',
        pointBackgroundColor: hasData ? '#6366f1' : '#8b5cf6',
        pointBorderColor: '#fff',
        borderWidth: 2,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: { color: 'rgba(139, 92, 246, 0.2)' },
          grid: { color: 'rgba(139, 92, 246, 0.15)' },
          pointLabels: { color: '#e2e8f0', font: { size: 11, weight: '600' } },
          ticks: {
            backdropColor: 'transparent',
            color: 'rgba(255, 255, 255, 0.4)',
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
          padding: 10,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return context.parsed.r + '점';
            }
          }
        }
      }
    }
  });
}

// 뱃지 시스템
function loadBadges() {
  const user = getCurrentUser();
  const records = user ? getUserRecords(user.id) : JSON.parse(localStorage.getItem('sc_records') || '[]');
  
  const badges = [];
  
  // 연습 횟수 뱃지
  const practiceCount = records.length;
  if (practiceCount >= 1) badges.push({ icon: '🌱', name: '첫 걸음', unlocked: true });
  if (practiceCount >= 5) badges.push({ icon: '🌿', name: '꾸준한 연습', unlocked: true });
  if (practiceCount >= 10) badges.push({ icon: '🌳', name: '열정가', unlocked: true });
  if (practiceCount >= 30) badges.push({ icon: '🏆', name: '마스터', unlocked: true });
  
  // 최고 점수 뱃지
  const bestScore = records.length > 0 ? Math.max(...records.map(r => r.score || 0)) : 0;
  if (bestScore >= 60) badges.push({ icon: '🥉', name: '60 점 돌파', unlocked: true });
  if (bestScore >= 80) badges.push({ icon: '🥈', name: '80 점 돌파', unlocked: true });
  if (bestScore >= 90) badges.push({ icon: '🥇', name: '90 점 돌파', unlocked: true });
  
  // 연속 연습 뱃지 (간단히 구현)
  if (practiceCount >= 3) badges.push({ icon: '🔥', name: '3 회 연속', unlocked: true });
  if (practiceCount >= 7) badges.push({ icon: '💪', name: '7 회 연속', unlocked: true });
  
  // 말하기 속도 뱃지
  const hasGoodSpeed = records.some(r => r.wpm >= 150 && r.wpm <= 200);
  if (hasGoodSpeed) badges.push({ icon: '⚡', name: '적정 속도', unlocked: true });
  
  // 추임새 없는 뱃지
  const noFiller = records.some(r => r.fillerCount === 0);
  if (noFiller) badges.push({ icon: '✨', name: '깔끔한 발화', unlocked: true });
  
  // 잠긴 뱃지들 (예시)
  const lockedBadges = [
    { icon: '🎯', name: '정확한 발음', unlocked: false },
    { icon: '🎤', name: '스피치 킹', unlocked: false },
    { icon: '👑', name: '전설', unlocked: false }
  ];
  
  const allBadges = [...badges, ...lockedBadges];
  
  const badgeGrid = document.getElementById('badgeGrid');
  badgeGrid.innerHTML = allBadges.map(badge => `
    <div class="badge-item ${badge.unlocked ? '' : 'locked'}">
      <span class="badge-icon">${badge.icon}</span>
      <div class="badge-name">${badge.name}</div>
    </div>
  `).join('');
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
  // 네비게이션 바 로그인 상태 반영
  if (typeof applyNavAuth === 'function') {
    applyNavAuth();
  }

  loadProfileImage();
  loadProfileInfo();
  loadStats();
  loadBadges();
});

// 언어 변경 시 차트 재생성
window.addEventListener('languageChanged', () => {
  loadStats();
});
