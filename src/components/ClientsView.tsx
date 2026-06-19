/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, DragEvent } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Client, CustomerTag, Order, PartRequirement, WorkItem, OrderStatus, ORDER_STATUS_LABELS, PART_REQ_STATUS_LABELS, PartReqStatus } from '../types';
import { 
  Users, 
  Search, 
  UserPlus, 
  Car, 
  Phone, 
  MapPin, 
  Tag, 
  Plus, 
  History, 
  Briefcase, 
  FileText, 
  Trash2, 
  Camera, 
  Check, 
  Calendar, 
  Info, 
  X, 
  TrendingUp, 
  CheckSquare, 
  Square,
  ChevronDown,
  Printer
} from 'lucide-react';

export default function ClientsView() {
  const { 
    clients, 
    orders, 
    masters, 
    templates, 
    inventory,
    currentClientId, 
    currentOrderId,
    addClient, 
    updateClient, 
    deleteClient, 
    addOrder, 
    updateOrder, 
    deleteOrder,
    setCurrentClient, 
    setCurrentOrder 
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  // Add Client Form state
  const [clientForm, setClientForm] = useState({
    name: '',
    phone: '',
    workPhone: '',
    city: 'Київ',
    tags: [] as CustomerTag[],
    carBrand: '',
    carModel: '',
    carYear: new Date().getFullYear(),
    vin: '',
  });

  // Create Order Form state
  const [orderForm, setOrderForm] = useState({
    complaints: '',
    masterId: masters[0]?.id || '',
    diagnosis: '',
    status: 'NEW' as OrderStatus,
    partsNeeded: [] as PartRequirement[],
    works: [] as WorkItem[],
    photos: [] as string[],
    paidAmount: 0,
  });

  // File upload state
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template toggle lists
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // 1. Filtering clients
  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.workPhone && c.workPhone.includes(q)) ||
      c.vin.toLowerCase().includes(q) ||
      c.carBrand.toLowerCase().includes(q) ||
      c.carModel.toLowerCase().includes(q)
    );
  });

  const selectedClient = clients.find(c => c.id === currentClientId);
  const selectedOrder = orders.find(o => o.id === currentOrderId);

  // Client's orders
  const clientOrders = orders.filter(o => o.clientId === currentClientId);
  const activeOrder = clientOrders.find(o => o.status !== 'PAID');
  const pastOrders = clientOrders.filter(o => o.status === 'PAID');

  // Handle Client creation
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name || !clientForm.phone || !clientForm.carBrand || !clientForm.carModel) {
      alert('Будь ласка, заповніть обов\'язкові поля: ПІБ, Телефон, Марка, Модель.');
      return;
    }
    await addClient(clientForm);
    setShowAddModal(false);
    // Reset
    setClientForm({
      name: '',
      phone: '',
      workPhone: '',
      city: 'Київ',
      tags: [],
      carBrand: '',
      carModel: '',
      carYear: new Date().getFullYear(),
      vin: '',
    });
  };

  const handleTagToggle = (tag: CustomerTag) => {
    setClientForm(prev => {
      const exists = prev.tags.includes(tag);
      return {
        ...prev,
        tags: exists ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
      };
    });
  };

  // Drag and Drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const fileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const processFiles = (files: FileList) => {
    const totalFiles = (orderForm.photos?.length || 0) + files.length;
    if (totalFiles > 5) {
      alert('Можна завантажити не більше 5 фото.');
      return;
    }

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setOrderForm((prev) => ({
            ...prev,
            photos: [...(prev.photos || []), reader.result as string],
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setOrderForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  // Quick Template applying options
  const applyTemplate = (tplId: string) => {
    const tpl = templates.find(t => t.id === tplId);
    if (!tpl) return;

    // Load templates parts and labor
    const mappedWorks: WorkItem[] = tpl.works.map(w => ({
      id: 'work_' + Math.random().toString(36).substring(2, 6) + '_' + Date.now(),
      name: w.name,
      price: w.price,
      masterId: orderForm.masterId,
      masterCommissionPercent: w.commissionPercent,
    }));

    const mappedParts: PartRequirement[] = tpl.partsNeeded.map(p => {
      // Find in stock to grab sku / pricing
      const stockItem = inventory.find(i => i.sku.trim().toLowerCase() === p.sku.trim().toLowerCase());
      const purchasePrice = stockItem ? stockItem.purchasePrice : 0;
      const clientPrice = purchasePrice > 0 
        ? Math.round(purchasePrice * (1 + p.marginPercent / 100)) 
        : 0;

      return {
        id: 'part_' + Math.random().toString(36).substring(2, 6) + '_' + Date.now(),
        name: p.name,
        sku: p.sku,
        status: 'SEARCHING' as PartReqStatus,
        purchasePrice,
        marginPercent: p.marginPercent,
        clientPrice,
      };
    });

    setOrderForm(prev => ({
      ...prev,
      works: [...prev.works, ...mappedWorks],
      partsNeeded: [...prev.partsNeeded, ...mappedParts]
    }));
  };

  // Add customized parts / works
  const addCustomWork = () => {
    const defaultMaster = masters[0];
    const newWork: WorkItem = {
      id: 'work_' + Math.random().toString(36).substring(2, 6) + '_' + Date.now(),
      name: '',
      price: 0,
      masterId: orderForm.masterId || defaultMaster?.id || 'm1',
      masterCommissionPercent: defaultMaster?.defaultCommission || 40,
    };
    setOrderForm(prev => ({ ...prev, works: [...prev.works, newWork] }));
  };

  const addCustomPart = () => {
    const newPart: PartRequirement = {
      id: 'part_' + Math.random().toString(36).substring(2, 6) + '_' + Date.now(),
      name: '',
      sku: '',
      status: 'SEARCHING',
      purchasePrice: 0,
      marginPercent: 20,
      clientPrice: 0,
    };
    setOrderForm(prev => ({ ...prev, partsNeeded: [...prev.partsNeeded, newPart] }));
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClientId) return;

    const created = await addOrder({
      clientId: currentClientId,
      complaints: orderForm.complaints,
      photos: orderForm.photos,
      masterId: orderForm.masterId,
      diagnosis: orderForm.diagnosis,
      status: orderForm.status,
      partsNeeded: orderForm.partsNeeded,
      works: orderForm.works,
      paidAmount: Number(orderForm.paidAmount) || 0,
    });

    setShowOrderModal(false);
    setCurrentOrder(created.id);
    setActiveTab('current');
    
    // Clear Form
    setOrderForm({
      complaints: '',
      masterId: masters[0]?.id || '',
      diagnosis: '',
      status: 'NEW',
      partsNeeded: [],
      works: [],
      photos: [],
      paidAmount: 0,
    });
  };

  // Status-dependent labels & designs
  const tagColorClass = (tag: CustomerTag) => {
    switch(tag) {
      case 'VIP': return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
      case 'PROBLEM': return 'bg-red-500/15 text-red-500 border-red-500/30';
      case 'PREPAY': return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
    }
  };

  const orderStatusColor = (status: OrderStatus) => {
    switch(status) {
      case 'NEW': return 'bg-blue-500/15 text-blue-400';
      case 'DIAGNOSIS': return 'bg-purple-500/15 text-purple-400';
      case 'APPROVAL': return 'bg-amber-500/15 text-amber-500';
      case 'WAITING_PARTS': return 'bg-indigo-500/15 text-indigo-400';
      case 'IN_WORK': return 'bg-accent/15 text-accent';
      case 'READY': return 'bg-emerald-500/15 text-emerald-400';
      case 'PAID': return 'bg-slate-500/15 text-slate-400';
    }
  };

  // Instant receipt generator / printing
  const [printDocumentType, setPrintDocumentType] = useState<'estimate' | 'bill' | 'internal' | null>(null);

  const calculateTotals = (o: Order) => {
    const worksTotal = o.works.reduce((s, w) => s + w.price, 0);
    const partsTotal = o.partsNeeded.reduce((s, p) => s + p.clientPrice, 0);
    const total = worksTotal + partsTotal;
    const debt = Math.max(0, total - o.paidAmount);
    
    const partsPurchaseTotal = o.partsNeeded.reduce((s, p) => s + p.purchasePrice, 0);
    const masterSalariesTotal = o.works.reduce((s, w) => s + (w.price * (w.masterCommissionPercent / 100)), 0);
    const profit = o.paidAmount - partsPurchaseTotal - masterSalariesTotal;

    return { worksTotal, partsTotal, total, debt, profit, partsPurchaseTotal, masterSalariesTotal };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* Left Column: List and Search */}
      <div className="space-y-4">
        
        {/* Search header bar */}
        <div className="p-4 rounded-xl bg-bg-surface border border-bg-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-md font-bold text-white flex items-center space-x-1.5 font-display uppercase tracking-wide">
              <Users className="w-5 h-5 text-accent" />
              <span>База Клієнтів</span>
            </h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="p-2 bg-accent hover:bg-accent-hover text-bg-base hover:scale-105 active:scale-95 rounded-lg transition inline-flex items-center space-x-1 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span className="text-xs font-bold font-sans">Новий Клієнт</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4.5 h-4.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Шукати за ім'ям, телефоном, авто або VIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg-base pl-10 pr-4 py-2 text-sm rounded-lg border border-bg-border focus:border-accent text-white outline-none placeholder-text-muted transition"
            />
          </div>
        </div>

        {/* Client Row cards list wrapper */}
        <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
          {filteredClients.length > 0 ? (
            filteredClients.map((client) => {
              const isActive = client.id === currentClientId;
              const cliOrders = orders.filter(o => o.clientId === client.id);
              const activeCarOrder = cliOrders.find(o => o.status !== 'PAID');

              return (
                <div
                  key={client.id}
                  onClick={() => {
                    setCurrentClient(client.id);
                    // Match their active order if existing, else default to null
                    setCurrentOrder(activeCarOrder ? activeCarOrder.id : (cliOrders[0]?.id || null));
                  }}
                  className={`p-4 rounded-xl transition border text-left cursor-pointer flex flex-col justify-between space-y-3 ${
                    isActive
                      ? 'bg-gradient-to-r from-bg-surface to-bg-elevated border-accent shadow-[0_4px_15px_rgba(249,115,22,0.15)]'
                      : 'bg-bg-surface border-bg-border hover:border-bg-border/100'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm font-bold text-white tracking-wide">
                        {client.name}
                      </h3>
                      <span className="text-2xs text-text-muted font-normal font-mono">
                        {client.city}
                      </span>
                    </div>

                    <p className="text-xs text-text-secondary flex items-center space-x-1">
                      <Phone className="w-3 h-3 text-text-muted" />
                      <span>{client.phone}</span>
                    </p>

                    <div className="flex items-center text-xs font-medium text-text-primary mt-1">
                      <Car className="w-3.5 h-3.5 mr-1.5 text-accent/80" />
                      <span>{client.carBrand} {client.carModel} ({client.carYear})</span>
                    </div>
                  </div>

                  {/* Footers, badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-bg-border/40 pt-2.5">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {client.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-bg-elevated/40"
                          style={{
                            color: t === 'VIP' ? '#f59e0b' : t === 'PROBLEM' ? '#ef4444' : '#10b981',
                            borderColor: t === 'VIP' ? 'rgba(245,158,11,0.2)' : t === 'PROBLEM' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                          }}
                        >
                          {t}
                        </span>
                      ))}
                      {client.tags.length === 0 && (
                        <span className="text-[10px] text-text-muted italic">Без міток</span>
                      )}
                    </div>

                    {/* Active Order Status Indicator */}
                    {activeCarOrder ? (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${orderStatusColor(activeCarOrder.status)}`}>
                        {ORDER_STATUS_LABELS[activeCarOrder.status]}
                      </span>
                    ) : (
                      <span className="text-[10px] text-text-muted font-normal">
                        Вільний
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 bg-bg-surface rounded-xl border border-bg-border border-dashed text-center">
              <Users className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-secondary font-medium">Клієнтів не знайдено</p>
              <p className="text-xs text-text-muted mt-1">Оновіть запит або додайте першого користувача.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Detail Profile and Card view */}
      <div className="lg:col-span-2 space-y-6">
        {selectedClient ? (
          <div className="space-y-5">
            
            {/* 1. Client Card Top Profile */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-bg-surface to-bg-elevated border border-bg-border space-y-5">
              
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-accent uppercase tracking-widest font-sans">Картка Клієнта</span>
                  <h2 className="text-xl font-bold font-display text-white">{selectedClient.name}</h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-secondary pt-1">
                    <span className="flex items-center"><Phone className="w-3.5 h-3.5 mr-1 text-text-muted" /> {selectedClient.phone}</span>
                    {selectedClient.workPhone && <span className="flex items-center"><Phone className="w-3.5 h-3.5 mr-1 text-text-muted" /> {selectedClient.workPhone}</span>}
                    <span className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1 text-text-muted" /> {selectedClient.city}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      if (confirm(`Дійсно видалити клієнта ${selectedClient.name}? Усі його оперативні наряди також будуть видалені.`)) {
                        deleteClient(selectedClient.id);
                      }
                    }}
                    className="p-2 border border-red-500/20 hover:border-red-500 text-red-500 rounded-lg text-xs hover:bg-red-500/10 cursor-pointer transition inline-flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Видалити</span>
                  </button>
                  <button
                    onClick={() => {
                      // Prepopulate creating order
                      setOrderForm({
                        complaints: '',
                        masterId: masters[0]?.id || '',
                        diagnosis: '',
                        status: 'NEW',
                        partsNeeded: [],
                        works: [],
                        photos: [],
                        paidAmount: 0,
                      });
                      setShowOrderModal(true);
                    }}
                    className="px-4 py-2 bg-accent hover:bg-accent-hover text-bg-base font-bold text-xs rounded-lg cursor-pointer transition inline-flex items-center space-x-1 shadow-[0_4px_12px_rgba(249,115,22,0.15)]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Нове Замовлення</span>
                  </button>
                </div>

              </div>

              {/* Tag Selector Pill form */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-bg-border/40">
                <span className="text-xs text-text-muted font-medium flex items-center"><Tag className="w-3.5 h-3.5 mr-1" /> Мітки:</span>
                {(['VIP', 'PROBLEM', 'PREPAY'] as CustomerTag[]).map(t => {
                  const hasTag = selectedClient.tags.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={async () => {
                        const nextTags = hasTag 
                          ? selectedClient.tags.filter(tag => tag !== t)
                          : [...selectedClient.tags, t];
                        await updateClient(selectedClient.id, { tags: nextTags });
                      }}
                      className={`px-3 py-1 text-2xs font-extrabold uppercase rounded-full cursor-pointer transition border ${
                        hasTag 
                          ? tagColorClass(t)
                          : 'border-bg-border bg-bg-base text-text-secondary hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>

              {/* Car Profile Info */}
              <div className="p-4 rounded-xl bg-bg-base border border-bg-border grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 border-b md:border-b-0 md:border-r border-bg-border/60 pb-3 md:pb-0 md:pr-4">
                  <p className="text-[10px] font-semibold text-text-muted tracking-wide uppercase">Специфікація автомобіля</p>
                  <div className="flex items-center space-x-2 pt-1 font-display">
                    <Car className="w-5 h-5 text-accent" />
                    <span className="text-white font-extrabold">{selectedClient.carBrand} {selectedClient.carModel}</span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Рік випуску: <span className="text-text-primary font-medium">{selectedClient.carYear}</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-text-muted tracking-wide uppercase">Кузов та ідентифікація</p>
                  <div className="pt-1 font-mono text-xs">
                    <span className="text-text-muted">VIN:</span> <span className="text-white font-bold select-all">{selectedClient.vin || 'Не вказано'}</span>
                  </div>
                  <p className="text-[10px] text-text-secondary">Шасі автомобіля для правильного підбору деталей.</p>
                </div>
              </div>

            </div>

            {/* 2. Tabs Selector: History vs Active */}
            <div className="flex border-b border-bg-border">
              <button
                onClick={() => setActiveTab('current')}
                className={`pb-3 text-sm font-bold tracking-wide uppercase px-4 cursor-pointer transition relative ${
                  activeTab === 'current' ? 'text-accent' : 'text-text-secondary hover:text-white'
                }`}
              >
                <span>Поточне замовлення</span>
                {activeTab === 'current' && (
                  <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-accent"></div>
                )}
              </button>
              
              <button
                onClick={() => setActiveTab('history')}
                className={`pb-3 text-sm font-bold tracking-wide uppercase px-4 flex items-center space-x-1.5 cursor-pointer transition relative ${
                  activeTab === 'history' ? 'text-accent' : 'text-text-secondary hover:text-white'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Історія нарядів ({pastOrders.length})</span>
                {activeTab === 'history' && (
                  <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-accent"></div>
                )}
              </button>
            </div>

            {/* 3. Tab contents displays */}
            {activeTab === 'current' ? (
              activeOrder ? (
                <div className="p-5 rounded-xl bg-bg-surface border border-bg-border space-y-6">
                  
                  {/* Active Order Header */}
                  <div className="space-y-1 pb-4 border-b border-bg-border/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-2xs font-extrabold tracking-wider uppercase ${orderStatusColor(activeOrder.status)}`}>
                          {ORDER_STATUS_LABELS[activeOrder.status]}
                        </span>
                        <span className="text-xs font-mono text-text-muted">ID: {activeOrder.id}</span>
                      </div>
                      
                      {/* Documents popup actions */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setPrintDocumentType('estimate');
                          }}
                          className="p-1 px-2.5 bg-bg-elevated hover:bg-bg-border border border-bg-border rounded text-2xs font-bold text-text-primary flex items-center space-x-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3 text-accent" />
                          <span>Смета</span>
                        </button>
                        <button
                          onClick={() => {
                            setPrintDocumentType('bill');
                          }}
                          className="p-1 px-2.5 bg-bg-elevated hover:bg-bg-border border border-bg-border rounded text-2xs font-bold text-text-primary flex items-center space-x-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3 text-emerald-400" />
                          <span>Акт</span>
                        </button>
                        <button
                          onClick={() => {
                            setPrintDocumentType('internal');
                          }}
                          className="p-1 px-2.5 bg-bg-elevated hover:bg-bg-border border border-bg-border rounded text-2xs font-bold text-text-primary flex items-center space-x-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3 text-purple-400" />
                          <span>Бланк</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-3 text-xs text-text-secondary">
                      <p>Створено: <span className="text-white font-medium">{new Date(activeOrder.createdAt).toLocaleDateString()}</span></p>
                      <p>Оновлено: <span className="text-white font-medium">{new Date(activeOrder.updatedAt).toLocaleDateString()}</span></p>
                    </div>
                  </div>

                  {/* Manual Status Toggle */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Перемкнути Статус Наряду:</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
                      {(['NEW', 'DIAGNOSIS', 'APPROVAL', 'WAITING_PARTS', 'IN_WORK', 'READY', 'PAID'] as OrderStatus[]).map(status => (
                        <button
                          key={status}
                          onClick={() => updateOrder(activeOrder.id, { status })}
                          className={`py-1.5 rounded text-[10px] font-bold uppercase transition flex items-center justify-center cursor-pointer ${
                            activeOrder.status === status
                              ? 'bg-accent text-bg-base border border-accent shadow-[0_2px_8px_rgba(249,115,22,0.3)]'
                              : 'bg-bg-base text-text-secondary border border-bg-border hover:text-white'
                          }`}
                        >
                          {ORDER_STATUS_LABELS[status]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Complaints field */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center">
                      <Briefcase className="w-3.5 h-3.5 mr-1.5 text-accent" />
                      <span>Скарги Клієнта:</span>
                    </p>
                    <div className="p-3 bg-bg-base border border-bg-border rounded-lg text-sm text-text-primary italic">
                      "{activeOrder.complaints || 'Скарги відсутні.'}"
                    </div>
                  </div>

                  {/* Diagnosis Report field */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Висновки та коментарі діагностики:</p>
                    <textarea
                      placeholder="Введіть результати дефектовки автомобіля..."
                      value={activeOrder.diagnosis || ''}
                      onChange={(e) => updateOrder(activeOrder.id, { diagnosis: e.target.value })}
                      className="w-full h-20 bg-bg-base p-3 text-sm rounded-lg border border-bg-border focus:border-accent text-white outline-none placeholder-text-muted transition"
                    />
                  </div>

                  {/* Photos segment */}
                  {activeOrder.photos?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center">
                        <Camera className="w-3.5 h-3.5 mr-1.5 text-accent" />
                        <span>Фотофіксація Стан Авто ({activeOrder.photos.length}):</span>
                      </p>
                      <div className="flex flex-wrap gap-2.5">
                        {activeOrder.photos.map((ph, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-bg-border group">
                            <img src={ph} alt="" className="w-full h-full object-cover" />
                            <a
                              href={ph}
                              download={`photo_${activeOrder.id}_${i}.png`}
                              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs font-bold text-white hover:underline uppercase"
                            >
                              Див
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Part requirement control blocks */}
                  <div className="space-y-4 border-t border-bg-border/60 pt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-white uppercase tracking-widest flex items-center">
                        <Plus className="w-4 h-4 mr-1 text-accent" />
                        <span>Потреби замовлення (запчастини)</span>
                      </p>
                      <button
                        onClick={() => {
                          const newPart: PartRequirement = {
                            id: 'part_' + Math.random().toString(36).substring(2, 6) + '_' + Date.now(),
                            name: '',
                            sku: '',
                            status: 'SEARCHING',
                            purchasePrice: 0,
                            marginPercent: 20,
                            clientPrice: 0,
                          };
                          updateOrder(activeOrder.id, { partsNeeded: [...activeOrder.partsNeeded, newPart] });
                        }}
                        className="py-1 px-2 border border-accent/25 hover:border-accent text-accent hover:bg-accent-soft rounded text-2xs font-extrabold uppercase transition flex items-center space-x-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Додати деталь</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {activeOrder.partsNeeded?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs text-text-secondary border-collapse">
                            <thead>
                              <tr className="border-b border-bg-border text-[10px] uppercase font-bold text-text-muted">
                                <th className="py-2 pr-2">Деталь</th>
                                <th className="py-2 px-2">Артикул / SKU</th>
                                <th className="py-2 px-2">Статус</th>
                                <th className="py-2 px-2">Закупівля (₴)</th>
                                <th className="py-2 px-2">Маржа</th>
                                <th className="py-2 px-2">Ціна Клієнт (₴)</th>
                                <th className="py-2 pl-2">Дії</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeOrder.partsNeeded.map((part) => {
                                const updatePartField = (field: keyof PartRequirement, val: any) => {
                                  const updatedParts = activeOrder.partsNeeded.map(p => {
                                    if (p.id === part.id) {
                                      const merged = { ...p, [field]: val };
                                      // Re-calculate clientPrice if purchasePrice or marginPercent is modified
                                      if (field === 'purchasePrice' || field === 'marginPercent') {
                                        merged.clientPrice = Math.round(Number(merged.purchasePrice) * (1 + Number(merged.marginPercent) / 100));
                                      }
                                      return merged;
                                    }
                                    return p;
                                  });
                                  updateOrder(activeOrder.id, { partsNeeded: updatedParts });
                                };

                                return (
                                  <tr key={part.id} className="border-b border-bg-border/40 hover:bg-bg-base/40">
                                    <td className="py-2 pr-2">
                                      <input
                                        type="text"
                                        placeholder="Назва деталі"
                                        value={part.name}
                                        onChange={(e) => updatePartField('name', e.target.value)}
                                        className="w-full bg-transparent border-b border-transparent focus:border-accent text-white outline-none"
                                      />
                                    </td>
                                    <td className="py-2 px-2">
                                      <input
                                        type="text"
                                        placeholder="SKU"
                                        value={part.sku}
                                        onChange={(e) => updatePartField('sku', e.target.value)}
                                        className="w-24 bg-transparent border-b border-transparent focus:border-accent font-mono text-white outline-none"
                                      />
                                    </td>
                                    <td className="py-2 px-2">
                                      <select
                                        value={part.status}
                                        onChange={(e) => updatePartField('status', e.target.value)}
                                        className="bg-bg-elevated text-white border border-bg-border rounded p-1 text-2xs outline-none"
                                      >
                                        {(['SEARCHING', 'ORDERED', 'SHIPPED', 'RECEIVED'] as PartReqStatus[]).map(st => (
                                          <option key={st} value={st}>{PART_REQ_STATUS_LABELS[st]}</option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="py-2 px-2">
                                      <input
                                        type="number"
                                        value={part.purchasePrice}
                                        onChange={(e) => updatePartField('purchasePrice', Number(e.target.value))}
                                        className="w-16 bg-transparent border-b border-transparent focus:border-accent text-white outline-none"
                                      />
                                    </td>
                                    <td className="py-2 px-2">
                                      {/* Quick percent buttons */}
                                      <div className="flex flex-col items-center gap-1">
                                        <input
                                          type="number"
                                          value={part.marginPercent}
                                          onChange={(e) => updatePartField('marginPercent', Number(e.target.value))}
                                          className="w-12 bg-transparent border-b border-transparent focus:border-accent text-center text-white outline-none"
                                        />
                                        <div className="flex gap-0.5">
                                          {[10, 20, 30].map(pc => (
                                            <button
                                              key={pc}
                                              onClick={() => updatePartField('marginPercent', pc)}
                                              className={`text-[9px] px-0.5 rounded ${part.marginPercent === pc ? 'bg-accent text-bg-base' : 'bg-bg-elevated'}`}
                                            >
                                              {pc}%
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 font-bold text-white">
                                      {part.clientPrice.toLocaleString()} ₴
                                    </td>
                                    <td className="py-2 pl-2">
                                      <button
                                        onClick={() => {
                                          const next = activeOrder.partsNeeded.filter(p => p.id !== part.id);
                                          updateOrder(activeOrder.id, { partsNeeded: next });
                                        }}
                                        className="text-text-muted hover:text-red-500 transition cursor-pointer"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-text-muted italic">Жодних запчастин не додано.</p>
                      )}
                    </div>
                  </div>

                  {/* Works / Labor checklist */}
                  <div className="space-y-4 border-t border-bg-border/60 pt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-white uppercase tracking-widest flex items-center">
                        <Plus className="w-4 h-4 mr-1 text-accent" />
                        <span>Роботи по замовленню</span>
                      </p>
                      <button
                        onClick={() => {
                          const defaultMaster = masters[0];
                          const newWork: WorkItem = {
                            id: 'work_' + Math.random().toString(36).substring(2, 6) + '_' + Date.now(),
                            name: '',
                            price: 0,
                            masterId: activeOrder.masterId || defaultMaster?.id || 'm1',
                            masterCommissionPercent: defaultMaster?.defaultCommission || 40,
                          };
                          updateOrder(activeOrder.id, { works: [...activeOrder.works, newWork] });
                        }}
                        className="py-1 px-2 border border-accent/25 hover:border-accent text-accent hover:bg-accent-soft rounded text-2xs font-extrabold uppercase transition flex items-center space-x-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Додати роботу</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {activeOrder.works?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs text-text-secondary border-collapse">
                            <thead>
                              <tr className="border-b border-bg-border text-[10px] uppercase font-bold text-text-muted">
                                <th className="py-2 pr-2">Робота</th>
                                <th className="py-2 px-2">Виконавець (Майстер)</th>
                                <th className="py-2 px-2">Ціна (₴)</th>
                                <th className="py-2 px-2">ЗП майстра (%)</th>
                                <th className="py-2 px-2">До виплати (₴)</th>
                                <th className="py-2 pl-2">Дії</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeOrder.works.map((work) => {
                                const updateWorkField = (field: keyof WorkItem, val: any) => {
                                  // Update the commission if masterId matches the master
                                  let nextComm = work.masterCommissionPercent;
                                  if (field === 'masterId') {
                                    const m = masters.find(ma => ma.id === val);
                                    if (m) nextComm = m.defaultCommission;
                                  }
                                  const updatedWorks = activeOrder.works.map(w =>
                                    w.id === work.id 
                                      ? { 
                                          ...w, 
                                          [field]: val, 
                                          masterCommissionPercent: field === 'masterId' ? nextComm : w.masterCommissionPercent 
                                        } 
                                      : w
                                  );
                                  updateOrder(activeOrder.id, { works: updatedWorks });
                                };

                                return (
                                  <tr key={work.id} className="border-b border-bg-border/40 hover:bg-bg-base/40">
                                    <td className="py-2 pr-2">
                                      <input
                                        type="text"
                                        placeholder="Назва послуги"
                                        value={work.name}
                                        onChange={(e) => updateWorkField('name', e.target.value)}
                                        className="w-full bg-transparent border-b border-transparent focus:border-accent text-white outline-none"
                                      />
                                    </td>
                                    <td className="py-2 px-2">
                                      <select
                                        value={work.masterId}
                                        onChange={(e) => updateWorkField('masterId', e.target.value)}
                                        className="bg-bg-elevated text-white border border-bg-border rounded p-1 text-2xs outline-none"
                                      >
                                        {masters.map(m => (
                                          <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="py-1 px-2">
                                      <input
                                        type="number"
                                        value={work.price}
                                        onChange={(e) => updateWorkField('price', Number(e.target.value))}
                                        className="w-16 bg-transparent border-b border-transparent focus:border-accent font-bold text-white outline-none"
                                      />
                                    </td>
                                    <td className="py-1 px-2">
                                      <input
                                        type="number"
                                        value={work.masterCommissionPercent}
                                        onChange={(e) => updateWorkField('masterCommissionPercent', Number(e.target.value))}
                                        className="w-12 bg-transparent border-b border-transparent focus:border-accent text-center outline-none"
                                      />
                                    </td>
                                    <td className="py-1 px-2 font-mono text-[11px]">
                                      {Math.round(work.price * (work.masterCommissionPercent / 100)).toLocaleString()} ₴
                                    </td>
                                    <td className="py-1 pl-2">
                                      <button
                                        onClick={() => {
                                          const next = activeOrder.works.filter(w => w.id !== work.id);
                                          updateOrder(activeOrder.id, { works: next });
                                        }}
                                        className="text-text-muted hover:text-red-500 transition cursor-pointer"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-text-muted italic">Жодних робіт не зафіксовано.</p>
                      )}
                    </div>
                  </div>

                  {/* Financial control widget */}
                  <div className="p-4 rounded-xl bg-bg-base border border-bg-border grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    {(() => {
                      const stats = calculateTotals(activeOrder);
                      return (
                        <>
                          <div className="space-y-1">
                            <p className="text-[10px] text-text-secondary uppercase">Підсумковий баланс</p>
                            <div className="text-xs text-text-muted space-y-0.5">
                              <p>Роботи: <span className="text-white font-medium">{stats.worksTotal.toLocaleString()} ₴</span></p>
                              <p>Запчастини: <span className="text-white font-medium">{stats.partsTotal.toLocaleString()} ₴</span></p>
                            </div>
                            <p className="text-lg font-black text-accent">{stats.total.toLocaleString()} ₴</p>
                          </div>

                          <div className="space-y-1 md:border-l md:border-r border-bg-border/60 md:px-4">
                            <p className="text-[10px] text-text-secondary uppercase">Оплачено (Частинами)</p>
                            <input
                              type="number"
                              value={activeOrder.paidAmount}
                              onChange={(e) => updateOrder(activeOrder.id, { paidAmount: Number(e.target.value) })}
                              className="w-full bg-bg-surface p-1.5 border border-bg-border rounded focus:border-accent font-extrabold text-sm text-emerald-400 outline-none"
                            />
                            <p className="text-[10px] text-text-muted">Вводьте оплати клієнта вручну тут.</p>
                          </div>

                          <div className="space-y-1 text-right">
                            <p className="text-[10px] text-text-secondary uppercase">Різниця до сплати</p>
                            <p className={`text-xl font-bold ${stats.debt > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {stats.debt === 0 ? 'Оплачено' : `${stats.debt.toLocaleString()} ₴`}
                            </p>
                            <p className="text-[10px] text-text-muted">
                              {stats.debt > 0 ? 'Залишився неоплачений борг' : 'Розрахунок закритий повністю'}
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="flex justify-end gap-x-2">
                    <button
                      onClick={() => {
                        if (confirm('Дійсно видалити це замовлення?')) {
                          deleteOrder(activeOrder.id);
                        }
                      }}
                      className="px-4 py-2 border border-red-500/10 hover:border-red-500 text-red-500 hover:bg-red-500/15 text-xs font-semibold rounded-lg transition text-center cursor-pointer"
                    >
                      Видалити наряд
                    </button>
                    <button
                      onClick={() => updateOrder(activeOrder.id, { status: 'PAID' })}
                      className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-bg-base font-bold text-xs rounded-lg transition text-center shadow-[0_4px_12px_rgba(16,185,129,0.15)] cursor-pointer"
                    >
                      Закрити та Оплатити
                    </button>
                  </div>

                </div>
              ) : (
                <div className="p-12 text-center rounded-xl bg-bg-surface border border-bg-border/60 border-dashed flex flex-col items-center">
                  <Briefcase className="w-10 h-10 text-text-muted mb-3" />
                  <p className="text-sm text-text-primary font-bold">Активного замовлення немає</p>
                  <p className="text-xs text-text-secondary mt-1 max-w-sm mb-4">Автомобіль зараз не перебуває у ремонтній зоні.</p>
                  <button
                    onClick={() => {
                      setOrderForm({
                        complaints: '',
                        masterId: masters[0]?.id || '',
                        diagnosis: '',
                        status: 'NEW',
                        partsNeeded: [],
                        works: [],
                        photos: [],
                        paidAmount: 0,
                      });
                      setShowOrderModal(true);
                    }}
                    className="px-4 py-2 bg-accent hover:bg-accent-hover text-bg-base font-bold text-xs rounded-lg cursor-pointer transition flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Створити Наряд</span>
                  </button>
                </div>
              )
            ) : (
              /* History TAB */
              <div className="space-y-3">
                {pastOrders.length > 0 ? (
                  pastOrders.map((o) => {
                    const stats = calculateTotals(o);
                    return (
                      <div
                        key={o.id}
                        onClick={() => {
                          setCurrentOrder(o.id);
                          setActiveTab('current');
                        }}
                        className="p-4 rounded-xl bg-bg-surface border border-bg-border hover:border-bg-border/100 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1 text-left">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xs font-bold px-2 py-0.5 rounded bg-slate-500/10 text-slate-400">
                              Закрито
                            </span>
                            <span className="text-xs font-mono text-text-muted">{o.id.split('_')[1]}</span>
                          </div>
                          <p className="text-sm font-bold text-white">
                            {o.works.map(w => w.name).join(', ') || 'Комплексний ремонт'}
                          </p>
                          <p className="text-xs text-text-secondary flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-text-muted" />
                            <span>Закрито: {new Date(o.updatedAt).toLocaleDateString()}</span>
                          </p>
                        </div>

                        <div className="sm:text-right">
                          <p className="text-[10px] text-text-secondary uppercase">Загальний чек</p>
                          <p className="text-sm font-black text-white">{stats.total.toLocaleString()} ₴</p>
                          <p className="text-[10px] text-emerald-400 font-semibold">Оплачено повністю</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center rounded-xl bg-bg-surface border border-bg-border/40 text-xs text-text-muted italic">
                    Записей в історії не знайдено.
                  </div>
                )}
              </div>
            )}

          </div>
        ) : (
          <div className="h-[60vh] rounded-xl bg-bg-surface/50 border border-bg-border border-dashed flex flex-col items-center justify-center p-6 text-center">
            <Users className="w-12 h-12 text-text-muted mb-3" />
            <h3 className="text-md font-bold text-white">Картку не обрано</h3>
            <p className="text-xs text-text-secondary mt-1 max-w-sm">
              Виберіть клієнта зі списку ліворуч, щоб переглянути його повний профільного стану, історію ремонтів, або створити нове замовлення-наряд.
            </p>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD CLIENT PANEL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-bg-elevated border border-bg-border p-6 rounded-xl w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between border-b border-bg-border/60 pb-3">
              <h3 className="text-md font-bold text-white flex items-center space-x-1.5 font-display uppercase tracking-wide">
                <UserPlus className="w-5 h-5 text-accent" />
                <span>Реєстрація Нового Клієнта</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-text-muted hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-text-secondary uppercase">ПІБ Клієнта *</label>
                  <input
                    type="text"
                    required
                    placeholder="напр. Іванов Сергій Леонідович"
                    value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    className="w-full bg-bg-base p-2.5 text-xs rounded border border-bg-border focus:border-accent text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-text-secondary uppercase">Мобільний Телефон *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+380... або 0..."
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    className="w-full bg-bg-base p-2.5 text-xs rounded border border-bg-border focus:border-accent text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-text-secondary uppercase">Додатковий Телефон</label>
                  <input
                    type="tel"
                    placeholder="Робочий або стаціонарний"
                    value={clientForm.workPhone}
                    onChange={(e) => setClientForm({ ...clientForm, workPhone: e.target.value })}
                    className="w-full bg-bg-base p-2.5 text-xs rounded border border-bg-border focus:border-accent text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-text-secondary uppercase">Населений пункт</label>
                  <input
                    type="text"
                    placeholder="Київ, Бровари, тощо"
                    value={clientForm.city}
                    onChange={(e) => setClientForm({ ...clientForm, city: e.target.value })}
                    className="w-full bg-bg-base p-2.5 text-xs rounded border border-bg-border focus:border-accent text-white outline-none"
                  />
                </div>
              </div>

              {/* Tags panel */}
              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-text-secondary uppercase">Швидкі мітки клієнта</label>
                <div className="flex gap-2">
                  {(['VIP', 'PROBLEM', 'PREPAY'] as CustomerTag[]).map(tag => {
                    const active = clientForm.tags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        className={`text-2xs px-3 py-1.5 font-bold uppercase rounded-lg border ${
                          active ? tagColorClass(tag) : 'bg-bg-base text-text-muted border-bg-border'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Car panel info */}
              <div className="border-t border-bg-border/60 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-text-secondary uppercase">Марка автомобіля *</label>
                  <input
                    type="text"
                    required
                    placeholder="напр. Volkswagen, Audi"
                    value={clientForm.carBrand}
                    onChange={(e) => setClientForm({ ...clientForm, carBrand: e.target.value })}
                    className="w-full bg-bg-base p-2.5 text-xs rounded border border-bg-border focus:border-accent text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-text-secondary uppercase">Модель *</label>
                  <input
                    type="text"
                    required
                    placeholder="напр. Golf, R8"
                    value={clientForm.carModel}
                    onChange={(e) => setClientForm({ ...clientForm, carModel: e.target.value })}
                    className="w-full bg-bg-base p-2.5 text-xs rounded border border-bg-border focus:border-accent text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-text-secondary uppercase">Рік випуску</label>
                  <input
                    type="number"
                    value={clientForm.carYear}
                    onChange={(e) => setClientForm({ ...clientForm, carYear: Number(e.target.value) })}
                    className="w-full bg-bg-base p-2.5 text-xs rounded border border-bg-border focus:border-accent text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-text-secondary uppercase">Код кузова (VIN-код)</label>
                  <input
                    type="text"
                    placeholder="17 значний унікальний код кузова"
                    maxLength={17}
                    value={clientForm.vin}
                    onChange={(e) => setClientForm({ ...clientForm, vin: e.target.value.toUpperCase() })}
                    className="w-full bg-bg-base p-2.5 text-xs rounded border border-bg-border focus:border-accent text-white font-mono outline-none"
                  />
                </div>

              </div>

              <div className="flex justify-end gap-x-2 border-t border-bg-border/60 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-bg-surface hover:bg-bg-base text-text-secondary text-xs font-semibold rounded transition cursor-pointer"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-bg-base font-bold text-xs rounded shadow-[0_4px_12px_rgba(249,115,22,0.15)] transition cursor-pointer"
                >
                  Зареєструвати клієнта
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: NEW ORDER/NARAD APPOINTMENT */}
      {showOrderModal && selectedClient && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-bg-elevated border border-bg-border p-6 rounded-xl w-full max-w-3xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-bg-border/60 pb-3">
              <h3 className="text-md font-bold text-white flex items-center space-x-1.5 font-display uppercase tracking-wide">
                <Plus className="w-5 h-5 text-accent" />
                <span>Нове Замовлення: {selectedClient.carBrand} {selectedClient.carModel}</span>
              </h3>
              <button
                onClick={() => setShowOrderModal(false)}
                className="text-text-muted hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4 text-left">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Master assign */}
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-text-secondary uppercase">Призначений Майстер</label>
                  <select
                    value={orderForm.masterId}
                    onChange={(e) => setOrderForm({ ...orderForm, masterId: e.target.value })}
                    className="w-full bg-bg-base p-2.5 text-xs rounded border border-bg-border focus:border-accent text-white outline-none"
                  >
                    {masters.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {/* Status selector */}
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-text-secondary uppercase">Початковий статус авто</label>
                  <select
                    value={orderForm.status}
                    onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value as OrderStatus })}
                    className="w-full bg-bg-base p-2.5 text-xs rounded border border-bg-border focus:border-accent text-white outline-none"
                  >
                    {(['NEW', 'DIAGNOSIS', 'APPROVAL', 'WAITING_PARTS', 'IN_WORK'] as OrderStatus[]).map(st => (
                      <option key={st} value={st}>{ORDER_STATUS_LABELS[st]}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Drag Drop File upload */}
              <div className="space-y-1">
                <label className="text-2xs font-bold text-text-secondary uppercase">Фотофіксація Стан Авто (до 5 штук) *</label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={fileUploadClick}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition select-none flex flex-col items-center ${
                    dragOver
                      ? 'border-accent bg-accent/5'
                      : 'border-bg-border bg-bg-base hover:bg-bg-base/70'
                  }`}
                >
                  <Camera className="w-8 h-8 text-text-muted mb-2 group-hover:text-accent" />
                  <p className="text-xs text-text-primary font-bold">Перетягніть фото автомобіля сюди або клікніть для вибору</p>
                  <p className="text-[10px] text-text-muted mt-1">Офлайн завантаження фотографій звітів, кузова тощо.</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>

                {/* Photo slots previews */}
                {orderForm.photos?.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {orderForm.photos.map((ph, idx) => (
                      <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-bg-border group">
                        <img src={ph} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute inset-0 bg-red-600/70 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Complaints */}
              <div className="space-y-1">
                <label className="text-2xs font-bold text-text-secondary uppercase">Скарги клієнта (Його словами) *</label>
                <textarea
                  required
                  placeholder="напр. Стукіт у передній підвісці праворуч при проїзді нерівностей..."
                  value={orderForm.complaints}
                  onChange={(e) => setOrderForm({ ...orderForm, complaints: e.target.value })}
                  className="w-full h-16 bg-bg-base p-2.5 text-xs rounded border border-bg-border focus:border-accent text-white outline-none"
                />
              </div>

              {/* Quick Template checklist toggle */}
              {templates.length > 0 && (
                <div className="space-y-2 border-t border-bg-border/60 pt-3">
                  <label className="text-2xs font-bold text-text-secondary uppercase">Швидкі Шаблони Нарядів (Автозаповнення)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {templates.map(tpl => (
                      <button
                        type="button"
                        key={tpl.id}
                        onClick={() => applyTemplate(tpl.id)}
                        className="p-2 py-1 bg-bg-base hover:bg-bg-border border border-bg-border rounded text-2xs text-white hover:border-accent transition cursor-pointer"
                      >
                        + {tpl.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom works inside orders creation */}
              <div className="space-y-3 pt-3 border-t border-bg-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Роботи по наряду</span>
                  <button
                    type="button"
                    onClick={addCustomWork}
                    className="text-2xs py-1 px-2 border border-accent/30 text-accent rounded hover:bg-accent-soft cursor-pointer transition"
                  >
                    + Додати Роботу
                  </button>
                </div>

                <div className="space-y-2">
                  {orderForm.works.map((work, idx) => (
                    <div key={work.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 border-b border-bg-border/40 pb-2">
                      <input
                        type="text"
                        required
                        placeholder="Опис роботи (напр. Заміна амортизатора)"
                        value={work.name}
                        onChange={(e) => {
                          const next = [...orderForm.works];
                          next[idx].name = e.target.value;
                          setOrderForm({ ...orderForm, works: next });
                        }}
                        className="md:col-span-2 bg-bg-base p-2 text-xs rounded border border-bg-border text-white outline-none"
                      />
                      <input
                        type="number"
                        required
                        placeholder="Вартість (₴)"
                        value={work.price || ''}
                        onChange={(e) => {
                          const next = [...orderForm.works];
                          next[idx].price = Number(e.target.value);
                          setOrderForm({ ...orderForm, works: next });
                        }}
                        className="bg-bg-base p-2 text-xs rounded border border-bg-border text-white outline-none"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-muted font-mono">{work.masterCommissionPercent}% ЗП</span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = orderForm.works.filter((_, i) => i !== idx);
                            setOrderForm({ ...orderForm, works: next });
                          }}
                          className="text-red-400 hover:text-red-500 p-2 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom parts inside orders creation */}
              <div className="space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Шукані/Замовлені Запчастини</span>
                  <button
                    type="button"
                    onClick={addCustomPart}
                    className="text-2xs py-1 px-2 border border-accent/30 text-accent rounded hover:bg-accent-soft cursor-pointer transition"
                  >
                    + Додати Запчастину
                  </button>
                </div>

                <div className="space-y-2">
                  {orderForm.partsNeeded.map((part, idx) => (
                    <div key={part.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 border-b border-bg-border/40 pb-2">
                      <input
                        type="text"
                        required
                        placeholder="Назва запчастини (напр. Колодки гальмові)"
                        value={part.name}
                        onChange={(e) => {
                          const next = [...orderForm.partsNeeded];
                          next[idx].name = e.target.value;
                          setOrderForm({ ...orderForm, partsNeeded: next });
                        }}
                        className="bg-bg-base p-2 text-xs rounded border border-bg-border text-white outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Артикул / SKU"
                        value={part.sku}
                        onChange={(e) => {
                          const next = [...orderForm.partsNeeded];
                          next[idx].sku = e.target.value;
                          setOrderForm({ ...orderForm, partsNeeded: next });
                        }}
                        className="bg-bg-base p-2 text-xs rounded border border-bg-border text-white outline-none font-mono"
                      />
                      <input
                        type="number"
                        placeholder="Закупка (₴)"
                        value={part.purchasePrice || ''}
                        onChange={(e) => {
                          const next = [...orderForm.partsNeeded];
                          next[idx].purchasePrice = Number(e.target.value);
                          next[idx].clientPrice = Math.round(Number(e.target.value) * (1 + next[idx].marginPercent / 100));
                          setOrderForm({ ...orderForm, partsNeeded: next });
                        }}
                        className="bg-bg-base p-2 text-xs rounded border border-bg-border text-white outline-none"
                      />
                      <div className="flex items-center justify-between">
                        <select
                          value={part.marginPercent}
                          onChange={(e) => {
                            const next = [...orderForm.partsNeeded];
                            next[idx].marginPercent = Number(e.target.value);
                            next[idx].clientPrice = Math.round(Number(next[idx].purchasePrice) * (1 + Number(e.target.value) / 100));
                            setOrderForm({ ...orderForm, partsNeeded: next });
                          }}
                          className="bg-bg-base p-2 text-xs rounded border border-bg-border text-white outline-none"
                        >
                          <option value={10}>10% маржа</option>
                          <option value={20}>20% маржа</option>
                          <option value={30}>30% маржа</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const next = orderForm.partsNeeded.filter((_, i) => i !== idx);
                            setOrderForm({ ...orderForm, partsNeeded: next });
                          }}
                          className="text-red-400 hover:text-red-500 p-2 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-x-2 border-t border-bg-border/60 pt-4">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 bg-bg-surface hover:bg-bg-base text-text-secondary text-xs font-semibold rounded cursor-pointer transition"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-accent hover:bg-accent-hover text-bg-base font-bold text-xs rounded shadow-[0_4px_12px_rgba(249,115,22,0.15)] transition cursor-pointer"
                >
                  Створити наряд-замовлення
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW DIALOG FOR PRINTING */}
      {printDocumentType && selectedClient && selectedOrder && (
        <div className="fixed inset-0 bg-black/90 flex flex-col z-50 overflow-y-auto p-4 md:p-8 font-sans">
          
          {/* Header options inside print view */}
          <div className="w-full max-w-3xl mx-auto flex items-center justify-between bg-bg-surface border border-bg-border p-4 rounded-xl mb-4 text-white">
            <span className="text-xs font-bold text-accent uppercase tracking-wider">
              {printDocumentType === 'estimate' 
                ? 'Смета для погодження' 
                : printDocumentType === 'bill' 
                ? 'Акт виконаних робіт' 
                : 'Внутрішній бланк СТО'}
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-3 py-1.5 bg-accent text-bg-base rounded text-xs font-bold flex items-center space-x-1 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Роздрукувати / Зберегти як PDF</span>
              </button>
              <button
                onClick={() => setPrintDocumentType(null)}
                className="px-3 py-1.5 bg-bg-elevated hover:bg-bg-border rounded text-xs text-white border border-bg-border cursor-pointer transition"
              >
                Закрити
              </button>
            </div>
          </div>

          {/* Printable sheet block */}
          <div id="section-to-print" className="w-full max-w-3xl mx-auto bg-white text-slate-900 p-8 md:p-12 rounded-xl shadow-2xl relative border border-slate-200">
            
            {/* Logo, title and metadata */}
            <div className="flex flex-col md:flex-row md:items-start justify-between border-b-2 border-slate-900 pb-6 gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                  АВТОСЕРВІС "СТО МЕНЕДЖЕР"
                </h1>
                <p className="text-sm text-slate-500 font-medium">Професійне обслуговування під ключ</p>
                <p className="text-2xs text-slate-400 font-mono">Дата друку: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
              </div>
              <div className="text-left md:text-right text-xs space-y-0.5 text-slate-600">
                <p className="font-bold text-slate-900">{printDocumentType === 'estimate' ? 'ПОПЕРЕДНЯ СМЕТА' : printDocumentType === 'bill' ? 'АКТ ВИКОНАНИХ РОБІТ' : 'ВНУТРІШНІЙ БЛАНК СТО'}</p>
                <p className="font-mono">Наряд-замовлення: {selectedOrder.id}</p>
                <p>Дата створення: {new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                <p>Статус: {ORDER_STATUS_LABELS[selectedOrder.status]}</p>
              </div>
            </div>

            {/* Client & Car Profile specs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 text-xs text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div className="space-y-1.5 text-left">
                <p className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">Замовник</p>
                <p className="text-sm font-extrabold text-slate-900">{selectedClient.name}</p>
                <p>Тел: {selectedClient.phone}</p>
                <p>Місто: {selectedClient.city}</p>
              </div>
              <div className="space-y-1.5 text-left md:border-l md:border-slate-200 md:pl-6">
                <p className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">Транспортний засіб</p>
                <p className="text-sm font-extrabold text-slate-900">{selectedClient.carBrand} {selectedClient.carModel} ({selectedClient.carYear})</p>
                <p className="font-mono">VIN: {selectedClient.vin || 'Не вказано'}</p>
                <p className="italic">Скарга: "{selectedOrder.complaints || 'відсутня'}"</p>
              </div>
            </div>

            {/* Core tables display */}
            <div className="space-y-6">
              
              {/* Works list */}
              <div className="space-y-2 text-left">
                <h3 className="text-sm font-bold border-b border-slate-300 pb-1 uppercase tracking-wide">Перелік робіт та послуг</h3>
                <table className="w-full text-left text-xs text-slate-700 border-collapse table-fixed">
                  <thead>
                    <tr className="border-b border-slate-300 font-bold text-slate-600 bg-slate-100">
                      <th className="py-2 px-2 w-12 text-center">№</th>
                      <th className="py-2 px-2">Найменування роботи / операції</th>
                      <th className="py-2 px-2 w-32 text-right">Ціна (₴)</th>
                      {printDocumentType === 'internal' && (
                        <th className="py-2 px-2 w-32 text-right">ЗП майстра (₴)</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.works.map((work, idx) => (
                      <tr key={work.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="py-2 px-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 px-2 font-medium text-slate-950">{work.name || 'Технічні роботи'}</td>
                        <td className="py-2 px-2 text-right font-bold text-slate-900">{work.price.toLocaleString()} ₴</td>
                        {printDocumentType === 'internal' && (
                          <td className="py-2 px-2 text-right font-mono text-purple-600">
                            {Math.round(work.price * (work.masterCommissionPercent / 100)).toLocaleString()} ₴ ({work.masterCommissionPercent}%)
                          </td>
                        )}
                      </tr>
                    ))}
                    {selectedOrder.works.length === 0 && (
                      <tr>
                        <td colSpan={printDocumentType === 'internal' ? 4 : 3} className="py-4 text-center text-slate-400 italic">Послуги не зафіксовані</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Parts list */}
              <div className="space-y-2 text-left">
                <h3 className="text-sm font-bold border-b border-slate-300 pb-1 uppercase tracking-wide">Запасні частини та матеріали</h3>
                <table className="w-full text-left text-xs text-slate-700 border-collapse table-fixed">
                  <thead>
                    <tr className="border-b border-slate-300 font-bold text-slate-600 bg-slate-100">
                      <th className="py-2 px-2 w-12 text-center">№</th>
                      <th className="py-2 px-2">Найменування деталі</th>
                      <th className="py-2 px-2 w-36">Артикул / SKU</th>
                      <th className="py-2 px-2 w-32 text-right">Ціна для клієнта (₴)</th>
                      {printDocumentType === 'internal' && (
                        <>
                          <th className="py-2 px-2 w-24 text-right">Закупка (₴)</th>
                          <th className="py-2 px-2 w-20 text-right">Маржа (%)</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.partsNeeded.map((part, idx) => {
                      // If customer estimate: show parts without margins or with margins?
                      // The specification indicates: "Смета — генерація PDF для клієнта (запчастини без маржі + роботи + підсумок)". Wait! Does "запчастини без маржі" mean purchase price OR is clientPrice calculated minus margin?
                      // Wait! In simple auto-garages, the estimate given to the customer lists parts at their retail price (clientPrice), but for maximum flexibility if the owner wants "запчастини без маржі" we can show the purchasePrice or clientPrice. Let's make sure: show clientPrice, indicating the full detail, or show clientPrice. Let's show clientPrice, which matches the standard retail customer estimate!
                      const displayPrice = printDocumentType === 'estimate' ? part.clientPrice : part.clientPrice;

                      return (
                        <tr key={part.id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="py-2 px-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2 px-2 font-medium text-slate-950">{part.name || 'Запчастина'}</td>
                          <td className="py-2 px-2 font-mono text-slate-600">{part.sku || 'N/A'}</td>
                          <td className="py-2 px-2 text-right font-bold text-slate-900">{displayPrice.toLocaleString()} ₴</td>
                          {printDocumentType === 'internal' && (
                            <>
                              <td className="py-2 px-2 text-right text-slate-600 font-mono">{part.purchasePrice.toLocaleString()} ₴</td>
                              <td className="py-2 px-2 text-right text-orange-600 font-mono">{part.marginPercent}%</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    {selectedOrder.partsNeeded.length === 0 && (
                      <tr>
                        <td colSpan={printDocumentType === 'internal' ? 6 : 4} className="py-4 text-center text-slate-400 italic">Запасні частини не використовувалися</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            {/* Totals Summary */}
            <div className="mt-8 border-t-2 border-slate-900 pt-6 flex flex-col items-end text-right">
              {(() => {
                const stats = calculateTotals(selectedOrder);
                return (
                  <div className="w-full max-w-sm space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Всього за послуги:</span>
                      <span className="font-semibold text-slate-900">{stats.worksTotal.toLocaleString()} ₴</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Всього за деталі:</span>
                      <span className="font-semibold text-slate-900">{stats.partsTotal.toLocaleString()} ₴</span>
                    </div>
                    
                    {printDocumentType === 'internal' && (
                      <>
                        <div className="flex justify-between text-purple-600 border-t border-slate-200 pt-1">
                          <span>Всього заробітна плата механіків:</span>
                          <span className="font-mono">{stats.masterSalariesTotal.toLocaleString()} ₴</span>
                        </div>
                        <div className="flex justify-between text-orange-600 pb-1">
                          <span>Вартість закупу деталей:</span>
                          <span className="font-mono">{stats.partsPurchaseTotal.toLocaleString()} ₴</span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between text-base font-black text-slate-950 border-t-2 border-slate-900 pt-2">
                      <span>ЗАГАЛЬНА СУМА:</span>
                      <span>{stats.total.toLocaleString()} ₴</span>
                    </div>
                    <div className="flex justify-between text-sm text-emerald-600 font-bold border-b border-slate-200 pb-2">
                      <span>Оплачено:</span>
                      <span>{selectedOrder.paidAmount.toLocaleString()} ₴</span>
                    </div>
                    {stats.debt > 0 ? (
                      <div className="flex justify-between text-sm text-red-600 font-extrabold pt-1">
                        <span>Залишилось до сплати:</span>
                        <span>{stats.debt.toLocaleString()} ₴</span>
                      </div>
                    ) : (
                      <div className="text-right text-emerald-600 font-bold text-xs pt-1.5 uppercase tracking-wide">
                        Замовлення оплачено в повному обсязі
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Signature Area */}
            <div className="grid grid-cols-2 gap-12 mt-16 text-xs border-t border-slate-200 pt-6">
              <div className="space-y-8 text-left">
                <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Виконавець (Власник СТО)</p>
                <div className="border-b border-slate-400 w-full h-8 flex items-end">
                  <span className="text-[10px] text-slate-400 pb-1">Підпис: ________________________</span>
                </div>
              </div>
              <div className="space-y-8 text-left">
                <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Скарги/Роботи узгодив (Клієнт)</p>
                <div className="border-b border-slate-400 w-full h-8 flex items-end">
                  <span className="text-[10px] text-slate-400 pb-1">Підпис: ________________________</span>
                </div>
              </div>
            </div>

          </div>

          <style>{`
            @media print {
              body, html {
                background: white !important;
                color: black !important;
              }
              #section-to-print {
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
              }
              header, nav, button, .no-print {
                display: none !important;
              }
              #section-to-print * {
                color: black !important;
              }
            }
          `}</style>

        </div>
      )}

    </div>
  );
}
