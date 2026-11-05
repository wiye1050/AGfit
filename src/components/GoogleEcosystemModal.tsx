import React, { useState } from 'react';
import {
  DayPlan,
  GoogleIntegrationConfig,
} from '../types';
import {
  exportWeeklyMenuAndShoppingToSheetsCsv,
  exportWeekToGoogleCalendarIcs,
  loginWithGoogleEcosystem,
  pushHouseholdRealtime,
} from '../services/googleEcosystem';
import { aggregateWeeklyShoppingList } from '../utils/shoppingEngine';
import {
  Calendar,
  CheckCircle2,
  Cloud,
  Download,
  FileSpreadsheet,
  KeyRound,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';

interface GoogleEcosystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GoogleIntegrationConfig;
  onUpdateConfig: (next: GoogleIntegrationConfig) => void;
  days: DayPlan[];
  fullStateForSync: Record<string, unknown>;
}

export const GoogleEcosystemModal: React.FC<GoogleEcosystemModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  days,
  fullStateForSync,
}) => {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'ok' | 'err'>('ok');
  const [signedInUserEmail, setSignedInUserEmail] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setStatusMessage('Conectando con Google OAuth2 / Firebase...');
    const res = await loginWithGoogleEcosystem(config);
    if (res.error) {
      setStatusType('err');
      setStatusMessage(res.error);
      return;
    }
    setSignedInUserEmail(res.user?.email || 'Autenticado');
    setStatusType('ok');
    setStatusMessage(`Sesión iniciada correctamente como ${res.user?.email}.`);
  };

  const handleManualCloudPush = async () => {
    const ok = await pushHouseholdRealtime(config, fullStateForSync);
    if (ok) {
      setStatusType('ok');
      setStatusMessage('¡Datos sincronizados en tiempo real con Firebase Firestore!');
      onUpdateConfig({ ...config, lastSyncAt: new Date().toLocaleTimeString('es-ES') });
    } else {
      setStatusType('err');
      setStatusMessage(
        'Activa la casilla de Sincronización Firebase e introduce tu Project ID y API Key de Firebase.'
      );
    }
  };

  const shoppingItems = aggregateWeeklyShoppingList(days);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Centro de Integración Google & Cloud (Guille & Alba)
              </h2>
              <p className="text-xs text-slate-500">
                Firebase Firestore en tiempo real · Google Auth privado · Google Calendar · Google Sheets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Direct One-Click Google Calendar & Google Sheets Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              exportWeekToGoogleCalendarIcs(days);
              setStatusType('ok');
              setStatusMessage(
                'Archivo .ICS generado con turnos HUCA de Alba, entrenos de ambos y Batch Cooking del domingo.'
              );
            }}
            className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-left space-y-1 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2 text-xs font-extrabold text-cyan-400">
              <Calendar className="w-4 h-4" />
              <span>Exportar Semana a Google Calendar (.ics)</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-300">
              Crea todos los bloques de Turnos HUCA, Entrenamientos Enjoy/Pádel y la sesión de Batch Cooking.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              exportWeeklyMenuAndShoppingToSheetsCsv(days, shoppingItems);
              setStatusType('ok');
              setStatusMessage(
                'Archivo CSV descargado listo para abrir o importar en Google Sheets / Drive.'
              );
            }}
            className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-left space-y-1 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar a Google Sheets / Drive (.csv)</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-300">
              Exporta la tabla completa Lunes-Domingo con macros de Guille y Alba + Lista de la compra.
            </p>
          </button>
        </div>

        {/* 2. Firebase Auth + Firestore Real-Time Configuration */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Sincronización en Tiempo Real (Firebase Firestore + Login Privado)
            </h3>
            <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 cursor-pointer">
              <input
                type="checkbox"
                checked={config.syncEnabled}
                onChange={(e) =>
                  onUpdateConfig({ ...config, syncEnabled: e.target.checked })
                }
                className="rounded"
              />
              <span>Sincronización Cloud Activa</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Firebase Project ID:
              </label>
              <input
                type="text"
                value={config.firebaseProjectId}
                onChange={(e) =>
                  onUpdateConfig({ ...config, firebaseProjectId: e.target.value })
                }
                placeholder="ej: agfit-oviedo"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Firebase Web API Key:
              </label>
              <input
                type="password"
                value={config.firebaseApiKey}
                onChange={(e) =>
                  onUpdateConfig({ ...config, firebaseApiKey: e.target.value })
                }
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-emerald-500 mb-1">
                Email Google Autorizado (Guille):
              </label>
              <input
                type="email"
                value={config.guilleEmail}
                onChange={(e) =>
                  onUpdateConfig({ ...config, guilleEmail: e.target.value })
                }
                placeholder="guille@gmail.com"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-rose-400 mb-1">
                Email Google Autorizado (Alba):
              </label>
              <input
                type="email"
                value={config.albaEmail}
                onChange={(e) =>
                  onUpdateConfig({ ...config, albaEmail: e.target.value })
                }
                placeholder="alba@gmail.com"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white hover:border-cyan-400 cursor-pointer"
              >
                🔐 Iniciar Sesión con Google
              </button>
              <button
                type="button"
                onClick={handleManualCloudPush}
                className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer"
              >
                ☁️ Sincronizar Ahora con Firestore
              </button>
            </div>
            {signedInUserEmail && (
              <span className="text-xs font-bold text-emerald-400">
                ✓ Conectado: {signedInUserEmail}
              </span>
            )}
          </div>
        </div>

        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-bold border ${
              statusType === 'ok'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {statusMessage}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-extrabold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white cursor-pointer"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
