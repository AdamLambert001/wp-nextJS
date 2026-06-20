"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  USER_THEME_COOKIE_MAX_AGE,
  USER_THEME_SECONDARY_COOKIE,
  USER_THEME_SECONDARY_STORAGE_KEY,
} from "@/lib/server-settings/constants";
import {
  applyThemeSecondaryToElement,
  clearThemeSecondaryFromElement,
  isValidHexColor,
} from "@/lib/theme-colors";

type ThemeSecondaryContextValue = {
  globalSecondaryHex: string;
  userSecondaryHex: string | null;
  effectiveSecondaryHex: string;
  setUserSecondaryHex: (hex: string) => void;
  clearUserSecondaryHex: () => void;
};

const ThemeSecondaryContext = createContext<ThemeSecondaryContextValue | null>(null);

function readStoredUserHex(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const fromStorage = window.localStorage.getItem(USER_THEME_SECONDARY_STORAGE_KEY)?.trim();
    if (fromStorage && isValidHexColor(fromStorage)) {
      return fromStorage.startsWith("#") ? fromStorage : `#${fromStorage}`;
    }
  } catch {
    // Ignore storage access errors.
  }

  const cookieMatch = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${USER_THEME_SECONDARY_COOKIE}=`));
  const cookieValue = cookieMatch?.split("=")[1]?.trim();
  if (cookieValue && isValidHexColor(cookieValue)) {
    return cookieValue.startsWith("#") ? cookieValue : `#${cookieValue}`;
  }

  return null;
}

function persistUserHex(hex: string) {
  const normalized = hex.startsWith("#") ? hex : `#${hex}`;
  document.cookie = `${USER_THEME_SECONDARY_COOKIE}=${encodeURIComponent(normalized)}; path=/; max-age=${USER_THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
  try {
    window.localStorage.setItem(USER_THEME_SECONDARY_STORAGE_KEY, normalized);
  } catch {
    // Ignore storage access errors.
  }
}

function clearPersistedUserHex() {
  document.cookie = `${USER_THEME_SECONDARY_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  try {
    window.localStorage.removeItem(USER_THEME_SECONDARY_STORAGE_KEY);
  } catch {
    // Ignore storage access errors.
  }
}

type ThemeSecondaryProviderProps = {
  globalSecondaryHex: string;
  children: ReactNode;
};

export function ThemeSecondaryProvider({
  globalSecondaryHex,
  children,
}: ThemeSecondaryProviderProps) {
  const [userSecondaryHex, setUserSecondaryHexState] = useState<string | null>(null);

  useEffect(() => {
    setUserSecondaryHexState(readStoredUserHex());
  }, []);

  const effectiveSecondaryHex = userSecondaryHex ?? globalSecondaryHex;

  const applyEffectiveColor = useCallback(
    (hex: string, hasUserOverride: boolean) => {
      const root = document.documentElement;
      if (hasUserOverride) {
        applyThemeSecondaryToElement(root, hex);
        return;
      }
      clearThemeSecondaryFromElement(root);
    },
    [],
  );

  useEffect(() => {
    applyEffectiveColor(effectiveSecondaryHex, userSecondaryHex !== null);
  }, [applyEffectiveColor, effectiveSecondaryHex, userSecondaryHex]);

  const setUserSecondaryHex = useCallback(
    (hex: string) => {
      if (!isValidHexColor(hex)) {
        return;
      }
      const normalized = hex.startsWith("#") ? hex.toLowerCase() : `#${hex.toLowerCase()}`;
      persistUserHex(normalized);
      setUserSecondaryHexState(normalized);
      applyEffectiveColor(normalized, true);
    },
    [applyEffectiveColor],
  );

  const clearUserSecondaryHex = useCallback(() => {
    clearPersistedUserHex();
    setUserSecondaryHexState(null);
    applyEffectiveColor(globalSecondaryHex, false);
  }, [applyEffectiveColor, globalSecondaryHex]);

  const value = useMemo(
    () => ({
      globalSecondaryHex,
      userSecondaryHex,
      effectiveSecondaryHex,
      setUserSecondaryHex,
      clearUserSecondaryHex,
    }),
    [
      clearUserSecondaryHex,
      effectiveSecondaryHex,
      globalSecondaryHex,
      setUserSecondaryHex,
      userSecondaryHex,
    ],
  );

  return (
    <ThemeSecondaryContext.Provider value={value}>{children}</ThemeSecondaryContext.Provider>
  );
}

export function useThemeSecondary() {
  const context = useContext(ThemeSecondaryContext);
  if (!context) {
    throw new Error("useThemeSecondary must be used within ThemeSecondaryProvider");
  }
  return context;
}
