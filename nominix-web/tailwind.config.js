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
                    dark: '#1A2B48',
                    electric: '#0052FF',
                    smoke: '#F8F9FA',
                    surface: '#FFFFFF',
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            keyframes: {
                'fade-in-up': {
                    '0%': { opacity: '0', transform: 'translateY(30px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'glow-pulse': {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' },
                    '50%': { boxShadow: '0 0 40px rgba(59, 130, 246, 0.6)' },
                },
                'slide-in-left': {
                    '0%': { opacity: '0', transform: 'translateX(-40px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                'count-up': {
                    '0%': { opacity: '0', transform: 'scale(0.5)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
            },
            animation: {
                'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
                'fade-in-up-delay': 'fade-in-up 0.8s ease-out 0.2s forwards',
                'fade-in-up-delay-2': 'fade-in-up 0.8s ease-out 0.4s forwards',
                'fade-in': 'fade-in 1s ease-out forwards',
                'float': 'float 6s ease-in-out infinite',
                'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
                'slide-in-left': 'slide-in-left 0.6s ease-out forwards',
                'count-up': 'count-up 0.5s ease-out forwards',
            },
        },
    },
    plugins: [],
}
