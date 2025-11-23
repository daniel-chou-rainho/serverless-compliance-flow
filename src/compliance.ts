interface Transaction {
    sender: string;
    amount: number;
    currency: string;
}

export const handler = async (transaction: Transaction) => {
    const WATCHLIST = ["BadGuy1", "EvilCorp", "DrNo"];
    let status = "APPROVED";

    // 1. Check Watchlist
    if (WATCHLIST.includes(transaction.sender)) {
        status = "BLOCKED";
    }
    // 2. Check Amount Threshold
    else if (transaction.amount > 10000) {
        status = "HIGH_RISK";
    }

    // Return data + decision for the Step Function "Choice" state
    return {
        sender: transaction.sender,
        amount: transaction.amount.toString(),
        currency: transaction.currency,
        status,
        checkedAt: new Date().toISOString()
    };
};