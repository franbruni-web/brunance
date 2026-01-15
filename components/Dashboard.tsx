
import React, { useMemo, useState } from 'react';
import { Transaction, Payer, Currency } from '../types';
import { PAYMENT_METHODS } from '../constants';
import { Wallet, TrendingUp, Users, ArrowUpCircle, ArrowDownCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardProps {
  transactions: Transaction[];
  allTransactions: Transaction[];
  onSettle: (prefill: any) => void;
  selectedMonth: Date;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, allTransactions, onSettle, selectedMonth }) => {
  const [currencyView, setCurrencyView] = useState<Currency>('ARS');

  // Revertido a búsqueda simple por ID (V4.5 Original)
  const findMethod = (id: string) => PAYMENT_METHODS.find(m => m.id === id);

  const filteredByCurrency = useMemo(() => 
    transactions.filter(t => t.currency === currencyView),
  [transactions, currencyView]);

  const totalIncome = filteredByCurrency.filter(t => t.nature === 'Ingreso').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = filteredByCurrency.filter(t => t.nature === 'Gasto').reduce((acc, curr) => acc + curr.amount, 0);

  const globalBalances = useMemo(() => {
    const data: Record<string, number> = {};
    const history = allTransactions.filter(t => t.currency === currencyView);

    history.forEach(t => {
        if (t.nature === 'Transferencia') {
          const fromMethod = findMethod(t.paymentMethodId);
          const fromName = fromMethod ? fromMethod.name : "Cuenta Desconocida";
          data[fromName] = (data[fromName] || 0) - t.amount;

          const toMethod = t.toPaymentMethodId ? findMethod(t.toPaymentMethodId) : null;
          if (toMethod) {
            data[toMethod.name] = (data[toMethod.name] || 0) + t.amount;
          }
        } else {
          const method = findMethod(t.paymentMethodId);
          const name = method ? method.name : "Cuenta Desconocida";
          const value = t.nature === 'Ingreso' ? t.amount : -t.amount;
          data[name] = (data[name] || 0) + value;
        }
    });

    return Object.entries(data)
        .filter(([_, val]) => Math.abs(val) > 0.01)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
  }, [allTransactions, currencyView]);

  const totalBalance = useMemo(() => {
    return allTransactions
      .filter(t => t.currency === currencyView)
      .reduce((acc, t) => {
        if (t.nature === 'Ingreso') return acc + t.amount;
        if (t.nature === 'Gasto') return acc - t.amount;
        return acc;
      }, 0);
  }, [allTransactions, currencyView]);

  const debtInfo = useMemo(() => {
    const sharedExpenses = filteredByCurrency.filter(e => e.type === 'Familiar' && e.nature === 'Gasto');
    const settlements = filteredByCurrency.filter(e => e.nature === 'Transferencia' && e.isSettlement);

    const franPaid = sharedExpenses.filter(e => e.payer === 'Fran').reduce((a, b) => a + b.amount, 0);
    const carPaid = sharedExpenses.filter(e => e.payer === 'Car').reduce((a, b) => a + b.amount, 0);
    const franSettled = settlements.filter(s => s.payer === 'Fran').reduce((a, b) => a + b.amount, 0);
    const carSettled = settlements.filter(s => s.payer === 'Car').reduce((a, b) => a + b.amount, 0);

    const totalShared = franPaid + carPaid;
    const target = totalShared / 2;
    const netFran = (franPaid + franSettled) - carSettled;
    const diff = netFran - target;

    if (Math.abs(diff) < 1) return { from: null, amount: 0, text: 'Cuentas al día' };
    return diff > 0 
      ? { from: 'Car' as Payer, amount: diff, text: 'Car debe a Fran' }
      : { from: 'Fran' as Payer, amount: Math.abs(diff), text: 'Fran debe a Car' };
  }, [filteredByCurrency]);

  return (
    <div className="pb-24 p-5 space-y-5 overflow-y-auto h-full no-scrollbar">
      <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit mx-auto border border-slate-200">
        {(['ARS', 'USD'] as Currency[]).map((c) => (
          <button
            key={c}
            onClick={() => setCurrencyView(c)}
            className={`px-5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
              currencyView === c ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 rounded-3xl p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <p className="text-[10px] font-bold uppercase opacity-50 mb-1 tracking-widest">Saldo Disponible</p>
        <h2 className="text-4xl font-black italic tracking-tighter">${totalBalance.toLocaleString()}</h2>
        
        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
            <p className="text-[10px] text-green-400 font-black uppercase mb-1 flex items-center gap-1.5">
              <ArrowUpCircle size={12} /> Ingresos
            </p>
            <p className="text-xl font-bold">${totalIncome.toLocaleString()}</p>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
            <p className="text-[10px] text-red-400 font-black uppercase mb-1 flex items-center gap-1.5">
              <ArrowDownCircle size={12} /> Gastos
            </p>
            <p className="text-xl font-bold">${totalExpense.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex justify-between items-center group active:scale-[0.98] transition-all">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-100">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Balance de Pareja</p>
            <p className="text-sm font-black text-slate-800">{debtInfo.text}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-indigo-600 tracking-tighter">${Math.round(debtInfo.amount).toLocaleString()}</p>
          {debtInfo.amount > 0 && (
            <button 
              onClick={() => onSettle({
                nature: 'Transferencia',
                amount: Math.round(debtInfo.amount),
                currency: currencyView,
                payer: debtInfo.from,
                description: `Saldar cuentas ${format(selectedMonth, 'MMMM', { locale: es })}`,
                isSettlement: true
              })}
              className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg mt-1"
            >
              Saldar ahora
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp size={16} className="text-teal-500" />
            Cuentas ({currencyView})
          </h3>
        </div>
        <div className="space-y-4">
          {globalBalances.map(item => (
            <div key={item.name} className="flex justify-between items-center group">
              <span className="text-sm font-bold text-slate-500 group-hover:text-slate-800 transition-colors">{item.name}</span>
              <div className="flex flex-col items-end">
                <span className={`text-sm font-black tracking-tight ${item.value >= 0 ? 'text-slate-900' : 'text-red-500'}`}>
                  ${Math.round(item.value).toLocaleString()}
                </span>
                <div className={`h-1 w-8 rounded-full mt-1 ${item.value >= 0 ? 'bg-slate-100' : 'bg-red-50'}`}></div>
              </div>
            </div>
          ))}
          {globalBalances.length === 0 && <p className="text-center text-[10px] text-slate-400 uppercase py-4">Sin actividad este mes</p>}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
