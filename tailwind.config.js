import tailwindAnimate from 'tailwindcss-animate';

export default {
    content: [
        './index.html',
        './src/**/*.{ts,tsx}',
    ],
    prefix: '',
    theme: {
        extend: {
            colors: {
                border: 'hsl(var(--border))',
            }
        }
    },
    plugins: [tailwindAnimate]
};
