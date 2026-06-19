/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Expense } from '../types';
import { exportFinancialReportToExcel } from '../utils/documentExporter';
import { 
  DollarSign, 
  Search, 
  Plus, 
  Trash2, 
  Wrench, 
  TrendingUp, 
  ArrowDownCircle, 
  Calendar, 
  Download, 
  X, 
  Coins, 
  UserCheck 
} from 'lucide-react';

export default function FinanceView() {
  const { 
    orders, 
    expenses, 
    masters, 
    clients,
    addExpense, 
    deleteExpense 
  } = useAppStore();

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'overhead' | 'salaries'>('daily');
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    month: new Date().toISOString().substring(0, 7), // YYYY-MM
    name: '',
    amount: 0,
  });

  // 1. CALCULATES

  // Filter orders by selected closed time range
  const closedOrdersInPeriod = orders.filter((o) => {
    if (o.status !== 'PAID') return false;
    const date = o.updatedAt.split('T')[0];
    return date >= startDate && date <= endDate;
  });

  // Daily checkout list (payments registered today)
  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter((o) => o.updatedAt.startsWith(todayStr));

  // Overhead expenses in range
  const periodOverheadExpenses = expenses.filter((e) => {
    const startM = startDate.substring(0, 7);
    const endM = endDate.substring(0, 7);
    return e.month >= startM && e.month <= endM;
  });

  // Master Salaries calculation in period
  const mastersSalaryList = masters.map((master) => {
    // Collect works performed by this master on orders closed inside this date range
    let totalLaborEarned = 0;
    let totalMasterPayer = 0;
    let jobCount = 0;

    closedOrdersInPeriod.forEach((order) => {
      order.works.forEach((w) => {
        if (w.masterId === master.id) {
          totalLaborEarned += w.price;
          totalMasterPayer += Math.round(w.price * (w.masterCommissionPercent / 100));
          jobCount++;
        }
      });
    });

    return {
      id: master.id,
      name: master.name,
      jobCount,
      totalLaborEarned,
      salaryPaid: totalMasterPayer,
    };
  });

  // Overall Financial summary of the period
  const totalPeriodRevenue = closedOrdersInPeriod.reduce((sum, o) => sum + o.paidAmount, 0);
  const totalPeriodPartsCost = closedOrdersInPeriod.reduce((sum, o) => {
    return sum + o.partsNeeded.reduce((s, p) => s + p.purchasePrice, 0);
  }, 0);
  const totalPeriodSalaries = mastersSalaryList.reduce((sum, m) => sum + m.salaryPaid, 0);
  const totalPeriodOverhead = periodOverheadExpenses.reduce((sum, e) => sum + e.amount, 0);
  const periodNetProfit = totalPeriodRevenue - totalPeriodPartsCost - totalPeriodSalaries - totalPeriodOverhead;

  // Handlers
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.name || !expenseForm.amount) {
      alert('Будь ласка, заповніть усі обов\'язкові поля.');
      return;
    }
    await addExpense(expenseForm);
    setShowExpenseModal(false);
    setExpenseForm({ month: new Date().toISOString().substring(0, 7), name: '', amount: 0 });
  };

  const triggerExcelExport = () => {
    exportFinancialReportToExcel(orders, expenses, masters, clients, startDate, endDate);
  };

  return (
    <div className="space-y-6 font-sans text-left">
      
      {/* Date period filters & excel download */}
      <div className="p-5 rounded-xl bg-bg-surface border border-bg-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="space-y-1">
            <label className="text-2xs font-extrabold text-text-muted uppercase tracking-wider block">Початкова дата</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-bg-base border border-bg-border text-xs rounded p-2 text-white outline-none focus:border-accent"
            />
          </div>

          <div className="hidden sm:block text-text-muted select-none mt-4">→</div>

          <div className="space-y-1">
            <label className="text-2xs font-extrabold text-text-muted uppercase tracking-wider block">Кінцева дата</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-bg-base border border-bg-border text-xs rounded p-2 text-white outline-none focus:border-accent"
            />
          </div>
        </div>

        <button
          onClick={triggerExcelExport}
          className="self-start md:self-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-bg-base font-black text-xs rounded-lg transition inline-flex items-center space-x-1.5 shadow-[0_4px_12px_rgba(16,185,129,0.2)] cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Експорт звіту в Excel</span>
        </button>

      </div>

      {/* Primary summary figures for period selected */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="p-4 rounded-xl bg-bg-surface border border-bg-border text-left">
          <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Оборот періоду (Виручка)</p>
          <p className="text-2xl font-black text-white mt-1">+{totalPeriodRevenue.toLocaleString()} ₴</p>
          <p className="text-[10px] text-text-muted mt-0.5">Сума оплат по нарядам</p>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-xl bg-bg-surface border border-bg-border text-left">
          <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Собівартість запчастей</p>
          <p className="text-2xl font-black text-white mt-1">-{totalPeriodPartsCost.toLocaleString()} ₴</p>
          <p className="text-[10px] text-text-muted mt-0.5">Ціна закупно дефектівок</p>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-xl bg-bg-surface border border-bg-border text-left">
          <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">ЗП та операційні витрати</p>
          <p className="text-2xl font-black text-white mt-1">
            -{(totalPeriodSalaries + totalPeriodOverhead).toLocaleString()} ₴
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">Майстри {(totalPeriodSalaries).toLocaleString()} ₴ + Оверхед {(totalPeriodOverhead).toLocaleString()} ₴</p>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-bg-surface to-bg-elevated border border-accent/20 text-left">
          <p className="text-[10px] text-accent uppercase font-extrabold tracking-wider">Чистий Прибуток</p>
          <p className={`text-2xl font-extrabold mt-1 ${periodNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {periodNetProfit >= 0 ? '+' : ''}{periodNetProfit.toLocaleString()} ₴
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">Сплачено за оренду та роботу</p>
        </div>

      </div>

      {/* Tab select option ledger links */}
      <div className="flex border-b border-bg-border">
        <button
          onClick={() => setActiveTab('daily')}
          className={`pb-3 text-xs font-bold tracking-wider uppercase px-4 transition relative cursor-pointer ${
            activeTab === 'daily' ? 'text-accent' : 'text-text-secondary hover:text-white'
          }`}
        >
          Касова стрічка дня
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`pb-3 text-xs font-bold tracking-wider uppercase px-4 transition relative cursor-pointer ${
            activeTab === 'monthly' ? 'text-accent' : 'text-text-secondary hover:text-white'
          }`}
        >
          Щомісячний звіт
        </button>
        <button
          onClick={() => setActiveTab('overhead')}
          className={`pb-3 text-xs font-bold tracking-wider uppercase px-4 transition relative cursor-pointer ${
            activeTab === 'overhead' ? 'text-accent' : 'text-text-secondary hover:text-white'
          }`}
        >
          Облік витрат оверхед ({expenses.length})
        </button>
        <button
          onClick={() => setActiveTab('salaries')}
          className={`pb-3 text-xs font-bold tracking-wider uppercase px-4 transition relative cursor-pointer ${
            activeTab === 'salaries' ? 'text-accent' : 'text-text-secondary hover:text-white'
          }`}
        >
          Ефективність та ЗП майстрів
        </button>
      </div>

      {/* Tab content bodies */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
            <Coins className="w-4.5 h-4.5 mr-2 text-accent" />
            <span>Касова стрічка оплат за сьогодні ({todayStr})</span>
          </h3>

          <div className="bg-bg-surface rounded-xl border border-bg-border divide-y divide-bg-border/60">
            {todayOrders.length > 0 ? (
              todayOrders.map((o) => {
                const client = clients.find(c => c.id === o.clientId);
                return (
                  <div key={o.id} className="p-4 flex items-center justify-between text-xs hover:bg-bg-base/30">
                    <div className="space-y-1">
                      <p className="font-bold text-white">
                        {client ? `${client.carBrand} ${client.carModel}` : 'Автомобіль клієнта'}
                      </p>
                      <p className="text-text-secondary text-[10px] font-mono">
                        Клієнт: {client?.name || 'Позасистемний'} • ID наряду: {o.id.split('_')[1]}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-black text-emerald-400 font-mono text-sm">+{o.paidAmount.toLocaleString()} ₴</p>
                      <p className="text-[9px] text-text-muted">Оплата зафіксована сьогодні</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="p-8 text-center text-text-muted italic text-xs">Жодних транзакцій та платежів за сьогодні не зареєстровано.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'monthly' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Аналітика Рентабельності</h3>

          <div className="p-6 bg-bg-surface border border-bg-border rounded-xl space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 border-b border-bg-border/60 pb-3">
              <span className="text-text-secondary font-medium">Загальний дохід (валова виручка):</span>
              <span className="text-right text-white font-extrabold">{totalPeriodRevenue.toLocaleString()} ₴</span>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-bg-border/60 pb-3">
              <span className="text-text-secondary font-medium">Собівартість закуплених запчастин:</span>
              <span className="text-right text-red-400 font-extrabold">-{totalPeriodPartsCost.toLocaleString()} ₴</span>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-bg-border/60 pb-3">
              <span className="text-text-secondary font-medium">Виплати заробітної плати автомеханікам:</span>
              <span className="text-right text-purple-400 font-extrabold">-{totalPeriodSalaries.toLocaleString()} ₴</span>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-bg-border/60 pb-3">
              <span className="text-text-secondary font-medium">Операційні витрати (Оренда/Комуналка):</span>
              <span className="text-right text-orange-400 font-extrabold">-{totalPeriodOverhead.toLocaleString()} ₴</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm pt-2">
              <span className="text-accent font-black uppercase">Чистий Прибуток:</span>
              <span className={`text-right font-black ${periodNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {periodNetProfit.toLocaleString()} ₴
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'overhead' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Щомісячні постійні витрати (Оренда, світло, інструменти)</h3>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="py-1 px-3 bg-accent text-bg-base font-bold text-xs rounded transition cursor-pointer"
            >
              + Внести витрату
            </button>
          </div>

          <div className="bg-bg-surface rounded-xl border border-bg-border overflow-hidden">
            <table className="w-full text-left text-xs text-text-secondary">
              <thead>
                <tr className="border-b border-bg-border bg-bg-base/60 font-bold text-text-muted">
                  <th className="p-3">Звітний місяць</th>
                  <th className="p-3">Найменування витрати / категорії</th>
                  <th className="p-3 text-right">Сума витрат</th>
                  <th className="p-3 text-right">Дія</th>
                </tr>
              </thead>
              <tbody>
                {periodOverheadExpenses.length > 0 ? (
                  periodOverheadExpenses.map((exp) => (
                    <tr key={exp.id} className="border-b border-bg-border/40">
                      <td className="p-3 font-mono text-white">{exp.month}</td>
                      <td className="p-3">{exp.name}</td>
                      <td className="p-3 text-right font-bold text-white">{exp.amount.toLocaleString()} ₴</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => deleteExpense(exp.id)}
                          className="hover:text-red-500 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center italic text-text-muted">Витрат у цьому періоді немає.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'salaries' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Розраховані зарплати та ефективність механіків у періоді</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mastersSalaryList.map((m) => (
              <div key={m.id} className="p-5 rounded-xl bg bg-bg-surface border border-bg-border space-y-4">
                <div className="flex items-center space-x-3 border-b border-bg-border/40 pb-2">
                  <Wrench className="w-5 h-5 text-accent" />
                  <div>
                    <h4 className="text-sm font-bold text-white">{m.name}</h4>
                    <p className="text-[10px] text-text-muted">Виконано {m.jobCount} робіт</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-text-secondary">
                  <div className="flex justify-between">
                    <span>Загальний оборот робіт:</span>
                    <span className="text-white font-medium">{m.totalLaborEarned.toLocaleString()} ₴</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-bg-border/40 pt-1.5">
                    <span className="text-accent">Зарплата до виплати:</span>
                    <span className="text-emerald-400">{m.salaryPaid.toLocaleString()} ₴</span>
                  </div>
                </div>

                <p className="text-[10px] text-text-muted italic">
                  Автоматично обраховано на основі відсоткових часток від закритих нарядів-замовлень.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD EXPENSE */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-bg-elevated border border-bg-border p-6 rounded-xl w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between border-b border-bg-border/60 pb-3">
              <h3 className="text-md font-bold text-white flex items-center space-x-1.5 font-display">
                <Plus className="w-5 h-5 text-accent" />
                <span>Внести Витрату</span>
              </h3>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="text-text-muted hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div className="space-y-1">
                <label className="text-2xs font-bold text-text-secondary uppercase">Звітний місяць</label>
                <input
                  type="month"
                  required
                  value={expenseForm.month}
                  onChange={(e) => setExpenseForm({ ...expenseForm, month: e.target.value })}
                  className="w-full bg-bg-base p-2.5 text-xs rounded border border-bg-border text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold text-text-secondary uppercase">Призначення витрати (Категорія) *</label>
                <input
                  type="text"
                  required
                  placeholder="напр. Оренда боксу, Світло, Розхідники"
                  value={expenseForm.name}
                  onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })}
                  className="w-full bg-bg-base p-2.5 text-xs rounded border border-bg-border text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold text-text-secondary uppercase">Сума витрати (₴) *</label>
                <input
                  type="number"
                  required
                  value={expenseForm.amount || ''}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                  className="w-full bg-bg-base p-2.5 text-xs rounded border border-bg-border text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-x-2 border-t border-bg-border/60 pt-4">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 bg-bg-surface hover:bg-bg-base text-text-secondary text-xs rounded transition cursor-pointer"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-bg-base font-bold text-xs rounded shadow-[0_4px_12px_rgba(249,115,22,0.15)] transition cursor-pointer"
                >
                  Записати витрату
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
