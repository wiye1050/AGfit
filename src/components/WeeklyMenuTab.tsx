import React, { useState } from 'react';
import {
  AlbaShift,
  CustomMealOverride,
  DayId,
  DayPlan,
  GuilleShift,
  MealSlot,
  Recipe,
  TrainingType,
} from '../types';
import { RECIPES, RECIPE_MAP } from '../data/recipes';
import { computeDayNutrition } from '../utils/nutritionEngine';
import { DIRECTED_CLASSES_CATALOG } from '../data/workouts';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

interface WeeklyMenuTabProps {
  days: DayPlan[];
  selectedDayId: DayId;
  activeUser: 'guille' | 'alba';
  activeTemplateKey: 'semana_a' | 'semana_b' | 'semana_c';
  onApplyTemplate: (key: 'semana_a' | 'semana_b' | 'semana_c') => void;
  onUpdateDay: (dayId: DayId, updater: (prev: DayPlan) => DayPlan) => void;
  customRecipes: Recipe[];
}

const MEAL_LABELS: Record<MealSlot, string> = {
  desayuno: 'Desayuno',
  comida: 'Comida',
  merienda: 'Merienda',
  cena: 'Cena',
  snack_nocturno: 'Guardia noche',
};

const GUILLE_SHIFT_LABELS: Record<GuilleShift, string> = {
  manana: 'Mañana',
  tarde: 'Tarde',
  manana_tarde: 'Partido',
  libre: 'Libre',
};

const ALBA_SHIFT_LABELS: Record<AlbaShift, string> = {
  manana: 'Mañana HUCA',
  tarde: 'Tarde HUCA',
  noche: 'Noche HUCA',
  saliente: 'Saliente',
  libre: 'Libre',
};

const TRAINING_LABELS: Record<TrainingType, string> = {
  empuje: 'Empuje',
  tiron: 'Tirón',
  pierna: 'Pierna',
  padel: 'Pádel',
  running: 'Running',
  movilidad: 'Movilidad',
  clase_dirigida: 'Clase dirigida',
  otra_actividad: 'Deporte exterior',
  doble_sesion: 'Doble sesión',
  descanso_total: 'Descanso',
};

