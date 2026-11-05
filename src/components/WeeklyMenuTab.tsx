import React, { useState } from 'react';
import {
  AlbaShift,
  CustomActivityDetail,
  CustomMealOverride,
  DayId,
  DayPlan,
  GuilleShift,
  MealSlot,
  ProfileView,
  Recipe,
  TrainingType,
} from '../types';
import { RECIPES, RECIPE_MAP, WEEK_TEMPLATES } from '../data/recipes';
import {
  ALBA_SHIFT_LABELS,
  computeDayNutrition,
  GUILLE_SHIFT_LABELS,
  TRAINING_LABELS,
} from '../utils/nutritionEngine';
import {
  DIRECTED_CLASSES_CATALOG,
  OUTDOOR_ACTIVITIES_CATALOG,
} from '../data/workouts';
import {
  buildGoogleCalendarQuickLink,
  parseGuilleShiftPatternString,
  parseShiftPatternString,
} from '../services/googleEcosystem';
import {
  Calendar,
  ChefHat,
  Clock,
  Edit3,
  ExternalLink,
  Flame,
  Home,
  Package,
  PlusCircle,
  Printer,
  RefreshCw,
  Repeat,
  Sparkles,
  Utensils,
  Zap,
} from 'lucide-react';

interface WeeklyMenuTabProps {
  days: DayPlan[];
  selectedDayId: DayId;
  onSelectDay: (day: DayId) => void;
  profileView: ProfileView;
  activeTemplateKey: 'semana_a' | 'semana_b' | 'semana_c';
  onApplyTemplate: (key: 'semana_a' | 'semana_b' | 'semana_c') => void;
  onUpdateDay: (dayId: DayId, updater: (prev: DayPlan) => DayPlan) => void;
  onBatchUpdateShifts: (albaShifts: AlbaShift[] | null, guilleShifts: GuilleShift[] | null) => void;
  onAddCustomRecipeToCatalog: (recipe: Recipe) => void;
  customRecipes: Recipe[];
}

const MEAL_SLOT_META: Record<
  MealSlot,
  { label: string; icon: string; badge: string }
> = {
  desayuno: { label: '1. Desayuno & Café Matinal', icon: '☕', badge: 'Salado / Dulce 1-Clic' },
  comida: { label: '2. Comida Principal (Mediodía)', icon: '🍽️', badge: 'Guille siempre en Casa' },
  merienda: { label: '3. Merienda / Bloque Perientreno', icon: '⚡', badge: 'Ajuste Ciclado HC' },
  cena: { label: '4. Cena Recuperadora', icon: '🌙', badge: 'Batch / Airfryer 10m' },
  snack_nocturno: { label: '5. Snack Nocturno HUCA (02:30h)', icon: '🏥', badge: 'Exclusivo Noche Alba' },
};

