import React, { useState, useRef } from 'react';
import { Upload, X, Check, Search, AlertTriangle, Loader2, Image as ImageIcon, Crown, User, DollarSign, Globe, FileText, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabase';
import { User as UserType } from '../types';

interface AdminCreateCampaignProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const AdminCreateCampaign: React.FC<AdminCreateCampaignProps> = ({ onSuccess, onCancel }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Advertiser State
  const [advertiserMode, setAdvertiserMode] = useState<'existing' | 'manual'>('existing');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserType[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [manualAdvertiserName, setManualAdvertiserName] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Campaign State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [budget, setBudget] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cpv, setCpv] = useState<string>('20'); // Default CPV

  // Search Users
  const handleSearchUser = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq."${searchQuery}",name.ilike."%${searchQuery}%"`);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!title || !description || !imageFile || !budget || !targetUrl) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (advertiserMode === 'existing' && !selectedUser) {
        alert("Veuillez sélectionner un annonceur.");
        return;
    }

    if (advertiserMode === 'manual' && !manualAdvertiserName) {
        alert("Veuillez entrer le nom de l'annonceur.");
        return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const adminId = session?.user?.id;

      const timestamp = Date.now();
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${timestamp}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `admin_vip/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('campaign-visuals')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('campaign-visuals')
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;

      const numBudget = parseFloat(budget);
      const numCpv = parseFloat(cpv);
      const targetViews = Math.floor(numBudget / numCpv);
      const estimatedAmbassadors = Math.ceil(targetViews / 50);

      const campaignData = {
        title,
        description,
        targetUrl,
        imageUrl,
        totalBudget: numBudget,
        remainingBudget: numBudget,
        cpc: Math.round(numCpv * 0.2), // Auto-calc CPC based on CPV
        cpv: numCpv,
        targetViews,
        maxAmbassadors: estimatedAmbassadors,
        viewsCurrent: 0,
        status: 'active', // Direct active status
        paymentStatus: 'paid',
        paymentConfirmed: true,
        campaignPaymentStatus: 'payment_received',
        paymentConfirmedAt: new Date().toISOString(),
        adminStatus: 'approved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'admin',
        budgetPack: 'VIP',
        priority: true, // VIP Flag
        category: 'VIP',
        advertiserId: advertiserMode === 'existing' ? selectedUser?.id : adminId,
        advertiserName: advertiserMode === 'existing' ? selectedUser?.name : manualAdvertiserName,
        advertiserEmail: advertiserMode === 'existing' ? selectedUser?.email : session?.user?.email,
        advertiserPhone: advertiserMode === 'existing' ? selectedUser?.momoNumber : ''
      };

      const { error: insertError } = await supabase
        .from('campaigns')
        .insert(campaignData);

      if (insertError) throw insertError;
      
      onSuccess();
    } catch (error) {
      console.error("Error creating VIP campaign:", error);
      alert(`Erreur lors de la création: ${error instanceof Error ? error.message : 'Problème de base de données'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* WARNING BANNER */}
      <div className="bg-red-600 text-white px-6 py-4 rounded-2xl shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
                <AlertTriangle size={24} className="text-white" />
            </div>
            <div>
                <h3 className="font-bold uppercase tracking-widest text-sm">Mode Administrateur</h3>
                <p className="text-xs text-red-100 font-medium">Vous créez une campagne VIP qui sera immédiatement active.</p>
            </div>
        </div>
        <div className="bg-white/10 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <Crown size={14} />
            Accès VIP
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Nouvelle Campagne VIP</h2>
        <button onClick={onCancel} className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-600 shadow-sm transition-all">
            <X size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN - FORM */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* 1. ADVERTISER SELECTION */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600"><User size={20} /></div>
                    <h3 className="text-lg font-bold text-gray-900">1. Client / Annonceur</h3>
                </div>

                <div className="flex gap-4 p-1 bg-gray-50 rounded-2xl w-fit">
                    <button 
                        onClick={() => setAdvertiserMode('existing')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${advertiserMode === 'existing' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Utilisateur Existant
                    </button>
                    <button 
                        onClick={() => setAdvertiserMode('manual')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${advertiserMode === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Saisie Manuelle
                    </button>
                </div>

                {advertiserMode === 'existing' ? (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Rechercher par email ou nom..."
                                className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm"
                                onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                            />
                            <button 
                                onClick={handleSearchUser}
                                disabled={isSearching}
                                className="bg-indigo-600 text-white px-6 rounded-2xl hover:bg-indigo-700 transition-colors"
                            >
                                {isSearching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                            </button>
                        </div>

                        {searchResults.length > 0 && (
                            <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                                {searchResults.map(user => (
                                    <button 
                                        key={user.id}
                                        onClick={() => { setSelectedUser(user); setSearchResults([]); setSearchQuery(''); }}
                                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left transition-colors border-b border-gray-50 last:border-0"
                                    >
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{user.name}</p>
                                            <p className="text-xs text-gray-500">{user.email}</p>
                                        </div>
                                        <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">
                                            Sélectionner
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {selectedUser && (
                            <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center text-green-700 font-black">
                                        {selectedUser.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase text-green-600 mb-0.5">Annonceur Sélectionné</p>
                                        <p className="font-bold text-gray-900">{selectedUser.name}</p>
                                        <p className="text-xs text-gray-500">{selectedUser.email}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-red-500">
                                    <X size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <input 
                            type="text" 
                            value={manualAdvertiserName}
                            onChange={(e) => setManualAdvertiserName(e.target.value)}
                            placeholder="Nom de l'entreprise / Client"
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                        />
                    </div>
                )}
            </div>

            {/* 2. CAMPAIGN DETAILS */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600"><FileText size={20} /></div>
                    <h3 className="text-lg font-bold text-gray-900">2. Détails Campagne</h3>
                </div>

                <div className="space-y-4">
                    <label className="block">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Titre de la campagne</span>
                        <input 
                            type="text" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-900 transition-all focus:bg-white" 
                            placeholder="Ex: Lancement Nouvelle Boisson"
                        />
                    </label>

                    <label className="block">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Description (Consignes)</span>
                        <textarea 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-700 transition-all focus:bg-white min-h-[100px]" 
                            placeholder="Texte accrocheur pour les ambassadeurs..."
                        />
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <label className="block">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Lien Cible</span>
                            <div className="relative">
                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                    type="text" 
                                    value={targetUrl}
                                    onChange={(e) => setTargetUrl(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-900 transition-all focus:bg-white" 
                                    placeholder="https://..."
                                />
                            </div>
                        </label>
                        <label className="block">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Coût par Vue (CPV)</span>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xs">FCFA</span>
                                <input 
                                    type="number" 
                                    value={cpv}
                                    onChange={(e) => setCpv(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pl-14 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-900 transition-all focus:bg-white" 
                                    placeholder="20"
                                />
                            </div>
                        </label>
                    </div>

                    <label className="block">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Budget Total (Illimité)</span>
                        <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="number" 
                                value={budget}
                                onChange={(e) => setBudget(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 outline-none font-black text-xl text-gray-900 transition-all focus:bg-white" 
                                placeholder="500000"
                            />
                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold">FCFA</span>
                        </div>
                    </label>

                    <div className="space-y-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Visuel</span>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative w-full aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group ${
                            imagePreview ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
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
                                <p className="text-sm font-bold text-gray-600">Ajouter l'image</p>
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
            </div>

            <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-5 bg-gray-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                Publier la Campagne VIP
            </button>
        </div>

        {/* RIGHT COLUMN - PREVIEW */}
        <div className="lg:col-span-1">
             <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] sticky top-24 shadow-2xl shadow-indigo-200 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>
                <div className="relative z-10 space-y-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                             <Crown size={16} className="text-yellow-400" />
                             <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em]">Aperçu VIP</p>
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight">{title || "Titre Campagne"}</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                            <span className="text-indigo-200 text-[10px] font-black uppercase tracking-wide">Budget</span>
                            <p className="text-3xl font-black tracking-tighter mt-1">
                                {budget ? parseInt(budget).toLocaleString() : '0'} <span className="text-base text-indigo-300 font-bold">FCFA</span>
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 p-4 rounded-2xl">
                                <span className="text-indigo-300 text-[10px] font-black uppercase">Vues Est.</span>
                                <p className="text-xl font-bold mt-1">
                                    {budget ? Math.floor(parseInt(budget) / parseInt(cpv || '20')).toLocaleString() : '0'}
                                </p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl">
                                <span className="text-indigo-300 text-[10px] font-black uppercase">Statut</span>
                                <div className="flex items-center gap-1.5 mt-1 text-green-400 font-bold text-sm">
                                    <CheckCircle2 size={14} /> Active
                                </div>
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

export default AdminCreateCampaign;