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
  ShoppingCart,
} from 'lucide-react';

type MainTab = 'menu' | 'entreno' | 'batch' | 'compra';

const STORAGE_KEY = 'agfit_oviedo_v3';

function getTodayDayId(): DayId {
  const jsDay = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
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
  const todayDayId = getTodayDayId();
  const [activeTab, setActiveTab] = useState<MainTab>('menu');
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [profileView, setProfileView] = useState<ProfileView>('pareja');
  const [selectedDayId, setSelectedDayId] = useState<DayId>(todayDayId);
  const [activeTemplateKey, setActiveTemplateKey] = useState<'semana_a' | 'semana_b' | 'semana_c'>('semana_a');

  const [days, setDays] = useState<DayPlan[]>(() => WEEK_TEMPLATES.semana_a.days);
  const [customRecipes, setCustomRecipes] = useState<Recipe[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightEntry[]>(INITIAL_WEIGHT_LOGS);

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
  const [showGoogleModal, setShowGoogleModal] = useState(false);

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
      // ignore
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

  const TABS: Array<{ id: MainTab; label: string; icon: React.ReactNode }> = [
    { id: 'menu', label: 'Menú', icon: <Calendar className="w-5 h-5" /> },
    { id: 'entreno', label: 'Entreno', icon: <Dumbbell className="w-5 h-5" /> },
    { id: 'batch', label: 'Cocina', icon: <ChefHat className="w-5 h-5" /> },
    { id: 'compra', label: 'Compra', icon: <ShoppingCart className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-dvh bg-[#F2F2F7] dark:bg-black text-slate-900 dark:text-white pb-28 transition-colors">
      <TodayHeader
        days={days}
        selectedDayId={selectedDayId}
        todayDayId={todayDayId}
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

      <main className="max-w-3xl mx-auto px-4 pt-4">
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
            profileView={profileView}
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

      {/* Apple-Style Floating Frosted Bottom Dock */}
      <nav
        aria-label="Navegación principal"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white/90 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl border border-black/10 dark:border-white/15 rounded-full px-3 py-1.5 shadow-2xl flex items-center gap-1 sm:gap-2 no-print"
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full flex items-center gap-2 text-xs font-extrabold transition-all cursor-pointer ${
                active
                  ? 'bg-[#30D158] text-black shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

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
