import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getHardwareStatus, hardwareTrigger } from './api/client';
import { OfficerGateway } from './components/OfficerGateway';
import { DaoCommandCenter } from './components/DaoCommandCenter';
import { HomeScreen } from './components/HomeScreen';
import { SchemesScreen } from './components/SchemesScreen';
import { PricesScreen } from './components/PricesScreen';
import { GrievancesScreen } from './components/GrievancesScreen';
import { LearnScreen } from './components/LearnScreen';
import { useLanguage } from './context/LanguageContext';
import { AppLanguage } from './utils/translations';
import type { ChatMessage } from './components/HomeScreen';

export type NavigationPath =
  | 'home'
  | 'schemes'
  | 'prices'
  | 'grievances'
  | 'learn'
  | 'officer-hub'
  | 'dao-command';

export default function App() {
  const { language, setLanguage, t, languages } = useLanguage();
  const [currentPath, setCurrentPath] = useState<NavigationPath>('home');
  const [isOfficerAuthorized, setIsOfficerAuthorized] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const sessionInitialized = useRef(false);

  // Session state comes from the real backend kiosk FSM (GET /hardware/status).
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  const [sessionStatus, setSessionStatus] = useState<'active' | 'warning' | 'expired'>('active');
  const [sessionState, setSessionState] = useState<string>('inactive');

  const refreshSessionFromBackend = useCallback(async () => {
    try {
      const status = await getHardwareStatus();
      const runs = status.session_state !== 'inactive' && status.remaining_seconds !== null;
      setSessionState(status.session_state);
      if (runs) {
        const remaining = status.remaining_seconds ?? 0;
        setSessionSeconds(remaining);
        setSessionStatus(remaining <= 120 && remaining > 0 ? 'warning' : remaining === 0 ? 'expired' : 'active');
      } else {
        setSessionSeconds(0);
        setSessionStatus('expired');
      }
    } catch {
      // Backend unreachable: keep the last known values.
    }
  }, []);

  useEffect(() => {
    // Laptop demo mode: POST /hardware/trigger?force=true exactly once on page load.
    hardwareTrigger(true).catch(() => {
      /* backend not running — silently ignored */
    });
    refreshSessionFromBackend();
    const poll = setInterval(refreshSessionFromBackend, 5000);
    return () => clearInterval(poll);
  }, [refreshSessionFromBackend]);

  // Local 1s tick between backend polls so the countdown moves smoothly.
  useEffect(() => {
    const tick = setInterval(() => {
      setSessionSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const formatSessionTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setIsToastVisible(true);
    setTimeout(() => {
      setIsToastVisible(false);
    }, 3500);
  };

  const handleNavigate = (path: string) => {
    if (
      path === 'home' ||
      path === 'schemes' ||
      path === 'prices' ||
      path === 'grievances' ||
      path === 'learn' ||
      path === 'officer-hub'
    ) {
      setCurrentPath(path as NavigationPath);
    }
    setMobileMenuOpen(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOfficerAuthSuccess = () => {
    setIsOfficerAuthorized(true);
    setCurrentPath('dao-command');
  };

  const handleLogout = () => {
    setIsOfficerAuthorized(false);
    setCurrentPath('officer-hub');
    showToast('Securely signed out of AP Agrinet Cadre node.');
  };

  return (
    <div className={`font-sans text-[#141e17] antialiased selection:bg-[#6bff8f] selection:text-[#007432] relative flex flex-col justify-between ${
      currentPath === 'home' ? 'h-screen overflow-hidden' : 'min-h-screen'
    }`}>
      {/* Universal Ultra-Crisp 4K Aerial Farmland River Landscape Background */}
      <div
        className="fixed inset-0 pointer-events-none -z-20 bg-cover bg-center bg-no-repeat bg-fixed transform scale-100"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=2400&q=80')`,
          imageRendering: 'crisp-edges',
        }}
      />
      {/* Subtle Crystal Vignette Tint */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-gradient-to-b from-black/5 via-transparent to-black/15" />

      {/* Top Header Bar: Pinned fixed at top across all pages */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full px-3 sm:px-6 py-1.5 backdrop-blur-2xl bg-white/90 border-b border-white/70 shadow-[0_2px_15px_rgba(0,0,0,0.06)]">
        <div className="w-full max-w-[1380px] mx-auto h-12 sm:h-13 bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.05)] px-4 sm:px-6 flex items-center justify-between gap-4 border border-white/80">
          {/* Logo & Brand Title */}
          <div
            className="flex items-center gap-2 flex-shrink-0 cursor-pointer"
            onClick={() => handleNavigate('home')}
          >
            <div className="w-7 h-7 rounded-full bg-[#006b2c] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[17px]">eco</span>
            </div>
            <span className="text-[16px] sm:text-[17px] font-bold text-[#111827] tracking-tight drop-shadow-xs">
              Krishi Sahayak
            </span>
          </div>

          {/* Navigation Bar Links with Circular Outline Round Green Layer around every section */}
          <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2">
            <button
              onClick={() => handleNavigate('home')}
              className={`text-[13px] xl:text-[13.5px] transition-all cursor-pointer rounded-full border-2 border-[#007432] px-3.5 xl:px-4 py-1 xl:py-1.5 font-bold shadow-xs ${
                currentPath === 'home'
                  ? 'bg-[#007432] text-white'
                  : 'text-[#007432] bg-emerald-50/60 hover:bg-[#007432] hover:text-white'
              }`}
              type="button"
            >
              {t.nav_home}
            </button>
            <button
              onClick={() => handleNavigate('schemes')}
              className={`text-[13px] xl:text-[13.5px] transition-all cursor-pointer rounded-full border-2 border-[#007432] px-3.5 xl:px-4 py-1 xl:py-1.5 font-bold shadow-xs ${
                currentPath === 'schemes'
                  ? 'bg-[#007432] text-white'
                  : 'text-[#007432] bg-emerald-50/60 hover:bg-[#007432] hover:text-white'
              }`}
              type="button"
            >
              {t.nav_schemes}
            </button>
            <button
              onClick={() => handleNavigate('prices')}
              className={`text-[13px] xl:text-[13.5px] transition-all cursor-pointer rounded-full border-2 border-[#007432] px-3.5 xl:px-4 py-1 xl:py-1.5 font-bold shadow-xs ${
                currentPath === 'prices'
                  ? 'bg-[#007432] text-white'
                  : 'text-[#007432] bg-emerald-50/60 hover:bg-[#007432] hover:text-white'
              }`}
              type="button"
            >
              {t.nav_prices}
            </button>
            <button
              onClick={() => handleNavigate('grievances')}
              className={`text-[13px] xl:text-[13.5px] transition-all cursor-pointer rounded-full border-2 border-[#007432] px-3.5 xl:px-4 py-1 xl:py-1.5 font-bold shadow-xs ${
                currentPath === 'grievances'
                  ? 'bg-[#007432] text-white'
                  : 'text-[#007432] bg-emerald-50/60 hover:bg-[#007432] hover:text-white'
              }`}
              type="button"
            >
              {t.nav_grievances}
            </button>
            <button
              onClick={() => handleNavigate('learn')}
              className={`text-[13px] xl:text-[13.5px] transition-all cursor-pointer rounded-full border-2 border-[#007432] px-3.5 xl:px-4 py-1 xl:py-1.5 font-bold shadow-xs ${
                currentPath === 'learn'
                  ? 'bg-[#007432] text-white'
                  : 'text-[#007432] bg-emerald-50/60 hover:bg-[#007432] hover:text-white'
              }`}
              type="button"
            >
              {t.nav_learn}
            </button>
            <button
              onClick={() => handleNavigate('officer-hub')}
              className={`text-[13px] xl:text-[13.5px] transition-all cursor-pointer text-center leading-tight rounded-full border-2 border-[#007432] px-3.5 xl:px-4 py-1 xl:py-1.5 font-bold shadow-xs ${
                currentPath === 'officer-hub' || currentPath === 'dao-command'
                  ? 'bg-[#007432] text-white'
                  : 'text-[#007432] bg-emerald-50/60 hover:bg-[#007432] hover:text-white'
              }`}
              type="button"
            >
              {t.nav_officer_hub}
            </button>
          </nav>

          {/* Right Controls: Session Timer (on other pages), Language Selector, Notifications, Profile Avatar */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Compact Session Countdown Timer (Shown on sub-pages; on home page it is positioned inside the chat box) */}
            {currentPath !== 'home' && (
              <div
                className="flex items-center gap-1 sm:gap-1.5 bg-emerald-50/70 hover:bg-emerald-50 backdrop-blur-md rounded-full px-2 sm:px-2.5 py-1 transition-colors border-2 border-[#007432] text-[11.5px] sm:text-[12px] font-bold text-[#006b2c] shadow-xs select-none"
                title={`Session state: ${sessionState} • Remaining: ${formatSessionTime(sessionSeconds)} (${sessionStatus.toUpperCase()})`}
              >
                <span className="material-symbols-outlined text-[#006b2c] text-[15px]">
                  schedule
                </span>
                <span className="font-mono text-[11.5px] sm:text-[12px] text-[#006b2c] font-bold tracking-tight">
                  {formatSessionTime(sessionSeconds)}
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    sessionStatus === 'active'
                      ? 'bg-emerald-500 animate-pulse'
                      : sessionStatus === 'warning'
                      ? 'bg-amber-500 animate-ping'
                      : 'bg-rose-500'
                  }`}
                  title={`Session status: ${sessionStatus}`}
                />
              </div>
            )}

            {/* Language Selector with Circular Outline Round Green Layer */}
            <div className="relative flex items-center bg-emerald-50/70 hover:bg-emerald-100/70 backdrop-blur-md rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 transition-colors border-2 border-[#007432] text-[13px] font-bold text-[#007432] shadow-xs">
              <span className="material-symbols-outlined text-[#006b2c] text-[17px] mr-1">
                translate
              </span>
              <select
                aria-label="Language Selector"
                value={language}
                onChange={(e) => {
                  const newLang = e.target.value as AppLanguage;
                  setLanguage(newLang);
                  const selectedOpt = languages.find((l) => l.code === newLang);
                  showToast(`Language set to ${selectedOpt?.label || 'Selected'}`);
                }}
                className="bg-transparent text-[13px] font-bold text-[#007432] focus:outline-none cursor-pointer pr-1"
              >
                {languages.map((opt) => (
                  <option key={opt.code} value={opt.code} className="bg-white text-[#111827]">
                    {opt.nativeLabel}
                  </option>
                ))}
              </select>
            </div>

            {/* Notification Bell with Round Green Layer */}
            <button
              aria-label="Notifications"
              className="w-9 h-9 rounded-full flex items-center justify-center bg-emerald-50/60 hover:bg-emerald-100 text-[#007432] transition-colors cursor-pointer border-2 border-[#007432] shadow-xs"
              type="button"
              onClick={() => showToast('Rabi season advisory active: 1 fresh weather alert')}
            >
              <span className="material-symbols-outlined text-[19px]">notifications</span>
            </button>

            {/* User Avatar with Round Green Outline Ring */}
            <div
              className="flex items-center cursor-pointer rounded-full p-0.5 border-2 border-[#007432]"
              onClick={() => {
                if (isOfficerAuthorized) {
                  setCurrentPath('dao-command');
                } else {
                  setCurrentPath('officer-hub');
                }
              }}
              title="Farmer Profile & Cadre Settings"
            >
              <img
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover shadow-xs"
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
              />
            </div>

            {/* Mobile Menu Toggle with Round Green Layer */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center text-[#007432] bg-emerald-50/60 hover:bg-emerald-100 border-2 border-[#007432] ml-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 mb-2 w-full max-w-[1380px] mx-auto bg-white/95 backdrop-blur-2xl rounded-3xl p-4 shadow-2xl border border-white/60 space-y-1.5 transition-all max-h-[calc(100vh-110px)] overflow-y-auto">
            {[
              { path: 'home', label: t.nav_home },
              { path: 'schemes', label: t.nav_schemes },
              { path: 'prices', label: t.nav_prices },
              { path: 'grievances', label: t.nav_grievances },
              { path: 'learn', label: t.nav_learn },
              { path: 'officer-hub', label: t.nav_officer_hub },
            ].map((item) => {
              const isActive =
                currentPath === item.path ||
                (item.path === 'officer-hub' && currentPath === 'dao-command');
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNavigate(item.path)}
                  className={`w-full text-left px-5 py-2.5 rounded-full border-2 border-[#007432] text-[14px] transition-all flex items-center justify-between cursor-pointer ${
                    isActive
                      ? 'text-white bg-[#007432] font-bold shadow-xs'
                      : 'text-[#007432] bg-emerald-50/70 hover:bg-[#007432] hover:text-white font-semibold'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive ? (
                    <span className="material-symbols-outlined text-[18px] text-white">check_circle</span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-[#007432]" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content Router */}
      <main className={`w-full pt-[64px] sm:pt-[70px] relative z-10 flex flex-col justify-start ${
        currentPath === 'home'
          ? 'flex-1 min-h-0 overflow-hidden pb-1'
          : 'pb-14 sm:pb-16 min-h-[calc(100vh-140px)]'
      }`}>
        {currentPath === 'home' && (
          <HomeScreen
            onNavigate={handleNavigate}
            showToast={showToast}
            isSessionActive={sessionStatus !== 'expired'}
            sessionSeconds={sessionSeconds}
            sessionStatus={sessionStatus}
            formatSessionTime={formatSessionTime}
            messages={messages}
            setMessages={setMessages}
            sessionInitialized={sessionInitialized}
          />
        )}
        {currentPath === 'officer-hub' && (
          <div className="pt-2">
            <OfficerGateway
              onAuthorizeSuccess={handleOfficerAuthSuccess}
              onNavigate={handleNavigate}
              showToast={showToast}
            />
          </div>
        )}
        {currentPath === 'dao-command' && (
          <DaoCommandCenter
            onLogout={handleLogout}
            showToast={showToast}
          />
        )}
        {currentPath === 'learn' && (
          <LearnScreen
            showToast={showToast}
          />
        )}
        {currentPath === 'schemes' && (
          <SchemesScreen showToast={showToast} />
        )}
        {currentPath === 'prices' && (
          <PricesScreen showToast={showToast} />
        )}
        {currentPath === 'grievances' && (
          <GrievancesScreen
            showToast={showToast}
            onNavigateToOfficerHub={() => handleNavigate('officer-hub')}
          />
        )}
      </main>

      {/* Interactive Toast Notification Container */}
      <div
        className={`fixed bottom-6 right-6 z-50 transform transition-all duration-300 pointer-events-none flex items-center gap-3 px-6 py-3 rounded-full bg-[#1e293b]/95 backdrop-blur-md text-[#f8fafc] shadow-2xl border border-white/20 ${
          isToastVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
        }`}
        id="toast-notification"
      >
        <span className="material-symbols-outlined text-[#4ade80] text-[22px]">
          check_circle
        </span>
        <span className="text-[13px] font-medium" id="toast-message">
          {toastMessage || 'Operation completed.'}
        </span>
      </div>

      {/* Footer */}
      <footer className="w-full bg-white/80 backdrop-blur-lg py-2.5 sm:py-3 border-t border-white/70 relative z-20 shrink-0">
        <div className="w-full max-w-[1380px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-[12px] text-[#1f2937]">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#006b2c] flex items-center justify-center text-white text-[10px]">
              ✓
            </div>
            <span className="font-semibold text-[#111827]">Krishi Sahayak • © 2026</span>
          </div>
          <div className="flex items-center gap-6 font-medium">
            <button
              type="button"
              onClick={() => showToast('Displaying Privacy Policy')}
              className="hover:text-[#006b2c] transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => showToast('Displaying Terms of Service')}
              className="hover:text-[#006b2c] transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => showToast('Dialing Kisan Call Centre: 1800-180-1551 (Toll-Free 24x7)')}
              className="hover:text-[#007432] font-bold text-[#006b2c] transition-colors cursor-pointer"
            >
              Farmer Helpline (1800-180-1551)
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
