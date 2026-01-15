
import React, { useState } from 'react';
import { Transaction } from '../types';
import { Download, Upload, Trash2, RefreshCw, Smartphone, ShieldCheck, Database, FileSpreadsheet, ExternalLink, CloudUpload, Loader2, FileCode, Check } from 'lucide-react';

interface SettingsViewProps {
  transactions: Transaction[];
  setTransactions: (t: Transaction[]) => void;
  onClear: () => void;
  sheetsUrl: string;
  setSheetsUrl: (url: string) => void;
  onSync: () => Promise<void>;
  isSyncing: boolean;
}

const APPS_SCRIPT_CODE = `function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  
  // Limpiar hoja y poner encabezados si está vacía
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["ID", "Fecha", "Naturaleza", "Concepto", "Monto", "Moneda", "Persona", "Tipo", "Medio", "Cuotas"]);
  } else {
    sheet.clearContents();
    sheet.appendRow(["ID", "Fecha", "Naturaleza", "Concepto", "Monto", "Moneda", "Persona", "Tipo", "Medio", "Cuotas"]);
  }

  // Insertar todas las transacciones
  data.forEach(t => {
    sheet.appendRow([
      t.id,
      t.date,
      t.nature,
      t.description,
      t.amount,
      t.currency,
      t.payer,
      t.type,
      t.paymentMethodId,
      t.installments || 1
    ]);
  });

  return ContentService.createTextOutput(JSON.stringify({ status: "success", received: data.length }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

const SettingsView: React.FC<SettingsViewProps> = ({ 
  transactions, 
  setTransactions, 
  onClear, 
  sheetsUrl, 
  setSheetsUrl, 
  onSync,
  isSyncing
}) => {
  const [copied, setCopied] = useState(false);

  const exportData = () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `brunance_backup_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (Array.isArray(json)) {
          if (window.confirm(`¿Importar ${json.length} transacciones? Esto reemplazará los datos actuales.`)) {
            setTransactions(json);
            alert('Datos importados correctamente.');
          }
        }
      } catch (err) {
        alert('Error al leer el archivo. Formato inválido.');
      }
    };
    reader.readAsText(file);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full no-scrollbar pb-24">
      {/* Sincronización Cloud Principal */}
      <div className="bg-slate-900 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <CloudUpload size={18} className="text-indigo-400" />
          Sincronización Cloud
        </h3>
        <p className="text-[11px] opacity-60 mb-5 leading-relaxed">
          Sincroniza todos tus registros locales con la planilla de Google Sheets configurada abajo.
        </p>
        <button 
          onClick={onSync}
          disabled={isSyncing}
          className={`w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3 shadow-lg ${
            isSyncing 
              ? 'bg-slate-800 text-slate-500' 
              : 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 shadow-indigo-500/20'
          }`}
        >
          {isSyncing ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <CloudUpload size={20} />
              Sincronizar ahora
            </>
          )}
        </button>
      </div>

      {/* Google Sheets Config */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FileSpreadsheet size={18} className="text-green-600" />
          Configuración Planilla
        </h3>
        <p className="text-[11px] text-slate-500 mb-4 leading-tight">
          Pega el link de tu planilla compartida (Web App URL).
        </p>
        <div className="space-y-3">
          <input 
            type="url" 
            placeholder="https://script.google.com/macros/s/..."
            value={sheetsUrl}
            onChange={(e) => setSheetsUrl(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-xs text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
          />
          {sheetsUrl && (
            <a 
              href={sheetsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 py-3 rounded-xl font-bold text-xs transition-colors hover:bg-green-100 active:scale-95"
            >
              <ExternalLink size={14} />
              Probar URL en Navegador
            </a>
          )}
        </div>
      </div>

      {/* Botón de Copiar Script */}
      <div className="bg-indigo-50 rounded-3xl p-6 border border-indigo-100">
        <h3 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
          <FileCode size={18} />
          Script de Integración
        </h3>
        <p className="text-[11px] text-indigo-700 mb-4 leading-tight">
          Copia este código en <b>Extensiones > Apps Script</b> dentro de tu Google Sheet y publícalo como "Web App".
        </p>
        <button 
          onClick={handleCopyScript}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 ${
            copied ? 'bg-green-600 text-white' : 'bg-white text-indigo-600 border border-indigo-200'
          }`}
        >
          {copied ? <Check size={16} /> : <FileCode size={16} />}
          {copied ? '¡Copiado!' : 'Copiar Código Apps Script'}
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Database size={18} className="text-indigo-600" />
          Copia de Seguridad
        </h3>
        
        <div className="space-y-3">
          <button 
            onClick={exportData}
            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Download size={20} className="text-slate-400 group-hover:text-indigo-600" />
              <div className="text-left">
                <p className="text-xs font-bold text-slate-700">Exportar Backup</p>
                <p className="text-[9px] text-slate-400">Descarga un archivo JSON</p>
              </div>
            </div>
          </button>

          <label className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors group cursor-pointer">
            <div className="flex items-center gap-3">
              <Upload size={20} className="text-slate-400 group-hover:text-indigo-600" />
              <div className="text-left">
                <p className="text-xs font-bold text-slate-700">Importar Backup</p>
                <p className="text-[9px] text-slate-400">Restaura desde archivo JSON</p>
              </div>
            </div>
            <input type="file" accept=".json" onChange={importData} className="hidden" />
          </label>

          <button 
            onClick={onClear}
            className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 rounded-2xl transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Trash2 size={20} className="text-red-400 group-hover:text-red-600" />
              <div className="text-left">
                <p className="text-xs font-bold text-red-700">Borrar Todo</p>
                <p className="text-[9px] text-red-400">Elimina base de datos local</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-4 opacity-30">
        <ShieldCheck size={32} className="text-slate-400 mb-1" />
        <p className="text-[9px] font-black uppercase tracking-[0.3em]">Privacy First • Local Data</p>
      </div>
    </div>
  );
};

export default SettingsView;
