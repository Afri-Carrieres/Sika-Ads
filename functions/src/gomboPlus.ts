import {defineSecret} from "firebase-functions/params";
import * as crypto from "crypto";

export const GOMBO_PUBLIC_KEY_SECRET = defineSecret("GOMBO_PUBLIC_KEY_SECRET");
export const GOMBO_PRIVATE_KEY_SECRET = defineSecret("GOMBO_PRIVATE_KEY_SECRET");
export const GOMBO_WEBHOOK_SECRET = defineSecret("GOMBO_WEBHOOK_SECRET");

export function verifyWebhookSignature(payload: string, signature: string | undefined): boolean {
    const secret = GOMBO_WEBHOOK_SECRET.value();
    if (!secret || !signature) return false;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

const GOMBO_BASE_URL = "https://api.gomboplus.com/api";

type JsonValue = null | boolean | number | string | JsonValue[] | {[k: string]: JsonValue};

async function gomboFetch<TResponse>(
    path: string,
    {
        method,
        body,
    }: {
        method: "POST";
        body: Record<string, JsonValue>;
    }
): Promise<TResponse> {
    const publicKey = GOMBO_PUBLIC_KEY_SECRET.value();
    const privateKey = GOMBO_PRIVATE_KEY_SECRET.value();

    if (!publicKey) throw new Error("missing_GOMBO_PUBLIC_KEY_SECRET");
    if (!privateKey) throw new Error("missing_GOMBO_PRIVATE_KEY_SECRET");

    const res = await fetch(`${GOMBO_BASE_URL}/${path.replace(/^\//, "")}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            "X-Public-Key": publicKey,
            "X-Private-Key": privateKey,
        },
        body: JSON.stringify(body),
    });

    const text = await res.text();
    let json: unknown = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        // keep raw text
    }

    if (!res.ok) {
        const message = typeof json === "object" && json && "message" in json
            ? String((json as Record<string, unknown>).message)
            : `gombo_http_${res.status}`;
        throw new Error(`${message}:${text || ""}`.slice(0, 2000));
    }

    return json as TResponse;
}

export type GomboDepositResponse = {
    reference?: string;
    status?: string;
    transaction_type?: string;
    amount?: number;
    fees?: number;
    total_amount?: number;
    currency?: string;
    message?: string;
    [k: string]: unknown;
};

export async function createMobileDeposit(params: {
    amount: number;
    recipient_number: string;
    country?: string;
    operator: string;
    transaction_ref: string;
    callback_url?: string;
}): Promise<GomboDepositResponse> {
    const payload = {
        amount: Math.round(params.amount),
        currency: "XOF",
        number: params.recipient_number,
        recipient_number: params.recipient_number,
        operator: params.operator.toLowerCase(),
        country: (params.country || "TG").toUpperCase(),
        transaction_ref: params.transaction_ref,
        ...(params.callback_url ? {callback_url: params.callback_url} : {}),
    };

    console.log("GOMBO_PAYLOAD", JSON.stringify(payload));

    return gomboFetch<GomboDepositResponse>("mobile-services/mobile-deposit/", {
        method: "POST",
        body: payload as Record<string, JsonValue>,
    });
}

export type GomboTransactionStatusResponse = {
    reference?: string;
    status?: string;
    message?: string;
    [k: string]: unknown;
};

export async function checkTransactionStatus(params: {
    transaction_reference: string;
}): Promise<GomboTransactionStatusResponse> {
    return gomboFetch<GomboTransactionStatusResponse>("mobile-services/check-transaction-status/", {
        method: "POST",
        body: params as Record<string, JsonValue>,
    });
}

export type GomboWithdrawalResponse = {
    reference?: string;
    status?: string;
    transaction_type?: string;
    amount?: number;
    fees?: number;
    total_amount?: number;
    currency?: string;
    message?: string;
    [k: string]: unknown;
};

export async function createMobileWithdrawal(params: {
    amount: number;
    recipient_number: string;
    country: string;
    operator: string;
    transaction_ref: string;
    callback_url?: string;
}): Promise<GomboWithdrawalResponse> {
    const payload = {
        amount: Math.round(params.amount),
        currency: "XOF",
        number: params.recipient_number,
        recipient_number: params.recipient_number,
        country: params.country.toUpperCase(),
        operator: params.operator.toLowerCase(),
        transaction_ref: params.transaction_ref,
        ...(params.callback_url ? {callback_url: params.callback_url} : {}),
    };

    console.log("GOMBO_WITHDRAWAL_PAYLOAD", JSON.stringify(payload));

    return gomboFetch<GomboWithdrawalResponse>("mobile-services/mobile-withdrawal/", {
        method: "POST",
        body: payload as Record<string, JsonValue>,
    });
}
