'use client';

import { useState, useMemo, memo, useCallback } from 'react';
import { useEvent } from '@/context/EventContext';
import { useToast } from '@/context/ToastContext';
import { calculateBalances, simplifyDebts } from '@/utils/calculations';
import { Plus, Users, Receipt, LogOut, ArrowRight, Share2, Loader2, Edit2, Paperclip, Trash2, X, Save, CheckCircle2, RefreshCw } from 'lucide-react';
import AddExpense from './AddExpense';
import { Expense, User } from '@/types';

// Memoized Expense Item Component
const ExpenseItem = memo(({ expense, currencySymbol, getUserName, onEdit }: {
    expense: Expense;
    currencySymbol: string;
    getUserName: (id: string) => string;
    onEdit: (expense: Expense) => void;
}) => (
    <div
        className="card"
        style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => onEdit(expense)}
    >
        <div>
            <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                {expense.description}
                {expense.receipt_url && (
                    <a
                        href={expense.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: 'flex', alignItems: 'center', padding: '4px', background: 'var(--surface-hover)', borderRadius: '50%' }}
                        title="Посмотреть чек"
                    >
                        <Paperclip size={14} style={{ opacity: 0.9, color: 'var(--primary)' }} />
                    </a>
                )}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '4px' }}>{getUserName(expense.payer_id)} заплатил {currencySymbol}{expense.amount}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{currencySymbol}{expense.amount}</span>
            <Edit2 size={16} style={{ opacity: 0.5 }} />
        </div>
    </div>
));
ExpenseItem.displayName = 'ExpenseItem';


// Debt Item Component with Settle Feature
const DebtItem = memo(({ debt, currencySymbol, getUserName, onSettle }: {
    debt: any;
    currencySymbol: string;
    getUserName: (id: string) => string;
    onSettle: (fromId: string, toId: string, amount: number) => Promise<void>;
}) => {
    const [amount, setAmount] = useState('');
    const [isPaying, setIsPaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(amount);
        if (!val || val <= 0) return;

        setIsLoading(true);
        await onSettle(debt.from, debt.to, val);
        setIsLoading(false);
        setIsPaying(false);
        setAmount('');
    };

    return (
        <div className="card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>{currencySymbol}{debt.amount.toFixed(2)}</span>
                    <button
                        className={isPaying ? "btn-secondary" : "btn"}
                        onClick={() => setIsPaying(!isPaying)}
                        style={{
                            padding: '6px 12px',
                            fontSize: '0.85rem',
                            height: 'auto',
                            background: isPaying ? undefined : 'var(--success, #10b981)',
                            color: isPaying ? undefined : 'white',
                            border: isPaying ? undefined : 'none'
                        }}
                    >
                        {isPaying ? 'Отмена' : 'Оплатить'}
                    </button>
                </div>
            </div>

            {isPaying && (
                <form onSubmit={handlePay} className="animate-in" style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>Сумма:</span>
                    <input
                        type="number"
                        className="input"
                        style={{ width: '80px', padding: '4px 8px', height: '32px' }}
                        value={amount}
                        placeholder={debt.amount.toFixed(0)}
                        onChange={e => setAmount(e.target.value)}
                        step="0.01"
                        autoFocus
                    />
                    <button type="submit" className="btn" style={{ padding: '4px 12px', height: '32px' }} disabled={isLoading}>
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    </button>
                </form>
            )}
        </div>
    );
});
DebtItem.displayName = 'DebtItem';


interface EditUserModalProps {
    user: User;
    onClose: () => void;
    onUpdate: (id: string, name: string) => Promise<void>;
    onDelete: (id: string) => Promise<boolean>;
}