export const WeeklyMenuTab: React.FC<WeeklyMenuTabProps> = ({
  days,
  selectedDayId,
  activeUser,
  activeTemplateKey,
  onApplyTemplate,
  onUpdateDay,
  customRecipes,
}) => {
  const isGuille = activeUser === 'guille';
  const [weightMode, setWeightMode] = useState<'crudo' | 'cocinado'>('crudo');
  const [showDayConfig, setShowDayConfig] = useState(false);

  const [activeSheetSlot, setActiveSheetSlot] = useState<MealSlot | null>(null);
  const [sheetTab, setSheetTab] = useState<'cambiar' | 'receta' | 'libre'>('cambiar');

  const [editTitle, setEditTitle] = useState('');
  const [editKcal, setEditKcal] = useState(550);
  const [editProt, setEditProt] = useState(45);
  const [editCarbs, setEditCarbs] = useState(60);

  const allRecipes = [...RECIPES, ...customRecipes];
  const recipeLookup: Record<string, Recipe> = {
    ...RECIPE_MAP,
    ...Object.fromEntries(customRecipes.map((r) => [r.id, r])),
  };

  const currentDay = days.find((d) => d.day === selectedDayId) || days[0];
  const nutrition = computeDayNutrition(currentDay);

  const planned = isGuille ? nutrition.guillePlanned : nutrition.albaPlanned;
  const target = isGuille ? nutrition.guilleTarget : nutrition.albaTarget;
  const currentShiftLabel = isGuille
    ? GUILLE_SHIFT_LABELS[currentDay.guilleShift]
    : ALBA_SHIFT_LABELS[currentDay.albaShift];
  const currentTraining = isGuille
    ? currentDay.guilleTraining
    : currentDay.albaTraining;
  const currentTrainingLabel =
    !isGuille && currentTraining === 'clase_dirigida'
      ? currentDay.albaDirectedClass || 'Pilates'
      : TRAINING_LABELS[currentTraining];

  const slots: MealSlot[] = ['desayuno', 'comida', 'merienda', 'cena'];
  if (!isGuille && currentDay.albaShift === 'noche') {
    slots.push('snack_nocturno');
  }

  const openMealSheet = (slot: MealSlot) => {
    const custom = currentDay.customMealOverrides[slot];
    const r = recipeLookup[currentDay.meals[slot]];
    setActiveSheetSlot(slot);
    setSheetTab('cambiar');
    if (custom) {
      const m = isGuille ? custom.guilleMacros : custom.albaMacros;
      setEditTitle(custom.title);
      setEditKcal(m.kcal);
      setEditProt(m.protein);
      setEditCarbs(m.carbs);
    } else if (r) {
      const m = isGuille ? r.guilleBaseMacros : r.albaBaseMacros;
      setEditTitle(r.title);
      setEditKcal(m.kcal);
      setEditProt(m.protein);
      setEditCarbs(m.carbs);
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
    const prevCustom = currentDay.customMealOverrides[activeSheetSlot];
    const baseRecipe = recipeLookup[currentDay.meals[activeSheetSlot]];

    const newMacros = {
      kcal: Number(editKcal) || 0,
      protein: Number(editProt) || 0,
      carbs: Number(editCarbs) || 0,
      fat: 14,
    };

    const override: CustomMealOverride = {
      title: editTitle.trim(),
      guilleMacros: isGuille
        ? newMacros
        : prevCustom?.guilleMacros ||
          baseRecipe?.guilleBaseMacros || { kcal: 600, protein: 50, carbs: 65, fat: 14 },
      albaMacros: !isGuille
        ? newMacros
        : prevCustom?.albaMacros ||
          baseRecipe?.albaBaseMacros || { kcal: 450, protein: 32, carbs: 50, fat: 12 },
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
      {/* 1. Single-Line Day Status & Macros */}
      <div className="apple-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {currentDay.label}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {currentShiftLabel} · {currentTrainingLabel} ·{' '}
              <strong className="text-slate-900 dark:text-white">
                {planned.kcal} kcal
              </strong>{' '}
              ({planned.protein}P · {planned.carbs}HC · {planned.fat}G)
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowDayConfig((v) => !v)}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold apple-pill-surface text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>Ajustar día</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                showDayConfig ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Collapsible Day Configuration (Shift + Activity + Week Template) */}
        {showDayConfig && (
          <div className="pt-3 border-t border-black/5 dark:border-white/5 space-y-3.5">
            {/* Shift Selector */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 block">
                Turno de {isGuille ? 'Guille' : 'Alba'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {isGuille
                  ? (['manana', 'tarde', 'manana_tarde', 'libre'] as GuilleShift[]).map(
                      (s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() =>
                            onUpdateDay(currentDay.day, (prev) => ({
                              ...prev,
                              guilleShift: s,
                            }))
                          }
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                            currentDay.guilleShift === s
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                              : 'apple-pill-surface text-slate-500'
                          }`}
                        >
                          {GUILLE_SHIFT_LABELS[s]}
                        </button>
                      )
                    )
                  : (
                      ['manana', 'tarde', 'noche', 'saliente', 'libre'] as AlbaShift[]
                    ).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          onUpdateDay(currentDay.day, (prev) => ({
                            ...prev,
                            albaShift: s,
                          }))
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                          currentDay.albaShift === s
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                            : 'apple-pill-surface text-slate-500'
                        }`}
                      >
                        {ALBA_SHIFT_LABELS[s]}
                      </button>
                    ))}
              </div>
            </div>

            {/* Training Selector */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 block">
                Entrenamiento del día
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    'empuje',
                    'tiron',
                    'pierna',
                    'padel',
                    'running',
                    'movilidad',
                    'clase_dirigida',
                    'otra_actividad',
                    'descanso_total',
                  ] as TrainingType[]
                ).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      onUpdateDay(currentDay.day, (prev) =>
                        isGuille
                          ? { ...prev, guilleTraining: t }
                          : { ...prev, albaTraining: t }
                      )
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                      currentTraining === t
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                        : 'apple-pill-surface text-slate-500'
                    }`}
                  >
                    {TRAINING_LABELS[t]}
                  </button>
                ))}
              </div>

              {!isGuille && currentTraining === 'clase_dirigida' && (
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
                      className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ${
                        currentDay.albaDirectedClass === cls.name
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                          : 'apple-pill-surface text-slate-400'
                      }`}
                    >
                      {cls.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Week Template Selector */}
            <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
              <span className="text-[11px] font-semibold text-slate-400">
                Plantilla semanal
              </span>
              <div className="flex gap-1">
                {(['semana_a', 'semana_b', 'semana_c'] as const).map((key, idx) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onApplyTemplate(key)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer ${
                      activeTemplateKey === key
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                        : 'apple-pill-surface text-slate-400'
                    }`}
                  >
                    Semana {['A', 'B', 'C'][idx]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Quiet Scale Toggle */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-slate-400">
          Cantidades para {isGuille ? 'Guille' : 'Alba'} (meta {target.kcal} kcal)
        </span>
        <div className="apple-pill-surface p-0.5 rounded-full inline-flex text-xs">
          <button
            type="button"
            onClick={() => setWeightMode('crudo')}
            className={`px-3 py-1 rounded-full font-semibold cursor-pointer ${
              weightMode === 'crudo'
                ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-400'
            }`}
          >
            En crudo
          </button>
          <button
            type="button"
            onClick={() => setWeightMode('cocinado')}
            className={`px-3 py-1 rounded-full font-semibold cursor-pointer ${
              weightMode === 'cocinado'
                ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-400'
            }`}
          >
            Cocinado
          </button>
        </div>
      </div>

      {/* 3. Clean 2-Line Meal List */}
      <div className="space-y-2.5">
        {slots.map((slot) => {
          const isFree = Boolean(currentDay.freeMeals[slot]);
          const custom = currentDay.customMealOverrides[slot];
          const recipe = recipeLookup[currentDay.meals[slot]];

          const carbMult =
            isGuille && (slot === 'comida' || slot === 'cena')
              ? nutrition.guilleLevel === 'alto'
                ? 1.15
                : nutrition.guilleLevel === 'bajo'
                ? 0.8
                : 1
              : 1;

          return (
            <div
              key={slot}
              onClick={() => openMealSheet(slot)}
              className="apple-card rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:opacity-95 transition-opacity"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    {MEAL_LABELS[slot]}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {isFree
                    ? 'Comida libre'
                    : custom
                    ? custom.title
                    : recipe?.title}
                </h3>

                {!isFree && recipe && !custom && (
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                    {recipe.ingredients
                      .map((ing) => {
                        const baseRaw = isGuille
                          ? ing.guilleAmountRaw
                          : ing.albaAmountRaw;
                        const isCarb =
                          isGuille &&
                          ing.aisle === 'despensa' &&
                          (ing.name.toLowerCase().includes('arroz') ||
                            ing.name.toLowerCase().includes('pasta') ||
                            ing.name.toLowerCase().includes('cuscús') ||
                            ing.name.toLowerCase().includes('patata'));
                        const adjustedRaw = isCarb
                          ? Math.round(baseRaw * carbMult)
                          : baseRaw;
                        const val =
                          weightMode === 'crudo'
                            ? adjustedRaw
                            : Math.round(adjustedRaw * ing.cookedRatio);
                        const cleanName = ing.name
                          .split('(')[0]
                          .split('/')[0]
                          .trim()
                          .toLowerCase();
                        return `${val}${ing.unit} ${cleanName}`;
                      })
                      .join('  ·  ')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {(slot === 'desayuno' || slot === 'merienda') && !isFree && (
                  <button
                    type="button"
                    onClick={(e) => toggleSaladoDulce(slot, e)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium apple-pill-surface text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    {recipe?.style === 'salado' ? 'Salado' : 'Dulce'}
                  </button>
                )}
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Sheet: Swap Dish / Preparation / Free Meal */}
      {activeSheetSlot && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setActiveSheetSlot(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-t-3xl sm:rounded-3xl p-6 space-y-4 animate-sheet max-h-[85dvh] overflow-y-auto border-t sm:border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  {MEAL_LABELS[activeSheetSlot]} · {currentDay.label}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {currentDay.customMealOverrides[activeSheetSlot]?.title ||
                    recipeLookup[currentDay.meals[activeSheetSlot]]?.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveSheetSlot(null)}
                className="w-7 h-7 rounded-full apple-pill-surface flex items-center justify-center text-slate-400 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="apple-pill-surface p-1 rounded-full grid grid-cols-3 text-xs">
              <button
                type="button"
                onClick={() => setSheetTab('cambiar')}
                className={`py-1.5 rounded-full font-semibold cursor-pointer ${
                  sheetTab === 'cambiar'
                    ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Cambiar plato
              </button>
              <button
                type="button"
                onClick={() => setSheetTab('receta')}
                className={`py-1.5 rounded-full font-semibold cursor-pointer ${
                  sheetTab === 'receta'
                    ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Preparación
              </button>
              <button
                type="button"
                onClick={() => setSheetTab('libre')}
                className={`py-1.5 rounded-full font-semibold cursor-pointer ${
                  sheetTab === 'libre'
                    ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Manual / Libre
              </button>
            </div>

            {sheetTab === 'cambiar' && (
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
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
                        className={`w-full p-3.5 rounded-2xl text-left flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                            : 'bg-slate-100 dark:bg-[#2C2C2E]'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-semibold">{r.title}</div>
                          <div
                            className={`text-xs mt-0.5 ${
                              isSelected ? 'opacity-80' : 'text-slate-400'
                            }`}
                          >
                            {isGuille ? r.portionNoteGuille : r.portionNoteAlba}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}

            {sheetTab === 'receta' && (
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {recipeLookup[currentDay.meals[activeSheetSlot]]?.cookingNotes}
              </div>
            )}

            {sheetTab === 'libre' && (
              <div className="space-y-3">
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
                  className="w-full py-3 rounded-xl text-xs font-semibold apple-pill-surface text-slate-800 dark:text-white cursor-pointer"
                >
                  {currentDay.freeMeals[activeSheetSlot]
                    ? 'Volver al plato del menú'
                    : 'Marcar como comida libre'}
                </button>

                <form onSubmit={handleSaveManualEdit} className="space-y-3 pt-1">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Nombre del plato"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold apple-pill-surface"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Kcal</span>
                      <input
                        type="number"
                        value={editKcal}
                        onChange={(e) => setEditKcal(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl text-xs font-semibold apple-pill-surface"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Proteína (g)</span>
                      <input
                        type="number"
                        value={editProt}
                        onChange={(e) => setEditProt(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl text-xs font-semibold apple-pill-surface"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Hidratos (g)</span>
                      <input
                        type="number"
                        value={editCarbs}
                        onChange={(e) => setEditCarbs(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl text-xs font-semibold apple-pill-surface"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-black cursor-pointer"
                  >
                    Guardar
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
