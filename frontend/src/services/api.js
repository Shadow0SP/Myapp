import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Автоматически добавляет токен в заголовок каждого запроса
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Если токен устарел (401) — разлогиниваем и отправляем на /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  // --- Регистрация ---
  register:             (data) => api.post('/register', data),
  verifyEmail:          (data) => api.post('/verify-email', data),         // Новый: подтверждение кода
  resendVerification:   (data) => api.post('/resend-verification', data),  // Новый: повторная отправка кода

  // --- Вход / Выход ---
  login:                (data) => api.post('/login', data),
  logout:               ()     => api.post('/logout'),
  getUser:              ()     => api.get('/user'),

  // --- Сброс пароля ---
  forgotPassword:       (data) => api.post('/forgot-password', data),
  verifyResetCode:      (data) => api.post('/verify-reset-code', data),    // Новый: проверка кода
  resetPassword:        (data) => api.post('/reset-password', data),
};

export default api;