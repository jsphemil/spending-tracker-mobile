/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  // Dark mode ships in v1 (spec.md §5.12, decided 2026-08-11) — "class" is
  // also the strategy NativeWind v4's colorScheme.set() drives internally
  // on both native and web, not just a web-only workaround.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Solid tokens: CSS var holds an "R G B" triplet so Tailwind's
        // alpha-value modifier (e.g. bg-bg/50) works.
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        "surface-3": "rgb(var(--surface-3) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        "border-strong": "rgb(var(--border-strong) / <alpha-value>)",
        fg: "rgb(var(--fg) / <alpha-value>)",
        "fg-muted": "rgb(var(--fg-muted) / <alpha-value>)",
        "fg-subtle": "rgb(var(--fg-subtle) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-strong": "rgb(var(--accent-strong) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        transfer: "rgb(var(--transfer) / <alpha-value>)",
        // "Soft" tokens already carry their own alpha as rgba() — must NOT
        // go through the <alpha-value> wrapper, that would double-apply it.
        "accent-soft": "var(--accent-soft)",
        "success-soft": "var(--success-soft)",
        "danger-soft": "var(--danger-soft)",
        "transfer-soft": "var(--transfer-soft)",
      },
      fontFamily: {
        // Matches the source app's --font-data stack exactly (system
        // monospace, no custom font package) — see knowledge-transfer.md §4.2
        // and spec.md §5.12.
        data: ["ui-monospace", "SF Mono", "Cascadia Mono", "Roboto Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
