
import React, { useMemo, useState } from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend 
} from 'recharts';
import { Transaction, Payer, Currency } from '../types';
import { PAYMENT_METHODS } from '../constants';
import { Wallet, TrendingUp, Users, ArrowUpCircle, ArrowDownCircle, CheckCircle } from 'lucide-react';
// Added missing imports for date formatting
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardProps {
  transactions: Transaction[]; // Transacciones del mes filtrado
  allTransactions: Transaction[]; // Todas las transacciones para saldos globales
  onSettle: (prefill: any) => void;
  selectedMonth: Date;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, allTransactions, onSettle, selectedMonth }) => {
  const [currencyView, setCurrencyView] = useState<Currency>('ARS');

  const filteredByCurrency = useMemo(() => 
    transactions.filter(t => t.currency === currencyView),
  [transactions, currencyView]);

  const incomes = filteredByCurrency.filter(t => t.nature === 'Ingreso');
  const expenses = filteredByCurrency.filter(t => t.nature === 'Gasto');

  const totalIncome = incomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  // Saldos globales por cuenta (Dinero Real Actual)
  const globalBalances = useMemo(() => {
    const data: Record<string, number> = {};
    allTransactions.filter(t => t.currency === currencyView).forEach(t => {
        if (t.nature === 'Transferencia') {
          const fromMethod = PAYMENT_METHODS.find(m => m.id === t.paymentMethodId);
          if (fromMethod) data[fromMethod.name] = (data[fromMethod.name] || 0) - t.amount;
          const toMethod = t.toPaymentMethodId ? PAYMENT_METHODS.find(m => m.id === t.toPaymentMethodId) : null;
          if (toMethod) data[toMethod.name] = (data[toMethod.name] || 0) + t.amount;
        } else {
          const method = PAYMENT_METHODS.find(m => m.id === t.paymentMethodId);
          if (!method) return;
          const value = t.nature === 'Ingreso' ? t.amount : -t.amount;
          data[method.name] = (data[method.name] || 0) + value;
        }
    });
    return Object.entries(data)
        .filter(([_, val]) => val !== 0)
        .map(([name, value]) => ({ name, value }));
  }, [allTransactions, currencyView]);

  // Lógica de Deuda Corregida (Incluye Liquidaciones)
  const debtInfo = useMemo(() => {
    const sharedExpenses = filteredByCurrency.filter(e => e.type === 'Familiar' && e.nature === 'Gasto');
    const settlements = filteredByCurrency.filter(e => e.nature === 'Transferencia' && e.isSettlement);

    // Lo que cada uno pagó por la familia en este mes
    const franPaidShared = sharedExpenses.filter(e => e.payer === 'Fran').reduce((a, b) => a + b.amount, 0);
    const carPaidShared = sharedExpenses.filter(e => e.payer === 'Car').reduce((a, b) => a + b.amount, 0);

    // Transferencias de liquidación ya realizadas este mes
    const franSettledToCar = settlements.filter(s => s.payer === 'Fran').reduce((a, b) => a + b.amount, 0);
    const carSettledToFran = settlements.filter(s => s.payer === 'Car').reduce((a, b) => a + b.amount, 0);

    const totalShared = franPaidShared + carPaidShared;
    const targetPerPerson = totalShared / 2;

    // Balance neto: (Lo que pagué + lo que liquidé al otro) - Lo que el otro liquidó a mi
    const netFran = (franPaidShared + franSettledToCar) - carSettledToFran;
    const netCar = (carPaidShared + carSettledToFran) - franSettledToCar;

    const diff = netFran - targetPerPerson; // Si es positivo, Fran pagó de más. Si negativo, debe.

    if (Math.abs(diff) < 1) return { from: null, to: null, amount: 0, text: 'Están a mano' };

    if (diff > 0) {
        return { 
          from: 'Car' as Payer, 
          to: 'Fran' as Payer, 
          amount: diff,
          text: `Car le debe a Fran` 
        };
    } else {
        return { 
          from: 'Fran' as Payer, 
          to: 'Car' as Payer, 
          amount: Math.abs(diff), 
          text: `Fran le debe a Car` 
        };
    }
  }, [filteredByCurrency]);

  const handleSettleClick = () => {
    if (debtInfo.amount <= 0) return;
    onSettle({
      nature: 'Transferencia',
      amount: Math.round(debtInfo.amount * 100) / 100,
      currency: currencyView,
      payer: debtInfo.from,
      description: `Liquidación mes ${format(selectedMonth, 'MMM', { locale: es })}`,
      isSettlement: true
    });
  };

  return (
    <div className="pb-24 p-4 space-y-6 overflow-y-auto h-full no-scrollbar">
      <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner w-fit mx-auto">
        {(['ARS', 'USD'] as Currency[]).map((c) => (
          <button
            key={c}
            onClick={() => setCurrencyView(c)}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
              currencyView === c ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex justify-between items-start mb-6">
            <div>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Saldo Disponible ({currencyView})</p>
                <h2 className="text-4xl font-extrabold">${balance.toLocaleString()}</h2>
            </div>
            <div className="bg-white/10 p-2 rounded-xl">
                <Wallet size={24} />
            </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3">
                <div className="flex items-center gap-1.5 text-green-400 mb-1">
                    <ArrowUpCircle size={14} />
                    <span className="text-[10px] font-bold uppercase">Ingresos</span>
                </div>
                <div className="text-lg font-bold">${totalIncome.toLocaleString()}</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3">
                <div className="flex items-center gap-1.5 text-red-400 mb-1">
                    <ArrowDownCircle size={14} />
                    <span className="text-[10px] font-bold uppercase">Gastos</span>
                </div>
                <div className="text-lg font-bold">${totalExpense.toLocaleString()}</div>
            </div>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-600 text-white p-2 rounded-lg">
                    <Users size={20} />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase">Resumen Familiar ({currencyView})</p>
                    <p className="text-sm font-bold text-indigo-900">{debtInfo.text}</p>
                </div>
            </div>
            <div className="text-xl font-black text-indigo-600">
                ${Math.round(debtInfo.amount).toLocaleString()}
            </div>
        </div>
        {debtInfo.amount > 0 && (
          <button 
            onClick={handleSettleClick}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg active:scale-95"
          >
            <CheckCircle size={18} />
            Saldar Cuentas Ahora
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-teal-600" />
            Cuentas ({currencyView})
        </h3>
        <div className="space-y-3">
            {globalBalances.map(item => (
                <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-sm font-semibold text-slate-600">{item.name}</span>
                    <span className={`font-bold ${item.value >= 0 ? 'text-slate-900' : 'text-red-500'}`}>
                        ${Math.round(item.value).toLocaleString()}
                    </span>
                </div>
            ))}
            {globalBalances.length === 0 && <p className="text-center text-xs text-slate-400 py-4">Sin saldos en {currencyView}.</p>}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
