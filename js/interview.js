// ===== interview.js =====
// 모의 면접 시나리오 및 연습 관리

// 면접 시나리오 데이터
const interviewScenarios = [
  // 면접
  {
    id: 1,
    category: 'interview',
    title: '자기소개',
    description: '1 분 이내에 자기소개를 해주세요. 지원 동기 및 강점을 포함하세요.',
    timeLimit: 60,
    tips: [
      '간결하게 1 분 이내로',
      '지원 동기를 명확히',
      '구체적인 강점 제시'
    ]
  },
  {
    id: 2,
    category: 'interview',
    title: '장단점 질문',
    description: '본인의 장点和 단점에 대해 말해주세요. 단점은 어떻게 보완하고 있는지도 언급하세요.',
    timeLimit: 90,
    tips: [
      '장점은 직무와 연관지어',
      '단점은 개선 노력 강조',
      '솔직하되 전략적으로'
    ]
  },
  {
    id: 3,
    category: 'interview',
    title: '어려움 극복',
    description: '살면서 겪었던 가장 큰 어려움과 그것을 어떻게 극복했는지 말해주세요.',
    timeLimit: 120,
    tips: [
      '구체적인 상황 설명',
      '해결 과정 중점적으로',
      '배운 점 강조'
    ]
  },
  {
    id: 4,
    category: 'interview',
    title: '직무 적합성',
    description: '이 직무에 지원한 이유와 본인이 적합한 이유를 말해주세요.',
    timeLimit: 90,
    tips: [
      '회사 연구 결과 언급',
      '경험과 직무 연결',
      '미래 비전 제시'
    ]
  },
  {
    id: 5,
    category: 'interview',
    title: '경력 질문',
    description: '가장 성취감 있었던 프로젝트나 경험에 대해 말해주세요.',
    timeLimit: 120,
    tips: [
      '구체적인 역할 설명',
      '성과를 숫자로',
      '배운 점 강조'
    ]
  },
  
  // 발표
  {
    id: 6,
    category: 'presentation',
    title: '제품 소개',
    description: '새로운 스마트폰 앱을 3 분 동안 소개하는 프레젠테이션을 하세요.',
    timeLimit: 180,
    tips: [
      '문제 정의부터',
      '해결책 명확히',
      '장점 강조'
    ]
  },
  {
    id: 7,
    category: 'presentation',
    title: '프로젝트 결과 보고',
    description: '팀 프로젝트의 결과를 상사에게 보고하는 상황을 가정하고 발표하세요.',
    timeLimit: 180,
    tips: [
      '목표부터 설명',
      '성과 중심으로',
      '향후 계획 포함'
    ]
  },
  {
    id: 8,
    category: 'presentation',
    title: '아이디어 제안',
    description: '회사 매출 향상을 위한 새로운 아이디어를 제안하세요.',
    timeLimit: 150,
    tips: [
      '현황 분석 먼저',
      '구체적인 방안',
      '예상 효과 제시'
    ]
  },
  
  // 스피치
  {
    id: 9,
    category: 'speech',
    title: '즉흥 스피치',
    description: '"도전"이라는 주제로 2 분간 즉흥 연설을 하세요.',
    timeLimit: 120,
    tips: [
      '서론 - 본론 - 결론',
      '구체적인 예시',
      '메시지 명확히'
    ]
  },
  {
    id: 10,
    category: 'speech',
    title: '감동 스피치',
    description: '인생에서 가장 감사했던 일에 대해 2 분간 말하세요.',
    timeLimit: 120,
    tips: [
      '감정 표현 풍부하게',
      '구체적인 에피소드',
      '교훈으로 마무리'
    ]
  },
  {
    id: 11,
    category: 'speech',
    title: '설득 스피치',
    description: '"독서는 필수적이다"라는 주제로 청중을 설득하는 연설을 하세요.',
    timeLimit: 150,
    tips: [
      '명확한 주장',
      '근거 제시',
      '반론 예측 및 대응'
    ]
  },
  
  // 대화
  {
    id: 12,
    category: 'conversation',
    title: '고객 응대',
    description: '불만을 가진 고객을 진정시키고 해결책을 제시하는 대화를 하세요.',
    timeLimit: 90,
    tips: [
      '공감 먼저',
      '적극적인 태도',
      '구체적인 해결책'
    ]
  },
  {
    id: 13,
    category: 'conversation',
    title: '팀 회의',
    description: '회의에서 자신의 의견을 설득력 있게 제시하세요.',
    timeLimit: 60,
    tips: [
      '간결하게',
      '근거 함께',
      '협력적 태도'
    ]
  },
  {
    id: 14,
    category: 'conversation',
    title: '피드백 전달',
    description: '팀원에게 개선이 필요한 피드백을 전달하세요.',
    timeLimit: 90,
    tips: [
      '구체적인 사례',
      '비난 아닌 제안',
      '지원 의지 표현'
    ]
  }
];

