// Tailwind v4 via PostCSS. Astro picks this up automatically for all CSS.
// Used instead of @tailwindcss/vite because that plugin is incompatible with the
// rolldown-based Vite bundled by Astro 6.
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
