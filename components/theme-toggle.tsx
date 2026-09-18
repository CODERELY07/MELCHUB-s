"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getEffectiveTheme, setTheme, type Theme } from "@/lib/theme";

interface ThemeToggleProps {
  className?: string;
  iconOnly?: boolean;
}

export function ThemeToggle({ className, iconOnly = false }: ThemeToggleProps) {
  // Real theme is only known once mounted (see THEME_INIT_SCRIPT in
  // app/layout.tsx) — this default just needs to render something inert
  // for the one server-rendered frame before that effect runs.
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    // Reads the class the beforeInteractive script already applied to
    // <html> — see client/lib/auth-context.tsx for why this rule is
    // disabled for this same "sync external state on mount" shape.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(getEffectiveTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  };

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <Button
      type="button"
      variant="ghost"
      size={iconOnly ? "icon-sm" : "default"}
      className={className ?? (iconOnly ? undefined : "justify-start")}
      onClick={toggle}
      aria-label={label}
      title={iconOnly ? label : undefined}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {!iconOnly && (theme === "dark" ? "Light mode" : "Dark mode")}
    </Button>
  );
}
