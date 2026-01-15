
import React from 'react';
import { Transaction } from '../types';
import { Download, Upload, Trash2, RefreshCw, Smartphone, ShieldCheck, Database, FileSpreadsheet, ExternalLink } from 'lucide-react';

interface SettingsViewProps {
  transactions: Transaction[];
  setTransactions: (t: Transaction[]) => void;
  onClear: () => void;
  sheetsUrl: string;
  setSheetsUrl: (url: string) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ transactions, setTransactions, onClear, sheetsUrl, setSheetsUrl }) => {
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

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full no-scrollbar pb-24">
      {/* Google Sheets Integration */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FileSpreadsheet size={18} className="text-green-600" />
          Google Sheets
        </h3>
        <p className="text-[11px] text-slate-500 mb-4 leading-tight">
          Pega el link de tu planilla compartida para tenerla siempre a mano.
        </p>
        <div className="space-y-3">
          <input 
            type="url" 
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={sheetsUrl}
            onChange={(e) => setSheetsUrl(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-xs text-slate-600 focus:ring-2 focus:ring-green-500 focus:outline-none transition-all"
          />
          {sheetsUrl && (
            <a 
              href={sheetsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 py-3 rounded-xl font-bold text-xs transition-colors hover:bg-green-100 active:scale-95"
            >
              <ExternalLink size={14} />
              Abrir Planilla
            </a>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Database size={18} className="text-indigo-600" />
          Gestión de Datos
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

      <div className="bg-indigo-50 rounded-3xl p-6 border border-indigo-100">
        <h3 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
          <Smartphone size={18} />
          App Robustness
        </h3>
        <p className="text-[11px] text-indigo-700 mb-4 leading-tight">
          Si hay discrepancias entre dispositivos, asegúrate de que ambos tengan la misma versión y usa "Refrescar".
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all"
        >
          <RefreshCw size={16} />
          Refrescar Aplicación
        </button>
      </div>

      <div className="flex flex-col items-center justify-center py-4 opacity-30">
        <ShieldCheck size={32} className="text-slate-400 mb-1" />
        <p className="text-[9px] font-black uppercase tracking-[0.3em]">Privacy First • Local Data</p>
      </div>
    </div>
  );
};

export default SettingsView;
