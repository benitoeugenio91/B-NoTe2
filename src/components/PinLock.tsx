/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Lock, Delete, Play, ShieldAlert } from 'lucide-react';

export default function PinLock() {
  const { settings, updateSettings, setPinAuthenticated } = useAppStore();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Load state and manage locking
  const storedPin = settings.pinCode;

  useEffect(() => {
    const lockedUntil = localStorage.getItem('sto_pin_locked_until');
    if (lockedUntil) {
      const remainingTime = Math.ceil((parseInt(lockedUntil) - Date.now()) / 1000);
      if (remainingTime > 0) {
        setLockoutTime(parseInt(lockedUntil));
        setTimeLeft(remainingTime);
      } else {
        localStorage.removeItem('sto_pin_locked_until');
      }
    }
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    if (timeLeft <= 0) {
      if (lockoutTime) {
        setLockoutTime(null);
        setAttempts(0);
        localStorage.removeItem('sto_pin_locked_until');
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, lockoutTime]);

  const handleKeyPress = (num: string) => {
    if (lockoutTime) return;
    setErrorMessage('');
    
    // Max pin length is 6
    if (pin.length < 6) {
      setPin((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  const handleNext = async () => {
    if (pin.length < 4) {
      setErrorMessage('PIN-код повинен містити щонайменше 4 цифри');
      return;
    }

    // 1. App doesn't have a PIN set yet
    if (!storedPin) {
      if (!isSettingPin) {
        setIsSettingPin(true);
        setConfirmPin(pin);
        setPin('');
        return;
      }

      if (pin !== confirmPin) {
        setErrorMessage('PIN-коди не співпадають. Спробуйте знову.');
        setPin('');
        setIsSettingPin(false);
        setConfirmPin('');
        return;
      }

      // Save new pin
      await updateSettings({ pinCode: pin });
      setPinAuthenticated(true);
      return;
    }

    // 2. App has a PIN, checking it
    if (pin === storedPin) {
      setPinAuthenticated(true);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin('');

      if (newAttempts >= 5) {
        const lockoutDuration = 5 * 60 * 1000; // 5 mins
        const lockedUntil = Date.now() + lockoutDuration;
        localStorage.setItem('sto_pin_locked_until', lockedUntil.toString());
        setLockoutTime(lockedUntil);
        setTimeLeft(300);
        setErrorMessage('Забагато спроб. Доступ заблоковано на 5 хвилин.');
      } else {
        setErrorMessage(`Невірний PIN-код. Залишилось спроб: ${5 - newAttempts}`);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-bg-base flex flex-col items-center justify-center p-4 z-50 overflow-hidden font-sans">
      <div className="w-full max-w-sm flex flex-col items-center justify-between h-[85vh] max-h-[600px]">
        
        {/* Header */}
        <div className="text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center mb-4 text-accent animate-pulse">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-white">
            СТО МЕНЕДЖЕР
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {!storedPin
              ? isSettingPin
                ? 'Підтвердження PIN-коду'
                : 'Встановлення захисного PIN-коду'
              : 'Введіть PIN-код для входу'}
          </p>
        </div>

        {/* Display dots */}
        <div className="flex flex-col items-center my-6">
          <div className="flex space-x-4 h-8 items-center">
            {Array.from({ length: Math.max(pin.length, 4) }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border transition-all duration-150 ${
                  i < pin.length
                    ? 'bg-accent border-accent scale-110 shadow-[0_0_10px_rgba(249,115,22,0.5)]'
                    : 'border-bg-border bg-bg-surface'
                }`}
              />
            ))}
          </div>
          
          {errorMessage && (
            <div className="flex items-center space-x-1.5 text-xs text-red-500 font-medium bg-red-950/25 border border-red-900/40 px-3 py-1.5 rounded-lg mt-4 animate-bounce">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {lockoutTime && (
            <p className="text-sm font-semibold text-accent mt-3">
              Повторіть через: {formatTime(timeLeft)}
            </p>
          )}
        </div>

        {/* Keyboard Grid */}
        <div className="w-full grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              disabled={!!lockoutTime}
              className="py-4 text-xl font-semibold bg-bg-surface hover:bg-bg-elevated border border-bg-border active:scale-95 text-white active:bg-accent/10 rounded-xl transition duration-70"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            disabled={!!lockoutTime || pin.length === 0}
            className="py-4 text-xs font-semibold hover:text-white border border-transparent text-text-muted rounded-xl transition cursor-pointer"
          >
            ОЧИСТИТИ
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            disabled={!!lockoutTime}
            className="py-4 text-xl font-semibold bg-bg-surface hover:bg-bg-elevated border border-bg-border active:scale-95 text-white active:bg-accent/10 rounded-xl transition duration-70"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={!!lockoutTime || pin.length === 0}
            className="py-4 flex items-center justify-center bg-bg-surface hover:bg-bg-elevated border border-bg-border text-white rounded-xl transition duration-70"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Action Button */}
        <button
          onClick={handleNext}
          disabled={pin.length < 4 || !!lockoutTime}
          className="w-full mt-4 py-3 bg-accent hover:bg-accent-hover text-bg-base font-bold rounded-xl transition flex items-center justify-center space-x-2 shadow-[0_4px_12px_rgba(249,115,22,0.2)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <span>ПОДТВЕРДИТИ</span>
          <Play className="w-4 h-4 fill-bg-base stroke-none" />
        </button>
      </div>
    </div>
  );
}
