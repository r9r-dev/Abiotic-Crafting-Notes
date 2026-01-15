import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { OrdersPage } from "@/pages/OrdersPage";
import { RecipesPage } from "@/pages/RecipesPage";
import { CalculatorPage } from "@/pages/CalculatorPage";

function AppContent() {
  const { loading, error } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl font-bold text-primary glow">ACN</div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl font-bold text-destructive">Erreur</div>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<OrdersPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
