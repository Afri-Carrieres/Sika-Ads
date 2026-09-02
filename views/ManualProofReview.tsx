import React, { useState, useMemo } from 'react';
import { Proof, Notification } from '../types';
import {
  Eye, X, CheckCircle2, AlertTriangle, Shield, Zap, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';

interface ManualProofReviewProps {
  proofs: (Proof & { campaignTitle: string; userName: string })[];
  setProofs: React.Dispatch<React.SetStateAction<(Proof & { campaignTitle: string; userName: string })[]>>;
  addNotification: (notif: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
}

const ManualProofReview: React.FC<ManualProofReviewProps> = ({ proofs, setProofs, addNotification }) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [expandedProofId, setExpandedProofId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'confidence' | 'date' | 'fraudRisk'>('confidence');
  const [confidenceFilter, setConfidenceFilter] = useState<[number, number]>([0, 100]);

  // Filtrer les preuves en révision manuelle
  const manualReviewProofs = useMemo(() => {
    return proofs
      .filter(p => p.aiAnalysis?.suggestedAction === 'manual_review')
      .filter(p => 
        p.aiAnalysis.confidence >= confidenceFilter[0] && 
        p.aiAnalysis.confidence <= confidenceFilter[1]
      )
      .sort((a, b) => {
        if (sortBy === 'confidence') {
          return (b.aiAnalysis?.confidence || 0) - (a.aiAnalysis?.confidence || 0);
        } else if (sortBy === 'date') {
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        } else {
          // fraudRisk: fraud alerts first
          const aRisk = a.aiAnalysis?.fraudAlert ? 1 : 0;
          const bRisk = b.aiAnalysis?.fraudAlert ? 1 : 0;
          return bRisk - aRisk;
        }
      });
  }, [proofs, sortBy, confidenceFilter]);

  const stats = useMemo(() => ({
    total: manualReviewProofs.length,
    withFraudAlert: manualReviewProofs.filter(p => p.aiAnalysis?.fraudAlert).length,
    highConfidence: manualReviewProofs.filter(p => (p.aiAnalysis?.confidence || 0) >= 80).length,
    lowConfidence: manualReviewProofs.filter(p => (p.aiAnalysis?.confidence || 0) < 50).length,
  }), [manualReviewProofs]);

  const toggleExpanded = (proofId: string) => {
    setExpandedProofId(expandedProofId === proofId ? null : proofId);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] p-8 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Zap size={24} />
          </div>
          <h1 className="text-3xl font-bold">Révision Manuelle</h1>
        </div>
        <p className="text-blue-100 font-medium">Preuves nécessitant une intervention humaine pour la validation finale</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Total à examiner</p>
          <p className="text-3xl font-black text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-6 shadow-sm border border-red-100">
          <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-2">Avec alerte fraude</p>
          <p className="text-3xl font-black text-red-600">{stats.withFraudAlert}</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-6 shadow-sm border border-emerald-100">
          <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">Confiance haute (≥80%)</p>
          <p className="text-3xl font-black text-emerald-600">{stats.highConfidence}</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-6 shadow-sm border border-amber-100">
          <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-2">Confiance basse (&lt;50%)</p>
          <p className="text-3xl font-black text-amber-600">{stats.lowConfidence}</p>
        </div>
      </div>

      {/* Filtres et tri */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 space-y-6">
        <div>
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 block">Trier par</label>
          <div className="flex gap-3">
            {(['confidence', 'date', 'fraudRisk'] as const).map(option => (
              <button
                key={option}
                onClick={() => setSortBy(option)}
                className={`px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${
                  sortBy === option
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option === 'confidence' ? 'Confiance' : option === 'date' ? 'Date récente' : 'Risque fraude'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 block">
            Filtrer par confiance: {confidenceFilter[0]}% - {confidenceFilter[1]}%
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="100"
              value={confidenceFilter[0]}
              onChange={(e) => setConfidenceFilter([parseInt(e.target.value), confidenceFilter[1]])}
              className="flex-1"
            />
            <input
              type="range"
              min="0"
              max="100"
              value={confidenceFilter[1]}
              onChange={(e) => setConfidenceFilter([confidenceFilter[0], parseInt(e.target.value)])}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Liste des preuves */}
      {manualReviewProofs.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-12 text-center">
          <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Aucune preuve à examiner</h3>
          <p className="text-gray-500 font-medium">Excellente nouvelle ! Toutes les preuves en révision manuelle ont été traitées.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {manualReviewProofs.map(proof => (
            <div key={proof.id} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              {/* Header compact */}
              <button
                onClick={() => toggleExpanded(proof.id)}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-6 flex-1 text-left">
                  <img
                    src={proof.downloadURL}
                    alt="Proof"
                    className="w-24 h-24 object-cover rounded-xl border border-gray-200"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg text-gray-900">{proof.userName}</h3>
                      {proof.aiAnalysis?.fraudAlert && (
                        <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-[9px] font-black uppercase tracking-widest">
                          ⚠ Fraude
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-indigo-600 font-black uppercase tracking-widest mb-1">{proof.campaignName}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(proof.submittedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            (proof.aiAnalysis?.confidence || 0) >= 70 ? 'bg-emerald-500' :
                            (proof.aiAnalysis?.confidence || 0) >= 40 ? 'bg-amber-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${proof.aiAnalysis?.confidence || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-black text-gray-900 w-8">{proof.aiAnalysis?.confidence}%</span>
                    </div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Confiance</p>
                  </div>
                  {expandedProofId === proof.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {/* Détails expandus */}
              {expandedProofId === proof.id && (
                <div className="border-t border-gray-100 p-6 bg-gray-50 space-y-6">
                  {/* Image en grand */}
                  <button
                    onClick={() => setPreviewImage(proof.downloadURL)}
                    className="w-full group relative rounded-2xl overflow-hidden h-64 cursor-pointer"
                  >
                    <img src={proof.downloadURL} alt="Full preview" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                      <Eye size={32} className="text-white" />
                    </div>
                  </button>

                  {/* Scores de confiance granulaires */}
                  {proof.aiAnalysis && (
                    <div className="bg-white rounded-2xl p-6 space-y-4">
                      <h4 className="text-sm font-bold text-gray-900 mb-4">Analyse IA détaillée</h4>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Vues détectées</p>
                          <p className="text-2xl font-black text-gray-900">{proof.aiAnalysis.viewsCount.toLocaleString()}</p>
                        </div>
                        {proof.aiAnalysis.imageAuthenticityConfidence && (
                          <div className="bg-blue-50 rounded-xl p-4">
                            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2">Authenticité image</p>
                            <p className="text-2xl font-black text-blue-600">{proof.aiAnalysis.imageAuthenticityConfidence}%</p>
                          </div>
                        )}
                        {proof.aiAnalysis.viewCountDetectionConfidence && (
                          <div className="bg-purple-50 rounded-xl p-4">
                            <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest mb-2">Détection vues</p>
                            <p className="text-2xl font-black text-purple-600">{proof.aiAnalysis.viewCountDetectionConfidence}%</p>
                          </div>
                        )}
                      </div>

                      {/* Type de fraude et éléments */}
                      {proof.aiAnalysis.fraudType && proof.aiAnalysis.fraudType !== 'none' && (
                        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                          <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-2">Type de fraude détecté</p>
                          <p className="text-sm font-black text-red-600">{proof.aiAnalysis.fraudType.replace(/_/g, ' ')}</p>
                        </div>
                      )}

                      {proof.aiAnalysis.fraudEvidenceDetails && proof.aiAnalysis.fraudEvidenceDetails.length > 0 && (
                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-3">Éléments suspects détectés</p>
                          <ul className="space-y-2">
                            {proof.aiAnalysis.fraudEvidenceDetails.map((detail, idx) => (
                              <li key={idx} className="text-sm text-amber-600 font-medium flex gap-2">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                <span>{detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {proof.aiAnalysis.reason && (
                        <div className="bg-gray-100 rounded-xl p-4">
                          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2">Justification IA</p>
                          <p className="text-sm text-gray-700 font-medium">{proof.aiAnalysis.reason}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all">
                      ✓ Approuver
                    </button>
                    <button className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all">
                      ✗ Rejeter
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Preview image */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
          onClick={() => setPreviewImage(null)}
        >
          <button className="absolute top-6 right-6 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all" onClick={() => setPreviewImage(null)}>
            <X size={32} />
          </button>
          <div className="relative max-w-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-white/10" alt="Preview" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualProofReview;
