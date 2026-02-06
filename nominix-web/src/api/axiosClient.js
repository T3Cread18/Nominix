import axios from 'axios';

/**
 * Instancia de Axios configurada para el SaaS Nóminix.
 * Maneja la baseURL y la configuración de multi-tenancy.
 */
const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    withCredentials: true,
    xsrfCookieName: 'csrftoken',
    xsrfHeaderName: 'X-CSRFToken',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
});

// Interceptor opcional para manejar errores globales o inyectar headers dinámicos
axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Aquí se podrían manejar redirecciones a login o errores de tenant no encontrado
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export default axiosClient;
