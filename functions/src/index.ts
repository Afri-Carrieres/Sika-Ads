import {setGlobalOptions} from "firebase-functions/v2";
import {onDocumentCreated, onDocumentUpdated} from "firebase-functions/v2/firestore";
import {onCall, onRequest, HttpsError} from "firebase-functions/v2/https";
import type {Request} from "firebase-functions/v2/https";
import type {Response} from "express";
import {initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {getAuth} from "firebase-admin/auth";
import * as logger from "firebase-functions/logger";
import * as crypto from "node:crypto";

// ✅ Import email functions (secrets are auto-managed)
import {
    sendAdminNotificationEmail,
    sendCampaignCreatedEmail,
    sendProofRejectedEmail,
    sendProofValidatedEmail,
    sendWelcomeEmail,
    sendWithdrawalRequestEmail,
    sendWithdrawalStatusEmail,
    sendPasswordResetEmail,
    sendPaymentSuccessEmail,
    sendPaymentFailedEmail,
    sendEmailVerificationEmail,
    RESEND_API_KEY_SECRET,
    RESEND_FROM_SECRET,
} from "./emailService";

// ✅ Import gombo functions (secrets are auto-managed)
import {
    checkTransactionStatus,
    createMobileDeposit,
    createMobileWithdrawal,
    GOMBO_PUBLIC_KEY_SECRET,
    GOMBO_PRIVATE_KEY_SECRET,
    GOMBO_WEBHOOK_SECRET,
} from "./gomboPlus";

initializeApp();
const db = getFirestore();

setGlobalOptions({maxInstances: 10});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

// In-memory per-email rate limiter for password reset / email verification (60s window).
const EMAIL_RATE_LIMIT_MS = 60_000;
const lastAuthEmailSentAt: Map<string, number> = new Map();

function isAuthEmailThrottled(email: string): boolean {
    const now = Date.now();
    const last = lastAuthEmailSentAt.get(email) ?? 0;
    if (now - last < EMAIL_RATE_LIMIT_MS) return true;
    lastAuthEmailSentAt.set(email, now);
    return false;
}

// ✅ Secrets must be explicitly listed in the functions options
const commonOptions = {
    region: "us-central1",
    enforceAppCheck: false,
    secrets: [RESEND_API_KEY_SECRET, RESEND_FROM_SECRET],
};

const gomboOptions = {
    region: "us-central1",
    enforceAppCheck: false,
    secrets: [
        RESEND_API_KEY_SECRET,
        RESEND_FROM_SECRET,
        GOMBO_PUBLIC_KEY_SECRET,
        GOMBO_PRIVATE_KEY_SECRET,
        GOMBO_WEBHOOK_SECRET,
    ],
};

export const onUserCreated = onDocumentCreated(
    {document: "users/{userId}", ...commonOptions},
    async (event) => {
        try {
            const user = event.data?.data();
            if (!user?.email || !user?.name) {
                logger.warn("onUserCreated: Missing email or name", {userId: event.params.userId});
                return;
            }
            logger.info("onUserCreated: Sending welcome email", {
                userId: event.params.userId,
                email: "<redacted>",
                name: user.name,
            });
            await sendWelcomeEmail(String(user.email), String(user.name));
        } catch (error) {
            logger.error("onUserCreated: Email send failed", {
                userId: event.params.userId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
);

export const onProofStatusChanged = onDocumentUpdated(
    {document: "users/{userId}/proofs/{proofId}", ...commonOptions},
    async (event) => {
        try {
            const before = event.data?.before.data();
            const after = event.data?.after.data();
            if (!before || !after) return;

            if (before.status === after.status) return;

            const userId = String(event.params.userId || "");
            if (!userId) return;

            const userSnap = await db.doc(`users/${userId}`).get();
            const user = userSnap.data();
            if (!user?.email) {
                logger.warn("onProofStatusChanged: User not found or missing email", {userId});
                return;
            }

            const email = String(user.email);
            const name = String(user.name || "");
            const campaignTitle = String(after.campaignName || after.campaignTitle || "");

            if (after.status === "validated") {
                const views = Number(after.viewsCount ?? 0);
                const cpv = Number(after.cpv ?? 20);
                logger.info("onProofStatusChanged: Sending proof validated email", {
                    userId,
                    email: "<redacted>",
                    views,
                    earnings: views * cpv,
                });
                await sendProofValidatedEmail(email, name, campaignTitle, views, views * cpv);
            }

            if (after.status === "rejected") {
                logger.info("onProofStatusChanged: Sending proof rejected email", {
                    userId,
                    email: "<redacted>",
                    campaignTitle,
                });
                await sendProofRejectedEmail(
                    email,
                    name,
                    campaignTitle,
                    String(after.rejectionReason || "Non précisé")
                );
            }
        } catch (error) {
            logger.error("onProofStatusChanged: Email send failed", {
                userId: event.params.userId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
);

export const onProofCreated = onDocumentCreated(
    {document: "users/{userId}/proofs/{proofId}", ...commonOptions},
    async (event) => {
        try {
            const proof = event.data?.data();
            if (!proof) return;

            const userId = String(event.params.userId || "");
            if (!userId) return;

            const userSnap = await db.doc(`users/${userId}`).get();
            const user = userSnap.data();
            const userName = String(user?.name || "Ambassadeur Inconnu");

            logger.info("onProofCreated: Sending admin notification", {
                userId,
                userName,
                campaignTitle: proof.campaignTitle || proof.campaignName,
            });

            if (ADMIN_EMAIL) await sendAdminNotificationEmail(ADMIN_EMAIL, "proof", {
                "Ambassadeur": userName,
                "Campagne": String(proof.campaignTitle || proof.campaignName || "Inconnue"),
                "Vues soumises": Number(proof.viewsCount ?? 0).toLocaleString(),
                "Date": new Date().toLocaleString("fr-FR"),
            });
        } catch (error) {
            logger.error("onProofCreated: Notification failed", {
                userId: event.params.userId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
);

export const onWithdrawalCreated = onDocumentCreated(
    {document: "withdrawals/{withdrawalId}", ...commonOptions},
    async (event) => {
        const withdrawalId = String(event.params.withdrawalId || "");
        const withdrawalRef = db.doc(`withdrawals/${withdrawalId}`);

        const withdrawal = event.data?.data();
        if (!withdrawal?.userId) return;

        const amount = Number(withdrawal.amount ?? 0);
        if (!Number.isFinite(amount) || amount <= 0) {
            await withdrawalRef.set(
                {
                    status: "failed",
                    failureReason: "invalid_amount",
                    updatedAt: FieldValue.serverTimestamp(),
                },
                {merge: true}
            );
            return;
        }

        // Backward-compatible safety: older clients created withdrawals directly without debiting.
        // Ensure the user's balance is debited exactly once.
        if (!withdrawal.balanceDebited) {
            const userId = String(withdrawal.userId);
            const userRef = db.doc(`users/${userId}`);

            try {
                await db.runTransaction(async (tx) => {
                    const [freshWithdrawalSnap, userSnapTx] = await Promise.all([
                        tx.get(withdrawalRef),
                        tx.get(userRef),
                    ]);

                    const freshWithdrawal = freshWithdrawalSnap.data() || {};
                    if (freshWithdrawal.balanceDebited === true) return;

                    const userTx = userSnapTx.data();
                    const balance = Number(userTx?.balance ?? 0);
                    if (!Number.isFinite(balance) || balance < amount) {
                        tx.set(
                            withdrawalRef,
                            {
                                status: "failed",
                                failureReason: "insufficient_balance",
                                balanceDebited: false,
                                updatedAt: FieldValue.serverTimestamp(),
                            },
                            {merge: true}
                        );
                        return;
                    }

                    tx.set(
                        userRef,
                        {
                            balance: balance - amount,
                            updatedAt: FieldValue.serverTimestamp(),
                        },
                        {merge: true}
                    );

                    tx.set(
                        withdrawalRef,
                        {
                            balanceDebited: true,
                            debitedAt: FieldValue.serverTimestamp(),
                            updatedAt: FieldValue.serverTimestamp(),
                        },
                        {merge: true}
                    );
                });
            } catch (e) {
                logger.error("onWithdrawalCreated debit error:", {
                    error: e instanceof Error ? e.message : String(e),
                });
            }
        }

        // Re-fetch to decide whether to notify (status might have been set to failed above).
        const finalWithdrawalSnap = await withdrawalRef.get();
        const finalWithdrawal = finalWithdrawalSnap.data();
        if (String(finalWithdrawal?.status || "").toLowerCase() === "failed") {
            logger.warn("onWithdrawalCreated: Withdrawal failed, skipping notifications", {
                withdrawalId,
                reason: finalWithdrawal?.failureReason,
            });
            return;
        }
        if (finalWithdrawal?.emailNotifiedAt) {
            logger.info("onWithdrawalCreated: Already notified", {withdrawalId});
            return;
        }

        const provider = String((finalWithdrawal?.provider ?? withdrawal.provider) || "");
        const phone = String((finalWithdrawal?.phone ?? withdrawal.phone) || "");

        const userSnap = await db.doc(`users/${String(withdrawal.userId)}`).get();
        const user = userSnap.data() || {};
        const userName = String(user.name || finalWithdrawal?.userName || withdrawal.userName || "");
        const userEmail = user.email ? String(user.email) : "";

        try {
            if (userEmail) {
                logger.info("onWithdrawalCreated: Sending withdrawal request email", {
                    withdrawalId,
                    userEmail: "<redacted>",
                    userName,
                    amount,
                });
                await sendWithdrawalRequestEmail(userEmail, userName, amount, provider, phone);
            }
        } catch (error) {
            logger.error("onWithdrawalCreated: Failed to send user email", {
                withdrawalId,
                userEmail: "<redacted>",
                error: error instanceof Error ? error.message : String(error),
            });
        }

        try {
            logger.info("onWithdrawalCreated: Sending admin notification", {
                withdrawalId,
                userName,
                amount,
                provider,
            });
            if (ADMIN_EMAIL) await sendAdminNotificationEmail(ADMIN_EMAIL, "withdrawal", {
                "Ambassadeur": userName || "-",
                "Montant": `${amount.toLocaleString()} FCFA`,
                "Opérateur": provider || "-",
                "Téléphone": phone || "-",
            });
        } catch (error) {
            logger.error("onWithdrawalCreated: Failed to send admin notification", {
                withdrawalId,
                error: error instanceof Error ? error.message : String(error),
            });
        }

        await withdrawalRef.set(
            {emailNotifiedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()},
            {merge: true}
        );
    }
);

export const requestWithdrawal = onCall(
    {...commonOptions},
    async (req) => {
        if (!req.auth) throw new HttpsError("unauthenticated", "login_required");

        const amount = Number(req.data?.amount ?? 0);
        const providerRaw = String(req.data?.provider ?? "").trim().toLowerCase();
        const provider = providerRaw === "yas" ? "yas" : providerRaw === "moov" ? "moov" : "";
        const phone = String(req.data?.phone ?? "").trim();
        const country = String(req.data?.country ?? "TG").trim().toUpperCase();
        const clientRequestId = String(req.data?.clientRequestId ?? "").trim();

        const MIN_WITHDRAWAL = 2000;

        if (!Number.isFinite(amount) || amount <= 0) {
            throw new HttpsError("invalid-argument", "invalid_amount");
        }
        if (amount < MIN_WITHDRAWAL) {
            throw new HttpsError("failed-precondition", "below_minimum_withdrawal");
        }
        if (!provider) {
            throw new HttpsError("invalid-argument", "invalid_provider");
        }
        if (!phone) {
            throw new HttpsError("invalid-argument", "missing_phone");
        }
        if (!clientRequestId) {
            throw new HttpsError("invalid-argument", "missing_clientRequestId");
        }

        const userId = req.auth.uid;
        const userRef = db.doc(`users/${userId}`);
        const withdrawalId = `${userId}_${clientRequestId}`;
        const withdrawalRef = db.doc(`withdrawals/${withdrawalId}`);

        await db.runTransaction(async (tx) => {
            const [existingWithdrawalSnap, userSnap] = await Promise.all([
                tx.get(withdrawalRef),
                tx.get(userRef),
            ]);

            if (existingWithdrawalSnap.exists) return;
            if (!userSnap.exists) throw new HttpsError("not-found", "user_not_found");

            const user = userSnap.data() || {};
            const balance = Number(user.balance ?? 0);
            if (!Number.isFinite(balance)) {
                throw new HttpsError("internal", "invalid_user_balance");
            }
            if (balance < amount) {
                throw new HttpsError("failed-precondition", "insufficient_balance");
            }

            const userName = String(user.name || req.auth?.token?.name || "Utilisateur");

            tx.set(withdrawalRef, {
                userId,
                userName,
                amount,
                provider,
                phone,
                country,
                status: "pending",
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                clientRequestId,
                balanceDebited: true,
                debitedAt: FieldValue.serverTimestamp(),
            });

            tx.set(
                userRef,
                {
                    balance: balance - amount,
                    updatedAt: FieldValue.serverTimestamp(),
                },
                {merge: true}
            );
        });

        return {withdrawalId};
    }
);

export const requestPasswordReset = onCall(
    {...commonOptions},
    async (req) => {
        const email = String(req.data?.email ?? "").trim().toLowerCase();
        if (!email) {
            throw new HttpsError("invalid-argument", "missing_email");
        }

        // Naive per-email throttle (60s window) to prevent email bombing.
        if (isAuthEmailThrottled(email)) {
            throw new HttpsError("resource-exhausted", "too_many_requests");
        }

        try {
            // Generate the link. We redirect to our custom reset page.
            // Using a simple query param 'mode=resetPassword' for the custom frontend logic.
            const appUrl = process.env.APP_BASE_URL || "https://sikaads-7b9bc.web.app";
            const link = await getAuth().generatePasswordResetLink(email, {
                url: `${appUrl}/?mode=resetPassword`,
            });

            // Try to find the user's name in Firestore to personalize the email
            const userQuery = await db.collection("users").where("email", "==", email).limit(1).get();
            let name = "Utilisateur";
            if (!userQuery.empty) {
                name = userQuery.docs[0].data().name || name;
            }

            await sendPasswordResetEmail(email, name, link);
            return {success: true};
        } catch (e: unknown) {
            logger.error("requestPasswordReset error:", e instanceof Error ? e.message : String(e));
            // Never reveal whether the email exists (avoids account enumeration).
            if (typeof e === "object" && e !== null && "code" in e && (e as {code: string}).code === "auth/user-not-found") {
                return {success: true};
            }
            throw new HttpsError("internal", "failed_to_send_reset_email");
        }
    }
);

export const requestEmailVerification = onCall(
    {...commonOptions},
    async (req) => {
        if (!req.auth) throw new HttpsError("unauthenticated", "login_required");

        const email = String(req.data?.email ?? "").trim().toLowerCase();
        if (!email) {
            throw new HttpsError("invalid-argument", "missing_email");
        }

        // Naive per-email throttle (60s window) to prevent email bombing.
        if (isAuthEmailThrottled(email)) {
            throw new HttpsError("resource-exhausted", "too_many_requests");
        }

        try {
            const appUrl = process.env.APP_BASE_URL || "https://sikaads-7b9bc.web.app";
            const link = await getAuth().generateEmailVerificationLink(email, {
                url: `${appUrl}/?mode=verifyEmail`,
            });

            // Try to find the user's name
            const userQuery = await db.collection("users").where("email", "==", email).limit(1).get();
            let name = "Nouvel Utilisateur";
            if (!userQuery.empty) {
                name = userQuery.docs[0].data().name || name;
            }

            await sendEmailVerificationEmail(email, name, link);
            return {success: true};
        } catch (e: unknown) {
            logger.error("requestEmailVerification error:", e instanceof Error ? e.message : String(e));
            // Never reveal whether the email exists (avoids account enumeration).
            if (typeof e === "object" && e !== null && "code" in e && (e as {code: string}).code === "auth/user-not-found") {
                return {success: false, reason: "not_found"};
            }
            throw new HttpsError("internal", "failed_to_send_verification_email");
        }
    }
);

export const onWithdrawalStatusChanged = onDocumentUpdated(
    {document: "withdrawals/{withdrawalId}", ...commonOptions},
    async (event) => {
        const before = event.data?.before.data();
        const after = event.data?.after.data();
        if (!before || !after) return;

        if (before.status === after.status) return;

        const status = after.status;
        if (status !== "completed" && status !== "failed") return;

        const userId = String(after.userId || before.userId || "");
        if (!userId) return;

        const userSnap = await db.doc(`users/${userId}`).get();
        const user = userSnap.data();
        if (!user?.email) return;

        await sendWithdrawalStatusEmail(
            String(user.email),
            String(user.name || ""),
            Number(after.amount ?? 0),
            status
        );
    }
);

export const onCampaignCreated = onDocumentCreated(
    {document: "campaigns/{campaignId}", ...commonOptions},
    async (event) => {
        const campaign = event.data?.data();
        if (!campaign || campaign.createdBy !== "user") return;

        const title = String(campaign.title || "");
        const totalBudget = Number(campaign.totalBudget ?? 0);
        const budgetPack = String(campaign.budgetPack || "Standard");

        if (campaign.advertiserEmail) {
            await sendCampaignCreatedEmail(
                String(campaign.advertiserEmail),
                String(campaign.advertiserName || "Annonceur"),
                title,
                totalBudget,
                budgetPack
            );
        }

        if (ADMIN_EMAIL) await sendAdminNotificationEmail(ADMIN_EMAIL, "campaign", {
            "Campagne": title || "-",
            "Annonceur": String(campaign.advertiserName || "-"),
            "Budget": `${totalBudget.toLocaleString()} FCFA`,
            "Pack": budgetPack,
        });
    }
);

export const onCampaignUpdated = onDocumentUpdated(
    {document: "campaigns/{campaignId}", ...commonOptions},
    async (event) => {
        const before = event.data?.before.data();
        const after = event.data?.after.data();
        if (!before || !after) return;

        // Trigger email ONLY when paymentStatus changes to 'paid'
        if (before.paymentStatus !== "paid" && after.paymentStatus === "paid") {
            const advertiserEmail = String(after.advertiserEmail || "");
            const advertiserName = String(after.advertiserName || "Annonceur");
            const campaignTitle = String(after.title || "Votre campagne");
            const amount = Number(after.paymentAmount || after.totalBudget || 0);

            if (advertiserEmail) {
                await sendPaymentSuccessEmail(
                    advertiserEmail,
                    advertiserName,
                    campaignTitle,
                    amount
                );
            }
        }

        // Trigger email ONLY when paymentStatus changes to 'failed'
        if (before.paymentStatus !== "failed" && after.paymentStatus === "failed") {
            const advertiserEmail = String(after.advertiserEmail || "");
            const advertiserName = String(after.advertiserName || "Annonceur");
            const campaignTitle = String(after.title || "Votre campagne");
            const error = String(after.paymentError || "");

            if (advertiserEmail) {
                await sendPaymentFailedEmail(
                    advertiserEmail,
                    advertiserName,
                    campaignTitle,
                    error
                );
            }
        }
    }
);

export const gomboCreateMobileDeposit = onCall(
    {...gomboOptions},
    async (req) => {
        if (!req.auth) throw new HttpsError("unauthenticated", "login_required");

        /* eslint-disable camelcase */
        const campaignId = String(req.data?.campaignId ?? "").trim();
        const recipient_number = String(req.data?.recipient_number ?? "").trim();
        const country = String(req.data?.country ?? "").trim().toUpperCase();
        const operator = String(req.data?.operator ?? "").trim().toLowerCase();

        if (!campaignId) throw new HttpsError("invalid-argument", "missing_campaignId");
        if (!recipient_number) throw new HttpsError("invalid-argument", "missing_recipient_number");
        if (!country) throw new HttpsError("invalid-argument", "missing_country");
        if (!operator) throw new HttpsError("invalid-argument", "missing_operator");

        try {
            // Securely retrieve the amount from Firestore
            const campaignSnap = await db.collection("campaigns").doc(campaignId).get();
            if (!campaignSnap.exists) {
                throw new HttpsError("not-found", "campaign_not_found");
            }

            const campaignData = campaignSnap.data();
            if (campaignData?.advertiserId !== req.auth.uid) {
                throw new HttpsError("permission-denied", "not_your_campaign");
            }

            const amount = Number(campaignData?.totalBudget ?? 0);
            if (!Number.isFinite(amount) || amount <= 0) {
                throw new HttpsError("invalid-argument", "invalid_amount_in_db");
            }

            const transaction_ref = `CMP-${campaignId.substring(0, 8)}-${Date.now()}`;

            // Webhook callback URL (EgoPay)
            const callback_url = "https://gombowebhook-d2ipomz43a-uc.a.run.app";

            const res = await createMobileDeposit({
                amount,
                recipient_number: recipient_number,
                country,
                operator,
                transaction_ref,
                callback_url,
            });

            // Save the payment reference securely to Firestore
            if (res.reference || transaction_ref) {
                const prefix = operator === "moov" ? "GOMBOMOOV-" : "GOMBOYAS-";
                const storedRef = res.reference || `${prefix}${transaction_ref}`;

                await db.collection("campaigns").doc(campaignId).update({
                    paymentReference: storedRef,
                    paymentOperator: operator,
                });
            }

            return res;
            /* eslint-enable camelcase */
        } catch (e: unknown) {
            if (e instanceof HttpsError) {
                throw e;
            }
            logger.error("Gombo Create Error:", e instanceof Error ? e.message : String(e));
            throw new HttpsError("internal", "gombo_create_failed");
        }
    }
);

export const gomboCheckTransactionStatus = onCall(
    {...gomboOptions},
    async (req) => {
        if (!req.auth) throw new HttpsError("unauthenticated", "login_required");

        /* eslint-disable camelcase */
        const transaction_reference = String(req.data?.transaction_reference ?? "").trim();
        if (!transaction_reference) {
            throw new HttpsError("invalid-argument", "missing_transaction_reference");
        }

        logger.info("gomboCheckTransactionStatus: Checking reference", {
            reference: transaction_reference,
            uid: req.auth.uid,
        });

        try {
            const res = await checkTransactionStatus({transaction_reference});

            logger.info("gomboCheckTransactionStatus: API response", {
                reference: transaction_reference,
                status: res.status,
                message: res.message,
            });

            // Auto-update Firestore if transaction is successful
            if (isGomboSuccess(res.status, res.message)) {
                const campaignQuery = await db.collection("campaigns")
                    .where("paymentReference", "==", transaction_reference)
                    .limit(1)
                    .get();

                if (!campaignQuery.empty) {
                    const campaignDoc = campaignQuery.docs[0];
                    await campaignDoc.ref.update({
                        paymentStatus: "paid",
                        campaignPaymentStatus: "payment_received",
                        status: "active",
                        paymentConfirmed: true,
                        paymentConfirmedAt: FieldValue.serverTimestamp(),
                        paymentConfirmedBy: "gombo_check_transaction",
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                    logger.info("gomboCheckTransactionStatus: Auto-updated campaign (SUCCESS)", {
                        campaignId: campaignDoc.id,
                        reference: transaction_reference,
                    });
                }
            } else if (isGomboFailure(res.status, res.message)) {
                // Auto-update Firestore if transaction failed
                const campaignQuery = await db.collection("campaigns")
                    .where("paymentReference", "==", transaction_reference)
                    .limit(1)
                    .get();

                if (!campaignQuery.empty) {
                    const campaignDoc = campaignQuery.docs[0];
                    await campaignDoc.ref.update({
                        paymentStatus: "failed",
                        campaignPaymentStatus: "payment_failed",
                        paymentError: String(res.message || res.status || "Unknown error"),
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                    logger.info("gomboCheckTransactionStatus: Auto-updated campaign (FAILED)", {
                        campaignId: campaignDoc.id,
                        reference: transaction_reference,
                    });
                }
            }

            return res;
        } catch (e: unknown) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            logger.error("gomboCheckTransactionStatus: API call failed", {
                reference: transaction_reference,
                error: errorMsg,
            });
            // Keep detailed info server-side only; return a generic message to the client.
            throw new HttpsError("internal", "gombo_api_error");
        }
        /* eslint-enable camelcase */
    }
);

/**
 * ✅ NEW: validateCampaignPayment - Validates campaign payment and activates it
 * Called after gomboCheckTransactionStatus confirms success
 */
export const validateCampaignPayment = onCall(
    {...gomboOptions},
    async (req) => {
        if (!req.auth) throw new HttpsError("unauthenticated", "login_required");

        const campaignId = String(req.data?.campaignId ?? "").trim();
        const transactionReference = String(req.data?.transactionReference ?? "").trim();

        if (!campaignId) throw new HttpsError("invalid-argument", "missing_campaignId");
        if (!transactionReference) throw new HttpsError("invalid-argument", "missing_transactionReference");

        try {
            const campaignSnap = await db.collection("campaigns").doc(campaignId).get();
            if (!campaignSnap.exists) {
                throw new HttpsError("not-found", "campaign_not_found");
            }

            const campaignData = campaignSnap.data();

            // Security: Only the advertiser can validate their campaign
            if (campaignData?.advertiserId !== req.auth.uid) {
                throw new HttpsError("permission-denied", "not_your_campaign");
            }

            // Verify the payment reference matches
            if (campaignData?.paymentReference !== transactionReference) {
                logger.warn("validateCampaignPayment: Reference mismatch", {
                    campaignId,
                    expected: campaignData?.paymentReference,
                    received: transactionReference,
                });
                throw new HttpsError("invalid-argument", "reference_mismatch");
            }

            // Check payment status from Gombo API
            const paymentStatus = await checkTransactionStatus({
                transaction_reference: transactionReference,
            });

            if (!isGomboSuccess(paymentStatus.status, paymentStatus.message)) {
                throw new HttpsError("failed-precondition", "payment_not_confirmed");
            }

            // Update campaign to mark as paid and active
            await campaignSnap.ref.update({
                paymentStatus: "paid",
                campaignPaymentStatus: "payment_received",
                paymentConfirmed: true,
                status: "active",
                paymentConfirmedAt: FieldValue.serverTimestamp(),
                paymentConfirmedBy: req.auth.uid,
                updatedAt: FieldValue.serverTimestamp(),
            });

            logger.info("validateCampaignPayment: Successfully validated", {
                campaignId,
                userId: req.auth.uid,
                reference: transactionReference,
            });

            return {
                success: true,
                campaignId,
                message: "Campaign payment validated and activated",
            };
        } catch (e: unknown) {
            if (e instanceof HttpsError) {
                throw e;
            }
            logger.error("validateCampaignPayment: Error", {
                campaignId,
                error: e instanceof Error ? e.message : String(e),
            });
            throw new HttpsError("internal", "validation_failed");
        }
    }
);

/**
 * Helper to check if a Gombo status string or message indicates success.
 * Robust to English (SUCCESS, COMPLETED) and French (Complété).
 */
function isGomboSuccess(status: unknown, message?: unknown): boolean {
    const s = (String(status || "") + " " + String(message || ""))
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    // Check for exact keywords or phrases in the combined status/message string
    const successKeywords = ["SUCCESS", "COMPLETED", "COMPLETE", "SUCCESSFUL", "APPROVED", "VALIDATED", "SUCCES"];
    return successKeywords.some((keyword) => s.includes(keyword));
}

/**
 * Helper to check if a Gombo status string or message indicates failure.
 */
function isGomboFailure(status: unknown, message?: unknown): boolean {
    const s = (String(status || "") + " " + String(message || ""))
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const failureKeywords = ["FAILED", "CANCELLED", "CANCELED", "ECHOUA", "ECHOUER", "ECHOUE", "ANNULE", "ECHEC"];
    return failureKeywords.some((keyword) => s.includes(keyword));
}

// Inner handler for gomboWebhook (business logic extracted for clarity).
async function gomboWebhookHandler(req: Request, res: Response) {
    /* eslint-disable camelcase */
    const body = req.body || {};
    const {
        status,
        transaction_ref,
        reference,
        transaction_reference,
        status_message,
        message,
        error,
    } = body;

    // Try all possible reference formats
    const refToUse = transaction_reference || transaction_ref || reference || body.txn_ref || body.ref;
    const statusToCheck = String(status || message || "").trim();
    const messageToCheck = String(status_message || message || error || "").trim();

    logger.info("gomboWebhook: Extracted values", {
        refToUse,
        statusToCheck,
        messageToCheck,
    });

    if (!refToUse) {
        logger.warn("gomboWebhook: Missing reference in body");
        res.status(400).json({error: "missing_reference"});
        return;
    }

    logger.info("gomboWebhook: Processing status", {refToUse, status: statusToCheck, message: messageToCheck});

    if (isGomboSuccess(statusToCheck, messageToCheck)) {
        try {
            let campaignDoc;
            const campaignQuery = await db.collection("campaigns")
                .where("paymentReference", "==", refToUse)
                .limit(1)
                .get();

            if (campaignQuery.empty) {
                logger.warn("gomboWebhook: Campaign not found for reference", {refToUse});
                // Also try array-contains variant
                const campaignQueryByRef = await db.collection("campaigns")
                    .where("paymentReference", "array-contains", refToUse)
                    .limit(1)
                    .get();
                if (campaignQueryByRef.empty) {
                    logger.error("gomboWebhook: Campaign still not found after retry", {refToUse});
                    res.status(404).json({error: "campaign_not_found", reference: refToUse});
                    return;
                }
                campaignDoc = campaignQueryByRef.docs[0];
            } else {
                campaignDoc = campaignQuery.docs[0];
            }
            const campaignId = campaignDoc.id;

            await campaignDoc.ref.update({
                paymentStatus: "paid",
                campaignPaymentStatus: "payment_received",
                status: "active",
                paymentConfirmed: true,
                paymentConfirmedAt: FieldValue.serverTimestamp(),
                paymentConfirmedBy: "gombo_webhook_auto",
                updatedAt: FieldValue.serverTimestamp(),
            });

            logger.info("gomboWebhook: Successfully updated campaign (SUCCESS)", {
                campaignId,
                reference: refToUse,
            });
            res.status(200).json({success: true, campaignId, reference: refToUse});
        } catch (updateError) {
            logger.error("gomboWebhook: Update failed", {
                error: updateError instanceof Error ? updateError.message : String(updateError),
                reference: refToUse,
            });
            res.status(500).json({error: "update_failed"});
        }
    } else if (isGomboFailure(statusToCheck, messageToCheck)) {
        try {
            const campaignQuery = await db.collection("campaigns")
                .where("paymentReference", "==", refToUse)
                .limit(1)
                .get();

            if (!campaignQuery.empty) {
                const campaignDoc = campaignQuery.docs[0];
                await campaignDoc.ref.update({
                    paymentStatus: "failed",
                    campaignPaymentStatus: "payment_failed",
                    paymentError: String(messageToCheck || statusToCheck || "Unknown error"),
                    updatedAt: FieldValue.serverTimestamp(),
                });
                logger.info("gomboWebhook: Updated campaign (FAILED)", {
                    campaignId: campaignDoc.id,
                    reference: refToUse,
                });
            }
            res.status(200).json({success: false, reference: refToUse, error: "payment_failed"});
        } catch (failureError) {
            logger.error("gomboWebhook: Failure update failed", {
                error: failureError instanceof Error ? failureError.message : String(failureError),
            });
            res.status(500).json({error: "update_failed"});
        }
    } else {
        logger.info("gomboWebhook: Ignoring non-terminal status", {
            refToUse,
            statusToCheck,
            messageToCheck,
        });
        res.status(202).json({accepted: true, reference: refToUse, message: "Status pending"});
    }
    /* eslint-enable camelcase */
}

export const gomboWebhook = onRequest(
    {...gomboOptions},
    async (req, res) => {
        if (req.method !== "POST") {
            logger.warn("gomboWebhook: Invalid method", {method: req.method});
            res.status(405).send("Method Not Allowed");
            return;
        }

        // --- HTTP signature verification (HMAC-SHA256) ---
        // HMAC is computed over JSON.stringify(req.body), matching the canonical
        // serialization that Gombo signs. This avoids raw-body capture complexity
        // while remaining deterministic and testable.
        const secret = process.env.GOMBO_WEBHOOK_SECRET;
        if (!secret) {
            logger.error("gomboWebhook: Webhook secret not configured");
            res.status(500).json({error: "webhook_not_configured"});
            return;
        }
        const signature = req.get("x-gombo-signature");
        if (!signature) {
            logger.warn("gomboWebhook: Missing signature header");
            res.status(401).json({error: "missing_signature"});
            return;
        }
        const rawBody = JSON.stringify(req.body ?? {});
        const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
        const provided = String(signature).trim().toLowerCase();
        let sigOk = false;
        try {
            const a = Buffer.from(expected, "hex");
            const b = Buffer.from(provided, "hex");
            sigOk = a.length === b.length && crypto.timingSafeEqual(a, b);
        } catch {
            sigOk = false;
        }
        if (!sigOk) {
            logger.warn("gomboWebhook: Invalid signature");
            res.status(401).json({error: "invalid_signature"});
            return;
        }
        // --- End signature verification ---

        await gomboWebhookHandler(req, res);
    }
);

export const adminApproveWithdrawal = onCall(
    {...gomboOptions},
    async (req) => {
        if (!req.auth) throw new HttpsError("unauthenticated", "login_required");
        const adminId = req.auth.uid;

        // Basic admin check - verify custom claim or user doc role
        const userDoc = await db.collection("users").doc(req.auth.uid).get();
        const userData = userDoc.data();
        const role = String(userData?.role || "").trim().toLowerCase();
        if (role !== "admin" && !req.auth.token.admin) {
            throw new HttpsError("permission-denied", "admin_required");
        }

        const withdrawalId = String(req.data?.withdrawalId ?? "").trim();
        if (!withdrawalId) throw new HttpsError("invalid-argument", "missing_withdrawalId");

        const withdrawalRef = db.collection("withdrawals").doc(withdrawalId);

        try {
            const withdrawalSnap = await withdrawalRef.get();
            if (!withdrawalSnap.exists) {
                throw new HttpsError("not-found", "withdrawal_not_found");
            }

            const withdrawalData = withdrawalSnap.data();
            if (withdrawalData?.status !== "pending" && withdrawalData?.status !== "pending_approval") {
                throw new HttpsError("failed-precondition", "withdrawal_already_processed");
            }

            const amount = Number(withdrawalData.amount || 0);
            const phone = String(withdrawalData.phone || "").trim();
            const operator = String(withdrawalData.provider || "").trim().toLowerCase();
            const country = String(withdrawalData.country || "TG").trim().toUpperCase();

            if (!amount || !phone || !operator) {
                throw new HttpsError("internal", "invalid_withdrawal_data");
            }

            // Lock the withdrawal and ensure the balance is debited before calling the payment API.
            await db.runTransaction(async (tx) => {
                const freshWithdrawalSnap = await tx.get(withdrawalRef);
                if (!freshWithdrawalSnap.exists) throw new HttpsError("not-found", "withdrawal_not_found");

                const fresh = freshWithdrawalSnap.data() || {};
                const status = String(fresh.status || "").trim().toLowerCase();
                if (status !== "pending" && status !== "pending_approval") {
                    throw new HttpsError("failed-precondition", "withdrawal_already_processed");
                }

                const freshAmount = Number(fresh.amount ?? 0);
                if (!Number.isFinite(freshAmount) || freshAmount <= 0) {
                    tx.set(
                        withdrawalRef,
                        {
                            status: "failed",
                            failureReason: "invalid_amount",
                            updatedAt: FieldValue.serverTimestamp(),
                        },
                        {merge: true}
                    );
                    return;
                }

                // Firestore transactions require all reads before all writes.
                // Read everything we need first, then perform writes.
                const needsDebit = fresh.balanceDebited !== true;

                const userId = String(fresh.userId || "");
                const userRef = userId ? db.collection("users").doc(userId) : null;
                const userSnap = needsDebit && userRef ? await tx.get(userRef) : null;

                if (needsDebit) {
                    if (!userRef) {
                        tx.set(
                            withdrawalRef,
                            {
                                status: "failed",
                                failureReason: "missing_userId",
                                updatedAt: FieldValue.serverTimestamp(),
                            },
                            {merge: true}
                        );
                        return;
                    }

                    const user = userSnap?.data() || {};
                    const balance = Number(user.balance ?? 0);

                    if (!Number.isFinite(balance) || balance < freshAmount) {
                        tx.set(
                            withdrawalRef,
                            {
                                status: "failed",
                                failureReason: "insufficient_balance",
                                balanceDebited: false,
                                updatedAt: FieldValue.serverTimestamp(),
                            },
                            {merge: true}
                        );
                        return;
                    }

                    tx.set(
                        userRef,
                        {
                            balance: balance - freshAmount,
                            updatedAt: FieldValue.serverTimestamp(),
                        },
                        {merge: true}
                    );

                    tx.set(
                        withdrawalRef,
                        {
                            balanceDebited: true,
                            debitedAt: FieldValue.serverTimestamp(),
                            updatedAt: FieldValue.serverTimestamp(),
                        },
                        {merge: true}
                    );
                }

                // Prevent double processing by marking as processing inside the transaction.
                tx.set(
                    withdrawalRef,
                    {
                        status: "processing",
                        processingAt: FieldValue.serverTimestamp(),
                        processingBy: adminId,
                        updatedAt: FieldValue.serverTimestamp(),
                    },
                    {merge: true}
                );
            });

            const afterLockSnap = await withdrawalRef.get();
            const afterLock = afterLockSnap.data() || {};
            const afterStatus = String(afterLock.status || "").trim().toLowerCase();
            if (afterStatus === "failed") {
                throw new HttpsError("failed-precondition", String(afterLock.failureReason || "withdrawal_failed"));
            }
            if (afterStatus !== "processing") {
                throw new HttpsError("failed-precondition", "withdrawal_not_locked");
            }

            // Reference for logging/tracking in Firestore
            /* eslint-disable camelcase */
            const transaction_ref = `WTH-${withdrawalId.substring(0, 8)}-${Date.now()}`;

            const res = await createMobileWithdrawal({
                amount,
                recipient_number: phone,
                operator,
                country,
                transaction_ref,
            });

            // Update status to completed upon successful API call
            await withdrawalRef.set(
                {
                    status: "completed",
                    paymentReference: res.reference || transaction_ref,
                    processedAt: FieldValue.serverTimestamp(),
                    processedBy: adminId,
                    gomboResponse: res,
                    processingAt: FieldValue.delete(),
                    processingBy: FieldValue.delete(),
                    lastError: FieldValue.delete(),
                    lastErrorAt: FieldValue.delete(),
                    updatedAt: FieldValue.serverTimestamp(),
                },
                {merge: true}
            );

            return {success: true, reference: res.reference || transaction_ref};
            /* eslint-enable camelcase */
        } catch (e: unknown) {
            const errorMsgForCleanup = typeof e === "object" && e !== null
                ? String((e as { message?: string }).message || (e as { code?: string }).code || e)
                : String(e);
            logger.error("Withdrawal Approval Error:", errorMsgForCleanup);

            if (e instanceof HttpsError) {
                throw e;
            }

            try {
                await db.runTransaction(async (tx) => {
                    const snap = await tx.get(withdrawalRef);
                    if (!snap.exists) return;
                    const data = snap.data() || {};
                    const status = String(data.status || "").trim().toLowerCase();
                    if (status !== "processing") return;
                    if (String(data.processingBy || "") !== String(adminId || "")) return;

                    tx.set(
                        withdrawalRef,
                        {
                            status: "pending",
                            lastError: errorMsgForCleanup,
                            lastErrorAt: FieldValue.serverTimestamp(),
                            processingAt: FieldValue.delete(),
                            processingBy: FieldValue.delete(),
                            updatedAt: FieldValue.serverTimestamp(),
                        },
                        {merge: true}
                    );
                });
            } catch (inner) {
                logger.error("Withdrawal Approval Error (cleanup):", {
                    error: inner instanceof Error ? inner.message : String(inner),
                });
            }

            throw new HttpsError("internal", "withdrawal_failed");
        }
    }
);

export const adminRejectWithdrawal = onCall(
    {...commonOptions},
    async (req) => {
        if (!req.auth) throw new HttpsError("unauthenticated", "login_required");
        const adminId = req.auth.uid;

        const userDoc = await db.collection("users").doc(req.auth.uid).get();
        const userData = userDoc.data();
        const role = String(userData?.role || "").trim().toLowerCase();
        if (role !== "admin" && !req.auth.token.admin) {
            throw new HttpsError("permission-denied", "admin_required");
        }

        const withdrawalId = String(req.data?.withdrawalId ?? "").trim();
        if (!withdrawalId) throw new HttpsError("invalid-argument", "missing_withdrawalId");

        const withdrawalRef = db.collection("withdrawals").doc(withdrawalId);

        await db.runTransaction(async (tx) => {
            const withdrawalSnap = await tx.get(withdrawalRef);
            if (!withdrawalSnap.exists) throw new HttpsError("not-found", "withdrawal_not_found");

            const w = withdrawalSnap.data() || {};
            const status = String(w.status || "").trim().toLowerCase();
            if (status !== "pending" && status !== "pending_approval") {
                throw new HttpsError("failed-precondition", "withdrawal_already_processed");
            }

            const amount = Number(w.amount ?? 0);
            if (!Number.isFinite(amount) || amount <= 0) {
                tx.set(
                    withdrawalRef,
                    {
                        status: "failed",
                        failureReason: "invalid_amount",
                        updatedAt: FieldValue.serverTimestamp(),
                    },
                    {merge: true}
                );
                return;
            }

            const alreadyRefunded = Boolean(w.refundedAt);
            const balanceDebited = Boolean(w.balanceDebited);
            const userId = String(w.userId || "");

            if (balanceDebited && userId && !alreadyRefunded) {
                const userRef = db.collection("users").doc(userId);
                tx.set(
                    userRef,
                    {
                        balance: FieldValue.increment(amount),
                        updatedAt: FieldValue.serverTimestamp(),
                    },
                    {merge: true}
                );
            }

            const refundMeta =
                balanceDebited && userId && !alreadyRefunded
                    ? {refundedAt: FieldValue.serverTimestamp(), refundedBy: adminId}
                    : {};

            tx.set(
                withdrawalRef,
                {
                    status: "failed",
                    failureReason: "rejected_by_admin",
                    ...refundMeta,
                    updatedAt: FieldValue.serverTimestamp(),
                },
                {merge: true}
            );
        });

        return {success: true};
    }
);
