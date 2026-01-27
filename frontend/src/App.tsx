import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation, useSearchParams, useParams, useNavigate } from "react-router-dom";
import { HelmetProvider } from "@dr.pogodin/react-helmet";
import { Search } from "lucide-react";
import { AuthProvider } from "@/contexts/AuthContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { Header } from "@/components/Header";
import { HomePage } from "@/pages/HomePage";
import { PageTransition } from "@/components/PageTransition";
import { SearchPanel } from "@/components/SearchPanel";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Lazy load pages for code splitting
const ItemPage = lazy(() => import("@/pages/ItemPage").then(m => ({ default: m.ItemPage })));
const NPCPage = lazy(() => import("@/pages/NPCPage").then(m => ({ default: m.NPCPage })));
const CompendiumPage = lazy(() => import("@/pages/CompendiumPage").then(m => ({ default: m.CompendiumPage })));
const DialoguePage = lazy(() => import("@/pages/DialoguePage").then(m => ({ default: m.DialoguePage })));
const AdminPage = lazy(() => import("@/pages/AdminPage").then(m => ({ default: m.AdminPage })));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ItemPageWrapper() {
  const { rowId } = useParams<{ rowId: string }>();
  return (
    <Suspense fallback={<PageLoader />}>
      <ItemPage key={rowId} />
    </Suspense>
  );
}

function NPCPageWrapper() {
  const { rowId } = useParams<{ rowId: string }>();
  return (
    <Suspense fallback={<PageLoader />}>
      <NPCPage key={rowId} />
    </Suspense>
  );
}

function CompendiumPageWrapper() {
  const { rowId } = useParams<{ rowId: string }>();
  return (
    <Suspense fallback={<PageLoader />}>
      <CompendiumPage key={rowId} />
    </Suspense>
  );
}

function DialoguePageWrapper() {
  const { rowId } = useParams<{ rowId: string }>();
  return (
    <Suspense fallback={<PageLoader />}>
      <DialoguePage key={rowId} />
    </Suspense>
  );
}

// Handle SSR redirect: when coming from SSR page, the URL has a hash with the real path
function SSRRedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if we have a hash that looks like a path (from SSR redirect)
    if (location.hash && location.hash.startsWith("#/")) {
      const targetPath = location.hash.slice(1); // Remove the #
      // Navigate to the real path and clear the hash
      navigate(targetPath, { replace: true });
    }
  }, [location.hash, navigate]);

  return null;
}

function AppLayout() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isItemPage = location.pathname.startsWith("/item/");
  const isNPCPage = location.pathname.startsWith("/npc/");
  const isCompendiumPage = location.pathname.startsWith("/compendium/");
  const isDialoguePage = location.pathname.startsWith("/dialogue/");
  const isAdminPage = location.pathname === "/admin";
  const isDetailPage = isItemPage || isNPCPage || isCompendiumPage || isDialoguePage;
  const isHomePage = location.pathname === "/";
  const isGalleryView = searchParams.get("view") === "gallery";
  const query = searchParams.get("q") || "";
  const hasSearchContext = isDetailPage && query.length > 0;

  // Extraire le rowId pour le passer au SearchPanel
  const rowIdMatch = location.pathname.match(/^\/(item|npc|compendium|dialogue)\/(.+)$/);
  const currentItemId = rowIdMatch ? rowIdMatch[2] : undefined;

  const pageType = location.pathname === "/" ? "home" : isAdminPage ? "admin" : isNPCPage ? "npc" : isCompendiumPage ? "compendium" : isDialoguePage ? "dialogue" : "item";

  // Pages plein ecran sans padding : accueil (sans galerie) et admin
  const isFullscreenPage = (isHomePage && !isGalleryView) || isAdminPage;

  // Sans contexte de recherche : layout simple
  if (!hasSearchContext) {
    return (
      <main className={isFullscreenPage ? "" : "container mx-auto px-4 py-6"}>
          <Routes location={location} key={pageType}>
            <Route
              path="/"
              element={<HomePage />}
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
            <Route
              path="/dialogue/:rowId"
              element={
                <PageTransition>
                  <DialoguePageWrapper />
                </PageTransition>
              }
            />
            <Route
              path="/admin"
              element={
                <PageTransition>
                  <Suspense fallback={<PageLoader />}>
                    <AdminPage />
                  </Suspense>
                </PageTransition>
              }
            />
          </Routes>
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
              <Route
                path="/dialogue/:rowId"
                element={
                  <PageTransition>
                    <DialoguePageWrapper />
                  </PageTransition>
                }
              />
            </Routes>
        </div>
      </div>
    </main>
  );
}

function AppContent() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Cacher le header sur la page d'accueil (recherche uniquement, pas galerie) et sur admin
  const isHomePage = location.pathname === "/";
  const isAdminPage = location.pathname === "/admin";
  const isGalleryView = searchParams.get("view") === "gallery";
  const showHeader = (!isHomePage || isGalleryView) && !isAdminPage;

  return (
    <div className="min-h-screen bg-background">
      <SSRRedirectHandler />
      {showHeader && <Header />}
      <AppLayout />
    </div>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <AnalyticsProvider>
            <AppContent />
          </AnalyticsProvider>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}
