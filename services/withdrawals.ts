import { supabase } from "../supabase";

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

export async function requestWithdrawal(
  input: RequestWithdrawalInput
): Promise<RequestWithdrawalResponse> {
  const { data, error } = await supabase.functions.invoke("request-withdrawal", {
    body: input
  });
  
  if (error) {
    throw new Error(error.message || "Erreur lors de la demande de retrait.");
  }
  
  return data as RequestWithdrawalResponse;
}