// 상태 변수
let currentScenario = null;
let isRecording = false;
let timerInterval = null;
let remainingTime = 0;
let todayCount = parseInt(localStorage.getItem('sc_interview_today') || '0');
let lastDate = localStorage.getItem('sc_interview_date') || '';

// 오디오 녹음 변수
let mediaRecorder = null;
let audioChunks = [];
let finalTranscript = '';
let recognition = null;

// 오늘 날짜 확인 및 카운트 초기화
function checkToday() {
  const today = new Date().toDateString();
  if (lastDate !== today) {
    todayCount = 0;
    lastDate = today;
    localStorage.setItem('sc_interview_today', '0');
    localStorage.setItem('sc_interview_date', today);
  }
}

// 시나리오 렌더링
function renderScenarios(filter = 'all') {
  const grid = document.getElementById('scenarioGrid');
  const filtered = filter === 'all' 
    ? interviewScenarios 
    : interviewScenarios.filter(s => s.category === filter);
  
  const categoryNames = {
    interview: '면접',
    presentation: '발표',
    speech: '스피치',
    conversation: '대화'
  };
  
  grid.innerHTML = filtered.map(scenario => `
    <div class="scenario-card" onclick="selectScenario(${scenario.id})">
      <span class="scenario-category cat-${scenario.category}">${categoryNames[scenario.category]}</span>
      <div class="scenario-title">${scenario.title}</div>
      <div class="scenario-desc">${scenario.description}</div>
      <div class="scenario-meta">
        <span>⏱ ${scenario.timeLimit}초</span>
        <span>💡 ${scenario.tips.length}개 팁</span>
      </div>
    </div>
  `).join('');
}

// 시나리오 선택
function selectScenario(id) {
  currentScenario = interviewScenarios.find(s => s.id === id);
  
  // 모든 카드 선택 해제
  document.querySelectorAll('.scenario-card').forEach(card => {
    card.classList.remove('selected');
  });
  
  // 선택된 카드 강조
  event.currentTarget.classList.add('selected');
  
  // 질문 섹션 표시
  document.getElementById('questionSection').style.display = 'block';
  document.getElementById('questionText').textContent = currentScenario.title;
  document.getElementById('questionTips').innerHTML = `
    <strong>💡 답변 팁</strong>
    <ul>
      ${currentScenario.tips.map(tip => `<li>${tip}</li>`).join('')}
    </ul>
  `;
  
  // 스크롤
  document.getElementById('questionSection').scrollIntoView({ behavior: 'smooth' });
  
  // 타이머 초기화
  resetTimer();
}

// 타이머 리셋
function resetTimer() {
  remainingTime = currentScenario ? currentScenario.timeLimit : 0;
  updateTimerDisplay();
}

