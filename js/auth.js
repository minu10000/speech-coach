// ===== auth.js =====
// localStorage 기반 사용자 인증 시스템

const USERS_KEY = 'sc_users';
const SESSION_KEY = 'sc_session';

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

// 네비게이션 바 로그인 상태 반영
function applyNavAuth() {
  const user = getCurrentUser();
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks) return;

  const loginLi = navLinks.querySelector('a[href="login.html"]')?.parentElement;
  const signupLi = navLinks.querySelector('a[href="signup.html"]')?.parentElement;
  const profileLi = navLinks.querySelector('a[href="profile.html"]')?.parentElement;

  if (user) {
    // 로그인 시: 로그인, 회원가입 제거
    if (loginLi) loginLi.remove();
    if (signupLi) signupLi.remove();
    
    // 프로필 링크를 사용자 정보로 변경
    if (profileLi) {
      profileLi.innerHTML = `<a href="profile.html" class="nav-user">👤 ${user.nickname || user.username}</a>`;
    }

    const logoutLi = document.createElement('li');
    logoutLi.innerHTML = `<a href="#" onclick="logout(); return false;" class="nav-logout">로그아웃</a>`;
    navLinks.appendChild(logoutLi);
  } else {
    // 로그아웃 시: 사용자 정보, 로그아웃 제거
    const userLi = navLinks.querySelector('.nav-user')?.parentElement;
    const logoutLi = navLinks.querySelector('.nav-logout')?.parentElement;
    if (userLi) userLi.remove();
    if (logoutLi) logoutLi.remove();
  }
}

document.addEventListener('DOMContentLoaded', applyNavAuth);
