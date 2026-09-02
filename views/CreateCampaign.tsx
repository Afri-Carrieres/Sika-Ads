
import React, { useState, useRef, useEffect } from 'react';
// Added ArrowLeft and LayoutGrid to the imports
import { Upload, Smartphone, Globe, ShieldCheck, ArrowRight, ArrowLeft, X, Check, LayoutGrid, Users, Target, Coins, AlertCircle, Loader2, Image as ImageIcon, Briefcase, Phone, MessageCircle } from 'lucide-react';
import { supabase } from '../supabase';

interface CreateCampaignProps {
  onSuccess: (campaignDraft: any, amount: number) => void;
  onCancel: () => void;
}

const CreateCampaign: React.FC<CreateCampaignProps> = ({ onSuccess, onCancel }) => {
  // --- Constants & Math Logic ---
  const CPV = 5; // Coût par vue
  const VIEWS_PER_AMBASSADOR = 20; // Estimation moyenne
  const MIN_BUDGET = 2500;
  const MAX_BUDGET = 50000;

  const [category, setCategory] = useState('');

  const PACKS = [
    { id: 'starter', label: 'Starter', price: 2500, color: 'bg-blue-50 border-blue-200 text-blue-400' },
    { id: 'boost', label: 'Boost', price: 5000, color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
    { id: 'business', label: 'Business', price: 25000, color: 'bg-purple-50 border-purple-200 text-purple-700' },
    { id: 'pro', label: 'Pro', price: 50000, color: 'bg-orange-50 border-orange-200 text-orange-700' },
  ];

  // --- State ---
  const [step, setStep] = useState(1); // 1: Budget, 2: Details

  // Budget State
  const [budget, setBudget] = useState<number>(2500);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedPackId, setSelectedPackId] = useState<string | null>('starter');
  const [budgetError, setBudgetError] = useState<string>('');

  // Details State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState('Whatsapp'); // ✅ Nouveau champ
  const [targetUrl, setTargetUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Derived Calculations ---
  const targetViews = Math.floor(budget / CPV);
  const estimatedAmbassadors = Math.ceil(targetViews / VIEWS_PER_AMBASSADOR);

  // --- Handlers: Budget ---
  const handlePackSelect = (pack: typeof PACKS[0]) => {
    setBudget(pack.price);
    setSelectedPackId(pack.id);
    setCustomAmount('');
    setBudgetError('');
  };

  const handleCustomBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setCustomAmount(val);
    setSelectedPackId(null); // Deselect packs

    const numVal = parseInt(val, 10);
    if (isNaN(numVal)) {
      setBudget(0);
      return;
    }

    setBudget(numVal);

    if (numVal < MIN_BUDGET) {
      setBudgetError(`Le budget minimum est de ${MIN_BUDGET.toLocaleString()} FCFA`);
    } else if (numVal > MAX_BUDGET) {
      setBudgetError(`Le budget maximum est de ${MAX_BUDGET.toLocaleString()} FCFA`);
    } else {
      setBudgetError('');
    }
  };

  // --- Handlers: Image ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("L'image est trop lourde (Max 5MB)");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // --- Nouvelle soumission : prépare les données et transmet à App pour paiement ---
  // const handleSubmit = async () => {
  //   if (!auth.currentUser) {
  //     alert("Vous devez être connecté.");
  //     return;
  //   }
  //   if (!imageFile) {
  //     alert("Veuillez ajouter une image pour votre campagne.");
  //     return;
  //   }

  //   setIsSubmitting(true);
  //   try {
  //     const timestamp = Date.now();
  //     const storageRef = ref(storage, `campaign_visuals/${auth.currentUser.uid}/${timestamp}_${imageFile.name}`);
  //     await uploadBytes(storageRef, imageFile);
  //     const imageUrl = await getDownloadURL(storageRef);

  //     const campaignDraft = {
  //       advertiserId: auth.currentUser.uid,
  //       title,
  //       description,
  //       targetUrl,
  //       imageUrl,
  //       budget,
  //       targetViews,
  //       maxAmbassadors: estimatedAmbassadors,
  //       viewsCurrent: 0,
  //       status: 'pending', // statut temporaire avant paiement
  //       createdAt: new Date().toISOString(),
  //       cpv: CPV,
  //       createdBy: 'user',
  //       budgetPack: selectedPackId ? PACKS.find(p => p.id === selectedPackId)?.label : 'Custom'
  //     };

  //     onSuccess(campaignDraft, budget);
  //   } catch (error) {
  //     console.error("Erreur lors de la préparation de la campagne:", error);
  //     alert("Une erreur est survenue. Veuillez vérifier votre connexion.");
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

  const handleSubmit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      alert("Vous devez être connecté.");
      return;
    }

    if (!imageFile) {
      alert("Veuillez ajouter une image.");
      return;
    }

    if (!category) {
      alert("Veuillez choisir une catégorie.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload image to Supabase Storage
      const timestamp = Date.now();
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${timestamp}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('campaign-visuals')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('campaign-visuals')
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;

      // Draft only: database write happens after payment in App.tsx
      const campaignDraft = {
        advertiserId: session.user.id,
        title,
        description,
        category,
        platform, // ✅ Ajouté

        targetUrl: targetUrl || null,
        imageUrl,

        totalBudget: budget,
        // prélever 20% du budget et laisse le reste pour les ambasadeurs
        remainingBudget: budget / 5 * 4,

        cpc: Math.round(CPV * 0.2),
        cpv: CPV,
        targetViews: Math.floor(budget / CPV),
        viewsCurrent: 0,

        maxAmbassadors: estimatedAmbassadors,

        status: 'pending',
        createdBy: 'user',
        paymentStatus: 'pending',
        paymentConfirmed: false,
        budgetPack: selectedPackId ? PACKS.find(p => p.id === selectedPackId)?.label : 'Custom',
      };

      onSuccess(campaignDraft, budget);

    } catch (error) {
      console.error("Erreur création campagne:", error);
      alert("Une erreur est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">Nouvelle Campagne</h1>
            <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">Configurez votre publicité en 2 étapes.</p>
          </div>
          <button onClick={onCancel} className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-600 transition-all shadow-sm">
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 space-y-8">

            {/* STEP 1: BUDGET */}
            <div className={`bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border transition-all duration-500 ${step === 1 ? 'border-indigo-200 ring-4 ring-indigo-50/50' : 'border-gray-100 opacity-50 pointer-events-none grayscale'}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600"><Coins size={20} /></div>
                <h2 className="text-xl font-bold text-gray-900">1. Définir le Budget</h2>
              </div>

              <div className="space-y-6">
                {/* Packages */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {PACKS.map((pack) => (
                    <button
                      key={pack.id}
                      onClick={() => handlePackSelect(pack)}
                      className={`relative p-4 rounded-2xl border-2 transition-all text-left flex flex-col justify-between h-28 md:h-32 ${selectedPackId === pack.id
                        ? 'border-indigo-600 ring-2 ring-indigo-100 bg-indigo-50/30'
                        : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
                        }`}
                    >
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md w-fit mb-2 ${pack.color}`}>
                        {pack.label}
                      </span>
                      <div>
                        <p className="text-lg font-black text-gray-900">{pack.price.toLocaleString()}F</p>
                        <p className="text-[10px] font-bold text-gray-400">~{Math.floor(pack.price / CPV)} vues</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom Amount */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-400 font-bold text-xs md:text-sm">Autre Montant :</span>
                  </div>
                  <input
                    type="text"
                    value={customAmount}
                    onChange={handleCustomBudgetChange}
                    className={`w-full bg-gray-50 border-2 rounded-2xl py-4 pl-32 md:pl-36 pr-12 focus:ring-0 outline-none font-black text-gray-900 transition-all ${budgetError ? 'border-red-300 bg-red-50 text-red-900' : 'border-gray-100 focus:border-indigo-500 focus:bg-white'
                      }`}
                    placeholder="5000"
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <span className="text-gray-400 font-bold text-sm">FCFA</span>
                  </div>
                </div>

                {budgetError && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl animate-in slide-in-from-top-1">
                    <AlertCircle size={16} />
                    <p className="text-xs font-bold">{budgetError}</p>
                  </div>
                )}

                {/* --- GRANDS COMPTES SECTION --- */}
                <div className="mt-8 p-6 md:p-8 bg-indigo-50 border border-indigo-100 rounded-[2rem] shadow-sm">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    {/* Text Column */}
                    <div className="text-center sm:text-left space-y-1">
                      <h4 className="text-xl font-bold text-indigo-900">Pour un budget de +50 000 FCFA ?</h4>
                      <p className="text-indigo-600 font-semibold">Contactez nous!</p>
                    </div>

                    {/* Buttons Column */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                      {/* WhatsApp Button */}
                      <a
                        href="https://wa.me/22891416745"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#20bd5a] text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95"
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                        WhatsApp
                      </a>

                      {/* Call Button */}
                      <a
                        href="tel:+22891416745"
                        className="w-full sm:w-auto flex items-center justify-center bg-slate-800 hover:bg-slate-900 text-white p-4 rounded-2xl transition-all shadow-lg active:scale-95"
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 2: DETAILS */}
            <div className={`bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border transition-all duration-500 ${step === 2 ? 'border-indigo-200 ring-4 ring-indigo-50/50' : 'border-gray-100 opacity-60'}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600"><LayoutGrid size={20} /></div>
                <h2 className="text-xl font-bold text-gray-900">2. Détails de l'Annonce</h2>
              </div>

              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <label className="block">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Titre de l'offre</span>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-900 transition-all focus:bg-white"
                      placeholder="Ex: Promo Pizza 2 achetées = 1 offerte"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">
                      Catégorie
                    </span>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-900 transition-all focus:bg-white"
                    >
                      <option value="">Sélectionnez une catégorie</option>
                      <option value="Tech">Tech</option>
                      <option value="Food">Food</option>
                      <option value="Mode">Mode</option>
                      <option value="Beauté">Beauté</option>
                      <option value="Services">Services</option>
                      <option value="Emplois/Stages">Emplois/Stages</option>
                      <option value="E-commerce">E-commerce</option>
                      <option value="Formation">Formation</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </label>

                  {/* <label className="block">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">
                      Plateforme de partage
                    </span>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-900 transition-all focus:bg-white"
                    >
                      <option value="">Sélectionnez une plateforme</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Instagram">Instagram</option>
                      <option value="TikTok">TikTok</option>
                      <option value="Telegram">Telegram</option>
                      <option value="Snapchat">Snapchat</option>
                    </select>
                  </label> */}

                  <label className="block">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Consignes pour l'ambassadeur</span>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-700 transition-all focus:bg-white min-h-[100px]"
                      placeholder="Décrivez ce que l'ambassadeur doit mettre en avant..."
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Lien de redirection (Optionnel)</span>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="url"
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-900 transition-all focus:bg-white"
                        placeholder="https:// ou wa.me/..."
                      />
                    </div>
                  </label>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Visuel de campagne</span>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative w-full aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group ${imagePreview ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                        }`}
                    >
                      {imagePreview ? (
                        <>
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                            <div className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white">
                              <Upload size={24} />
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="bg-white p-4 rounded-2xl shadow-sm mb-3 group-hover:scale-110 transition-transform">
                            <ImageIcon size={32} className="text-indigo-600" />
                          </div>
                          <p className="text-sm font-bold text-gray-600">Cliquez pour ajouter une image</p>
                          <p className="text-[10px] text-gray-400 font-medium mt-1">Format recommandé : 1080x1920 (Statut)</p>
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageSelect}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS (BOTTOM) - IMPROVED RESPONSIVENESS & AESTHETICS */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {step === 2 && (
                <button
                  onClick={() => setStep(1)}
                  className="w-full sm:w-auto px-10 py-4 bg-white border-2 border-gray-100 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs hover:bg-gray-50 hover:border-gray-200 hover:text-gray-700 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <ArrowLeft size={16} className="rotate-0 shrink-0" />
                  Retour
                </button>
              )}

              <button
                onClick={() => {
                  if (step === 1) {
                    if (budgetError || budget < MIN_BUDGET || budget > MAX_BUDGET) return;
                    setStep(2);
                  } else {
                    handleSubmit();
                  }
                }}
                disabled={
                  (step === 1 && (!!budgetError || budget < MIN_BUDGET)) ||
                  (step === 2 && (!title || !description || !imageFile || !category || !platform || isSubmitting))
                } className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    {step === 1 ? 'Continuer' : 'Valider et Payer'}
                    <ArrowRight size={20} className="shrink-0" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: SUMMARY */}
          <div className="lg:col-span-1">
            <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] sticky top-24 shadow-2xl shadow-indigo-200 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>

              <div className="relative z-10 space-y-8">
                <div>
                  <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Simulateur</p>
                  <h3 className="text-2xl font-bold tracking-tight">Résumé</h3>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-indigo-200 text-[10px] font-black uppercase tracking-wide">Budget Total</span>
                      <Coins size={14} className="text-indigo-300" />
                    </div>
                    <p className="text-2xl font-black tracking-tighter">{budget.toLocaleString()} <span className="text-base text-indigo-300 font-bold">FCFA</span></p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-green-50/20 p-2.5 rounded-xl text-green-400 border border-green-500/30">
                        <Target size={18} />
                      </div>
                      <div>
                        <p className="text-xl font-black">{targetViews.toLocaleString()}</p>
                        <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Vues Garanties</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="bg-orange-500/20 p-2.5 rounded-xl text-orange-400 border border-orange-500/30">
                        <Users size={18} />
                      </div>
                      <div>
                        <p className="text-xl font-black">~{estimatedAmbassadors}</p>
                        <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Ambassadeurs</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                    <span>Impact</span>
                    <span>{Math.min(100, Math.round((budget / MAX_BUDGET) * 100))}%</span>
                  </div>
                  <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round((budget / MAX_BUDGET) * 100))}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCampaign;
