import axios from 'axios';

const API_BASE_URL = 'https://showcase-pwyf.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Transparent token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and request has not been retried yet
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        api.post('/auth/refresh')
          .then(({ data }) => {
            const { accessToken } = data;
            localStorage.setItem('accessToken', accessToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
            processQueue(null, accessToken);
            resolve(api(originalRequest));
          })
          .catch((err) => {
            processQueue(err, null);
            // Clear localStorage and redirect to login
            localStorage.removeItem('accessToken');
            window.dispatchEvent(new Event('auth_logout'));
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  }
);

// --- API Service Wrapper Functions ---

const auth = {
  register: (username, email, password, gender) => api.post('/auth/register', { username, email, password, gender }),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  login: (username, password) => api.post('/auth/login', { username, password }),
  verify2FA: (tempToken, code) => api.post('/auth/login/2fa', { tempToken, code }),
  logout: () => api.post('/auth/logout'),
  setup2FA: () => api.post('/auth/2fa/setup'),
  enable2FA: (code) => api.post('/auth/2fa/enable', { code }),
  disable2FA: (password) => api.post('/auth/2fa/disable', { password }),
  requestReset: (email) => api.post('/auth/password-reset/request', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/password-reset/reset', { token, newPassword })
};

const dashboard = {
  getSummary: () => api.get('/dashboard/summary'),
  getProfile: () => api.get('/dashboard/profile'),
  updateProfile: (formData) => api.put('/dashboard/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateSettings: (settings) => api.put('/dashboard/settings', settings),

  // Projects
  getProjects: () => api.get('/dashboard/projects'),
  createProject: (formData) => api.post('/dashboard/projects', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateProject: (id, formData) => api.put(`/dashboard/projects/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteProject: (id) => api.delete(`/dashboard/projects/${id}`),

  // Skills
  getSkills: () => api.get('/dashboard/skills'),
  createSkill: (skill) => api.post('/dashboard/skills', skill),
  updateSkill: (id, skill) => api.put(`/dashboard/skills/${id}`, skill),
  deleteSkill: (id) => api.delete(`/dashboard/skills/${id}`),

  // Experience
  getExperience: () => api.get('/dashboard/experience'),
  createExperience: (exp) => api.post('/dashboard/experience', exp),
  updateExperience: (id, exp) => api.put(`/dashboard/experience/${id}`, exp),
  deleteExperience: (id) => api.delete(`/dashboard/experience/${id}`),

  // Education
  getEducation: () => api.get('/dashboard/education'),
  createEducation: (edu) => api.post('/dashboard/education', edu),
  updateEducation: (id, edu) => api.put(`/dashboard/education/${id}`, edu),
  deleteEducation: (id) => api.delete(`/dashboard/education/${id}`),

  // Certificates
  getCertificates: () => api.get('/dashboard/certificates'),
  createCertificate: (formData) => api.post('/dashboard/certificates', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteCertificate: (id) => api.delete(`/dashboard/certificates/${id}`),

  // Social Links
  getSocialLinks: () => api.get('/dashboard/social-links'),
  saveSocialLinks: (links) => api.post('/dashboard/social-links', { links }),

  // Blogs
  getBlogs: () => api.get('/dashboard/blogs'),
  createBlog: (formData) => api.post('/dashboard/blogs', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateBlog: (id, formData) => api.put(`/dashboard/blogs/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteBlog: (id) => api.delete(`/dashboard/blogs/${id}`),

  // Messages
  getMessages: () => api.get('/dashboard/messages'),
  markMessageRead: (id) => api.put(`/dashboard/messages/${id}/read`),
  deleteMessage: (id) => api.delete(`/dashboard/messages/${id}`),

  // Recommendations
  getRecommendations: () => api.get('/dashboard/recommendations'),
  updateRecommendationStatus: (id, status) => api.put(`/dashboard/recommendations/${id}/status`, { status }),

  // Themes & Analytics
  getThemes: () => api.get('/dashboard/themes'),
  getAnalytics: () => api.get('/dashboard/analytics')
};

const portfolios = {
  getByUsername: (username) => api.get(`/portfolios/${username}`),
  sendMessage: (username, messageData) => api.post(`/portfolios/${username}/message`, messageData),
  giveRecommendation: (username, recData) => api.post(`/portfolios/${username}/recommend`, recData),
  toggleFollow: (username) => api.post(`/portfolios/${username}/follow`)
};

const mainPublic = {
  getDiscover: () => api.get('/discover'),
  search: (query) => api.get(`/search?q=${encodeURIComponent(query)}`),
  getBlogs: () => api.get('/blogs'),
  getBlogBySlug: (username, slug) => api.get(`/blogs/${username}/${slug}`),
  trackAnalytics: (username, event_type, resource_id) => api.post('/analytics/track', {
    username,
    event_type,
    resource_id,
    referrer: document.referrer
  })
};

const apiService = {
  api,
  auth,
  dashboard,
  portfolios,
  public: mainPublic
};

export default apiService;
