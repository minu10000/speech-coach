// ===== auth.js =====
// localStorage 기반 사용자 인증 시스템

const USERS_KEY = 'sc_users';
const SESSION_KEY = 'sc_session';

// 토스트 알림 컨테이너 생성
function ensureToastContainer() {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

// 토스트 알림 표시 함수
function showToast(options) {
  const {
    type = 'info', // success, warning, error, info
    title,
    message,
    duration = 3000,
    icon
  } = options;

  const container = ensureToastContainer();
  
  // 아이콘 매핑
  const icons = {
    success: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
    warning: '<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
    error: '<svg viewBox="0 0 24 24"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>',
    info: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon toast-icon-${type}">
      ${icons[type] || icons.info}
    </div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    </button>
  `;

  container.appendChild(toast);
  container.classList.add('show');

  // 자동 삭제
  if (duration > 0) {
    setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.4s ease forwards';
      setTimeout(() => {
        toast.remove();
        if (container.children.length === 0) {
          container.classList.remove('show');
        }
      }, 400);
    }, duration);
  }

  return toast;
}

// 전역에서 사용 가능하도록 window 에 등록
window.showToast = showToast;

// 기록 비교 모달 표시 함수
window.showCompareModal = function(records, currentId, onSelect) {
  // 현재 기록을 제외한 다른 기록들
  const otherRecords = records.filter(r => r.id !== currentId);

  if (otherRecords.length === 0) {
    showToast({
      type: 'warning',
      title: '비교할 기록이 없습니다',
      message: '다른 연습 기록을 먼저 저장해주세요.',
      duration: 3000,
      icon: '📊'
    });
    return;
  }

  // 모달 생성
  const overlay = document.createElement('div');
  overlay.className = 'compare-modal-overlay';
  overlay.innerHTML = `
    <div class="compare-modal">
      <div class="compare-modal-header">
        <div class="compare-modal-title">기록 비교하기</div>
        <button class="compare-modal-close" onclick="this.closest('.compare-modal-overlay').remove()">
          <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>
      <div class="compare-record-list">
        ${otherRecords.map((r, i) => `
          <div class="compare-record-item" data-index="${i}">
            <div class="compare-record-icon">🎤</div>
            <div class="compare-record-content">
              <div class="compare-record-date">${r.date}</div>
              <div class="compare-record-meta">
                <span>⏱ ${formatCompareTime(r.totalTime)}</span>
                <span>💬 ${r.wordCount}단어</span>
                <span>🚀 ${r.wpm}WPM</span>
              </div>
            </div>
            <div class="compare-record-score">${r.score}점</div>
            <div class="compare-record-arrow">
              <svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // 애니메이션을 위한 약간의 지연
  setTimeout(() => {
    overlay.classList.add('show');
  }, 10);

  // 클릭 이벤트 처리
  overlay.querySelectorAll('.compare-record-item').forEach((item, index) => {
    item.addEventListener('click', function() {
      const selectedRecord = otherRecords[index];
      
      // 모달 닫기
      overlay.classList.remove('show');
      setTimeout(() => {
        overlay.remove();
      }, 300);

      // 선택 완료 알림
      showCompareResult(selectedRecord);

      // 콜백 호출 (있는 경우)
      if (typeof onSelect === 'function') {
        onSelect(selectedRecord);
      }
    });
  });

  // 오버레이 클릭 시 닫기
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      overlay.classList.remove('show');
      setTimeout(() => {
        overlay.remove();
      }, 300);
    }
  });
};

// 비교 결과 토스트 표시
function showCompareResult(record) {
  const toast = document.createElement('div');
  toast.className = 'compare-result-toast';
  toast.innerHTML = `
    <div class="compare-result-icon">
      <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
    </div>
    <div class="compare-result-content">
      <div class="compare-result-title">기록이 선택되었습니다</div>
      <div class="compare-result-message">${record.date} · ${record.score}점 · ${record.wordCount}단어</div>
    </div>
    <button class="compare-result-close" onclick="this.parentElement.remove()">
      <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    </button>
  `;

  document.body.appendChild(toast);

  // 3 초 후 자동 삭제
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, 3000);
}

// 비교용 시간 포맷
function formatCompareTime(sec) {
  if (!sec || sec < 60) return (sec || 0) + '초';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}분 ${s > 0 ? s + '초' : ''}`;
}

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  const session = localStorage.getItem(SESSION_KEY);
  if (!session) return null;
  try {
    return JSON.parse(session);
  } catch {
    return null;
  }
}

function signup(username, password, email) {
  const users = getUsers();
  const exists = users.find(u => u.username === username);
  if (exists) {
    return { success: false, message: '이미 사용 중인 아이디입니다.' };
  }
  const emailExists = users.find(u => u.email === email);
  if (emailExists) {
    return { success: false, message: '이미 가입된 이메일입니다.' };
  }
  const newUser = {
    id: Date.now().toString(),
    username,
    password,
    email,
    nickname: username, // 기본 닉네임은 아이디로
    profileImage: null,
    bio: '',
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  saveUsers(users);
  
  // 현재 사용자도 업데이트
  const session = { id: newUser.id, username: newUser.username, email: newUser.email, nickname: newUser.nickname, profileImage: null, bio: '' };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  
  return { success: true };
}

function login(username, password, remember) {
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  }
  const session = { 
    id: user.id, 
    username: user.username, 
    email: user.email,
    nickname: user.nickname || user.username,
    profileImage: user.profileImage || null,
    bio: user.bio || '',
    joinDate: new Date(user.createdAt).toLocaleDateString('ko-KR')
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  if (remember) {
    localStorage.setItem('sc_remember', '1');
  } else {
    localStorage.removeItem('sc_remember');
  }
  return { success: true, user: session };
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = 'login.html';
}

function requireLogin() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

function getUserRecordsKey(userId) {
  return 'sc_records_' + userId;
}

function getUserRecords(userId) {
  return JSON.parse(localStorage.getItem(getUserRecordsKey(userId)) || '[]');
}

function saveUserRecord(userId, record) {
  const records = getUserRecords(userId);
  records.unshift(record);
  localStorage.setItem(getUserRecordsKey(userId), JSON.stringify(records));
}

function clearUserRecords(userId) {
  localStorage.removeItem(getUserRecordsKey(userId));
}

// 사용자 정보 업데이트 (프로필 수정용)
function updateCurrentUser(updatedUser) {
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === updatedUser.id);
  if (userIndex === -1) return false;
  
  // users 배열 업데이트
  users[userIndex] = { ...users[userIndex], ...updatedUser };
  saveUsers(users);
  
  // 세션도 업데이트
  localStorage.setItem(SESSION_KEY, JSON.stringify(users[userIndex]));
  
  return true;
}

// 네비게이션 바 로그인 상태 반영
function applyNavAuth() {
  const user = getCurrentUser();
  const body = document.body;
  
  console.log('applyNavAuth 실행 - 로그인 상태:', user ? '로그인됨' : '로그아웃됨');

  // body 에 클래스 추가 (CSS 와 연동)
  if (user) {
    body.classList.add('logged-in');
  } else {
    body.classList.remove('logged-in');
  }

  // 네비게이션 바 처리
  const navLinks = document.querySelector('.nav-links');
  if (navLinks) {
    // 로그인/로그아웃 상태에 따라 li 요소 표시/숨김
    const guestOnlyElements = navLinks.querySelectorAll('li.guest-only');
    const authOnlyElements = navLinks.querySelectorAll('li.auth-only');
    console.log('guest-only 요소:', guestOnlyElements.length, '개');
    console.log('auth-only 요소:', authOnlyElements.length, '개');

    if (user) {
      // 로그인 상태: 게스트 전용 숨김, 인증 사용자 전용 표시
      guestOnlyElements.forEach(function(el) {
        el.style.display = 'none';
      });
      authOnlyElements.forEach(function(el) {
        el.style.display = 'flex';
      });

      // 프로필 링크를 사용자 정보로 변경
      const profileLi = navLinks.querySelector('li.auth-only');
      if (profileLi) {
        profileLi.innerHTML = '<a href="profile.html" class="nav-user">👤 ' + (user.nickname || user.username) + '</a>';
      }

      // 로그아웃 버튼 추가 (이미 있으면 skip)
      if (!navLinks.querySelector('.nav-logout')) {
        var logoutLi = document.createElement('li');
        logoutLi.style.display = 'flex';
        logoutLi.style.alignItems = 'center';
        logoutLi.innerHTML = '<a href="#" onclick="logout(); return false;" class="nav-logout">로그아웃</a>';
        navLinks.appendChild(logoutLi);
      }
    } else {
      // 로그아웃 상태: 게스트 전용 표시, 인증 사용자 전용 숨김
      guestOnlyElements.forEach(function(el) {
        el.style.display = 'flex';
      });
      authOnlyElements.forEach(function(el) {
        el.style.display = 'none';
      });

      // 로그아웃 버튼 제거
      var logoutLi = navLinks.querySelector('.nav-logout');
      if (logoutLi) logoutLi.parentNode.removeChild(logoutLi);
    }
  }

  // 페이지 내 모든 guest-only 요소 처리
  var guestOnlyButtons = document.querySelectorAll('.guest-only');
  guestOnlyButtons.forEach(function(el) {
    if (user) {
      el.style.display = 'none';
    } else {
      el.style.display = '';
    }
  });
}

document.addEventListener('DOMContentLoaded', applyNavAuth);
