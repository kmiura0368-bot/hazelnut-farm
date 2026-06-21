'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import TransactionForm from '@/components/accounting/TransactionForm';
import TransactionList from '@/components/accounting/TransactionList';
import ReceiptScanner from '@/components/accounting/ReceiptScanner';
import TaxPage from '@/components/accounting/TaxPage';
import BalanceSheet from '@/components/accounting/BalanceSheet';
import ProfitLoss from '@/components/accounting/ProfitLoss';
import SettingsTab from '@/components/accounting/SettingsTab';
import SampleTab from '@/components/accounting/SampleTab';

// No SSR for Charts (Chart.js needs browser)
const Charts = dynamic(() => import('@/components/accounting/Charts'), { ssr: false });

type Tab = 'input' | 'receipt' | 'list' | 'chart' | 'tax' | 'bs' | 'pl' | 'settings' | 'sample';

const TABS: { id: Tab; label: string }[] = [
  { id: 'input', label: '✏️ 取引入力' },
  { id: 'receipt', label: '📷 レシート読取' },
  { id: 'list', label: '📋 取引一覧' },
  { id: 'chart', label: '📊 月次グラフ' },
  { id: 'tax', label: '📑 確定申告' },
  { id: 'bs', label: '🏦 貸借対照表' },
  { id: 'pl', label: '📈 損益計算書' },
  { id: 'settings', label: '⚙️ 設定' },
  { id: 'sample', label: '📖 使い方サンプル' },
];

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('input');

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Tab navigation */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0 overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-green-700 text-green-700 bg-green-50'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'input' && <TransactionForm />}
        {activeTab === 'receipt' && (
          <ReceiptScanner onSwitchToSettings={() => setActiveTab('settings')} />
        )}
        {activeTab === 'list' && <TransactionList />}
        {activeTab === 'chart' && <Charts />}
        {activeTab === 'tax' && <TaxPage />}
        {activeTab === 'bs' && <BalanceSheet />}
        {activeTab === 'pl' && <ProfitLoss />}
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'sample' && <SampleTab />}
      </div>
    </div>
  );
}
