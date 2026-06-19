/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { useAppStore } from './store/useAppStore';
import PinLock from './components/PinLock';
import DashboardView from './components/DashboardView';
import ClientsView from './components/ClientsView';
import OrdersView from './components/OrdersView';
import InventoryView from './components/InventoryView';
import FinanceView from './components/FinanceView';
import SettingsView from './components/SettingsView';
import { syncDatabaseWithDrive } from './utils/googleDriveSync';
import { DBStructure } from './types';
import { 
  Gauge, 
  Users, 
  ClipboardList, 
  Package, 
  PiggyBank, 
  Settings as SettingsIcon, 
  Wifi, 
  WifiOff, 
  Car, 
  ShieldCheck, 
  CloudCheck 
} from 'lucide-react';

type ViewName = 'dashboard' | 'clients' | 'orders' | 'inventory' | 'finance' | 'settings';

export default function App() {
  const { 
    isLoaded, 
    pinAuthenticated, 
    settings, 
    initStore, 
    updateSettings,
    importFullData
  } = useAppStore();

  const [activeView, setActiveView] = useState<ViewName>('dashboard');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // 1. Initial local IndexedDB load
    initStore();

    // 2. Monitoring Network changes for фоновий silent sync
    const goOnline = () => {
      setIsOnline(true);
      triggerSilentBackgroundSync();
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Silent sync trigger if connected
  const triggerSilentBackgroundSync = async () => {
    const fullState = useAppStore.getState();
    const isConnected = fullState.settings.googleDriveConnected;

    if (isConnected && navigator.onLine) {
      console.log('Online detected. Executing silent background database synchronization with GDrive...');
      const cleanLocalDb: DBStructure = {
        meta: {
          version: fullState.meta.version,
          lastSync: fullState.meta.lastSync,
          deviceId: fullState.meta.deviceId,
        },
        clients: fullState.clients,
        orders: fullState.orders,
        inventory: fullState.inventory,
        suppliers: fullState.suppliers,
        masters: fullState.masters,
        expenses: fullState.expenses,
        templates: fullState.templates,
        settings: fullState.settings,
      };

      const res = await syncDatabaseWithDrive(cleanLocalDb, 'mock_token');
      if (res.success && res.data) {
        await importFullData(res.data);
        console.log('Silent sync completed. Local IndexedDB merged.');
      }
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-screen bg-bg-base font-sans text-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-text-secondary font-semibold">
          Завантаження бази автосервісу...
        </p>
      </div>
    );
  }

  // Pin authentication screen check
  if (!pinAuthenticated) {
    return <PinLock />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView onNavigate={(view) => setActiveView(view as ViewName)} />;
      case 'clients':
        return <ClientsView />;
      case 'orders':
        return <OrdersView onNavigate={(view) => setActiveView(view as ViewName)} />;
      case 'inventory':
        return <InventoryView />;
      case 'finance':
        return <FinanceView />;
      case 'settings':
        return <SettingsView />;
    }
  };

  const menuItems = [
    { name: 'dashboard', label: 'Головна', icon: Gauge },
    { name: 'clients', label: 'Клієнти', icon: Users },
    { name: 'orders', label: 'Наряди', icon: ClipboardList },
    { name: 'inventory', label: 'Склад', icon: Package },
    { name: 'finance', label: 'Фінанси', icon: PiggyBank },
    { name: 'settings', label: 'Налаштування', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-bg-base text-white flex flex-col md:flex-row pb-16 md:pb-0 font-sans">
      
      {/* SIDEBAR FOR DESKTOP - Industrial Gradient Aesthetic */}
      <aside className="hidden md:flex flex-col justify-between w-64 bg-gradient-to-b from-bg-surface to-bg-base border-r border-bg-border/60 p-5 shrink-0 select-none">
        
        <div className="space-y-6">
          {/* Brand header */}
          <div className="flex items-center space-x-2.5 px-2">
            <div className="w-9 h-9 bg-accent/15 border border-accent/20 rounded-xl flex items-center justify-center text-accent shadow-[0_0_15px_rgba(249,115,22,0.15)]">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-md font-black tracking-tight font-display text-white">СТО МЕНЕДЖЕР</h1>
              <p className="text-[10px] text-text-secondary font-medium uppercase tracking-widest leading-none">Один Власник</p>
            </div>
          </div>

          {/* Nav links */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveView(item.name as ViewName)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition text-left cursor-pointer group ${
                    isActive
                      ? 'bg-accent text-bg-base font-bold shadow-[0_4px_12px_rgba(249,115,22,0.2)]'
                      : 'text-text-secondary hover:text-white hover:bg-bg-surface'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 transition ${
                    isActive ? 'text-bg-base' : 'text-text-secondary group-hover:text-accent'
                  }`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Network & Local status footers */}
        <div className="space-y-2 border-t border-bg-border/40 pt-4 px-2">
          {isOnline ? (
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-[10px] uppercase tracking-wider">
              <Wifi className="w-3.5 h-3.5" />
              <span>● В Мережі</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-red-400 font-bold text-[10px] uppercase tracking-wider">
              <WifiOff className="w-3.5 h-3.5 animate-pulse" />
              <span>● Офлайн (Локально)</span>
            </div>
          )}

          <div className="flex items-center space-x-1 text-[9px] text-text-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-text-muted" />
            <span>Шифрування IndexedDB</span>
          </div>
        </div>

      </aside>

      {/* MOBILE HEADER */}
      <header className="md:hidden flex items-center justify-between p-4 bg-bg-surface border-b border-bg-border/60 shrink-0 select-none">
        
        <div className="flex items-center space-x-1.5">
          <div className="w-8 h-8 bg-accent/15 border border-accent/20 rounded-lg flex items-center justify-center text-accent">
            <Car className="w-4.5 h-4.5" />
          </div>
          <span className="font-bold text-sm tracking-tight font-display text-white">СТО МЕНЕДЖЕР</span>
        </div>

        {/* Dynamic connection indicator */}
        {isOnline ? (
          <span className="p-1 px-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center">
            <Wifi className="w-3 h-3 mr-1" /> Онлайн
          </span>
        ) : (
          <span className="p-1 px-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center">
            <WifiOff className="w-3 h-3 mr-1" /> Офлайн
          </span>
        )}

      </header>

      {/* MAIN LAYOUT CANVAS */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-h-[100vh]">
        <div className="max-w-7xl mx-auto">
          {renderView()}
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION - Sleek one-palm tap menu */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-t from-bg-surface/95 to-bg-surface/90 backdrop-blur-md border-t border-bg-border/50 flex items-center justify-around py-2.5 z-40 select-none">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.name;
          return (
            <button
              key={item.name}
              onClick={() => setActiveView(item.name as ViewName)}
              className={`flex flex-col items-center gap-1 cursor-pointer transition ${
                isActive ? 'text-accent' : 'text-text-secondary hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-bold leading-none tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>

    </div>
  );
}
