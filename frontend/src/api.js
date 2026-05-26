const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

const apiRequest = async (endpoint, options = {}) => {
    const token = localStorage.getItem('teddy_token');

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    // Build query string from params if provided
    let url = `${API_URL}${endpoint}`;
    if (options.params) {
        const searchParams = new URLSearchParams();
        Object.entries(options.params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.append(key, value);
            }
        });
        const queryString = searchParams.toString();
        if (queryString) {
            url += `?${queryString}`;
        }
    }

    const config = {
        ...options,
        headers
    };
    // Remove params from config since fetch doesn't use it
    delete config.params;

    try {
        const response = await fetch(url, config);

        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
        } else {
            data = { message: await response.text() };
        }

        if (!response.ok) {
            // If unauthorized and not a login/register request, clear token
            if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
                localStorage.removeItem('teddy_token');
            }
            throw new Error(data.message || `Error ${response.status}: ${response.statusText}`);
        }

        return data;
    } catch (error) {
        console.error('API Request Error:', error.message);
        throw error;
    }
};

export const api = {
    get: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'GET' }),
    post: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
    put: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
    patch: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
    delete: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'DELETE' }),

    // Specialized for file uploads
    upload: async (endpoint, formData) => {
        const token = localStorage.getItem('teddy_token');
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            body: formData,
            headers: {
                ...(token && { 'Authorization': `Bearer ${token}` }),
            }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Upload failed');
        return data;
    },

    getImageUrl: (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${BASE_URL}${path}`;
    }
};
