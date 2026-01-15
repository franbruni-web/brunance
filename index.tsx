
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log("🚀 Brunance: Iniciando proceso de montaje...");

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("✅ Brunance: Aplicación montada.");
  } catch (error: any) {
    console.error("❌ Brunance: Error en el renderizado:", error);
    const errorDiv = document.getElementById('error-logger');
    if (errorDiv) {
      errorDiv.style.display = 'block';
      errorDiv.innerHTML = `<b>Error fatal al cargar la app:</b> ${error.message || error}`;
    }
  }
}
