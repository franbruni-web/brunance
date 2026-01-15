
import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, List, PieChart as ChartIcon, Settings, RefreshCw, ChevronLeft, ChevronRight, Table, Copy, Smartphone, Apple, ShieldCheck, CloudDownload } from 'lucide-react';
import TransactionForm from './components/ExpenseForm';
import HistoryList from './components/HistoryList';
import Dashboard from './components/Dashboard';
import { Transaction } from './types';
import { format, addMonths, subMonths, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'add' | 'list' | 'stats' | 'settings'>('add');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState<string>(localStorage.getItem('brunance_sheets_url') || '');
  
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [prefillTransaction, setPrefillTransaction] = useState<Partial<Transaction> | undefined>(undefined);

  useEffect(() => {
    const saved = localStorage.getItem('brunance_transactions_v3');
    if (saved) {
      try {
        setTransactions(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load transactions", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('brunance_transactions_v3', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('brunance_sheets_url', sheetsUrl);
  }, [sheetsUrl]);

  const addTransaction = (newTransaction: Transaction) => {
    setTransactions(prev => [newTransaction, ...prev]);
    setPrefillTransaction(undefined);
    setActiveTab('list');
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleSync = async () => {
    if (!sheetsUrl) {
      alert("Configura la URL de Brunance Sheets en Ajustes.");
      setActiveTab('settings');
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Intentar descargar datos actuales de la nube (GET)
      // Nota: Google Apps Script requiere que la URL termine en /exec o similar
      const response = await fetch(sheetsUrl);
      let remoteData: Transaction[] = [];
      
      if (response.ok) {
        const text = await response.text();
        try {
          remoteData = JSON.parse(text);
        } catch (e) {
          console.log("No hay datos previos en la nube o formato inválido.");
        }
      }

      // 2. Combinar datos locales con remotos evitando duplicados por ID
      const localMap = new Map(transactions.map(t => [t.id, t]));
      remoteData.forEach(rt => {
        if (!localMap.has(rt.id)) {
          localMap.set(rt.id, rt);
        }
      });
      
      const mergedData = Array.from(localMap.values()).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // 3. Subir la lista combinada (POST)
      await fetch(sheetsUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mergedData),
      });
      
      setTransactions(mergedData.map(t => ({ ...t, synced: true })));
      alert("Brunance: Nube y Celular sincronizados.");
    } catch (error) {
      console.error("Sync error:", error);
      alert("Error en la sincronización. Verifica la URL y permisos.");
    } finally {
      setIsSyncing(false);
    }
  };

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
      // Mapeo simple de vuelta a las keys de Brunance
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
    alert("Código Brunance Full-Sync copiado. Recuerda publicarlo como 'Cualquier persona'!");
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
            <div className="flex gap-2">
                <button 
                    onClick={handleSync}
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
                            <Copy size={14} /> Copiar Nuevo Código (Merge)
                        </button>
                        <button 
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-white text-teal-600 border border-teal-200 text-xs font-black rounded-xl hover:bg-teal-50 transition-colors"
                        >
                            <CloudDownload size={14} /> Forzar Sincronización Total
                        </button>
                    </div>
                    <p className="text-[9px] text-teal-700 font-medium leading-tight">
                        * El nuevo código permite "bajar" datos. Si ya tenías un script, debes reemplazarlo por este y volver a Implementar.
                    </p>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <div className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-[0.2em]">Brunance Engine Info</div>
                    <div className="space-y-3">
                        <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                            <span className="text-slate-500 font-medium">Build</span>
                            <span className="font-black text-slate-800">4.1.0 Cloud-Merge</span>
                        </div>
                        <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                            <span className="text-slate-500 font-medium">Registros</span>
                            <span className="font-black text-slate-800">{transactions.length}</span>
                        </div>
                    </div>
                </div>
                
                <button 
                  onClick={() => {
                    if(confirm('¿Seguro quieres borrar los datos locales de Brunance?')) {
                      setTransactions([]);
                      localStorage.removeItem('brunance_transactions_v3');
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
