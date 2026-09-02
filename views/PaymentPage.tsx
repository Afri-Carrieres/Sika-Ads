import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Phone, ArrowLeft, Loader2, Coins, ShieldCheck, CreditCard, RefreshCw } from "lucide-react";
import {
  gomboCheckTransactionStatus,
  gomboCreateMobileDeposit,
  validateCampaignPayment,
} from "../services/gomboPlus";

interface PaymentPageProps {
  amount: number;
  campaignId: string;
  onPaymentSuccess: (payment: {
    reference: string;
    operator: string;
    recipientNumber: string;
  }) => void;
  onCancel: () => void;
}

const PaymentPage: React.FC<PaymentPageProps> = ({
  amount,
  campaignId,
  onPaymentSuccess,
  onCancel,
}) => {
  const [recipientNumber, setRecipientNumber] = useState("");
  const [operator, setOperator] = useState<"yas" | "moov">("yas");
  const [status, setStatus] = useState<
    "idle" | "creating" | "pending" | "success" | "failed"
  >("idle");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [resultPopup, setResultPopup] = useState<
    | null
    | { type: "success" | "error" | "info"; title: string; message: string; onConfirm?: () => void }
  >(null);

  const pollTimerRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  useEffect(() => stopPolling, []);

  const startPolling = (txnRef: string) => {
    const startedAt = Date.now();
    stopPolling();

    pollTimerRef.current = window.setInterval(async () => {
      if (Date.now() - startedAt > 2 * 60 * 1000) {
        stopPolling();
        setStatus("failed");
        const timeoutMessage =
          "Délai dépassé. Si vous avez confirmé sur votre téléphone, réessayez la vérification.";
        setMessage(timeoutMessage);
        setResultPopup({
          type: "error",
          title: "Délai dépassé",
          message: timeoutMessage,
          onConfirm: () => manualRetryPayment(txnRef),
        });
        return;
      }

      try {
        const res = await gomboCheckTransactionStatus({
          transaction_reference: txnRef,
        });

        // Robust check for French and English status strings
        const s = String(res.status || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (["completed", "success", "successful", "approved", "complete"].includes(s)) {
          stopPolling();
          setStatus("success");
          setMessage("Paiement confirmé.");

          // ✅ Validate campaign payment to ensure it's marked as active
          validateCampaignPayment({
            campaignId,
            transactionReference: txnRef,
          }).catch((err) => {
            console.warn("Campaign validation skipped:", err?.message);
            // Continue anyway - webhook may have already validated
          });

          setResultPopup({
            type: "success",
            title: "Paiement confirmé",
            message: "Votre paiement a été confirmé avec succès et votre campagne est maintenant active.",
            onConfirm: () => onPaymentSuccess({ reference: txnRef, operator, recipientNumber }),
          });
          return;
        }

        if (["failed", "cancelled", "canceled", "echoue", "annule"].includes(s)) {
          stopPolling();
          setStatus("failed");
          const failureMessage = String(res.message || "Paiement échoué ou annulé.");
          setMessage(failureMessage);
          setResultPopup({
            type: "error",
            title: "Paiement échoué",
            message: failureMessage,
          });
        }
      } catch {
        // keep polling
      }
    }, 4000);
  };

  // ✅ Manual retry function for payment verification
  const manualRetryPayment = async (txnRef: string) => {
    setStatus("pending");
    setMessage("Vérification manuelle du paiement...");
    try {
      const res = await gomboCheckTransactionStatus({
        transaction_reference: txnRef,
      });

      const s = String(res.status || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      if (["completed", "success", "successful", "approved", "complete"].includes(s)) {
        setStatus("success");
        setMessage("Paiement confirmé. Validation de la campagne...");

        // ✅ Call validateCampaignPayment to ensure campaign is marked as paid
        try {
          await validateCampaignPayment({
            campaignId,
            transactionReference: txnRef,
          });
        } catch (validationError: any) {
          console.warn("Campaign validation warning:", validationError?.message);
          // Continue anyway - the webhook may have already validated it
        }

        setResultPopup({
          type: "success",
          title: "Paiement confirmé",
          message: "Votre paiement a été confirmé avec succès et votre campagne est maintenant active.",
          onConfirm: () => onPaymentSuccess({ reference: txnRef, operator, recipientNumber }),
        });
      } else if (["failed", "cancelled", "canceled", "echoue", "annule"].includes(s)) {
        setStatus("failed");
        setResultPopup({
          type: "error",
          title: "Paiement échoué",
          message: String(res.message || "Paiement échoué ou annulé."),
        });
      } else {
        setResultPopup({
          type: "info",
          title: "En attente",
          message: "Paiement en cours de traitement. Veuillez réessayer dans quelques secondes.",
        });
      }
    } catch (e: any) {
      setResultPopup({
        type: "error",
        title: "Erreur de vérification",
        message: e?.message || "Impossible de vérifier le paiement.",
      });
    }
  };

  const handlePay = async () => {
    setMessage("");
    setReference("");
    setResultPopup(null);
    setShowConfirmationModal(true);

    const phone = recipientNumber.trim();
    if (!phone) {
      setMessage("Veuillez saisir un numéro Mobile Money.");
      setResultPopup({
        type: "error",
        title: "Numéro manquant",
        message: "Veuillez saisir un numéro Mobile Money avant de valider le paiement.",
      });
      return;
    }

    setStatus("creating");
    try {
      const res = await gomboCreateMobileDeposit({
        campaignId,
        amount,
        recipient_number: phone,
        country: "TG",
        operator,
      });

      const txnRef = String(res.reference || "").trim();
      if (!txnRef) {
        setStatus("failed");
        setMessage(String(res.message || "Référence de transaction manquante."));
        return;
      }
      setShowConfirmationModal(true);

      setReference(txnRef);
      setStatus("pending");
      setMessage("Confirmez l'opération sur votre téléphone…");
      startPolling(txnRef);
    } catch (e: any) {
      setStatus("failed");
      const errorMessage = e?.message || "Erreur lors de la création du paiement.";
      setMessage(errorMessage);
      setResultPopup({
        type: "error",
        title: "Erreur paiement",
        message: errorMessage,
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50/50">
      {/* Confirmation Modal - Affiche après clic sur "Valider le Paiement" */}
      {showConfirmationModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
            {/* Green Checkmark Circle */}
            <div className="w-24 h-24 rounded-full mx-auto flex items-center justify-center bg-green-50 border-4 border-green-100">
              <CheckCircle2 size={48} className="text-green-500" strokeWidth={1.5} />
            </div>

            {/* Title */}
            <div>
              <h3 className="text-4xl font-bold text-gray-900 leading-tight">Demande de paiement!</h3>
              <p className="text-gray-600 font-medium mt-3 leading-relaxed text-sm">
                Veuillez valider votre paiement sur votre portable. Ensuite recharger la page
              </p>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-95 shadow-xl"
              >
                OK
              </button>
              {status === "pending" && reference && (
                <button
                  onClick={() => manualRetryPayment(reference)}
                  disabled={status !== "pending"}
                  className="w-full py-3 rounded-2xl font-black uppercase tracking-widest text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all active:scale-95 border-2 border-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw size={14} className="animate-spin" />
                  Vérifier le paiement
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Result Backdrop / Popup */}
      {resultPopup && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div
              className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${resultPopup.type !== "error" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                } border-4 ${resultPopup.type !== "error" ? "border-green-100" : "border-red-100"}`}
            >
              {resultPopup.type !== "error" ? <CheckCircle2 size={40} /> : <AlertCircle size={40} />}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">{resultPopup.title}</h3>
              <p className="text-gray-500 font-medium mt-2">{resultPopup.message}</p>
            </div>

            <button
              onClick={() => {
                const cb = resultPopup.onConfirm;
                setResultPopup(null);
                if (cb) cb();
              }}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl ${resultPopup.type === "success"
                  ? "bg-green-600 text-white hover:bg-green-700 shadow-green-100"
                  : resultPopup.type === "info"
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100"
                    : "bg-gray-900 text-white hover:bg-black shadow-gray-100"
                }`}
            >
              {resultPopup.type === "success" ? "Continuer" : resultPopup.type === "info" ? "OK" : "Réessayer"}
            </button>
          </div>
        </div>
      )}

      {/* Main Payment Card */}
      <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Back Button */}
        <button
          onClick={() => {
            stopPolling();
            onCancel();
          }}
          className="mb-6 flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-all font-bold text-sm uppercase tracking-widest group"
        >
          <div className="p-2 bg-white rounded-xl border border-gray-100 group-hover:border-gray-200 shadow-sm transition-all">
            <ArrowLeft size={18} />
          </div>
          Retour
        </button>

        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-indigo-100/50 border border-indigo-50/50 relative overflow-hidden">
          {/* Subtle Background Accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none"></div>

          <div className="relative z-10 space-y-8">
            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-3">
                <CreditCard size={12} />
                Paiement Sécurisé
              </div>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">Checkout</h1>
              <p className="text-gray-500 text-sm font-medium mt-1">Finalisez votre campagne SikaAds</p>
            </div>

            {/* Campaign Summary & Amount */}
            <div className="bg-indigo-900 text-white p-6 rounded-3xl space-y-4 shadow-lg shadow-indigo-900/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 opacity-30"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest leading-none mb-1">Campagne ID</p>
                    <p className="font-mono text-xs opacity-80">{campaignId}</p>
                  </div>
                  <Coins className="text-indigo-300" size={20} />
                </div>
                <div className="pt-2 border-t border-white/10">
                  <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest leading-none mb-1">Montant à régler</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black tracking-tighter">{amount.toLocaleString()}</span>
                    <span className="text-sm font-bold text-indigo-300">FCFA</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Operator Selection Card Grid */}
            <div className="space-y-4">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Choisir l'opérateur</span>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setOperator("yas")}
                  disabled={status === "creating" || status === "pending" || status === "success"}
                  className={`relative p-4 rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-3 h-28 ${operator === "yas"
                      ? "border-indigo-600 ring-4 ring-indigo-50 bg-indigo-50/30"
                      : "border-gray-50 hover:border-indigo-100 hover:bg-gray-50 bg-gray-50/50"
                    } disabled:opacity-50`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${operator === 'yas' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 border border-gray-100'}`}>T</div>
                  <span className="text-[11px] font-black uppercase tracking-wider">TMoney</span>
                  {operator === 'yas' && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md animate-in zoom-in-50 duration-200">
                      <CheckCircle2 size={12} strokeWidth={4} />
                    </div>
                  )}
                </button>

                <button
                  onClick={() => setOperator("moov")}
                  disabled={status === "creating" || status === "pending" || status === "success"}
                  className={`relative p-4 rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-3 h-28 ${operator === "moov"
                      ? "border-indigo-600 ring-4 ring-indigo-50 bg-indigo-50/30"
                      : "border-gray-50 hover:border-indigo-100 hover:bg-gray-50 bg-gray-50/50"
                    } disabled:opacity-50`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${operator === 'moov' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 border border-gray-100'}`}>M</div>
                  <span className="text-[11px] font-black uppercase tracking-wider">Moov</span>
                  {operator === 'moov' && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md animate-in zoom-in-50 duration-200">
                      <CheckCircle2 size={12} strokeWidth={4} />
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Phone Number Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Numéro de téléphone</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                  <Phone size={18} />
                </div>
                <input
                  value={recipientNumber}
                  onChange={(e) => setRecipientNumber(e.target.value)}
                  placeholder="90xxxxxx"
                  disabled={status === "creating" || status === "pending" || status === "success"}
                  className="w-full bg-gray-50 border border-gray-100 rounded-3xl p-5 pl-14 focus:ring-2 focus:ring-indigo-500 outline-none font-black text-gray-900 transition-all focus:bg-white placeholder:text-gray-300"
                />
              </div>
            </div>

            {/* Error/Status Messages / Instruction Card */}
            {message && (
              <div className={`p-5 rounded-3xl flex items-start gap-4 animate-in fade-in slide-in-from-top-2 border-2 ${status === "failed"
                  ? "bg-red-50 text-red-600 border-red-100"
                  : status === "pending"
                    ? "bg-green-50 text-green-700 border-green-100 shadow-lg shadow-green-100/50"
                    : "bg-indigo-50 text-indigo-600 border-indigo-100"
                }`}>
                {status === "failed" ? (
                  <AlertCircle size={22} className="shrink-0 mt-0.5" />
                ) : status === "pending" ? (
                  <CheckCircle2 size={22} className="shrink-0 mt-0.5" />
                ) : (
                  <Loader2 size={22} className="shrink-0 mt-0.5 animate-spin" />
                )}
                <div>
                  {status === "pending" && <h4 className="font-bold text-sm uppercase tracking-wider mb-1">Ok!</h4>}
                  <p className={`text-xs font-bold leading-relaxed ${status === "pending" ? "opacity-90" : ""}`}>
                    {status === "pending"
                      ? "Veuillez valider votre paiement sur votre portable. Ensuite recharger la page."
                      : message}
                  </p>
                </div>
              </div>
            )}

            {/* Validation Button */}
            <div className="pt-4">
              <button
                onClick={handlePay}
                disabled={status === "creating" || status === "pending" || status === "success"}
                className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
              >
                {status === "creating" ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : status === "pending" ? (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                ) : (
                  <>
                    <ShieldCheck size={20} />
                    Valider le Paiement
                  </>
                )}
              </button>

              <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <ShieldCheck size={14} className="text-green-500" />
                Transaction 100% Sécurisée
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
