export interface User {
    id: string;
    event_id: string;
    name: string;
    created_at?: string;
}

export interface Expense {
    id: string;
    event_id: string;
    description: string;
    amount: number;
    payer_id: string; // Changed from payerId to match DB
    created_at?: string;
    split_type: 'EQUAL';
    receipt_url?: string;
    involved_users?: string[]; // Array of user IDs
}

export interface Event {
    id: string;
    name: string;
    currency: string;
    users: User[];
    expenses: Expense[];
    created_at: string;
}

export interface Debt {
    from: string; // User ID
    to: string; // User ID
    amount: number;
}
