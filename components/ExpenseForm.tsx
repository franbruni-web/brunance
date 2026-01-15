
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Send, Banknote, Wallet, CreditCard, Landmark, Calculator, AlertTriangle, Layers, ArrowRight, ArrowDown, ChevronLeft, CheckCircle2, User, Users, Plus, Minus, X, Divide } from 'lucide-react';
import { Payer, ExpenseType, PaymentCategory, TransactionNature, Currency, Transaction, PaymentMethod } from '../types';
import { PAYMENT_METHODS } from '../constants';
import { format } from 'date-fns';

interface TransactionFormProps {
  onAdd: (transaction: any) => void;
  prefill?: Partial<any>;
  allTransactions: Transaction[];
  onCancelPrefill?: () => void;
}

type MainCategory = 'Efectivo' | 'Tarjeta' | 'Billetera' | 'Bancos';

// Helper para formato de moneda consistente (Punto para miles, Coma para decimales)
const formatNum = (num: number) => {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

interface AccountCardProps {
  method: PaymentMethod;
  isSelected: boolean;
  balance: number;
  onClick: () => void;
  isInsufficient?: boolean;
}

const AccountCard: React.FC<AccountCardProps> = ({ method, isSelected, balance, onClick, isInsufficient }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
      isSelected 
        ? 'border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-100' 
        : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'
    } ${isInsufficient ? 'opacity-70 border-red-200' : ''}`}
  >
    <div className="flex justify-between items-start">
      <div>
        <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
          {method.category}
        </p>
        <h4 className={`text-sm font-black ${isSelected ? 'text-indigo-950' : 'text-slate-700'}`}>{method.name}</h4>
      </div>
      {isSelected && <CheckCircle2 size={16} className="text-indigo-600" />}
    </div>
    <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center">
      <span className="text-[10px] font-bold text-slate-400 uppercase">Saldo Actual</span>
      <span className={`text-sm font-black ${isInsufficient ? 'text-red-500' : isSelected ? 'text-indigo-600' : 'text-slate-900'}`}>
        ${formatNum(balance)}
      </span>
    </div>
  </button>
);

const TransactionForm: React.FC<TransactionFormProps> = ({ onAdd, prefill, allTransactions, onCancelPrefill }) => {
  const [nature, setNature] = useState<TransactionNature>(prefill?.nature || 'Gasto');
  const [amount, setAmount] = useState(prefill?.amount?.toString() || '');
  const [currency, setCurrency] = useState<Currency>(prefill?.currency || 'ARS');
  const [description, setDescription] = useState(prefill?.description || '');
  const [payer, setPayer] = useState<Payer>(prefill?.payer || 'Fran');
  const [type, setType] = useState<ExpenseType>(prefill?.type || 'Familiar');
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [installments, setInstallments] = useState<number>(1);
  
  const [selectedMainCat, setSelectedMainCat] = useState<MainCategory>('Efectivo');
  const [paymentMethodId, setPaymentMethodId] = useState(prefill?.paymentMethodId || PAYMENT_METHODS[0].id);
  const [toPaymentMethodId, setToPaymentMethodId] = useState(prefill?.toPaymentMethodId || PAYMENT_METHODS[1].id);

  const amountInputRef = useRef<HTMLInputElement>(null);
  const isSettlement = prefill?.isSettlement || false;

  // Evaluador que soporta coma como decimal
  const evaluatedAmount = useMemo(() => {
    if (!amount) return 0;
    try {
      // Reemplazamos coma por punto para que JavaScript pueda evaluarlo
      const sanitized = amount.replace(/,/g, '.').replace(/[^-+*/().0-9]/g, '');
      const result = new Function(`return ${sanitized}`)();
      return typeof result === 'number' && isFinite(result) ? Math.max(0, result) : 0;
    } catch (e) {
      return 0;
    }
  }, [amount]);

  // Detectar si hay una operación matemática en curso
  const isCalculating = useMemo(() => {
    return /[-+*/()]/.test(amount);
  }, [amount]);

  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    allTransactions.filter(t => t.currency === currency).forEach(t => {
      if (t.nature === 'Transferencia') {
        balances[t.paymentMethodId] = (balances[t.paymentMethodId] || 0) - t.amount;
        if (t.toPaymentMethodId) {
          balances[t.toPaymentMethodId] = (balances[t.toPaymentMethodId] || 0) + t.amount;
        }
      } else {
        const val = t.nature === 'Ingreso' ? t.amount : -t.amount;
        balances[t.paymentMethodId] = (balances[t.paymentMethodId] || 0) + val;
      }
    });
    return balances;
  }, [allTransactions, currency]);

  const originMethods = useMemo(() => {
    const liquid = PAYMENT_METHODS.filter(m => 
      m.category !== PaymentCategory.TARJETA_CREDITO && m.id !== 'ripio-car'
    );
    return liquid.filter(m => m.owner === payer);
  }, [payer]);

  const destinationMethods = useMemo(() => {
    const liquid = PAYMENT_METHODS.filter(m => 
      m.category !== PaymentCategory.TARJETA_CREDITO && m.id !== 'ripio-car'
    );
    if (isSettlement) {
      const creditor = payer === 'Fran' ? 'Car' : 'Fran';
      return liquid.filter(m => m.owner === creditor);
    }
    return liquid.filter(m => m.owner === payer && m.id !== paymentMethodId);
  }, [isSettlement, payer, paymentMethodId]);

  const selectedMethod = useMemo(() => 
    PAYMENT_METHODS.find(m => m.id === paymentMethodId), 
  [paymentMethodId]);

  const isInsufficientFunds = useMemo(() => {
    if (nature === 'Ingreso') return false;
    if (selectedMethod?.category === PaymentCategory.TARJETA_CREDITO) return false;
    const balance = accountBalances[paymentMethodId] || 0;
    return evaluatedAmount > balance;
  }, [nature, selectedMethod, evaluatedAmount, accountBalances, paymentMethodId]);

  const canSubmit = useMemo(() => {
    if (isInsufficientFunds) return false;
    if (evaluatedAmount <= 0) return false;
    if (nature === 'Transferencia' && (!paymentMethodId || !toPaymentMethodId)) return false;
    return true;
  }, [isInsufficientFunds, evaluatedAmount, nature, paymentMethodId, toPaymentMethodId]);

  useEffect(() => {
    if (prefill) {
      if (prefill.nature) setNature(prefill.nature);
      if (prefill.amount) setAmount(prefill.amount.toString());
      if (prefill.currency) setCurrency(prefill.currency);
      if (prefill.description) setDescription(prefill.description);
      if (prefill.payer) setPayer(prefill.payer);
    }
  }, [prefill]);

  useEffect(() => {
    if (nature === 'Transferencia' || isSettlement) {
      if (originMethods.length > 0 && !originMethods.some(m => m.id === paymentMethodId)) {
        setPaymentMethodId(originMethods[0].id);
      }
      if (destinationMethods.length > 0 && !destinationMethods.some(m => m.id === toPaymentMethodId)) {
        setToPaymentMethodId(destinationMethods[0].id);
      }
    }
  }, [nature, payer, isSettlement, originMethods, destinationMethods]);

  const filteredMethods = useMemo(() => {
    return PAYMENT_METHODS.filter(m => {
        const isAllowedByPayer = m.allowedPayers.includes(payer);
        if (!isAllowedByPayer) return false;
        if (nature === 'Ingreso' && m.category === PaymentCategory.TARJETA_CREDITO) return false;

        switch (selectedMainCat) {
          case 'Efectivo': return m.category === PaymentCategory.EFECTIVO || m.category === PaymentCategory.EMPRESA;
          case 'Tarjeta': return m.category === PaymentCategory.TARJETA_CREDITO;
          case 'Billetera': return m.category === PaymentCategory.BILLETERA_DIGITAL;
          case 'Bancos': return m.category === PaymentCategory.TARJETA_DEBITO;
          default: return false;
        }
    });
  }, [selectedMainCat, payer, nature]);

  const handleOperatorClick = (op: string) => {
    setAmount(prev => prev + op);
    if (amountInputRef.current) {
      amountInputRef.current.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    onAdd({
      amount: evaluatedAmount,
      currency,
      description: description.trim() || (isSettlement ? 'Liquidación Mensual' : (nature === 'Transferencia' ? 'Transferencia interna' : 'Gasto sin detalle')),
      payer,
      // Si es ingreso, corresponde automáticamente al que ingresa. Si es transferencia, a Familiar.
      type: nature === 'Gasto' ? type : (nature === 'Transferencia' ? 'Familiar' : (payer as ExpenseType)),
      nature,
      paymentMethodId,
      toPaymentMethodId: nature === 'Transferencia' ? toPaymentMethodId : undefined,
      date: new Date(date).toISOString(),
      id: crypto.randomUUID(),
      synced: false,
      isSettlement,
      installments: selectedMethod?.category === PaymentCategory.TARJETA_CREDITO ? installments : 1
    });

    setAmount('');
    setDescription('');
    setInstallments(1);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-20 p-4 overflow-y-auto h-full no-scrollbar relative">
      {/* Botón Volver (solo en Settle Up) */}
      {isSettlement && (
        <button 
          type="button"
          onClick={onCancelPrefill}
          className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-widest bg-white px-3 py-2 rounded-xl mb-2 hover:bg-slate-50 transition-colors w-fit border border-slate-100"
        >
          <ChevronLeft size={14} />
          Volver
        </button>
      )}

      {/* Selector de Naturaleza */}
      <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner">
        {['Gasto', 'Ingreso', 'Transferencia'].map((n) => (
          <button
            key={n}
            type="button"
            disabled={isSettlement && n !== 'Transferencia'}
            onClick={() => setNature(n as TransactionNature)}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
              nature === n ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'
            } ${isSettlement && n !== 'Transferencia' ? 'opacity-30' : ''}`}
          >
            {n === 'Transferencia' ? (isSettlement ? 'Liquidación' : 'Transferencia') : n}
          </button>
        ))}
      </div>

      {/* Monto y Moneda */}
      <div className="grid grid-cols-4 gap-3">
        <div className="col-span-3 relative">
          <div className="flex justify-between items-end mb-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block flex items-center gap-1">
              <Calculator size={12} /> Monto {isSettlement ? "a Liquidar" : ""}
            </label>
            
            {/* Botones de Operadores Matemáticos */}
            <div className="flex gap-1">
              {['+', '-', '*', '/', '(', ')'].map(op => (
                <button
                  key={op}
                  type="button"
                  onClick={() => handleOperatorClick(op)}
                  className="w-7 h-7 flex items-center justify-center bg-slate-100 text-slate-600 rounded-lg text-xs font-black active:bg-indigo-600 active:text-white transition-colors border border-slate-200 shadow-sm"
                >
                  {op === '*' ? '×' : op === '/' ? '÷' : op}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black ${isInsufficientFunds ? 'text-red-400' : 'text-slate-300'}`}>$</span>
            <input
              ref={amountInputRef}
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className={`w-full bg-white border-none rounded-2xl py-6 pl-10 pr-4 text-2xl font-black focus:ring-2 shadow-sm ${isInsufficientFunds ? 'text-red-600 focus:ring-red-500 bg-red-50' : 'text-slate-800 focus:ring-indigo-500'}`}
              required
            />
          </div>
          
          {/* Visualización del Resultado Parcial */}
          {isCalculating && evaluatedAmount > 0 && (
            <div className="mt-2 ml-1 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resultado:</span>
              <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 shadow-sm">
                ${formatNum(evaluatedAmount)}
              </span>
            </div>
          )}
        </div>

        <div className="col-span-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Moneda</label>
          <div className="flex flex-col h-[76px] bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {['ARS', 'USD'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c as Currency)}
                className={`flex-1 text-[10px] font-black transition-all ${currency === c ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Concepto */}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Concepto (Opcional)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={isSettlement ? "Saldar deuda mensual" : "¿En qué se usó el dinero?"}
          className="w-full bg-white border-none rounded-xl py-4 px-4 text-lg shadow-sm focus:ring-2 focus:ring-indigo-500 font-medium"
        />
      </div>

      {/* Selectores de Payer y Type */}
      <div className={nature === 'Gasto' ? "grid grid-cols-2 gap-4" : "block"}>
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">
            {isSettlement ? 'Deudor' : nature === 'Ingreso' ? '¿Quién Ingresa?' : nature === 'Transferencia' ? '¿Quién Transfiere?' : '¿Quién Paga?'}
          </label>
          <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-100">
            {['Fran', 'Car'].map((p) => (
              <button
                key={p}
                type="button"
                disabled={isSettlement && payer !== p}
                onClick={() => setPayer(p as Payer)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${payer === p ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'} ${isSettlement && payer !== p ? 'opacity-30' : ''}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        
        {nature === 'Gasto' && (
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Corresponde a</label>
            <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-100">
              {['Fran', 'Car', 'Familiar'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t as ExpenseType)}
                  className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${type === t ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cuotas si es TC */}
      {nature === 'Gasto' && selectedMethod?.category === PaymentCategory.TARJETA_CREDITO && (
        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
          <label className="text-xs font-bold text-indigo-900 uppercase tracking-widest mb-2 block flex items-center gap-1">
            <Layers size={14} /> Plan de Cuotas
          </label>
          <select 
            value={installments} 
            onChange={(e) => setInstallments(Number(e.target.value))}
            className="w-full bg-white border-none rounded-xl py-3 px-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-indigo-500"
          >
            {[1, 2, 3, 6, 9, 12, 18, 24].map(n => <option key={n} value={n}>{n === 1 ? 'Sin cuotas' : `${n} Cuotas`}</option>)}
          </select>
        </div>
      )}

      {/* Medios de Pago o Flujo de Transferencia */}
      {nature !== 'Transferencia' ? (
        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Medio de {nature === 'Ingreso' ? 'Ingreso' : 'Pago'}</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'Efectivo', icon: <Banknote size={20} />, label: 'Efvo' },
              { id: 'Tarjeta', icon: <CreditCard size={20} />, label: 'TC' },
              { id: 'Billetera', icon: <Wallet size={20} />, label: 'Bill' },
              { id: 'Bancos', icon: <Landmark size={20} />, label: 'Bancos' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedMainCat(cat.id as MainCategory)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all border-2 ${selectedMainCat === cat.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-transparent shadow-sm'}`}
              >
                {cat.icon}
                <span className="text-[10px] font-black mt-1 uppercase">{cat.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
            {filteredMethods.map((m) => {
              const bal = accountBalances[m.id] || 0;
              const isSelected = paymentMethodId === m.id;
              const insufficient = nature !== 'Ingreso' && m.category !== PaymentCategory.TARJETA_CREDITO && evaluatedAmount > bal;
              
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethodId(m.id)}
                  className={`w-full flex justify-between items-center p-4 rounded-xl border-2 transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-transparent bg-white'} ${insufficient ? 'opacity-50' : ''}`}
                >
                  <span className={`text-sm font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-600'}`}>{m.name}</span>
                  <span className={`text-xs font-black ${insufficient ? 'text-red-500' : 'text-slate-400'}`}>
                    ${formatNum(bal)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
           <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-2">
                <ArrowDown size={14} /> Selecciona Origen ({payer})
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {originMethods.map(m => (
                  <AccountCard 
                    key={m.id} 
                    method={m} 
                    balance={accountBalances[m.id] || 0} 
                    isSelected={paymentMethodId === m.id} 
                    onClick={() => setPaymentMethodId(m.id)}
                    isInsufficient={evaluatedAmount > (accountBalances[m.id] || 0)}
                  />
                ))}
              </div>
           </div>

           <div className="flex justify-center -my-3 relative z-10">
              <div className="bg-indigo-600 text-white p-3 rounded-full shadow-xl border-4 border-slate-50">
                <ArrowDown size={20} />
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-teal-400 tracking-widest flex items-center gap-2">
                <CheckCircle2 size={14} /> Selecciona Destino ({isSettlement ? (payer === 'Fran' ? 'Car' : 'Fran') : payer})
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {destinationMethods.map(m => (
                  <AccountCard 
                    key={m.id} 
                    method={m} 
                    balance={accountBalances[m.id] || 0} 
                    isSelected={toPaymentMethodId === m.id} 
                    onClick={() => setToPaymentMethodId(m.id)}
                  />
                ))}
              </div>
           </div>

           {isInsufficientFunds && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 animate-pulse">
              <AlertTriangle size={20} className="shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-tight leading-tight">
                No hay saldo suficiente en la cuenta de origen elegida.
              </p>
            </div>
           )}
        </div>
      )}

      {/* Acciones de Guardado */}
      <div className="space-y-3 pt-4">
        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full py-5 rounded-2xl font-black text-white shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 ${canSubmit ? 'bg-slate-900 hover:bg-black' : 'bg-slate-200 cursor-not-allowed'}`}
        >
          <Send size={24} />
          {isInsufficientFunds ? 'Saldo Insuficiente' : (isSettlement ? 'Confirmar Liquidación' : `Guardar ${nature}`)}
        </button>

        {isSettlement && (
          <button 
            type="button"
            onClick={onCancelPrefill}
            className="w-full py-3 text-slate-400 font-bold text-xs uppercase tracking-[0.2em] hover:text-red-500 transition-colors"
          >
            Cancelar y Volver
          </button>
        )}
      </div>
    </form>
  );
};

export default TransactionForm;
