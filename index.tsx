import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log("🚀 Brunance: Iniciando montaje...");

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = createRoot(rootElement);
  
  const renderApp = () => {
    try {
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
      console.log("✅ Brunance: Renderizado completado.");
    } catch (error: any) {
      console.error("❌ Brunance: Error crítico:", error);
      const logger = document.getElementById('error-logger');
      if (logger) {
        logger.style.display = 'block';
        logger.innerHTML = `<b>Error al iniciar Brunance:</b> ${error.message}`;
      }
    }
  };

  // Pequeño delay para estabilidad en PWA
  setTimeout(renderApp, 0);
}
