
import React from 'react';
import { format, isToday, isYesterday, differenceInCalendarMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Transaction } from '../types';
import { PAYMENT_METHODS } from '../constants';
import { Trash2, ShoppingBag, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Layers } from 'lucide-react';

interface HistoryListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  currentMonth: Date;
}

const formatNum = (num: number) => {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const HistoryList: React.FC<HistoryListProps> = ({ transactions, onDelete, currentMonth }) => {
  const findMethod = (id: string) => PAYMENT_METHODS.find(m => m.id === id);

  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const groupTransactionsByDate = () => {
    const groups: Record<string, Transaction[]> = {};
    sortedTransactions.forEach(t => {
      const dateKey = format(new Date(t.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return groups;
  };

  const groups = groupTransactionsByDate();

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoy';
    if (isYesterday(date)) return 'Ayer';
    return format(date, "EEEE d 'de' MMMM", { locale: es });
  };

  return (
    <div className="space-y-6 pb-24 p-4 no-scrollbar h-full overflow-y-auto">
      {Object.entries(groups).map(([date, items]) => (
        <div key={date} className="space-y-2">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 font-sans">
            {getDateLabel(date)}
          </h3>
          <div className="space-y-3">
            {items.map((t) => {
              const isIncome = t.nature === 'Ingreso';
              const isTransfer = t.nature === 'Transferencia';
              const installments = t.installments || 1;
              const diffMonths = differenceInCalendarMonths(currentMonth, new Date(t.date));
              const currentInstallment = diffMonths + 1;
              
              return (
                <div key={t.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between border-l-4 border-l-slate-100 transition-all active:bg-slate-50">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-3 rounded-xl shrink-0 ${isIncome ? 'bg-green-50 text-green-600' : isTransfer ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                      {isIncome ? <ArrowUpRight size={20} /> : isTransfer ? <ArrowLeftRight size={20} /> : <ArrowDownRight size={20} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-800 text-sm truncate">{t.description}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{t.payer}</span>
                        {installments > 1 && (
                          <span className="text-[9px] font-black text-indigo-500 uppercase bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                            <Layers size={8} /> Cuota {currentInstallment}/{installments}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2 ml-2">
                    <div className="shrink-0 mr-1">
                      <div className={`font-black text-sm ${isIncome ? 'text-green-600' : isTransfer ? 'text-indigo-600' : 'text-slate-900'}`}>
                        ${formatNum(t.amount / (installments > 1 ? installments : 1))}
                      </div>
                      <div className="text-[9px] font-bold text-slate-300 uppercase leading-none">{t.currency}</div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(t.id);
                      }} 
                      title="Eliminar"
                      className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      
      {Object.keys(groups).length === 0 && (
        <div className="h-64 flex flex-col items-center justify-center text-slate-300">
          <ShoppingBag size={48} strokeWidth={1} className="mb-4 opacity-20" />
          <p className="text-xs font-bold uppercase tracking-widest">Sin movimientos este mes</p>
        </div>
      )}
    </div>
  );
};

export default HistoryList;
