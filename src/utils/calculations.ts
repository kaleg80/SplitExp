import { User, Expense, Debt } from '../types';

/**
 * Calculates the net balance for each user based on expenses.
 * Positive balance means the user is owed money (creditor).
 * Negative balance means the user owes money (debtor).
 */
export function calculateBalances(users: User[], expenses: Expense[]): Map<string, number> {
    const balances = new Map<string, number>();

    // Initialize balances
    users.forEach(user => balances.set(user.id, 0));

    expenses.forEach(expense => {
        const payerId = expense.payer_id;
        const amount = expense.amount;
        const splitCount = users.length; // Assuming equal split among all users for now

        if (splitCount === 0) return;

        const splitAmount = amount / splitCount;

        // Payer gets credit for the full amount they paid
        // But they are also responsible for their share.
        // Net effect: +Amount - SplitAmount = + (Amount * (n-1)/n)
        // Or simpler: Creditor gets +Amount, everyone (including payer) gets -SplitAmount.

        // Add amount to payer
        balances.set(payerId, (balances.get(payerId) || 0) + amount);

        // Subtract split amount from everyone
        users.forEach(user => {
            balances.set(user.id, (balances.get(user.id) || 0) - splitAmount);
        });
    });

    return balances;
}

/**
 * Simplifies debts to minimize the number of transactions using a greedy approach.
 * Match largest debtor with largest creditor.
 */
export function simplifyDebts(balances: Map<string, number>): Debt[] {
    const debtors: { id: string, amount: number }[] = [];
    const creditors: { id: string, amount: number }[] = [];

    balances.forEach((amount, id) => {
        // Round to 2 decimal places to avoid float issues
        const rounded = Math.round(amount * 100) / 100;
        if (rounded < -0.01) debtors.push({ id, amount: -rounded }); // Store as positive debt
        if (rounded > 0.01) creditors.push({ id, amount: rounded });
    });

    // Sort by amount (descending) to optimize greedy matching
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const debts: Debt[] = [];
    let i = 0; // debtor index
    let j = 0; // creditor index

    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];

        const amount = Math.min(debtor.amount, creditor.amount);

        if (amount > 0) {
            debts.push({
                from: debtor.id,
                to: creditor.id,
                amount: Math.round(amount * 100) / 100,
            });
        }

        // Update remaining amounts
        debtor.amount -= amount;
        creditor.amount -= amount;

        // Move to next if settled (allowing small float error)
        if (debtor.amount < 0.01) i++;
        if (creditor.amount < 0.01) j++;
    }

    return debts;
}
