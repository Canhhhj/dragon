// state.js – helper functions for admin panel

/**
 * Lấy toàn bộ state từ localStorage
 */
function getState(){
  try {
    return JSON.parse(localStorage.getItem('dragon_state')||'{}');
  } catch(e){
    console.error('Error parsing dragon_state', e);
    return {};
  }
}
/**
 * Lưu toàn bộ state vào localStorage
 */
function setState(state){
  localStorage.setItem('dragon_state', JSON.stringify(state));
}
/**
 * Lấy thông tin admin credentials (username, password) từ localStorage
 */
function getCreds(){
  try {
    return JSON.parse(localStorage.getItem('admin_creds')||'{}');
  } catch(e){
    console.error('Error parsing admin_creds', e);
    return {};
  }
}
/**
 * Lưu credentials (username, hashed password) vào localStorage
 */
function setCreds(creds){
  localStorage.setItem('admin_creds', JSON.stringify(creds));
}
/**
 * Hash password using SHA‑256 (returns hex string)
 */
async function hashPassword(pw){
  const encoder = new TextEncoder();
  const data = encoder.encode(pw);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
/**
 * Kiểm tra login, trả về Promise<boolean>
 */
async function checkLogin(user, pw){
  const creds = getCreds();
  if(!creds.username){
    // nếu chưa có credential, dùng mặc định admin / dragon2024
    return user==='admin' && pw==='dragon2024';
  }
  const hashed = await hashPassword(pw);
  return user===creds.username && hashed===creds.passwordHash;
}
/**
 * Đánh dấu đã login (sessionStorage)
 */
function markLoggedIn(){
  sessionStorage.setItem('adminLoggedIn','true');
}
function isLoggedIn(){
  return sessionStorage.getItem('adminLoggedIn')==='true';
}
/**
 * Đăng xuất
 */
function logout(){
  sessionStorage.removeItem('adminLoggedIn');
  location.reload();
}

// Export to window for other scripts
window.getState = getState;
window.setState = setState;
window.getCreds = getCreds;
window.setCreds = setCreds;
window.checkLogin = checkLogin;
window.markLoggedIn = markLoggedIn;
window.isLoggedIn = isLoggedIn;
window.logout = logout;
