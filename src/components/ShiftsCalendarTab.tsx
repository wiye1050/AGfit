import React, { useMemo, useState } from 'react';
import {
  AlbaShift,
  DayId,
  DayPlan,
  GuilleShift,
  Recipe,
  ShiftCalendarMap,
} from '../types';
import {
  DAY_IDS_ORDERED,
  formatDateISO,
  generateAdaptiveWeekFromShifts,
  getMondayOfWeek,
  getWeekDatesFromMonday,
  hasSharedTrainingWindow,
} from '../utils/shiftScheduler';
import { RECIPES } from '../data/recipes';
import { Check, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

interface ShiftsCalendarTabProps {
  days: DayPlan[];
  activeUser: 'guille' | 'alba';
  shiftCalendar: ShiftCalendarMap;
  onUpdateShiftCalendar: (updater: (prev: ShiftCalendarMap) => ShiftCalendarMap) => void;
  onReplaceDays: (nextDays: DayPlan[]) => void;
  onSelectDayAndGoToHoy: (dayId: DayId) => void;
  customRecipes: Recipe[];
}

const GUILLE_BRUSHES: Array<{
  id: GuilleShift;
  short: string;
  label: string;
  badgeClass: string;
}> = [
  {
    id: 'manana',
    short: 'M',
    label: 'Mañana',
    badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  },
  {
    id: 'tarde',
    short: 'T',
    label: 'Tarde',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  {
    id: 'manana_tarde',
    short: 'P',
    label: 'Partido (M+T)',
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  },
  {
    id: 'libre',
    short: 'L',
    label: 'Libre',
    badgeClass: 'bg-[#30D158]/15 text-[#30D158] border-[#30D158]/30',
  },
];

const ALBA_BRUSHES: Array<{
  id: AlbaShift;
  short: string;
  label: string;
  badgeClass: string;
}> = [
  {
    id: 'manana',
    short: 'M',
    label: 'Mañana (08–15h)',
    badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  },
  {
    id: 'tarde',
    short: 'T',
    label: 'Tarde (15–22h)',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  {
    id: 'noche',
    short: 'N',
    label: 'Noche HUCA (22–08h)',
    badgeClass: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
  },
  {
    id: 'saliente',
    short: 'S',
    label: 'Saliente guardia',
    badgeClass: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
  },
  {
    id: 'libre',
    short: 'L',
    label: 'Libre',
    badgeClass: 'bg-[#30D158]/15 text-[#30D158] border-[#30D158]/30',
  },
];

const GUILLE_SHORT: Record<GuilleShift, { code: string; cls: string }> = {
  manana: { code: 'M', cls: 'bg-sky-500/15 text-sky-400' },
  tarde: { code: 'T', cls: 'bg-amber-500/15 text-amber-400' },
  manana_tarde: { code: 'P', cls: 'bg-rose-500/15 text-rose-400' },
  libre: { code: 'L', cls: 'bg-[#30D158]/15 text-[#30D158]' },
};

const ALBA_SHORT: Record<AlbaShift, { code: string; cls: string }> = {
  manana: { code: 'M', cls: 'bg-sky-500/15 text-sky-400' },
  tarde: { code: 'T', cls: 'bg-amber-500/15 text-amber-400' },
  noche: { code: 'N', cls: 'bg-violet-500/20 text-violet-300' },
  saliente: { code: 'S', cls: 'bg-zinc-500/20 text-zinc-300' },
  libre: { code: 'L', cls: 'bg-[#30D158]/15 text-[#30D158]' },
};

export const ShiftsCalendarTab: React.FC<ShiftsCalendarTabProps> = ({
  days,
  activeUser,
  shiftCalendar,
  onUpdateShiftCalendar,
  onReplaceDays,
  onSelectDayAndGoToHoy,
  customRecipes,
}) => {
  const [paintTarget, setPaintTarget] = useState<'alba' | 'guille'>(activeUser);
  const [albaBrush, setAlbaBrush] = useState<AlbaShift>('manana');
  const [guilleBrush, setGuilleBrush] = useState<GuilleShift>('manana_tarde');
  const [rotationCount, setRotationCount] = useState(1);
  const [justAdaptedBanner, setJustAdaptedBanner] = useState<string | null>(null);

  const todayIso = formatDateISO(new Date());
  const [selectedMonday, setSelectedMonday] = useState<Date>(() =>
    getMondayOfWeek(new Date())
  );
  const [viewMonthDate, setViewMonthDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(12, 0, 0, 0);
    return d;
  });

  const activeWeekDates = useMemo(
    () => getWeekDatesFromMonday(selectedMonday),
    [selectedMonday]
  );
  const activeWeekIsoSet = useMemo(
    () => new Set(activeWeekDates.map((w) => w.isoDate)),
    [activeWeekDates]
  );

  // Build month grid (Monday-first, 6 rows max)
  const monthCells = useMemo(() => {
    const year = viewMonthDate.getFullYear();
    const month = viewMonthDate.getMonth();
    const firstDay = new Date(year, month, 1, 12, 0, 0);
    const startMonday = getMondayOfWeek(firstDay);

    const cells: Array<{
      isoDate: string;
      dateObj: Date;
      dayNumber: number;
      inCurrentMonth: boolean;
      weekdayIndex: number; // 0 = lunes .. 6 = domingo
      dayId: DayId;
    }> = [];

    for (let i = 0; i < 42; i++) {
      const d = new Date(startMonday);
      d.setDate(startMonday.getDate() + i);
      const weekdayIndex = i % 7;
      cells.push({
        isoDate: formatDateISO(d),
        dateObj: d,
        dayNumber: d.getDate(),
        inCurrentMonth: d.getMonth() === month,
        weekdayIndex,
        dayId: DAY_IDS_ORDERED[weekdayIndex],
      });
    }
    return cells;
  }, [viewMonthDate]);

  const getShiftsForCell = (isoDate: string, dayId: DayId) => {
    const fromCalendar = shiftCalendar[isoDate];
    if (fromCalendar) return fromCalendar;
    const fallbackDay = days.find((d) => d.day === dayId) || days[0];
    return {
      guilleShift: fallbackDay.guilleShift,
      albaShift: fallbackDay.albaShift,
    };
  };

  const handleCellClick = (isoDate: string, dateObj: Date, dayId: DayId) => {
    const cellMonday = getMondayOfWeek(dateObj);
    const clickedWeekDates = getWeekDatesFromMonday(cellMonday);
    const isSameActiveWeek = formatDateISO(cellMonday) === formatDateISO(selectedMonday);

    if (!isSameActiveWeek) {
      setSelectedMonday(cellMonday);
    }

    const currentEntry = getShiftsForCell(isoDate, dayId);
    const nextGuilleShift =
      paintTarget === 'guille' ? guilleBrush : currentEntry.guilleShift;
    const nextAlbaShift =
      paintTarget === 'alba' ? albaBrush : currentEntry.albaShift;

    // Calculate next day ISO for automatic HUCA Night -> Saliente rule
    const nextDateObj = new Date(dateObj);
    nextDateObj.setDate(dateObj.getDate() + 1);
    const nextIso = formatDateISO(nextDateObj);
    const nextWeekdayIdx = (DAY_IDS_ORDERED.indexOf(dayId) + 1) % 7;
    const nextDayId = DAY_IDS_ORDERED[nextWeekdayIdx];

    onUpdateShiftCalendar((prev) => {
      const updated: ShiftCalendarMap = {
        ...prev,
        [isoDate]: {
          guilleShift: nextGuilleShift,
          albaShift: nextAlbaShift,
        },
      };

      // Automatic HUCA Guard Inertia: Noche -> Saliente on D+1
      if (paintTarget === 'alba' && nextAlbaShift === 'noche') {
        const existingTomorrow = getShiftsForCell(nextIso, nextDayId);
        if (existingTomorrow.albaShift !== 'noche') {
          updated[nextIso] = {
            guilleShift: existingTomorrow.guilleShift,
            albaShift: 'saliente',
          };
        }
      }
      return updated;
    });

    // Sync the 7 active week days immediately with the painted week
    const syncedDays = days.map((d, idx) => {
      const wkInfo = clickedWeekDates[idx];
      if (wkInfo.isoDate === isoDate) {
        return {
          ...d,
          guilleShift: nextGuilleShift,
          albaShift: nextAlbaShift,
        };
      }
      if (
        paintTarget === 'alba' &&
        nextAlbaShift === 'noche' &&
        wkInfo.isoDate === nextIso &&
        d.albaShift !== 'noche'
      ) {
        return {
          ...d,
          albaShift: 'saliente' as AlbaShift,
        };
      }
      const calEntry = shiftCalendar[wkInfo.isoDate];
      if (calEntry) {
        return {
          ...d,
          guilleShift: calEntry.guilleShift,
          albaShift: calEntry.albaShift,
        };
      }
      return d;
    });

    onReplaceDays(syncedDays);
  };

  const handleAutoAdaptWeek = () => {
    const nextSeed = rotationCount + 1;
    setRotationCount(nextSeed);
    const fullCatalog = [...RECIPES, ...customRecipes];
    const adapted = generateAdaptiveWeekFromShifts(days, fullCatalog, nextSeed);
    onReplaceDays(adapted);
    setJustAdaptedBanner(
      'Semana recalculada según vuestros turnos: entrenos, tuppers HUCA y comidas actualizados.'
    );
    setTimeout(() => setJustAdaptedBanner(null), 4500);
  };

  const monthTitle = viewMonthDate.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  const sharedDaysCount = days.filter(
    (d) => hasSharedTrainingWindow(d.guilleShift, d.albaShift).canTrainTogether
  ).length;
  const nightShiftsCount = days.filter((d) => d.albaShift === 'noche').length;

  return (
    <div className="space-y-4">
      {/* 1. Shift-First Hero & Paint Palette */}
      <div className="apple-card rounded-3xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#30D158] block mb-1">
              Base del sistema
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Calendario de Turnos
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Elige un turno abajo y toca los días en el calendario para pintarlos.
            </p>
          </div>

          {/* Target User Toggle */}
          <div className="apple-pill-surface p-1 rounded-full inline-flex text-xs shrink-0">
            <button
              type="button"
              onClick={() => setPaintTarget('alba')}
              className={`px-3 py-1.5 rounded-full font-bold cursor-pointer transition-colors ${
                paintTarget === 'alba'
                  ? 'bg-[#30D158] text-black'
                  : 'text-slate-500 dark:text-zinc-400'
              }`}
            >
              Alba HUCA
            </button>
            <button
              type="button"
              onClick={() => setPaintTarget('guille')}
              className={`px-3 py-1.5 rounded-full font-bold cursor-pointer transition-colors ${
                paintTarget === 'guille'
                  ? 'bg-[#30D158] text-black'
                  : 'text-slate-500 dark:text-zinc-400'
              }`}
            >
              Guille
            </button>
          </div>
        </div>

        {/* Brush Selector */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
            Pincel activo ({paintTarget === 'alba' ? 'Turnos Alba HUCA' : 'Turnos Guille'}):
          </span>

          {paintTarget === 'alba' ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {ALBA_BRUSHES.map((b) => {
                const active = albaBrush === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setAlbaBrush(b.id)}
                    className={`px-3 py-2 rounded-2xl text-xs font-bold border text-left flex items-center justify-between gap-1.5 cursor-pointer transition-all ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-black border-transparent shadow-sm scale-[1.01]'
                        : 'bg-black/[0.03] dark:bg-white/[0.04] border-black/5 dark:border-white/10 text-slate-600 dark:text-zinc-300'
                    }`}
                  >
                    <span className="truncate">{b.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${
                        active ? 'bg-[#30D158] text-black' : b.badgeClass
                      }`}
                    >
                      {b.short}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {GUILLE_BRUSHES.map((b) => {
                const active = guilleBrush === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setGuilleBrush(b.id)}
                    className={`px-3 py-2 rounded-2xl text-xs font-bold border text-left flex items-center justify-between gap-1.5 cursor-pointer transition-all ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-black border-transparent shadow-sm scale-[1.01]'
                        : 'bg-black/[0.03] dark:bg-white/[0.04] border-black/5 dark:border-white/10 text-slate-600 dark:text-zinc-300'
                    }`}
                  >
                    <span className="truncate">{b.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${
                        active ? 'bg-[#30D158] text-black' : b.badgeClass
                      }`}
                    >
                      {b.short}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. Interactive Monthly Calendar Grid */}
      <div className="apple-card rounded-3xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold capitalize text-slate-900 dark:text-white">
            {monthTitle}
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setViewMonthDate(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1, 12)
                )
              }
              className="w-8 h-8 rounded-full apple-pill-surface flex items-center justify-center text-slate-500 dark:text-zinc-300 cursor-pointer"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setViewMonthDate(new Date(now.getFullYear(), now.getMonth(), 1, 12));
                setSelectedMonday(getMondayOfWeek(now));
              }}
              className="px-3 py-1 rounded-full apple-pill-surface text-[11px] font-bold text-slate-600 dark:text-zinc-300 cursor-pointer"
            >
              Semana actual
            </button>
            <button
              type="button"
              onClick={() =>
                setViewMonthDate(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1, 12)
                )
              }
              className="w-8 h-8 rounded-full apple-pill-surface flex items-center justify-center text-slate-500 dark:text-zinc-300 cursor-pointer"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 pt-1">
          <span>L</span>
          <span>M</span>
          <span>X</span>
          <span>J</span>
          <span>V</span>
          <span>S</span>
          <span>D</span>
        </div>

        {/* 42-Cell Calendar */}
        <div className="grid grid-cols-7 gap-1.5">
          {monthCells.map((cell) => {
            const shifts = getShiftsForCell(cell.isoDate, cell.dayId);
            const isInActiveWeek = activeWeekIsoSet.has(cell.isoDate);
            const isToday = cell.isoDate === todayIso;
            const shared = hasSharedTrainingWindow(
              shifts.guilleShift,
              shifts.albaShift
            );
            const gBadge = GUILLE_SHORT[shifts.guilleShift];
            const aBadge = ALBA_SHORT[shifts.albaShift];

            return (
              <button
                key={cell.isoDate}
                type="button"
                onClick={() =>
                  handleCellClick(cell.isoDate, cell.dateObj, cell.dayId)
                }
                className={`p-1.5 sm:p-2 rounded-2xl border text-left flex flex-col justify-between min-h-[64px] transition-all cursor-pointer ${
                  isInActiveWeek
                    ? 'bg-white/[0.07] border-[#30D158]/50 shadow-sm'
                    : cell.inCurrentMonth
                    ? 'bg-black/[0.02] dark:bg-white/[0.025] border-black/5 dark:border-white/5 hover:border-white/20'
                    : 'opacity-35 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-extrabold ${
                      isToday
                        ? 'text-[#30D158]'
                        : 'text-slate-800 dark:text-zinc-200'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>
                  {shared.canTrainTogether && (
                    <span
                      title={shared.windowLabel}
                      className="w-1.5 h-1.5 rounded-full bg-[#30D158]"
                    />
                  )}
                </div>

                <div className="space-y-1 w-full mt-1">
                  <div
                    className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold flex items-center justify-between ${aBadge.cls}`}
                  >
                    <span className="opacity-70">A</span>
                    <span>{aBadge.code}</span>
                  </div>
                  <div
                    className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold flex items-center justify-between ${gBadge.cls}`}
                  >
                    <span className="opacity-70">G</span>
                    <span>{gBadge.code}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400 dark:text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#30D158]" />
              Hueco juntos ({sharedDaysCount} días esta semana)
            </span>
            {nightShiftsCount > 0 && (
              <span>· {nightShiftsCount} guardia(s) Noche HUCA</span>
            )}
          </div>
          <span>Recuadro verde = Semana activa</span>
        </div>
      </div>

      {/* 3. Smart Shift-First Auto-Adaptation Card */}
      <div className="apple-card rounded-3xl p-5 space-y-4 ring-1 ring-[#30D158]/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#30D158] block">
              Motor adaptativo en vivo
            </span>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Planificación automática según vuestros turnos
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Cruza vuestros turnos de la semana activa para colocar el Pádel en días compatibles, proteger los salientes de Alba y rotar el menú entre +34 recetas.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAutoAdaptWeek}
            className="px-4 py-3 rounded-2xl bg-[#30D158] text-black font-extrabold text-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer hover:opacity-95 active:scale-[0.99] transition-all shadow-lg shadow-[#30D158]/15"
          >
            <RefreshCw className="w-4 h-4 stroke-[2.5]" />
            <span>Adaptar Semana y Rotar Menú</span>
          </button>
        </div>

        {justAdaptedBanner && (
          <div className="p-3 rounded-2xl bg-[#30D158]/15 border border-[#30D158]/30 flex items-center gap-2 text-xs font-bold text-[#30D158]">
            <Check className="w-4 h-4 shrink-0" />
            <span>{justAdaptedBanner}</span>
          </div>
        )}

        {/* Active Week 7-Day Breakdown */}
        <div className="divide-y divide-black/5 dark:divide-white/5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 overflow-hidden">
          {days.map((d, idx) => {
            const wkDate = activeWeekDates[idx];
            const shared = hasSharedTrainingWindow(d.guilleShift, d.albaShift);
            const aBadge = ALBA_SHORT[d.albaShift];
            const gBadge = GUILLE_SHORT[d.guilleShift];

            return (
              <div
                key={d.day}
                onClick={() => onSelectDayAndGoToHoy(d.day)}
                className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs cursor-pointer hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-14 font-extrabold text-slate-900 dark:text-white shrink-0">
                    {d.label.slice(0, 3)} {wkDate?.dayNumber}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${aBadge.cls}`}
                  >
                    Alba: {aBadge.code}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${gBadge.cls}`}
                  >
                    Guille: {gBadge.code}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-[11px]">
                  <span
                    className={`font-semibold hidden sm:inline ${
                      shared.canTrainTogether
                        ? 'text-[#30D158]'
                        : 'text-slate-400 dark:text-zinc-500'
                    }`}
                  >
                    {shared.windowLabel}
                  </span>
                  <span className="font-bold text-slate-600 dark:text-zinc-300">
                    Ver día →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
