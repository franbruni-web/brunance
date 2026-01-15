
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

  // Lógica robusta para encontrar cuentas ignorando mayúsculas/minúsculas/espacios
  const findMethod = (id: string) => {
    if (!id) return null;
    const normalizedId = id.toString().trim().toLowerCase();
    return PAYMENT_METHODS.find(m => m.id.toLowerCase().trim() === normalizedId);
  };

  const filteredByCurrency = useMemo(() => 
    transactions.filter(t => t.currency === currencyView),
  [transactions, currencyView]);

  const totalIncome = filteredByCurrency.filter(t => t.nature === 'Ingreso').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = filteredByCurrency.filter(t => t.nature === 'Gasto').reduce((acc, curr) => acc + curr.amount, 0);

  // Saldos globales con normalización de ID
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
    <div className="pb-24 p-4 space-y-4 overflow-y-auto h-full no-scrollbar">
      <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit mx-auto">
        {(['ARS', 'USD'] as Currency[]).map((c) => (
          <button
            key={c}
            onClick={() => setCurrencyView(c)}
            className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currencyView === c ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-[10px] font-bold uppercase opacity-50 mb-1">Saldo Total</p>
        <h2 className="text-3xl font-black">${totalBalance.toLocaleString()}</h2>
        
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <p className="text-[10px] text-green-400 font-bold uppercase mb-1">Ingresos</p>
            <p className="text-lg font-bold">${totalIncome.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-red-400 font-bold uppercase mb-1">Gastos</p>
            <p className="text-lg font-bold">${totalExpense.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-indigo-600 rounded-2xl p-5 text-white shadow-md flex justify-between items-center">
        <div>
          <p className="text-[10px] font-bold uppercase opacity-70 mb-1">Balance de Pareja</p>
          <p className="text-sm font-bold">{debtInfo.text}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black">${Math.round(debtInfo.amount).toLocaleString()}</p>
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
              className="text-[10px] font-bold underline opacity-80"
            >
              Saldar ahora
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Saldos por cuenta</h3>
        <div className="space-y-3">
          {globalBalances.map(item => (
            <div key={item.name} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
              <span className="text-sm font-medium text-slate-600">{item.name}</span>
              <span className={`text-sm font-bold ${item.value >= 0 ? 'text-slate-900' : 'text-red-500'}`}>
                ${Math.round(item.value).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
