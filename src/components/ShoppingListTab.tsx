import React, { useState } from 'react';
import {
  CustomShoppingItem,
  DayPlan,
  Recipe,
  ShoppingAisle,
} from '../types';
import { aggregateWeeklyShoppingList } from '../utils/shoppingEngine';
import { Check, Plus, RotateCcw, Trash2 } from 'lucide-react';

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
  customRecipes?: Recipe[];
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
  carniceria: 'Carnicería',
  pescaderia: 'Pescadería',
  lacteos: 'Lácteos (Leche sin lactosa)',
  fruteria: 'Frutería y verduras',
  despensa: 'Despensa y café',
  hogar: 'Hogar y extras',
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
  customRecipes = [],
}) => {
  const [filterMode, setFilterMode] = useState<'pendientes' | 'despensa' | 'todos'>('pendientes');
  const [newName, setNewName] = useState('');

  const menuItems = aggregateWeeklyShoppingList(days, customRecipes);

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

  const totalItemsCount = menuItems.length + customItems.length;
  const inPantryCount =
    menuItems.filter((i) => pantryCheckedMap[i.id]).length +
    customItems.filter((c) => c.inPantry).length;
  const inCartCount =
    menuItems.filter((i) => cartCheckedMap[i.id]).length +
    customItems.filter((c) => c.inCart).length;
  const pendingCount = Math.max(0, totalItemsCount - inPantryCount - inCartCount);
  const resolvedCount = Math.min(totalItemsCount, inPantryCount + inCartCount);
  const progressPct = totalItemsCount > 0 ? Math.round((resolvedCount / totalItemsCount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Performance Supermarket Header Card */}
      <div className="apple-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#30D158] block mb-1">
              Supermercado
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Lista de Compra
            </h2>
          </div>

          {inCartCount > 0 && (
            <button
              type="button"
              onClick={onResetShoppingChecks}
              className="px-3 py-1.5 rounded-full apple-pill-surface flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              title="Reiniciar carro"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Vaciar carro ({inCartCount})</span>
            </button>
          )}
        </div>

        {/* Cart & Pantry Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500 dark:text-zinc-400">
              Cubiertos ({inCartCount} en carro · {inPantryCount} en casa)
            </span>
            <span className="font-extrabold text-slate-900 dark:text-white">
              {resolvedCount} / {totalItemsCount} ({progressPct}%)
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#30D158] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Segmented Filter */}
        <div className="apple-pill-surface p-1 rounded-full grid grid-cols-3 text-xs">
          <button
            type="button"
            onClick={() => setFilterMode('pendientes')}
            className={`py-1.5 rounded-full font-bold cursor-pointer transition-colors ${
              filterMode === 'pendientes'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                : 'text-slate-500 dark:text-zinc-400'
            }`}
          >
            Comprar ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('despensa')}
            className={`py-1.5 rounded-full font-bold cursor-pointer transition-colors ${
              filterMode === 'despensa'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                : 'text-slate-500 dark:text-zinc-400'
            }`}
          >
            En casa ({inPantryCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('todos')}
            className={`py-1.5 rounded-full font-bold cursor-pointer transition-colors ${
              filterMode === 'todos'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                : 'text-slate-500 dark:text-zinc-400'
            }`}
          >
            Todos ({totalItemsCount})
          </button>
        </div>
      </div>

      {/* Add Item Bar */}
      <form onSubmit={handleQuickAdd} className="apple-card rounded-2xl p-2 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full apple-pill-surface flex items-center justify-center shrink-0 ml-1 text-slate-400 dark:text-zinc-400">
          <Plus className="w-3.5 h-3.5" />
        </div>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Añadir artículo extra..."
          className="flex-1 bg-transparent text-sm font-medium outline-none px-1"
        />
        {newName.trim() && (
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#30D158] text-black cursor-pointer mr-1"
          >
            Añadir
          </button>
        )}
      </form>

      {/* Lists by Aisle */}
      <div className="space-y-4">
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
            <div key={aisle} className="space-y-1.5">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 px-2">
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
                      onClick={() => onToggleCartItem(item.id)}
                      className="px-4 py-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            inCart
                              ? 'bg-[#30D158] text-black'
                              : 'border border-slate-300 dark:border-white/20'
                          }`}
                        >
                          {inCart && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        <span
                          className={`text-sm font-semibold truncate ${
                            inCart || inPantry
                              ? 'line-through text-slate-400 dark:text-zinc-500'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {item.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-1 rounded-lg bg-[#30D158]/15 text-[#30D158] text-xs font-extrabold">
                          {shortBuyText}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePantryItem(item.id);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                            inPantry
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                              : 'apple-pill-surface text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          En casa
                        </button>
                      </div>
                    </div>
                  );
                })}

                {aisleCustomItems.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onToggleCustomItemCart(c.id)}
                    className="px-4 py-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          c.inCart
                            ? 'bg-[#30D158] text-black'
                            : 'border border-slate-300 dark:border-white/20'
                        }`}
                      >
                        {c.inCart && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span
                        className={`text-sm font-semibold truncate ${
                          c.inCart || c.inPantry
                            ? 'line-through text-slate-400 dark:text-zinc-500'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {c.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCustomItemPantry(c.id);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                          c.inPantry
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                            : 'apple-pill-surface text-slate-400 dark:text-zinc-400'
                        }`}
                      >
                        En casa
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCustomItem(c.id);
                        }}
                        className="w-7 h-7 rounded-lg apple-pill-surface flex items-center justify-center text-slate-400 dark:text-zinc-400 cursor-pointer"
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
