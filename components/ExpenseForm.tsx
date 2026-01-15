
import React, { useState, useMemo, useEffect } from 'react';
import { Send, Banknote, Wallet, CreditCard, ArrowLeftRight, Landmark, Calendar, ArrowRight, User, AlertCircle } from 'lucide-react';
import { Payer, ExpenseType, PaymentMethod, PaymentCategory, TransactionNature, Currency, Transaction } from '../types';
import { PAYMENT_METHODS } from '../constants';
import { format } from 'date-fns';

interface TransactionFormProps {
  onAdd: (transaction: any) => void;
  prefill?: Partial<any>;
  allTransactions: Transaction[];
}

type MainCategory = 'Efectivo' | 'Tarjeta' | 'Billetera' | 'Transferencia';

const TransactionForm: React.FC<TransactionFormProps> = ({ onAdd, prefill, allTransactions }) => {
  const [nature, setNature] = useState<TransactionNature>(prefill?.nature || 'Gasto');
  const [amount, setAmount] = useState(prefill?.amount?.toString() || '');
  const [currency, setCurrency] = useState<Currency>(prefill?.currency || 'ARS');
  const [description, setDescription] = useState(prefill?.description || '');
  const [payer, setPayer] = useState<Payer>(prefill?.payer || 'Fran');
  const [type, setType] = useState<ExpenseType>(prefill?.type || 'Familiar');
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  
  const [selectedMainCat, setSelectedMainCat] = useState<MainCategory>('Efectivo');
  const [paymentMethodId, setPaymentMethodId] = useState(prefill?.paymentMethodId || PAYMENT_METHODS[0].id);
  const [toPaymentMethodId, setToPaymentMethodId] = useState(prefill?.toPaymentMethodId || PAYMENT_METHODS[1].id);

  const isSettlement = prefill?.isSettlement || false;

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

  useEffect(() => {
    if (prefill) {
      if (prefill.nature) setNature(prefill.nature);
      if (prefill.amount) setAmount(prefill.amount.toString());
      if (prefill.currency) setCurrency(prefill.currency);
      if (prefill.description) setDescription(prefill.description);
      if (prefill.payer) setPayer(prefill.payer);
      if (prefill.paymentMethodId) setPaymentMethodId(prefill.paymentMethodId);
      if (prefill.toPaymentMethodId) setToPaymentMethodId(prefill.toPaymentMethodId);
    }
  }, [prefill]);

  useEffect(() => {
    if (nature === 'Ingreso') {
      const method = PAYMENT_METHODS.find(m => m.id === paymentMethodId);
      if (method && method.owner && method.owner !== 'Both') {
        setType(method.owner as ExpenseType);
        setPayer(method.owner as Payer);
      }
    }
  }, [nature, paymentMethodId]);

  const filteredMethods = useMemo(() => {
    return PAYMENT_METHODS.filter(m => {
        const isAllowedByPayer = m.allowedPayers.includes(payer);
        if (!isAllowedByPayer) return false;
        if (nature === 'Ingreso' && m.category === PaymentCategory.TARJETA_CREDITO) return false;

        switch (selectedMainCat) {
          case 'Efectivo':
            return m.category === PaymentCategory.EFECTIVO || m.category === PaymentCategory.EMPRESA;
          case 'Tarjeta':
            return m.category === PaymentCategory.TARJETA_CREDITO;
          case 'Billetera':
            return m.category === PaymentCategory.BILLETERA_DIGITAL;
          case 'Transferencia':
            return m.category === PaymentCategory.TARJETA_DEBITO;
          default:
            return false;
        }
    });
  }, [selectedMainCat, payer, nature]);

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

  useEffect(() => {
    if (nature === 'Transferencia') {
        if (!originMethods.some(m => m.id === paymentMethodId) && originMethods.length > 0) {
            setPaymentMethodId(originMethods[0].id);
        }
        if (!destinationMethods.some(m => m.id === toPaymentMethodId) && destinationMethods.length > 0) {
            setToPaymentMethodId(destinationMethods[0].id);
        }
    }
  }, [nature, originMethods, destinationMethods, paymentMethodId, toPaymentMethodId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || (nature !== 'Transferencia' && !description)) return;

    const selectedMethod = PAYMENT_METHODS.find(m => m.id === paymentMethodId);

    if (nature !== 'Ingreso') {
      if (selectedMethod && selectedMethod.category !== PaymentCategory.TARJETA_CREDITO) {
        const bal = accountBalances[paymentMethodId] || 0;
        if (bal < numAmount) {
          alert(`Saldo insuficiente en ${selectedMethod.name}. Disponible: $${bal}`);
          return;
        }
      }
    }

    const origin = PAYMENT_METHODS.find(m => m.id === paymentMethodId);
    const dest = PAYMENT_METHODS.find(m => m.id === toPaymentMethodId);
    
    const finalDescription = nature === 'Transferencia' 
      ? (description || `Pase de ${origin?.name} a ${dest?.name}`)
      : description;

    let finalType = type;
    if (nature === 'Ingreso' && selectedMethod?.owner && selectedMethod.owner !== 'Both') {
        finalType = selectedMethod.owner as ExpenseType;
    }

    onAdd({
      amount: numAmount,
      currency,
      description: finalDescription,
      payer,
      type: isSettlement ? 'Familiar' : (nature === 'Ingreso' ? finalType : type),
      nature,
      paymentMethodId,
      toPaymentMethodId: nature === 'Transferencia' ? toPaymentMethodId : undefined,
      date: new Date(date).toISOString(),
      id: crypto.randomUUID(),
      synced: false,
      isSettlement
    });

    setAmount('');
    setDescription('');
    setDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-20 p-4 overflow-y-auto h-full no-scrollbar">
      {/* Selector de Naturaleza */}
      <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner">
        {[
          { id: 'Gasto', label: 'Gasto' },
          { id: 'Ingreso', label: 'Ingreso' },
          { id: 'Transferencia', label: isSettlement ? 'Liquidar' : 'Pasar' }
        ].map((n) => (
          <button
            key={n.id}
            type="button"
            disabled={isSettlement && n.id !== 'Transferencia'}
            onClick={() => setNature(n.id as TransactionNature)}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
              nature === n.id 
                ? (n.id === 'Ingreso' ? 'bg-green-600 text-white' : n.id === 'Transferencia' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white') 
                : 'text-slate-500 hover:text-slate-700'
            } ${isSettlement && n.id !== 'Transferencia' ? 'opacity-30' : ''}`}
          >
            {n.label}
          </button>
        ))}
      </div>

      {/* Monto y Moneda */}
      <div className="grid grid-cols-4 gap-3">
        <div className="col-span-3 relative">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Monto</label>
          <div className="relative flex items-center">
              <span className={`absolute left-4 text-2xl font-bold ${
                nature === 'Ingreso' ? 'text-green-500' : nature === 'Transferencia' ? 'text-indigo-500' : 'text-slate-400'
              }`}>$</span>
              <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white border-none rounded-2xl py-6 pl-10 pr-4 text-3xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 shadow-sm"
                  required
              />
          </div>
        </div>
        <div className="col-span-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Moneda</label>
          <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {(['ARS', 'USD'] as Currency[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`flex-1 text-[10px] font-black transition-all ${
                  currency === c ? 'bg-teal-600 text-white' : 'text-slate-400'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fecha */}
      <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Fecha y Hora</label>
          <div className="relative">
              <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border-none rounded-xl py-4 px-4 text-sm shadow-sm focus:ring-2 focus:ring-teal-500"
                  required
              />
              <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
      </div>

      {nature !== 'Transferencia' ? (
        <>
          {/* Detalle */}
          <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Detalle</label>
              <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={nature === 'Gasto' ? "¿En qué gastaste?" : "¿De dónde viene el dinero?"}
                  className="w-full bg-white border-none rounded-xl py-4 px-4 text-lg shadow-sm focus:ring-2 focus:ring-teal-500"
                  required
              />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                {nature === 'Gasto' ? 'Pagó' : 'Recibe'}
              </label>
              <div className="flex bg-white rounded-xl p-1 shadow-sm">
                {(['Fran', 'Car'] as Payer[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPayer(p)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      payer === p ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {nature !== 'Ingreso' && (
                <div className="col-span-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Beneficio</label>
                <div className="flex bg-white rounded-xl p-1 shadow-sm">
                    {(['Fran', 'Car', 'Familiar'] as ExpenseType[]).map((t) => (
                        <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            type === t ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400'
                        }`}
                        >
                        {t}
                        </button>
                    ))}
                </div>
                </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Medio de Pago</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'Efectivo', icon: <Banknote size={20} />, label: 'Efvo' },
                  { id: 'Tarjeta', icon: <CreditCard size={20} />, label: 'TC', hideOnIncome: true },
                  { id: 'Billetera', icon: <Wallet size={20} />, label: 'Bill' },
                  { id: 'Transferencia', icon: <ArrowLeftRight size={20} />, label: 'Pase' }
                ].map((cat) => {
                  if (nature === 'Ingreso' && cat.hideOnIncome) return null;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedMainCat(cat.id as MainCategory)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all border-2 ${
                        selectedMainCat === cat.id 
                          ? 'bg-teal-600 text-white border-teal-600 shadow-md' 
                          : 'bg-white text-slate-500 border-transparent shadow-sm'
                      }`}
                    >
                      {cat.icon}
                      <span className="text-[10px] font-bold mt-1 uppercase">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto no-scrollbar pb-4">
              {filteredMethods.map((method) => {
                const bal = accountBalances[method.id] || 0;
                const isLiquid = method.category !== PaymentCategory.TARJETA_CREDITO;
                const currentAmount = parseFloat(amount) || 0;
                const hasFunds = !isLiquid || nature === 'Ingreso' || (bal > 0 && bal >= currentAmount);

                return (
                  <button
                    key={method.id}
                    type="button"
                    disabled={!hasFunds}
                    onClick={() => setPaymentMethodId(method.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                        paymentMethodId === method.id 
                        ? 'border-teal-500 bg-teal-50 text-teal-900 shadow-sm' 
                        : hasFunds ? 'border-transparent bg-white text-slate-700 active:scale-[0.98]' : 'opacity-40 bg-slate-100 border-transparent grayscale cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-200/50">
                            {method.category === PaymentCategory.TARJETA_CREDITO ? <CreditCard size={18} /> : 
                            method.category === PaymentCategory.TARJETA_DEBITO ? <Landmark size={18} /> :
                            method.category === PaymentCategory.EFECTIVO ? <Banknote size={18} /> : <Wallet size={18} />}
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-semibold">{method.name}</div>
                          <div className={`text-[10px] font-bold ${bal <= 0 && isLiquid ? 'text-red-500' : 'text-slate-400'}`}>
                            {isLiquid ? `Saldo: $${bal.toLocaleString()}` : 'TC (Crédito Libre)'}
                          </div>
                        </div>
                    </div>
                    {!hasFunds && isLiquid && <AlertCircle size={16} className="text-red-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-indigo-50 p-4 rounded-3xl border border-indigo-100 space-y-4">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm mb-2">
                <User size={16} /> {isSettlement ? `Liquidando: ${payer} salda deuda` : 'Pase entre cuentas'}
              </div>

              <div>
                <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter block mb-1">Cuenta Origen ({payer})</label>
                <select 
                  value={paymentMethodId} 
                  onChange={(e) => setPaymentMethodId(e.target.value)}
                  className="w-full bg-white border-none rounded-xl text-sm font-bold p-3 shadow-sm focus:ring-2 focus:ring-indigo-500"
                >
                  {originMethods.map(m => {
                    const bal = accountBalances[m.id] || 0;
                    const canSend = bal > 0 && bal >= (parseFloat(amount) || 0);
                    return (
                      <option key={m.id} value={m.id} disabled={!canSend}>
                        {m.name} {canSend ? `(Saldo: $${bal})` : `(Bloqueado: $${bal})`}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex justify-center -my-2">
                <div className="bg-white p-2 rounded-full shadow-sm">
                  <ArrowRight className="text-indigo-400 rotate-90" size={16} />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter block mb-1">
                    Cuenta Destino ({isSettlement ? (payer === 'Fran' ? 'Car' : 'Fran') : payer})
                </label>
                <select 
                  value={toPaymentMethodId} 
                  onChange={(e) => setToPaymentMethodId(e.target.value)}
                  className="w-full bg-white border-none rounded-xl text-sm font-bold p-3 shadow-sm focus:ring-2 focus:ring-indigo-500"
                >
                  {destinationMethods.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
          </div>

          {!isSettlement && (
            <div className="bg-white rounded-2xl p-4">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block text-center">Titular del movimiento</label>
                <div className="flex bg-slate-100 rounded-xl p-1 shadow-inner">
                    {(['Fran', 'Car'] as Payer[]).map((p) => (
                    <button
                        key={p}
                        type="button"
                        onClick={() => setPayer(p)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        payer === p ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600'
                        }`}
                    >
                        {p}
                    </button>
                    ))}
                </div>
            </div>
          )}
          
          <div className="bg-white p-4 rounded-2xl">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Concepto</label>
            <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Saldo de cuentas mes"
                className="w-full border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        className={`w-full text-white font-bold py-5 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 ${
            nature === 'Ingreso' ? 'bg-green-600 hover:bg-green-700' : 
            nature === 'Transferencia' ? 'bg-indigo-600 hover:bg-indigo-700' :
            'bg-slate-800 hover:bg-slate-900'
        }`}
      >
        <Send size={24} />
        {isSettlement ? 'Confirmar Liquidación' : `Guardar ${nature}`}
      </button>
    </form>
  );
};

export default TransactionForm;
