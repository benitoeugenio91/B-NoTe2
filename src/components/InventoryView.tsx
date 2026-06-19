/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { InventoryItem, Supplier } from '../types';
import { 
  Boxes, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  Truck, 
  Check, 
  X, 
  Coins, 
  AlertCircle 
} from 'lucide-react';

export default function InventoryView() {
  const { 
    inventory, 
    suppliers, 
    addInventoryItem, 
    updateInventoryItem, 
    deleteInventoryItem,
    addSupplier, 
    updateSupplier, 
    deleteSupplier 
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'stock' | 'suppliers'>('stock');
  const [stockSearch, setStockSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  
  // Modal states
  const [showItemModal, setShowItemModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // Stock edit states
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(0);

  // Form: New Item
  const [itemForm, setItemForm] = useState({
    name: '',
    sku: '',
    analogs: '',
    quantity: 1,
    purchasePrice: 0,
  });

  // Form: New Supplier
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact: '',
    debt: 0,
  });

  // Filters
  const filteredStock = inventory.filter((item) => {
    const q = stockSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      (item.analogs && item.analogs.toLowerCase().includes(q))
    );
  });

  const filteredSuppliers = suppliers.filter((sup) => {
    const q = supplierSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      sup.name.toLowerCase().includes(q) ||
      sup.contact.toLowerCase().includes(q)
    );
  });

  // Handlers
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name || !itemForm.sku) {
      alert('Будь ласка, вкажіть назву та артикул (SKU).');
      return;
    }
    await addInventoryItem({
      name: itemForm.name,
      sku: itemForm.sku.toUpperCase(),
      analogs: itemForm.analogs,
      quantity: itemForm.quantity,
      purchasePrice: itemForm.purchasePrice,
    });
    setShowItemModal(false);
    setItemForm({ name: '', sku: '', analogs: '', quantity: 1, purchasePrice: 0 });
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name) {
      alert('Будь ласка, вкажіть ім\'я або назву постачальника.');
      return;
    }
    await addSupplier(supplierForm);
    setShowSupplierModal(false);
    setSupplierForm({ name: '', contact: '', debt: 0 });
  };

  const handleQuickQtyUpdate = async (item: InventoryItem) => {
    await updateInventoryItem(item.id, { quantity: editQty });
    setEditingItemId(null);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Tab Selectors header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-bg-surface border border-bg-border">
        
        <div className="flex border-b border-bg-border/60 pb-1 sm:pb-0 sm:border-b-0">
          <button
            onClick={() => setActiveTab('stock')}
            className={`pb-2.5 sm:pb-0 px-4 text-sm font-bold tracking-wide uppercase transition relative cursor-pointer ${
              activeTab === 'stock' ? 'text-accent font-black' : 'text-text-secondary hover:text-white'
            }`}
          >
            <span>На Складі ({inventory.length})</span>
            {activeTab === 'stock' && (
              <div className="absolute left-0 right-0 -bottom-3 sm:bottom-[-17px] h-0.5 bg-accent"></div>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`pb-2.5 sm:pb-0 px-4 text-sm font-bold tracking-wide uppercase transition relative cursor-pointer ${
              activeTab === 'suppliers' ? 'text-accent font-black' : 'text-text-secondary hover:text-white'
            }`}
          >
            <span>Постачальники ({suppliers.length})</span>
            {activeTab === 'suppliers' && (
              <div className="absolute left-0 right-0 -bottom-3 sm:bottom-[-17px] h-0.5 bg-accent"></div>
            )}
          </button>
        </div>

        {activeTab === 'stock' ? (
          <button
            onClick={() => setShowItemModal(true)}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-bg-base font-bold text-xs rounded-lg transition inline-flex items-center space-x-1 cursor-pointer"
          >
            <Boxes className="w-4 h-4" />
            <span>Оприбуткувати деталь</span>
          </button>
        ) : (
          <button
            onClick={() => setShowSupplierModal(true)}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-bg-base font-bold text-xs rounded-lg transition inline-flex items-center space-x-1 cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            <span>Новий Постачальник</span>
          </button>
        )}

      </div>

      {activeTab === 'stock' ? (
        /* STOCK OVERVIEW PART CATALOG */
        <div className="space-y-4">
          
          <div className="p-4 rounded-xl bg-bg-surface border border-bg-border flex items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <Boxes className="w-4.5 h-4.5 mr-2 text-accent" />
              <span>Каталог Автозапчастин склада</span>
            </h3>
            
            <div className="relative w-72">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Пошук за артикулом, назвою, аналогами..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="w-full bg-bg-base border border-bg-border text-xs rounded p-2 pl-9 outline-none text-white focus:border-accent placeholder-text-muted transition"
              />
            </div>
          </div>

          <div className="bg-bg-surface rounded-xl border border-bg-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-text-secondary border-collapse">
                <thead>
                  <tr className="border-b border-bg-border bg-bg-base/60 text-[10px] uppercase font-bold text-text-muted">
                    <th className="p-3.5">Запчастина / Опис</th>
                    <th className="p-3.5">Артикул / SKU</th>
                    <th className="p-3.5">Аналоги / Сумісність</th>
                    <th className="p-3.5 text-right">Ціна закупівлі</th>
                    <th className="p-3.5 text-center">Кількість на складі</th>
                    <th className="p-3.5 text-right">Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStock.length > 0 ? (
                    filteredStock.map((item) => (
                      <tr key={item.id} className="border-b border-bg-border/40 hover:bg-bg-base/20">
                        <td className="p-3.5 font-bold text-white">
                          {item.name}
                        </td>
                        <td className="p-3.5 font-mono font-medium text-accent">
                          {item.sku}
                        </td>
                        <td className="p-3.5 text-text-muted">
                          {item.analogs || <span className="italic text-2xs">Немає</span>}
                        </td>
                        <td className="p-3.5 text-right font-mono text-white text-sm">
                          {item.purchasePrice.toLocaleString()} ₴
                        </td>
                        <td className="p-3.5 text-center">
                          {editingItemId === item.id ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <input
                                type="number"
                                value={editQty}
                                onChange={(e) => setEditQty(Number(e.target.value))}
                                className="w-12 bg-bg-base border border-bg-border text-center rounded p-1 text-white outline-none"
                              />
                              <button
                                onClick={() => handleQuickQtyUpdate(item)}
                                className="p-1 bg-emerald-500 text-bg-base rounded hover:bg-emerald-600 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingItemId(null)}
                                className="p-1 bg-bg-elevated text-text-secondary rounded hover:text-white cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-2">
                              <span className={`px-2.5 py-0.5 rounded font-black text-sm ${
                                item.quantity === 0 
                                  ? 'bg-red-500/10 text-red-400' 
                                  : item.quantity <= 2 
                                  ? 'bg-amber-500/10 text-amber-400 animate-pulse' 
                                  : 'bg-bg-elevated text-emerald-400'
                              }`}>
                                {item.quantity} шт
                              </span>
                              <button
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setEditQty(item.quantity);
                                }}
                                className="text-text-muted hover:text-white transition cursor-pointer"
                                title="Форма швидкого коригування залишків"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-right text-text-muted">
                          <button
                            onClick={() => {
                              if (confirm(`Вилучити запчастину ${item.name} зі складу?`)) {
                                deleteInventoryItem(item.id);
                              }
                            }}
                            className="hover:text-red-500 p-1 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-text-muted italic">
                        Склад порожній або нічого не задовольняє пошуковий запит
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        /* SUPPLIERS VIEW TABLE DEBTS */
        <div className="space-y-4">
          
          <div className="p-4 rounded-xl bg-bg-surface border border-bg-border flex items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <Truck className="w-4.5 h-4.5 mr-2 text-accent" />
              <span>База та заборгованості перед постачальниками деталей</span>
            </h3>
            
            <div className="relative w-72">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Пошук постачальника..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="w-full bg-bg-base border border-bg-border text-xs rounded p-2 pl-9 outline-none text-white focus:border-accent placeholder-text-muted transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.length > 0 ? (
              filteredSuppliers.map((sup) => (
                <div
                  key={sup.id}
                  className="p-5 rounded-xl bg-gradient-to-br from-bg-surface to-bg-elevated border border-bg-border space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white tracking-wide">{sup.name}</h3>
                    <p className="text-xs text-text-secondary">
                      Контакт: <span className="text-text-primary ml-1">{sup.contact || 'відсутній'}</span>
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-bg-base border border-bg-border flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs text-text-muted">
                      <Coins className="w-4 h-4 text-text-muted" />
                      <span>Баланс боргу:</span>
                    </div>

                    <div className="text-right">
                      {sup.debt > 0 ? (
                        <div className="space-y-0.5">
                          <p className="text-xs text-red-400 font-extrabold">{sup.debt.toLocaleString()} ₴</p>
                          <span className="text-[9px] text-red-500/85 font-semibold bg-red-500/10 px-1.5 py-0.5 rounded flex items-center">
                            <AlertCircle className="w-3 h-3 mr-0.5" /> Боргуємо дистриб'ютору
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          Без боргів (Сплачено)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions to increase / decrease balance */}
                  <div className="flex items-center justify-between gap-2 border-t border-bg-border/40 pt-3">
                    <button
                      onClick={async () => {
                        const newDebt = prompt(`Змінити заборгованість для постачальника ${sup.name}:`, sup.debt.toString());
                        if (newDebt !== null && !isNaN(Number(newDebt))) {
                          await updateSupplier(sup.id, { debt: Number(newDebt) });
                        }
                      }}
                      className="px-3 py-1 bg-bg-elevated hover:bg-bg-border text-white rounded text-2xs font-semibold cursor-pointer transition border border-bg-border"
                    >
                      Редагувати баланс
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Дійсно видалити постачальника ${sup.name}?`)) {
                          deleteSupplier(sup.id);
                        }
                      }}
                      className="text-text-muted hover:text-red-500 transition p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              ))
            ) : (
              <div className="col-span-full p-8 bg-bg-surface rounded-xl border border-bg-border border-dashed text-center text-text-muted text-xs italic">
                Дистриб'юторів не виділено.
              </div>
            )}
          </div>

        </div>
      )}

      {/* MODAL: оприбуткувати нову деталь */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-bg-elevated border border-bg-border p-6 rounded-xl w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-bg-border/60 pb-3">
              <h3 className="text-md font-bold text-white flex items-center space-x-1.5 font-display uppercase tracking-wide">
                <Boxes className="w-5 h-5 text-accent" />
                <span>Оприбуткувати Нову Запчастину</span>
              </h3>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-text-muted hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-2xs font-bold text-text-secondary uppercase">Назва Запчастини *</label>
                <input
                  type="text"
                  required
                  placeholder="напр. Амортизатор лівий передній"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full bg-bg-base p-2.5 text-xs rounded border border-bg-border focus:border-accent text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-text-secondary uppercase">Артикул / SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="напр. OP-570"
                    value={itemForm.sku}
                    onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value.toUpperCase() })}
                    className="w-full bg-bg-base p-2.5 text-xs rounded border border-bg-border focus:border-accent font-mono text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-text-secondary uppercase">Сумісність / Аналоги</label>
                  <input
                    type="text"
                    placeholder="Golf 5, Jetta L"
                    value={itemForm.analogs}
                    onChange={(e) => setItemForm({ ...itemForm, analogs: e.target.value })}
                    className="w-full bg-bg-base p-2.5 text-xs rounded border border-bg-border focus:border-accent text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-text-secondary uppercase">Кількість (Шт)</label>
                  <input
                    type="number"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({ ...itemForm, quantity: Number(e.target.value) })}
                    className="w-full bg-bg-base p-2.5 text-xs rounded border border-bg-border focus:border-accent text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-text-secondary uppercase">Ціна закупівлі (₴)</label>
                  <input
                    type="number"
                    value={itemForm.purchasePrice || ''}
                    onChange={(e) => setItemForm({ ...itemForm, purchasePrice: Number(e.target.value) })}
                    className="w-full bg-bg-base p-2.5 text-xs rounded border border-bg-border focus:border-accent text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-x-2 border-t border-bg-border/60 pt-4">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 bg-bg-surface hover:bg-bg-base text-text-secondary text-xs font-semibold rounded cursor-pointer transition"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-bg-base font-bold text-xs rounded shadow-[0_4px_12px_rgba(249,115,22,0.15)] transition cursor-pointer"
                >
                  Прийняти партію
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Новий постачальник */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-bg-elevated border border-bg-border p-6 rounded-xl w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-bg-border/60 pb-3">
              <h3 className="text-md font-bold text-white flex items-center space-x-1.5 font-display uppercase tracking-wide">
                <Truck className="w-5 h-5 text-accent" />
                <span>Зареєструвати нового дистриб'ютора</span>
              </h3>
              <button
                onClick={() => setShowSupplierModal(false)}
                className="text-text-muted hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-2xs font-bold text-text-secondary uppercase">Назва Постачальника *</label>
                <input
                  type="text"
                  required
                  placeholder="напр. Автотехніка Плюс"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full bg-bg-base p-2.5 text-xs rounded border border-bg-border focus:border-accent text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold text-text-secondary uppercase">Телефон або контактна особа</label>
                <input
                  type="text"
                  placeholder="097-123-4567, Дмитро"
                  value={supplierForm.contact}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contact: e.target.value })}
                  className="w-full bg-bg-base p-2.5 text-xs rounded border border-bg-border focus:border-accent text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold text-text-secondary uppercase">Заборгованість перед ними (₴)</label>
                <input
                  type="number"
                  value={supplierForm.debt || ''}
                  onChange={(e) => setSupplierForm({ ...supplierForm, debt: Number(e.target.value) })}
                  className="w-full bg-bg-base p-2.5 text-xs rounded border border-bg-border focus:border-accent text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-x-2 border-t border-bg-border/60 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 bg-bg-surface hover:bg-bg-base text-text-secondary text-xs font-semibold rounded cursor-pointer transition"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-bg-base font-bold text-xs rounded shadow-[0_4px_12px_rgba(249,115,22,0.15)] transition cursor-pointer"
                >
                  Зберегти картку
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
