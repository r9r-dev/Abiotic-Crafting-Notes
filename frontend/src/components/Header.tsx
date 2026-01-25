import { Link } from "react-router-dom";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <Link to="/" className="flex items-center gap-2">
          <picture>
            <source srcSet="/logo-64.webp" type="image/webp" />
            <img src="/logo-64.png" alt="Abiotic Factor" className="h-8" width="32" height="32" />
          </picture>
          <span className="text-sm text-muted-foreground">
            Database
          </span>
        </Link>
      </div>
    </header>
  );
}
