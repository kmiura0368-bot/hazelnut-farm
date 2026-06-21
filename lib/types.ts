export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  date: string;
  category: string;
  amount: number;
  memo: string;
  is_sample: number;
  created_at: string;
}

export interface BSSnapshot {
  id: number;
  date: string;
  data: string; // JSON string of Record<string, number>
  created_at: string;
}
