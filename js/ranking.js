// ===== ranking.js =====

let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', function () {
  // 네비게이션 바 로그인 상태 반영
  if (typeof applyNavAuth === 'function') {
    applyNavAuth();
  }

  // 탭 클릭 이벤트
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      currentCategory = this.dataset.category;
      renderRanking();
    });
  });

  renderRanking();
});

// 카테고리별 기록 가져오기
function getRecordsByCategory(userId, category) {
  let allRecords = [];
  
  if (userId) {
    // 일반 연습 기록
    const records = JSON.parse(localStorage.getItem('sc_records_' + userId) || '[]');
    allRecords = records.map(r => ({...r, userId: userId}));
    
    // 면접 기록
    const interviewRecords = JSON.parse(localStorage.getItem('sc_interview_records_' + userId) || '[]');
    allRecords = allRecords.concat(interviewRecords.map(r => ({...r, userId: userId, type: 'interview'})));
  } else {
    // 게스트
    const guestRecord = sessionStorage.getItem('sc_guest_record');
    if (guestRecord) {
      allRecords = [{...JSON.parse(guestRecord), userId: 'guest'}];
    }
    const guestInterviewRecords = JSON.parse(localStorage.getItem('sc_guest_interview_records') || '[]');
    allRecords = allRecords.concat(guestInterviewRecords.map(r => ({...r, userId: 'guest', type: 'interview'})));
  }
  
  if (category === 'all') return allRecords;
  
  // 카테고리별 필터링
  return allRecords.filter(r => {
    if (category === 'interview') return r.type === 'interview';
    if (category === 'pronunciation') {
      // 발음 관련: wordCount, wpm 등
      return r.type !== 'interview' && r.wordCount && r.wordCount > 0;
    }
    if (category === 'presentation') {
      // 발표: 실전 연습
      return r.type !== 'interview' && r.score && r.score > 0;
    }
    if (category === 'speech') {
      // 스피치: 종합 점수 기준
      return r.type !== 'interview' && r.score && r.score > 0;
    }
    return true;
  });
}

// 모든 사용자의 기록 수집
function getAllUsersRecords() {
  const userRecords = [];
  const users = JSON.parse(localStorage.getItem('sc_users') || '[]');
  
  users.forEach(user => {
    const records = getRecordsByCategory(user.id, currentCategory);
    if (records.length > 0) {
      userRecords.push({
        user: user,
        records: records
      });
    }
  });
  
  // 게스트 추가
  const guestRecords = getRecordsByCategory(null, currentCategory);
  if (guestRecords.length > 0) {
    userRecords.push({
      user: { nickname: '게스트', profileImage: null },
      records: guestRecords,
      isGuest: true
    });
  }
  
  return userRecords;
}

// 사용자 점수 계산
function calculateUserScore(userRecordData) {
  const records = userRecordData.records;
  if (records.length === 0) return 0;
  
  // 최고 점수 우선, 없으면 평균
  const scores = records.map(r => r.score || 0).filter(s => s > 0);
  if (scores.length === 0) return 0;
  
  const maxScore = Math.max(...scores);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  
  // 최고 점수 70% + 평균 점수 30%
  return Math.round(maxScore * 0.7 + avgScore * 0.3);
}

// 언어 번역 헬퍼
function t(key) {
  if (window.i18n && typeof window.i18n.t === 'function') {
    return window.i18n.t(key);
  }
  return key;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

// 랭킹 렌더링
function renderRanking() {
  const user = getCurrentUser();
  const allUserRecords = getAllUsersRecords();
  
  // 점수 계산 및 정렬
  const rankings = allUserRecords
    .map(data => ({
      user: data.user,
      isGuest: data.isGuest || false,
      score: calculateUserScore(data),
      records: data.records,
      practiceCount: data.records.length,
      totalTime: data.records.reduce((sum, r) => sum + (r.totalTime || r.actualTime || 0), 0),
      bestScore: Math.max(...data.records.map(r => r.score || 0), 0)
    }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
  
  // 내 순위 찾기
  const myRankCard = document.getElementById('myRankCard');
  const myRankValue = document.getElementById('myRankValue');
  
  if (user && rankings.length > 0) {
    const myIndex = rankings.findIndex(r => r.user && r.user.id === user.id);
    if (myIndex !== -1) {
      myRankCard.style.display = 'flex';
      myRankValue.textContent = (myIndex + 1) + '위';
    } else {
      myRankCard.style.display = 'none';
    }
  } else {
    myRankCard.style.display = 'none';
  }
  
  // 팟디움 (상위 3명)
  const podium = document.getElementById('podium');
  if (rankings.length >= 3) {
    const top3 = [rankings[1], rankings[0], rankings[2]]; // 2, 1, 3 순서
    const emojis = ['🥈', '🥇', '🥉'];
    podium.innerHTML = top3.map((r, i) => `
      <div class="podium-item">
        <div class="podium-rank">${emojis[i]}</div>
        <div class="podium-avatar">${r.isGuest ? '👤' : '👤'}</div>
        <div class="podium-name">${r.user.nickname || r.user.username || '사용자'}</div>
        <div class="podium-score">${r.score}점</div>
        <div class="podium-bar">${i === 1 ? '1' : i === 0 ? '2' : '3'}</div>
      </div>
    `).join('');
  } else {
    podium.innerHTML = '';
  }
  
  // 전체 랭킹 목록
  const rankingList = document.getElementById('rankingList');
  
  if (rankings.length === 0) {
    rankingList.innerHTML = `
      <div class="empty-state">
        <span class="e-icon">🏆</span>
        <h3>아직 랭킹이 없습니다</h3>
        <p>연습을 시작하고 랭킹에 도전하세요!</p>
        <a href="practice.html" class="btn btn-primary">연습 시작하기</a>
      </div>
    `;
    return;
  }
  
  rankingList.innerHTML = rankings.map((r, i) => {
    const isMe = user && r.user && r.user.id === user.id;
    const avgWpm = r.records.filter(rec => rec.wpm).length > 0 
      ? Math.round(r.records.filter(rec => rec.wpm).reduce((sum, rec) => sum + rec.wpm, 0) / r.records.filter(rec => rec.wpm).length)
      : 0;
    
    return `
      <div class="ranking-item ${isMe ? 'is-me' : ''}">
        <div class="ranking-pos">${i + 1}</div>
        <div class="ranking-avatar">${r.isGuest ? '👤' : '👤'}</div>
        <div class="ranking-info">
          <div class="ranking-name">${isMe ? '나 - ' : ''}${r.user.nickname || r.user.username || '사용자'}</div>
          <div class="ranking-stats">
            <span>📋 ${r.practiceCount}회</span>
            <span>⏱ ${formatTime(Math.round(r.totalTime))}</span>
            ${avgWpm > 0 ? `<span>🚀 ${avgWpm} WPM</span>` : ''}
            <span>🏆 최고 ${r.bestScore}점</span>
          </div>
        </div>
        <div>
          <div class="ranking-score">${r.score}</div>
          <div class="ranking-score-lbl">점수</div>
        </div>
      </div>
    `;
  }).join('');
}

// 언어 변경 시 페이지 다시 그리기
window.addEventListener('languageChanged', () => {
  renderRanking();
});
