export function HeroOrb({
  className,
  color,
}: {
  className: string;
  color: "cyan" | "pink" | "violet";
}) {
  const colors = {
    cyan: "bg-primary/20",
    pink: "bg-secondary/20",
    violet: "bg-tertiary/20",
  };

  return <div className={`${className} absolute rounded-full blur-3xl ${colors[color]}`} />;
}
