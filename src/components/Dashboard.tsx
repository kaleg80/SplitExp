'use client';

import { useState, useMemo, memo } from 'react';
import { useEvent } from '@/context/EventContext';
import { useToast } from '@/context/ToastContext';
import { calculateBalances, simplifyDebts } from '@/utils/calculations';
import { Plus, Users, Receipt, LogOut, ArrowRight, Share2, Loader2, Edit2, Paperclip, Trash2 } from 'lucide-react';
import AddExpense from './AddExpense';
import { Expense } from '@/types';

// Memoized Expense Item Component
const ExpenseItem = memo(({ expense, currencySymbol, getUserName, onEdit }: {
    expense: Expense;
    currencySymbol: string;
    getUserName: (id: string) => string;
    onEdit: (expense: Expense) => void;
}) => (
    <div
        className="card"
        style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => onEdit(expense)}
    >
        <div>
            <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {expense.description}
                {expense.receipt_url && <Paperclip size={14} style={{ opacity: 0.7 }} />}
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{getUserName(expense.payer_id)} заплатил {currencySymbol}{expense.amount}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 'bold' }}>{currencySymbol}{expense.amount}</span>
            <Edit2 size={14} style={{ opacity: 0.5 }} />
        </div>
    </div>
));
ExpenseItem.displayName = 'ExpenseItem';


// Memoized Debt Item Component
const DebtItem = memo(({ debt, currencySymbol, getUserName }: {
    debt: any;
    currencySymbol: string;
    getUserName: (id: string) => string;
}) => (
    <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowRight size={16} />
            </div>
            <span>
                <strong style={{ color: 'var(--foreground)' }}>{getUserName(debt.from)}</strong>
                {' '}должен{' '}
                <strong style={{ color: 'var(--foreground)' }}>{getUserName(debt.to)}</strong>
            </span>
        </div>
        <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>{currencySymbol}{debt.amount.toFixed(2)}</span>
    </div>
));
DebtItem.displayName = 'DebtItem';


export default function Dashboard() {
    const { event, exitEvent, deleteEvent, addUser, loading } = useEvent();
    const { showToast } = useToast();
    const [newUserName, setNewUserName] = useState('');
    const [showAddUser, setShowAddUser] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Memoize calculations to avoid re-rendering issues
    const { balances, debts } = useMemo(() => {
        if (!event) return { balances: new Map(), debts: [] };
        const b = calculateBalances(event.users, event.expenses);
        const d = simplifyDebts(b);
        return { balances: b, debts: d };
    }, [event?.users, event?.expenses]);

    if (!event) return null;

    const currencySymbol = event.currency === 'KZT' ? '₸' :
        event.currency === 'EUR' ? '€' :
            event.currency === 'RUB' ? '₽' : '$';

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newUserName.trim()) {
            await addUser(newUserName.trim());
            setNewUserName('');
            setShowAddUser(false);
        }
    };

    const handleShare = () => {
        const url = `${window.location.origin}?id=${event.id}`;
        navigator.clipboard.writeText(url);
        showToast('Ссылка скопирована!', 'success');
    };

    const handleDeleteEvent = async () => {
        if (confirm('Внимание! Это действие удалит событие и все связанные данные (чек, расходы, участники) навсегда.\n\nВы уверены, что хотите закрыть и удалить это событие?')) {
            setIsDeleting(true);
            try {
                await deleteEvent(event.id);
            } catch (e) {
                console.error(e);
                setIsDeleting(false);
                alert('Не удалось удалить событие.');
            }
        }
    };

    const getUserName = (id: string) => event.users.find(u => u.id === id)?.name || 'Неизвестно';

    if (isDeleting) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px' }}>
                <Loader2 className="animate-spin" size={48} color="var(--primary)" />
                <p>Удаление события и всех данных...</p>
            </div>
        );
    }

    return (
        <div className="animate-in" style={{ paddingBottom: '100px' }}>
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: '16px' }}>
                    <h2 style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.6)' }}>Событие</h2>
                    <h1 style={{ fontSize: '2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.name}</h1>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button onClick={handleShare} className="btn-secondary" style={{ padding: '8px', borderRadius: '50%' }} aria-label="Поделиться">
                        <Share2 size={20} color="var(--primary)" />
                    </button>
                    <button
                        onClick={handleDeleteEvent}
                        className="btn-secondary"
                        style={{ padding: '8px', borderRadius: '50%', background: 'rgba(255, 50, 50, 0.1)' }}
                        aria-label="Удалить событие"
                        title="Закрыть и удалить событие"
                    >
                        <Trash2 size={20} color="var(--error)" />
                    </button>
                    <button onClick={exitEvent} className="btn-secondary" style={{ padding: '8px', borderRadius: '50%' }} aria-label="Выйти">
                        <LogOut size={20} color="var(--foreground)" />
                    </button>
                </div>
            </header>

            {/* Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{event.users.length}</span>
                    <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Участники</span>
                </div>
                <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{currencySymbol}{Number(event.expenses.reduce((acc, curr) => acc + curr.amount, 0)).toFixed(0)}</span>
                    <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Всего трат</span>
                </div>
            </div>

            {/* Users Section */}
            <section style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3>Участники</h3>
                    <button
                        className="btn"
                        style={{ padding: '6px 16px', fontSize: '0.9rem', background: 'var(--primary)', color: 'white' }}
                        onClick={() => setShowAddUser(!showAddUser)}
                    >
                        <Plus size={16} style={{ marginRight: '4px' }} /> Добавить
                    </button>
                </div>

                {showAddUser && (
                    <form onSubmit={handleAddUser} className="animate-in" style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <input
                            className="input"
                            placeholder="Имя"
                            value={newUserName}
                            onChange={e => setNewUserName(e.target.value)}
                            autoFocus
                        />
                        <button type="submit" className="btn">OK</button>
                    </form>
                )}

                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                    {event.users.map(user => (
                        <div key={user.id} className="card" style={{ padding: '8px 16px', minWidth: 'max-content' }}>
                            {user.name}
                        </div>
                    ))}
                    {event.users.length === 0 && <p>Нет участников.</p>}
                </div>
            </section>

            {/* Debts / Settlement */}
            <section style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '12px' }}>Расчеты</h3>
                {debts.length === 0 ? (
                    <div className="card" style={{ padding: '16px', textAlign: 'center', opacity: 0.7 }}>
                        Все рассчитано!
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {debts.map((debt, idx) => (
                            <DebtItem
                                key={idx}
                                debt={debt}
                                currencySymbol={currencySymbol}
                                getUserName={getUserName}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Recent Activity */}
            <section>
                <h3 style={{ marginBottom: '12px' }}>История</h3>
                {event.expenses.length === 0 ? (
                    <p>Нет расходов.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '8px' }}>
                        {event.expenses.map(expense => (
                            <ExpenseItem
                                key={expense.id}
                                expense={expense}
                                currencySymbol={currencySymbol}
                                getUserName={getUserName}
                                onEdit={setEditingExpense}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* FAB for Adding Expense */}
            <button
                className="btn"
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    padding: 0,
                    boxShadow: '0 4px 20px var(--primary-glow)',
                    zIndex: 40
                }}
                onClick={() => setShowAddExpense(true)}
                aria-label="Добавить расход"
            >
                <Plus size={24} />
            </button>

            {(showAddExpense || editingExpense) && (
                <AddExpense
                    onClose={() => {
                        setShowAddExpense(false);
                        setEditingExpense(null);
                    }}
                    existingExpense={editingExpense || undefined}
                />
            )}
        </div>
    );
}
