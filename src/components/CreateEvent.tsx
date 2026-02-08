'use client';

import { useState } from 'react';
import { useEvent } from '@/context/EventContext';
import { ArrowRight, Loader2, Clock, ChevronRight } from 'lucide-react';

const CURRENCIES = [
    { code: 'USD', symbol: '$', label: 'USD ($)' },
    { code: 'EUR', symbol: '€', label: 'EUR (€)' },
    { code: 'RUB', symbol: '₽', label: 'RUB (₽)' },
    { code: 'KZT', symbol: '₸', label: 'KZT (₸)' },
];

export default function CreateEvent() {
    const { createEvent, loadEvent, recentEvents, loading } = useEvent();
    const [name, setName] = useState('');
    const [currency, setCurrency] = useState('USD');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            await createEvent(name.trim(), currency);
        }
    };

    return (
        <div className="animate-in" style={{ marginTop: '15vh' }}>
            <div className="card" style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h1 style={{ marginBottom: '16px' }}>Разделить Расходы</h1>
                <p style={{ marginBottom: '32px' }}>Создайте событие, чтобы начать делить счета с друзьями.</p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <input
                        type="text"
                        className="input"
                        placeholder="Название (например, Поход в горы)"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={loading}
                    />

                    <select
                        className="input"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        disabled={loading}
                        style={{ appearance: 'none', background: 'var(--card-bg)', color: 'white' }}
                    >
                        {CURRENCIES.map(c => (
                            <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                    </select>

                    <button type="submit" className="btn" disabled={!name.trim() || loading}>
                        {loading ? <Loader2 className="animate-spin" /> : <>Начать <ArrowRight size={18} style={{ marginLeft: '8px' }} /></>}
                    </button>
                </form>
            </div>

            {recentEvents.length > 0 && (
                <section className="animate-in" style={{ animationDelay: '0.1s' }}>
                    <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', opacity: 0.8 }}>
                        <Clock size={16} style={{ marginRight: '8px' }} /> Недавние
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {recentEvents.map(event => (
                            <div
                                key={event.id}
                                className="card"
                                style={{
                                    padding: '16px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer'
                                }}
                                onClick={() => loadEvent(event.id)}
                            >
                                <div style={{ fontWeight: '600' }}>{event.name}</div>
                                <div style={{ display: 'flex', alignItems: 'center', opacity: 0.5 }}>
                                    <ChevronRight size={20} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
