// ===== feedback.js =====
// 다국어 지원용 헬퍼 함수
function t(key) {
  if (window.i18n && typeof window.i18n.t === 'function') {
    return window.i18n.t(key);
  }
  // 기본 한국어 번역 (폴백)
  const fallbacks = {
    'feedback-category-silence': '침묵 관리',
    'feedback-category-speed': '말하기 속도',
    'feedback-category-filler': '언어 습관',
    'feedback-category-words': '발음/발화량',
    'feedback-action-title': '📌 추천 연습 방법'
  };
  return fallbacks[key] || key;
}

let radarChartInstance = null;

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

function createRadarChart(ctx, scores) {
  if (radarChartInstance) {
    radarChartInstance.destroy();
  }

  const labels = [
    t('feedback-category-silence') || '침묵 관리',
    t('feedback-category-speed') || '말하기 속도',
    t('feedback-category-filler') || '언어 습관',
    t('feedback-category-words') || '발음/발화량'
  ];
  const data = [scores.silence, scores.speed, scores.filler, scores.words];
  const bgColor = getScoreColor(scores.overall);

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [{
        label: '내 점수',
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
          angleLines: {
            color: 'rgba(139, 92, 246, 0.2)'
          },
          grid: {
            color: 'rgba(139, 92, 246, 0.15)'
          },
          pointLabels: {
            color: '#e2e8f0',
            font: { size: 12, weight: '600' }
          },
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
          display: false
        },
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
      animation: {
        duration: 1500,
        easing: 'easeOutQuart'
      }
    }
  });
}

