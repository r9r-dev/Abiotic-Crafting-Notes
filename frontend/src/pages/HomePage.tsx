import { useAuth } from "@/contexts/AuthContext";
import { User } from "lucide-react";

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="text-center">
        <h1 className="mb-8 text-4xl font-bold">Abiotic Crafting Notes</h1>

        {user && (
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-center gap-3">
              <User className="h-8 w-8 text-primary" />
              <div className="text-left">
                <p className="text-lg font-medium">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
