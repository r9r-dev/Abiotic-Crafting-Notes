import { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, useSearchParams, useParams } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { Search } from "lucide-react";
import { AuthProvider } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { HomePage } from "@/pages/HomePage";
import { ItemPage } from "@/pages/ItemPage";
import { NPCPage } from "@/pages/NPCPage";
import { CompendiumPage } from "@/pages/CompendiumPage";
import { PageTransition } from "@/components/PageTransition";
import { SearchPanel } from "@/components/SearchPanel";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

function ItemPageWrapper() {
  const { rowId } = useParams<{ rowId: string }>();
  return <ItemPage key={rowId} />;
}

function NPCPageWrapper() {
  const { rowId } = useParams<{ rowId: string }>();
  return <NPCPage key={rowId} />;
}

function CompendiumPageWrapper() {
  const { rowId } = useParams<{ rowId: string }>();
  return <CompendiumPage key={rowId} />;
}

function AppLayout() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isItemPage = location.pathname.startsWith("/item/");
  const isNPCPage = location.pathname.startsWith("/npc/");
  const isCompendiumPage = location.pathname.startsWith("/compendium/");
  const isDetailPage = isItemPage || isNPCPage || isCompendiumPage;
  const isHomePage = location.pathname === "/";
  const isGalleryView = searchParams.get("view") === "gallery";
  const query = searchParams.get("q") || "";
  const hasSearchContext = isDetailPage && query.length > 0;

  // Extraire le rowId pour le passer au SearchPanel
  const rowIdMatch = location.pathname.match(/^\/(item|npc|compendium)\/(.+)$/);
  const currentItemId = rowIdMatch ? rowIdMatch[2] : undefined;

  const pageType = location.pathname === "/" ? "home" : isNPCPage ? "npc" : isCompendiumPage ? "compendium" : "item";

  // Page d'accueil minimaliste (sans galerie) : pas de padding
  const isMinimalHome = isHomePage && !isGalleryView;

  // Sans contexte de recherche : layout simple
  if (!hasSearchContext) {
    return (
      <main className={isMinimalHome ? "" : "container mx-auto px-4 py-6"}>
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
            <Route
              path="/npc/:rowId"
              element={
                <PageTransition>
                  <NPCPageWrapper />
                </PageTransition>
              }
            />
            <Route
              path="/compendium/:rowId"
              element={
                <PageTransition>
                  <CompendiumPageWrapper />
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
              <Route
                path="/npc/:rowId"
                element={
                  <PageTransition>
                    <NPCPageWrapper />
                  </PageTransition>
                }
              />
              <Route
                path="/compendium/:rowId"
                element={
                  <PageTransition>
                    <CompendiumPageWrapper />
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
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Cacher le header sur la page d'accueil (recherche uniquement, pas galerie)
  const isHomePage = location.pathname === "/";
  const isGalleryView = searchParams.get("view") === "gallery";
  const showHeader = !isHomePage || isGalleryView;

  return (
    <div className="min-h-screen bg-background">
      {showHeader && <Header />}
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
