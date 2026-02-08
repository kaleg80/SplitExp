'use client';

import { useState } from 'react';
import { useEvent } from '@/context/EventContext';
import { X, Check, Trash2, Save, Upload, FileText, Loader2 } from 'lucide-react';
import { Expense } from '@/types';

interface AddExpenseProps {
    onClose: () => void;
    existingExpense?: Expense;
}

export default function AddExpense({ onClose, existingExpense }: AddExpenseProps) {
    const { event, addExpense, updateExpense, deleteExpense } = useEvent();
    const [description, setDescription] = useState(existingExpense?.description || '');
    const [amount, setAmount] = useState(existingExpense?.amount.toString() || '');
    const [payerId, setPayerId] = useState(existingExpense?.payer_id || event?.users[0]?.id || '');
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isEditMode = !!existingExpense;
    const currencySymbol = event?.currency === 'KZT' ? '₸' :
        event?.currency === 'EUR' ? '€' :
            event?.currency === 'RUB' ? '₽' : '$';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || !payerId) return;

        setIsSubmitting(true);
        try {
            if (isEditMode && existingExpense) {
                // Pass file only if a new one is selected
                await updateExpense(
                    existingExpense.id,
                    description,
                    parseFloat(amount),
                    payerId,
                    file || existingExpense.receipt_url
                );
            } else {
                await addExpense(description, parseFloat(amount), payerId, file || undefined);
            }
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (isEditMode && existingExpense && confirm('Удалить эту запись?')) {
            await deleteExpense(existingExpense.id);
            onClose();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    if (!event) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }}>
            <div className="card animate-in" style={{
                width: '100%', maxWidth: '600px',
                borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
                padding: '24px', position: 'relative'
            }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ marginBottom: '24px' }}>{isEditMode ? 'Редактировать' : 'Добавить Расход'}</h2>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', opacity: 0.7 }}>Описание</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="например, Обед"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            autoFocus={!isEditMode}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', opacity: 0.7 }}>Сумма</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold' }}>{currencySymbol}</span>
                            <input
                                type="number"
                                className="input"
                                style={{ paddingLeft: '32px' }}
                                placeholder="0.00"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                step="0.01"
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', opacity: 0.7 }}>Кто платил?</label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {event.users.map(user => (
                                <button
                                    key={user.id}
                                    type="button"
                                    className={`btn ${payerId === user.id ? '' : 'btn-secondary'}`}
                                    style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                                    onClick={() => setPayerId(user.id)}
                                >
                                    {user.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', opacity: 0.7 }}>Чек (фото или PDF)</label>

                        <div
                            style={{
                                border: '1px dashed var(--border)',
                                borderRadius: '12px',
                                padding: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                cursor: 'pointer'
                            }}
                            onClick={() => document.getElementById('file-upload')?.click()}
                        >
                            <div style={{ background: 'var(--card-bg)', padding: '8px', borderRadius: '8px' }}>
                                <Upload size={20} />
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
                                {file ? file.name : (existingExpense?.receipt_url ? 'Заменить (текущий чек загружен)' : 'Нажмите, чтобы загрузить')}
                            </div>
                            <input
                                id="file-upload"
                                type="file"
                                accept="image/jpeg,image/png,application/pdf"
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                        </div>
                        {existingExpense?.receipt_url && !file && (
                            <div style={{ marginTop: '8px' }}>
                                <a
                                    href={existingExpense.receipt_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: 'var(--primary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <FileText size={14} /> Открыть текущий чек
                                </a>
                            </div>
                        )}
                    </div>

                    <button type="submit" className="btn" style={{ marginTop: '16px', width: '100%' }} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : (
                            <>
                                {isEditMode ? 'Сохранить' : 'Добавить'}
                                {isEditMode ? <Save size={18} style={{ marginLeft: '8px' }} /> : <Check size={18} style={{ marginLeft: '8px' }} />}
                            </>
                        )}
                    </button>

                    {isEditMode && (
                        <button
                            type="button"
                            className="btn"
                            style={{ background: 'rgba(255, 50, 50, 0.1)', color: 'var(--error)', border: '1px solid var(--error)' }}
                            onClick={handleDelete}
                            disabled={isSubmitting}
                        >
                            Удалить запись <Trash2 size={18} style={{ marginLeft: '8px' }} />
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}
