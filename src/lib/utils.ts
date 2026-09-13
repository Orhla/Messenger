export { cn } from 'cn';

export function getUsername(): string {
  const stored = localStorage.getItem('username');
  if (stored) return stored;
  const name = 'User_' + Math.random().toString(36).slice(2, 6);
  localStorage.setItem('username', name);
  return name;
}
