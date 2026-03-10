/**
 * CONFIGURACIÓN DE LA API — Detección Automática de Entorno
 *
 * - Producción (web):  detecta dominio nominix.net → HTTPS API
 * - Desarrollo (web):  usa DEV_API_HOST (tu IP local) + :8000
 * - Móvil nativo:      usa DEV_API_HOST + :8000
 *
 * NOTA: En desarrollo multi-tenant, el backend necesita recibir
 * peticiones con el hostname del tenant, no 'localhost'.
 * Por eso siempre usamos la IP de red local.
 */
import { Platform } from 'react-native';

// ⚡ Cambia esto si tu IP de red local cambia
const DEV_API_HOST = '192.168.10.140';

function resolveApiUrl(): string {
    // --- Producción (solo web) ---
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const hostname = window.location.hostname;

        if (hostname.includes('nominix.net')) {
            return 'https://api.nominix.net';
        }
    }

    // --- Desarrollo (web + móvil) ---
    // Siempre usa la IP de red para que django-tenants resuelva el tenant correcto
    return `http://${DEV_API_HOST}:8000`;
}

export const API_URL = resolveApiUrl();
