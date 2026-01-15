
import React, { useState } from 'react';
import { Transaction } from '../types';
import { Download, Upload, Trash2, ShieldCheck, Database, FileSpreadsheet, ExternalLink, CloudUpload, Loader2, FileCode, Check, RefreshCcw } from 'lucide-react';

interface SettingsViewProps {
  transactions: Transaction[];
  setTransactions: (t: Transaction[]) => void;
  onClear: () => void;
  sheetsUrl: string;
  setSheetsUrl: (url: string) => void;
  onSync: () => Promise<void>;
  onPull: () => Promise<void>;
  isSyncing: boolean;
}

const APPS_SCRIPT_CODE = `function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);

  const headers = rows[0];
  const data = rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      const keyMap = {
        "ID": "id", "Fecha": "date", "Naturaleza": "nature", "Concepto": "description",
        "Monto": "amount", "Moneda": "currency", "Persona": "payer", "Tipo": "type",
        "Medio": "paymentMethodId", "Cuotas": "installments"
      };
      obj[keyMap[header] || header] = row[i];
    });
    return obj;
  });
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  
  sheet.clearContents();
  sheet.appendRow(["ID", "Fecha", "Naturaleza", "Concepto", "Monto", "Moneda", "Persona", "Tipo", "Medio", "Cuotas"]);

  data.forEach(t => {
    sheet.appendRow([
      t.id, t.date, t.nature, t.description, t.amount, t.currency, t.payer, t.type, t.paymentMethodId, t.installments || 1
    ]);
  });

  return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
}`;

const SettingsView: React.FC<SettingsViewProps> = ({ 
  transactions, 
  setTransactions, 
  onClear, 
  sheetsUrl, 
  setSheetsUrl, 
  onSync,
  onPull,
  isSyncing
}) => {
  const [copied, setCopied] = useState(false);

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
        
        <div className="grid grid-cols-2 gap-3 mb-4">
           <button 
            onClick={onPull}
            disabled={isSyncing}
            className="flex flex-col items-center justify-center p-4 bg-slate-800 rounded-2xl border border-slate-700 hover:bg-slate-700 transition-all active:scale-95"
          >
            <Download size={20} className="text-indigo-400 mb-1" />
            <span className="text-[9px] font-black uppercase">Descargar de Nube</span>
          </button>
          
          <button 
            onClick={onSync}
            disabled={isSyncing}
            className="flex flex-col items-center justify-center p-4 bg-indigo-600 rounded-2xl border border-indigo-500 hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
          >
            <Upload size={20} className="text-white mb-1" />
            <span className="text-[9px] font-black uppercase text-white">Subir a Nube</span>
          </button>
        </div>

        {isSyncing && (
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-indigo-300 animate-pulse">
            <RefreshCcw size={12} className="animate-spin" />
            Sincronizando con Google...
          </div>
        )}
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
          Nuevo Script de Integración
        </h3>
        <p className="text-[11px] text-indigo-700 mb-4 leading-tight">
          ⚠️ <b>Actualización necesaria:</b> Copia este nuevo código en <b>Extensiones &gt; Apps Script</b> para habilitar la descarga de datos.
        </p>
        <button 
          onClick={handleCopyScript}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 ${
            copied ? 'bg-green-600 text-white' : 'bg-white text-indigo-600 border border-indigo-200'
          }`}
        >
          {copied ? <Check size={16} /> : <FileCode size={16} />}
          {copied ? '¡Copiado!' : 'Copiar Nuevo Código'}
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Database size={18} className="text-indigo-600" />
          Base de Datos Local
        </h3>
        
        <div className="space-y-3">
          <button 
            onClick={onClear}
            className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 rounded-2xl transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Trash2 size={20} className="text-red-400 group-hover:text-red-600" />
              <div className="text-left">
                <p className="text-xs font-bold text-red-700">Borrar Local</p>
                <p className="text-[9px] text-red-400">Elimina solo datos del móvil</p>
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
