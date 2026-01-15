import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Package, Search, ClipboardList, User } from "lucide-react";

export function Header() {
  const { user } = useAuth();
  const location = useLocation();

  const links = [
    { to: "/", label: "Commandes", icon: ClipboardList },
    { to: "/recipes", label: "Recettes", icon: Search },
    { to: "/calculator", label: "Calculateur", icon: Package },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <div className="mr-4 flex items-center gap-2">
          <span className="text-xl font-bold text-primary glow">ACN</span>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            Abiotic Crafting Notes
          </span>
        </div>

        <nav className="flex flex-1 items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                location.pathname === to
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>

        {user && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{user.name}</span>
          </div>
        )}
      </div>
    </header>
  );
}
