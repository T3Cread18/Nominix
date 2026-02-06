import axios from 'axios';

/**
 * Axios Client Mejorado para Nóminix SaaS.
 * 
 * Características:
 * - Refresh token automático
 * - Retry en fallos de red
 * - Manejo centralizado de errores
 * - Configuración multi-tenancy
 * - Request/Response logging (desarrollo)
 */

// ============ CONFIGURACIÓN ============

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // ms

// ============ INSTANCIA PRINCIPAL ============

const axiosClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    xsrfCookieName: 'csrftoken',
    xsrfHeaderName: 'X-CSRFToken',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    timeout: 30000, // 30 segundos
});

// ============ ESTADO DE REFRESH ============

let isRefreshing = false;
let failedQueue = [];

/**
 * Procesa la cola de requests fallidos después del refresh.
 */
const processQueue = (error, token = null) => {
    failedQueue.forEach(promise => {
        if (error) {
            promise.reject(error);
        } else {
            promise.resolve(token);
        }
    });
    failedQueue = [];
};

// ============ REQUEST INTERCEPTOR ============

axiosClient.interceptors.request.use(
    (config) => {
        // Log en desarrollo
        if (import.meta.env.DEV) {
            console.log(`🌐 [${config.method?.toUpperCase()}] ${config.url}`);
        }

        // Agregar timestamp para evitar cache en GET
        if (config.method === 'get' && config.params) {
            config.params._t = Date.now();
        }

        return config;
    },
    (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
    }
);

// ============ RESPONSE INTERCEPTOR ============

axiosClient.interceptors.response.use(
    (response) => {
        // Log en desarrollo
        if (import.meta.env.DEV) {
            console.log(`✅ [${response.status}] ${response.config.url}`);
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // ======= ERROR 401: SESIÓN EXPIRADA =======
        if (error.response?.status === 401 && !originalRequest._retry) {

            // Si ya estamos refrescando, agregar a la cola
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(() => axiosClient(originalRequest));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Intentar refrescar la sesión (Django session-based)
                await axios.post(`${API_BASE_URL}/auth/refresh/`, {}, {
                    withCredentials: true
                });

                processQueue(null);
                return axiosClient(originalRequest);

            } catch (refreshError) {
                processQueue(refreshError, null);

                // Redirigir a login
                console.warn('🔒 Sesión expirada. Redirigiendo a login...');

                // Limpiar estado de auth y redirigir
                // Nota: En producción, esto debería llamar a logout del AuthContext
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // ======= ERROR 403: SIN PERMISOS =======
        if (error.response?.status === 403) {
            console.error('🚫 Sin permisos para esta acción');
            // Opcional: mostrar toast
        }

        // ======= ERROR 404: NO ENCONTRADO =======
        if (error.response?.status === 404) {
            console.warn('🔍 Recurso no encontrado:', originalRequest.url);
        }

        // ======= ERROR 500: ERROR DE SERVIDOR =======
        if (error.response?.status >= 500) {
            console.error('💥 Error del servidor:', error.response?.data);

            // Retry automático para errores de servidor
            if (!originalRequest._retryCount) {
                originalRequest._retryCount = 0;
            }

            if (originalRequest._retryCount < MAX_RETRIES) {
                originalRequest._retryCount++;
                console.log(`🔄 Reintentando (${originalRequest._retryCount}/${MAX_RETRIES})...`);

                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                return axiosClient(originalRequest);
            }
        }

        // ======= ERROR DE RED =======
        if (!error.response) {
            console.error('🌐 Error de conexión:', error.message);

            // Retry para errores de red
            if (!originalRequest._retryCount) {
                originalRequest._retryCount = 0;
            }

            if (originalRequest._retryCount < MAX_RETRIES) {
                originalRequest._retryCount++;
                console.log(`🔄 Reintentando conexión (${originalRequest._retryCount}/${MAX_RETRIES})...`);

                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * 2));
                return axiosClient(originalRequest);
            }
        }

        // Log del error final
        if (import.meta.env.DEV) {
            console.error('❌ API Error:', {
                url: originalRequest?.url,
                status: error.response?.status,
                data: error.response?.data,
                message: error.message,
            });
        }

        return Promise.reject(error);
    }
);

// ============ HELPERS ============

/**
 * Extrae el mensaje de error de una respuesta del backend.
 * @param {Error} error - Error de Axios
 * @returns {string} Mensaje de error legible
 */
export const getErrorMessage = (error) => {
    if (error.response?.data) {
        const data = error.response.data;

        // Django REST Framework error format
        if (data.detail) return data.detail;
        if (data.message) return data.message;
        if (data.error) return data.error;

        // Validation errors (objeto con campos)
        if (typeof data === 'object') {
            const firstKey = Object.keys(data)[0];
            const firstError = data[firstKey];
            if (Array.isArray(firstError)) {
                return `${firstKey}: ${firstError[0]}`;
            }
            return String(firstError);
        }

        return String(data);
    }

    if (error.message) {
        if (error.message.includes('Network Error')) {
            return 'Error de conexión. Verifique su internet.';
        }
        if (error.message.includes('timeout')) {
            return 'El servidor tardó demasiado en responder.';
        }
        return error.message;
    }

    return 'Error desconocido';
};

/**
 * Verifica si un error es de tipo específico.
 */
export const isNetworkError = (error) => !error.response;
export const isAuthError = (error) => error.response?.status === 401;
export const isForbiddenError = (error) => error.response?.status === 403;
export const isNotFoundError = (error) => error.response?.status === 404;
export const isServerError = (error) => error.response?.status >= 500;
export const isValidationError = (error) => error.response?.status === 400;

export default axiosClient;
