import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export type RequestWithdrawalInput = {
  amount: number;
  provider: "yas" | "moov";
  phone: string;
  country?: string;
  clientRequestId: string;
};

export type RequestWithdrawalResponse = {
  withdrawalId: string;
};

/**
 * Erreur dont le `message` est le code renvoyé par la fonction
 * (ex. "insufficient_balance"), pour que `msg.includes(...)` fonctionne dans WalletView.
 * Codes ajoutés côté client : "session_expired", "network_error", "invalid_response".
 */
export class WithdrawalError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.name = 'WithdrawalError';
    this.code = code;
  }
}

/**
 * FunctionsHttpError.message vaut toujours "Edge Function returned a non-2xx status code".
 * Le vrai motif ({ error: "insufficient_balance" }) est dans le corps de la réponse.
 */
async function readFunctionError(error: unknown): Promise<{ status?: number; code: string }> {
  if (error instanceof FunctionsHttpError) {
    const status = error.context?.status as number | undefined;
    try {
      const body = await error.context.json();
      if (typeof body?.error === 'string') return { status, code: body.error };
    } catch {
      // corps non JSON : on retombe sur le statut HTTP
    }
    return { status, code: `http_${status ?? 'error'}` };
  }
  return { code: 'network_error' };
}

export async function requestWithdrawal(
  input: RequestWithdrawalInput
): Promise<RequestWithdrawalResponse> {
  // 1. Session valide ? getSession() tente un refresh si le token est expiré.
  //    Si le refresh échoue (400 sur /auth/v1/token), on le sait ICI, avec un message clair,
  //    au lieu d'envoyer la clé anonyme à la fonction et de recevoir un 401 générique.
  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new WithdrawalError('session_expired');
  }

  // 2. Le contrat de la fonction request-withdrawal est : provider / phone (pas operator / recipient_number).
  const { data, error } = await supabase.functions.invoke('request-withdrawal', {
    body: {
      amount: input.amount,
      provider: input.provider,
      phone: input.phone,
      country: input.country ?? 'TG',
      clientRequestId: input.clientRequestId
    }
  });

  if (error) {
    const { status, code } = await readFunctionError(error);
    if (status === 401) throw new WithdrawalError('session_expired');
    throw new WithdrawalError(code);
  }

  if (!data?.withdrawalId) {
    throw new WithdrawalError('invalid_response');
  }

  return data as RequestWithdrawalResponse;
}



// import { supabase } from "../supabase";

// export type RequestWithdrawalInput = {
//   amount: number;
//   operator: "yas" | "moov";
//   recipient_number: string;
//   country?: string;
//   clientRequestId: string;
// };

// export type RequestWithdrawalResponse = {
//   withdrawalId: string;
// };

// export async function requestWithdrawal(
//   input: RequestWithdrawalInput
// ): Promise<RequestWithdrawalResponse> {
//   const { data, error } = await supabase.functions.invoke("request-withdrawal", {
//     body: input
//   });
  
//   if (error) {
//     throw new Error(error.message || "Erreur lors de la demande de retrait.");
//   }
  
//   return data as RequestWithdrawalResponse;
// }
