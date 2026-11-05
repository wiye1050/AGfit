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
  Calendar,
  ChevronRight,
  Edit3,
  Repeat,
  Sparkles,
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
  { title: string; emoji: string; accent: string }
> = {
  desayuno: { title: 'Desayuno', emoji: '☕', accent: 'bg-amber-500/15 text-amber-500' },
  comida: { title: 'Comida', emoji: '🍽️', accent: 'bg-[#30D158]/15 text-[#30D158]' },
  merienda: { title: 'Merienda · Perientreno', emoji: '⚡', accent: 'bg-[#0A84FF]/15 text-[#0A84FF]' },
  cena: { title: 'Cena', emoji: '🌙', accent: 'bg-indigo-500/15 text-indigo-400' },
  snack_nocturno: { title: 'Snack Noche HUCA (02:30h)', emoji: '🏥', accent: 'bg-[#FF2D55]/15 text-[#FF2D55]' },
};

const GUILLE_SHIFTS: Array<{ id: GuilleShift; label: string }> = [
  { id: 'manana', label: '☀️ Mañana' },
  { id: 'tarde', label: '🌆 Tarde' },
  { id: 'manana_tarde', label: '⚡ Partido' },
  { id: 'libre', label: '🎉 Libre' },
];

const ALBA_SHIFTS: Array<{ id: AlbaShift; label: string }> = [
  { id: 'manana', label: '☀️ M' },
  { id: 'tarde', label: '🌆 T' },
  { id: 'noche', label: '🌙 N' },
  { id: 'saliente', label: '🛌 Saliente' },
  { id: 'libre', label: '🎉 Libre' },
];

const TRAINING_PILLS_GUILLE: Array<{ id: TrainingType; label: string }> = [
  { id: 'empuje', label: '🏋️ Empuje' },
  { id: 'tiron', label: '💪 Tirón' },
  { id: 'pierna', label: '🦵 Pierna' },
  { id: 'padel', label: '🎾 Pádel' },
  { id: 'running', label: '🏃 Run' },
  { id: 'otra_actividad', label: '⛰️ Ruta/Otro' },
  { id: 'movilidad', label: '🧘 Movilidad' },
  { id: 'descanso_total', label: '🛋️ Descanso' },
];

const TRAINING_PILLS_ALBA: Array<{ id: TrainingType; label: string }> = [
  { id: 'clase_dirigida', label: '🧘‍♀️ Clase' },
  { id: 'pierna', label: '🦵 Pierna' },
  { id: 'empuje', label: '🏋️ Empuje' },
  { id: 'tiron', label: '💪 Tirón' },
  { id: 'padel', label: '🎾 Pádel' },
  { id: 'running', label: '🏃 Run' },
  { id: 'otra_actividad', label: '⛰️ Ruta/Otro' },
  { id: 'descanso_total', label: '🛋️ Descanso' },
];

