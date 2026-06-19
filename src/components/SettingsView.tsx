/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { syncDatabaseWithDrive } from '../utils/googleDriveSync';
import { DBStructure } from '../types';
import { 
  Settings, 
  Lock, 
  CloudSun, 
  Database, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Upload, 
  Download, 
  Check, 
  AlertCircle,
  X
} from 'lucide-react';

export default function SettingsView() {
  const { 
    settings, 
    masters, 
    templates, 
    updateSettings, 
    importFullData,
    addMaster,
    updateMaster,
    deleteMaster,
    addTemplate,
    deleteTemplate
  } = useAppStore();

  const [apiKey, setApiKey] = useState(settings.driveApiKey || '');
  const [folderId, setFolderId] = useState(settings.driveFolderId || '');
  const [accessToken, setAccessToken] = useState(settings.driveAccessToken || '');
  const [syncStatus, setSyncStatus] = useState('');
  const [pinLockOption, setPinLockOption] = useState(settings.pinCode || '');
  const [isPinEditing, setIsPinEditing] = useState(false);

  // Mechanic form state
  const [mechanicForm, setMechanicForm] = useState({ name: '', defaultCommission: 40 });

  // Sync operations
  const handleDriveSync = async () => {
    setSyncStatus('Підготовка до синхронізації...');
    
    // Automatically persist settings
    await updateSettings({
      driveApiKey: apiKey,
      driveFolderId: folderId,
      driveAccessToken: accessToken,
    });

    const fullState = useAppStore.getState();
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

    const res = await syncDatabaseWithDrive(
      cleanLocalDb,
      {
        accessToken: accessToken,
        apiKey: apiKey,
        folderId: folderId,
      },
      (msg) => setSyncStatus(msg)
    );

    if (res.success && res.data) {
      // Load merged back into Zustand and save
      await importFullData(res.data);
      setSyncStatus('');
      alert('Синхронізація успішно завершена. Дані злито без дублікатів!');
      await updateSettings({ googleDriveConnected: true });
    } else {
      setSyncStatus('');
      alert(`Помилка під час синхронізації: ${res.error}`);
    }
  };

  const handleSaveConnectionParams = async () => {
    await updateSettings({
      driveApiKey: apiKey,
      driveFolderId: folderId,
      driveAccessToken: accessToken,
    });
    alert('Параметри підключення до Google Drive успішно збережено!');
  };

  // Local backups JSON operations
  const handleLocalBackupDownload = () => {
    const fullState = useAppStore.getState();
    const dataObj: DBStructure = {
      meta: {
        version: fullState.meta.version,
        lastSync: new Date().toISOString(),
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

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `STO_Manager_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleLocalBackupUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && (parsed.clients || parsed.orders)) {
          if (confirm('Ви впевнені? Це завантажить нову локальну базу і повністю замінить поточні записи.')) {
            await importFullData(parsed);
            alert('Дані успішно імпортовано та відновлено у IndexedDB!');
          }
        } else {
          alert('Невірний формат файлу резервної копії.');
        }
      } catch (err) {
        alert('Помилка зчитування резервної копії: ' + err);
      }
    };
    reader.readAsText(file);
  };

  // Setup security PIN
  const handleSavePinOption = async () => {
    if (pinLockOption.length > 0 && pinLockOption.length < 4) {
      alert('PIN-код повинен містити не менше 4 цифр!');
      return;
    }
    await updateSettings({ pinCode: pinLockOption || undefined });
    setIsPinEditing(false);
    alert(pinLockOption ? 'PIN-код для захисту входу успішно збережено!' : 'PIN-код успішно відключено.');
  };

  // Mechanics creation
  const handleAddMechanic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mechanicForm.name) return;
    await addMaster({
      name: mechanicForm.name,
      defaultCommission: mechanicForm.defaultCommission,
      active: true
    });
    setMechanicForm({ name: '', defaultCommission: 40 });
    alert('Картку майстра успішно збережено.');
  };

  return (
    <div className="space-y-6 font-sans text-left">
      
      {/* Upper Grid panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Cloud Sync setup card */}
        <div className="p-6 rounded-xl bg-bg-surface border border-bg-border space-y-4">
          <h3 className="text-md font-bold text-white flex items-center space-x-2 font-display uppercase tracking-wide">
            <CloudSun className="w-5 h-5 text-accent animate-pulse" />
            <span>Хмарна Синхронізація (Google Drive)</span>
          </h3>

          <p className="text-xs text-text-secondary">
            Створіть спільне сховище для нарядів на Google Диску за допомогою тихих фонових sync процедур. 
            Він зливає локальні зміни на вашому телефоні та комп'ютері без ризику затирання.
          </p>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-2xs font-bold text-text-secondary uppercase">Google Drive API Key (Ключ API)</label>
              <input
                type="password"
                placeholder="Введіть ваш Google API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-bg-base border border-bg-border text-xs rounded p-2 text-white outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1">
              <label className="text-2xs font-bold text-text-secondary uppercase">ID Папки Google Drive (Folder ID)</label>
              <input
                type="text"
                placeholder="Введіть ID публічної папки з Google Drive"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full bg-bg-base border border-bg-border text-xs rounded p-2 text-white outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1">
              <label className="text-2xs font-bold text-text-secondary uppercase">Google Access Token (Для доступу на запис)</label>
              <input
                type="password"
                placeholder="Введіть дійсний OAuth Access Token (Bearer)"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="w-full bg-bg-base border border-bg-border text-xs rounded p-2 text-white outline-none focus:border-accent"
              />
              <p className="text-[10px] text-text-secondary">
                Примітка: для читання публічної папки достатньо ввести API Key та ID Папки. Для запису (синхронізації нових даних) Google вимагає Access Token.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={handleSaveConnectionParams}
                className="px-4 py-2 bg-bg-base hover:bg-bg-base-hover text-white border border-bg-border text-xs rounded-xl transition inline-flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Зберегти параметри</span>
              </button>

              <button
                onClick={handleDriveSync}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-bg-base font-black text-xs rounded-xl transition inline-flex items-center space-x-1.5 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Синхронізувати</span>
              </button>

              {settings.googleDriveConnected && (
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                  Підключено
                </span>
              )}
            </div>

            {syncStatus && (
              <div className="p-3 rounded-lg bg-bg-base border border-bg-border flex items-center space-x-2 text-xs text-text-primary">
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                <span>{syncStatus}</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. PIN Lock security config */}
        <div className="p-6 rounded-xl bg-bg-surface border border-bg-border space-y-4">
          <h3 className="text-md font-bold text-white flex items-center space-x-2 font-display uppercase tracking-wide">
            <Lock className="w-5 h-5 text-accent" />
            <span>Параметри Безпеки додатку (PIN-код)</span>
          </h3>
          
          <p className="text-xs text-text-secondary">
            Увімкніть захист входу в додаток через спеціальний 4-6 значний пінкод. 
            Це захистить ваші комерційні наряди від клієнтів у боксі.
          </p>

          <div className="space-y-3 pt-2">
            {isPinEditing ? (
              <div className="flex items-center space-x-2">
                <input
                  type="password"
                  maxLength={6}
                  placeholder="Введіть новий PIN (4-6 цифр)"
                  value={pinLockOption}
                  onChange={(e) => setPinLockOption(e.target.value.replace(/[^0-9]/g, ''))}
                  className="bg-bg-base border border-bg-border rounded p-2 text-xs font-mono text-white outline-none focus:border-accent w-48"
                />
                <button
                  onClick={handleSavePinOption}
                  className="p-2 bg-emerald-500 text-bg-base text-xs font-bold rounded hover:bg-emerald-600 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsPinEditing(false)}
                  className="p-2 bg-bg-elevated text-text-secondary text-xs rounded hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3.5 bg-bg-base border border-bg-border rounded-lg">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-white">Статус захисту</p>
                  <p className="text-[10px] text-text-muted">
                    {settings.pinCode ? 'АКТИВНИЙ (Транзакції захищено пінкодом)' : 'ВІДКЛЮЧЕНО (Вільний вхід)'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setPinLockOption(settings.pinCode || '');
                    setIsPinEditing(true);
                  }}
                  className="px-3 py-1.5 bg-bg-elevated text-xs font-semibold hover:text-white rounded transition border border-bg-border cursor-pointer"
                >
                  {settings.pinCode ? 'Змінити PIN / Вимкнути' : 'Увімкнути PIN'}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 3. Operational Master Automechanics Catalog info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Dynamic Mechanics List configuration */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-bg-surface border border-bg-border space-y-4">
          <h3 className="text-md font-bold text-white flex items-center space-x-1.5 uppercase tracking-wide font-display">
            <span>Картки Автомеханіків закладу</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-text-secondary">
              <thead>
                <tr className="border-b border-bg-border bg-bg-base/60 text-text-muted">
                  <th className="p-3">Майстер</th>
                  <th className="p-3 text-center">Комісія ЗП за замовчуванням</th>
                  <th className="p-3 text-center">Статус акаунта</th>
                  <th className="p-3 text-right">Дії</th>
                </tr>
              </thead>
              <tbody>
                {masters.map((m) => (
                  <tr key={m.id} className="border-b border-bg-border/30 hover:bg-bg-base/20">
                    <td className="p-3 font-bold text-white">{m.name}</td>
                    <td className="p-3 text-center text-sm font-mono text-accent">{m.defaultCommission}% від ціни робіт</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[10px]">
                        Працює
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Дійсно видалити картку автомеханіка ${m.name}?`)) {
                            deleteMaster(m.id);
                          }
                        }}
                        className="hover:text-red-500 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form onSubmit={handleAddMechanic} className="border-t border-bg-border/50 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="ПІБ Нового автослюсаря"
              value={mechanicForm.name}
              onChange={(e) => setMechanicForm({ ...mechanicForm, name: e.target.value })}
              className="bg-bg-base border border-bg-border p-2 text-xs rounded text-white outline-none focus:border-accent"
            />
            <input
              type="number"
              required
              placeholder="Стандартний відсоток (напр. 45)"
              value={mechanicForm.defaultCommission || ''}
              onChange={(e) => setMechanicForm({ ...mechanicForm, defaultCommission: Number(e.target.value) })}
              className="bg-bg-base border border-bg-border p-2 text-xs rounded text-white outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="bg-accent text-bg-base font-bold text-xs rounded transition hover:bg-accent-hover py-2 cursor-pointer"
            >
              Додати в штат
            </button>
          </form>
        </div>

        {/* 4. Local DB backups card panel */}
        <div className="p-6 rounded-xl bg-bg-surface border border-bg-border space-y-4">
          <h3 className="text-md font-bold text-white flex items-center space-x-2 font-display uppercase tracking-wide">
            <Database className="w-5 h-5 text-accent" />
            <span>Резервне Копіювання (Офлайн)</span>
          </h3>

          <p className="text-xs text-text-secondary">
            Завантажте повний зліпок вашої локальної бази даних на телефон чи комп'ютер у вигляді єдиного `.json` файлу. 
            Ви завжди зможете розгорнути його назад у IndexedDB навіть без інтернету.
          </p>

          <div className="space-y-3.5 pt-4">
            <button
              onClick={handleLocalBackupDownload}
              className="w-full py-2.5 bg-bg-elevated hover:bg-bg-border text-xs font-bold text-white rounded-lg transition inline-flex items-center justify-center space-x-1.5 border border-bg-border cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Скачати JSON бекап бази</span>
            </button>

            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleLocalBackupUpload}
                className="hidden"
                id="offline-backup-upload-input"
              />
              <label
                htmlFor="offline-backup-upload-input"
                className="w-full py-2.5 bg-bg-elevated hover:bg-bg-border text-xs font-bold text-white rounded-lg transition inline-flex items-center justify-center space-x-1.5 border border-bg-border cursor-pointer"
              >
                <Upload className="w-4 h-4 text-accent" />
                <span>Завантажити JSON файл резервної копії</span>
              </label>
            </div>
            
            <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/10 flex items-start space-x-2 text-[10px] text-text-secondary">
              <AlertCircle className="w-4.5 h-4.5 text-amber-500 flex-shrink-0" />
              <span>Обережно! Імпорт резервного файлу беззворотно перепише поточні локальні записи.</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
