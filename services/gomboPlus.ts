import { supabase } from "../supabase";

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

export type GomboTransactionStatusResponse = {
  reference?: string;
  status?: string;
  message?: string;
  [k: string]: unknown;
};

export async function gomboCreateMobileDeposit(input: {
  campaignId: string;
  amount: number;
  recipient_number: string;
  country: string;
  operator: string;
}): Promise<GomboDepositResponse> {
  const { data, error } = await supabase.functions.invoke("gombo-create-mobile-deposit", { body: input });
  if (error) throw new Error(error.message || "Failed to create mobile deposit");
  return data as GomboDepositResponse;
}

export async function gomboCheckTransactionStatus(input: {
  transaction_reference: string;
}): Promise<GomboTransactionStatusResponse> {
  const { data, error } = await supabase.functions.invoke("gombo-check-transaction-status", { body: input });
  if (error) throw new Error(error.message || "Failed to check transaction status");
  return data as GomboTransactionStatusResponse;
}

// ✅ Validate campaign payment after successful transaction
export async function validateCampaignPayment(input: {
  campaignId: string;
  transactionReference: string;
}): Promise<{ success: boolean; campaignId: string; message: string }> {
  const { data, error } = await supabase.functions.invoke("validate-campaign-payment", { body: input });
  if (error) throw new Error(error.message || "Failed to validate campaign payment");
  return data as { success: boolean; campaignId: string; message: string };
}

export async function gomboAdminApproveWithdrawal(input: {
  withdrawalId: string;
}): Promise<{ success: boolean; reference: string }> {
  const { data, error } = await supabase.functions.invoke("admin-approve-withdrawal", { body: input });
  if (error) throw new Error(error.message || "Failed to approve withdrawal");
  return data as { success: boolean; reference: string };
}

export async function gomboAdminRejectWithdrawal(input: {
  withdrawalId: string;
}): Promise<{ success: boolean }> {
  const { data, error } = await supabase.functions.invoke("admin-reject-withdrawal", { body: input });
  if (error) throw new Error(error.message || "Failed to reject withdrawal");
  return data as { success: boolean };
}