function ActivityRing({
  current,
  target,
  color,
  size = 68,
}: {
  current: number;
  target: number;
  color: string;
  size?: number;
}) {
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(1.08, Math.max(0.05, current / (target || 2000)));
  const offset = circumference - pct * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-black/5 dark:text-white/10"
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
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs font-black tracking-tight text-slate-900 dark:text-white leading-none">
          {current}
        </span>
        <span className="text-[9px] font-semibold text-slate-400">kcal</span>
      </div>
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
  const [activeSheetSlot, setActiveSheetSlot] = useState<MealSlot | null>(null);
  const [sheetTab, setSheetTab] = useState<'gramos' | 'cambiar' | 'editar'>('gramos');
  const [weightMode, setWeightMode] = useState<'crudo' | 'cocinado'>('crudo');

  // Manual Editor state inside Bottom Sheet
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

  const slots: MealSlot[] = ['desayuno', 'comida', 'merienda', 'cena'];
  if (currentDay.albaShift === 'noche') {
    slots.push('snack_nocturno');
  }

  const openMealSheet = (slot: MealSlot) => {
    const custom = currentDay.customMealOverrides[slot];
    const r = recipeLookup[currentDay.meals[slot]];
    setActiveSheetSlot(slot);
    setSheetTab('gramos');
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
    <div className="space-y-5">
      {/* Top Minimalist Header: Day Title + Week Template Pill */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {currentDay.label}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Toca cualquier comida para ver gramos en crudo/tupper o cambiar plato
          </p>
        </div>

        <div className="apple-pill-surface p-1 rounded-full inline-flex text-xs">
          {(['semana_a', 'semana_b', 'semana_c'] as const).map((key, idx) => (
            <button
              key={key}
              type="button"
              onClick={() => onApplyTemplate(key)}
              className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
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

      {/* APPLE FITNESS RINGS + TACTILE SHIFT/WORKOUT PILLS */}
      <div
        className={`grid grid-cols-1 ${
          profileView === 'pareja' ? 'md:grid-cols-2' : ''
        } gap-4`}
      >
        {/* GUILLE APPLE RING CARD */}
        {(profileView === 'pareja' || profileView === 'guille') && (
          <div className="apple-card rounded-3xl p-5 space-y-4">
            <div className="flex items-center gap-4">
              <ActivityRing
                current={nutrition.guillePlanned.kcal}
                target={nutrition.guilleTarget.kcal}
                color="#30D158"
              />
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    Guille
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#30D158]/15 text-[#30D158]">
                    HC {nutrition.guilleLevel.toUpperCase()} · Meta {nutrition.guilleTarget.kcal} kcal
                  </span>
                </div>

                {/* Minimal 3 Macro Bars */}
                <div className="grid grid-cols-3 gap-2 pt-0.5">
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Prot</span>
                      <span className="font-bold text-[#30D158]">{nutrition.guillePlanned.protein}g</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 mt-1 overflow-hidden">
                      <div
                        className="h-full bg-[#30D158] rounded-full"
                        style={{ width: `${Math.min(100, (nutrition.guillePlanned.protein / 180) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Hidr</span>
                      <span className="font-bold">{nutrition.guillePlanned.carbs}g</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 mt-1 overflow-hidden">
                      <div
                        className="h-full bg-[#0A84FF] rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (nutrition.guillePlanned.carbs / nutrition.guilleTarget.carbs) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Grasa</span>
                      <span className="font-bold">{nutrition.guillePlanned.fat}g</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 mt-1 overflow-hidden">
                      <div
                        className="h-full bg-[#FF9F0A] rounded-full"
                        style={{ width: `${Math.min(100, (nutrition.guillePlanned.fat / 65) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tactile Shift Pills */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Turno (Come en casa)
              </span>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {GUILLE_SHIFTS.map((s) => {
                  const active = currentDay.guilleShift === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        onUpdateDay(currentDay.day, (prev) => ({ ...prev, guilleShift: s.id }))
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        active
                          ? 'bg-[#30D158] text-black shadow-sm'
                          : 'apple-pill-surface text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tactile Training Pills */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Entreno de Hoy
              </span>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {TRAINING_PILLS_GUILLE.map((t) => {
                  const active = currentDay.guilleTraining === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        onUpdateDay(currentDay.day, (prev) => ({
                          ...prev,
                          guilleTraining: t.id,
                        }))
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        active
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                          : 'apple-pill-surface text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ALBA APPLE RING CARD */}
        {(profileView === 'pareja' || profileView === 'alba') && (
          <div className="apple-card rounded-3xl p-5 space-y-4">
            <div className="flex items-center gap-4">
              <ActivityRing
                current={nutrition.albaPlanned.kcal}
                target={nutrition.albaTarget.kcal}
                color="#FF2D55"
              />
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    Alba · HUCA
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FF2D55]/15 text-[#FF2D55]">
                    Meta {nutrition.albaTarget.kcal} kcal
                  </span>
                </div>

                {/* Minimal 3 Macro Bars */}
                <div className="grid grid-cols-3 gap-2 pt-0.5">
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Prot</span>
                      <span className="font-bold text-[#FF2D55]">{nutrition.albaPlanned.protein}g</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 mt-1 overflow-hidden">
                      <div
                        className="h-full bg-[#FF2D55] rounded-full"
                        style={{ width: `${Math.min(100, (nutrition.albaPlanned.protein / 110) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Hidr</span>
                      <span className="font-bold">{nutrition.albaPlanned.carbs}g</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 mt-1 overflow-hidden">
                      <div
                        className="h-full bg-[#0A84FF] rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (nutrition.albaPlanned.carbs / nutrition.albaTarget.carbs) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Grasa</span>
                      <span className="font-bold">{nutrition.albaPlanned.fat}g</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 mt-1 overflow-hidden">
                      <div
                        className="h-full bg-[#FF9F0A] rounded-full"
                        style={{ width: `${Math.min(100, (nutrition.albaPlanned.fat / 60) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tactile HUCA Shift Pills */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Turno HUCA
              </span>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {ALBA_SHIFTS.map((s) => {
                  const active = currentDay.albaShift === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        onUpdateDay(currentDay.day, (prev) => ({ ...prev, albaShift: s.id }))
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        active
                          ? 'bg-[#FF2D55] text-white shadow-sm'
                          : 'apple-pill-surface text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tactile Training Pills */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Entreno de Hoy
                </span>
                {currentDay.albaTraining === 'clase_dirigida' && (
                  <span className="text-[11px] font-bold text-[#FF2D55]">
                    Clase: {currentDay.albaDirectedClass}
                  </span>
                )}
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {TRAINING_PILLS_ALBA.map((t) => {
                  const active = currentDay.albaTraining === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        onUpdateDay(currentDay.day, (prev) => ({
                          ...prev,
                          albaTraining: t.id,
                        }))
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        active
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                          : 'apple-pill-surface text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Sub-selector when Clase Dirigida is active */}
              {currentDay.albaTraining === 'clase_dirigida' && (
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
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
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
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

      {/* CLEAN APPLE MEAL CARDS */}
      <div className="space-y-3">
        {slots.map((slot) => {
          const meta = MEAL_META[slot];
          const isFree = Boolean(currentDay.freeMeals[slot]);
          const custom = currentDay.customMealOverrides[slot];
          const recipe = recipeLookup[currentDay.meals[slot]];
          const logistics = nutrition.mealLogistics[slot];

          return (
            <div
              key={slot}
              onClick={() => openMealSheet(slot)}
              className="apple-card rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-4 hover:scale-[1.005] active:scale-[0.995] transition-all cursor-pointer"
            >
              <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                {/* Apple Rounded Squircle Icon */}
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${meta.accent}`}
                >
                  {isFree ? '🎉' : meta.emoji}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  {/* Tiny Header Line */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {meta.title}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      · {logistics.albaLocation === '🥡 Tupper HUCA' ? '🥡 Alba en HUCA' : '🏠 En Casa'}
                    </span>
                    {recipe?.prepType === 'airfryer_express' && !isFree && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0A84FF]/15 text-[#0A84FF]">
                        ⚡ Airfryer 10m
                      </span>
                    )}
                  </div>

                  {/* Clean Dish Title */}
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                    {isFree
                      ? 'Comida Libre / Fuera de casa'
                      : custom
                      ? custom.title
                      : recipe?.title}
                  </h3>

                  {/* Minimalist Dual Gram Pills */}
                  {!isFree && recipe && !custom && (
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {(profileView === 'pareja' || profileView === 'guille') &&
                        slot !== 'snack_nocturno' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#30D158]/10 text-[#30D158]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#30D158]" />
                            {recipe.portionNoteGuille}
                          </span>
                        )}
                      {(profileView === 'pareja' || profileView === 'alba') && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FF2D55]/10 text-[#FF2D55]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF2D55]" />
                          {recipe.portionNoteAlba}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Quick Toggle + Chevron */}
              <div className="flex items-center gap-2 shrink-0">
                {(slot === 'desayuno' || slot === 'merienda') && !isFree && (
                  <button
                    type="button"
                    onClick={(e) => toggleSaladoDulce(slot, e)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold apple-pill-surface text-slate-700 dark:text-slate-200 hover:opacity-80 cursor-pointer flex items-center gap-1"
                    title="Alternar entre versión Salada y Dulce"
                  >
                    <Repeat className="w-3 h-3" />
                    <span className="hidden sm:inline">
                      {recipe?.style === 'salado' ? 'Salado' : 'Dulce'}
                    </span>
                  </button>
                )}
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* iOS BOTTOM SHEET FOR SELECTED MEAL (GRAMS / SWAP / EDIT) */}
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

            {/* Sheet Header */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {MEAL_META[activeSheetSlot].title} · {currentDay.label}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
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
                onClick={() => setSheetTab('gramos')}
                className={`py-1.5 rounded-full font-semibold cursor-pointer ${
                  sheetTab === 'gramos'
                    ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Gramos & Receta
              </button>
              <button
                type="button"
                onClick={() => setSheetTab('cambiar')}
                className={`py-1.5 rounded-full font-semibold cursor-pointer ${
                  sheetTab === 'cambiar'
                    ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Cambiar Plato
              </button>
              <button
                type="button"
                onClick={() => setSheetTab('editar')}
                className={`py-1.5 rounded-full font-semibold cursor-pointer ${
                  sheetTab === 'editar'
                    ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Editar Manual
              </button>
            </div>

            {/* TAB 1: GRAMOS EN CRUDO vs. TUPPER COCINADO */}
            {sheetTab === 'gramos' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">
                    Modo de Pesaje en Báscula:
                  </span>
                  <div className="apple-pill-surface p-1 rounded-full inline-flex text-xs">
                    <button
                      type="button"
                      onClick={() => setWeightMode('crudo')}
                      className={`px-3 py-1 rounded-full font-semibold cursor-pointer ${
                        weightMode === 'crudo'
                          ? 'bg-[#30D158] text-black'
                          : 'text-slate-400'
                      }`}
                    >
                      En Crudo / Seco
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeightMode('cocinado')}
                      className={`px-3 py-1 rounded-full font-semibold cursor-pointer ${
                        weightMode === 'cocinado'
                          ? 'bg-[#0A84FF] text-white'
                          : 'text-slate-400'
                      }`}
                    >
                      Cocinado (Tupper)
                    </button>
                  </div>
                </div>

                {/* Ingredient Breakdown */}
                <div className="space-y-2">
                  {recipeLookup[currentDay.meals[activeSheetSlot]]?.ingredients.map((ing) => {
                    const gVal =
                      weightMode === 'crudo'
                        ? ing.guilleAmountRaw
                        : Math.round(ing.guilleAmountRaw * ing.cookedRatio);
                    const aVal =
                      weightMode === 'crudo'
                        ? ing.albaAmountRaw
                        : Math.round(ing.albaAmountRaw * ing.cookedRatio);

                    return (
                      <div
                        key={ing.id}
                        className="flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] text-xs"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {ing.name}
                        </span>
                        <div className="flex items-center gap-3 font-bold">
                          {activeSheetSlot !== 'snack_nocturno' && (
                            <span className="text-[#30D158]">
                              Guille: {gVal} {ing.unit}
                            </span>
                          )}
                          <span className="text-[#FF2D55]">
                            Alba: {aVal} {ing.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 bg-black/5 dark:bg-white/5 p-3.5 rounded-2xl">
                  💡 {recipeLookup[currentDay.meals[activeSheetSlot]]?.cookingNotes}
                </p>

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
                  className="w-full py-3 rounded-2xl text-xs font-bold apple-pill-surface text-slate-800 dark:text-white cursor-pointer"
                >
                  {currentDay.freeMeals[activeSheetSlot]
                    ? 'Quitar marca de Comida Libre'
                    : '🎉 Marcar esta comida como Libre / Fuera de casa'}
                </button>
              </div>
            )}

            {/* TAB 2: CAMBIAR PLATO EN 1 TOQUE */}
            {sheetTab === 'cambiar' && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {allRecipes
                  .filter((r) =>
                    activeSheetSlot === 'desayuno' || activeSheetSlot === 'merienda'
                      ? r.slot === 'desayuno_merienda'
                      : r.slot === 'principal'
                  )
                  .map((r) => {
                    const isCurrent = currentDay.meals[activeSheetSlot] === r.id;
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
                              customMealOverrides: nextOverrides,
                            };
                          });
                          setActiveSheetSlot(null);
                        }}
                        className={`w-full p-3.5 rounded-2xl text-left flex items-center justify-between transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-[#30D158]/20 border border-[#30D158]/50'
                            : 'bg-slate-100 dark:bg-[#2C2C2E] hover:opacity-90'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {r.title}
                          </div>
                          <div className="text-xs text-slate-400">
                            Guille: {r.guilleBaseMacros.kcal} kcal · Alba: {r.albaBaseMacros.kcal} kcal
                          </div>
                        </div>
                        {isCurrent && (
                          <span className="text-xs font-bold text-[#30D158]">Actual</span>
                        )}
                      </button>
                    );
                  })}
              </div>
            )}

            {/* TAB 3: EDITAR MANUALMENTE */}
            {sheetTab === 'editar' && (
              <form onSubmit={handleSaveManualEdit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Nombre del plato
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl text-sm font-bold apple-pill-surface"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-[#30D158]/10 space-y-2">
                    <span className="font-bold text-[#30D158] block">Guille</span>
                    <div className="flex justify-between items-center">
                      <span>Kcal</span>
                      <input
                        type="number"
                        value={editGuilleKcal}
                        onChange={(e) => setEditGuilleKcal(Number(e.target.value))}
                        className="w-20 px-2 py-1 rounded-xl bg-white dark:bg-black text-right font-bold"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Proteína (g)</span>
                      <input
                        type="number"
                        value={editGuilleP}
                        onChange={(e) => setEditGuilleP(Number(e.target.value))}
                        className="w-20 px-2 py-1 rounded-xl bg-white dark:bg-black text-right font-bold"
                      />
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#FF2D55]/10 space-y-2">
                    <span className="font-bold text-[#FF2D55] block">Alba</span>
                    <div className="flex justify-between items-center">
                      <span>Kcal</span>
                      <input
                        type="number"
                        value={editAlbaKcal}
                        onChange={(e) => setEditAlbaKcal(Number(e.target.value))}
                        className="w-20 px-2 py-1 rounded-xl bg-white dark:bg-black text-right font-bold"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Proteína (g)</span>
                      <input
                        type="number"
                        value={editAlbaP}
                        onChange={(e) => setEditAlbaP(Number(e.target.value))}
                        className="w-20 px-2 py-1 rounded-xl bg-white dark:bg-black text-right font-bold"
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl text-xs font-bold bg-[#30D158] text-black cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
