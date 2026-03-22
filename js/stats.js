// ===== stats.js =====

document.addEventListener('DOMContentLoaded', function () {
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
      records = getUserRecords(user.id);
    } else {
      records = JSON.parse(localStorage.getItem('sc_records') || '[]');
    }
    return records;
  }

  function render() {
    const records = loadRecords();

    if (records.length === 0) {
      totalCountEl.textContent = '0';
      totalTimeEl.textContent = '0분';
      avgSilenceEl.textContent = '0%';
      bestScoreEl.textContent = '—';
      clearAllBtn.style.display = 'none';
      recordsListEl.innerHTML = `
        <div class="empty-state">
          <span class="e-icon">🎤</span>
          <h3>아직 연습 기록이 없어요</h3>
          <p>첫 번째 연습을 시작해보세요!</p>
          <a href="practice.html" class="btn btn-primary">연습 시작하기</a>
        </div>`;
      return;
    }

    const totalTime = records.reduce((s, r) => s + (r.totalTime || 0), 0);
    const avgSilence = Math.round(records.reduce((s, r) => s + (r.silenceRate || 0), 0) / records.length);
    const bestScore = Math.max(...records.map(r => r.score || 0));

    totalCountEl.textContent = records.length;
    totalTimeEl.textContent = Math.round(totalTime / 60) + '분';
    avgSilenceEl.textContent = avgSilence + '%';
    bestScoreEl.textContent = bestScore + '점';
    clearAllBtn.style.display = 'inline-flex';

    recordsListEl.innerHTML = records.map((r, i) => `
      <div class="rec-item" style="cursor:pointer;" onclick="viewRecordDetail(${r.id})">
        <div class="rec-left">
          <div class="rec-date">${r.date}</div>
          <div class="rec-title">연습 #${records.length - i}</div>
          <div class="rec-meta">
            <span>⏱ ${formatTime(r.totalTime)}</span>
            <span>💬 ${r.wordCount}단어</span>
            <span>🚀 ${r.wpm} WPM</span>
            <span>🤫 침묵 ${r.silenceRate}%</span>
            ${r.fillerCount > 0 ? `<span>⚠️ 추임새 ${r.fillerCount}회</span>` : ''}
          </div>
        </div>
        <div class="rec-right">
          <div>
            <div class="rec-score">${r.score}</div>
            <div class="rec-score-lbl">점수</div>
          </div>
        </div>
      </div>`).join('');
  }

  window.clearAllRecords = function () {
    if (!confirm('모든 연습 기록을 삭제할까요?')) return;
    if (user) {
      clearUserRecords(user.id);
    } else {
      localStorage.removeItem('sc_records');
    }
    render();
  };

  window.viewRecordDetail = function (recordId) {
    window.location.href = `stats-detail.html?id=${recordId}`;
  };

  render();
});
