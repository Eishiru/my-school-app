// One API setting for login, teacher, student and admin requests.
const configured = (import.meta.env.VITE_API_BASE_URL || '/api').trim().replace(/\/+$/, '');
export const API_BASE_URL = configured.endsWith('/api') ? configured : `${configured}/api`;
