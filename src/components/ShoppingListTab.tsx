import React, { useState } from 'react';
import {
  CustomShoppingItem,
  DayPlan,
  ShoppingAisle,
} from '../types';
import {
  AISLE_META,
  aggregateWeeklyShoppingList,
} from '../utils/shoppingEngine';
import {
  Check,
  Home,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';

interface ShoppingListTabProps {
  days: DayPlan[];
  pantryCheckedMap: Record<string, boolean>;
  cartCheckedMap: Record<string, boolean>;
  onTogglePantryItem: (id: string) => void;
  onToggleCartItem: (id: string) => void;
  onResetShoppingChecks: () => void;
  customItems: CustomShoppingItem[];
  onAddCustomItem: (item: Omit<CustomShoppingItem, 'id' | 'inPantry' | 'inCart'>) => void;
  onToggleCustomItemPantry: (id: string) => void;
  onToggleCustomItemCart: (id: string) => void;
  onDeleteCustomItem: (id: string) => void;
  onExportSheetsCsv: () => void;
}

const AISLE_ORDER: ShoppingAisle[] = [
  'carniceria',
  'pescaderia',
  'lacteos',
  'fruteria',
  'despensa',
  'hogar',
];

const AISLE_CLEAN_LABELS: Record<ShoppingAisle, string> = {
  carniceria: '🥩 Carnicería',
  pescaderia: '🐟 Pescadería',
  lacteos: '🥛 Lácteos (Leche Sin Lactosa)',
  fruteria: '🥦 Frutería y Verduras',
  despensa: '🍚 Despensa y Café',
  hogar: '🏠 Hogar y Extras',
};

export const ShoppingListTab: React.FC<ShoppingListTabProps> = ({
  days,
  pantryCheckedMap,
  cartCheckedMap,
  onTogglePantryItem,
  onToggleCartItem,
  onResetShoppingChecks,
  customItems,
  onAddCustomItem,
  onToggleCustomItemPantry,
  onToggleCustomItemCart,
  onDeleteCustomItem,
}) => {
  const [filterMode, setFilterMode] = useState<'pendientes' | 'despensa' | 'todos'>('pendientes');
  const [newName, setNewName] = useState('');

  const menuItems = aggregateWeeklyShoppingList(days);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddCustomItem({
      name: newName.trim(),
      quantityText: '1 ud',
      aisle: 'hogar',
    });
    setNewName('');
  };

  const inPantryCount =
    menuItems.filter((i) => pantryCheckedMap[i.id]).length +
    customItems.filter((c) => c.inPantry).length;
  const inCartCount =
    menuItems.filter((i) => cartCheckedMap[i.id]).length +
    customItems.filter((c) => c.inCart).length;
  const pendingCount = Math.max(
    0,
    menuItems.length + customItems.length - inPantryCount - inCartCount
  );

  return (
    <div className="space-y-5">
      {/* Top Header + Segmented View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Lista de la Compra
          </h2>
          <p className="text-xs text-slate-400">
            {pendingCount} pendientes · {inCartCount} en el carro · {inPantryCount} en casa
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="apple-pill-surface p-1 rounded-full inline-flex text-xs">
            <button
              type="button"
              onClick={() => setFilterMode('pendientes')}
              className={`px-3.5 py-1.5 rounded-full font-semibold cursor-pointer ${
                filterMode === 'pendientes'
                  ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Para Comprar ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('despensa')}
              className={`px-3.5 py-1.5 rounded-full font-semibold cursor-pointer ${
                filterMode === 'despensa'
                  ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              En Casa ({inPantryCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('todos')}
              className={`px-3.5 py-1.5 rounded-full font-semibold cursor-pointer ${
                filterMode === 'todos'
                  ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Todos
            </button>
          </div>

          {inCartCount > 0 && (
            <button
              type="button"
              onClick={onResetShoppingChecks}
              className="w-8 h-8 rounded-full apple-pill-surface flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              title="Vaciar carro"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Minimalist iOS Add Reminder Bar */}
      <form onSubmit={handleQuickAdd} className="apple-card rounded-2xl p-2 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#30D158]/15 text-[#30D158] flex items-center justify-center shrink-0 ml-1">
          <Plus className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Añadir artículo a la lista (ej. Cápsulas café, papel cocina...)"
          className="flex-1 bg-transparent text-sm font-medium outline-none px-1"
        />
        {newName.trim() && (
          <button
            type="submit"
            className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#30D158] text-black cursor-pointer mr-1"
          >
            Añadir
          </button>
        )}
      </form>

      {/* iOS Reminders Inset Grouped Lists by Aisle */}
      <div className="space-y-5">
        {AISLE_ORDER.map((aisle) => {
          const aisleMenuItems = menuItems.filter((item) => {
            if (item.aisle !== aisle) return false;
            const inPantry = Boolean(pantryCheckedMap[item.id]);
            const inCart = Boolean(cartCheckedMap[item.id]);
            if (filterMode === 'pendientes') return !inPantry && !inCart;
            if (filterMode === 'despensa') return inPantry;
            return true;
          });

          const aisleCustomItems = customItems.filter((c) => {
            if (c.aisle !== aisle) return false;
            if (filterMode === 'pendientes') return !c.inPantry && !c.inCart;
            if (filterMode === 'despensa') return c.inPantry;
            return true;
          });

          if (aisleMenuItems.length === 0 && aisleCustomItems.length === 0) {
            return null;
          }

          return (
            <div key={aisle} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2">
                {AISLE_CLEAN_LABELS[aisle]}
              </h3>

              <div className="apple-card rounded-3xl divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
                {aisleMenuItems.map((item) => {
                  const inPantry = Boolean(pantryCheckedMap[item.id]);
                  const inCart = Boolean(cartCheckedMap[item.id]);
                  const shortBuyText = item.commercialRecommendation
                    .replace('Comprar ', '')
                    .split('(')[0]
                    .trim();

                  return (
                    <div
                      key={item.id}
                      className="px-4 py-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* iOS Reminder Circle Check (Cart) */}
                        <button
                          type="button"
                          onClick={() => onToggleCartItem(item.id)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                            inCart
                              ? 'bg-[#30D158] text-black'
                              : 'border-2 border-slate-300 dark:border-slate-600 hover:border-[#30D158]'
                          }`}
                        >
                          {inCart && <Check className="w-3.5 h-3.5" />}
                        </button>

                        <div className="min-w-0">
                          <span
                            className={`text-sm font-semibold block truncate ${
                              inCart || inPantry
                                ? 'line-through text-slate-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {item.name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Neto menú: {item.totalNetRaw} {item.unit}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-xs font-bold text-[#30D158]">
                          {shortBuyText}
                        </span>

                        <button
                          type="button"
                          onClick={() => onTogglePantryItem(item.id)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all cursor-pointer ${
                            inPantry
                              ? 'bg-[#FF9F0A] text-black'
                              : 'apple-pill-surface text-slate-400 hover:text-white'
                          }`}
                          title="Ya lo tenemos en casa / despensa"
                        >
                          <Home className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {aisleCustomItems.map((c) => (
                  <div
                    key={c.id}
                    className="px-4 py-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onToggleCustomItemCart(c.id)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 cursor-pointer ${
                          c.inCart
                            ? 'bg-[#30D158] text-black'
                            : 'border-2 border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {c.inCart && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <span
                        className={`text-sm font-semibold truncate ${
                          c.inCart || c.inPantry
                            ? 'line-through text-slate-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {c.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleCustomItemPantry(c.id)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer ${
                          c.inPantry
                            ? 'bg-[#FF9F0A] text-black'
                            : 'apple-pill-surface text-slate-400'
                        }`}
                      >
                        <Home className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCustomItem(c.id)}
                        className="w-8 h-8 rounded-full apple-pill-surface flex items-center justify-center text-slate-400 hover:text-[#FF2D55] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
