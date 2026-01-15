
import React, { useMemo, useState } from 'react';
import { Transaction, Payer, Currency, PaymentCategory } from '../types';
import { PAYMENT_METHODS, CATEGORY_ICONS } from '../constants';
import { TrendingUp, Users, ArrowUpCircle, ArrowDownCircle, Wallet, Landmark, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardProps {
  transactions: Transaction[];
  allTransactions: Transaction[];
  onSettle: (prefill: any) => void;
  selectedMonth: Date;
}

// Helper para formato de moneda consistente (Sin decimales)
const formatNum = (num: number) => {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const Dashboard: React.FC<DashboardProps> = ({ transactions, allTransactions, onSettle, selectedMonth }) => {
  const [currencyView, setCurrencyView] = useState<Currency>('ARS');

  // Cálculo de saldos individuales por cuenta
  const methodBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    
    // Inicializar saldos
    PAYMENT_METHODS.forEach(m => balances[m.id] = 0);

    // Procesar TODAS las transacciones históricas para tener el saldo real actual
    allTransactions.forEach(t => {
      if (t.currency !== currencyView) return;

      if (t.nature === 'Transferencia') {
        // Restar del origen
        balances[t.paymentMethodId] = (balances[t.paymentMethodId] || 0) - t.amount;
        // Sumar al destino
        if (t.toPaymentMethodId) {
          balances[t.toPaymentMethodId] = (balances[t.toPaymentMethodId] || 0) + t.amount;
        }
      } else if (t.nature === 'Ingreso') {
        balances[t.paymentMethodId] = (balances[t.paymentMethodId] || 0) + t.amount;
      } else if (t.nature === 'Gasto') {
        // Para el saldo de la cuenta, restamos el total (aunque sea en cuotas, el cupo o el efectivo se afecta)
        balances[t.paymentMethodId] = (balances[t.paymentMethodId] || 0) - t.amount;
      }
    });

    return balances;
  }, [allTransactions, currencyView]);

  // Cuentas con saldo positivo para mostrar
  const activeAccounts = useMemo(() => {
    return PAYMENT_METHODS.map(m => ({
      ...m,
      balance: methodBalances[m.id] || 0
    }))
    .filter(m => m.balance > 0)
    .sort((a, b) => b.balance - a.balance);
  }, [methodBalances]);

  const monthStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    
    transactions.forEach(t => {
      if (t.currency !== currencyView) return;
      const amountPerMonth = t.amount / (t.installments || 1);
      if (t.nature === 'Ingreso') income += amountPerMonth;
      if (t.nature === 'Gasto') expense += amountPerMonth;
    });

    return { income, expense };
  }, [transactions, currencyView]);

  // Fix: Explicitly cast Object.values to number[] to resolve "unknown" operator error in reduce
  const totalBalance = useMemo(() => {
    return (Object.values(methodBalances) as number[]).reduce((acc, val) => acc + val, 0);
  }, [methodBalances]);

  const debtInfo = useMemo(() => {
    const filtered = transactions.filter(t => t.currency === currencyView);
    const sharedExpenses = filtered.filter(e => e.type === 'Familiar' && e.nature === 'Gasto');
    const settlements = filtered.filter(e => e.nature === 'Transferencia' && e.isSettlement);

    let franPaid = 0;
    let carPaid = 0;
    sharedExpenses.forEach(e => {
      const amount = e.amount / (e.installments || 1);
      if (e.payer === 'Fran') franPaid += amount;
      else carPaid += amount;
    });

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
  }, [transactions, currencyView]);

  return (
    <div className="pb-24 p-5 space-y-6 overflow-y-auto h-full no-scrollbar">
      {/* Selector de Moneda */}
      <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit mx-auto border border-slate-200">
        {(['ARS', 'USD'] as Currency[]).map((c) => (
          <button
            key={c}
            onClick={() => setCurrencyView(c)}
            className={`px-5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${currencyView === c ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Card Principal de Patrimonio */}
      <div className="bg-slate-900 rounded-3xl p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <p className="text-[10px] font-black uppercase opacity-50 mb-1 tracking-[0.2em] font-sans">Patrimonio Neto Total</p>
        <h2 className="text-4xl font-black tracking-tighter">${formatNum(totalBalance)}</h2>
        
        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <p className="text-[10px] text-green-400 font-black uppercase mb-1 flex items-center gap-1.5 font-sans">
              <ArrowUpCircle size={12} /> Entradas
            </p>
            <p className="text-xl font-bold">${formatNum(monthStats.income)}</p>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <p className="text-[10px] text-red-400 font-black uppercase mb-1 flex items-center gap-1.5 font-sans">
              <ArrowDownCircle size={12} /> Salidas
            </p>
            <p className="text-xl font-bold">${formatNum(monthStats.expense)}</p>
          </div>
        </div>
      </div>

      {/* Detalle de Saldos por Cuenta */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 font-sans">
          Detalle de Cuentas
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {activeAccounts.length > 0 ? activeAccounts.map(acc => (
            <div key={acc.id} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <div className="bg-slate-50 p-2 rounded-lg">
                  {CATEGORY_ICONS[acc.category]}
                </div>
                <span className="text-[8px] font-black text-slate-300 uppercase">{acc.owner}</span>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase truncate mb-0.5">{acc.name}</p>
                <p className="text-sm font-black text-slate-800">${formatNum(acc.balance)}</p>
              </div>
            </div>
          )) : (
            <div className="col-span-2 py-8 text-center bg-white rounded-3xl border border-dashed border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sin saldos positivos</p>
            </div>
          )}
        </div>
      </div>

      {/* Balance de Pareja / Deudas */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex justify-between items-center transition-all">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-100">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-tight font-sans">Balance de Pareja</p>
            <p className="text-sm font-black text-slate-800">{debtInfo.text}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-indigo-600 tracking-tighter">${formatNum(debtInfo.amount)}</p>
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
              className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg mt-1 uppercase"
            >
              Saldar ahora
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
