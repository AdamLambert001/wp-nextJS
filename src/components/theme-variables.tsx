import {
  getThemeSecondaryColor,
  getThemeSecondaryForeground,
} from "@/lib/theme-colors";

type ThemeVariablesProps = {
  secondaryHex: string;
};

export function ThemeVariables({ secondaryHex }: ThemeVariablesProps) {
  const secondary = getThemeSecondaryColor(secondaryHex);
  const secondaryForeground = getThemeSecondaryForeground(secondary);

  const css = `
    :root,
    .dark {
      --theme-secondary: ${secondary};
      --theme-secondary-foreground: ${secondaryForeground};
      --secondary: var(--theme-secondary);
      --secondary-foreground: var(--theme-secondary-foreground);
      --accent: color-mix(in oklch, var(--theme-secondary) 18%, transparent);
      --accent-foreground: var(--theme-secondary-foreground);
      --sidebar-primary: var(--theme-secondary);
      --sidebar-primary-foreground: var(--theme-secondary-foreground);
      --ring: color-mix(in oklch, var(--theme-secondary) 45%, var(--foreground));
    }
  `;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
