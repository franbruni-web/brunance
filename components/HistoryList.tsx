
import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Transaction } from '../types';
import { PAYMENT_METHODS } from '../constants';
import { Trash2, ShoppingBag, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react';

interface HistoryListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ transactions, onDelete }) => {
  // Lógica robusta para encontrar cuentas ignorando mayúsculas/minúsculas/espacios
  const findMethod = (id: string) => {
    if (!id) return null;
    const normalizedId = id.toString().trim().toLowerCase();
    return PAYMENT_METHODS.find(m => m.id.toLowerCase().trim() === normalizedId);
  };

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
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
            {getDateLabel(date)}
          </h3>
          <div className="space-y-3">
            {items.map((t) => {
              const method = findMethod(t.paymentMethodId);
              const toMethod = t.toPaymentMethodId ? findMethod(t.toPaymentMethodId) : null;
              const isIncome = t.nature === 'Ingreso';
              const isTransfer = t.nature === 'Transferencia';
              
              return (
                <div 
                  key={t.id} 
                  className={`bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between group border-l-4 ${
                    isIncome ? 'border-l-green-500' : isTransfer ? 'border-l-indigo-400' : 'border-l-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${
                      isIncome ? 'bg-green-50 text-green-600' : 
                      isTransfer ? 'bg-indigo-50 text-indigo-600' :
                      'bg-slate-50 text-slate-400'
                    }`}>
                      {isIncome ? <ArrowUpRight size={20} /> : 
                       isTransfer ? <ArrowLeftRight size={20} /> : 
                       <ArrowDownRight size={20} />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 line-clamp-1 text-sm">
                        {isTransfer ? `De ${method?.name || '...'} a ${toMethod?.name || '...'}` : t.description}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tighter font-bold">
                          {t.payer}
                        </span>
                        {!isTransfer && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-slate-200" />
                            <span>{method?.name || 'Cuenta Desconocida'}</span>
                          </>
                        )}
                        {isTransfer && <span className="text-[8px] text-indigo-400 font-bold uppercase">Movimiento Interno</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <div className={`font-bold text-sm flex items-center gap-1 ${
                        isIncome ? 'text-green-600' : 
                        isTransfer ? 'text-indigo-600' : 
                        'text-slate-900'
                      }`}>
                        {isIncome ? '+' : isTransfer ? '↔' : '-'}{t.amount.toLocaleString()}
                        <span className="text-[8px] opacity-60">{t.currency}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{format(new Date(t.date), 'HH:mm')}</div>
                    </div>
                    <button 
                      onClick={() => onDelete(t.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
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

      {transactions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <ShoppingBag size={48} strokeWidth={1} className="mb-4 opacity-20" />
          <p className="text-sm">No hay registros aún en este mes</p>
        </div>
      )}
    </div>
  );
};

export default HistoryList;
