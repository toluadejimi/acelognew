import { useTheme } from "@/contexts/ThemeContext";

type ThemeToggleProps = {
  className?: string;
  size?: "sm" | "md";
};

export function ThemeToggle({ className = "", size = "md" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const px = size === "sm" ? 8 : 10;
  const iconSize = size === "sm" ? 14 : 18;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={className}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size === "sm" ? 32 : 40,
        height: size === "sm" ? 32 : 40,
        padding: 0,
        border: "1px solid hsl(var(--theme-border, 220 15% 88%))",
        borderRadius: 10,
        background: "hsl(var(--theme-toggle-bg, 220 20% 94%))",
        color: "hsl(var(--theme-toggle-fg, 220 25% 12%))",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {isDark ? (
        <i className="fa-solid fa-sun" style={{ fontSize: iconSize }} />
      ) : (
        <i className="fa-solid fa-moon" style={{ fontSize: iconSize }} />
      )}
    </button>
  );
}
