
import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, List, PieChart as ChartIcon, Settings as SettingsIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import TransactionForm from './components/ExpenseForm';
import HistoryList from './components/HistoryList';
import Dashboard from './components/Dashboard';
import SettingsView from './components/SettingsView';
import { Transaction } from './types';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'history' | 'add' | 'settings'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [prefill, setPrefill] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('brunance_transactions');
    if (saved) {
      try {
        setTransactions(JSON.parse(saved));
      } catch (e) {
        console.error("Error cargando datos:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('brunance_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const start = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const end = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });
  }, [transactions, selectedMonth]);

  const handleAddTransaction = (t: Transaction) => {
    setTransactions(prev => [t, ...prev]);
    setView('history');
    setPrefill(null);
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm('¿Eliminar transacción?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleSettle = (data: any) => {
    setPrefill(data);
    setView('add');
  };

  const handleClearData = () => {
    if (window.confirm('¿Estás SEGURO? Se borrarán todos los datos locales.')) {
      setTransactions([]);
      localStorage.removeItem('brunance_transactions');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto h-screen overflow-hidden border-x border-slate-200">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm z-20">
        <div>
          <h1 className="font-black text-xl text-slate-800 tracking-tighter italic">BRUNANCE</h1>
          <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-none">V4.5 Robust Edition</p>
        </div>
        
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200">
          <button onClick={() => setSelectedMonth(prev => addMonths(prev, -1))} className="p-1.5 hover:bg-white rounded-lg transition-all active:scale-90 text-slate-600">
            <ChevronLeft size={14}/>
          </button>
          <span className="text-[10px] font-black uppercase w-24 text-center text-slate-700">
            {format(selectedMonth, 'MMM yyyy', { locale: es })}
          </span>
          <button onClick={() => setSelectedMonth(prev => addMonths(prev, 1))} className="p-1.5 hover:bg-white rounded-lg transition-all active:scale-90 text-slate-600">
            <ChevronRight size={14}/>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative bg-slate-50">
        {view === 'dashboard' && <Dashboard transactions={filteredTransactions} allTransactions={transactions} onSettle={handleSettle} selectedMonth={selectedMonth} />}
        {view === 'history' && <HistoryList transactions={filteredTransactions} onDelete={handleDeleteTransaction} />}
        {view === 'add' && <TransactionForm onAdd={handleAddTransaction} allTransactions={transactions} prefill={prefill || undefined} />}
        {view === 'settings' && <SettingsView transactions={transactions} setTransactions={setTransactions} onClear={handleClearData} />}
      </main>

      <nav className="bg-white border-t flex justify-around items-center py-2 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.03)] z-20">
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center flex-1 py-1 transition-all ${view === 'dashboard' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <ChartIcon size={22} strokeWidth={view === 'dashboard' ? 2.5 : 2} />
          <span className="text-[8px] font-bold uppercase mt-1 tracking-tighter">Resumen</span>
        </button>

        <button onClick={() => setView('history')} className={`flex flex-col items-center flex-1 py-1 transition-all ${view === 'history' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <List size={22} strokeWidth={view === 'history' ? 2.5 : 2} />
          <span className="text-[8px] font-bold uppercase mt-1 tracking-tighter">Lista</span>
        </button>
        
        <button onClick={() => setView('add')} className={`flex flex-col items-center flex-1 py-1 transition-all ${view === 'add' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <div className={`p-2 rounded-full -mt-6 mb-1 shadow-lg transition-all ${view === 'add' ? 'bg-indigo-600 text-white scale-110' : 'bg-white text-slate-400 border border-slate-100'}`}>
            <PlusCircle size={24} />
          </div>
          <span className="text-[8px] font-bold uppercase tracking-tighter">Nuevo</span>
        </button>

        <button onClick={() => setView('settings')} className={`flex flex-col items-center flex-1 py-1 transition-all ${view === 'settings' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <SettingsIcon size={22} strokeWidth={view === 'settings' ? 2.5 : 2} />
          <span className="text-[8px] font-bold uppercase mt-1 tracking-tighter">Ajustes</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
