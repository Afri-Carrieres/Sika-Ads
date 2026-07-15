import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        if (req.method !== "POST") {
            return new Response("Method not allowed", { status: 405 });
        }

        const body = await req.json();
        console.log("📥 GomboPlus Webhook Received:", JSON.stringify(body));

        // Extraction de la référence (gestion des différents formats possibles de Gombo)
        const transactionRef = body.transaction_reference || body.transaction_ref || body.reference;
        const statusMessage = String(body.status_message || body.status || body.message || "").toUpperCase();
        const transactionType = String(body.transaction_type || "").toUpperCase();

        if (!transactionRef) {
            console.warn("⚠️ No reference found in webhook body (test ping)");
            return new Response(JSON.stringify({ success: true, message: "Ping received" }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // ─── RÉCONCILIATION DES RÉFÉRENCES ──────────────────────────────────
        // On nettoie la référence reçue pour enlever les préfixes opérateurs (GOMBOYAS-, GOMBOMOOV-, etc.)
        const cleanRef = transactionRef.replace(/^GOMBO[A-Z]+-/i, "").trim();

        console.log(`🔍 Webhook Logic:`);
        console.log(`   - Brut: ${transactionRef}`);
        console.log(`   - Nettoyé: ${cleanRef}`);
        console.log(`   - Type: ${transactionType}`);
        console.log(`   - Status: ${statusMessage}`);

        // Helpers pour déterminer le succès ou l'échec (logique reprise de ta version Firebase)
        const isSuccess = (msg: string) =>
            ["SUCCESS", "COMPLETED", "COMPLETE", "SUCCESSFUL", "APPROVED", "SUCCES"].some(k => msg.includes(k));
        const isFailure = (msg: string) =>
            ["FAILED", "CANCELLED", "CANCELED", "ECHOUA", "ECHEC"].some(k => msg.includes(k));

        // 1. Traitement pour les Campagnes (CASHIN)
        if (transactionType === "CASHIN" || transactionRef.toUpperCase().includes("CMP-")) {
            if (isSuccess(statusMessage)) {
                console.log(`🔄 Attempting to activate campaign for ref: ${cleanRef}`);

                // On cherche la campagne qui correspond soit à la référence brute, soit à la référence nettoyée
                const { data, error } = await supabase
                    .from("campaigns")
                    .update({
                        paymentStatus: "paid",
                        campaignPaymentStatus: "payment_received",
                        status: "active",
                        paymentConfirmed: true,
                        paymentConfirmedAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    })
                    .or(`paymentReference.eq."${transactionRef}",paymentReference.eq."${cleanRef}"`)
                    .select(); // Crucial pour voir le résultat dans les logs

                if (error) throw error;
                
                if (!data || data.length === 0) {
                    console.warn(`⚠️ Aucune campagne trouvée en base pour la référence: ${transactionRef}. Possible retard d'écriture (Race Condition).`);
                } else {
                    console.log(`✅ Campaign status updated to ACTIVE for ref: ${cleanRef}`, data);
                }
            }
            else if (isFailure(statusMessage)) {
                console.log(`🔄 Attempting to mark campaign as FAILED for ref: ${cleanRef}`);
                console.log(`   - Searching with transactionRef: "${transactionRef}"`);
                console.log(`   - Searching with cleanRef: "${cleanRef}"`);

                const { data, error } = await supabase
                    .from("campaigns")
                    .update({
                        paymentStatus: "failed",
                        campaignPaymentStatus: "payment_failed",
                        paymentConfirmed: false, // Explicitement défini à false en cas d'échec
                        updatedAt: new Date().toISOString(),
                    })
                    .or(`paymentReference.eq."${transactionRef}",paymentReference.eq."${cleanRef}"`)
                    .select();

                if (error) {
                    console.error(`❌ Error updating campaign status to FAILED for ref ${cleanRef}:`, error);
                    throw error; // Re-throw pour s'assurer que le bloc catch externe est atteint
                }
                if (!data || data.length === 0) {
                    console.warn(`⚠️ Aucune campagne trouvée en base pour la référence: ${transactionRef} (ou ${cleanRef}). Impossible de marquer comme FAILED.`);
                } else {
                    console.log(`❌ Campaign payment marked as FAILED for ref: ${cleanRef}`, data);
                }
            }
        }

        // 2. Traitement pour les Retraits (CASHOUT)
        if (transactionType === "CASHOUT" || transactionRef.toUpperCase().includes("WD-") || transactionRef.toUpperCase().includes("WTH-")) {
            const newStatus = isSuccess(statusMessage) ? "completed" : isFailure(statusMessage) ? "failed" : null;

            if (newStatus) {
                const { error } = await supabase
                    .from("withdrawals")
                    .update({
                        status: newStatus,
                        updatedAt: new Date().toISOString(),
                    })
                    .eq("transactionReference", transactionRef);

                if (error) throw error;

                // Si le retrait échoue, il faut recréditer l'utilisateur (logique similaire à Firebase)
                if (newStatus === "failed") {
                    const { data: withdrawal } = await supabase
                        .from("withdrawals")
                        .select("userId, amount")
                        .eq("transactionReference", transactionRef)
                        .single();

                    if (withdrawal) {
                        await supabase.rpc('increment_user_balance', {
                            user_id: withdrawal.userId,
                            amount_to_add: withdrawal.amount
                        });
                        console.log(`💰 Refunded ${withdrawal.amount} to user ${withdrawal.userId} due to failed withdrawal`);
                    }
                }

                console.log(`✅ Withdrawal status updated to ${newStatus} for ref: ${transactionRef}`);
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (err: any) {
        console.error("❌ Webhook Error:", err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});