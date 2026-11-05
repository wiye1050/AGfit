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
import { HomeTab } from './components/HomeTab';
import { WeeklyMenuTab } from './components/WeeklyMenuTab';
import { PersonalTrainerTab } from './components/PersonalTrainerTab';
import { BatchCookingTab } from './components/BatchCookingTab';
import { ShoppingListTab } from './components/ShoppingListTab';
import {
  pushHouseholdRealtime,
  subscribeHouseholdRealtime,
} from './services/googleEcosystem';

type MainTab = 'inicio' | 'menu' | 'entreno' | 'batch' | 'compra';

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

  const [activeTab, setActiveTab] = useState<MainTab>('inicio');
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

  const handleSelectUser = (user: 'guille' | 'alba') => {
    setActiveUser(user);
    try {
      localStorage.setItem(USER_STORAGE_KEY, user);
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

  // First-time Minimalist Profile Gate (Guille or Alba)
  if (!activeUser) {
    return (
      <div className="min-h-dvh bg-[#F2F2F7] dark:bg-black text-slate-900 dark:text-white flex items-center justify-center p-6">
        <div className="w-full max-w-xs space-y-6 text-center">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">AGfit</h1>
            <p className="text-xs text-slate-400">
              Selecciona tu perfil para este dispositivo
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleSelectUser('guille')}
              className="w-full apple-card rounded-2xl p-5 text-left flex items-center justify-between hover:opacity-90 transition-opacity cursor-pointer"
            >
              <div>
                <span className="text-base font-bold block">Guille</span>
                <span className="text-xs text-slate-400">
                  Déficit · Ciclado de hidratos
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-400">Entrar →</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectUser('alba')}
              className="w-full apple-card rounded-2xl p-5 text-left flex items-center justify-between hover:opacity-90 transition-opacity cursor-pointer"
            >
              <div>
                <span className="text-base font-bold block">Alba</span>
                <span className="text-xs text-slate-400">
                  Mantenimiento · Turnos HUCA
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-400">Entrar →</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const todayPlan = days.find((d) => d.day === todayDayId) || days[0];
  const currentSelectedDay = days.find((d) => d.day === selectedDayId) || days[0];

  const TABS: Array<{ id: MainTab; label: string }> = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'menu', label: 'Menú' },
    { id: 'entreno', label: 'Entreno' },
    { id: 'batch', label: 'Cocina' },
    { id: 'compra', label: 'Compra' },
  ];

  return (
    <div className="min-h-dvh bg-[#F2F2F7] dark:bg-black text-slate-900 dark:text-white pb-24 transition-colors">
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
        showDayStrip={activeTab === 'menu'}
      />

      <main className="max-w-2xl mx-auto px-4 pt-5">
        {activeTab === 'inicio' && (
          <HomeTab
            day={todayPlan}
            activeUser={activeUser}
            customRecipes={customRecipes}
            onGoToMenu={() => {
              setSelectedDayId(todayDayId);
              setActiveTab('menu');
            }}
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
          />
        )}

        {activeTab === 'menu' && (
          <WeeklyMenuTab
            days={days}
            selectedDayId={selectedDayId}
            activeUser={activeUser}
            activeTemplateKey={activeTemplateKey}
            onApplyTemplate={handleApplyTemplate}
            onUpdateDay={handleUpdateDay}
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

      {/* Clean Typographic Bottom Dock (Zero icons/emojis) */}
      <nav
        aria-label="Navegación principal"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white/90 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-full p-1 shadow-xl flex items-center gap-0.5 no-print"
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                active
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
