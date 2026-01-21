import { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, useSearchParams, useParams } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { Search } from "lucide-react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { HomePage } from "@/pages/HomePage";
import { ItemPage } from "@/pages/ItemPage";
import { PageTransition } from "@/components/PageTransition";
import { SearchPanel } from "@/components/SearchPanel";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

function ItemPageWrapper() {
  const { rowId } = useParams<{ rowId: string }>();
  return <ItemPage key={rowId} />;
}

function AppLayout() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isItemPage = location.pathname.startsWith("/item/");
  const query = searchParams.get("q") || "";
  const hasSearchContext = isItemPage && query.length > 0;

  // Extraire le rowId pour le passer au SearchPanel
  const rowIdMatch = location.pathname.match(/^\/item\/(.+)$/);
  const currentItemId = rowIdMatch ? rowIdMatch[1] : undefined;

  const pageType = location.pathname === "/" ? "home" : "item";

  // Sans contexte de recherche : layout simple
  if (!hasSearchContext) {
    return (
      <main className="container mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <Routes location={location} key={pageType}>
            <Route
              path="/"
              element={
                <PageTransition>
                  <HomePage />
                </PageTransition>
              }
            />
            <Route
              path="/item/:rowId"
              element={
                <PageTransition>
                  <ItemPageWrapper />
                </PageTransition>
              }
            />
          </Routes>
        </AnimatePresence>
      </main>
    );
  }

  // Avec contexte de recherche : layout avec panneau latéral persistant
  return (
    <main className="container mx-auto px-4 py-6">
      <div className="flex gap-6">
        {/* Panneau latéral - Desktop (persistant) */}
        <aside className="hidden md:block w-72 flex-shrink-0 border-r h-[calc(100vh-theme(spacing.20))] sticky top-20">
          <SearchPanel initialQuery={query} currentItemId={currentItemId} />
        </aside>

        {/* Contenu principal */}
        <div className="flex-1 min-w-0">
          {/* Header mobile avec bouton recherche */}
          <div className="md:hidden flex items-center gap-2 mb-4">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Search className="h-4 w-4" />
                  Recherche
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SearchPanel
                  initialQuery={query}
                  currentItemId={currentItemId}
                  onResultClick={() => setSheetOpen(false)}
                />
              </SheetContent>
            </Sheet>
          </div>

          <AnimatePresence mode="wait">
            <Routes location={location} key={pageType}>
              <Route
                path="/item/:rowId"
                element={
                  <PageTransition>
                    <ItemPageWrapper />
                  </PageTransition>
                }
              />
            </Routes>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

function AppContent() {
  const { loading, error } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl font-bold text-primary">ACN</div>
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
      <AppLayout />
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
