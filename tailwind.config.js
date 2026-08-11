/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  // Dark mode is out of scope for v1 (spec.md §6) — pin to "class" so
  // react-native-css-interop doesn't try to sync OS-level color scheme on web,
  // which throws under the default "media" strategy.
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [],
};
