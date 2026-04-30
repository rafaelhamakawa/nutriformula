interface PageHeaderProps {
  icon: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
}

/**
 * Cabeçalho de página padronizado com o ícone 3D do dashboard.
 * Usar abaixo do <AppHeader /> em todas as páginas internas.
 */
export function PageHeader({ icon, title, description, right }: PageHeaderProps) {
  return (
    <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap mb-6">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl overflow-hidden flex items-center justify-center shrink-0">
          <img src={icon} alt={title} className="h-full w-full object-contain" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold leading-tight">{title}</h1>
          {description && (
            <p className="text-sm md:text-base text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
      {right}
    </div>
  );
}
