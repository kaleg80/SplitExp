'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Event, User, Expense } from '../types';
import { supabase } from '@/utils/supabase';
import imageCompression from 'browser-image-compression';

interface RecentEvent {
    id: string;
    name: string;
    lastAccessed: number;
}

interface EventContextType {
    event: Event | null;
    loading: boolean;
    recentEvents: RecentEvent[];
    createEvent: (name: string, currency: string) => Promise<string | null>;
    loadEvent: (id: string) => Promise<void>;
    addUser: (name: string) => Promise<void>;
    addExpense: (description: string, amount: number, payerId: string, receipt?: File) => Promise<void>;
    updateExpense: (id: string, description: string, amount: number, payerId: string, receipt?: File | string) => Promise<void>;
    deleteExpense: (id: string) => Promise<void>;
    deleteEvent: (id: string) => Promise<void>;
    exitEvent: () => void;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: React.ReactNode }) {
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(false);
    const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);

    // Load recent events and active session on mount
    useEffect(() => {
        // Load recent events
        try {
            const savedRecent = localStorage.getItem('splitwise_recent_events');
            if (savedRecent) {
                setRecentEvents(JSON.parse(savedRecent));
            }
        } catch (e) {
            console.error("Failed to load recent events", e);
        }

        // Load active event
        const savedId = localStorage.getItem('splitwise_event_id');
        if (savedId) {
            // We use a separate function or call loadEvent directly if it's stable
            // But loadEvent depends on fetchEventData which is stable
            fetchEventData(savedId).catch(console.error);
        }
    }, []); // Empty dependency array is intended for mount only

    // Persist recent events whenever they change
    useEffect(() => {
        localStorage.setItem('splitwise_recent_events', JSON.stringify(recentEvents));
    }, [recentEvents]);

    const addToRecent = useCallback((id: string, name: string) => {
        setRecentEvents(prev => {
            const filtered = prev.filter(e => e.id !== id);
            return [{ id, name, lastAccessed: Date.now() }, ...filtered].slice(0, 10); // Keep last 10
        });
    }, []);

    const removeFromRecent = useCallback((id: string) => {
        setRecentEvents(prev => prev.filter(e => e.id !== id));
    }, []);

    const fetchEventData = useCallback(async (eventId: string) => {
        try {
            // Only set loading if we don't have data yet (first load)
            // For updates, we want to be silent
            setEvent(prev => {
                if (!prev) setLoading(true); // Only trigger loading UI on first fetch of the session/event switch
                return prev;
            });

            // Fetch Event
            const { data: eventData, error: eventError } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (eventError || !eventData) throw eventError;

            // Fetch Users
            const { data: usersData } = await supabase
                .from('users')
                .select('*')
                .eq('event_id', eventId);

            // Fetch Expenses
            const { data: expensesData } = await supabase
                .from('expenses')
                .select('*')
                .eq('event_id', eventId);

            setEvent(prev => ({
                ...eventData,
                users: usersData || [],
                expenses: expensesData || [],
            }));

            // Add to recent
            addToRecent(eventData.id, eventData.name);

        } catch (e) {
            console.error("Error fetching event:", e);
            // Don't throw, just let UI handle empty/loading state if needed
        } finally {
            setLoading(false);
        }
    }, [addToRecent]);

    // Realtime Subscription
    useEffect(() => {
        if (!event?.id) return;

        const channel = supabase
            .channel('event_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `event_id=eq.${event.id}` }, (payload) => {
                fetchEventData(event.id);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `event_id=eq.${event.id}` }, () => {
                fetchEventData(event.id);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [event?.id, fetchEventData]);


    const createEvent = useCallback(async (name: string, currency: string) => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('events')
                .insert({ name, currency })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                const newEvent: Event = { ...data, users: [], expenses: [] };
                setEvent(newEvent);
                localStorage.setItem('splitwise_event_id', data.id);
                addToRecent(data.id, data.name);
                return data.id;
            }
        } catch (e) {
            console.error("Error creating event:", e);
        } finally {
            setLoading(false);
        }
        return null;
    }, [addToRecent]);

    const loadEvent = useCallback(async (id: string) => {
        localStorage.setItem('splitwise_event_id', id);
        await fetchEventData(id);
    }, [fetchEventData]);

    const addUser = useCallback(async (name: string) => {
        if (!event) return;
        try {
            // Optimistic Update
            const tempUser: User = { id: 'temp-' + Date.now(), event_id: event.id, name };
            setEvent(prev => prev ? { ...prev, users: [...prev.users, tempUser] } : null);

            await supabase.from('users').insert({ event_id: event.id, name });
            // Realtime will fix the ID
        } catch (e) {
            console.error("Error adding user:", e);
        }
    }, [event]);

    const uploadReceipt = useCallback(async (file: File) => {
        try {
            // Compress Image
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true
            };

            let compressedFile = file;
            if (file.type.startsWith('image/')) {
                try {
                    compressedFile = await imageCompression(file, options);
                } catch (compressError) {
                    console.warn("Image compression failed, using original", compressError);
                }
            }

            const fileExt = compressedFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(filePath, compressedFile);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (error) {
            console.error('Error uploading receipt:', error);
            return null;
        }
    }, []);

    const addExpense = useCallback(async (description: string, amount: number, payerId: string, receipt?: File) => {
        if (!event) return;

        // Optimistic UI Update
        const tempId = 'temp-' + Date.now();
        const newExpense: Expense = {
            id: tempId,
            event_id: event.id,
            description,
            amount,
            payer_id: payerId,
            split_type: 'EQUAL',
            receipt_url: receipt ? URL.createObjectURL(receipt) : undefined
        };

        setEvent(prev => prev ? { ...prev, expenses: [newExpense, ...prev.expenses] } : null);

        try {
            let receipt_url = null;
            if (receipt) {
                receipt_url = await uploadReceipt(receipt);
            }

            const { error } = await supabase.from('expenses').insert({
                event_id: event.id,
                payer_id: payerId,
                description,
                amount,
                split_type: 'EQUAL', // Default
                receipt_url
            });

            if (error) throw error;

        } catch (e) {
            console.error("Error adding expense:", e);
            // Rollback
            setEvent(prev => prev ? { ...prev, expenses: prev.expenses.filter(e => e.id !== tempId) } : null);
            alert('Ошибка при добавлении расхода. Попробуйте еще раз.');
        }
    }, [event, uploadReceipt]);

    const updateExpense = useCallback(async (id: string, description: string, amount: number, payerId: string, receipt?: File | string) => {
        if (!event) return;

        // Optimistic Update
        const oldExpenses = event.expenses;

        setEvent(prev => prev ? {
            ...prev,
            expenses: prev.expenses.map(e => e.id === id ? {
                ...e,
                description,
                amount,
                payer_id: payerId,
                receipt_url: receipt instanceof File ? URL.createObjectURL(receipt) : (typeof receipt === 'string' ? receipt : e.receipt_url)
            } : e)
        } : null);

        try {
            let receipt_url = typeof receipt === 'string' ? receipt : null;

            // If receipt is a File object, upload it
            if (receipt instanceof File) {
                receipt_url = await uploadReceipt(receipt);
            }

            // Construct update object
            const updateData: any = {
                description,
                amount,
                payer_id: payerId
            };

            if (receipt_url !== null) {
                updateData.receipt_url = receipt_url;
            }

            const { error } = await supabase.from('expenses').update(updateData).eq('id', id);
            if (error) throw error;

        } catch (e) {
            console.error("Error updating expense:", e);
            // Rollback
            setEvent(prev => prev ? { ...prev, expenses: oldExpenses } : null);
            alert('Ошибка при обновлении. Изменения отменены.');
        }
    }, [event, uploadReceipt]);

    const deleteExpense = useCallback(async (id: string) => {
        if (!event) return;

        // Optimistic
        const oldExpenses = event.expenses;
        setEvent(prev => prev ? { ...prev, expenses: prev.expenses.filter(e => e.id !== id) } : null);

        try {
            await supabase.from('expenses').delete().eq('id', id);
        } catch (e) {
            console.error("Error deleting expense:", e);
            // Rollback
            setEvent(prev => prev ? { ...prev, expenses: oldExpenses } : null);
        }
    }, [event]);

    const exitEvent = useCallback(() => {
        setEvent(null);
        localStorage.removeItem('splitwise_event_id');
    }, []);

    const deleteEvent = useCallback(async (id: string) => {
        try {
            setLoading(true);

            // 1. Cleanup Storage (Best Effort)
            try {
                // Fetch expenses with receipts
                const { data: expenses } = await supabase
                    .from('expenses')
                    .select('receipt_url')
                    .eq('event_id', id)
                    .not('receipt_url', 'is', null);

                if (expenses && expenses.length > 0) {
                    const filesToRemove = expenses
                        .map(e => {
                            const url = e.receipt_url;
                            if (!url) return null;
                            const parts = url.split('/receipts/');
                            return parts.length > 1 ? parts[1] : null;
                        })
                        .filter(path => path !== null) as string[];

                    if (filesToRemove.length > 0) {
                        await supabase.storage.from('receipts').remove(filesToRemove);
                    }
                }
            } catch (storageError) {
                console.warn("Storage cleanup failed (non-fatal):", storageError);
            }

            // 2. Delete Event (Critical)
            const { error } = await supabase.from('events').delete().eq('id', id);

            if (error) throw error;

            // 3. Cleanup Local State
            removeFromRecent(id);
            exitEvent();

        } catch (e) {
            console.error("Error deleting event:", e);
            throw e; // Re-throw so UI knows it failed!
        } finally {
            setLoading(false);
        }
    }, [removeFromRecent, exitEvent]);

    return (
        <EventContext.Provider value={{ event, loading, recentEvents, createEvent, loadEvent, addUser, addExpense, updateExpense, deleteExpense, deleteEvent, exitEvent }}>
            {children}
        </EventContext.Provider>
    );
}

export function useEvent() {
    const context = useContext(EventContext);
    if (context === undefined) {
        throw new Error('useEvent must be used within an EventProvider');
    }
    return context;
}
