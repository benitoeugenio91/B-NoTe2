/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import {
  Client,
  Order,
  InventoryItem,
  Supplier,
  Master,
  Expense,
  QuickTemplate,
  AppSettings,
  DBStructure,
  OrderStatus,
  PartRequirement,
} from '../types';
import { loadFullDB, saveFullDB } from '../db/indexedDb';

interface AppStoreState extends DBStructure {
  isLoaded: boolean;
  activeOrderFilter: OrderStatus | 'ALL' | 'ACTIVE';
  searchQuery: string;
  currentClientId: string | null;  // Active client card
  currentOrderId: string | null;   // Active order detail modal/page
  pinAuthenticated: boolean;
  
  // Actions
  initStore: () => Promise<void>;
  
  // Clients
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<void>;
  updateClient: (id: string, client: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  
  // Orders
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Order>;
  updateOrder: (id: string, order: Partial<Order>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  
  // Inventory
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  useInventoryItemBySku: (sku: string, qty: number) => Promise<boolean>;
  
  // Suppliers
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  
  // Masters
  addMaster: (master: Omit<Master, 'id'>) => Promise<void>;
  updateMaster: (id: string, master: Partial<Master>) => Promise<void>;
  deleteMaster: (id: string) => Promise<void>;
  
  // Expenses
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  
  // Templates
  addTemplate: (template: Omit<QuickTemplate, 'id'>) => Promise<void>;
  updateTemplate: (id: string, template: Partial<QuickTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  
  // Settings & Navigation
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setActiveOrderFilter: (filter: OrderStatus | 'ALL' | 'ACTIVE') => void;
  setCurrentClient: (clientId: string | null) => void;
  setCurrentOrder: (orderId: string | null) => void;
  setPinAuthenticated: (authenticated: boolean) => void;
  
  // Custom Import/Export
  importFullData: (data: DBStructure) => Promise<void>;
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  meta: { version: '1.0', lastSync: '', deviceId: '' },
  clients: [],
  orders: [],
  inventory: [],
  suppliers: [],
  masters: [],
  expenses: [],
  templates: [],
  settings: {},
  isLoaded: false,
  activeOrderFilter: 'ALL',
  searchQuery: '',
  currentClientId: null,
  currentOrderId: null,
  pinAuthenticated: false,

  initStore: async () => {
    const fullDB = await loadFullDB();
    set({
      ...fullDB,
      isLoaded: true,
      // If PIN is configured, wait for authentication, otherwise auto-authenticate
      pinAuthenticated: !fullDB.settings.pinCode,
    });
  },

  addClient: async (clientData) => {
    const newClient: Client = {
      ...clientData,
      id: 'cli_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
      createdAt: new Date().toISOString(),
    };
    const updatedClients = [...get().clients, newClient];
    set({ clients: updatedClients });
    await saveFullDB({ ...get() } as DBStructure);
  },

  updateClient: async (id, updatedFields) => {
    const updatedClients = get().clients.map((c) =>
      c.id === id ? { ...c, ...updatedFields } : c
    );
    set({ clients: updatedClients });
    await saveFullDB({ ...get() } as DBStructure);
  },

  deleteClient: async (id) => {
    // Delete client and cascade delete (or keep) their orders
    const updatedClients = get().clients.filter((c) => c.id !== id);
    const updatedOrders = get().orders.filter((o) => o.clientId !== id);
    set({ clients: updatedClients, orders: updatedOrders });
    if (get().currentClientId === id) {
      set({ currentClientId: null });
    }
    await saveFullDB({ ...get() } as DBStructure);
  },

  addOrder: async (orderData) => {
    const newOrder: Order = {
      ...orderData,
      id: 'ord_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Auto deduct inventory items for received parts if they exist on stock
    for (const part of newOrder.partsNeeded) {
      if (part.sku && part.status === 'RECEIVED') {
        await get().useInventoryItemBySku(part.sku, 1);
      }
    }

    const updatedOrders = [newOrder, ...get().orders];
    set({ orders: updatedOrders });
    await saveFullDB({ ...get() } as DBStructure);
    return newOrder;
  },

  updateOrder: async (id, updatedFields) => {
    const oldOrder = get().orders.find(o => o.id === id);
    const updatedOrders = get().orders.map((o) => {
      if (o.id === id) {
        const mergedOrder = { ...o, ...updatedFields, updatedAt: new Date().toISOString() };
        
        // Handle stock auto-deduction if parts status changed to RECEIVED in this update
        if (updatedFields.partsNeeded) {
          const oldReceivedSkus = new Set(
            (oldOrder?.partsNeeded || []).filter(p => p.status === 'RECEIVED').map(p => p.sku)
          );
          
          updatedFields.partsNeeded.forEach(newPart => {
            if (newPart.sku && newPart.status === 'RECEIVED' && !oldReceivedSkus.has(newPart.sku)) {
              // Newly received part, deduct from stock
              get().useInventoryItemBySku(newPart.sku, 1);
            }
          });
        }

        return mergedOrder;
      }
      return o;
    });

    set({ orders: updatedOrders });
    await saveFullDB({ ...get() } as DBStructure);
  },

  deleteOrder: async (id) => {
    const updatedOrders = get().orders.filter((o) => o.id !== id);
    set({ orders: updatedOrders });
    if (get().currentOrderId === id) {
      set({ currentOrderId: null });
    }
    await saveFullDB({ ...get() } as DBStructure);
  },

  addInventoryItem: async (itemData) => {
    const newItem: InventoryItem = {
      ...itemData,
      id: 'inv_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
    };
    const updatedInventory = [...get().inventory, newItem];
    set({ inventory: updatedInventory });
    await saveFullDB({ ...get() } as DBStructure);
  },

  updateInventoryItem: async (id, updatedFields) => {
    const updatedInventory = get().inventory.map((item) =>
      item.id === id ? { ...item, ...updatedFields } : item
    );
    set({ inventory: updatedInventory });
    await saveFullDB({ ...get() } as DBStructure);
  },

  deleteInventoryItem: async (id) => {
    const updatedInventory = get().inventory.filter((item) => item.id !== id);
    set({ inventory: updatedInventory });
    await saveFullDB({ ...get() } as DBStructure);
  },

  useInventoryItemBySku: async (sku, qty) => {
    if (!sku) return false;
    const cleanSku = sku.trim().toLowerCase();
    const item = get().inventory.find((i) => i.sku.trim().toLowerCase() === cleanSku);
    
    if (item && item.quantity >= qty) {
      const updatedInventory = get().inventory.map((i) =>
        i.sku.trim().toLowerCase() === cleanSku ? { ...i, quantity: Math.max(0, i.quantity - qty) } : i
      );
      set({ inventory: updatedInventory });
      return true;
    }
    return false;
  },

  addSupplier: async (supplierData) => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: 'sup_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
    };
    const updatedSuppliers = [...get().suppliers, newSupplier];
    set({ suppliers: updatedSuppliers });
    await saveFullDB({ ...get() } as DBStructure);
  },

  updateSupplier: async (id, updatedFields) => {
    const updatedSuppliers = get().suppliers.map((s) =>
      s.id === id ? { ...s, ...updatedFields } : s
    );
    set({ suppliers: updatedSuppliers });
    await saveFullDB({ ...get() } as DBStructure);
  },

  deleteSupplier: async (id) => {
    const updatedSuppliers = get().suppliers.filter((s) => s.id !== id);
    set({ suppliers: updatedSuppliers });
    await saveFullDB({ ...get() } as DBStructure);
  },

  addMaster: async (masterData) => {
    const newMaster: Master = {
      ...masterData,
      id: 'mas_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
    };
    const updatedMasters = [...get().masters, newMaster];
    set({ masters: updatedMasters });
    await saveFullDB({ ...get() } as DBStructure);
  },

  updateMaster: async (id, updatedFields) => {
    const updatedMasters = get().masters.map((m) =>
      m.id === id ? { ...m, ...updatedFields } : m
    );
    set({ masters: updatedMasters });
    await saveFullDB({ ...get() } as DBStructure);
  },

  deleteMaster: async (id) => {
    const updatedMasters = get().masters.filter((m) => m.id !== id);
    set({ masters: updatedMasters });
    await saveFullDB({ ...get() } as DBStructure);
  },

  addExpense: async (expenseData) => {
    const newExpense: Expense = {
      ...expenseData,
      id: 'exp_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
    };
    const updatedExpenses = [...get().expenses, newExpense];
    set({ expenses: updatedExpenses });
    await saveFullDB({ ...get() } as DBStructure);
  },

  updateExpense: async (id, updatedFields) => {
    const updatedExpenses = get().expenses.map((e) =>
      e.id === id ? { ...e, ...updatedFields } : e
    );
    set({ expenses: updatedExpenses });
    await saveFullDB({ ...get() } as DBStructure);
  },

  deleteExpense: async (id) => {
    const updatedExpenses = get().expenses.filter((e) => e.id !== id);
    set({ expenses: updatedExpenses });
    await saveFullDB({ ...get() } as DBStructure);
  },

  addTemplate: async (templateData) => {
    const newTemplate: QuickTemplate = {
      ...templateData,
      id: 'tpl_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
    };
    const updatedTemplates = [...get().templates, newTemplate];
    set({ templates: updatedTemplates });
    await saveFullDB({ ...get() } as DBStructure);
  },

  updateTemplate: async (id, updatedFields) => {
    const updatedTemplates = get().templates.map((t) =>
      t.id === id ? { ...t, ...updatedFields } : t
    );
    set({ templates: updatedTemplates });
    await saveFullDB({ ...get() } as DBStructure);
  },

  deleteTemplate: async (id) => {
    const updatedTemplates = get().templates.filter((t) => t.id !== id);
    set({ templates: updatedTemplates });
    await saveFullDB({ ...get() } as DBStructure);
  },

  updateSettings: async (settingsFields) => {
    const updatedSettings = { ...get().settings, ...settingsFields };
    set({ settings: updatedSettings });
    await saveFullDB({ ...get() } as DBStructure);
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveOrderFilter: (filter) => set({ activeOrderFilter: filter }),
  setCurrentClient: (clientId) => set({ currentClientId: clientId }),
  setCurrentOrder: (orderId) => set({ currentOrderId: orderId }),
  setPinAuthenticated: (authenticated) => set({ pinAuthenticated: authenticated }),

  importFullData: async (data) => {
    set({
      meta: data.meta || get().meta,
      clients: data.clients || [],
      orders: data.orders || [],
      inventory: data.inventory || [],
      suppliers: data.suppliers || [],
      masters: data.masters || [],
      expenses: data.expenses || [],
      templates: data.templates || [],
      settings: data.settings || {},
      pinAuthenticated: !data.settings?.pinCode,
    });
    await saveFullDB(data);
  },
}));