function renderFeedback() {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const container = document.getElementById('feedbackContent');

  // 로그인 체크 - 게스트 사용자는 제한
  if (!user) {
    // 게스트 사용자는 로그인 유도 메시지 표시
    container.innerHTML = `
      <div class="no-data">
        <span class="nd-icon">🔒</span>
        <h3>로그인이 필요한 기능입니다</h3>
        <p>AI 상세 피드백은 로그인한 사용자만 이용할 수 있습니다.<br/>로그인하고 더 많은 기능을 경험하세요!</p>
        <div style="display:flex;gap:0.8rem;justify-content:center;margin-top:1.5rem;">
          <a href="login.html" class="btn btn-primary btn-lg">로그인</a>
          <a href="signup.html" class="btn btn-outline btn-lg">회원가입</a>
        </div>
      </div>
    `;
    
    // 네비게이션 바 업데이트
    if (typeof applyNavAuth === 'function') {
      applyNavAuth();
    }
    return;
  }

  const recordKey = user ? 'sc_last_record_' + user.id : 'sc_guest_record';
  const recordStorage = user ? localStorage : sessionStorage;
  const record = JSON.parse(recordStorage.getItem(recordKey) || 'null');

  if (!record) {
    container.innerHTML = `
      <div class="no-data">
        <div class="nd-icon">📊</div>
        <h3>분석할 연습 데이터가 없습니다</h3>
        <p>먼저 연습을 진행하고 결과를 저장해 주세요.</p>
        <a href="practice.html" class="btn btn-primary">연습 시작하기</a>
      </div>
    `;
    return;
  }

  // 언어 변경 시 재생성을 위해 window 에 저장
  window.lastFeedbackRecord = record;

  const grade = getGradeInfo(record.score);

  const silenceScore = getCategoryScore(record.silenceRate, 'silence');
  const speedScore   = getCategoryScore(record.wpm, 'speed');
  const fillerScore  = getCategoryScore(record.fillerCount, 'filler');
  const wordsScore   = getCategoryScore(record.wordCount, 'words');

  function silenceComment(rate) {
    if (rate <= 20) return '침묵 비율이 매우 낮아 발화가 자연스럽게 이어졌습니다. 훌륭합니다!';
    if (rate <= 40) return '침묵 구간이 다소 있습니다. 다음 문장을 미리 준비하는 연습을 해보세요.';
    return '침묵 비율이 높습니다. 핵심 내용을 미리 정리하고 연습하면 크게 개선됩니다.';
  }

  function speedComment(wpm) {
    if (wpm >= 150 && wpm <= 200) return '최적의 말하기 속도입니다. 청중이 내용을 충분히 이해할 수 있는 속도입니다.';
    if (wpm < 100) return '말하기 속도가 너무 느립니다. 조금 더 자신감 있게 빠르게 말해보세요.';
    if (wpm > 250) return '말하기 속도가 너무 빠릅니다. 천천히, 명확하게 말하는 연습이 필요합니다.';
    return '적정 범위에 가깝습니다. 150~200 WPM 을 목표로 연습해보세요.';
  }

  function fillerComment(count) {
    if (count === 0) return '습관적 추임새가 전혀 없습니다. 매우 깔끔한 발화입니다!';
    if (count <= 2) return '추임새가 거의 없어 깔끔한 편입니다. 조금 더 신경 써보세요.';
    if (count <= 5) return `추임새가 ${count}회 감지되었습니다. 의식적으로 줄이는 연습을 하세요.`;
    return `추임새가 ${count}회로 꽤 많습니다. 발화 전 잠깐 멈추고 생각하는 습관을 길러보세요.`;
  }

  function wordsComment(count, wpm) {
    if (count >= 100) return `총 ${count}단어로 충분한 내용을 전달했습니다. 발화량이 적절합니다.`;
    if (count >= 50) return `총 ${count}단어를 발화했습니다. 조금 더 많은 내용을 말하는 연습을 해보세요.`;
    return `발화량이 적습니다 (${count}단어). 더 많은 내용을 준비하고 연습해보세요.`;
  }

  const actionItems = [];

  if (record.silenceRate > 20) {
    actionItems.push({
      title: '침묵 줄이기 연습',
      desc: '발화 전에 핵심 키워드를 메모해두고, 자연스럽게 연결하는 연습을 5 분씩 매일 하세요.'
    });
  }
  if (record.wpm < 130 || record.wpm > 220) {
    actionItems.push({
      title: '속도 조절 연습',
      desc: '150~200 WPM 목표로 타이머를 활용해 동일한 스크립트를 반복 연습하세요.'
    });
  }
  if (record.fillerCount > 2) {
    actionItems.push({
      title: '추임새 제거 연습',
      desc: '"음", "어" 등이 나오려 할 때 잠깐 침묵하는 습관을 들이세요. 녹음 후 스스로 체크하세요.'
    });
  }
  if (record.wordCount < 50) {
    actionItems.push({
      title: '발화량 늘리기',
      desc: '주제를 하나 정하고 3 분간 쉬지 않고 말하는 연습을 매일 반복하세요.'
    });
  }
  if (actionItems.length === 0) {
    actionItems.push({
      title: '현재 수준 유지',
      desc: '훌륭한 스피치 실력입니다! 더 어려운 주제로 도전하며 수준을 유지하세요.'
    });
    actionItems.push({
      title: '다양한 주제 연습',
      desc: '익숙한 주제 외에도 처음 접하는 주제로 즉흥 스피치 연습을 해보세요.'
    });
  }

  container.innerHTML = `
    <!-- 종합 점수 -->
    <div class="score-section">
      <div class="score-label">종합 점수</div>
      <div class="score-number">${record.score}</div>
      <div class="score-max">/ 100 점</div>
      <span class="score-grade badge ${grade.cls}">${grade.label}</span>
      <div style="margin-top:1rem;font-size:0.85rem;color:var(--text-muted);">${record.date} 연습 결과</div>
    </div>

    <!-- 레이더 차트 -->
    <div class="chart-wrap">
      <div class="chart-title">영역별 분석</div>
      <div class="chart-container">
        <canvas id="radarChart"></canvas>
      </div>
    </div>

    <!-- 카테고리 분석 -->
    <div class="cat-grid">

      <div class="cat-card">
        <div class="cat-hdr">
          <div class="cat-title"><span>🤫</span> 침묵 & 포즈</div>
          <div class="cat-score">${silenceScore}점</div>
        </div>
        <div style="margin-bottom:0.5rem;">
          <div style="background:var(--border);border-radius:99px;height:8px;overflow:hidden;">
            <div class="progress-fill" style="width:0%;height:100%;background:${getScoreColor(silenceScore)};border-radius:99px;" data-width="${silenceScore}%"></div>
          </div>
        </div>
        <div class="detail-row"><span>침묵 비율</span><span>${record.silenceRate}%</span></div>
        <div class="detail-row"><span>침묵 시간</span><span>${formatTime(record.silenceTime)}</span></div>
        <div class="detail-row"><span>발화 시간</span><span>${formatTime(record.speakTime)}</span></div>
        <div style="margin-top:0.8rem;font-size:0.82rem;color:var(--text-dim);line-height:1.6;">${silenceComment(record.silenceRate)}</div>
      </div>

      <div class="cat-card">
        <div class="cat-hdr">
          <div class="cat-title"><span>⚡</span> 말하기 속도</div>
          <div class="cat-score">${speedScore}점</div>
        </div>
        <div style="margin-bottom:0.5rem;">
          <div style="background:var(--border);border-radius:99px;height:8px;overflow:hidden;">
            <div class="progress-fill" style="width:0%;height:100%;background:${getScoreColor(speedScore)};border-radius:99px;" data-width="${speedScore}%"></div>
          </div>
        </div>
        <div class="detail-row"><span>측정 속도</span><span>${record.wpm} WPM</span></div>
        <div class="detail-row"><span>최적 범위</span><span>150~200 WPM</span></div>
        <div class="detail-row"><span>전체 시간</span><span>${formatTime(record.totalTime)}</span></div>
        <div style="margin-top:0.8rem;font-size:0.82rem;color:var(--text-dim);line-height:1.6;">${speedComment(record.wpm)}</div>
      </div>

      <div class="cat-card">
        <div class="cat-hdr">
          <div class="cat-title"><span>💬</span> 언어 습관</div>
          <div class="cat-score">${fillerScore}점</div>
        </div>
        <div style="margin-bottom:0.5rem;">
          <div style="background:var(--border);border-radius:99px;height:8px;overflow:hidden;">
            <div class="progress-fill" style="width:0%;height:100%;background:${getScoreColor(fillerScore)};border-radius:99px;" data-width="${fillerScore}%"></div>
          </div>
        </div>
        <div class="detail-row"><span>추임새 횟수</span><span>${record.fillerCount}회</span></div>
        <div class="detail-row"><span>총 단어 수</span><span>${record.wordCount}단어</span></div>
        <div class="detail-row"><span>추임새 비율</span><span>${record.wordCount > 0 ? Math.round((record.fillerCount / record.wordCount) * 100) : 0}%</span></div>
        <div style="margin-top:0.8rem;font-size:0.82rem;color:var(--text-dim);line-height:1.6;">${fillerComment(record.fillerCount)}</div>
      </div>

      <div class="cat-card">
        <div class="cat-hdr">
          <div class="cat-title"><span>🗣</span> 발음 & 발화량</div>
          <div class="cat-score">${wordsScore}점</div>
        </div>
        <div style="margin-bottom:0.5rem;">
          <div style="background:var(--border);border-radius:99px;height:8px;overflow:hidden;">
            <div class="progress-fill" style="width:0%;height:100%;background:${getScoreColor(wordsScore)};border-radius:99px;" data-width="${wordsScore}%"></div>
          </div>
        </div>
        <div class="detail-row"><span>총 단어 수</span><span>${record.wordCount}단어</span></div>
        <div class="detail-row"><span>발화 시간</span><span>${formatTime(record.speakTime)}</span></div>
        <div class="detail-row"><span>전체 시간</span><span>${formatTime(record.totalTime)}</span></div>
        <div style="margin-top:0.8rem;font-size:0.82rem;color:var(--text-dim);line-height:1.6;">${wordsComment(record.wordCount, record.wpm)}</div>
      </div>

    </div>

    <!-- 음성 인식 내용 미리보기 -->
    ${record.transcript ? `
    <div class="action-card">
      <div class="section-title">📝 인식된 발화 내용</div>
      <p style="font-size:0.92rem;color:var(--text-muted);line-height:1.8;">"${record.transcript}${record.transcript.length >= 300 ? '...' : ''}"</p>
    </div>
    ` : ''}

    <!-- 액션 아이템 -->
    <div class="action-card">
      <div class="section-title">🎯 이번 주 연습 목표 (Action Items)</div>
      ${actionItems.map((a, i) => `
        <div class="action-item">
          <div class="act-num">${i + 1}</div>
          <div class="act-text">
            <strong>${a.title}</strong>
            <span>${a.desc}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // Create radar chart
  const ctx = document.getElementById('radarChart');
  if (ctx) {
    createRadarChart(ctx, {
      silence: silenceScore,
      speed: speedScore,
      filler: fillerScore,
      words: wordsScore,
      overall: record.score
    });
  }

  // Animate progress bars after DOM update
  setTimeout(() => {
    document.querySelectorAll('.progress-fill').forEach(bar => {
      const targetWidth = bar.getAttribute('data-width');
      bar.style.width = targetWidth;
    });
  }, 100);
}

renderFeedback();

// 언어 변경 시 차트 재생성
window.addEventListener('languageChanged', () => {
  const record = window.lastFeedbackRecord;
  if (record) {
    renderFeedback();
  }
});
