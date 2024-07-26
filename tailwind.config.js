module.exports = {
  content: ['./views/**/*.ejs', './assets/js/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
      },
      backgroundImage: {
        space: "url('/assets/images/bg/bg_space.webp')",
        splash: "url('/assets/images/splash/odystorm.webp')"
      },
    },
  },
  plugins: [],
}
