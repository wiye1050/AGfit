import React, { useEffect, useRef, useState } from 'react';
import {
  CustomShoppingItem,
  DayId,
  DayPlan,
  GoogleIntegrationConfig,
  PadelMatchLog,
  Recipe,
  RunningLog,
  SetProgress,
  ThemeMode,
  UserTrainingHistoryEntry,
  WeightEntry,
} from './types';
import { WEEK_TEMPLATES } from './data/recipes';
import {
  INITIAL_PADEL_LOGS,
  INITIAL_RUNNING_LOGS,
  INITIAL_TRAINING_HISTORY,
} from './data/workouts';
import { TodayHeader } from './components/TodayHeader';
import { WeeklyMenuTab } from './components/WeeklyMenuTab';
import { PersonalTrainerTab } from './components/PersonalTrainerTab';
import { BatchCookingTab } from './components/BatchCookingTab';
import { ShoppingListTab } from './components/ShoppingListTab';
import {
  pushHouseholdRealtime,
  subscribeHouseholdRealtime,
} from './services/googleEcosystem';

type MainTab = 'hoy' | 'entreno' | 'batch' | 'compra';

const STORAGE_KEY = 'agfit_oviedo_v3';
const USER_STORAGE_KEY = 'agfit_device_user';

function getTodayDayId(): DayId {
  const jsDay = new Date().getDay();
  const map: Record<number, DayId> = {
    1: 'lunes',
    2: 'martes',
    3: 'miercoles',
    4: 'jueves',
    5: 'viernes',
    6: 'sabado',
    0: 'domingo',
  };
  return map[jsDay] || 'lunes';
}

const INITIAL_WEIGHT_LOGS: WeightEntry[] = [
  { id: 'w_1', weekLabel: 'Sem 1', date: '22 Oct', guilleWeightKg: 85.0, albaWeightKg: 53.0 },
  { id: 'w_2', weekLabel: 'Sem 2', date: '29 Oct', guilleWeightKg: 84.5, albaWeightKg: 53.1 },
  { id: 'w_3', weekLabel: 'Sem 3', date: '05 Nov', guilleWeightKg: 84.1, albaWeightKg: 53.0 },
];

const INITIAL_GOOGLE_CONFIG: GoogleIntegrationConfig = {
  firebaseProjectId: 'agfit-oviedo-2026',
  firebaseApiKey: 'AIzaSyBZXvIwHFDIQ4xrtMRmGq1KIzkkgPxXzCk',
  householdDocId: 'oviedo_guille_alba',
  guilleEmail: 'guillemenendez1050@gmail.com',
  albaEmail: '',
  calendarIdGuille: 'primary',
  calendarIdAlba: 'primary',
  syncEnabled: true,
};

