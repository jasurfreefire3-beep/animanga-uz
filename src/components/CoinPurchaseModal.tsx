import React, { useState, useEffect, useRef } from 'react';
import { X, Coins, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, Sparkles, CreditCard, ShieldCheck, ArrowRight, History, Lock, LogIn } from 'lucide-react';
import type { UserProfile, CoinTransaction } from '../types.js';

interface CoinPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { username: string; isAdmin?: boolean } | null;
  profile?: UserProfile | null;
  userProfile?: UserProfile | null;
  onBalanceUpdated: (newCoins: number) => void;
  onOpenAuth?: () => void;
  initialCoinAmount?: number;
}

const QUICK_PACKAGES = [
  { coins: 10, label: '10 tanga', popular: false, badge: 'Eng kami' },
  { coins: 30, label: '30 tanga', popular: false },
  { coins: 50, label: '50 tanga', popular: true, badge: 'Mashhur' },
  { coins: 100, label: '100 tanga', popular: false, badge: 'Tavsiya' },
  { coins: 250, label: '250 tanga', popular: false },
  { coins: 500, label: '500 tanga', popular: false, badge: 'Premium' },
];

export const CoinPurchaseModal: React.FC<CoinPurchaseModalProps> = ({
  isOpen,
  onClose,
  user,
  profile,
  userProfile,
  onBalanceUpdated,
  onOpenAuth,
  initialCoinAmount = 50,
}) => {
  const activeProfile = profile || userProfile;
  const [coinsInput, setCoinsInput] = useState<number>(initialCoinAmount);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<{
    order_id: number;
    pay_url: string;
    coins: number;
    amount: number;
  } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<{
    coins_added: number;
    new_balance: number;
  } | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  const pollIntervalRef = useRef<any>(null);

  // Sync initial coin amount if passed
  useEffect(() => {
    if (initialCoinAmount && initialCoinAmount >= 10) {
      setCoinsInput(initialCoinAmount);
    }
  }, [initialCoinAmount]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Poll active order
  useEffect(() => {
    if (activeOrder && !paymentSuccess) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      pollIntervalRef.current = setInterval(() => {
        checkPaymentStatus(activeOrder.order_id, true);
      }, 3000);

      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    }
  }, [activeOrder, paymentSuccess]);

  if (!isOpen) return null;

  const username = user?.username || activeProfile?.username || '';
  const priceInSum = Math.max(0, coinsInput * 100);

  const handleSelectPackage = (coins: number) => {
    setCoinsInput(coins);
    setError(null);
  };

  const handleCreateOrder = async () => {
    if (!user) {
      setError("Tanga xarid qilish uchun avval tizimga kirishingiz kerak!");
      if (onOpenAuth) {
        onClose();
        onOpenAuth();
      }
      return;
    }

    if (coinsInput < 10) {
      setError("Eng kam tanga miqdori 10 ta tanga (1,000 so'm)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resp = await fetch('/api/coins/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coins: coinsInput,
          username: username,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        throw new Error(data.error || "To'lov hisobini yaratishda xatolik yuz berdi");
      }

      setActiveOrder({
        order_id: data.order_id,
        pay_url: data.pay_url,
        coins: data.coins,
        amount: data.amount,
      });

      // Attempt to open pay_url in a new tab
      if (data.pay_url) {
        window.open(data.pay_url, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      setError(err.message || "To'lov hisobini yaratishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (orderId: number, isSilent = false) => {
    if (!isSilent) setCheckingStatus(true);
    try {
      const resp = await fetch(`/api/coins/check-order/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await resp.json();
      if (data.ok && data.paid) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        const coinsAdded = data.coins_added || activeOrder?.coins || coinsInput;
        const newBalance = data.new_balance ?? ((profile?.coins || 0) + coinsAdded);
        
        setPaymentSuccess({
          coins_added: coinsAdded,
          new_balance: newBalance,
        });
        onBalanceUpdated(newBalance);
      } else if (!isSilent && data.status) {
        if (data.status === 'pending') {
          setError("To'lov hali kutilmoqda. TezChek sahifasida to'lovni tasdiqlang.");
        } else if (data.status === 'canceled') {
          setError("To'lov bekor qilingan.");
        }
      }
    } catch (err: any) {
      if (!isSilent) {
        setError("To'lov holatini tekshirishda xatolik yuz berdi");
      }
    } finally {
      if (!isSilent) setCheckingStatus(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const resp = await fetch(`/api/coins/transactions/${username}`);
      const data = await resp.json();
      if (Array.isArray(data)) {
        setTransactions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const resetModal = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setActiveOrder(null);
    setPaymentSuccess(null);
    setError(null);
    setShowHistory(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-2xl animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-w-lg ios-glass rounded-t-[36px] sm:rounded-[36px] p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.6)] text-white overflow-hidden max-h-[94vh] sm:max-h-[90vh] overflow-y-auto my-0 sm:my-auto border border-white/20"
        id="coin-purchase-modal"
      >
        {/* Mobile top pill indicator (Apple action sheet style) */}
        <div className="w-14 h-1.5 bg-white/30 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Glow ambient effects */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-60 h-60 bg-[#00DC82]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => {
            resetModal();
            onClose();
          }}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#a0a0b8] hover:text-white hover:bg-white/10 transition-all z-10 active:scale-95"
          id="btn-close-coin-modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Title */}
        <div className="flex items-center gap-3 mb-5 sm:mb-6 pr-8">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-[#0d2215] rounded-[14px] flex items-center justify-center">
              <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
            </div>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-1.5 truncate">
              <span>Tanga xarid qilish</span>
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            </h2>
            <p className="text-xs text-[#a0a0b8] truncate">
              Balans:{' '}
              <span className="text-amber-300 font-bold">
                {((activeProfile || profile)?.coins ?? 0).toLocaleString()} tanga
              </span>
            </p>
          </div>
        </div>

        {/* User Not Logged In View */}
        {!user ? (
          <div className="py-6 sm:py-8 text-center space-y-4 animate-fade-in" id="coin-login-required-view">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-yellow-500/15 to-emerald-500/20 border border-amber-500/40 mx-auto flex items-center justify-center text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
              <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-black text-white">
                Tanga sotib olish uchun tizimga kiring
              </h3>
              <p className="text-xs sm:text-sm text-[#a0a0b8] max-w-sm mx-auto leading-relaxed">
                Xarid qilingan barcha tilla tangalar va ochilgan pullik boblar sizning shaxsiy profilingizga biriktiriladi. Balansni to'ldirish uchun avval tizimga kiring.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2.5 max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenAuth) onOpenAuth();
                }}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-extrabold text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 active:scale-95 transition hover:brightness-110 cursor-pointer"
                id="btn-coin-login-trigger"
              >
                <LogIn className="w-4 h-4 text-black" />
                <span>Tizimga kirish / Ro'yxatdan o'tish</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl text-xs text-zinc-400 hover:text-white transition active:scale-95 cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        ) : paymentSuccess ? (
          <div className="text-center py-5 animate-fade-in space-y-4" id="payment-success-view">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400/60 mx-auto flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white">To'lov muvaffaqiyatli!</h3>
              <p className="text-xs sm:text-sm text-gray-300 mt-1.5">
                Hisobingizga{' '}
                <span className="text-amber-400 font-bold text-base sm:text-lg">
                  +{paymentSuccess.coins_added} tanga
                </span>{' '}
                qo'shildi.
              </p>
              <div className="inline-block mt-3 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs sm:text-sm font-semibold">
                Yangi balans: {paymentSuccess.new_balance.toLocaleString()} tanga
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  resetModal();
                  onClose();
                }}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#00DC82] hover:bg-[#00c574] text-black font-bold text-sm sm:text-base transition-all shadow-lg shadow-[#00DC82]/25 active:scale-[0.98]"
                id="btn-close-success"
              >
                Manga mutolaasiga qaytish
              </button>
            </div>
          </div>
        ) : activeOrder ? (
          /* Active Payment Pending Screen */
          <div className="space-y-4 animate-fade-in" id="payment-pending-view">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-amber-400 animate-spin shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/90 leading-relaxed">
                <span className="font-bold text-white block text-xs sm:text-sm mb-0.5">
                  To'lov kutilmoqda (TezChek №{activeOrder.order_id})
                </span>
                To'lov sahifasida to'lovni tasdiqlang. Tangalar avtomatik tarzda tushadi.
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex justify-between text-xs text-[#a0a0b8]">
                <span>Tanga miqdori:</span>
                <span className="text-amber-300 font-bold">{activeOrder.coins} tanga</span>
              </div>
              <div className="flex justify-between text-xs text-[#a0a0b8]">
                <span>To'lov summasi:</span>
                <span className="text-white font-bold">{activeOrder.amount.toLocaleString()} so'm</span>
              </div>
              <div className="flex justify-between text-xs text-[#a0a0b8]">
                <span>To'lov tizimi:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> TezChek (Payme / Click / Uzum)
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2.5 pt-1">
              <a
                href={activeOrder.pay_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98]"
                id="btn-reopen-tezchek"
              >
                <span>To'lov sahifasini ochish</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                onClick={() => checkPaymentStatus(activeOrder.order_id, false)}
                disabled={checkingStatus}
                className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
                id="btn-check-payment-status"
              >
                <RefreshCw className={`w-4 h-4 ${checkingStatus ? 'animate-spin text-amber-400' : ''}`} />
                <span>{checkingStatus ? 'Tekshirilmoqda...' : "To'lovni tekshirish"}</span>
              </button>

              <button
                onClick={() => setActiveOrder(null)}
                className="w-full py-2 text-xs text-[#a0a0b8] hover:text-white transition-colors"
                id="btn-cancel-active-order"
              >
                Boshqa miqdor tanlash
              </button>
            </div>
          </div>
        ) : showHistory ? (
          /* Transaction History Screen */
          <div className="space-y-4 animate-fade-in" id="coin-history-view">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <History className="w-4 h-4 text-amber-400" /> Xaridlar tarixi
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-xs text-amber-400 hover:underline"
              >
                Xarid qilishga qaytish
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-8 text-center text-xs text-[#a0a0b8]">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
                Tarix yuklanmoqda...
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#a0a0b8] bg-black/20 rounded-2xl border border-white/5">
                Hozircha xaridlar tarixi mavjud emas.
              </div>
            ) : (
              <div className="max-h-56 sm:max-h-60 overflow-y-auto space-y-2 pr-1">
                {transactions.map((tx) => (
                  <div
                    key={tx.order_id}
                    className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>+{tx.coins} tanga</span>
                      </div>
                      <div className="text-[10px] text-[#a0a0b8] mt-0.5">
                        {tx.amount.toLocaleString()} so'm • {tx.created_at?.split('T')[0]}
                      </div>
                    </div>
                    <div>
                      {tx.status === 'paid' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-[10px] border border-emerald-500/30">
                          To'langan
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setShowHistory(false);
                            setActiveOrder({
                              order_id: tx.order_id,
                              pay_url: tx.pay_url || `https://tezchek.uz/merchant/pay?order_id=${tx.order_id}`,
                              coins: tx.coins,
                              amount: tx.amount,
                            });
                          }}
                          className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold text-[10px] border border-amber-500/30 hover:bg-amber-500/30"
                        >
                          Kutilmoqda
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Package Selection & Custom Coin Input Screen */
          <div className="space-y-4 sm:space-y-5 animate-fade-in" id="coin-selection-view">
            {/* Rate banner */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border border-amber-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">💎</span>
                <div>
                  <div className="font-bold text-amber-300 text-xs">Rasmiy kurs:</div>
                  <div className="text-gray-300 text-[10px] sm:text-[11px]">10 ta tanga = 1 000 so'm (1 ta = 100 so'm)</div>
                </div>
              </div>
              <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 font-bold uppercase tracking-wider shrink-0">
                TezChek
              </span>
            </div>

            {/* Quick Packages */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">
                Tezkor paketlar:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_PACKAGES.map((pkg) => {
                  const isSelected = coinsInput === pkg.coins;
                  return (
                    <button
                      key={pkg.coins}
                      type="button"
                      onClick={() => handleSelectPackage(pkg.coins)}
                      className={`relative p-2.5 sm:p-3 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-center active:scale-95 ${
                        isSelected
                          ? 'bg-amber-500/25 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.25)] scale-[1.02]'
                          : 'bg-black/40 border-white/10 hover:border-white/20 text-gray-300 hover:text-white'
                      }`}
                      id={`pkg-${pkg.coins}`}
                    >
                      {pkg.badge && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-amber-500 text-[8px] sm:text-[9px] font-bold text-black uppercase tracking-wider shadow-sm">
                          {pkg.badge}
                        </span>
                      )}
                      <Coins className={`w-3.5 h-3.5 sm:w-4 sm:h-4 mb-0.5 ${isSelected ? 'text-amber-400' : 'text-gray-400'}`} />
                      <div className="font-extrabold text-xs sm:text-sm text-white">{pkg.coins}</div>
                      <div className="text-[9px] sm:text-[10px] text-amber-300/90 font-medium">
                        {(pkg.coins * 100).toLocaleString()} so'm
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Coin Input with Quick Stepper */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-300">
                  Ixtiyoriy miqdorni kiriting:
                </label>
                <span className="text-[10px] sm:text-[11px] text-[#a0a0b8]">Min: 10 ta</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  min="10"
                  step="1"
                  value={coinsInput || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setCoinsInput(isNaN(val) ? 0 : val);
                    setError(null);
                  }}
                  placeholder="Masalan: 75"
                  className="w-full px-3.5 py-2.5 sm:py-3 pl-10 rounded-2xl bg-black/60 border border-white/15 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-white font-bold text-sm sm:text-base outline-none transition-all placeholder:text-gray-600"
                  id="input-custom-coins"
                />
                <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  tanga
                </span>
              </div>

              {/* Quick Stepper Buttons on Mobile */}
              <div className="flex items-center gap-1.5 mt-2 overflow-x-auto scrollbar-hide py-0.5">
                {[+10, +25, +50, +100].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => {
                      setCoinsInput((prev) => Math.max(10, (prev || 0) + step));
                      setError(null);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-amber-300 hover:text-white transition-all active:scale-95 shrink-0"
                  >
                    +{step}
                  </button>
                ))}
                {coinsInput > 10 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCoinsInput((prev) => Math.max(10, (prev || 0) - 10));
                      setError(null);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-gray-400 hover:text-white transition-all active:scale-95 shrink-0 ml-auto"
                  >
                    -10
                  </button>
                )}
              </div>
            </div>

            {/* Summary Price Calculation */}
            <div className="p-3.5 rounded-2xl bg-[#030d07] border border-emerald-500/20 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-300">
                <span>To'lov summasi:</span>
                <span className="text-base sm:text-lg font-black text-white">
                  {priceInSum.toLocaleString()} <span className="text-xs font-normal text-emerald-400">so'm</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#a0a0b8] pt-1 border-t border-white/5">
                <span>To'lov vositalari:</span>
                <div className="flex items-center gap-1.5 text-white text-[9px] sm:text-[10px] font-semibold flex-wrap">
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">Payme</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-600/20 text-sky-300">Click</span>
                  <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">Uzum</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Karta</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-2.5 sm:p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleCreateOrder}
              disabled={loading || coinsInput < 10}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition-all duration-200 active:scale-[0.98]"
              id="btn-submit-tezchek-order"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  <span>TezChek ochilmoqda...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>TezChek orqali to'lash ({priceInSum.toLocaleString()} so'm)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Bottom link: history */}
            <div className="text-center pt-0.5 pb-1">
              <button
                onClick={() => {
                  setShowHistory(true);
                  fetchHistory();
                }}
                className="text-xs text-[#a0a0b8] hover:text-amber-400 transition-colors flex items-center justify-center gap-1 mx-auto"
                id="btn-view-coin-history"
              >
                <History className="w-3.5 h-3.5" />
                <span>Xaridlar tarixini ko'rish</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