const EditUserModal = ({ user, onClose, onUpdate, onDelete }: EditUserModalProps) => {
    const [name, setName] = useState(user.name);
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() !== user.name) {
            setIsLoading(true);
            await onUpdate(user.id, name.trim());
            setIsLoading(false);
        }
        onClose();
    };

    const handleDelete = async () => {
        setIsLoading(true);
        const success = await onDelete(user.id);
        setIsLoading(false);
        if (success) onClose();
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div className="card animate-in" style={{ width: '90%', maxWidth: '400px', padding: '24px', position: 'relative' }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>

                <h3 style={{ marginBottom: '16px' }}>Редактировать участника</h3>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <input
                        className="input"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Имя"
                        autoFocus
                    />

                    <button type="submit" className="btn" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : <>Сохранить <Save size={18} style={{ marginLeft: '8px' }} /></>}
                    </button>

                    <button
                        type="button"
                        className="btn"
                        style={{ background: 'rgba(255, 50, 50, 0.1)', color: 'var(--error)', border: '1px solid var(--error)' }}
                        onClick={handleDelete}
                        disabled={isLoading}
                    >
                        Удалить <Trash2 size={18} style={{ marginLeft: '8px' }} />
                    </button>
                </form>
            </div>
        </div>
    );
};


export default function Dashboard() {
    const { event, exitEvent, deleteEvent, addUser, updateUser, deleteUser, addExpense, loading, loadEvent } = useEvent();
    const { showToast } = useToast();
    const [newUserName, setNewUserName] = useState('');
    const [showAddUser, setShowAddUser] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

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

    const handleSettleDebt = async (fromId: string, toId: string, amount: number) => {
        const payerName = getUserName(fromId);
        const receiverName = getUserName(toId);

        await addExpense(
            `Возврат долга (${payerName} -> ${receiverName})`,
            amount,
            fromId,
            null, // No receipt
            [toId] // The expense is FOR the person receiving the money (cancels their credit)
        );
        showToast('Оплата записана!', 'success');
    };

    // Optimization: Create a map for O(1) user lookups
    const userMap = useMemo(() => {
        const map = new Map<string, string>();
        event.users.forEach(u => map.set(u.id, u.name));
        return map;
    }, [event.users]);

    const getUserName = useCallback((id: string) => userMap.get(id) || 'Неизвестно', [userMap]);

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
                    <button
                        onClick={() => event && loadEvent(event.id)}
                        className="btn-secondary"
                        style={{ padding: '8px', borderRadius: '50%' }}
                        aria-label="Обновить"
                        disabled={loading}
                    >
                        <RefreshCw size={20} color="var(--primary)" className={loading ? "animate-spin" : ""} />
                    </button>
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
                    <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{currencySymbol}{Number(event.expenses.reduce((acc, curr) => {
                        // Exclude debt payments from total
                        if (curr.description.startsWith('Возврат долга')) return acc;
                        return acc + curr.amount;
                    }, 0)).toFixed(0)}</span>
                    <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Всего трат</span>
                </div>
            </div>

            {/* Main Action Button (Top) */}
            <button
                className="btn"
                style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '24px',
                    boxShadow: '0 4px 20px var(--primary-glow)',
                }}
                onClick={() => setShowAddExpense(true)}
            >
                <Plus size={24} />
                Добавить Расход
            </button>

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
                                onSettle={handleSettleDebt}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Users Section (Moved ABOVE History, making it visible) */}
            <section style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3>Участники</h3>
                    <button
                        className="btn"
                        style={{ padding: '6px 16px', fontSize: '0.9rem', background: 'var(--primary)', color: 'white' }}
                        onClick={() => setShowAddUser(!showAddUser)}
                    >
                        <Plus size={14} style={{ marginRight: '4px' }} /> Добавить
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
                        <div
                            key={user.id}
                            className="card"
                            style={{ padding: '8px 16px', minWidth: 'max-content', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={() => setEditingUser(user)}
                        >
                            {user.name}
                            <Edit2 size={12} style={{ opacity: 0.5 }} />
                        </div>
                    ))}
                    {event.users.length === 0 && <p>Нет участников.</p>}
                </div>
            </section>

            {/* Recent Activity (Bottom) */}
            <section style={{ marginBottom: '24px' }}>
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


            {(showAddExpense || editingExpense) && (
                <AddExpense
                    onClose={() => {
                        setShowAddExpense(false);
                        setEditingExpense(null);
                    }}
                    existingExpense={editingExpense || undefined}
                />
            )}

            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onUpdate={updateUser}
                    onDelete={deleteUser}
                />
            )}
        </div>
    );
}
