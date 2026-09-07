import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("bharat_api_theme") as "dark" | "light" | null;
    if (stored === "light") {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    } else {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("bharat_api_theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    window.dispatchEvent(new Event("themechange"));
  };

  useEffect(() => {
    const handleThemeChange = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    };
    window.addEventListener("themechange", handleThemeChange);
    return () => window.removeEventListener("themechange", handleThemeChange);
  }, []);

  if (!mounted) {
    return (
      <div className={`h-8 w-8 rounded-lg border border-border bg-secondary/50 ${className}`} />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to Soft Light Theme" : "Switch to Dark Theme"}
      aria-label={isDark ? "Switch to Soft Light Theme" : "Switch to Dark Theme"}
      className={`relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary/60 text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground hover:border-border/80 active:scale-95 ${className}`}
    >
      <Sun
        className={`h-4 w-4 transition-all duration-300 absolute ${
          isDark
            ? "rotate-90 scale-0 opacity-0 text-amber-400"
            : "rotate-0 scale-100 opacity-100 text-amber-500"
        }`}
      />
      <Moon
        className={`h-4 w-4 transition-all duration-300 absolute ${
          isDark
            ? "rotate-0 scale-100 opacity-100 text-sky-400"
            : "-rotate-90 scale-0 opacity-0 text-sky-300"
        }`}
      />
    </button>
  );
}
