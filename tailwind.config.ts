import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sakinaGreen: "#1B4B43",
        sakinaGreenDeep: "#123330",
        sakinaSand: "#F2EAD8",
        sakinaIvory: "#FBF8F2",
        sakinaGold: "#B98F4E",
        sakinaInk: "#262220",
      },
    },
  },
  plugins: [],
};
export default config;
