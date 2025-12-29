import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Theme {
  name: string;
  label: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
}

export const themes: Theme[] = [
  {
    name: "default",
    label: "Navy & Gold",
    primary: "45 100% 50%",
    secondary: "220 15% 20%",
    accent: "45 100% 50%",
    background: "220 25% 10%",
    foreground: "45 100% 96%"
  },
  {
    name: "ocean",
    label: "Ocean Blue",
    primary: "199 89% 48%",
    secondary: "200 50% 20%",
    accent: "199 89% 48%",
    background: "200 50% 8%",
    foreground: "200 20% 95%"
  },
  {
    name: "forest",
    label: "Forest Green",
    primary: "142 76% 36%",
    secondary: "140 30% 20%",
    accent: "142 76% 36%",
    background: "140 30% 8%",
    foreground: "140 20% 95%"
  },
  {
    name: "sunset",
    label: "Sunset Orange",
    primary: "25 95% 53%",
    secondary: "25 30% 20%",
    accent: "25 95% 53%",
    background: "25 30% 8%",
    foreground: "30 20% 95%"
  },
  {
    name: "royal",
    label: "Royal Purple",
    primary: "271 81% 56%",
    secondary: "270 30% 20%",
    accent: "271 81% 56%",
    background: "270 30% 8%",
    foreground: "270 20% 95%"
  },
  {
    name: "rose",
    label: "Rose Pink",
    primary: "346 77% 50%",
    secondary: "345 30% 20%",
    accent: "346 77% 50%",
    background: "345 30% 8%",
    foreground: "345 20% 95%"
  },
  {
    name: "light",
    label: "Light Mode",
    primary: "217 91% 60%",
    secondary: "217 20% 90%",
    accent: "217 91% 60%",
    background: "0 0% 100%",
    foreground: "217 33% 17%"
  }
];

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'theme')
          .maybeSingle();

        if (error) {
          console.error('Error fetching theme:', error);
        } else if (data?.value) {
          const themeName = (data.value as { name: string }).name;
          const foundTheme = themes.find(t => t.name === themeName);
          if (foundTheme) {
            setCurrentTheme(foundTheme);
            applyTheme(foundTheme);
          }
        }
      } catch (err) {
        console.error('Error in theme fetch:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Check local storage first for faster initial load
    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme) {
      const parsed = JSON.parse(savedTheme);
      const foundTheme = themes.find(t => t.name === parsed.name);
      if (foundTheme) {
        setCurrentTheme(foundTheme);
        applyTheme(foundTheme);
      }
    }

    fetchTheme();

    // Listen for real-time theme changes
    const channel = supabase
      .channel('theme-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_settings',
          filter: 'key=eq.theme'
        },
        (payload) => {
          const themeName = (payload.new.value as { name: string }).name;
          const foundTheme = themes.find(t => t.name === themeName);
          if (foundTheme) {
            setCurrentTheme(foundTheme);
            applyTheme(foundTheme);
            localStorage.setItem('app-theme', JSON.stringify(foundTheme));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--secondary', theme.secondary);
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--background', theme.background);
    root.style.setProperty('--foreground', theme.foreground);
    root.style.setProperty('--ring', theme.primary);
    
    // Update card colors based on theme
    if (theme.name === 'light') {
      root.style.setProperty('--card', '0 0% 98%');
      root.style.setProperty('--card-foreground', '217 33% 17%');
      root.style.setProperty('--popover', '0 0% 98%');
      root.style.setProperty('--popover-foreground', '217 33% 17%');
      root.style.setProperty('--muted', '217 20% 92%');
      root.style.setProperty('--muted-foreground', '217 20% 40%');
      root.style.setProperty('--border', '217 20% 85%');
      root.style.setProperty('--input', '217 20% 85%');
    } else {
      root.style.setProperty('--card', theme.secondary);
      root.style.setProperty('--card-foreground', theme.foreground);
      root.style.setProperty('--popover', theme.secondary);
      root.style.setProperty('--popover-foreground', theme.foreground);
      root.style.setProperty('--muted', theme.secondary);
      root.style.setProperty('--muted-foreground', `${theme.foreground.split(' ')[0]} 20% 60%`);
      root.style.setProperty('--border', `${theme.background.split(' ')[0]} 15% 22%`);
      root.style.setProperty('--input', `${theme.background.split(' ')[0]} 15% 22%`);
    }
  };

  const setTheme = async (theme: Theme) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    localStorage.setItem('app-theme', JSON.stringify(theme));
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
