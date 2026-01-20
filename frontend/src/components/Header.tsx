import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { User } from "lucide-react";

export function Header() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Abiotic Factor" className="h-8" />
          <span className="text-sm text-muted-foreground">
            Crafting Notes
          </span>
        </Link>

        {user && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{user.name}</span>
          </div>
        )}
      </div>
    </header>
  );
}