export const WeeklyMenuTab: React.FC<WeeklyMenuTabProps> = ({
  days,
  selectedDayId,
  onSelectDay,
  profileView,
  activeTemplateKey,
  onApplyTemplate,
  onUpdateDay,
  onBatchUpdateShifts,
  onAddCustomRecipeToCatalog,
  customRecipes,
}) => {
  const [viewMode, setViewMode] = useState<'dia' | 'semana_panoramica'>('dia');
  const [weightDisplayMode, setWeightDisplayMode] = useState<'ambos' | 'crudo' | 'cocinado'>('ambos');
  const [showShiftImporter, setShowShiftImporter] = useState(false);
  const [albaPatternInput, setAlbaPatternInput] = useState('M, T, N, S, L, L, M');
  const [guillePatternInput, setGuillePatternInput] = useState('MT, M, MT, T, M, L, L');

  // Manual Meal Editor Modal State
  const [editingSlot, setEditingSlot] = useState<MealSlot | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editGuilleKcal, setEditGuilleKcal] = useState(600);
  const [editGuilleP, setEditGuilleP] = useState(50);
  const [editGuilleHC, setEditGuilleHC] = useState(65);
  const [editGuilleG, setEditGuilleG] = useState(14);
  const [editAlbaKcal, setEditAlbaKcal] = useState(450);
  const [editAlbaP, setEditAlbaP] = useState(34);
  const [editAlbaHC, setEditAlbaHC] = useState(50);
  const [editAlbaG, setEditAlbaG] = useState(12);
  const [editNotes, setEditNotes] = useState('');
  const [saveAsCatalogRecipe, setSaveAsCatalogRecipe] = useState(false);

  const allRecipes = [...RECIPES, ...customRecipes];
  const recipeLookup: Record<string, Recipe> = {
    ...RECIPE_MAP,
    ...Object.fromEntries(customRecipes.map((r) => [r.id, r])),
  };

  const currentDayIndex = days.findIndex((d) => d.day === selectedDayId);
  const currentDay = days[currentDayIndex] || days[0];
  const nutrition = computeDayNutrition(currentDay);

  const openManualEditor = (slot: MealSlot) => {
    const existingCustom = currentDay.customMealOverrides[slot];
    const currentRecipe = recipeLookup[currentDay.meals[slot]];
    setEditingSlot(slot);
    if (existingCustom) {
      setEditTitle(existingCustom.title);
      setEditGuilleKcal(existingCustom.guilleMacros.kcal);
      setEditGuilleP(existingCustom.guilleMacros.protein);
      setEditGuilleHC(existingCustom.guilleMacros.carbs);
      setEditGuilleG(existingCustom.guilleMacros.fat);
      setEditAlbaKcal(existingCustom.albaMacros.kcal);
      setEditAlbaP(existingCustom.albaMacros.protein);
      setEditAlbaHC(existingCustom.albaMacros.carbs);
      setEditAlbaG(existingCustom.albaMacros.fat);
      setEditNotes(existingCustom.notes || '');
    } else if (currentRecipe) {
      setEditTitle(currentRecipe.title);
      setEditGuilleKcal(currentRecipe.guilleBaseMacros.kcal);
      setEditGuilleP(currentRecipe.guilleBaseMacros.protein);
      setEditGuilleHC(currentRecipe.guilleBaseMacros.carbs);
      setEditGuilleG(currentRecipe.guilleBaseMacros.fat);
      setEditAlbaKcal(currentRecipe.albaBaseMacros.kcal);
      setEditAlbaP(currentRecipe.albaBaseMacros.protein);
      setEditAlbaHC(currentRecipe.albaBaseMacros.carbs);
      setEditAlbaG(currentRecipe.albaBaseMacros.fat);
      setEditNotes(currentRecipe.cookingNotes);
    }
    setSaveAsCatalogRecipe(false);
  };

  const handleSaveManualOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot || !editTitle.trim()) return;

    const override: CustomMealOverride = {
      title: editTitle.trim(),
      guilleMacros: {
        kcal: Number(editGuilleKcal) || 0,
        protein: Number(editGuilleP) || 0,
        carbs: Number(editGuilleHC) || 0,
        fat: Number(editGuilleG) || 0,
      },
      albaMacros: {
        kcal: Number(editAlbaKcal) || 0,
        protein: Number(editAlbaP) || 0,
        carbs: Number(editAlbaHC) || 0,
        fat: Number(editAlbaG) || 0,
      },
      notes: editNotes.trim(),
    };

    if (saveAsCatalogRecipe) {
      const newRecipeId = `custom_${Date.now()}`;
      const newRecipe: Recipe = {
        id: newRecipeId,
        title: override.title,
        subtitle: 'Receta personalizada creada por Guille & Alba',
        slot:
          editingSlot === 'desayuno' || editingSlot === 'merienda'
            ? 'desayuno_merienda'
            : editingSlot === 'snack_nocturno'
            ? 'snack_noche'
            : 'principal',
        style: 'batch_tradicional',
        prepType: 'batch_domingo',
        tupperFriendly: true,
        appliance: 'vitro',
        guilleBaseMacros: override.guilleMacros,
        albaBaseMacros: override.albaMacros,
        ingredients: [],
        portionNoteGuille: `${override.guilleMacros.kcal} kcal (${override.guilleMacros.protein}g P · ${override.guilleMacros.carbs}g HC)`,
        portionNoteAlba: `${override.albaMacros.kcal} kcal (${override.albaMacros.protein}g P · ${override.albaMacros.carbs}g HC)`,
        cookingNotes: override.notes || 'Plato personalizado.',
        tags: ['Personalizado'],
      };
      onAddCustomRecipeToCatalog(newRecipe);
    }

    onUpdateDay(currentDay.day, (prev) => ({
      ...prev,
      customMealOverrides: {
        ...prev.customMealOverrides,
        [editingSlot]: override,
      },
    }));
    setEditingSlot(null);
  };

  const handleApplyShiftPatterns = (e: React.FormEvent) => {
    e.preventDefault();
    const albaParsed = parseShiftPatternString(albaPatternInput);
    const guilleParsed = parseGuilleShiftPatternString(guillePatternInput);
    onBatchUpdateShifts(albaParsed, guilleParsed);
    setShowShiftImporter(false);
  };

  const quickToggleBreakfastMeriendaStyle = (slot: 'desayuno' | 'merienda') => {
    const currentId = currentDay.meals[slot];
    const currentRecipe = recipeLookup[currentId];
    if (slot === 'desayuno') {
      const nextId =
        currentRecipe?.style === 'salado'
          ? 'des_dulce_yogur_avena'
          : 'des_salado_jamon_huevo';
      onUpdateDay(currentDay.day, (prev) => {
        const nextOverrides = { ...prev.customMealOverrides };
        delete nextOverrides[slot];
        return {
          ...prev,
          meals: { ...prev.meals, [slot]: nextId },
          customMealOverrides: nextOverrides,
        };
      });
    } else {
      const nextId =
        currentRecipe?.style === 'salado'
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
    }
  };

  const activeSlots: MealSlot[] = ['desayuno', 'comida', 'merienda', 'cena'];
  if (currentDay.albaShift === 'noche') {
    activeSlots.push('snack_nocturno');
  }

  return (
    <div className="space-y-5">
      {/* Top Toolbar: Week Template, Panoramic View, Weight Mode, Shift Importer */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Plantilla Semanal:
            </span>
          </div>
          <select
            value={activeTemplateKey}
            onChange={(e) =>
              onApplyTemplate(e.target.value as 'semana_a' | 'semana_b' | 'semana_c')
            }
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white cursor-pointer"
          >
            <option value="semana_a">Semana A · Estándar Oviedo (Enjoy + Pádel + HUCA)</option>
            <option value="semana_b">Semana B · Rotación Mediterránea & Doble Pádel</option>
            <option value="semana_c">Semana C · Alto Rendimiento & Definición</option>
          </select>

          <button
            type="button"
            onClick={() => setShowShiftImporter((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Importar Turnos L-D (Rápido)</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Raw vs Cooked Weight Display Selector */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setWeightDisplayMode('ambos')}
              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                weightDisplayMode === 'ambos'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Crudo + Cocinado
            </button>
            <button
              type="button"
              onClick={() => setWeightDisplayMode('crudo')}
              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                weightDisplayMode === 'crudo'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Solo Crudo
            </button>
            <button
              type="button"
              onClick={() => setWeightDisplayMode('cocinado')}
              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                weightDisplayMode === 'cocinado'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Solo Tupper
            </button>
          </div>

          {/* Day vs Panoramic 7-Day Toggle */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('dia')}
              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                viewMode === 'dia'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Vista Día ({currentDay.shortLabel})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('semana_panoramica')}
              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                viewMode === 'semana_panoramica'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Vista 7 Días (L-D)
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="no-print inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            title="Imprimir o guardar en PDF para la nevera"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF Nevera</span>
          </button>
        </div>
      </div>

      {/* Fast Shift Pattern Importer Drawer */}
      {showShiftImporter && (
        <form
          onSubmit={handleApplyShiftPatterns}
          className="p-4 rounded-2xl bg-cyan-500/5 dark:bg-cyan-950/30 border border-cyan-500/30 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-300">
              Carga Rápida de Cartelera Semanal (Lunes a Domingo)
            </h3>
            <span className="text-[11px] text-slate-500">
              Códigos Alba: M (Mañana), T (Tarde), N (Noche), S (Saliente), L (Libre) · Guille: M, T, MT (Partido), L
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-rose-500 mb-1">
                Turnos Alba HUCA (7 días L-D separados por coma):
              </label>
              <input
                type="text"
                value={albaPatternInput}
                onChange={(e) => setAlbaPatternInput(e.target.value)}
                placeholder="Ej: M, T, N, S, L, L, M"
                className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-500 mb-1">
                Turnos Guille (7 días L-D separados por coma):
              </label>
              <input
                type="text"
                value={guillePatternInput}
                onChange={(e) => setGuillePatternInput(e.target.value)}
                placeholder="Ej: MT, M, MT, T, M, L, L"
                className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowShiftImporter(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 cursor-pointer"
            >
              Aplicar Turnos a toda la Semana
            </button>
          </div>
        </form>
      )}

      {/* PANORAMIC 7-DAY OVERVIEW MODE */}
      {viewMode === 'semana_panoramica' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
          {days.map((d) => {
            const n = computeDayNutrition(d);
            const isSelected = d.day === selectedDayId;
            return (
              <div
                key={d.day}
                onClick={() => {
                  onSelectDay(d.day);
                  setViewMode('dia');
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-emerald-500/5 dark:bg-slate-900 border-emerald-500/50 shadow-md'
                    : 'bg-white dark:bg-slate-900/75 border-slate-200 dark:border-slate-800 hover:border-emerald-500/40'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {d.label}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
                      HC {n.guilleLevel.toUpperCase()}
                    </span>
                  </div>

                  {/* Shifts */}
                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-500">Guille:</span>
                      <span className="text-slate-600 dark:text-slate-300">
                        {GUILLE_SHIFT_LABELS[d.guilleShift]} · {TRAINING_LABELS[d.guilleTraining].short}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-400">Alba:</span>
                      <span className="text-slate-600 dark:text-slate-300">
                        {d.albaShift.toUpperCase()} ·{' '}
                        {d.albaTraining === 'clase_dirigida'
                          ? d.albaDirectedClass
                          : TRAINING_LABELS[d.albaTraining].short}
                      </span>
                    </div>
                  </div>

                  {/* Meals Summary */}
                  <div className="space-y-1.5 pt-1 text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/60 dark:border-slate-800/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        ☀️ Comida (Casa)
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                        {d.freeMeals.comida
                          ? '🎉 Comida Libre'
                          : d.customMealOverrides.comida?.title ||
                            recipeLookup[d.meals.comida]?.title}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/60 dark:border-slate-800/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        🌙 Cena
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                        {d.freeMeals.cena
                          ? '🎉 Cena Libre'
                          : d.customMealOverrides.cena?.title ||
                            recipeLookup[d.meals.cena]?.title}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-200/70 dark:border-slate-800 text-[11px] flex justify-between font-bold">
                  <span className="text-emerald-500">{n.guillePlanned.kcal} kcal</span>
                  <span className="text-rose-400">{n.albaPlanned.kcal} kcal</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* DETAILED DAY OPERATIONAL VIEW */
        <div className="space-y-5">
          {/* Shifts & Daily Training Control Grid (Guille & Alba) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* GUILLE CONTROL CARD */}
            {(profileView === 'pareja' || profileView === 'guille') && (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-emerald-500/30 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      GUILLE · {currentDay.label} (1.79m · 85kg · Déficit -450 kcal)
                    </h2>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                    Ciclado HC: {nutrition.guilleLevel.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Turno de Trabajo Guille:
                    </label>
                    <select
                      value={currentDay.guilleShift}
                      onChange={(e) =>
                        onUpdateDay(currentDay.day, (prev) => ({
                          ...prev,
                          guilleShift: e.target.value as GuilleShift,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="manana">Mañana (Come en casa)</option>
                      <option value="tarde">Tarde (Come en casa)</option>
                      <option value="manana_tarde">Mañana y Tarde (Come en casa al mediodía)</option>
                      <option value="libre">Libre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Entrenamiento Diario Guille:
                    </label>
                    <select
                      value={currentDay.guilleTraining}
                      onChange={(e) =>
                        onUpdateDay(currentDay.day, (prev) => ({
                          ...prev,
                          guilleTraining: e.target.value as TrainingType,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-950 border border-emerald-500/40 text-slate-900 dark:text-white"
                    >
                      <option value="empuje">🏋️‍♂️ Gym Enjoy · Empuje (Push) [HC Medio]</option>
                      <option value="tiron">💪 Gym Enjoy · Tirón (Pull) [HC Medio]</option>
                      <option value="pierna">🦵 Gym Enjoy · Pierna (Legs) [HC Medio]</option>
                      <option value="padel">🎾 Partido de Pádel (90 min) [HC Alto]</option>
                      <option value="running">🏃‍♂️ Running Oviedo / Cinta [HC Medio]</option>
                      <option value="doble_sesion">🔥 Doble Sesión (Gym + Pádel/Run) [HC Alto]</option>
                      <option value="otra_actividad">⛰️ Otra Actividad (Ruta/Escalada/Fútbol...)</option>
                      <option value="movilidad">🧘‍♂️ Descanso / Movilidad Pádel [HC Bajo]</option>
                      <option value="descanso_total">🛋️ Descanso Total [HC Bajo]</option>
                    </select>
                  </div>
                </div>

                {/* Custom Outdoor / Other Activity Config for Guille */}
                {currentDay.guilleTraining === 'otra_actividad' && (
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={currentDay.guilleCustomActivity.name}
                      onChange={(e) =>
                        onUpdateDay(currentDay.day, (prev) => ({
                          ...prev,
                          guilleCustomActivity: {
                            ...prev.guilleCustomActivity,
                            name: e.target.value,
                          },
                        }))
                      }
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                    >
                      {OUTDOOR_ACTIVITIES_CATALOG.map((act) => (
                        <option key={act.id} value={act.name}>
                          {act.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={currentDay.guilleCustomActivity.durationMin}
                        onChange={(e) =>
                          onUpdateDay(currentDay.day, (prev) => ({
                            ...prev,
                            guilleCustomActivity: {
                              ...prev.guilleCustomActivity,
                              durationMin: Number(e.target.value) || 60,
                            },
                          }))
                        }
                        className="w-20 px-2 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                      />
                      <span className="text-xs text-slate-500">min</span>
                    </div>
                    <select
                      value={currentDay.guilleCustomActivity.intensity}
                      onChange={(e) =>
                        onUpdateDay(currentDay.day, (prev) => ({
                          ...prev,
                          guilleCustomActivity: {
                            ...prev.guilleCustomActivity,
                            intensity: e.target.value as CustomActivityDetail['intensity'],
                          },
                        }))
                      }
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                    >
                      <option value="suave">Intensidad Suave (HC Bajo)</option>
                      <option value="media">Intensidad Media (HC Medio)</option>
                      <option value="alta">Intensidad Alta (HC Alto)</option>
                    </select>
                  </div>
                )}

                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
                  <Zap className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong>Ajuste Satélite sin romper el Batch Cooking:</strong>{' '}
                    {nutrition.guillePeriWorkoutNote}
                  </div>
                </div>
              </div>
            )}

            {/* ALBA CONTROL CARD */}
            {(profileView === 'pareja' || profileView === 'alba') && (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-rose-500/30 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      ALBA · {currentDay.label} (HUCA · 1.67m · 53kg · Mantenimiento)
                    </h2>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    { nutrition.albaTarget.kcal } kcal obj.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Turno Rotatorio HUCA Alba:
                    </label>
                    <select
                      value={currentDay.albaShift}
                      onChange={(e) =>
                        onUpdateDay(currentDay.day, (prev) => ({
                          ...prev,
                          albaShift: e.target.value as AlbaShift,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="manana">☀️ Mañana HUCA (08-15h · Come en casa 15:30h)</option>
                      <option value="tarde">🌆 Tarde HUCA (15-22h · Come 13:30h / Cena 22:30h)</option>
                      <option value="noche">🌙 Noche HUCA (22-08h · Activa Snack 02:30h)</option>
                      <option value="saliente">🛌 Saliente de Noche (Post-guardia)</option>
                      <option value="libre">🎉 Libre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Entrenamiento Diario Alba:
                    </label>
                    <select
                      value={currentDay.albaTraining}
                      onChange={(e) =>
                        onUpdateDay(currentDay.day, (prev) => ({
                          ...prev,
                          albaTraining: e.target.value as TrainingType,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-950 border border-rose-500/40 text-slate-900 dark:text-white"
                    >
                      <option value="clase_dirigida">🧘‍♀️ Clase Dirigida Enjoy (Pilates, GAP, Ciclo...)</option>
                      <option value="pierna">🦵 Gym Enjoy · Pierna (Legs)</option>
                      <option value="empuje">🏋️‍♀️ Gym Enjoy · Empuje (Push)</option>
                      <option value="tiron">💪 Gym Enjoy · Tirón (Pull)</option>
                      <option value="padel">🎾 Partido de Pádel (90 min)</option>
                      <option value="running">🏃‍♀️ Running / Cardio</option>
                      <option value="otra_actividad">⛰️ Otra Actividad (Ruta, Escalada, Bici...)</option>
                      <option value="movilidad">🤸‍♀️ Movilidad / Estiramientos</option>
                      <option value="descanso_total">🛋️ Descanso Total</option>
                    </select>
                  </div>
                </div>

                {/* Directed Class Selector when Alba chooses 'clase_dirigida' */}
                {currentDay.albaTraining === 'clase_dirigida' && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] font-bold text-rose-400 mr-1">
                      Clase en Enjoy Oviedo:
                    </span>
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
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          currentDay.albaDirectedClass === cls.name
                            ? 'bg-rose-500 text-white border-rose-500'
                            : 'bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-rose-400'
                        }`}
                      >
                        {cls.name} ({cls.durationMin}m)
                      </button>
                    ))}
                  </div>
                )}

                {currentDay.albaTraining === 'otra_actividad' && (
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={currentDay.albaCustomActivity.name}
                      onChange={(e) =>
                        onUpdateDay(currentDay.day, (prev) => ({
                          ...prev,
                          albaCustomActivity: {
                            ...prev.albaCustomActivity,
                            name: e.target.value,
                          },
                        }))
                      }
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                    >
                      {OUTDOOR_ACTIVITIES_CATALOG.map((act) => (
                        <option key={act.id} value={act.name}>
                          {act.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={currentDay.albaCustomActivity.durationMin}
                        onChange={(e) =>
                          onUpdateDay(currentDay.day, (prev) => ({
                            ...prev,
                            albaCustomActivity: {
                              ...prev.albaCustomActivity,
                              durationMin: Number(e.target.value) || 60,
                            },
                          }))
                        }
                        className="w-20 px-2 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                      />
                      <span className="text-xs text-slate-500">min</span>
                    </div>
                    <select
                      value={currentDay.albaCustomActivity.intensity}
                      onChange={(e) =>
                        onUpdateDay(currentDay.day, (prev) => ({
                          ...prev,
                          albaCustomActivity: {
                            ...prev.albaCustomActivity,
                            intensity: e.target.value as CustomActivityDetail['intensity'],
                          },
                        }))
                      }
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                    >
                      <option value="suave">Intensidad Suave</option>
                      <option value="media">Intensidad Media</option>
                      <option value="alta">Intensidad Alta</option>
                    </select>
                  </div>
                )}

                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-800 dark:text-rose-200 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Ajuste Diario Alba:</strong> {nutrition.albaPeriWorkoutNote}
                    </div>
                  </div>
                  <a
                    href={buildGoogleCalendarQuickLink(currentDay, currentDayIndex)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/80 dark:bg-slate-900 text-[11px] font-bold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:border-rose-400 shrink-0"
                    title="Añadir este día a Google Calendar"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>+Calendar</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* MEALS CARDS FOR THE SELECTED DAY */}
          <div className="space-y-3.5">
            {activeSlots.map((slot) => {
              const meta = MEAL_SLOT_META[slot];
              const isFree = Boolean(currentDay.freeMeals[slot]);
              const customOverride = currentDay.customMealOverrides[slot];
              const recipe = recipeLookup[currentDay.meals[slot]];
              const logistics = nutrition.mealLogistics[slot];

              // Filter compatible recipes for 1-click swap dropdown
              const compatibleRecipes = allRecipes.filter((r) => {
                if (slot === 'desayuno' || slot === 'merienda') {
                  return r.slot === 'desayuno_merienda';
                }
                if (slot === 'snack_nocturno') {
                  return r.slot === 'snack_noche' || r.slot === 'desayuno_merienda';
                }
                return r.slot === 'principal';
              });

              return (
                <div
                  key={slot}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isFree
                      ? 'bg-amber-500/5 border-amber-500/30'
                      : slot === 'snack_nocturno'
                      ? 'bg-indigo-950/30 border-indigo-500/40'
                      : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-sm'
                  }`}
                >
                  {/* Meal Header Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-lg">{meta.icon}</span>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                        {meta.label}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        { logistics.scheduleHint }
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        Guille: {logistics.guilleLocation}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        Alba: {logistics.albaLocation}
                      </span>
                    </div>

                    {/* Action Buttons for this Meal */}
                    <div className="flex items-center gap-1.5 flex-wrap no-print">
                      {(slot === 'desayuno' || slot === 'merienda') && !isFree && (
                        <button
                          type="button"
                          onClick={() => quickToggleBreakfastMeriendaStyle(slot)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 cursor-pointer"
                        >
                          <Repeat className="w-3.5 h-3.5" />
                          <span>Alternar Salado ⇄ Dulce</span>
                        </button>
                      )}

                      {!isFree && (
                        <button
                          type="button"
                          onClick={() => openManualEditor(slot)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-emerald-500/40 border border-transparent cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Editar Manual</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateDay(currentDay.day, (prev) => ({
                            ...prev,
                            freeMeals: {
                              ...prev.freeMeals,
                              [slot]: !prev.freeMeals[slot],
                            },
                          }))
                        }
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          isFree
                            ? 'bg-amber-500 text-slate-950 border-amber-500'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-amber-400'
                        }`}
                      >
                        {isFree ? '🎉 Comida Libre Activa (Revertir)' : '🎉 Marcar Libre / Fuera'}
                      </button>
                    </div>
                  </div>

                  {isFree ? (
                    <div className="py-4 text-center text-xs sm:text-sm text-amber-600 dark:text-amber-300 font-semibold">
                      🎉 Ingesta marcada como <strong>Comida Libre / Social fuera de casa</strong>. No suma ingredientes a la lista de la compra ni al Batch Cooking.
                    </div>
                  ) : (
                    <div className="pt-3 space-y-3">
                      {/* Dish Selector + Title */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                              {customOverride ? customOverride.title : recipe?.title}
                            </h4>
                            {customOverride && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-400 border border-violet-500/30">
                                Editado Manualmente
                              </span>
                            )}
                            {recipe?.prepType === 'airfryer_express' && !customOverride && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                ⚡ Airfryer 10-11 min al momento
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {customOverride ? customOverride.notes : recipe?.subtitle}
                          </p>
                        </div>

                        {/* 1-Click Dish Selector Dropdown */}
                        <div className="no-print flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-400 shrink-0">
                            Cambiar plato:
                          </span>
                          <select
                            value={currentDay.meals[slot]}
                            onChange={(e) => {
                              const nextRecipeId = e.target.value;
                              onUpdateDay(currentDay.day, (prev) => {
                                const nextOverrides = { ...prev.customMealOverrides };
                                delete nextOverrides[slot];
                                return {
                                  ...prev,
                                  meals: { ...prev.meals, [slot]: nextRecipeId },
                                  customMealOverrides: nextOverrides,
                                };
                              });
                            }}
                            className="max-w-xs px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
                          >
                            {compatibleRecipes.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* DUAL PORTIONING CARDS (GUILLE vs. ALBA) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {/* GUILLE PORTION BOX */}
                        {(profileView === 'pareja' || profileView === 'guille') &&
                          slot !== 'snack_nocturno' && (
                            <div className="p-3.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/25 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                  🥡 Ración Guille
                                </span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                  {customOverride
                                    ? `${customOverride.guilleMacros.kcal} kcal · ${customOverride.guilleMacros.protein}g P · ${customOverride.guilleMacros.carbs}g HC`
                                    : `${recipe?.guilleBaseMacros.kcal} kcal · ${recipe?.guilleBaseMacros.protein}g P · ${recipe?.guilleBaseMacros.carbs}g HC`}
                                </span>
                              </div>

                              {!customOverride && recipe && (
                                <>
                                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                    {recipe.portionNoteGuille}
                                  </p>
                                  {recipe.ingredients.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      {recipe.ingredients.map((ing) => {
                                        const cookedVal = Math.round(
                                          ing.guilleAmountRaw * ing.cookedRatio
                                        );
                                        return (
                                          <span
                                            key={ing.id}
                                            className="px-2 py-0.5 rounded-lg text-[11px] bg-white dark:bg-slate-900 border border-emerald-500/20 text-slate-700 dark:text-slate-300"
                                          >
                                            <strong>{ing.name.split(' ')[0]}:</strong>{' '}
                                            {weightDisplayMode !== 'cocinado' && (
                                              <span>
                                                {ing.guilleAmountRaw}
                                                {ing.unit} crudo
                                              </span>
                                            )}
                                            {weightDisplayMode === 'ambos' &&
                                              ing.cookedRatio !== 1 &&
                                              ' → '}
                                            {weightDisplayMode !== 'crudo' &&
                                              ing.cookedRatio !== 1 && (
                                                <span className="text-emerald-500 font-bold">
                                                  ~{cookedVal}
                                                  {ing.unit} cocinado
                                                </span>
                                              )}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}

                        {/* ALBA PORTION BOX */}
                        {(profileView === 'pareja' || profileView === 'alba') && (
                          <div className="p-3.5 rounded-xl bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/25 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                                🥡 Ración Alba
                              </span>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                {customOverride
                                  ? `${customOverride.albaMacros.kcal} kcal · ${customOverride.albaMacros.protein}g P · ${customOverride.albaMacros.carbs}g HC`
                                  : `${recipe?.albaBaseMacros.kcal} kcal · ${recipe?.albaBaseMacros.protein}g P · ${recipe?.albaBaseMacros.carbs}g HC`}
                              </span>
                            </div>

                            {!customOverride && recipe && (
                              <>
                                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                  {recipe.portionNoteAlba}
                                </p>
                                {recipe.ingredients.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {recipe.ingredients.map((ing) => {
                                      const cookedVal = Math.round(
                                        ing.albaAmountRaw * ing.cookedRatio
                                      );
                                      return (
                                        <span
                                          key={ing.id}
                                          className="px-2 py-0.5 rounded-lg text-[11px] bg-white dark:bg-slate-900 border border-rose-500/20 text-slate-700 dark:text-slate-300"
                                        >
                                          <strong>{ing.name.split(' ')[0]}:</strong>{' '}
                                          {weightDisplayMode !== 'cocinado' && (
                                            <span>
                                              {ing.albaAmountRaw}
                                              {ing.unit} crudo
                                            </span>
                                          )}
                                          {weightDisplayMode === 'ambos' &&
                                            ing.cookedRatio !== 1 &&
                                            ' → '}
                                          {weightDisplayMode !== 'crudo' &&
                                            ing.cookedRatio !== 1 && (
                                              <span className="text-rose-400 font-bold">
                                                ~{cookedVal}
                                                {ing.unit} cocinado
                                              </span>
                                            )}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {!customOverride && recipe?.cookingNotes && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-0.5">
                          <Utensils className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            <strong>Nota culinaria:</strong> {recipe.cookingNotes}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MANUAL MEAL EDITOR / CUSTOM RECIPE MODAL */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveManualOverride}
            className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Editar Plato Manualmente · {MEAL_SLOT_META[editingSlot].label} ({currentDay.label})
              </h3>
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                ✕ Cerrar
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                Nombre del Plato / Comida:
              </label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Guille Macros */}
              <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/30 space-y-2">
                <span className="text-xs font-extrabold text-emerald-500 block">
                  Macros para Guille
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-400">Kcal</label>
                    <input
                      type="number"
                      value={editGuilleKcal}
                      onChange={(e) => setEditGuilleKcal(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Proteína (g)</label>
                    <input
                      type="number"
                      value={editGuilleP}
                      onChange={(e) => setEditGuilleP(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Hidratos (g)</label>
                    <input
                      type="number"
                      value={editGuilleHC}
                      onChange={(e) => setEditGuilleHC(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Grasas (g)</label>
                    <input
                      type="number"
                      value={editGuilleG}
                      onChange={(e) => setEditGuilleG(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Alba Macros */}
              <div className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/30 space-y-2">
                <span className="text-xs font-extrabold text-rose-400 block">
                  Macros para Alba
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-400">Kcal</label>
                    <input
                      type="number"
                      value={editAlbaKcal}
                      onChange={(e) => setEditAlbaKcal(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Proteína (g)</label>
                    <input
                      type="number"
                      value={editAlbaP}
                      onChange={(e) => setEditAlbaP(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Hidratos (g)</label>
                    <input
                      type="number"
                      value={editAlbaHC}
                      onChange={(e) => setEditAlbaHC(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Grasas (g)</label>
                    <input
                      type="number"
                      value={editAlbaG}
                      onChange={(e) => setEditAlbaG(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                Notas de porciones o preparación:
              </label>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Ej: 200g solomillo + ensalada de canónigos (sin tomate crudo)"
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={saveAsCatalogRecipe}
                onChange={(e) => setSaveAsCatalogRecipe(e.target.checked)}
                className="rounded"
              />
              <span>Guardar también en el Catálogo de Platos AGfit para reutilizar otros días</span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-extrabold bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer"
              >
                Guardar Plato y Recalcular Día
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
