
export type Payer = 'Fran' | 'Car';
export type ExpenseType = 'Fran' | 'Car' | 'Familiar';
export type TransactionNature = 'Gasto' | 'Ingreso' | 'Transferencia';
export type Currency = 'ARS' | 'USD';

export enum PaymentCategory {
  EFECTIVO = 'Efectivo',
  TARJETA_CREDITO = 'Tarjeta de Crédito',
  TARJETA_DEBITO = 'Tarjeta de Débito',
  BILLETERA_DIGITAL = 'Billetera Digital',
  EMPRESA = 'Empresa'
}

export interface PaymentMethod {
  id: string;
  name: string;
  category: PaymentCategory;
  allowedPayers: Payer[];
  bank?: string;
  owner?: Payer | 'Both';
}

export interface Transaction {
  id: string;
  amount: number;
  currency: Currency;
  description: string;
  date: string; // ISO String
  payer: Payer;
  type: ExpenseType; 
  nature: TransactionNature;
  paymentMethodId: string; 
  toPaymentMethodId?: string; 
  synced: boolean;
  isSettlement?: boolean; // Identifica transferencias para saldar deudas
}

export interface MonthlySummary {
  month: string;
  totalExpenses: number;
  totalIncomes: number;
  balance: number;
  byPayer: Record<Payer, { paid: number; earned: number }>;
}
