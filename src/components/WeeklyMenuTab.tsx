import React, { useState } from 'react';
import {
  AlbaShift,
  CustomMealOverride,
  DayId,
  DayPlan,
  GuilleShift,
  MealSlot,
  ProfileView,
  Recipe,
  TrainingType,
} from '../types';
import { RECIPES, RECIPE_MAP } from '../data/recipes';
import { computeDayNutrition } from '../utils/nutritionEngine';
import { DIRECTED_CLASSES_CATALOG } from '../data/workouts';
import {
  ChevronDown,
  Clock,
  Repeat,
  SlidersHorizontal,
  UtensilsCrossed,
  X,
} from 'lucide-react';

interface WeeklyMenuTabProps {
  days: DayPlan[];
  selectedDayId: DayId;
  onSelectDay: (day: DayId) => void;
  profileView: ProfileView;
  activeTemplateKey: 'semana_a' | 'semana_b' | 'semana_c';
  onApplyTemplate: (key: 'semana_a' | 'semana_b' | 'semana_c') => void;
  onUpdateDay: (dayId: DayId, updater: (prev: DayPlan) => DayPlan) => void;
  onBatchUpdateShifts: (
    albaShifts: AlbaShift[] | null,
    guilleShifts: GuilleShift[] | null
  ) => void;
  onAddCustomRecipeToCatalog: (recipe: Recipe) => void;
  customRecipes: Recipe[];
}

const MEAL_META: Record<
  MealSlot,
  { title: string; timeLabel: string; emoji: string; accent: string }
> = {
  desayuno: {
    title: 'Desayuno',
    timeLabel: '08:00',
    emoji: '☕',
    accent: 'bg-amber-500/15 text-amber-500',
  },
  comida: {
    title: 'Comida',
    timeLabel: '14:30',
    emoji: '🍽️',
    accent: 'bg-[#30D158]/15 text-[#30D158]',
  },
  merienda: {
    title: 'Merienda',
    timeLabel: '18:00',
    emoji: '⚡',
    accent: 'bg-[#0A84FF]/15 text-[#0A84FF]',
  },
  cena: {
    title: 'Cena',
    timeLabel: '21:30',
    emoji: '🌙',
    accent: 'bg-indigo-500/15 text-indigo-400',
  },
  snack_nocturno: {
    title: 'Guardia Noche HUCA',
    timeLabel: '02:30',
    emoji: '🏥',
    accent: 'bg-[#FF2D55]/15 text-[#FF2D55]',
  },
};

const GUILLE_SHIFT_LABELS: Record<GuilleShift, string> = {
  manana: '☀️ Mañana',
  tarde: '🌆 Tarde',
  manana_tarde: '⚡ Partido',
  libre: '🎉 Libre',
};

const ALBA_SHIFT_LABELS: Record<AlbaShift, string> = {
  manana: '☀️ Mañana HUCA',
  tarde: '🌆 Tarde HUCA',
  noche: '🌙 Noche HUCA',
  saliente: '🛌 Saliente',
  libre: '🎉 Libre',
};

const TRAINING_LABELS: Record<TrainingType, string> = {
  empuje: '🏋️ Empuje',
  tiron: '💪 Tirón',
  pierna: '🦵 Pierna',
  padel: '🎾 Pádel',
  running: '🏃 Running',
  movilidad: '🧘 Movilidad',
  clase_dirigida: '🧘‍♀️ Clase Enjoy',
  otra_actividad: '⛰️ Ruta / Deporte',
  doble_sesion: '🔥 Doble Sesión',
  descanso_total: '🛋️ Descanso',
};

