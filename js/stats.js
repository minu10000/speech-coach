// ===== stats.js =====

// 다국어 지원을 위한 헬퍼 함수
function t(key) {
  if (window.i18n && typeof window.i18n.t === 'function') {
    return window.i18n.t(key);
  }
  const fallbacks = {
    'stats-empty-title': '아직 연습 기록이 없어요',
    'stats-empty-sub': '첫 번째 연습을 시작해보세요!',
    'stats-btn-practice': '연습 시작하기'
  };
  return fallbacks[key] || key;
}

document.addEventListener('DOMContentLoaded', function () {
  // 네비게이션 바 로그인 상태 반영
  if (typeof applyNavAuth === 'function') {
    applyNavAuth();
  }

  const user = getCurrentUser();

  const totalCountEl = document.getElementById('totalCount');
  const totalTimeEl = document.getElementById('totalPracticeTime');
  const avgSilenceEl = document.getElementById('avgSilence');
  const bestScoreEl = document.getElementById('bestScore');
  const recordsListEl = document.getElementById('recordsList');
  const clearAllBtn = document.getElementById('clearAllBtn');

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}분 ${s}초` : `${s}초`;
  }

  function loadRecords() {
    let records = [];
    if (user) {
      // 일반 연습 기록
      records = getUserRecords(user.id);
      // 면접 기록도 추가
      const interviewRecords = JSON.parse(localStorage.getItem('sc_interview_records_' + user.id) || '[]');
      records = records.concat(interviewRecords);
    } else {
      const guestRecord = sessionStorage.getItem('sc_guest_record');
      if (guestRecord) {
        records = [JSON.parse(guestRecord)];
      }
      // 게스트 면접 기록도 추가
      const guestInterviewRecords = JSON.parse(localStorage.getItem('sc_guest_interview_records') || '[]');
      records = records.concat(guestInterviewRecords);
    }
    // 시간순으로 정렬 (최신순)
    records.sort((a, b) => b.id - a.id);
    return records;
  }

  function render() {
    const records = loadRecords();

    if (records.length === 0) {
      totalCountEl.textContent = '0';
      totalTimeEl.textContent = '0 분';
      avgSilenceEl.textContent = '0%';
      bestScoreEl.textContent = '—';
      clearAllBtn.style.display = 'none';
      recordsListEl.innerHTML = `
        <div class="empty-state">
          <span class="e-icon">🎤</span>
          <h3>${t('stats-empty-title')}</h3>
          <p>${t('stats-empty-sub')}</p>
          <a href="practice.html" class="btn btn-primary">${t('stats-btn-practice')}</a>
        </div>`;
      return;
    }

    const totalTime = records.reduce((s, r) => s + (r.totalTime || r.actualTime || 0), 0);
    const avgSilence = Math.round(records.filter(r => r.silenceRate).reduce((s, r) => s + (r.silenceRate || 0), 0) / records.filter(r => r.silenceRate).length || 0);
    const bestScore = Math.max(...records.map(r => r.score || 0));

    totalCountEl.textContent = records.length;
    totalTimeEl.textContent = Math.round(totalTime / 60) + '분';
    avgSilenceEl.textContent = avgSilence + '%';
    bestScoreEl.textContent = bestScore + '점';
    clearAllBtn.style.display = 'inline-flex';

    recordsListEl.innerHTML = records.map((r, i) => {
      const isInterview = r.type === 'interview';
      const categoryNames = { interview: '면접', presentation: '발표', speech: '스피치', conversation: '대화' };
      const recordName = r.customName || r.scenarioTitle || `연습 #${records.length - i}`;

      return `
      <div class="rec-item" style="cursor:pointer;" onclick="viewRecordDetail(${r.id})">
        <div class="rec-left">
          <div class="rec-date">${r.date}</div>
          <div class="rec-title">
            ${isInterview ? '🎤 ' : ''}${recordName}
          </div>
          <div class="rec-meta">
            ${!isInterview ? `<span>⏱ ${formatTime(r.totalTime)}</span>` : ''}
            ${isInterview ? `<span>⏱ ${formatTime(r.actualTime || 0)}</span>` : ''}
            ${!isInterview ? `<span>💬 ${r.wordCount}단어</span>` : ''}
            ${!isInterview ? `<span>🚀 ${r.wpm} WPM</span>` : ''}
            ${!isInterview && r.silenceRate ? `<span>🤫 침묵 ${r.silenceRate}%</span>` : ''}
            ${!isInterview && r.fillerCount > 0 ? `<span>⚠️ 추임새 ${r.fillerCount}회</span>` : ''}
            ${isInterview ? `<span>📝 ${categoryNames[r.category] || '면접'}</span>` : ''}
          </div>
        </div>
        <div class="rec-right">
          <div>
            <div class="rec-score">${r.score || '-'}</div>
            <div class="rec-score-lbl">점수</div>
          </div>
          <button class="rec-share-btn" onclick="event.stopPropagation(); shareRecord(event, ${r.id})" title="기록 공유">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
        </div>
        <button class="edit-name-btn" onclick="event.stopPropagation(); editRecordName(${r.id}, '${recordName.replace(/'/g, "\\'")}')" title="이름 수정">
          ✏️
        </button>
      </div>`;
    }).join('');
  }

  window.clearAllRecords = function () {
    if (!confirm('모든 연습 기록을 삭제할까요?')) return;
    if (user) {
      clearUserRecords(user.id);
      localStorage.removeItem('sc_interview_records_' + user.id);
    } else {
      sessionStorage.removeItem('sc_guest_record');
      localStorage.removeItem('sc_last_record');
      localStorage.removeItem('sc_guest_interview_records');
    }
    render();
  };

  window.viewRecordDetail = function (recordId) {
    window.location.href = `stats-detail.html?id=${recordId}`;
  };

  // 기록 이름 수정 함수 (모달 사용)
  window.editRecordName = function(recordId, currentName) {
    // 모달 생성
    const modalHTML = `
      <div class="modal-overlay" id="editNameModal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>✏️ 기록 이름 수정</h2>
            <button class="modal-close" onclick="closeEditModal()">&times;</button>
          </div>
          <div class="modal-body">
            <label for="editNameInput">새로운 이름</label>
            <input 
              type="text" 
              id="editNameInput" 
              value="${currentName.replace(/"/g, '&quot;')}" 
              placeholder="예: 1 차 면접 연습, 자기소개 연습"
              maxlength="50"
              onkeypress="if(event.key==='Enter') saveRecordName(${recordId})"
            />
            <p class="modal-hint">50 자까지 입력할 수 있습니다.</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeEditModal()">취소</button>
            <button class="btn btn-primary" onclick="saveRecordName(${recordId})">저장</button>
          </div>
        </div>
      </div>
    `;
    
    // 모달 추가
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = modalHTML;
    document.body.appendChild(tempDiv.firstElementChild);
    
    // 모달 표시
    setTimeout(() => {
      document.getElementById('editNameModal').classList.add('show');
      const input = document.getElementById('editNameInput');
      input.focus();
      input.select();
    }, 10);
    
    // ESC 키로 닫기
    document.addEventListener('keydown', handleEscKey);
  };

  // ESC 키 핸들러
  function handleEscKey(e) {
    if (e.key === 'Escape') {
      closeEditModal();
    }
  }

  // 모달 닫기
  window.closeEditModal = function() {
    const modal = document.getElementById('editNameModal');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.remove();
      }, 300);
    }
    document.removeEventListener('keydown', handleEscKey);
  };

  // 기록 이름 저장
  window.saveRecordName = function(recordId) {
    const input = document.getElementById('editNameInput');
    const newName = input.value.trim();
    
    if (!newName) {
      input.classList.add('error');
      input.focus();
      return;
    }
    
    const user = getCurrentUser();
    
    if (user) {
      // 사용자 기록에서 찾기
      let records = getUserRecords(user.id);
      let record = records.find(r => r.id === recordId);
      
      if (record) {
        record.customName = newName;
        localStorage.setItem('sc_records_' + user.id, JSON.stringify(records));
      } else {
        // 면접 기록에서 찾기
        let interviewRecords = JSON.parse(localStorage.getItem('sc_interview_records_' + user.id) || '[]');
        let interviewRecord = interviewRecords.find(r => r.id === recordId);
        
        if (interviewRecord) {
          interviewRecord.customName = newName;
          localStorage.setItem('sc_interview_records_' + user.id, JSON.stringify(interviewRecords));
        }
      }
    } else {
      // 게스트 기록
      let guestRecords = JSON.parse(localStorage.getItem('sc_guest_interview_records') || '[]');
      let guestRecord = guestRecords.find(r => r.id === recordId);
      
      if (guestRecord) {
        guestRecord.customName = newName;
        localStorage.setItem('sc_guest_interview_records', JSON.stringify(guestRecords));
      }
      
      // 세션 스토리지의 일반 기록도 확인
      const guestRecordSession = JSON.parse(sessionStorage.getItem('sc_guest_record') || 'null');
      if (guestRecordSession && guestRecordSession.id === recordId) {
        guestRecordSession.customName = newName;
        sessionStorage.setItem('sc_guest_record', JSON.stringify(guestRecordSession));
      }
    }
    
    // 모달 닫기
    closeEditModal();
    
    // 화면 갱신
    setTimeout(() => {
      render();
      
      showToast({
        type: 'success',
        title: '이름 변경 완료',
        message: `"${newName}"(으) 로 변경되었습니다.`,
        duration: 2000
      });
    }, 300);
  };

  render();
});

