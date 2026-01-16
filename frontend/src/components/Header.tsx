import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ClipboardList, Search, ChefHat, Hammer, User, ShoppingCart } from "lucide-react";

export function Header() {
  const { user } = useAuth();
  const { totalCount } = useCart();
  const location = useLocation();

  const links = [
    { to: "/", label: "Commandes", icon: ClipboardList },
    { to: "/search", label: "Recherche", icon: Search },
    { to: "/kitchen", label: "Cuisine", icon: ChefHat },
    { to: "/workshop", label: "Assemblage", icon: Hammer },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <Link to="/" className="mr-4 flex items-center gap-2">
          <img src="/logo.png" alt="Abiotic Factor" className="h-8" />
          <span className="hidden text-sm text-muted-foreground sm:inline">
            Crafting Notes
          </span>
        </Link>

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

        <div className="flex items-center gap-4">
          <Link
            to="/cart"
            className={cn(
              "relative flex items-center rounded-md p-2 transition-colors",
              location.pathname === "/cart"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <ShoppingCart className="h-5 w-5" />
            {totalCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {totalCount > 99 ? "99+" : totalCount}
              </span>
            )}
          </Link>

          {user && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user.name}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