function getIngredientVisual(name: string): { emoji: string; shortName: string } {
  const lower = name.toLowerCase();
  if (lower.includes('pollo')) return { emoji: '🍗', shortName: 'Pollo' };
  if (lower.includes('pavo')) return { emoji: '🦃', shortName: 'Pavo' };
  if (lower.includes('salmón') || lower.includes('salmon')) return { emoji: '🍣', shortName: 'Salmón' };
  if (lower.includes('atún') || lower.includes('atun')) return { emoji: '🐟', shortName: 'Atún' };
  if (lower.includes('merluza') || lower.includes('bacalao')) return { emoji: '🐟', shortName: 'Pescado' };
  if (lower.includes('ternera')) return { emoji: '🥩', shortName: 'Ternera' };
  if (lower.includes('jamón') || lower.includes('jamon')) return { emoji: '🥓', shortName: 'Jamón' };
  if (lower.includes('huevo')) return { emoji: '🥚', shortName: 'Huevos' };
  if (lower.includes('claras')) return { emoji: '🥚', shortName: 'Claras' };
  if (lower.includes('arroz')) return { emoji: '🍚', shortName: 'Arroz' };
  if (lower.includes('cuscús') || lower.includes('cuscus')) return { emoji: '🌾', shortName: 'Cuscús' };
  if (lower.includes('pasta') || lower.includes('rigatoni') || lower.includes('macarrones'))
    return { emoji: '🍝', shortName: 'Pasta' };
  if (lower.includes('gnocchi') || lower.includes('ñoqui')) return { emoji: '🥟', shortName: 'Gnocchi' };
  if (lower.includes('patata')) return { emoji: '🥔', shortName: 'Patata' };
  if (lower.includes('boniato')) return { emoji: '🍠', shortName: 'Boniato' };
  if (lower.includes('avena')) return { emoji: '🌾', shortName: 'Avena' };
  if (lower.includes('pan ') || lower.includes('tostada')) return { emoji: '🍞', shortName: 'Pan' };
  if (lower.includes('fajita') || lower.includes('tortilla')) return { emoji: '🌮', shortName: 'Fajitas' };
  if (lower.includes('tortita')) return { emoji: '🍘', shortName: 'Tortitas' };
  if (lower.includes('yogur') || lower.includes('skyr') || lower.includes('kéfir'))
    return { emoji: '🥣', shortName: 'Yogur/Skyr' };
  if (lower.includes('leche')) return { emoji: '🥛', shortName: 'Leche s/L' };
  if (lower.includes('whey') || lower.includes('proteína')) return { emoji: '🥤', shortName: 'Whey' };
  if (lower.includes('mozzarella') || lower.includes('queso') || lower.includes('cottage'))
    return { emoji: '🧀', shortName: 'Queso' };
  if (lower.includes('tomate')) return { emoji: '🍅', shortName: 'Tomate coc.' };
  if (lower.includes('calabacín') || lower.includes('calabacin'))
    return { emoji: '🥒', shortName: 'Calabacín' };
  if (lower.includes('brócoli') || lower.includes('brocoli')) return { emoji: '🥦', shortName: 'Brócoli' };
  if (lower.includes('judías') || lower.includes('espárragos') || lower.includes('espinaca') || lower.includes('verdura') || lower.includes('pimiento') || lower.includes('champiñ'))
    return { emoji: '🥦', shortName: 'Verdura' };
  if (lower.includes('aguacate')) return { emoji: '🥑', shortName: 'Aguacate' };
  if (lower.includes('plátano') || lower.includes('platano')) return { emoji: '🍌', shortName: 'Plátano' };
  if (lower.includes('arándanos') || lower.includes('fruta') || lower.includes('manzana'))
    return { emoji: '🫐', shortName: 'Fruta' };
  if (lower.includes('nueces') || lower.includes('almendra') || lower.includes('cacahuete'))
    return { emoji: '🥜', shortName: 'Fruto seco' };
  if (lower.includes('aceite') || lower.includes('aove')) return { emoji: '🫒', shortName: 'AOVE' };
  if (lower.includes('café') || lower.includes('cafe')) return { emoji: '☕', shortName: 'Café' };
  return { emoji: '🍴', shortName: name.split(' ')[0] };
}

function getCurrentTimeSlot(isNightShift: boolean): MealSlot {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 6 && isNightShift) return 'snack_nocturno';
  if (hour >= 6 && hour < 12) return 'desayuno';
  if (hour >= 12 && hour < 16) return 'comida';
  if (hour >= 16 && hour < 20) return 'merienda';
  return 'cena';
}

