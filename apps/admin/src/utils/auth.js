// apps/admin/src/utils/auth.js
const TOKEN_KEY = 'gigcare_admin_token';

export function setAdminToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAdminAuthenticated() {
  return !!getAdminToken();
}
