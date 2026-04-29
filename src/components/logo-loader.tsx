import logo from "@/assets/logo.png";

interface LogoLoaderProps {
  label?: string;
  fullscreen?: boolean;
}

export function LogoLoader({ label = "Carregando...", fullscreen = true }: LogoLoaderProps) {
  const content = (
    <div className="flex flex-col items-center gap-5">
      <div className="relative h-24 w-24">
        <div
          className="absolute inset-0 rounded-full opacity-60 animate-logo-spin"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0%, var(--primary) 40%, var(--accent) 70%, transparent 100%)",
            mask: "radial-gradient(circle, transparent 55%, black 56%)",
            WebkitMask: "radial-gradient(circle, transparent 55%, black 56%)",
          }}
        />
        <img
          src={logo}
          alt="NutriForm"
          className="absolute inset-2 h-20 w-20 animate-logo-pulse"
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
