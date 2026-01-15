
import React from 'react';
import { CreditCard, Wallet, Banknote, Briefcase, Landmark } from 'lucide-react';
import { PaymentMethod, PaymentCategory } from './types';

export const PAYMENT_METHODS: PaymentMethod[] = [
  // CUENTAS DE FRAN
  { id: 'cash-fran', name: 'Efectivo Fran', category: PaymentCategory.EFECTIVO, allowedPayers: ['Fran'], owner: 'Fran' },
  { id: 'mp-fran', name: 'Dinero Mercado Pago Fran', category: PaymentCategory.BILLETERA_DIGITAL, allowedPayers: ['Fran'], owner: 'Fran' },
  { id: 'db-bna-fran', name: 'Cuenta BNA Fran', category: PaymentCategory.TARJETA_DEBITO, bank: 'BNA', allowedPayers: ['Fran'], owner: 'Fran' },
  { id: 'db-bapro-fran', name: 'Cuenta Bapro Fran', category: PaymentCategory.TARJETA_DEBITO, bank: 'Bapro', allowedPayers: ['Fran'], owner: 'Fran' },
  { id: 'db-macro-fran', name: 'Cuenta Macro Fran', category: PaymentCategory.TARJETA_DEBITO, bank: 'Macro', allowedPayers: ['Fran'], owner: 'Fran' },
  
  // TARJETAS DE CRÉDITO (TC) FRAN
  { id: 'tc-visa-macro-fran', name: 'Visa Macro Fran', category: PaymentCategory.TARJETA_CREDITO, bank: 'Macro', allowedPayers: ['Fran'], owner: 'Fran' },
  { id: 'tc-amex-macro-fran', name: 'Amex Macro Fran', category: PaymentCategory.TARJETA_CREDITO, bank: 'Macro', allowedPayers: ['Fran'], owner: 'Fran' },
  { id: 'tc-visa-bna-fran', name: 'Visa BNA Fran', category: PaymentCategory.TARJETA_CREDITO, bank: 'BNA', allowedPayers: ['Fran'], owner: 'Fran' },

  // CUENTAS DE CAR
  { id: 'cash-car', name: 'Efectivo Car', category: PaymentCategory.EFECTIVO, allowedPayers: ['Car'], owner: 'Car' },
  { id: 'ripio-car', name: 'Ripiocard Car', category: PaymentCategory.BILLETERA_DIGITAL, allowedPayers: ['Car'], owner: 'Car' },
  { id: 'mp-car', name: 'Dinero Mercado Pago Car', category: PaymentCategory.BILLETERA_DIGITAL, allowedPayers: ['Car'], owner: 'Car' },
  { id: 'db-macro-car', name: 'Cuenta Macro Car', category: PaymentCategory.TARJETA_DEBITO, bank: 'Macro', allowedPayers: ['Car'], owner: 'Car' },
  
  // TARJETAS DE CRÉDITO (TC) CAR
  { id: 'tc-visa-macro-car', name: 'Visa Macro Car', category: PaymentCategory.TARJETA_CREDITO, bank: 'Macro', allowedPayers: ['Car'], owner: 'Car' },
  { id: 'tc-visa-bna-car', name: 'Visa BNA Car', category: PaymentCategory.TARJETA_CREDITO, bank: 'BNA', allowedPayers: ['Car'], owner: 'Car' },
];

export const CATEGORY_ICONS: Record<PaymentCategory, React.ReactNode> = {
  [PaymentCategory.EFECTIVO]: <Banknote size={20} className="text-green-600" />,
  [PaymentCategory.TARJETA_CREDITO]: <CreditCard size={20} className="text-blue-600" />,
  [PaymentCategory.TARJETA_DEBITO]: <Landmark size={20} className="text-indigo-600" />,
  [PaymentCategory.BILLETERA_DIGITAL]: <Wallet size={20} className="text-purple-600" />,
  [PaymentCategory.EMPRESA]: <Briefcase size={20} className="text-orange-600" />,
};
