import React, { useRef, useState, useEffect, useCallback } from "react";
import { Eraser, RotateCcw, ShieldCheck, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignaturePadProps {
    onSignatureChange?: (dataUrl: string | null) => void;
    readOnly?: boolean;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSignatureChange, readOnly = false }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const isDrawingRef = useRef(false);
    const historyRef = useRef<ImageData[]>([]);
    const [isEmpty, setIsEmpty] = useState(true);
    const [historyCount, setHistoryCount] = useState(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set canvas resolution
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#0b2a4a";
        ctx.lineWidth = 2.5;

        // Save initial state
        const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        historyRef.current = [initialData];
        setHistoryCount(1);
    }, []);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (readOnly) return;
        isDrawingRef.current = true;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawingRef.current || readOnly) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.stroke();

        setIsEmpty(prev => {
            if (prev) return false;
            return prev;
        });
    };

    const stopDrawing = () => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Save state to history ref for Undo without causing React state bloat
        const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        historyRef.current.push(currentData);
        setHistoryCount(historyRef.current.length);

        if (onSignatureChange) {
            onSignatureChange(canvas.toDataURL("image/png"));
        }
    };

    const handleClear = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const resetData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        historyRef.current = [resetData];
        setHistoryCount(1);
        setIsEmpty(true);
        if (onSignatureChange) onSignatureChange(null);
    }, [onSignatureChange]);

    const handleUndo = useCallback(() => {
        if (historyRef.current.length <= 1) {
            handleClear();
            return;
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        historyRef.current.pop();
        const previousData = historyRef.current[historyRef.current.length - 1];
        ctx.putImageData(previousData, 0, 0);
        setHistoryCount(historyRef.current.length);

        const hasDrawing = historyRef.current.length > 1;
        if (!hasDrawing) setIsEmpty(true);

        if (onSignatureChange) {
            onSignatureChange(hasDrawing ? canvas.toDataURL("image/png") : null);
        }
    }, [handleClear, onSignatureChange]);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <PenTool className="h-3.5 w-3.5 text-blue-600" />
                    Electronic Signature
                </label>
                {!readOnly && (
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleUndo}
                            disabled={historyCount <= 1}
                            className="h-7 text-xs px-2 text-gray-600 hover:text-gray-900"
                        >
                            <RotateCcw className="h-3 w-3 mr-1" /> Undo
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleClear}
                            disabled={isEmpty}
                            className="h-7 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            <Eraser className="h-3 w-3 mr-1" /> Clear
                        </Button>
                    </div>
                )}
            </div>

            <div className="relative border-2 border-dashed border-gray-300 rounded-2xl bg-slate-50/50 overflow-hidden group hover:border-blue-400 transition-colors">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-36 cursor-crosshair touch-none"
                />

                {isEmpty && !readOnly && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 text-sm font-medium">
                        Sign here using mouse or touch screen
                    </div>
                )}

                <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-200/60 pt-1">
                    <span>X ____________________________</span>
                    <span className="flex items-center gap-1 font-semibold text-blue-600/70">
                        <ShieldCheck className="h-3 w-3" /> UETA / E-SIGN Touch Canvas
                    </span>
                </div>
            </div>

            <p className="text-[10px] text-gray-400 italic">
                ℹ️ Signature Pad UI in Interactive Preparation Mode (Database persistence activated in Phase 10.7B).
            </p>
        </div>
    );
};

export default SignaturePad;

