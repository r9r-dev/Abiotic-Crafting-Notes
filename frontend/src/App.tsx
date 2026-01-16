import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { Header } from "@/components/Header";
import { OrdersPage } from "@/pages/OrdersPage";
import { SearchPage } from "@/pages/SearchPage";
import { KitchenPage } from "@/pages/KitchenPage";
import { WorkshopPage } from "@/pages/WorkshopPage";
import { CartPage } from "@/pages/CartPage";

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
          <Route path="/search" element={<SearchPage />} />
          <Route path="/kitchen" element={<KitchenPage />} />
          <Route path="/workshop" element={<WorkshopPage />} />
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
