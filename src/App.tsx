
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/hooks/useAuth";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import "@/index.css";

// Lazy load non-critical pages to improve initial load time
const Profile = lazy(() => import("./pages/Profile"));
const Create = lazy(() => import("./pages/Create"));
const Explore = lazy(() => import("./pages/Explore"));
const Notifications = lazy(() => import("./pages/Notifications"));
const UserProfilePage = lazy(() => import("./pages/UserProfile"));
const FollowPage = lazy(() => import("./pages/Follow"));
const SavedPosts = lazy(() => import("./pages/SavedPosts"));
const Messages = lazy(() => import("./pages/Messages"));

// Configure QueryClient with better defaults for performance and error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000, // 30 seconds (reduced from 60 seconds for more frequent updates)
      gcTime: 5 * 60 * 1000, // 5 minutes (replacing deprecated cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      useErrorBoundary: false, // Don't use error boundary to prevent blank screens
      onError: (error) => {
        console.error('Query error:', error);
        // We'll handle errors in components
      },
    },
  },
});

// Loading fallback for lazy-loaded components
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen p-4 bg-black">
    <div className="flex flex-col items-center">
      <img 
        src="https://i.postimg.cc/8z1WJxkR/High-resolution-stock-photo-A-professional-commercial-image-showcasing-a-grey-letter-O-logo-agains.png" 
        alt="Outliers Logo" 
        className="h-16 w-16 mb-4 animate-pulse"
      />
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/explore" element={
                <Suspense fallback={<PageLoader />}>
                  <Explore />
                </Suspense>
              } />
              <Route path="/create" element={
                <Suspense fallback={<PageLoader />}>
                  <Create />
                </Suspense>
              } />
              <Route path="/notifications" element={
                <Suspense fallback={<PageLoader />}>
                  <Notifications />
                </Suspense>
              } />
              <Route path="/profile" element={
                <Suspense fallback={<PageLoader />}>
                  <Profile />
                </Suspense>
              } />
              <Route path="/profile/:username" element={
                <Suspense fallback={<PageLoader />}>
                  <UserProfilePage />
                </Suspense>
              } />
              <Route path="/follow/:type" element={
                <Suspense fallback={<PageLoader />}>
                  <FollowPage />
                </Suspense>
              } />
              <Route path="/post/:id" element={<Index />} />
              <Route path="/saved" element={
                <Suspense fallback={<PageLoader />}>
                  <SavedPosts />
                </Suspense>
              } />
              <Route path="/messages" element={
                <Suspense fallback={<PageLoader />}>
                  <Messages />
                </Suspense>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AnimatePresence>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
