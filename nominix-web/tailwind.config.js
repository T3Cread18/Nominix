/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                nominix: {
                    dark: '#1A2B48',      // Azul Profundo - Autoridad, Navbars
                    electric: '#0052FF',  // Azul Eléctrico - Botones CTA
                    smoke: '#F8F9FA',     // Blanco Humo - Fondos
                    surface: '#FFFFFF',   // Blanco Puro - Tarjetas
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
