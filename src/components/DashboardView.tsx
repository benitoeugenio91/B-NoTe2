/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAppStore } from '../store/useAppStore';
import { ORDER_STATUS_LABELS, OrderStatus, Order } from '../types';
import { 
  Car, 
  Coins, 
  Wrench, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Play, 
  ChevronRight, 
  DollarSign 
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (view: 'clients' | 'orders' | 'inventory' | 'finance' | 'settings') => void;
}

export default function DashboardView({ onNavigate }: DashboardViewProps) {
  const { orders, clients, setCurrentClient, setCurrentOrder } = useAppStore();

  // 1. Calculate stats
  const activeOrders = orders.filter((o) => o.status !== 'PAID');
  
  // Daily revenue (paidAmount of orders closed/paid today or any transaction paid today)
  // Let's grab orders that were updated to PAID today or had paidAmount incremented today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRevenue = orders.reduce((sum, o) => {
    // For simplicity, sum all paidAmount if order was updated today, or o.updatedAt is today
    if (o.updatedAt.startsWith(todayStr)) {
      // In a real flow, let's look at total payments on orders modified today
      return sum + o.paidAmount;
    }
    return sum;
  }, 0);

  // Debts (uncollected balances of orders, even closed ones that had outstanding quantities)
  const outstandingDebts = orders.reduce((sum, o) => {
    const totalParts = o.partsNeeded.reduce((s, p) => s + p.clientPrice, 0);
    const totalWorks = o.works.reduce((s, w) => s + w.price, 0);
    const totalBill = totalParts + totalWorks;
    const debt = Math.max(0, totalBill - o.paidAmount);
    return sum + debt;
  }, 0);

  // Master performance count
  const carsInWorkCount = orders.filter((o) => o.status === 'IN_WORK').length;
  const carsWaitingPartsCount = orders.filter((o) => o.status === 'WAITING_PARTS').length;
  const carsDiagnosisCount = orders.filter((o) => o.status === 'DIAGNOSIS').length;
  const carsReadyCount = orders.filter((o) => o.status === 'READY').length;

  const statusColors: Record<OrderStatus, string> = {
    NEW: 'from-blue-500/10 to-blue-500/20 text-blue-400 border-blue-500/20',
    DIAGNOSIS: 'from-purple-500/10 to-purple-500/20 text-purple-400 border-purple-500/20',
    APPROVAL: 'from-amber-500/10 to-amber-500/20 text-amber-400 border-amber-500/20',
    WAITING_PARTS: 'from-indigo-500/10 to-indigo-500/20 text-indigo-400 border-indigo-500/20',
    IN_WORK: 'from-orange-500/10 to-orange-500/20 text-orange-400 border-orange-500/20',
    READY: 'from-emerald-500/10 to-emerald-500/20 text-emerald-400 border-emerald-500/20',
    PAID: 'from-slate-500/10 to-slate-500/20 text-slate-400 border-slate-500/20',
  };

  const statusBadges: Record<OrderStatus, string> = {
    NEW: 'bg-blue-500/15 text-blue-400',
    DIAGNOSIS: 'bg-purple-500/15 text-purple-400',
    APPROVAL: 'bg-amber-500/15 text-amber-500',
    WAITING_PARTS: 'bg-indigo-500/15 text-indigo-400',
    IN_WORK: 'bg-accent/15 text-accent',
    READY: 'bg-emerald-500/15 text-emerald-400',
    PAID: 'bg-slate-500/15 text-slate-400',
  };

  const handleOrderClick = (order: Order) => {
    setCurrentClient(order.clientId);
    setCurrentOrder(order.id);
    onNavigate('clients');
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Upper Brand Jumbotron */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-bg-surface to-bg-elevated border border-bg-border relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
          <Car className="w-64 h-64 text-accent" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-widest text-accent uppercase">
              Активна зміна
            </span>
            <h1 className="text-3xl font-extrabold font-display tracking-tight text-white mt-1">
              СТО МЕНЕДЖЕР
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Вітаємо! Вся оперативна інформація про роботу вашого автосервісу в реальному часі.
            </p>
          </div>
          <button
            onClick={() => {
              setCurrentClient(null);
              onNavigate('clients');
            }}
            className="self-start md:self-auto px-5 py-3 bg-accent hover:bg-accent-hover text-bg-base font-bold rounded-xl transition shadow-[0_4px_12px_rgba(249,115,22,0.2)] flex items-center space-x-2 cursor-pointer"
          >
            <Car className="w-4.5 h-4.5" />
            <span>Прийняти Авто</span>
          </button>
        </div>
      </div>

      {/* Primary Key Figures Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-bg-surface border border-bg-border flex items-center space-x-4 hover:border-accent/30 transition">
          <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/20 text-accent">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">На сервісі</p>
            <p className="text-2xl font-bold text-white mt-0.5">{activeOrders.length} авто</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-bg-surface border border-bg-border flex items-center space-x-4 hover:border-emerald-500/30 transition">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">Каса сьогодні</p>
            <p className="text-2xl font-bold text-white mt-0.5">{todayRevenue.toLocaleString()} ₴</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-bg-surface border border-bg-border flex items-center space-x-4 hover:border-red-500/30 transition">
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">Борги клієнтів</p>
            <p className="text-2xl font-bold text-white mt-0.5">{outstandingDebts.toLocaleString()} ₴</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-bg-surface border border-bg-border flex items-center space-x-4 hover:border-orange-500/30 transition">
          <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">Активні роботи</p>
            <p className="text-2xl font-bold text-white mt-0.5">{carsInWorkCount} виконується</p>
          </div>
        </div>

      </div>

      {/* Workshop Queue Split-down */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        <div className="p-4 rounded-xl bg-bg-surface/60 border border-bg-border/60 text-center">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block mb-1"></span>
          <p className="text-xs text-text-secondary font-medium">Діагностика</p>
          <p className="text-xl font-bold text-white mt-0.5">{carsDiagnosisCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface/60 border border-bg-border/60 text-center">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block mb-1"></span>
          <p className="text-xs text-text-secondary font-medium">Чекають запчастин</p>
          <p className="text-xl font-bold text-white mt-0.5">{carsWaitingPartsCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface/60 border border-bg-border/60 text-center">
          <span className="w-2.5 h-2.5 rounded-full bg-accent inline-block mb-1"></span>
          <p className="text-xs text-text-secondary font-medium">В роботі</p>
          <p className="text-xl font-bold text-white mt-0.5">{carsInWorkCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface/60 border border-bg-border/60 text-center">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block mb-1"></span>
          <p className="text-xs text-text-secondary font-medium">Готові авто</p>
          <p className="text-xl font-bold text-white mt-0.5">{carsReadyCount}</p>
        </div>

      </div>

      {/* Bottom section: Queue & Quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Queue Left Pane */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-display tracking-tight text-white flex items-center space-x-2">
              <Clock className="w-5 h-5 text-accent" />
              <span>Черга замовлень (останні 5 активних)</span>
            </h2>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-accent hover:text-accent-hover flex items-center space-x-0.5 cursor-pointer"
            >
              <span>Переглянути всі</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {activeOrders.slice(0, 5).length > 0 ? (
              activeOrders.slice(0, 5).map((order) => {
                const client = clients.find((c) => c.id === order.clientId);
                // Calculate financial summary of this order
                const workAmount = order.works.reduce((s, w) => s + w.price, 0);
                const partsAmount = order.partsNeeded.reduce((s, p) => s + p.clientPrice, 0);
                const totalBill = workAmount + partsAmount;
                const outstanding = Math.max(0, totalBill - order.paidAmount);

                return (
                  <div
                    key={order.id}
                    onClick={() => handleOrderClick(order)}
                    className="p-4 rounded-xl bg-bg-surface hover:bg-bg-elevated border border-bg-border hover:border-bg-border/90 cursor-pointer transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-2xs font-bold leading-4 tracking-wide uppercase ${statusBadges[order.status]}`}>
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                        <span className="text-xs text-text-secondary font-mono">
                          {order.id.split('_')[1]}
                        </span>
                      </div>
                      
                      <h3 className="text-sm font-bold text-white">
                        {client ? `${client.carBrand} ${client.carModel} (${client.carYear})` : "Невідоме авто"}
                      </h3>
                      
                      <p className="text-xs text-text-secondary line-clamp-1">
                        Клієнт: <span className="font-semibold text-text-primary">{client?.name || 'Позасистемний'}</span> • Скарга: {order.complaints || 'відсутня'}
                      </p>
                    </div>

                    <div className="flex items-center md:text-right md:justify-end gap-x-4">
                      <div className="space-y-0.5">
                        <p className="text-xs text-text-secondary font-medium">Загальна сума</p>
                        <p className="text-sm font-extrabold text-white">{totalBill.toLocaleString()} ₴</p>
                        {outstanding > 0 && (
                          <p className="text-[10px] text-red-400 font-semibold">
                            Борг: {outstanding.toLocaleString()} ₴
                          </p>
                        )}
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-accent/5 hover:bg-accent/15 flex items-center justify-center text-accent">
                        <Play className="w-3.5 h-3.5 fill-accent" />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 rounded-2xl bg-bg-surface border border-bg-border border-dashed text-center flex flex-col items-center">
                <CheckCircle className="w-8 h-8 text-emerald-400/80 mb-2" />
                <p className="text-sm font-semibold text-white">Всі замовлення закриті!</p>
                <p className="text-xs text-text-secondary mt-1">Очерет чистий. Нових авто на ремонті немає.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Help & Analytics Panel */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold font-display tracking-tight text-white flex items-center space-x-2">
            <Coins className="w-5 h-5 text-accent" />
            <span>Швидкі звіти та інструменти</span>
          </h2>

          <div className="grid grid-cols-1 gap-3">
            
            {/* Quick action card - View inventory deficit */}
            <div
              onClick={() => onNavigate('inventory')}
              className="p-4 rounded-xl bg-gradient-to-br from-bg-surface to-bg-elevated border border-bg-border hover:border-accent/45 transition cursor-pointer"
            >
              <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                <span>Наявність деталей</span>
              </h3>
              <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                Контролюйте запаси запчастей на складі та заборгованість перед дистриб'юторами.
              </p>
            </div>

            {/* Quick action card - Master Salaries */}
            <div
              onClick={() => onNavigate('finance')}
              className="p-4 rounded-xl bg-gradient-to-br from-bg-surface to-bg-elevated border border-bg-border hover:border-purple-400/45 transition cursor-pointer"
            >
              <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                <span>Розрахунок ЗП майстрів</span>
              </h3>
              <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                Зарплата автомеханіків рахується автоматично на основі відсотка за виконану роботу.
              </p>
            </div>

            {/* Quick action card - System security */}
            <div
              onClick={() => onNavigate('settings')}
              className="p-4 rounded-xl bg-gradient-to-br from-bg-surface to-bg-elevated border border-bg-border hover:border-blue-400/45 transition cursor-pointer"
            >
              <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span>Офлайн резервна копія</span>
              </h3>
              <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                Завантажуйте та завантажуйте повний зліпок бази у форматі JSON у будь-який час.
              </p>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
