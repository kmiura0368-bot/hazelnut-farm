export const CATEGORIES = {
  income: [
    { id: 'hazelnut_sales', label: '収穫物売上（ヘーゼルナッツ）' },
    { id: 'processed_sales', label: '加工品売上' },
    { id: 'subsidy', label: '補助金・助成金' },
    { id: 'contract_farming', label: '契約栽培収入' },
    { id: 'other_income', label: 'その他収入' },
  ],
  expense: [
    { id: 'seedling', label: '苗木・種苗費' },
    { id: 'fertilizer', label: '肥料費' },
    { id: 'pesticide', label: '農薬・除草剤費' },
    { id: 'tools', label: '農具・機械費' },
    { id: 'fuel', label: '燃料費' },
    { id: 'utility', label: '水道光熱費' },
    { id: 'labor', label: '労務費・雇用費' },
    { id: 'repair', label: '修繕費' },
    { id: 'depreciation', label: '減価償却費' },
    { id: 'rent', label: '土地賃借料' },
    { id: 'shipping', label: '荷造運賃' },
    { id: 'communication', label: '通信費' },
    { id: 'insurance', label: '農業共済・保険料' },
    { id: 'other_expense', label: 'その他経費' },
  ],
} as const;

export const ALL_CATS = [...CATEGORIES.income, ...CATEGORIES.expense];
export function catLabel(id: string): string {
  return ALL_CATS.find(c => c.id === id)?.label ?? id;
}
