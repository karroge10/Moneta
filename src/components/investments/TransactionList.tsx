'use client';

import { Transaction } from '@prisma/client';
import { formatDateForDisplay } from '@/lib/dateFormatting';
import { EditPencil, Trash } from 'iconoir-react';

interface TransactionListProps {
    transactions: any[]; // Typed as any to allow Prisma includes, or I can define interface
    onEdit: (tx: any) => void;
    onDelete: (tx: any) => void;
    currencySymbol: string;
}

export default function TransactionList({ transactions, onEdit, onDelete, currencySymbol }: TransactionListProps) {
    if (!transactions || transactions.length === 0) {
        return (
            <div className="p-8 text-center text-helper bg-[#202020] rounded-xl border border-[#3a3a3a]">
                No transactions recorded yet.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-[#3a3a3a]">
            <table className="w-full text-left bg-[#202020]">
                <thead className="bg-[#282828] text-helper text-xs uppercase tracking-wider">
                    <tr>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium text-right">Quantity</th>
                        <th className="px-4 py-3 font-medium text-right">Price</th>
                        <th className="px-4 py-3 font-medium text-right">Total</th>
                        <th className="px-4 py-3 font-medium w-[80px]"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a2a] text-body text-sm">
                    {transactions.map(tx => {
                        const isBuy = tx.investmentType === 'buy';
                        const total = Number(tx.quantity) * Number(tx.pricePerUnit);

                        return (
                            <tr key={tx.id} className="hover:bg-[#2a2a2a] transition-colors group">
                                <td className="px-4 py-3 whitespace-nowrap">
                                    {formatDateForDisplay(tx.date)}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isBuy ? 'bg-[#74C648]/10 text-[#74C648]' : 'bg-[#D93F3F]/10 text-[#D93F3F]'
                                        }`}>
                                        {isBuy ? 'Buy' : 'Sell'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right font-mono">
                                    {Number(tx.quantity).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right font-mono">
                                    {currencySymbol}{Number(tx.pricePerUnit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-medium">
                                    {currencySymbol}{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-3 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onEdit(tx)} className="p-1.5 hover:bg-[#3a3a3a] rounded-lg text-helper hover:text-white transition-colors">
                                        <EditPencil width={16} height={16} />
                                    </button>
                                    <button onClick={() => onDelete(tx)} className="p-1.5 hover:bg-[#3a3a3a] rounded-lg text-helper hover:text-[#D93F3F] transition-colors">
                                        <Trash width={16} height={16} />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
