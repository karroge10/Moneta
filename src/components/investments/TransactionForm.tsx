'use client';

import { useState, useRef, useEffect, CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Minus, NavArrowDown } from 'iconoir-react';
import { CalendarPanel } from '@/components/transactions/shared/CalendarPanel';
import { formatDateForDisplay } from '@/lib/dateFormatting';
import Spinner from '@/components/ui/Spinner';

interface TransactionFormProps {
    transaction?: any;
    assetTicker: string;
    assetName: string;
    onSave: (data: any) => void;
    onCancel: () => void;
    isSaving?: boolean;
    currencySymbol?: string;
}

export default function TransactionForm({
    transaction,
    assetTicker,
    assetName,
    onSave,
    onCancel,
    isSaving = false,
    currencySymbol = '$'
}: TransactionFormProps) {
    const [type, setType] = useState<'buy' | 'sell'>(transaction?.investmentType || 'buy');
    const [quantity, setQuantity] = useState(transaction?.quantity?.toString() || '');
    const [pricePerUnit, setPricePerUnit] = useState(transaction?.pricePerUnit?.toString() || '');
    const [date, setDate] = useState(transaction?.date ? new Date(transaction.date) : new Date());
    const [notes, setNotes] = useState(transaction?.description || ''); // Description used as notes/details

    const [isDateOpen, setIsDateOpen] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(new Date());

    const dateTriggerRef = useRef<HTMLButtonElement>(null);
    const datePortalRef = useRef<HTMLDivElement>(null);
    const dateDropdownRef = useRef<HTMLDivElement>(null);
    const [dateDropdownStyle, setDateDropdownStyle] = useState<CSSProperties | null>(null);

    useEffect(() => {
        if (isDateOpen && dateTriggerRef.current) {
            const rect = dateTriggerRef.current.getBoundingClientRect();
            setDateDropdownStyle({
                position: 'fixed',
                top: rect.bottom + 8,
                left: rect.left,
                zIndex: 1000,
            });
        }
    }, [isDateOpen]);

    // Click outside handling for date picker
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (isDateOpen &&
                dateDropdownRef.current &&
                !dateDropdownRef.current.contains(target) &&
                (!datePortalRef.current || !datePortalRef.current.contains(target))) {
                setIsDateOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDateOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            id: transaction?.id,
            investmentType: type,
            quantity: Number(quantity),
            pricePerUnit: Number(pricePerUnit),
            date: date.toISOString(),
            description: notes,
        });
    };

    const total = (Number(quantity) || 0) * (Number(pricePerUnit) || 0);

    return (
        <div className="flex flex-col h-full bg-[#282828] p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold">{transaction ? 'Edit Transaction' : 'Add Transaction'}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-body font-medium">{assetName}</span>
                        <span className="text-xs bg-[#3a3a3a] px-2 py-0.5 rounded text-[#E7E4E4]">{assetTicker}</span>
                    </div>
                </div>
            </div>

            {/* Buy / Sell Toggle */}
            <div className="grid grid-cols-2 bg-[#202020] p-1 rounded-xl border border-[#3a3a3a]">
                <button
                    type="button"
                    onClick={() => setType('buy')}
                    className={`py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${type === 'buy' ? 'bg-[#74C648] text-[#202020]' : 'text-helper hover:text-white'
                        }`}
                >
                    <Plus width={16} height={16} strokeWidth={2.5} /> Buy
                </button>
                <button
                    type="button"
                    onClick={() => setType('sell')}
                    className={`py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${type === 'sell' ? 'bg-[#D93F3F] text-white' : 'text-helper hover:text-white'
                        }`}
                >
                    <Minus width={16} height={16} strokeWidth={2.5} /> Sell
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-body font-medium mb-2">Quantity</label>
                    <input
                        type="number"
                        step="any"
                        className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="0.00"
                    />
                </div>
                <div>
                    <label className="block text-body font-medium mb-2">Price per Unit</label>
                    <input
                        type="number"
                        step="any"
                        className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors"
                        value={pricePerUnit}
                        onChange={(e) => setPricePerUnit(e.target.value)}
                        placeholder="0.00"
                    />
                </div>
            </div>

            <div ref={dateDropdownRef}>
                <label className="block text-body font-medium mb-2">Date</label>
                <button
                    type="button"
                    ref={dateTriggerRef}
                    onClick={() => setIsDateOpen(!isDateOpen)}
                    className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] text-left hover:border-[#AC66DA] transition-all flex items-center justify-between cursor-pointer"
                >
                    <span className="text-primary">
                        {formatDateForDisplay(date)}
                    </span>
                    <NavArrowDown className="text-helper" width={16} />
                </button>
                {isDateOpen && typeof document !== 'undefined' && createPortal(
                    <div
                        ref={datePortalRef}
                        className="rounded-2xl shadow-lg border border-[#3a3a3a] overflow-hidden bg-[#202020]"
                        style={dateDropdownStyle ?? { display: 'none' }}
                    >
                        <CalendarPanel
                            selectedDate={date}
                            currentMonth={calendarMonth}
                            onChange={(d) => { setDate(d); setIsDateOpen(false); }}
                            onMonthChange={setCalendarMonth}
                        />
                    </div>,
                    document.body
                )}
            </div>

            <div>
                <label className="block text-body font-medium mb-2">Notes</label>
                <input
                    className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes"
                />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#202020] rounded-xl border border-[#3a3a3a]">
                <span className="text-helper text-xs uppercase">Total {type === 'buy' ? 'Cost' : 'Value'}</span>
                <span className="text-lg font-bold text-primary">
                    {currencySymbol}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#3a3a3a]">
                <button onClick={onCancel} className="px-5 py-2 rounded-xl text-sm font-medium border border-[#3a3a3a] hover:bg-[#323232] cursor-pointer">
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={isSaving || !quantity || !pricePerUnit}
                    className="px-8 py-2 rounded-xl text-sm font-bold bg-[#AC66DA] text-white hover:bg-[#9A4FB8] flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                    {isSaving ? <><Spinner size={16} color="white" /><span>Saving...</span></> : 'Save Transaction'}
                </button>
            </div>
        </div>
    );
}
