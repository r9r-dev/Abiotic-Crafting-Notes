/**
 * Formulaire de connexion admin.
 * Copie exacte de la page d'accueil avec couleurs rouges.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Lock, Search } from "lucide-react";
import { ElectricStringsBackground } from "@/components/ElectricStringsBackground";

interface AdminLoginProps {
  onLogin: (token: string) => void;
}

export function AdminLogin({ onLogin }: AdminLoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/analytics/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success && data.token) {
        onLogin(data.token);
      } else {
        setError(data.error || "Authentification échouée");
      }
    } catch {
      setError("Erreur de connexion au serveur");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ElectricStringsBackground speed={1} color="red" className="h-screen overflow-hidden">
      <div className="flex flex-col items-center px-4 h-screen">
        {/* Espaceur flexible pour centrer verticalement */}
        <div className="transition-all duration-300 flex-1" />

        {/* Contenu principal */}
        <div className="w-full max-w-xl transition-all duration-300">
          {/* Titre */}
          <h1 className="font-bold text-center transition-all duration-300 mb-8 abiotic-title-red text-5xl">
            ACCESS RESTRICTED
          </h1>

          {/* Champ de mot de passe */}
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-600 z-10" />
              <Input
                type="password"
                placeholder=""
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="pl-10 h-12 text-lg bg-background/90 backdrop-blur-sm border-foreground/20 focus-visible:ring-red-500"
                autoFocus
              />
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="mt-6 text-center text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Indicateur de chargement */}
            {isLoading && (
              <div className="mt-6 text-center text-muted-foreground text-sm">
                Connexion...
              </div>
            )}
          </form>
        </div>

        {/* Espaceur flexible */}
        <div className="flex-1" />

        {/* Footer discret */}
        <div className="pb-4 flex flex-col items-center gap-2">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <Search className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </ElectricStringsBackground>
  );
}

export default AdminLogin;
