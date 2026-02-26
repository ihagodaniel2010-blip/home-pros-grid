import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EstimateLineItem } from "@/lib/estimates";

interface EstimateItemsTableProps {
    items: EstimateLineItem[];
    onChange: (items: EstimateLineItem[]) => void;
}

const EstimateItemsTable = ({ items, onChange }: EstimateItemsTableProps) => {
    const addItem = () => {
        const newItem: EstimateLineItem = {
            description: "",
            quantity: 1,
            unit_price: 0,
            total_price: 0
        };
        onChange([...items, newItem]);
    };

    const removeItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        onChange(newItems);
    };

    const updateItem = (index: number, updates: Partial<EstimateLineItem>) => {
        const newItems = items.map((item, i) => {
            if (i === index) {
                const updated = { ...item, ...updates };
                // Recalculate total_price
                if ('quantity' in updates || 'unit_price' in updates) {
                    updated.total_price = (updated.quantity || 0) * (updated.unit_price || 0);
                }
                return updated;
            }
            return item;
        });
        onChange(newItems);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Service Items</h3>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                </Button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
                        <tr>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3 w-24">Qty</th>
                            <th className="px-4 py-3 w-32">Unit Price</th>
                            <th className="px-4 py-3 w-32">Total</th>
                            <th className="px-4 py-3 w-12"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm italic">
                                    No items added yet. Click "Add Item" to start.
                                </td>
                            </tr>
                        ) : (
                            items.map((item, index) => (
                                <tr key={index} className="group">
                                    <td className="px-4 py-3">
                                        <Input
                                            placeholder="e.g. Interior Painting - Living Room"
                                            value={item.description}
                                            onChange={(e) => updateItem(index, { description: e.target.value })}
                                            className="border-none focus-visible:ring-1 shadow-none px-0 h-8"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                                            className="border-none focus-visible:ring-1 shadow-none px-0 h-8 font-medium"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <span className="text-gray-400 text-sm">$</span>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.unit_price}
                                                onChange={(e) => updateItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
                                                className="border-none focus-visible:ring-1 shadow-none px-0 h-8 font-medium"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                        ${item.total_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EstimateItemsTable;