function MiniRing({
  current,
  target,
  color,
}: {
  current: number;
  target: number;
  color: string;
}) {
  const size = 46;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(1.05, Math.max(0.08, current / (target || 2000)));
  const offset = circumference - pct * circumference;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-black/10 dark:text-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-black tracking-tighter text-slate-900 dark:text-white">
        {current}
      </span>
    </div>
  );
}

export const WeeklyMenuTab: React.FC<WeeklyMenuTabProps> = ({
  days,
  selectedDayId,
  profileView,
  activeTemplateKey,
  onApplyTemplate,
  onUpdateDay,
  customRecipes,
}) => {
  // Single global scale toggle right at the top: 'crudo' vs 'cocinado'
  const [weightMode, setWeightMode] = useState<'crudo' | 'cocinado'>('crudo');

  // Collapsible shift/workout editor (closed by default so meals are immediately visible!)
  const [editingPerson, setEditingPerson] = useState<'guille' | 'alba' | null>(null);

  // Bottom sheet only when swapping dish or viewing cooking steps
  const [activeSheetSlot, setActiveSheetSlot] = useState<MealSlot | null>(null);
  const [sheetTab, setSheetTab] = useState<'cambiar' | 'pasos' | 'editar'>('cambiar');

  // Manual Editor state
  const [editTitle, setEditTitle] = useState('');
  const [editGuilleKcal, setEditGuilleKcal] = useState(600);
  const [editGuilleP, setEditGuilleP] = useState(50);
  const [editGuilleHC, setEditGuilleHC] = useState(65);
  const [editAlbaKcal, setEditAlbaKcal] = useState(450);
  const [editAlbaP, setEditAlbaP] = useState(34);
  const [editAlbaHC, setEditAlbaHC] = useState(50);

  const allRecipes = [...RECIPES, ...customRecipes];
  const recipeLookup: Record<string, Recipe> = {
    ...RECIPE_MAP,
    ...Object.fromEntries(customRecipes.map((r) => [r.id, r])),
  };

  const currentDay = days.find((d) => d.day === selectedDayId) || days[0];
  const nutrition = computeDayNutrition(currentDay);
  const nowSlot = getCurrentTimeSlot(currentDay.albaShift === 'noche');

  const slots: MealSlot[] = ['desayuno', 'comida', 'merienda', 'cena'];
  if (currentDay.albaShift === 'noche') {
    slots.push('snack_nocturno');
  }

  const openMealSheet = (slot: MealSlot, defaultTab: 'cambiar' | 'pasos' | 'editar' = 'cambiar') => {
    const custom = currentDay.customMealOverrides[slot];
    const r = recipeLookup[currentDay.meals[slot]];
    setActiveSheetSlot(slot);
    setSheetTab(defaultTab);
    if (custom) {
      setEditTitle(custom.title);
      setEditGuilleKcal(custom.guilleMacros.kcal);
      setEditGuilleP(custom.guilleMacros.protein);
      setEditGuilleHC(custom.guilleMacros.carbs);
      setEditAlbaKcal(custom.albaMacros.kcal);
      setEditAlbaP(custom.albaMacros.protein);
      setEditAlbaHC(custom.albaMacros.carbs);
    } else if (r) {
      setEditTitle(r.title);
      setEditGuilleKcal(r.guilleBaseMacros.kcal);
      setEditGuilleP(r.guilleBaseMacros.protein);
      setEditGuilleHC(r.guilleBaseMacros.carbs);
      setEditAlbaKcal(r.albaBaseMacros.kcal);
      setEditAlbaP(r.albaBaseMacros.protein);
      setEditAlbaHC(r.albaBaseMacros.carbs);
    }
  };

  const toggleSaladoDulce = (slot: 'desayuno' | 'merienda', e: React.MouseEvent) => {
    e.stopPropagation();
    const curr = recipeLookup[currentDay.meals[slot]];
    const nextId =
      slot === 'desayuno'
        ? curr?.style === 'salado'
          ? 'des_dulce_yogur_avena'
          : 'des_salado_jamon_huevo'
        : curr?.style === 'salado'
        ? 'mer_dulce_whey_yogur'
        : 'mer_salado_pavo_queso';

    onUpdateDay(currentDay.day, (prev) => {
      const nextOverrides = { ...prev.customMealOverrides };
      delete nextOverrides[slot];
      return {
        ...prev,
        meals: { ...prev.meals, [slot]: nextId },
        customMealOverrides: nextOverrides,
      };
    });
  };

  const handleSaveManualEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSheetSlot || !editTitle.trim()) return;
    const override: CustomMealOverride = {
      title: editTitle.trim(),
      guilleMacros: {
        kcal: Number(editGuilleKcal) || 0,
        protein: Number(editGuilleP) || 0,
        carbs: Number(editGuilleHC) || 0,
        fat: 14,
      },
      albaMacros: {
        kcal: Number(editAlbaKcal) || 0,
        protein: Number(editAlbaP) || 0,
        carbs: Number(editAlbaHC) || 0,
        fat: 11,
      },
    };
    onUpdateDay(currentDay.day, (prev) => ({
      ...prev,
      customMealOverrides: {
        ...prev.customMealOverrides,
        [activeSheetSlot]: override,
      },
    }));
    setActiveSheetSlot(null);
  };

  return (
    <div className="space-y-4">
      {/* ========================================================= */}
      {/* 1. COMPACT STATUS BAR (Zero clutter, 1-tap expandable)     */}
      {/* ========================================================= */}
      <div className="apple-card rounded-3xl p-3.5 sm:p-4 space-y-3">
        <div
          className={`grid grid-cols-1 ${
            profileView === 'pareja' ? 'md:grid-cols-2' : ''
          } gap-2.5`}
        >
          {/* GUILLE COMPACT SUMMARY ROW */}
          {(profileView === 'pareja' || profileView === 'guille') && (
            <div className="flex items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04]">
              <div className="flex items-center gap-2.5 min-w-0">
                <MiniRing
                  current={nutrition.guillePlanned.kcal}
                  target={nutrition.guilleTarget.kcal}
                  color="#30D158"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Guille
                    </span>
                    <span className="text-[11px] font-bold text-[#30D158]">
                      {nutrition.guillePlanned.protein}P · {nutrition.guillePlanned.carbs}HC · {nutrition.guillePlanned.fat}G
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {GUILLE_SHIFT_LABELS[currentDay.guilleShift]} · {TRAINING_LABELS[currentDay.guilleTraining]}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditingPerson(editingPerson === 'guille' ? null : 'guille')
                }
                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer transition-all ${
                  editingPerson === 'guille'
                    ? 'bg-[#30D158] text-black'
                    : 'apple-pill-surface text-slate-700 dark:text-slate-200'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Cambiar</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${
                    editingPerson === 'guille' ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
          )}

          {/* ALBA COMPACT SUMMARY ROW */}
          {(profileView === 'pareja' || profileView === 'alba') && (
            <div className="flex items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04]">
              <div className="flex items-center gap-2.5 min-w-0">
                <MiniRing
                  current={nutrition.albaPlanned.kcal}
                  target={nutrition.albaTarget.kcal}
                  color="#FF2D55"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Alba
                    </span>
                    <span className="text-[11px] font-bold text-[#FF2D55]">
                      {nutrition.albaPlanned.protein}P · {nutrition.albaPlanned.carbs}HC · {nutrition.albaPlanned.fat}G
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {ALBA_SHIFT_LABELS[currentDay.albaShift]} ·{' '}
                    {currentDay.albaTraining === 'clase_dirigida'
                      ? `🧘‍♀️ ${currentDay.albaDirectedClass || 'Pilates'}`
                      : TRAINING_LABELS[currentDay.albaTraining]}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditingPerson(editingPerson === 'alba' ? null : 'alba')
                }
                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer transition-all ${
                  editingPerson === 'alba'
                    ? 'bg-[#FF2D55] text-white'
                    : 'apple-pill-surface text-slate-700 dark:text-slate-200'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Cambiar</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${
                    editingPerson === 'alba' ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* INLINE DRAWER: Only visible when user taps "Cambiar" on Guille or Alba */}
        {editingPerson === 'guille' && (
          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] space-y-3 animate-sheet">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#30D158]">
                Configurar Turno y Entreno de Guille ({currentDay.label})
              </span>
              <button
                type="button"
                onClick={() => setEditingPerson(null)}
                className="text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Listo ✓
              </button>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-400">Turno</span>
              <div className="flex flex-wrap gap-1.5">
                {(['manana', 'tarde', 'manana_tarde', 'libre'] as GuilleShift[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      onUpdateDay(currentDay.day, (prev) => ({ ...prev, guilleShift: s }))
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer ${
                      currentDay.guilleShift === s
                        ? 'bg-[#30D158] text-black'
                        : 'bg-white dark:bg-[#1C1C1E] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {GUILLE_SHIFT_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-400">Entreno de Hoy</span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    'empuje',
                    'tiron',
                    'pierna',
                    'padel',
                    'running',
                    'otra_actividad',
                    'movilidad',
                    'descanso_total',
                  ] as TrainingType[]
                ).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      onUpdateDay(currentDay.day, (prev) => ({ ...prev, guilleTraining: t }))
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer ${
                      currentDay.guilleTraining === t
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                        : 'bg-white dark:bg-[#1C1C1E] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {TRAINING_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {editingPerson === 'alba' && (
          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] space-y-3 animate-sheet">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#FF2D55]">
                Configurar Turno HUCA y Entreno de Alba ({currentDay.label})
              </span>
              <button
                type="button"
                onClick={() => setEditingPerson(null)}
                className="text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Listo ✓
              </button>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-400">Turno HUCA</span>
              <div className="flex flex-wrap gap-1.5">
                {(['manana', 'tarde', 'noche', 'saliente', 'libre'] as AlbaShift[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      onUpdateDay(currentDay.day, (prev) => ({ ...prev, albaShift: s }))
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer ${
                      currentDay.albaShift === s
                        ? 'bg-[#FF2D55] text-white'
                        : 'bg-white dark:bg-[#1C1C1E] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {ALBA_SHIFT_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-400">Entreno de Hoy</span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    'clase_dirigida',
                    'pierna',
                    'empuje',
                    'tiron',
                    'padel',
                    'running',
                    'otra_actividad',
                    'descanso_total',
                  ] as TrainingType[]
                ).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      onUpdateDay(currentDay.day, (prev) => ({ ...prev, albaTraining: t }))
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer ${
                      currentDay.albaTraining === t
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                        : 'bg-white dark:bg-[#1C1C1E] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {TRAINING_LABELS[t]}
                  </button>
                ))}
              </div>

              {currentDay.albaTraining === 'clase_dirigida' && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {DIRECTED_CLASSES_CATALOG.map((cls) => (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() =>
                        onUpdateDay(currentDay.day, (prev) => ({
                          ...prev,
                          albaDirectedClass: cls.name,
                        }))
                      }
                      className={`px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer ${
                        currentDay.albaDirectedClass === cls.name
                          ? 'bg-[#FF2D55]/20 text-[#FF2D55] border border-[#FF2D55]/40'
                          : 'bg-black/5 dark:bg-white/5 text-slate-400'
                      }`}
                    >
                      {cls.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 2. GLOBAL SCALE BAR: CRUDO vs COCINADO + SEMANA A/B/C     */}
      {/* ========================================================= */}
      <div className="flex items-center justify-between gap-2 px-1">
        {/* Global Scale Mode Switch */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 hidden sm:inline">
            Pesos en báscula:
          </span>
          <div className="apple-pill-surface p-1 rounded-full inline-flex text-xs">
            <button
              type="button"
              onClick={() => setWeightMode('crudo')}
              className={`px-3.5 py-1.5 rounded-full font-extrabold transition-all cursor-pointer ${
                weightMode === 'crudo'
                  ? 'bg-[#30D158] text-black shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              🥩 En Crudo
            </button>
            <button
              type="button"
              onClick={() => setWeightMode('cocinado')}
              className={`px-3.5 py-1.5 rounded-full font-extrabold transition-all cursor-pointer ${
                weightMode === 'cocinado'
                  ? 'bg-[#0A84FF] text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              🥡 Cocinado (Tupper)
            </button>
          </div>
        </div>

        {/* Week Template Switcher */}
        <div className="apple-pill-surface p-1 rounded-full inline-flex text-xs">
          {(['semana_a', 'semana_b', 'semana_c'] as const).map((key, idx) => (
            <button
              key={key}
              type="button"
              onClick={() => onApplyTemplate(key)}
              className={`px-2.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                activeTemplateKey === key
                  ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Sem {['A', 'B', 'C'][idx]}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. VISUAL MEAL CARDS WITH BIG INGREDIENT SCALE CHIPS      */}
      {/* ========================================================= */}
      <div className="space-y-3.5">
        {slots.map((slot) => {
          const meta = MEAL_META[slot];
          const isNow = slot === nowSlot;
          const isFree = Boolean(currentDay.freeMeals[slot]);
          const custom = currentDay.customMealOverrides[slot];
          const recipe = recipeLookup[currentDay.meals[slot]];
          const logistics = nutrition.mealLogistics[slot];

          //Carb multiplier for Guille on high/low days for Comida/Cena
          const carbMult =
            slot === 'comida' || slot === 'cena'
              ? nutrition.guilleLevel === 'alto'
                ? 1.15
                : nutrition.guilleLevel === 'bajo'
                ? 0.8
                : 1
              : 1;

          return (
            <div
              key={slot}
              className={`apple-card rounded-3xl p-4 sm:p-5 space-y-3.5 transition-all ${
                isNow
                  ? 'ring-2 ring-[#30D158] dark:ring-[#30D158]/80 shadow-lg'
                  : ''
              }`}
            >
              {/* Top Row: Meal Slot + Time + "AHORA" Badge + 1-Tap Action Buttons */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 ${meta.accent}`}
                  >
                    {isFree ? '🎉' : meta.emoji}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                        {meta.title} · {meta.timeLabel}
                      </span>
                      {isNow && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#30D158] text-black">
                          ⚡ AHORA
                        </span>
                      )}
                      {logistics.albaLocation === '🥡 Tupper HUCA' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF2D55]/15 text-[#FF2D55]">
                          🥡 Alba en HUCA
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-snug mt-0.5">
                      {isFree
                        ? 'Comida Libre / Fuera de casa'
                        : custom
                        ? custom.title
                        : recipe?.title}
                    </h3>
                  </div>
                </div>

                {/* Right Quick Action Pills */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {(slot === 'desayuno' || slot === 'merienda') && !isFree && (
                    <button
                      type="button"
                      onClick={(e) => toggleSaladoDulce(slot, e)}
                      className="px-2.5 py-1.5 rounded-full text-xs font-bold apple-pill-surface text-slate-700 dark:text-slate-200 hover:opacity-80 cursor-pointer flex items-center gap-1"
                      title="Cambiar entre Dulce y Salado"
                    >
                      <Repeat className="w-3.5 h-3.5 text-[#30D158]" />
                      <span>{recipe?.style === 'salado' ? 'Salado' : 'Dulce'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openMealSheet(slot, 'cambiar')}
                    className="px-3 py-1.5 rounded-full text-xs font-bold apple-pill-surface text-slate-700 dark:text-slate-200 hover:opacity-80 cursor-pointer flex items-center gap-1"
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5 text-[#0A84FF]" />
                    <span>Cambiar</span>
                  </button>
                </div>
              </div>

              {/* ===================================================== */}
              {/* DIRECT VISUAL SCALE CHIPS (NO POPUP NEEDED!)          */}
              {/* ===================================================== */}
              {!isFree && recipe && !custom && (
                <div className="space-y-2 pt-1">
                  {/* GUILLE VISUAL SCALE CHIPS */}
                  {(profileView === 'pareja' || profileView === 'guille') &&
                    slot !== 'snack_nocturno' && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {profileView === 'pareja' && (
                          <span className="text-[11px] font-black uppercase tracking-wider text-[#30D158] w-14 shrink-0">
                            🟢 Guille
                          </span>
                        )}
                        <div className="flex flex-wrap gap-1.5 flex-1">
                          {recipe.ingredients.map((ing) => {
                            const isCarbSource =
                              ing.aisle === 'despensa' &&
                              (ing.name.toLowerCase().includes('arroz') ||
                                ing.name.toLowerCase().includes('pasta') ||
                                ing.name.toLowerCase().includes('cuscús') ||
                                ing.name.toLowerCase().includes('patata') ||
                                ing.name.toLowerCase().includes('gnocchi'));

                            const baseRaw = isCarbSource
                              ? Math.round(ing.guilleAmountRaw * carbMult)
                              : ing.guilleAmountRaw;

                            const val =
                              weightMode === 'crudo'
                                ? baseRaw
                                : Math.round(baseRaw * ing.cookedRatio);

                            const vis = getIngredientVisual(ing.name);

                            return (
                              <div
                                key={`g_${ing.id}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#30D158]/10 border border-[#30D158]/25"
                              >
                                <span className="text-sm">{vis.emoji}</span>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                  {vis.shortName}
                                </span>
                                <span className="text-sm font-black text-[#30D158]">
                                  {val}
                                  {ing.unit}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {/* ALBA VISUAL SCALE CHIPS */}
                  {(profileView === 'pareja' || profileView === 'alba') && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {profileView === 'pareja' && (
                        <span className="text-[11px] font-black uppercase tracking-wider text-[#FF2D55] w-14 shrink-0">
                          🔴 Alba
                        </span>
                      )}
                      <div className="flex flex-wrap gap-1.5 flex-1">
                        {recipe.ingredients.map((ing) => {
                          const val =
                            weightMode === 'crudo'
                              ? ing.albaAmountRaw
                              : Math.round(ing.albaAmountRaw * ing.cookedRatio);

                          const vis = getIngredientVisual(ing.name);

                          return (
                            <div
                              key={`a_${ing.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#FF2D55]/10 border border-[#FF2D55]/25"
                            >
                              <span className="text-sm">{vis.emoji}</span>
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                {vis.shortName}
                              </span>
                              <span className="text-sm font-black text-[#FF2D55]">
                                {val}
                                {ing.unit}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Subtle bottom line: Prep type + Tap to view cooking notes */}
              {!isFree && recipe && (
                <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {recipe.prepType === 'airfryer_express'
                      ? '⚡ Airfryer Express (10 min)'
                      : recipe.prepType === 'batch_domingo'
                      ? '🥡 Tupper Batch Cooking'
                      : 'Montaje rápido (5 min)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => openMealSheet(slot, 'pasos')}
                    className="font-bold text-[#0A84FF] hover:underline cursor-pointer"
                  >
                    Ver preparación →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* BOTTOM SHEET: SWAP DISH / RECIPE STEPS / MANUAL EDIT      */}
      {/* ========================================================= */}
      {activeSheetSlot && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setActiveSheetSlot(null)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] rounded-t-3xl sm:rounded-3xl p-6 space-y-5 animate-sheet max-h-[88dvh] overflow-y-auto border-t sm:border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto sm:hidden" />

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {MEAL_META[activeSheetSlot].title} · {currentDay.label}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {currentDay.customMealOverrides[activeSheetSlot]?.title ||
                    recipeLookup[currentDay.meals[activeSheetSlot]]?.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveSheetSlot(null)}
                className="w-8 h-8 rounded-full apple-pill-surface flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Sheet Sub-Navigation */}
            <div className="apple-pill-surface p-1 rounded-full grid grid-cols-3 text-xs">
              <button
                type="button"
                onClick={() => setSheetTab('cambiar')}
                className={`py-1.5 rounded-full font-bold cursor-pointer ${
                  sheetTab === 'cambiar'
                    ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                🔄 Cambiar Plato
              </button>
              <button
                type="button"
                onClick={() => setSheetTab('pasos')}
                className={`py-1.5 rounded-full font-bold cursor-pointer ${
                  sheetTab === 'pasos'
                    ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                👨‍🍳 Preparación
              </button>
              <button
                type="button"
                onClick={() => setSheetTab('editar')}
                className={`py-1.5 rounded-full font-bold cursor-pointer ${
                  sheetTab === 'editar'
                    ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                ✏️ Libre / Manual
              </button>
            </div>

            {/* TAB 1: CAMBIAR PLATO EN 1 TOQUE */}
            {sheetTab === 'cambiar' && (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {allRecipes
                  .filter((r) => {
                    if (activeSheetSlot === 'desayuno' || activeSheetSlot === 'merienda') {
                      return r.slot === 'desayuno_merienda';
                    }
                    if (activeSheetSlot === 'snack_nocturno') {
                      return r.slot === 'snack_noche' || r.slot === 'desayuno_merienda';
                    }
                    return r.slot === 'principal';
                  })
                  .map((r) => {
                    const isSelected = currentDay.meals[activeSheetSlot] === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          onUpdateDay(currentDay.day, (prev) => {
                            const nextOverrides = { ...prev.customMealOverrides };
                            delete nextOverrides[activeSheetSlot];
                            return {
                              ...prev,
                              meals: { ...prev.meals, [activeSheetSlot]: r.id },
                              freeMeals: { ...prev.freeMeals, [activeSheetSlot]: false },
                              customMealOverrides: nextOverrides,
                            };
                          });
                          setActiveSheetSlot(null);
                        }}
                        className={`w-full p-4 rounded-2xl text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#30D158]/20 border border-[#30D158]/40'
                            : 'bg-slate-100 dark:bg-[#2C2C2E] hover:opacity-90'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {r.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            🟢 {r.portionNoteGuille} · 🔴 {r.portionNoteAlba}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-xs font-black text-[#30D158] shrink-0">
                            ✓ Activo
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            )}

            {/* TAB 2: PASOS DE PREPARACIÓN */}
            {sheetTab === 'pasos' && (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {recipeLookup[currentDay.meals[activeSheetSlot]]?.cookingNotes}
                </div>
              </div>
            )}

            {/* TAB 3: MARCAR COMIDA LIBRE O EDITAR MANUAL */}
            {sheetTab === 'editar' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateDay(currentDay.day, (prev) => ({
                      ...prev,
                      freeMeals: {
                        ...prev.freeMeals,
                        [activeSheetSlot]: !prev.freeMeals[activeSheetSlot],
                      },
                    }));
                    setActiveSheetSlot(null);
                  }}
                  className="w-full py-3.5 rounded-2xl text-xs font-extrabold apple-pill-surface text-slate-800 dark:text-white cursor-pointer"
                >
                  {currentDay.freeMeals[activeSheetSlot]
                    ? '↩️ Volver al plato del menú'
                    : '🎉 Marcar como Comida Libre / Comer fuera'}
                </button>

                <form onSubmit={handleSaveManualEdit} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400">
                      O escribe otro plato personalizado:
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full mt-1 px-3.5 py-2.5 rounded-2xl text-sm font-bold apple-pill-surface"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-[#30D158] font-bold">
                        Kcal Guille
                      </span>
                      <input
                        type="number"
                        value={editGuilleKcal}
                        onChange={(e) => setEditGuilleKcal(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold apple-pill-surface"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#30D158] font-bold">
                        Prot Guille (g)
                      </span>
                      <input
                        type="number"
                        value={editGuilleP}
                        onChange={(e) => setEditGuilleP(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold apple-pill-surface"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#30D158] font-bold">
                        Hidr Guille (g)
                      </span>
                      <input
                        type="number"
                        value={editGuilleHC}
                        onChange={(e) => setEditGuilleHC(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold apple-pill-surface"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl text-xs font-extrabold bg-[#30D158] text-black cursor-pointer"
                  >
                    Guardar Cambio Manual
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
