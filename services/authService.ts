import { User } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'auth_token';

type AuthListener = (user: User | null) => void;
let listener: AuthListener | null = null;
let currentUser: User | null = null;

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getAuthToken(): string | null {
  return getToken();
}

async function fetchCurrentUser(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { clearToken(); return null; }
    return await res.json() as User;
  } catch {
    return null;
  }
}

async function initialize(): Promise<void> {
  currentUser = await fetchCurrentUser();
  if (listener) listener(currentUser);
}

export const authService = {
  onAuthStateChanged: (cb: AuthListener): (() => void) => {
    listener = cb;
    initialize();
    return () => { listener = null; };
  },

  signIn: async (password: string): Promise<void> => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) throw new Error('Invalid password');
    const { token } = await res.json();
    setToken(token);
    currentUser = await fetchCurrentUser();
    if (listener) listener(currentUser);
  },

  signOut: async (): Promise<void> => {
    clearToken();
    currentUser = null;
    if (listener) listener(null);
  },

  getCurrentUser: (): User | null => currentUser,
};
