/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { OrderStatus, ORDER_STATUS_LABELS, Order } from '../types';
import { 
  ClipboardList, 
  Search, 
  Car, 
  SlidersHorizontal, 
  ArrowRight, 
  FileText, 
  Clock, 
  DollarSign, 
  CheckCircle2,
  Users
} from 'lucide-react';

interface OrdersViewProps {
  onNavigate: (view: 'clients' | 'orders' | 'inventory' | 'finance' | 'settings') => void;
}

export default function OrdersView({ onNavigate }: OrdersViewProps) {
  const { orders, clients, activeOrderFilter, setActiveOrderFilter, setCurrentClient, setCurrentOrder } = useAppStore();
  const [search, setSearch] = useState('');

  // Filtering orders
  const filteredOrders = orders.filter((o) => {
    // 1. Status Filter
    if (activeOrderFilter !== 'ALL') {
      if (activeOrderFilter === 'ACTIVE') {
        if (o.status === 'PAID') return false;
      } else if (o.status !== activeOrderFilter) {
        return false;
      }
    }

    // 2. Search Query Search matching customer name, car, complaints
    const q = search.toLowerCase().trim();
    if (!q) return true;
    
    const client = clients.find((c) => c.id === o.clientId);
    const clientName = client ? client.name.toLowerCase() : '';
    const carModelStr = client ? `${client.carBrand} ${client.carModel}`.toLowerCase() : '';
    
    return (
      clientName.includes(q) ||
      carModelStr.includes(q) ||
      o.complaints.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q)
    );
  });

  const handleOrderClick = (order: Order) => {
    setCurrentClient(order.clientId);
    setCurrentOrder(order.id);
    onNavigate('clients');
  };

  const orderStatusBadgeColor = (status: OrderStatus) => {
    switch (status) {
      case 'NEW': return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
      case 'DIAGNOSIS': return 'bg-purple-500/15 text-purple-400 border-purple-500/20';
      case 'APPROVAL': return 'bg-amber-500/15 text-amber-500 border-amber-500/20';
      case 'WAITING_PARTS': return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20';
      case 'IN_WORK': return 'bg-accent/15 text-accent border-accent/20';
      case 'READY': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
      case 'PAID': return 'bg-slate-500/15 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Search and Filters Header */}
      <div className="p-4 rounded-xl bg-bg-surface border border-bg-border space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <ClipboardList className="w-6 h-6 text-accent" />
            <h2 className="text-lg font-bold font-display uppercase tracking-wide text-white">Усі Наряди-Замовлення</h2>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Шукати за авто, замовником, скаргою..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg-base pl-9 pr-4 py-2 text-xs rounded-lg border border-bg-border focus:border-accent text-white outline-none"
            />
          </div>
        </div>

        {/* Filter Quick Tabs Slider */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveOrderFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex-shrink-0 cursor-pointer ${
              activeOrderFilter === 'ALL'
                ? 'bg-accent text-bg-base'
                : 'bg-bg-base text-text-secondary border border-bg-border hover:text-white'
            }`}
          >
            Всі ({orders.length})
          </button>
          
          <button
            onClick={() => setActiveOrderFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex-shrink-0 cursor-pointer ${
              activeOrderFilter === 'ACTIVE'
                ? 'bg-accent text-bg-base'
                : 'bg-bg-base text-text-secondary border border-bg-border hover:text-white'
            }`}
          >
            Активні в роботі ({orders.filter(o => o.status !== 'PAID').length})
          </button>

          {(['NEW', 'DIAGNOSIS', 'APPROVAL', 'WAITING_PARTS', 'IN_WORK', 'READY', 'PAID'] as OrderStatus[]).map(status => {
            const count = orders.filter(o => o.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setActiveOrderFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex-shrink-0 cursor-pointer ${
                  activeOrderFilter === status
                    ? 'bg-accent text-bg-base'
                    : 'bg-bg-base text-text-secondary border border-bg-border hover:text-white'
                }`}
              >
                {ORDER_STATUS_LABELS[status]} ({count})
              </button>
            );
          })}
        </div>

      </div>

      {/* Orders Grid cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((o) => {
            const client = clients.find(c => c.id === o.clientId);
            const worksTotal = o.works.reduce((s, w) => s + w.price, 0);
            const partsTotal = o.partsNeeded.reduce((s, p) => s + p.clientPrice, 0);
            const grandTotal = worksTotal + partsTotal;
            const outstanding = Math.max(0, grandTotal - o.paidAmount);

            return (
              <div
                key={o.id}
                onClick={() => handleOrderClick(o)}
                className="p-5 rounded-xl bg-gradient-to-br from-bg-surface to-bg-elevated border border-bg-border hover:border-accent/40 cursor-pointer transition flex flex-col justify-between h-56 group text-left"
              >
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 border rounded-full text-[9px] font-bold uppercase tracking-wider ${orderStatusBadgeColor(o.status)}`}>
                      {ORDER_STATUS_LABELS[o.status]}
                    </span>
                    <span className="text-2xs font-mono text-text-muted">ID: {o.id.split('_')[1]}</span>
                  </div>

                  <div className="space-y-0.5">
                    <h3 className="text-sm font-black text-white group-hover:text-accent transition">
                      {client ? `${client.carBrand} ${client.carModel}` : 'Автомобіль невідомий'}
                    </h3>
                    <p className="text-xs text-text-secondary truncate">
                      Клієнт: <span className="text-text-primary font-medium">{client?.name || 'Позасистемний'}</span>
                    </p>
                  </div>

                  <p className="text-xs text-text-muted line-clamp-2 italic">
                    "{o.complaints || 'Скарги не прописані'}"
                  </p>
                </div>

                {/* Footer specs */}
                <div className="border-t border-bg-border/60 pt-3.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-text-muted uppercase font-bold">Сума наряду</p>
                    <p className="text-md font-black text-white">{grandTotal.toLocaleString()} ₴</p>
                  </div>

                  <div className="text-right">
                    {outstanding > 0 ? (
                      <div>
                        <p className="text-[9px] text-red-400 font-bold uppercase">Залишок</p>
                        <p className="text-xs text-red-400 font-extrabold">{outstanding.toLocaleString()} ₴</p>
                      </div>
                    ) : (
                      <span className="text-2xs text-emerald-400 font-bold flex items-center bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Оплачено
                      </span>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        ) : (
          <div className="col-span-full p-12 bg-bg-surface rounded-xl border border-bg-border border-dashed text-center">
            <ClipboardList className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-secondary font-bold">Нарядів-замовлень не знайдено</p>
            <p className="text-xs text-text-muted mt-1">Оберіть інший статус фільтра або створіть нове замовлення через картку клієнта.</p>
          </div>
        )}
      </div>

    </div>
  );
}