// ===== 기록 공유 기능 =====
window.shareRecord = function(event, recordId) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  
  const user = getCurrentUser();
  let records = [];
  
  if (user) {
    records = getUserRecords(user.id);
    const interviewRecords = JSON.parse(localStorage.getItem('sc_interview_records_' + user.id) || '[]');
    records = records.concat(interviewRecords);
  } else {
    const guestRecord = sessionStorage.getItem('sc_guest_record');
    if (guestRecord) {
      records = [JSON.parse(guestRecord)];
    }
    const guestInterviewRecords = JSON.parse(localStorage.getItem('sc_guest_interview_records') || '[]');
    records = records.concat(guestInterviewRecords);
  }
  
  const record = records.find(r => r.id === recordId);
  
  if (!record) {
    showToast({
      type: 'warning',
      title: '기록을 찾을 수 없습니다.',
      duration: 3000
    });
    return;
  }
  
  const isInterview = record.type === 'interview';
  const recordName = record.customName || record.scenarioTitle || '연습 기록';
  const userName = user ? (user.nickname || user.username || '게스트') : '게스트';
  
  // 공유할 텍스트 생성
  let shareText = '🎤 SpeechCoach - 스피치 연습 기록\n\n';
  shareText += '👤 ' + userName + '\n';
  shareText += '📝 ' + recordName + '\n';
  shareText += '📅 ' + record.date + '\n\n';
  shareText += '🏆 점수: ' + (record.score || '-') + '점\n';
  
  if (!isInterview) {
    const totalMin = Math.floor((record.totalTime || 0) / 60);
    const totalSec = (record.totalTime || 0) % 60;
    shareText += '⏱ 연습 시간: ' + (totalMin > 0 ? totalMin + '분 ' : '') + totalSec + '초\n';
    shareText += '💬 단어 수: ' + (record.wordCount || 0) + '개\n';
    shareText += '🚀 말하기 속도: ' + (record.wpm || 0) + ' WPM\n';
    if (record.silenceRate) shareText += '🤫 침묵 비율: ' + record.silenceRate + '%\n';
    if (record.fillerCount) shareText += '⚠️ 추임새: ' + record.fillerCount + '회\n';
  } else {
    const actualMin = Math.floor((record.actualTime || 0) / 60);
    const actualSec = (record.actualTime || 0) % 60;
    shareText += '⏱ 실제 시간: ' + (actualMin > 0 ? actualMin + '분 ' : '') + actualSec + '초\n';
    const categoryNames = { interview: '면접', presentation: '발표', speech: '스피치', conversation: '대화' };
    shareText += '📋 유형: ' + (categoryNames[record.category] || '면접') + '\n';
  }
  
  shareText += '\n#SpeechCoach #스피치연습';
  
  // 클립보드 복사
  navigator.clipboard.writeText(shareText).then(function() {
    showToast({
      type: 'success',
      title: '✅ 기록이 클립보드에 복사되었습니다!',
      message: '카카오톡 등에서 붙여넣기하세요.',
      duration: 3000
    });
  }).catch(function() {
    // 폴백
    const textarea = document.createElement('textarea');
    textarea.value = shareText;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast({
        type: 'success',
        title: '✅ 기록이 클립보드에 복사되었습니다!',
        message: '카카오톡 등에서 붙여넣기하세요.',
        duration: 3000
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: '❌ 복사에 실패했습니다.',
        duration: 3000
      });
    }
    document.body.removeChild(textarea);
  });
};

// 언어 변경 시 페이지 다시 그리기
window.addEventListener('languageChanged', () => {
  render();
});
