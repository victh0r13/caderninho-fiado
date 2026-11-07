// Todos os valores em dinheiro são guardados em CENTAVOS (inteiros) para evitar erros de arredondamento.

export type PaymentMethod = "dinheiro" | "pix" | "cartao" | "desconto" | "outro";

export interface Student {
  id: string;
  name: string;
  grade: string; // turma / série
  guardianName: string; // responsável
  phone: string; // WhatsApp do responsável
  creditLimit: number | null; // centavos; null = usa o limite padrão
  notes: string;
  blocked: boolean; // não pode mais pegar fiado
  archived: boolean; // saiu da escola / não aparece nas listas
  createdAt: string;
  lastChargedAt: string | null;
}

export interface Product {
  id: string;
  name: string;
  price: number; // centavos
  emoji: string;
  category: string;
  active: boolean;
}

export interface TxItem {
  productId: string | null;
  name: string;
  unitPrice: number; // centavos
  qty: number;
}

export interface Transaction {
  id: string;
  studentId: string;
  type: "compra" | "pagamento";
  amount: number; // centavos, sempre positivo
  items: TxItem[];
  note: string;
  method?: PaymentMethod;
  createdAt: string;
}

export interface ChargeLog {
  id: string;
  studentId: string;
  amount: number;
  channel: "whatsapp" | "pessoalmente" | "outro";
  createdAt: string;
}

export interface Settings {
  shopName: string;
  ownerName: string;
  pixKey: string;
  pixName: string;
  pixCity: string;
  defaultCreditLimit: number; // centavos; 0 = sem limite
  overdueDays: number; // a partir de quantos dias a dívida é "atrasada"
  messageTemplate: string;
  includeItemsInMessage: boolean;
}

export interface Database {
  version: 1;
  students: Student[];
  products: Product[];
  transactions: Transaction[];
  charges: ChargeLog[];
  settings: Settings;
}

export type StudentStatus = "em_dia" | "credito" | "devendo" | "atrasado";

export interface OpenPurchase {
  tx: Transaction;
  remaining: number;
}

export interface StudentSummary {
  student: Student;
  balance: number; // > 0 deve, < 0 tem crédito
  totalBought: number;
  totalPaid: number;
  oldestOpenDate: string | null;
  daysOpen: number;
  lastPurchaseAt: string | null;
  lastPaymentAt: string | null;
  limit: number; // 0 = sem limite
  overLimit: boolean;
  status: StudentStatus;
  openPurchases: OpenPurchase[];
}

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao: "Cartão",
  desconto: "Desconto / perdão",
  outro: "Outro",
};
