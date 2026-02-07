'use client';

import { useState } from 'react';
import { useEvent } from '@/context/EventContext';
import { X, Check } from 'lucide-react';

interface AddExpenseProps {
    onClose: () => void;
}

export default function AddExpense({ onClose }: AddExpenseProps) {
    const { event, addExpense } = useEvent();
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [payerId, setPayerId] = useState(event?.users[0]?.id || '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || !payerId) return;

        await addExpense(description, parseFloat(amount), payerId);
        onClose();
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

                <h2 style={{ marginBottom: '24px' }}>Добавить Расход</h2>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', opacity: 0.7 }}>Описание</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="например, Обед"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', opacity: 0.7 }}>Сумма</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold' }}>$</span>
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

                    <button type="submit" className="btn" style={{ marginTop: '16px', width: '100%' }}>
                        Добавить <Check size={18} style={{ marginLeft: '8px' }} />
                    </button>
                </form>
            </div>
        </div>
    );
}