export function App() {
  const todayDayId = getTodayDayId();
  const [activeUser, setActiveUser] = useState<'guille' | 'alba' | null>(() => {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      if (saved === 'guille' || saved === 'alba') return saved;
    } catch {
      // ignore
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<MainTab>('hoy');
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [selectedDayId, setSelectedDayId] = useState<DayId>(todayDayId);
  const [activeTemplateKey, setActiveTemplateKey] = useState<'semana_a' | 'semana_b' | 'semana_c'>('semana_a');

  const [days, setDays] = useState<DayPlan[]>(() => WEEK_TEMPLATES.semana_a.days);
  const [customRecipes] = useState<Recipe[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightEntry[]>(INITIAL_WEIGHT_LOGS);

  const [setProgressMap, setSetProgressMap] = useState<Record<string, SetProgress[]>>({});
  const [swappedExerciseMap, setSwappedExerciseMap] = useState<Record<string, number>>({});
  const [padelLogs, setPadelLogs] = useState<PadelMatchLog[]>(INITIAL_PADEL_LOGS);
  const [runningLogs, setRunningLogs] = useState<RunningLog[]>(INITIAL_RUNNING_LOGS);
  const [trainingHistory, setTrainingHistory] = useState<UserTrainingHistoryEntry[]>(
    INITIAL_TRAINING_HISTORY
  );

  const [completedBatchSteps, setCompletedBatchSteps] = useState<Record<string, boolean>>({});

  const [pantryCheckedMap, setPantryCheckedMap] = useState<Record<string, boolean>>({
    ing_cafe: true,
    ing_avena: true,
    ing_arroz: true,
  });
  const [cartCheckedMap, setCartCheckedMap] = useState<Record<string, boolean>>({});
  const [customShoppingItems, setCustomShoppingItems] = useState<CustomShoppingItem[]>([
    {
      id: 'cust_1',
      name: 'Café en grano especialidad',
      quantityText: '500g',
      aisle: 'despensa',
      inPantry: false,
      inCart: false,
    },
  ]);

  const [googleConfig, setGoogleConfig] = useState<GoogleIntegrationConfig>(INITIAL_GOOGLE_CONFIG);
  const [cloudConnected, setCloudConnected] = useState(false);

  const clientIdRef = useRef<string>(`client_${Math.random().toString(36).slice(2, 10)}`);
  const cloudHydratedRef = useRef<boolean>(false);
  const isApplyingRemoteRef = useRef<boolean>(false);

  const handleSelectUser = (user: 'guille' | 'alba' | null) => {
    setActiveUser(user);
    try {
      if (user) {
        localStorage.setItem(USER_STORAGE_KEY, user);
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.days) setDays(parsed.days);
      if (parsed.theme) setTheme(parsed.theme);
      if (parsed.weightLogs) setWeightLogs(parsed.weightLogs);
      if (parsed.setProgressMap) setSetProgressMap(parsed.setProgressMap);
      if (parsed.swappedExerciseMap) setSwappedExerciseMap(parsed.swappedExerciseMap);
      if (parsed.padelLogs) setPadelLogs(parsed.padelLogs);
      if (parsed.runningLogs) setRunningLogs(parsed.runningLogs);
      if (parsed.trainingHistory) setTrainingHistory(parsed.trainingHistory);
      if (parsed.completedBatchSteps) setCompletedBatchSteps(parsed.completedBatchSteps);
      if (parsed.pantryCheckedMap) setPantryCheckedMap(parsed.pantryCheckedMap);
      if (parsed.cartCheckedMap) setCartCheckedMap(parsed.cartCheckedMap);
      if (parsed.customShoppingItems) setCustomShoppingItems(parsed.customShoppingItems);
      if (parsed.googleConfig && parsed.googleConfig.firebaseProjectId) {
        setGoogleConfig(parsed.googleConfig);
      } else {
        setGoogleConfig(INITIAL_GOOGLE_CONFIG);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const unsub = subscribeHouseholdRealtime(
      googleConfig,
      (exists, remote) => {
        if (!exists || !remote) {
          cloudHydratedRef.current = true;
          pushHouseholdRealtime(googleConfig, {
            days,
            customRecipes,
            weightLogs,
            setProgressMap,
            swappedExerciseMap,
            padelLogs,
            runningLogs,
            trainingHistory,
            completedBatchSteps,
            pantryCheckedMap,
            cartCheckedMap,
            customShoppingItems,
            lastSyncAt: clientIdRef.current,
          });
          return;
        }

        if (remote.lastSyncAt === clientIdRef.current && cloudHydratedRef.current) {
          return;
        }

        isApplyingRemoteRef.current = true;
        cloudHydratedRef.current = true;

        if (Array.isArray(remote.days)) setDays(remote.days as DayPlan[]);
        if (Array.isArray(remote.weightLogs)) setWeightLogs(remote.weightLogs as WeightEntry[]);
        if (remote.setProgressMap) {
          setSetProgressMap(remote.setProgressMap as Record<string, SetProgress[]>);
        }
        if (remote.swappedExerciseMap) {
          setSwappedExerciseMap(remote.swappedExerciseMap as Record<string, number>);
        }
        if (remote.completedBatchSteps) {
          setCompletedBatchSteps(remote.completedBatchSteps as Record<string, boolean>);
        }
        if (remote.pantryCheckedMap) {
          setPantryCheckedMap(remote.pantryCheckedMap as Record<string, boolean>);
        }
        if (remote.cartCheckedMap) {
          setCartCheckedMap(remote.cartCheckedMap as Record<string, boolean>);
        }
        if (Array.isArray(remote.customShoppingItems)) {
          setCustomShoppingItems(remote.customShoppingItems as CustomShoppingItem[]);
        }

        setTimeout(() => {
          isApplyingRemoteRef.current = false;
        }, 60);
      },
      (connected) => setCloudConnected(connected)
    );
    return () => {
      if (unsub) unsub();
    };
  }, [googleConfig.syncEnabled, googleConfig.firebaseProjectId, googleConfig.firebaseApiKey]);

  useEffect(() => {
    const payload = {
      theme,
      days,
      customRecipes,
      weightLogs,
      setProgressMap,
      swappedExerciseMap,
      padelLogs,
      runningLogs,
      trainingHistory,
      completedBatchSteps,
      pantryCheckedMap,
      cartCheckedMap,
      customShoppingItems,
      googleConfig,
      lastSyncAt: clientIdRef.current,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }

    if (
      cloudHydratedRef.current &&
      !isApplyingRemoteRef.current &&
      googleConfig.syncEnabled &&
      googleConfig.firebaseProjectId
    ) {
      pushHouseholdRealtime(googleConfig, payload);
    }
  }, [
    theme,
    days,
    customRecipes,
    weightLogs,
    setProgressMap,
    swappedExerciseMap,
    padelLogs,
    runningLogs,
    trainingHistory,
    completedBatchSteps,
    pantryCheckedMap,
    cartCheckedMap,
    customShoppingItems,
    googleConfig,
  ]);

  const handleUpdateDay = (dayId: DayId, updater: (prev: DayPlan) => DayPlan) => {
    setDays((prev) => prev.map((d) => (d.day === dayId ? updater(d) : d)));
  };

  const handleApplyTemplate = (key: 'semana_a' | 'semana_b' | 'semana_c') => {
    setActiveTemplateKey(key);
    setDays(WEEK_TEMPLATES[key].days);
  };

  const handleUpdateSetProgress = (
    exerciseKey: string,
    setIndex: number,
    updater: (prev: SetProgress) => SetProgress,
    _defaultRestSec: number
  ) => {
    setSetProgressMap((prev) => {
      const existingList = prev[exerciseKey] || [
        { completed: false, weight: '20 kg', reps: '10', rir: 'RIR 1-2' },
        { completed: false, weight: '20 kg', reps: '10', rir: 'RIR 1-2' },
        { completed: false, weight: '20 kg', reps: '10', rir: 'RIR 1-2' },
        { completed: false, weight: '20 kg', reps: '10', rir: 'RIR 1-2' },
      ];
      const nextList = existingList.map((item, idx) =>
        idx === setIndex ? updater(item) : item
      );
      return { ...prev, [exerciseKey]: nextList };
    });
  };

  // First-time Minimalist Fitness Profile Gate (Guille or Alba — Zero Subtitles)
  if (!activeUser) {
    const todayFormatted = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    return (
      <div className="min-h-dvh bg-[#09090B] text-white flex flex-col justify-between p-6 sm:p-10 relative overflow-hidden">
        {/* Subtle Fitness Ambient Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full bg-[#30D158]/10 blur-[110px]"
        />

        {/* Top Athletic Brand Mark */}
        <div className="relative z-10 max-w-sm w-full mx-auto pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#30D158]" />
            <span className="text-xs font-extrabold uppercase tracking-[0.25em] text-white/90">
              AGFIT
            </span>
          </div>
          <span className="text-xs font-medium capitalize text-zinc-500">
            {todayFormatted}
          </span>
        </div>

        {/* Center Hero Athlete Selector */}
        <div className="relative z-10 max-w-sm w-full mx-auto my-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Bienvenido
            </h1>
            <p className="text-sm text-zinc-400">
              Selecciona tu perfil para entrar
            </p>
          </div>

          <div className="space-y-3.5">
            <button
              type="button"
              onClick={() => handleSelectUser('guille')}
              className="group w-full rounded-3xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.99] border border-white/10 hover:border-[#30D158]/50 p-6 text-left flex items-center justify-between transition-all cursor-pointer backdrop-blur-xl"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#30D158]/15 border border-[#30D158]/30 flex items-center justify-center text-lg font-black text-[#30D158]">
                  G
                </div>
                <span className="text-xl font-extrabold tracking-tight text-white">
                  Guille
                </span>
              </div>

              <span className="px-4 py-2 rounded-full text-xs font-bold bg-white text-black group-hover:bg-[#30D158] transition-colors">
                Entrar →
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectUser('alba')}
              className="group w-full rounded-3xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.99] border border-white/10 hover:border-[#30D158]/50 p-6 text-left flex items-center justify-between transition-all cursor-pointer backdrop-blur-xl"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-lg font-black text-white">
                  A
                </div>
                <span className="text-xl font-extrabold tracking-tight text-white">
                  Alba
                </span>
              </div>

              <span className="px-4 py-2 rounded-full text-xs font-bold bg-white text-black group-hover:bg-[#30D158] transition-colors">
                Entrar →
              </span>
            </button>
          </div>
        </div>

        {/* Minimal Footer */}
        <div className="relative z-10 max-w-sm w-full mx-auto pb-2 text-center">
          <span className="text-[11px] font-medium tracking-wider uppercase text-zinc-600">
            Nutrición · Entrenamiento · Planificación
          </span>
        </div>
      </div>
    );
  }

  const currentSelectedDay = days.find((d) => d.day === selectedDayId) || days[0];

  const TABS: Array<{ id: MainTab; label: string }> = [
    { id: 'hoy', label: 'Hoy' },
    { id: 'entreno', label: 'Entreno' },
    { id: 'batch', label: 'Cocina' },
    { id: 'compra', label: 'Compra' },
  ];

  return (
    <div className="min-h-dvh bg-[#F2F2F7] dark:bg-[#09090B] text-slate-900 dark:text-white pb-24 transition-colors relative overflow-x-hidden">
      {/* Subtle Top Ambient Emerald Glow in Dark Mode */}
      <div
        aria-hidden="true"
        className="hidden dark:block pointer-events-none fixed -top-44 left-1/2 -translate-x-1/2 w-[520px] h-[360px] rounded-full bg-[#30D158]/[0.07] blur-[110px] z-0"
      />

      <TodayHeader
        days={days}
        selectedDayId={selectedDayId}
        todayDayId={todayDayId}
        onSelectDay={setSelectedDayId}
        activeUser={activeUser}
        onSwitchUser={handleSelectUser}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        weightLogs={weightLogs}
        onAddWeightLog={(entry) =>
          setWeightLogs((prev) => [...prev, { ...entry, id: `w_${Date.now()}` }])
        }
        syncActive={cloudConnected}
        showDayStrip={activeTab === 'hoy' || activeTab === 'entreno'}
      />

      <main className="relative z-10 max-w-2xl mx-auto px-4 pt-5">
        {activeTab === 'hoy' && (
          <WeeklyMenuTab
            days={days}
            selectedDayId={selectedDayId}
            todayDayId={todayDayId}
            activeUser={activeUser}
            activeTemplateKey={activeTemplateKey}
            onApplyTemplate={handleApplyTemplate}
            onUpdateDay={handleUpdateDay}
            onGoToWorkout={() => setActiveTab('entreno')}
            onToggleSupplement={(dayId, key) =>
              handleUpdateDay(dayId, (prev) => ({
                ...prev,
                supplementsCheck: {
                  ...prev.supplementsCheck,
                  [key]: !prev.supplementsCheck[key],
                },
              }))
            }
            customRecipes={customRecipes}
          />
        )}

        {activeTab === 'entreno' && (
          <PersonalTrainerTab
            selectedDay={currentSelectedDay}
            activeUser={activeUser}
            setProgressMap={setProgressMap}
            onUpdateSetProgress={handleUpdateSetProgress}
            swappedExerciseMap={swappedExerciseMap}
            onSwapExerciseAlternative={(exId, maxAlts) =>
              setSwappedExerciseMap((prev) => ({
                ...prev,
                [exId]: ((prev[exId] || 0) + 1) % (maxAlts + 1),
              }))
            }
          />
        )}

        {activeTab === 'batch' && (
          <BatchCookingTab
            days={days}
            completedStepIds={completedBatchSteps}
            onToggleStepCompleted={(stepId) =>
              setCompletedBatchSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }))
            }
            onResetBatchSteps={() => setCompletedBatchSteps({})}
          />
        )}

        {activeTab === 'compra' && (
          <ShoppingListTab
            days={days}
            pantryCheckedMap={pantryCheckedMap}
            cartCheckedMap={cartCheckedMap}
            onTogglePantryItem={(id) =>
              setPantryCheckedMap((prev) => ({ ...prev, [id]: !prev[id] }))
            }
            onToggleCartItem={(id) =>
              setCartCheckedMap((prev) => ({ ...prev, [id]: !prev[id] }))
            }
            onResetShoppingChecks={() => setCartCheckedMap({})}
            customItems={customShoppingItems}
            onAddCustomItem={(item) =>
              setCustomShoppingItems((prev) => [
                ...prev,
                { ...item, id: `ci_${Date.now()}`, inPantry: false, inCart: false },
              ])
            }
            onToggleCustomItemPantry={(id) =>
              setCustomShoppingItems((prev) =>
                prev.map((c) => (c.id === id ? { ...c, inPantry: !c.inPantry } : c))
              )
            }
            onToggleCustomItemCart={(id) =>
              setCustomShoppingItems((prev) =>
                prev.map((c) => (c.id === id ? { ...c, inCart: !c.inCart } : c))
              )
            }
            onDeleteCustomItem={(id) =>
              setCustomShoppingItems((prev) => prev.filter((c) => c.id !== id))
            }
          />
        )}
      </main>

      {/* Clean 4-Tab Typographic Bottom Dock (Zero icons/emojis) */}
      <nav
        aria-label="Navegación principal"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white/90 dark:bg-[#121215]/95 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-full p-1.5 shadow-2xl flex items-center gap-1 no-print"
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-full text-xs font-extrabold tracking-tight transition-all cursor-pointer ${
                active
                  ? 'bg-[#30D158] text-black shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;
