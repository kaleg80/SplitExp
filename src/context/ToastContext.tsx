'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface ToastContextType {
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        const id = crypto.randomUUID();
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto dismiss
        setTimeout(() => {
            removeToast(id);
        }, 3000);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div style={{
                position: 'fixed',
                top: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                pointerEvents: 'none', // Allow clicking through empty space
                width: '90%',
                maxWidth: '400px'
            }}>
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className="animate-in"
                        style={{
                            background: 'rgba(20, 20, 30, 0.9)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            color: 'white',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            pointerEvents: 'auto',
                            borderLeft: toast.type === 'success' ? '4px solid var(--success)' :
                                toast.type === 'error' ? '4px solid var(--error)' : '4px solid var(--primary)'
                        }}
                    >
                        {toast.type === 'success' && <CheckCircle size={20} color="var(--success)" />}
                        {toast.type === 'error' && <AlertCircle size={20} color="var(--error)" />}
                        <span style={{ fontSize: '0.9rem', flex: 1 }}>{toast.message}</span>
                        <button
                            onClick={() => removeToast(toast.id)}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px' }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
