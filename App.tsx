
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PlusCircle, List, PieChart as ChartIcon, Settings, RefreshCw, ChevronLeft, ChevronRight, Table, Copy, Smartphone, Apple, ShieldCheck, CloudDownload, Zap } from 'lucide-react';
import TransactionForm from './components/ExpenseForm';
import HistoryList from './components/HistoryList';
import Dashboard from './components/Dashboard';
import { Transaction } from './types';
import { format, addMonths, subMonths, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

const APP_VERSION = "4.4.0 RealTime-Sync";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'add' | 'list' | 'stats' | 'settings'>('add');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState<string>(localStorage.getItem('brunance_sheets_url') || '');
  
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [prefillTransaction, setPrefillTransaction] = useState<Partial<Transaction> | undefined>(undefined);
  
  const hasAutoSynced = useRef(false);

  // Carga inicial
  useEffect(() => {
    const saved = localStorage.getItem('brunance_transactions_v3');
    const savedDeleted = localStorage.getItem('brunance_deleted_ids');
    
    if (saved) {
      try {
        setTransactions(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load transactions", e);
      }
    }
    if (savedDeleted) {
      try {
        setDeletedIds(JSON.parse(savedDeleted));
      } catch (e) {
        console.error("Failed to load deleted ids", e);
      }
    }
  }, []);

  // Persistencia local
  useEffect(() => {
    localStorage.setItem('brunance_transactions_v3', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('brunance_deleted_ids', JSON.stringify(deletedIds));
  }, [deletedIds]);

  useEffect(() => {
    localStorage.setItem('brunance_sheets_url', sheetsUrl);
  }, [sheetsUrl]);

  // Lógica de Sincronización Refactorizada para soportar updates en tiempo real
  const handleSync = async (isAuto = false, overrideTransactions?: Transaction[], overrideDeletedIds?: string[]) => {
    if (!sheetsUrl) {
      if (!isAuto) {
        alert("Configura la URL de Brunance Sheets en Ajustes.");
        setActiveTab('settings');
      }
      return;
    }

    // Usamos los datos pasados por parámetro o los del estado actual
    const currentTxs = overrideTransactions || transactions;
    const currentDeleted = overrideDeletedIds || deletedIds;

    setIsSyncing(true);
    try {
      const response = await fetch(sheetsUrl);
      let remoteData: Transaction[] = [];
      
      if (response.ok) {
        const text = await response.text();
        try {
          remoteData = JSON.parse(text);
        } catch (e) {
          console.log("Nube vacía o formato inválido.");
        }
      }

      // Filtrar lo que viene de la nube con los IDs borrados (locales y remotos)
      const filteredRemote = remoteData.filter(rt => !currentDeleted.includes(rt.id));
      
      // Combinar con los locales actuales
      const localMap = new Map(currentTxs.map(t => [t.id, t]));
      filteredRemote.forEach(rt => {
        if (!localMap.has(rt.id)) {
          localMap.set(rt.id, rt);
        }
      });
      
      const mergedData = Array.from(localMap.values()).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Subir a la nube
      await fetch(sheetsUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mergedData),
      });
      
      // Actualizar estados finales
      setTransactions(mergedData.map(t => ({ ...t, synced: true })));
      setDeletedIds([]);
      localStorage.removeItem('brunance_deleted_ids');
      
      if (!isAuto) console.log("Brunance: Sincronización exitosa.");
    } catch (error) {
      console.error("Sync error:", error);
      if (!isAuto) alert("Error en la sincronización. Verifica la URL.");
    } finally {
      setIsSyncing(false);
    }
  };

  const addTransaction = (newTransaction: Transaction) => {
    const nextTransactions = [newTransaction, ...transactions];
    setTransactions(nextTransactions);
    setPrefillTransaction(undefined);
    setActiveTab('list');
    
    // Disparar sincronización inmediata
    handleSync(true, nextTransactions);
  };

  const deleteTransaction = (id: string) => {
    const nextTransactions = transactions.filter(t => t.id !== id);
    const nextDeletedIds = [...deletedIds, id];
    
    setTransactions(nextTransactions);
    setDeletedIds(nextDeletedIds);

    // Disparar sincronización inmediata
    handleSync(true, nextTransactions, nextDeletedIds);
  };

  const forceAppUpdate = () => {
    if (confirm('Esto refrescará Brunance para buscar actualizaciones. ¿Continuar?')) {
        window.location.replace(window.location.href);
        setTimeout(() => {
            window.location.reload();
        }, 100);
    }
  };

  // Auto-Sync al abrir la app
  useEffect(() => {
    if (sheetsUrl && !hasAutoSynced.current) {
        const timer = setTimeout(() => {
            handleSync(true);
            hasAutoSynced.current = true;
        }, 1500);
        return () => clearTimeout(timer);
    }
  }, [sheetsUrl]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
        const date = new Date(t.date);
        const start = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
        return isWithinInterval(date, { 
            start: start, 
            end: endOfMonth(selectedMonth) 
        });
    });
  }, [transactions, selectedMonth]);

  const handleSettle = (prefill: any) => {
    setPrefillTransaction(prefill);
    setActiveTab('add');
  };

  const changeMonth = (delta: number) => {
    setSelectedMonth(prev => delta > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const copyScriptCode = () => {
    const code = `function doGet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return ContentService.createTextOutput("[]").setMimeType(ContentService.MimeType.JSON);
  
  var headers = data[0];
  var json = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var headerName = headers[j].toLowerCase();
      if (headerName === 'identificador') headerName = 'id';
      obj[headerName] = data[i][j];
    }
    json.push(obj);
  }
  return ContentService.createTextOutput(JSON.stringify(json)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  sheet.clear();
  sheet.appendRow(["identificador", "date", "nature", "amount", "currency", "description", "payer", "type", "paymentMethodId"]);
  data.forEach(function(t) {
    sheet.appendRow([t.id, t.date, t.nature, t.amount, t.currency, t.description, t.payer, t.type, t.paymentMethodId]);
  });
  return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
}`;
    navigator.clipboard.writeText(code);
    alert("Código Brunance Full-Sync copiado.");
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-50 overflow-hidden relative">
      <header className="px-6 pt-6 pb-2 bg-white border-b border-slate-100 shrink-0">
        <div className="flex justify-between items-center mb-4">
            <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tighter flex items-center gap-1">
                BRUN<span className="text-teal-600">ANCE</span>
            </h1>
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">Fran & Car Personal Finance</p>
            </div>
            <div className="flex gap-2 items-center">
                {isSyncing && (
                  <div className="flex items-center gap-1 bg-teal-50 px-2 py-1 rounded-lg">
                    <div className="w-1 h-1 bg-teal-600 rounded-full animate-ping" />
                    <span className="text-[8px] font-black text-teal-600 uppercase tracking-widest">Nube</span>
                  </div>
                )}
                <button 
                    onClick={() => handleSync(false)}
                    disabled={isSyncing}
                    className={`p-2.5 rounded-2xl transition-all shadow-sm ${isSyncing ? 'bg-teal-50 text-teal-600 animate-spin' : 'bg-slate-800 text-white hover:bg-teal-600'}`}
                    title="Sincronizar Nube"
                >
                    <RefreshCw size={20} />
                </button>
            </div>
        </div>

        <div className="flex items-center justify-between bg-slate-100 rounded-2xl p-1 mb-2">
            <button onClick={() => changeMonth(-1)} className="p-2 text-slate-400 hover:text-teal-600 transition-colors"><ChevronLeft size={20}/></button>
            <div className="flex items-center gap-2 text-xs font-black text-slate-600 uppercase tracking-widest">
                {format(selectedMonth, 'MMMM yyyy', { locale: es })}
            </div>
            <button onClick={() => changeMonth(1)} className="p-2 text-slate-400 hover:text-teal-600 transition-colors"><ChevronRight size={20}/></button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'add' && (
          <TransactionForm 
            onAdd={addTransaction} 
            prefill={prefillTransaction} 
            allTransactions={transactions}
          />
        )}
        {activeTab === 'list' && <HistoryList transactions={filteredTransactions} onDelete={deleteTransaction} />}
        {activeTab === 'stats' && (
            <div className="h-full flex flex-col">
                <Dashboard 
                  transactions={filteredTransactions} 
                  allTransactions={transactions}
                  onSettle={handleSettle} 
                  selectedMonth={selectedMonth}
                />
            </div>
        )}
        {activeTab === 'settings' && (
            <div className="p-6 space-y-6 h-full overflow-y-auto no-scrollbar pb-24">
                <div className="flex flex-col items-center text-center space-y-2 mb-4">
                    <div className="w-20 h-20 bg-slate-800 text-white rounded-[2rem] flex items-center justify-center shadow-xl rotate-3">
                        <ShieldCheck size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 pt-2">Brunance Panel</h2>
                </div>

                <button 
                    onClick={forceAppUpdate}
                    className="w-full flex items-center justify-between p-4 bg-indigo-600 text-white rounded-3xl shadow-lg shadow-indigo-200 active:scale-95 transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <Zap size={20} className="fill-white" />
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Nueva Versión</p>
                            <p className="text-sm font-bold">Actualizar Aplicación</p>
                        </div>
                    </div>
                    <RefreshCw size={20} />
                </button>

                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                    <div className="flex items-center gap-2 font-black text-slate-800 uppercase text-xs tracking-wider">
                        <Smartphone size={16} className="text-teal-600" />
                        Llevar Brunance al Celular
                    </div>
                    <div className="space-y-3">
                        <div className="flex gap-3 items-start p-3 bg-slate-50 rounded-2xl">
                            <Apple size={20} className="text-slate-400 shrink-0" />
                            <div>
                                <p className="text-[11px] font-bold text-slate-700">iPhone (Safari)</p>
                                <p className="text-[10px] text-slate-500">Compartir &gt; "Añadir a pantalla de inicio"</p>
                            </div>
                        </div>
                        <div className="flex gap-3 items-start p-3 bg-slate-50 rounded-2xl">
                            <Smartphone size={20} className="text-slate-400 shrink-0" />
                            <div>
                                <p className="text-[11px] font-bold text-slate-700">Android (Chrome)</p>
                                <p className="text-[10px] text-slate-500">Menú (⋮) &gt; "Instalar aplicación"</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-teal-50 p-5 rounded-3xl border border-teal-100 space-y-4">
                    <div className="flex items-center gap-2 text-teal-900 font-black text-xs uppercase tracking-wider">
                        <Table size={16} className="text-teal-600" />
                        Brunance Cloud Sync (Full)
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-teal-600 uppercase">Script URL</label>
                        <input 
                            type="text" 
                            placeholder="URL de tu Google Apps Script..."
                            value={sheetsUrl}
                            onChange={(e) => setSheetsUrl(e.target.value)}
                            className="w-full bg-white border-teal-200 rounded-xl text-xs p-3 focus:ring-2 focus:ring-teal-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        <button 
                            onClick={copyScriptCode}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 text-white text-xs font-black rounded-xl hover:bg-teal-700 transition-colors shadow-md"
                        >
                            <Copy size={14} /> Copiar Código
                        </button>
                        <button 
                            onClick={() => handleSync(false)}
                            disabled={isSyncing}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-white text-teal-600 border border-teal-200 text-xs font-black rounded-xl hover:bg-teal-50 transition-colors"
                        >
                            <CloudDownload size={14} /> Sincronización Manual
                        </button>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <div className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-[0.2em]">Brunance Engine Info</div>
                    <div className="space-y-3">
                        <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                            <span className="text-slate-500 font-medium">Build</span>
                            <span className="font-black text-slate-800">{APP_VERSION}</span>
                        </div>
                        <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                            <span className="text-slate-500 font-medium">Registros</span>
                            <span className="font-black text-slate-800">{transactions.length}</span>
                        </div>
                        <div className="flex justify-between text-[10px] py-1 border-b border-slate-50">
                            <span className="text-slate-400 font-medium italic">Estado Sync</span>
                            <span className={`font-black ${isSyncing ? 'text-teal-600 animate-pulse' : 'text-slate-800'}`}>
                                {isSyncing ? 'Subiendo...' : 'Al día'}
                            </span>
                        </div>
                    </div>
                </div>
                
                <button 
                  onClick={() => {
                    if(confirm('¿Seguro quieres borrar los datos locales de Brunance?')) {
                      setTransactions([]);
                      setDeletedIds([]);
                      localStorage.removeItem('brunance_transactions_v3');
                      localStorage.removeItem('brunance_deleted_ids');
                      window.location.reload();
                    }
                  }}
                  className="w-full py-4 text-red-500 text-[10px] font-black uppercase tracking-widest bg-red-50 rounded-2xl border border-red-100"
                >
                  Hard Reset
                </button>
            </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-lg border-t border-slate-100 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex justify-around items-center h-20 px-4">
          <NavButton 
            active={activeTab === 'add'} 
            onClick={() => { setActiveTab('add'); setPrefillTransaction(undefined); }} 
            icon={<PlusCircle size={26} />} 
            label="Cargar"
          />
          <NavButton 
            active={activeTab === 'list'} 
            onClick={() => setActiveTab('list')} 
            icon={<List size={26} />} 
            label="Detalle"
          />
          <NavButton 
            active={activeTab === 'stats'} 
            onClick={() => setActiveTab('stats')} 
            icon={<ChartIcon size={26} />} 
            label="Resumen"
          />
          <NavButton 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
            icon={<Settings size={26} />} 
            label="Ajustes"
          />
        </div>
      </nav>
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-20 transition-all ${
      active ? 'text-teal-600 scale-110' : 'text-slate-400'
    }`}
  >
    <div className={`p-1 rounded-xl transition-colors ${active ? 'bg-teal-50' : ''}`}>
        {icon}
    </div>
    <span className="text-[9px] font-black mt-1 uppercase tracking-tighter">{label}</span>
  </button>
);

export default App;
