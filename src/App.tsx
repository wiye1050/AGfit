import React, { useEffect, useState } from 'react';
import {
  AlbaShift,
  CustomShoppingItem,
  DayId,
  DayPlan,
  ExerciseItem,
  GoogleIntegrationConfig,
  GuilleShift,
  PadelMatchLog,
  ProfileView,
  Recipe,
  RunningLog,
  SetProgress,
  ThemeMode,
  TrainingType,
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
import { GoogleEcosystemModal } from './components/GoogleEcosystemModal';
import {
  exportWeeklyMenuAndShoppingToSheetsCsv,
  pushHouseholdRealtime,
  subscribeHouseholdRealtime,
} from './services/googleEcosystem';
import { aggregateWeeklyShoppingList } from './utils/shoppingEngine';
import {
  Calendar,
  ChefHat,
  Dumbbell,
  Flame,
  ShoppingCart,
} from 'lucide-react';

type MainTab = 'menu' | 'entreno' | 'batch' | 'compra';

const STORAGE_KEY = 'agfit_oviedo_state_v1';

const INITIAL_WEIGHT_LOGS: WeightEntry[] = [
  { id: 'w_1', weekLabel: 'Sem 1 (Inicio)', date: '22 Oct', guilleWeightKg: 85.0, albaWeightKg: 53.0 },
  { id: 'w_2', weekLabel: 'Sem 2', date: '29 Oct', guilleWeightKg: 84.5, albaWeightKg: 53.1 },
  { id: 'w_3', weekLabel: 'Sem 3 (Actual)', date: '05 Nov', guilleWeightKg: 84.1, albaWeightKg: 53.0 },
];

const INITIAL_GOOGLE_CONFIG: GoogleIntegrationConfig = {
  firebaseProjectId: '',
  firebaseApiKey: '',
  householdDocId: 'oviedo_guille_alba',
  guilleEmail: '',
  albaEmail: '',
  calendarIdGuille: 'primary',
  calendarIdAlba: 'primary',
  syncEnabled: false,
};

export function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('menu');
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [profileView, setProfileView] = useState<ProfileView>('pareja');
  const [selectedDayId, setSelectedDayId] = useState<DayId>('lunes');
  const [activeTemplateKey, setActiveTemplateKey] = useState<'semana_a' | 'semana_b' | 'semana_c'>('semana_a');

  const [days, setDays] = useState<DayPlan[]>(() => WEEK_TEMPLATES.semana_a.days);
  const [customRecipes, setCustomRecipes] = useState<Recipe[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightEntry[]>(INITIAL_WEIGHT_LOGS);

  // Training & Padel state
  const [setProgressMap, setSetProgressMap] = useState<Record<string, SetProgress[]>>({});
  const [swappedExerciseMap, setSwappedExerciseMap] = useState<Record<string, number>>({});
  const [customExercisesBySession, setCustomExercisesBySession] = useState<
    Record<string, ExerciseItem[]>
  >({});
  const [padelLogs, setPadelLogs] = useState<PadelMatchLog[]>(INITIAL_PADEL_LOGS);
  const [runningLogs, setRunningLogs] = useState<RunningLog[]>(INITIAL_RUNNING_LOGS);
  const [trainingHistory, setTrainingHistory] = useState<UserTrainingHistoryEntry[]>(
    INITIAL_TRAINING_HISTORY
  );

  // Batch Cooking state
  const [completedBatchSteps, setCompletedBatchSteps] = useState<Record<string, boolean>>({});

  // Shopping & Pantry state
  const [pantryCheckedMap, setPantryCheckedMap] = useState<Record<string, boolean>>({
    ing_cafe: true,
    ing_avena: true,
    ing_arroz: true,
  });
  const [cartCheckedMap, setCartCheckedMap] = useState<Record<string, boolean>>({});
  const [customShoppingItems, setCustomShoppingItems] = useState<CustomShoppingItem[]>([
    {
      id: 'cust_1',
      name: 'Cápsulas / Café en grano especialidad',
      quantityText: '1 paq. 500g',
      aisle: 'despensa',
      inPantry: false,
      inCart: false,
    },
  ]);

  // Google & Firebase Config Modal
  const [googleConfig, setGoogleConfig] = useState<GoogleIntegrationConfig>(INITIAL_GOOGLE_CONFIG);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // Load persisted state from LocalStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.days) setDays(parsed.days);
      if (parsed.theme) setTheme(parsed.theme);
      if (parsed.customRecipes) setCustomRecipes(parsed.customRecipes);
      if (parsed.weightLogs) setWeightLogs(parsed.weightLogs);
      if (parsed.setProgressMap) setSetProgressMap(parsed.setProgressMap);
      if (parsed.padelLogs) setPadelLogs(parsed.padelLogs);
      if (parsed.runningLogs) setRunningLogs(parsed.runningLogs);
      if (parsed.trainingHistory) setTrainingHistory(parsed.trainingHistory);
      if (parsed.completedBatchSteps) setCompletedBatchSteps(parsed.completedBatchSteps);
      if (parsed.pantryCheckedMap) setPantryCheckedMap(parsed.pantryCheckedMap);
      if (parsed.cartCheckedMap) setCartCheckedMap(parsed.cartCheckedMap);
      if (parsed.customShoppingItems) setCustomShoppingItems(parsed.customShoppingItems);
      if (parsed.googleConfig) setGoogleConfig(parsed.googleConfig);
    } catch (e) {
      console.warn('Error cargando estado local:', e);
    }
  }, []);

  // Apply Dark / Light Theme class to <html>
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

  // Save state to LocalStorage and optionally push to Firestore
  useEffect(() => {
    const payload = {
      theme,
      days,
      customRecipes,
      weightLogs,
      setProgressMap,
      padelLogs,
      runningLogs,
      trainingHistory,
      completedBatchSteps,
      pantryCheckedMap,
      cartCheckedMap,
      customShoppingItems,
      googleConfig,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage quota errors
    }
    if (googleConfig.syncEnabled && googleConfig.firebaseProjectId) {
      pushHouseholdRealtime(googleConfig, payload);
    }
  }, [
    theme,
    days,
    customRecipes,
    weightLogs,
    setProgressMap,
    padelLogs,
    runningLogs,
    trainingHistory,
    completedBatchSteps,
    pantryCheckedMap,
    cartCheckedMap,
    customShoppingItems,
    googleConfig,
  ]);

  // Subscribe to Firebase Firestore real-time updates when enabled
  useEffect(() => {
    const unsub = subscribeHouseholdRealtime(googleConfig, (remote) => {
      if (Array.isArray(remote.days)) setDays(remote.days as DayPlan[]);
      if (remote.pantryCheckedMap) {
        setPantryCheckedMap(remote.pantryCheckedMap as Record<string, boolean>);
      }
      if (remote.cartCheckedMap) {
        setCartCheckedMap(remote.cartCheckedMap as Record<string, boolean>);
      }
      if (Array.isArray(remote.customShoppingItems)) {
        setCustomShoppingItems(remote.customShoppingItems as CustomShoppingItem[]);
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, [googleConfig.syncEnabled, googleConfig.firebaseProjectId, googleConfig.firebaseApiKey]);

  const handleUpdateDay = (dayId: DayId, updater: (prev: DayPlan) => DayPlan) => {
    setDays((prev) => prev.map((d) => (d.day === dayId ? updater(d) : d)));
  };

  const handleApplyTemplate = (key: 'semana_a' | 'semana_b' | 'semana_c') => {
    setActiveTemplateKey(key);
    setDays(WEEK_TEMPLATES[key].days);
  };

  const handleBatchUpdateShifts = (
    albaShifts: AlbaShift[] | null,
    guilleShifts: GuilleShift[] | null
  ) => {
    setDays((prev) =>
      prev.map((d, idx) => ({
        ...d,
        albaShift: albaShifts && albaShifts[idx] ? albaShifts[idx] : d.albaShift,
        guilleShift: guilleShifts && guilleShifts[idx] ? guilleShifts[idx] : d.guilleShift,
      }))
    );
  };

  const handleAutoFixLegPadelConflict = (dayIndex: number) => {
    setDays((prev) => {
      const copy = [...prev];
      const curr = copy[dayIndex];
      // Swap 'pierna' on current day with 'empuje' or 'tiron'
      if (curr.guilleTraining === 'pierna') {
        const swapIdx = copy.findIndex(
          (d, i) =>
            i !== dayIndex &&
            (d.guilleTraining === 'empuje' || d.guilleTraining === 'tiron')
        );
        if (swapIdx >= 0) {
          const otherTrain = copy[swapIdx].guilleTraining;
          copy[swapIdx] = { ...copy[swapIdx], guilleTraining: 'pierna' };
          copy[dayIndex] = { ...curr, guilleTraining: otherTrain };
        } else {
          copy[dayIndex] = { ...curr, guilleTraining: 'empuje' };
        }
      }
      return copy;
    });
  };

  const handleSyncTrainingToDay = (
    dayId: DayId,
    athlete: 'guille' | 'alba',
    training: TrainingType,
    extraClass?: string,
    customAct?: { name: string; durationMin: number; intensity: 'suave' | 'media' | 'alta' }
  ) => {
    handleUpdateDay(dayId, (prev) => {
      if (athlete === 'guille') {
        return {
          ...prev,
          guilleTraining: training,
          guilleCustomActivity: customAct || prev.guilleCustomActivity,
        };
      }
      return {
        ...prev,
        albaTraining: training,
        albaDirectedClass: extraClass || prev.albaDirectedClass,
        albaCustomActivity: customAct || prev.albaCustomActivity,
      };
    });
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

  const handleExportSheetsCsv = () => {
    const shopping = aggregateWeeklyShoppingList(days);
    exportWeeklyMenuAndShoppingToSheetsCsv(days, shopping);
  };

  const currentSelectedDay = days.find((d) => d.day === selectedDayId) || days[0];

  const TABS_CONFIG: Array<{
    id: MainTab;
    label: string;
    shortLabel: string;
    subtitle: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'menu',
      label: '1. Menú Semanal & Turnos',
      shortLabel: 'Menú',
      subtitle: 'Lunes a Domingo · Ciclado HC',
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'entreno',
      label: '2. Entrenador Enjoy & Pádel',
      shortLabel: 'Entreno',
      subtitle: 'Fuerza · Pádel · Running · Clases',
      icon: <Dumbbell className="w-4 h-4" />,
    },
    {
      id: 'batch',
      label: '3. Batch Cooking Paralelo',
      shortLabel: 'Batch',
      subtitle: 'Horno · Olla · Vitro · Airfryer',
      icon: <ChefHat className="w-4 h-4" />,
    },
    {
      id: 'compra',
      label: '4. Lista de la Compra',
      shortLabel: 'Compra',
      subtitle: '6 Pasillos · Stock Despensa',
      icon: <ShoppingCart className="w-4 h-4" />,
    },
  ];

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-[#070B14] text-slate-900 dark:text-slate-100 pb-24 md:pb-12 transition-colors">
      {/* Operational Top Header ("Hoy en AGfit") */}
      <TodayHeader
        days={days}
        selectedDayId={selectedDayId}
        onSelectDay={setSelectedDayId}
        profileView={profileView}
        onChangeProfileView={setProfileView}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        weightLogs={weightLogs}
        onAddWeightLog={(entry) =>
          setWeightLogs((prev) => [...prev, { ...entry, id: `w_${Date.now()}` }])
        }
        onToggleSupplement={(dayId, key) =>
          handleUpdateDay(dayId, (prev) => ({
            ...prev,
            supplementsCheck: {
              ...prev.supplementsCheck,
              [key]: !prev.supplementsCheck[key],
            },
          }))
        }
        onAutoFixLegPadelConflict={handleAutoFixLegPadelConflict}
        onOpenGoogleModal={() => setShowGoogleModal(true)}
        onExportSheetsCsv={handleExportSheetsCsv}
        syncActive={googleConfig.syncEnabled}
      />

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 space-y-5">
        {/* Desktop / Tablet 4-Tab Navigation Bar */}
        <nav
          aria-label="Módulos principales de AGfit"
          className="hidden md:grid grid-cols-4 gap-3 no-print"
        >
          {TABS_CONFIG.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-br from-emerald-500/15 via-cyan-500/10 to-transparent border-emerald-500/50 shadow-md'
                    : 'bg-white dark:bg-slate-900/75 border-slate-200 dark:border-slate-800/90 hover:border-emerald-500/30'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tab.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                    {tab.label}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {tab.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Active Tab View */}
        {activeTab === 'menu' && (
          <WeeklyMenuTab
            days={days}
            selectedDayId={selectedDayId}
            onSelectDay={setSelectedDayId}
            profileView={profileView}
            activeTemplateKey={activeTemplateKey}
            onApplyTemplate={handleApplyTemplate}
            onUpdateDay={handleUpdateDay}
            onBatchUpdateShifts={handleBatchUpdateShifts}
            onAddCustomRecipeToCatalog={(r) => setCustomRecipes((prev) => [...prev, r])}
            customRecipes={customRecipes}
          />
        )}

        {activeTab === 'entreno' && (
          <PersonalTrainerTab
            selectedDay={currentSelectedDay}
            onSyncTrainingToDay={handleSyncTrainingToDay}
            setProgressMap={setProgressMap}
            onUpdateSetProgress={handleUpdateSetProgress}
            swappedExerciseMap={swappedExerciseMap}
            onSwapExerciseAlternative={(exId, maxAlts) =>
              setSwappedExerciseMap((prev) => ({
                ...prev,
                [exId]: ((prev[exId] || 0) + 1) % (maxAlts + 1),
              }))
            }
            customExercisesBySession={customExercisesBySession}
            onAddCustomExercise={(sId, ex) =>
              setCustomExercisesBySession((prev) => ({
                ...prev,
                [sId]: [...(prev[sId] || []), ex],
              }))
            }
            padelLogs={padelLogs}
            onAddPadelLog={(log) =>
              setPadelLogs((prev) => [{ ...log, id: `pad_${Date.now()}` }, ...prev])
            }
            runningLogs={runningLogs}
            onAddRunningLog={(log) =>
              setRunningLogs((prev) => [{ ...log, id: `run_${Date.now()}` }, ...prev])
            }
            trainingHistory={trainingHistory}
            onAddTrainingHistory={(entry) =>
              setTrainingHistory((prev) => [{ ...entry, id: `hist_${Date.now()}` }, ...prev])
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
            onExportSheetsCsv={handleExportSheetsCsv}
          />
        )}
      </main>

      {/* Mobile Native-Style Bottom Tab Navigation Bar */}
      <nav
        aria-label="Navegación móvil inferior"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 grid grid-cols-4 gap-1 no-print"
      >
        {TABS_CONFIG.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {tab.icon}
              <span className="mt-0.5">{tab.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* Google Ecosystem & Cloud Sync Modal */}
      <GoogleEcosystemModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        config={googleConfig}
        onUpdateConfig={setGoogleConfig}
        days={days}
        fullStateForSync={{
          days,
          pantryCheckedMap,
          cartCheckedMap,
          customShoppingItems,
          weightLogs,
          trainingHistory,
        }}
      />
    </div>
  );
}
export default App;
