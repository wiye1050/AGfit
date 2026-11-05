import React, { useState } from 'react';
import {
  CustomShoppingItem,
  DayPlan,
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
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
            Comprar ({pendingCount})
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
            En casa ({inPantryCount})
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
            title="Reiniciar carro"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Add Item Bar */}
      <form onSubmit={handleQuickAdd} className="apple-card rounded-2xl p-2 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full apple-pill-surface flex items-center justify-center shrink-0 ml-1 text-slate-400">
          <Plus className="w-3.5 h-3.5" />
        </div>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Añadir artículo..."
          className="flex-1 bg-transparent text-sm font-medium outline-none px-1"
        />
        {newName.trim() && (
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-black cursor-pointer mr-1"
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
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 px-2">
                {AISLE_CLEAN_LABELS[aisle]}
              </h3>

              <div className="apple-card rounded-2xl divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
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
                      className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            inCart
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                              : 'border border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {inCart && <Check className="w-3 h-3" />}
                        </div>

                        <span
                          className={`text-sm font-medium truncate ${
                            inCart || inPantry
                              ? 'line-through text-slate-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {item.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {shortBuyText}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePantryItem(item.id);
                          }}
                          className={`px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                            inPantry
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                              : 'apple-pill-surface text-slate-400'
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
                    className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          c.inCart
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                            : 'border border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {c.inCart && <Check className="w-3 h-3" />}
                      </div>
                      <span
                        className={`text-sm font-medium truncate ${
                          c.inCart || c.inPantry
                            ? 'line-through text-slate-400'
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
                        className={`px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                          c.inPantry
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                            : 'apple-pill-surface text-slate-400'
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
                        className="w-7 h-7 rounded-md apple-pill-surface flex items-center justify-center text-slate-400 cursor-pointer"
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