// 타이머 표시 업데이트
function updateTimerDisplay() {
  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;
  document.getElementById('timerDisplay').textContent = 
    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// 면접 시작
function startInterview() {
  if (!currentScenario) {
    showToast({
      type: 'warning',
      title: '시나리오 선택 필요',
      message: '먼저 면접 시나리오를 선택해주세요.',
      duration: 3000
    });
    return;
  }

  isRecording = true;
  document.getElementById('startBtn').style.display = 'none';
  document.getElementById('stopBtn').style.display = 'inline-flex';
  
  // 오디오 녹음 초기화
  audioChunks = [];
  finalTranscript = '';
  
  // 타이머 시작
  timerInterval = setInterval(() => {
    remainingTime--;
    updateTimerDisplay();

    if (remainingTime <= 0) {
      stopInterview();
      showToast({
        type: 'info',
        title: '시간 종료',
        message: '설정된 시간이 모두 소진되었습니다.',
        duration: 3000
      });
    } else if (remainingTime <= 10) {
      // 10 초 전 알림
      document.getElementById('timerDisplay').style.color = '#ef4444';
    }
  }, 1000);

  // 음성 인식 및 오디오 녹음 시작
  startSpeechRecognition();
  startAudioRecording();
}

// 면접 종료
function stopInterview() {
  isRecording = false;
  clearInterval(timerInterval);
  document.getElementById('startBtn').style.display = 'inline-flex';
  document.getElementById('stopBtn').style.display = 'none';
  document.getElementById('timerDisplay').style.color = '';

  // 음성 인식 및 오디오 녹음 중지
  stopSpeechRecognition();
  stopAudioRecording();

  // 카운트 증가
  todayCount++;
  localStorage.setItem('sc_interview_today', todayCount.toString());
  updateProgress();
  
  // 기록 저장
  const recordId = saveInterviewRecord();

  showToast({
    type: 'success',
    title: '면접 완료',
    message: '연습이 저장되었습니다.',
    duration: 3000
  });
  
  // 1 초 후 결과 페이지로 이동
  setTimeout(() => {
    window.location.href = `interview-result.html?id=${recordId}`;
  }, 1000);
}

// 다음 질문
function showNextQuestion() {
  if (!currentScenario) return;

  const currentIndex = interviewScenarios.findIndex(s => s.id === currentScenario.id);
  const nextIndex = (currentIndex + 1) % interviewScenarios.length;

  selectScenario(interviewScenarios[nextIndex].id);
}

// 면접 기록 저장
function saveInterviewRecord() {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  
  const record = {
    id: Date.now(),
    date: new Date().toLocaleString('ko-KR'),
    type: 'interview',
    customName: '모의 면접 연습', // 기본 이름
    scenarioId: currentScenario.id,
    scenarioTitle: currentScenario.title,
    category: currentScenario.category,
    timeLimit: currentScenario.timeLimit,
    actualTime: currentScenario.timeLimit - remainingTime,
    transcript: finalTranscript.trim(),
    score: Math.round((remainingTime / currentScenario.timeLimit) * 100) // 시간 내 완료 정도에 따라 점수
  };
  
  // 사용자 기록 저장
  if (user) {
    const userRecords = JSON.parse(localStorage.getItem('sc_interview_records_' + user.id) || '[]');
    userRecords.unshift(record);
    localStorage.setItem('sc_interview_records_' + user.id, JSON.stringify(userRecords.slice(0, 50))); // 최근 50 개만 저장
  }
  
  // 게스트용 기록
  const guestRecords = JSON.parse(localStorage.getItem('sc_guest_interview_records') || '[]');
  guestRecords.unshift(record);
  localStorage.setItem('sc_guest_interview_records', JSON.stringify(guestRecords.slice(0, 50)));
  
  return record.id;
}

// 오디오 녹음 시작
async function startAudioRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
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

// 진행도 업데이트
function updateProgress() {
  const target = 5;
  const percent = Math.min((todayCount / target) * 100, 100);
  
  document.getElementById('progressCount').textContent = `${todayCount} / ${target}회`;
  document.getElementById('progressFill').style.width = `${percent}%`;
}

// 음성 인식 시작
function startSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  recognition = new SpeechRecognition();
  recognition.lang = localStorage.getItem('sc_speech_lang') || 'ko-KR';
  recognition.continuous = true;
  recognition.interimResults = true;
  
  recognition.onresult = function(event) {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript + ' ';
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
  };
  
  recognition.start();
}

// 음성 인식 중지
function stopSpeechRecognition() {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
}

// 카테고리 필터
function setupFilter() {
  document.getElementById('categoryFilter').addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      renderScenarios(e.target.dataset.category);
    }
  });
}

// 페이지 초기화
document.addEventListener('DOMContentLoaded', () => {
  checkToday();
  renderScenarios();
  setupFilter();
  updateProgress();
});
