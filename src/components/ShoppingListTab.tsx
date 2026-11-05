import React, { useState } from 'react';
import {
  CustomShoppingItem,
  DayPlan,
  ShoppingAisle,
} from '../types';
import {
  AISLE_META,
  aggregateWeeklyShoppingList,
  QUICK_ADD_SUGGESTIONS,
} from '../utils/shoppingEngine';
import {
  Check,
  Download,
  Home,
  Plus,
  RotateCcw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
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
  onExportSheetsCsv,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAisleFilter, setSelectedAisleFilter] = useState<'all' | ShoppingAisle>('all');
  const [hideCoveredItems, setHideCoveredItems] = useState(false);

  // Add Custom Item Form State
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('1 ud');
  const [newAisle, setNewAisle] = useState<ShoppingAisle>('hogar');

  const aggregatedMenuItems = aggregateWeeklyShoppingList(days);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddCustomItem({
      name: newName.trim(),
      quantityText: newQty.trim() || '1 ud',
      aisle: newAisle,
    });
    setNewName('');
    setNewQty('1 ud');
  };

  // Summary Counters
  const totalItemsCount = aggregatedMenuItems.length + customItems.length;
  const inPantryCount =
    aggregatedMenuItems.filter((i) => pantryCheckedMap[i.id]).length +
    customItems.filter((c) => c.inPantry).length;
  const inCartCount =
    aggregatedMenuItems.filter((i) => cartCheckedMap[i.id]).length +
    customItems.filter((c) => c.inCart).length;
  const pendingToBuyCount = Math.max(0, totalItemsCount - inPantryCount - inCartCount);

  return (
    <div className="space-y-5">
      {/* Top Summary & Controls Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-500" />
              <span>Lista de la Compra Inteligente · Sincronizada con vuestro Menú L-D</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Suma automática de gramos en crudo de Guille + Alba con margen comercial (+12% merma en frescos), leche sin lactosa y 0% tomate crudo/repollo/coliflor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onExportSheetsCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar a Sheets CSV</span>
            </button>
            <button
              type="button"
              onClick={onResetShoppingChecks}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-400 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Nueva Compra (Vaciar Carro)</span>
            </button>
          </div>
        </div>

        {/* Status Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 block">Total Artículos</span>
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {totalItemsCount}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/25">
            <span className="text-[11px] font-bold text-amber-500 block">
              🏠 Ya hay en Casa / Despensa
            </span>
            <span className="text-xl font-black text-amber-400">{inPantryCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/25">
            <span className="text-[11px] font-bold text-emerald-500 block">
              🛒 En el Carro (Comprado)
            </span>
            <span className="text-xl font-black text-emerald-400">{inCartCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/25">
            <span className="text-[11px] font-bold text-rose-400 block">
              Pendientes en el Súper
            </span>
            <span className="text-xl font-black text-rose-400">{pendingToBuyCount}</span>
          </div>
        </div>

        {/* Search & Add Custom Item Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar ingrediente o artículo (ej. pollo, salmón, leche, café...)"
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={hideCoveredItems}
                onChange={(e) => setHideCoveredItems(e.target.checked)}
                className="rounded"
              />
              <span>Ocultar tachados</span>
            </label>
          </div>

          {/* Add Custom Item Form */}
          <form onSubmit={handleAddSubmit} className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="+ Añadir artículo personalizado..."
              className="flex-1 min-w-[160px] px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
            />
            <input
              type="text"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              placeholder="Cant."
              className="w-24 px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
            />
            <select
              value={newAisle}
              onChange={(e) => setNewAisle(e.target.value as ShoppingAisle)}
              className="px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
            >
              <option value="hogar">🏠 Hogar/Otros</option>
              <option value="carniceria">🥩 Carnicería</option>
              <option value="pescaderia">🐟 Pescadería</option>
              <option value="lacteos">🥛 Lácteos</option>
              <option value="fruteria">🥦 Frutería</option>
              <option value="despensa">🍚 Despensa</option>
            </select>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer shrink-0"
            >
              Añadir
            </button>
          </form>
        </div>

        {/* Quick 1-Tap Frequent Items */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">
            +1 Toque Frecuentes:
          </span>
          {QUICK_ADD_SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() =>
                onAddCustomItem({
                  name: s.name,
                  quantityText: s.quantityText,
                  aisle: s.aisle,
                })
              }
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-500/40 whitespace-nowrap cursor-pointer"
            >
              + {s.name}
            </button>
          ))}
        </div>

        {/* Aisle Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
          <button
            type="button"
            onClick={() => setSelectedAisleFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border cursor-pointer ${
              selectedAisleFilter === 'all'
                ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
            }`}
          >
            Todos los Pasillos (6)
          </button>
          {AISLE_ORDER.map((aisle) => (
            <button
              key={aisle}
              type="button"
              onClick={() => setSelectedAisleFilter(aisle)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border whitespace-nowrap cursor-pointer ${
                selectedAisleFilter === aisle
                  ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                  : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              {AISLE_META[aisle].title.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* AISLES GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {AISLE_ORDER.filter(
          (a) => selectedAisleFilter === 'all' || selectedAisleFilter === a
        ).map((aisle) => {
          const meta = AISLE_META[aisle];

          const menuItemsForAisle = aggregatedMenuItems.filter((item) => {
            if (item.aisle !== aisle) return false;
            if (
              searchQuery &&
              !item.name.toLowerCase().includes(searchQuery.toLowerCase())
            ) {
              return false;
            }
            const covered = pantryCheckedMap[item.id] || cartCheckedMap[item.id];
            if (hideCoveredItems && covered) return false;
            return true;
          });

          const customItemsForAisle = customItems.filter((item) => {
            if (item.aisle !== aisle) return false;
            if (
              searchQuery &&
              !item.name.toLowerCase().includes(searchQuery.toLowerCase())
            ) {
              return false;
            }
            const covered = item.inPantry || item.inCart;
            if (hideCoveredItems && covered) return false;
            return true;
          });

          if (menuItemsForAisle.length === 0 && customItemsForAisle.length === 0) {
            return null;
          }

          return (
            <div
              key={aisle}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    {meta.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {meta.subtitle}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${meta.badgeClass}`}
                >
                  {menuItemsForAisle.length + customItemsForAisle.length} items
                </span>
              </div>

              <div className="space-y-2">
                {/* Menu-generated ingredients */}
                {menuItemsForAisle.map((item) => {
                  const inPantry = Boolean(pantryCheckedMap[item.id]);
                  const inCart = Boolean(cartCheckedMap[item.id]);
                  const isDone = inPantry || inCart;

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        inCart
                          ? 'bg-emerald-500/5 border-emerald-500/40 opacity-75'
                          : inPantry
                          ? 'bg-amber-500/5 border-amber-500/40 opacity-75'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs sm:text-sm font-extrabold ${
                              isDone
                                ? 'line-through text-slate-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.isPantryStaple && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400">
                              Básico Despensa
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          🛒 {item.commercialRecommendation}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Suma neta recetas: <strong>{item.totalNetRaw} {item.unit}</strong> (Guille: {item.guilleNetTotal}{item.unit} + Alba: {item.albaNetTotal}{item.unit} · en {item.usedInMealsCount} ingestas)
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onTogglePantryItem(item.id)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold border cursor-pointer transition-all ${
                            inPantry
                              ? 'bg-amber-500 text-slate-950 border-amber-500'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-amber-400'
                          }`}
                          title="Marcar que ya lo tenéis en casa / despensa"
                        >
                          🏠 {inPantry ? 'En Casa' : 'Tengo'}
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleCartItem(item.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border cursor-pointer transition-all ${
                            inCart
                              ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-emerald-400'
                          }`}
                          title="Marcar como metido en el carro del supermercado"
                        >
                          🛒 {inCart ? 'Comprado' : 'Al Carro'}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Custom user-added items */}
                {customItemsForAisle.map((cItem) => {
                  const isDone = cItem.inPantry || cItem.inCart;
                  return (
                    <div
                      key={cItem.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                        cItem.inCart
                          ? 'bg-emerald-500/5 border-emerald-500/40 opacity-75'
                          : cItem.inPantry
                          ? 'bg-amber-500/5 border-amber-500/40 opacity-75'
                          : 'bg-violet-500/5 border-violet-500/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs sm:text-sm font-extrabold ${
                              isDone
                                ? 'line-through text-slate-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {cItem.name}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/20 text-violet-400">
                            {cItem.quantityText}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onToggleCustomItemPantry(cItem.id)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold border cursor-pointer ${
                            cItem.inPantry
                              ? 'bg-amber-500 text-slate-950 border-amber-500'
                              : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          🏠
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleCustomItemCart(cItem.id)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold border cursor-pointer ${
                            cItem.inCart
                              ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          🛒 {cItem.inCart ? 'Listo' : 'Carro'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteCustomItem(cItem.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 cursor-pointer"
                          title="Eliminar artículo personalizado"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
