interface LogoLoaderProps {
  label?: string;
  fullscreen?: boolean;
}

export function LogoLoader({ label = "Carregando...", fullscreen = true }: LogoLoaderProps) {
  const content = (
    <div className="flex flex-col items-center gap-5">
      <div className="relative h-16 w-16">
        <div
          className="absolute inset-0 rounded-full border-4 border-border/40"
        />
        <div
          className="absolute inset-0 rounded-full border-4 border-transparent animate-logo-spin"
          style={{
            borderTopColor: "var(--primary)",
            borderRightColor: "var(--accent)",
          }}
        />
      </div>
      <p className="text-sm text-muted-foreground tracking-wide">{label}</p>
    </div>
  );

  if (!fullscreen) return content;

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--gradient-hero)" }}
    >
      {content}
    </div>
  );
}
