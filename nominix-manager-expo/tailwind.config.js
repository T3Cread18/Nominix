/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                nominix: {
                    electric: "#0066FF",
                    dark: "#0F172A",
                    soft: "#F8FAFC",
                },
            },
        },
    },
    plugins: [],
};
