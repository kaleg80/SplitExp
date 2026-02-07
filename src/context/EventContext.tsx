'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Event, User, Expense } from '../types';
import { supabase } from '@/utils/supabase';

interface RecentEvent {
    id: string;
    name: string;
    lastAccessed: number;
}

interface EventContextType {
    event: Event | null;
    loading: boolean;
    recentEvents: RecentEvent[];
    createEvent: (name: string) => Promise<string | null>;
    loadEvent: (id: string) => Promise<void>;
    addUser: (name: string) => Promise<void>;
    addExpense: (description: string, amount: number, payerId: string) => Promise<void>;
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
            loadEvent(savedId);
        }
    }, []);

    // Persist recent events whenever they change
    useEffect(() => {
        localStorage.setItem('splitwise_recent_events', JSON.stringify(recentEvents));
    }, [recentEvents]);

    const addToRecent = (id: string, name: string) => {
        setRecentEvents(prev => {
            const filtered = prev.filter(e => e.id !== id);
            return [{ id, name, lastAccessed: Date.now() }, ...filtered].slice(0, 10); // Keep last 10
        });
    };

    const fetchEventData = useCallback(async (eventId: string) => {
        try {
            setLoading(true);
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

            setEvent({
                ...eventData,
                users: usersData || [],
                expenses: expensesData || [],
            });

            // Add to recent
            addToRecent(eventData.id, eventData.name);

        } catch (e) {
            console.error("Error fetching event:", e);
            // If 404/error, maybe warn user or remove from recent?
        } finally {
            setLoading(false);
        }
    }, []);

    // Realtime Subscription
    useEffect(() => {
        if (!event?.id) return;

        const channel = supabase
            .channel('event_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `event_id=eq.${event.id}` }, () => {
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


    const createEvent = async (name: string) => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('events')
                .insert({ name })
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
    };

    const loadEvent = async (id: string) => {
        localStorage.setItem('splitwise_event_id', id);
        await fetchEventData(id);
    };

    const addUser = async (name: string) => {
        if (!event) return;
        try {
            await supabase.from('users').insert({ event_id: event.id, name });
        } catch (e) {
            console.error("Error adding user:", e);
        }
    };

    const addExpense = async (description: string, amount: number, payerId: string) => {
        if (!event) return;
        try {
            await supabase.from('expenses').insert({
                event_id: event.id,
                payer_id: payerId,
                description,
                amount,
                split_type: 'EQUAL' // Default
            });
        } catch (e) {
            console.error("Error adding expense:", e);
        }
    };

    const exitEvent = () => {
        setEvent(null);
        localStorage.removeItem('splitwise_event_id');
    }

    return (
        <EventContext.Provider value={{ event, loading, recentEvents, createEvent, loadEvent, addUser, addExpense, exitEvent }}>
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
