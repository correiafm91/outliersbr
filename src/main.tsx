
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import App from './App.tsx'
import './index.css'

// Custom fallback component to show when there's an error
const ErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-black text-white">
      <h2 className="text-xl font-bold mb-4">Algo deu errado</h2>
      <p className="text-red-400 mb-4">
        {error.message || "Ocorreu um erro inesperado."}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80 transition-colors"
      >
        Tentar Novamente
      </button>
    </div>
  );
};

// Add global error logging
const logError = (error, info) => {
  console.error('Uncaught error:', error, info);
};

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback} onError={logError}>
    <App />
  </ErrorBoundary>
);
