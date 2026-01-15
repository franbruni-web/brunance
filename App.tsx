
import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, List, PieChart as ChartIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import TransactionForm from './components/ExpenseForm';
import HistoryList from './components/HistoryList';
import Dashboard from './components/Dashboard';
import { Transaction } from './types';
// Fix: Removed startOfMonth, endOfMonth, isWithinInterval as they are reported as not exported in this environment
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'history' | 'add'>('dashboard');
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
    // Fix: Using native Date objects to define the interval instead of startOfMonth/endOfMonth
    const start = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const end = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return transactions.filter(t => {
      const d = new Date(t.date);
      // Fix: Direct comparison instead of isWithinInterval
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto h-screen overflow-hidden">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <h1 className="font-black text-xl text-slate-800 tracking-tighter">BRUNANCE</h1>
        
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
          <button onClick={() => setSelectedMonth(prev => addMonths(prev, -1))} className="p-1"><ChevronLeft size={16}/></button>
          <span className="text-[10px] font-bold uppercase w-24 text-center">
            {format(selectedMonth, 'MMM yyyy', { locale: es })}
          </span>
          <button onClick={() => setSelectedMonth(prev => addMonths(prev, 1))} className="p-1"><ChevronRight size={16}/></button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {view === 'dashboard' && <Dashboard transactions={filteredTransactions} allTransactions={transactions} onSettle={handleSettle} selectedMonth={selectedMonth} />}
        {view === 'history' && <HistoryList transactions={filteredTransactions} onDelete={handleDeleteTransaction} />}
        {view === 'add' && <TransactionForm onAdd={handleAddTransaction} allTransactions={transactions} prefill={prefill || undefined} />}
      </main>

      <nav className="bg-white border-t flex justify-around items-center py-3 pb-safe">
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center ${view === 'dashboard' ? 'text-slate-900' : 'text-slate-300'}`}>
          <ChartIcon size={24} />
          <span className="text-[8px] font-bold uppercase mt-1">Resumen</span>
        </button>
        
        <button onClick={() => setView('add')} className={`bg-slate-900 text-white p-3 rounded-full shadow-lg transition-transform active:scale-90 ${view === 'add' ? 'scale-110' : ''}`}>
          <PlusCircle size={28} />
        </button>
        
        <button onClick={() => setView('history')} className={`flex flex-col items-center ${view === 'history' ? 'text-slate-900' : 'text-slate-300'}`}>
          <List size={24} />
          <span className="text-[8px] font-bold uppercase mt-1">Lista</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
