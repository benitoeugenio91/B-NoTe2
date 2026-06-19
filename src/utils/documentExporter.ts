/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { Order, Expense, Master, Client } from '../types';

/**
 * Exports financial reporting raw data to an Excel Sheet
 */
export function exportFinancialReportToExcel(
  orders: Order[],
  expenses: Expense[],
  masters: Master[],
  clients: Client[],
  startDate: string,
  endDate: string
) {
  const filteredOrders = orders.filter(o => {
    if (o.status !== 'PAID') return false;
    const date = o.updatedAt.split('T')[0];
    return date >= startDate && date <= endDate;
  });

  // Page 1: Orders list
  const ordersData = filteredOrders.map((o) => {
    const client = clients.find(c => c.id === o.clientId);
    const clientName = client ? client.name : 'Невідомо';
    const clientCar = client ? `${client.carBrand} ${client.carModel} (${client.carYear})` : '';
    
    // Calculates
    const totalWorks = o.works.reduce((sum, w) => sum + w.price, 0);
    const totalPartsCost = o.partsNeeded.reduce((sum, p) => sum + p.purchasePrice, 0);
    const totalPartsClient = o.partsNeeded.reduce((sum, p) => sum + p.clientPrice, 0);
    const totalMastersSalaries = o.works.reduce((sum, w) => sum + (w.price * (w.masterCommissionPercent / 100)), 0);
    
    const profit = o.paidAmount - totalPartsCost - totalMastersSalaries;

    return {
      'ID замовлення': o.id,
      'Клієнт': clientName,
      'Автомобіль': clientCar,
      'Статус': 'Оплачено',
      'Дата закриття': o.updatedAt.split('T')[0],
      'Сума робіт, грн': totalWorks,
      'Ціна закупівлі запчастин, грн': totalPartsCost,
      'Ціна запчастин для клієнта, грн': totalPartsClient,
      'Оплачено клієнтом, грн': o.paidAmount,
      'Зарплата майстрів, грн': totalMastersSalaries,
      'Чистий дохід, грн': profit
    };
  });

  // Page 2: Expenses
  const filteredExpenses = expenses.filter(e => {
    return e.month >= startDate.substring(0, 7) && e.month <= endDate.substring(0, 7);
  });
  
  const expensesData = filteredExpenses.map((e) => ({
    'Місяць': e.month,
    'Категорія витрат': e.name,
    'Сума, грн': e.amount
  }));

  // Create workbook & sheets
  const wb = XLSX.utils.book_new();
  
  // Sheet 1: Orders
  const wsOrders = XLSX.utils.json_to_sheet(ordersData);
  XLSX.utils.book_append_sheet(wb, wsOrders, 'Замовлення');

  // Sheet 2: Expenses
  const wsExpenses = XLSX.utils.json_to_sheet(expensesData);
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Витрати оверхед');

  // Sheet 3: Summary analytics
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.paidAmount, 0);
  const totalPurchaseParts = filteredOrders.reduce((sum, o) => sum + o.partsNeeded.reduce((s, p) => s + p.purchasePrice, 0), 0);
  const totalSalaries = filteredOrders.reduce((sum, o) => sum + o.works.reduce((s, w) => s + (w.price * (w.masterCommissionPercent / 100)), 0), 0);
  const totalOverhead = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netEarnings = totalRevenue - totalPurchaseParts - totalSalaries - totalOverhead;

  const summaryData = [
    { 'Показник': 'Загальний дохід (оплати клієнтів)', 'Значення, грн': totalRevenue },
    { 'Показник': 'Собівартість запчастин (закупка)', 'Значення, грн': -totalPurchaseParts },
    { 'Показник': 'Виплати майстрам (ЗП)', 'Значення, грн': -totalSalaries },
    { 'Показник': 'Операційні витрати (оренда, світло тощо)', 'Значення, грн': -totalOverhead },
    { 'Показник': 'Чистий прибуток', 'Значення, грн': netEarnings }
  ];
  
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Фінансовий звіт');

  // Triggers downloading the excel file
  const filename = `STO_Manager_Report_${startDate}_${endDate}.xlsx`;
  XLSX.writeFile(wb, filename);
}
