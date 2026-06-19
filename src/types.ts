/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CustomerTag = 'VIP' | 'PROBLEM' | 'PREPAY';

export interface Client {
  id: string;
  name: string;      // ПІБ
  phone: string;     // Моб. телефон
  workPhone?: string; // Роб. телефон
  city: string;      // Населений пункт
  tags: CustomerTag[]; // 'VIP' | 'PROBLEM' | 'PREPAY'
  carBrand: string;  // Марка
  carModel: string;  // Модель
  carYear: number;   // Рік
  vin: string;       // VIN-код
  createdAt: string;
}

export type OrderStatus = 'NEW' | 'DIAGNOSIS' | 'APPROVAL' | 'WAITING_PARTS' | 'IN_WORK' | 'READY' | 'PAID';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'Нове',
  DIAGNOSIS: 'Діагностика',
  APPROVAL: 'Погодження',
  WAITING_PARTS: 'Очікування запчастин',
  IN_WORK: 'В роботі',
  READY: 'Готово',
  PAID: 'Оплачено/Закрито',
};

export type PartReqStatus = 'SEARCHING' | 'ORDERED' | 'SHIPPED' | 'RECEIVED';

export const PART_REQ_STATUS_LABELS: Record<PartReqStatus, string> = {
  SEARCHING: 'Шукається',
  ORDERED: 'Замовлено',
  SHIPPED: 'В дорозі',
  RECEIVED: 'Отримано',
};

export interface PartRequirement {
  id: string;
  name: string;
  sku: string;         // Артикул
  photo?: string;      // Базове фото (в форматі data URL)
  status: PartReqStatus;
  purchasePrice: number; // Ціна закупки
  marginPercent: number; // Очки або % маржі
  clientPrice: number;   // Ціна для клієнта (розрахована)
  etaDate?: string;    // Очікувана дата прибуття
}

export interface WorkItem {
  id: string;
  name: string;
  price: number;
  masterId: string;
  masterCommissionPercent: number; // % від вартості роботи майстру
}

export interface Order {
  id: string;
  clientId: string;
  complaints: string;   // скарги клієнта
  photos: string[];     // фотофіксація stanu (до 5 штук)
  masterId: string;     // призначений майстер
  diagnosis: string;    // висновок діагностики
  status: OrderStatus;
  partsNeeded: PartRequirement[];
  works: WorkItem[];
  paidAmount: number;   // Оплачено (вводиться вручну, можна частинами)
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  analogs?: string; // рядок аналогів або комами
  quantity: number;
  purchasePrice: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  debt: number; // Борг перед постачальником
}

export interface Master {
  id: string;
  name: string;
  defaultCommission: number; // стандартний %
  active: boolean;
}

export interface Expense {
  id: string;
  month: string; // Формат YYYY-MM
  name: string;  // Назва (оренда, світло, інструмент, розхідники)
  amount: number;
}

export interface QuickTemplate {
  id: string;
  name: string;
  description?: string;
  works: Array<{ name: string; price: number; commissionPercent: number }>;
  partsNeeded: Array<{ name: string; sku: string; marginPercent: number }>;
}

export interface AppSettings {
  pinCode?: string; // Простий пін-код
  biometricsEnabled?: boolean;
  googleDriveConnected?: boolean;
  driveFolderId?: string;
  driveFileId?: string;
  autoBackupEnabled?: boolean;
  driveApiKey?: string;
  driveAccessToken?: string;
}

export interface DBBackupRecord {
  id: string;
  timestamp: string;
  size: number;
}

export interface DBStructure {
  meta: {
    version: string;
    lastSync: string;
    deviceId: string;
  };
  clients: Client[];
  orders: Order[];
  inventory: InventoryItem[];
  suppliers: Supplier[];
  masters: Master[];
  expenses: Expense[];
  templates: QuickTemplate[];
  settings: AppSettings;
}
