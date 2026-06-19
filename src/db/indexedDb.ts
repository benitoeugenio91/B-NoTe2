/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { openDB, IDBPDatabase } from 'idb';
import { DBStructure } from '../types';

const DB_NAME = 'sto_manager_db';
const DB_VERSION = 1;
const STORE_NAME = 'db_store';

let dbInstance: IDBPDatabase | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });

  return dbInstance;
}

export async function getDbValue<K extends keyof DBStructure>(key: K): Promise<DBStructure[K] | null> {
  try {
    const db = await getDB();
    return (await db.get(STORE_NAME, key)) as DBStructure[K] | null;
  } catch (error) {
    console.error('Error reading from IndexedDB:', error);
    return null;
  }
}

export async function setDbValue<K extends keyof DBStructure>(key: K, value: DBStructure[K]): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE_NAME, value, key);
  } catch (error) {
    console.error('Error writing to IndexedDB:', error);
  }
}

export async function loadFullDB(): Promise<DBStructure> {
  const meta = await getDbValue('meta') || { version: '1.0', lastSync: '', deviceId: generateDeviceId() };
  const clients = await getDbValue('clients') || [];
  const orders = await getDbValue('orders') || [];
  const inventory = await getDbValue('inventory') || [];
  const suppliers = await getDbValue('suppliers') || [];
  const masters = await getDbValue('masters') || [];
  const expenses = await getDbValue('expenses') || [];
  const templates = await getDbValue('templates') || [];
  const settings = await getDbValue('settings') || {};

  // Seed default templates and masters if empty
  const defaultMasters = masters.length > 0 ? masters : [
    { id: 'm1', name: 'Олександр (Ходовик)', defaultCommission: 40, active: true },
    { id: 'm2', name: 'Дмитро (Моторист)', defaultCommission: 45, active: true },
    { id: 'm3', name: 'Сергій (Електрик)', defaultCommission: 50, active: true }
  ];

  const defaultTemplates = templates.length > 0 ? templates : [
    {
      id: 't1',
      name: 'Регулярне ТО (Масло + Фільтри)',
      description: 'Заміна моторного масла, масляного, повітряного та салонного фільтрів',
      works: [
        { name: 'Заміна моторної оливи та масляного фільтра', price: 400, commissionPercent: 40 },
        { name: 'Заміна повітряного фільтра двигуна', price: 150, commissionPercent: 40 },
        { name: 'Заміна фільтра салону', price: 200, commissionPercent: 40 },
        { name: 'Комплексний огляд ходової частини', price: 300, commissionPercent: 50 },
      ],
      partsNeeded: [
        { name: 'Фільтр масляний', sku: 'OP-570', marginPercent: 20 },
        { name: 'Фільтр повітряний', sku: 'AP-139', marginPercent: 20 },
        { name: 'Фільтр салону вугільний', sku: 'K-1111', marginPercent: 20 },
      ]
    },
    {
      id: 't2',
      name: 'Обслуговування гальмівної системи (Перед)',
      description: 'Заміна передніх гальмівних колодок та дисків',
      works: [
        { name: 'Заміна передніх гальмівних колодок', price: 450, commissionPercent: 40 },
        { name: 'Заміна передніх гальмівних дисків', price: 800, commissionPercent: 40 },
        { name: 'Профілактика гальмівних супортів (змащення направляючих)', price: 300, commissionPercent: 40 },
      ],
      partsNeeded: [
        { name: 'Колодки гальмівні передні (комплект)', sku: 'BP-1024', marginPercent: 15 },
        { name: 'Диски гальмівні передні (пара)', sku: 'BD-8840', marginPercent: 15 },
      ]
    }
  ];

  return {
    meta,
    clients,
    orders,
    inventory,
    suppliers,
    masters: defaultMasters,
    expenses,
    templates: defaultTemplates,
    settings
  };
}

export async function saveFullDB(db: DBStructure): Promise<void> {
  await setDbValue('meta', db.meta);
  await setDbValue('clients', db.clients);
  await setDbValue('orders', db.orders);
  await setDbValue('inventory', db.inventory);
  await setDbValue('suppliers', db.suppliers);
  await setDbValue('masters', db.masters);
  await setDbValue('expenses', db.expenses);
  await setDbValue('templates', db.templates);
  await setDbValue('settings', db.settings);
}

function generateDeviceId(): string {
  let devId = localStorage.getItem('sto_device_id');
  if (!devId) {
    devId = 'dev_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
    localStorage.setItem('sto_device_id', devId);
  }
  return devId;
}
