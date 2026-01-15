
import React, { useState, useEffect, useMemo } from 'react';
import { 
  PlusCircle, List, PieChart as ChartIcon, Settings, RefreshCw, 
  ChevronLeft, ChevronRight, Table, Copy, Smartphone, Apple, 
  ShieldCheck, CloudDownload, Zap, CheckCircle2, AlertCircle, Loader2 
} from 'lucide-react';
import TransactionForm from './components/ExpenseForm';
import HistoryList from './components/HistoryList';
import Dashboard from './components/Dashboard';
import { Transaction } from './types';
// Fixed: Removed subMonths as it was reported missing in the module; using addMonths with negative values instead.
// Added startOfMonth to facilitate correct filtering of transactions for the selected month.
import { format, addMonths, endOfMonth, isWithinInterval, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

const APP_VERSION = "4.5.1 Robust-ID-Match";

/**
 * Main App component for Brunance.
 * Handles state for transactions, navigation views, and month selection.
 */
const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'history' | 'add'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [prefill, setPrefill] = useState<any>(null);

  // Persistence: Load transactions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('brunance_transactions');
    if (saved) {
      try {
        setTransactions(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load transactions:", e);
      }
    }
  }, []);

  // Persistence: Save transactions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('brunance_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Derived state: filter transactions for the currently viewed month
  const filteredTransactions = useMemo(() => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    return transactions.filter(t => {
      const d = new Date(t.date);
      return isWithinInterval(d, { start, end });
    });
  }, [transactions, selectedMonth]);

  const handleAddTransaction = (t: Transaction) => {
    setTransactions(prev => [t, ...prev]);
    setView('history');
    setPrefill(null);
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm('¿Eliminar esta transacción?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleSettle = (data: any) => {
    setPrefill(data);
    setView('add');
  };

  const navigateMonth = (direction: number) => {
    // Fixed: Using addMonths instead of the problematic subMonths
    setSelectedMonth(prev => addMonths(prev, direction));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden h-screen border-x border-slate-200">
      <header className="bg-white border-b p-4 flex items-center justify-between z-10 shadow-sm">
        <div>
          <h1 className="font-black text-xl text-slate-800 italic leading-none tracking-tighter">BRUNANCE</h1>
          <span className="text-[7px] font-bold opacity-30 uppercase tracking-[0.2em]">{APP_VERSION}</span>
        </div>
        
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button 
            onClick={() => navigateMonth(-1)} 
            className="p-1.5 hover:bg-white rounded-lg transition-all active:scale-90"
          >
            <ChevronLeft size={16} className="text-slate-600" />
          </button>
          <span className="text-[10px] font-black uppercase px-2 w-28 text-center text-slate-700">
            {format(selectedMonth, 'MMMM yyyy', { locale: es })}
          </span>
          <button 
            onClick={() => navigateMonth(1)} 
            className="p-1.5 hover:bg-white rounded-lg transition-all active:scale-90"
          >
            <ChevronRight size={16} className="text-slate-600" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {view === 'dashboard' && (
          <Dashboard 
            transactions={filteredTransactions} 
            allTransactions={transactions} 
            onSettle={handleSettle} 
            selectedMonth={selectedMonth} 
          />
        )}
        {view === 'history' && (
          <HistoryList 
            transactions={filteredTransactions} 
            onDelete={handleDeleteTransaction} 
          />
        )}
        {view === 'add' && (
          <TransactionForm 
            onAdd={handleAddTransaction} 
            allTransactions={transactions} 
            prefill={prefill || undefined}
          />
        )}
      </main>

      <nav className="bg-white border-t p-2 flex justify-around items-center pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        <button 
          onClick={() => {setView('dashboard'); setPrefill(null);}} 
          className={`p-2 flex flex-col items-center transition-all ${view === 'dashboard' ? 'text-indigo-600' : 'text-slate-300'}`}
        >
          <ChartIcon size={24} strokeWidth={view === 'dashboard' ? 2.5 : 2} />
          <span className="text-[8px] font-black uppercase mt-1 tracking-widest">Resumen</span>
        </button>
        
        <button 
          onClick={() => {setView('add'); setPrefill(null);}} 
          className={`p-3 -mt-10 bg-white rounded-full shadow-xl border-4 border-slate-50 flex flex-col items-center transition-all ${view === 'add' ? 'text-green-600 rotate-45' : 'text-slate-400 hover:text-indigo-500'}`}
        >
          <PlusCircle size={36} strokeWidth={2.5} />
        </button>
        
        <button 
          onClick={() => {setView('history'); setPrefill(null);}} 
          className={`p-2 flex flex-col items-center transition-all ${view === 'history' ? 'text-indigo-600' : 'text-slate-300'}`}
        >
          <List size={24} strokeWidth={view === 'history' ? 2.5 : 2} />
          <span className="text-[8px] font-black uppercase mt-1 tracking-widest">Historial</span>
        </button>
      </nav>
    </div>
  );
};

// Fixed: Added default export to resolve error in index.tsx
export default App;
