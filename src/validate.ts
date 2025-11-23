export const handler = async (event: any) => {
    // 1. Extract the input string
    const rawInput = event.body?.input || event.input;

    if (!rawInput) {
        throw new Error(`Critical: Could not find input field. Received: ${JSON.stringify(event)}`);
    }

    // 2. Parse the stringified JSON into a real object
    const data = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;
    const { sender, amount, currency } = data;

    // 3. Validate
    if (!sender || !amount || !currency) {
        throw new Error("Invalid Payload: Missing sender, amount, or currency.");
    }

    if (typeof amount !== 'number') {
        throw new Error("Invalid Payload: Amount must be a number.");
    }

    // 4. Return clean data
    return { sender, amount, currency };
};