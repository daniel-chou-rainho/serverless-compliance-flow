export const handler = async (event: any) => {
    // In Step Functions, 'event' is often the payload passed from the previous state
    const { sender, amount, currency } = event;

    if (!sender || !amount || !currency) {
        throw new Error("Invalid Payload: Missing sender, amount, or currency.");
    }

    if (typeof amount !== 'number') {
        throw new Error("Invalid Payload: Amount must be a number.");
    }

    // Pass the valid data to the next step
    return { sender, amount, currency };
};