
import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, List, PieChart as ChartIcon, Settings as SettingsIcon, ChevronLeft, ChevronRight, CloudUpload, Loader2 } from 'lucide-react';
import TransactionForm from './components/ExpenseForm';
import HistoryList from './components/HistoryList';
import Dashboard from './components/Dashboard';
import SettingsView from './components/SettingsView';
import { Transaction } from './types';
import { format, addMonths, differenceInCalendarMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const App: React.FC = () => {
  const [view, setView] = useState<'add' | 'history' | 'dashboard' | 'settings'>('add');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [prefill, setPrefill] = useState<any>(null);
  const [sheetsUrl, setSheetsUrl] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Cargar datos iniciales
  useEffect(() => {
    const saved = localStorage.getItem('brunance_transactions');
    const savedUrl = localStorage.getItem('brunance_sheets_url');
    if (saved) {
      try {
        setTransactions(JSON.parse(saved));
      } catch (e) {
        console.error("Error cargando datos:", e);
      }
    }
    if (savedUrl) setSheetsUrl(savedUrl);
  }, []);

  useEffect(() => {
    localStorage.setItem('brunance_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('brunance_sheets_url', sheetsUrl);
  }, [sheetsUrl]);

  const filteredTransactions = useMemo(() => {
    const viewStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const viewEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return transactions.filter(t => {
      const transDate = new Date(t.date);
      const diffMonths = differenceInCalendarMonths(selectedMonth, transDate);
      
      if (!t.installments || t.installments <= 1) {
        return transDate >= viewStart && transDate <= viewEnd;
      }

      return diffMonths >= 0 && diffMonths < t.installments;
    });
  }, [transactions, selectedMonth]);

  // Función de sincronización mejorada
  const handleSync = async (dataToSync?: Transaction[], silent: boolean = false) => {
    const targetUrl = sheetsUrl || localStorage.getItem('brunance_sheets_url');
    if (!targetUrl) {
      if (!silent) {
        alert("Configura el link de Google Sheets en Ajustes.");
        setView('settings');
      }
      return;
    }

    const payload = dataToSync || transactions;
    setIsSyncing(true);
    
    try {
      await fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!silent) {
        alert("✅ Sincronización enviada con éxito.");
      }
    } catch (e) {
      console.error("Sync Error:", e);
      if (!silent) {
        alert("❌ Error al actualizar. Revisa la URL en Ajustes.");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // 2. Sincronización automática al abrir la app (una vez cargada la URL)
  useEffect(() => {
    const savedUrl = localStorage.getItem('brunance_sheets_url');
    if (savedUrl) {
      handleSync(undefined, true);
    }
  }, []);

  const handleAddTransaction = (t: Transaction) => {
    const newTransactions = [t, ...transactions];
    setTransactions(newTransactions);
    setView('history');
    setPrefill(null);
    
    // Auto-sync silencioso
    if (sheetsUrl) {
      handleSync(newTransactions, true);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm('¿Eliminar transacción?')) {
      const newTransactions = transactions.filter(t => t.id !== id);
      setTransactions(newTransactions);
      
      // Auto-sync silencioso
      if (sheetsUrl) {
        handleSync(newTransactions, true);
      }
    }
  };

  const handleSettle = (data: any) => {
    setPrefill(data);
    setView('add');
  };

  const handleCancelPrefill = () => {
    setPrefill(null);
    setView('dashboard');
  };

  const handleClearData = () => {
    if (window.confirm('¿Borrar todos los datos locales?')) {
      setTransactions([]);
      localStorage.removeItem('brunance_transactions');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto h-screen overflow-hidden border-x border-slate-200">
      <header className="bg-white border-b px-4 py-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-black text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-500 to-teal-500">
              BRUNANCE
            </h1>
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none mt-0.5 font-sans">V6.0 Smart Ledger</p>
          </div>
          <button 
            onClick={() => handleSync(undefined, false)}
            disabled={isSyncing}
            className={`p-2 rounded-xl transition-all active:scale-95 ${isSyncing ? 'bg-slate-100 text-indigo-400' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100/50'}`}
          >
            {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
          </button>
        </div>
        
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200">
          <button onClick={() => setSelectedMonth(prev => addMonths(prev, -1))} className="p-1.5 hover:bg-white rounded-lg transition-all active:scale-90 text-slate-600">
            <ChevronLeft size={14}/>
          </button>
          <span className="text-[10px] font-black uppercase w-24 text-center text-slate-700 font-sans">
            {format(selectedMonth, 'MMM yyyy', { locale: es })}
          </span>
          <button onClick={() => setSelectedMonth(prev => addMonths(prev, 1))} className="p-1.5 hover:bg-white rounded-lg transition-all active:scale-90 text-slate-600">
            <ChevronRight size={14}/>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative bg-slate-50">
        {view === 'add' && <TransactionForm onAdd={handleAddTransaction} allTransactions={transactions} prefill={prefill || undefined} onCancelPrefill={handleCancelPrefill} />}
        {view === 'history' && <HistoryList transactions={filteredTransactions} onDelete={handleDeleteTransaction} currentMonth={selectedMonth} />}
        {view === 'dashboard' && <Dashboard transactions={filteredTransactions} allTransactions={transactions} onSettle={handleSettle} selectedMonth={selectedMonth} />}
        {view === 'settings' && (
          <SettingsView 
            transactions={transactions} 
            setTransactions={setTransactions} 
            onClear={handleClearData} 
            sheetsUrl={sheetsUrl} 
            setSheetsUrl={setSheetsUrl} 
            onSync={() => handleSync(undefined, false)}
            isSyncing={isSyncing}
          />
        )}
      </main>

      <nav className="bg-white border-t flex justify-around items-center py-2 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.03)] z-20">
        <button onClick={() => setView('add')} className={`flex flex-col items-center flex-1 py-1 transition-all ${view === 'add' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <div className={`p-2 rounded-full -mt-6 mb-1 shadow-lg transition-all ${view === 'add' ? 'bg-indigo-600 text-white scale-110' : 'bg-white text-slate-400 border border-slate-100'}`}>
            <PlusCircle size={24} />
          </div>
          <span className="text-[8px] font-bold uppercase tracking-tighter font-sans">Nuevo</span>
        </button>

        <button onClick={() => setView('history')} className={`flex flex-col items-center flex-1 py-1 transition-all ${view === 'history' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <List size={22} strokeWidth={view === 'history' ? 2.5 : 2} />
          <span className="text-[8px] font-bold uppercase mt-1 tracking-tighter font-sans">Lista</span>
        </button>

        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center flex-1 py-1 transition-all ${view === 'dashboard' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <ChartIcon size={22} strokeWidth={view === 'dashboard' ? 2.5 : 2} />
          <span className="text-[8px] font-bold uppercase mt-1 tracking-tighter font-sans">Resumen</span>
        </button>

        <button onClick={() => setView('settings')} className={`flex flex-col items-center flex-1 py-1 transition-all ${view === 'settings' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <SettingsIcon size={22} strokeWidth={view === 'settings' ? 2.5 : 2} />
          <span className="text-[8px] font-bold uppercase mt-1 tracking-tighter font-sans">Ajustes</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
