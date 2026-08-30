import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { User as UserIcon, Camera, Phone, Mail, Save, Trash2, AlertTriangle, Loader2, X, CheckCircle2, ArrowLeft, Lock, ShieldCheck, AlertCircle, Bell, BellOff } from 'lucide-react';
import { useUserData } from '@/hooks/useUserData';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { User, UserRole } from '../types';

const TILE = 'bg-white rounded-3xl border border-gray-100 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.04)]';
const TILE_HOVER = 'transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(15,23,42,0.08),0_16px_40px_rgba(15,23,42,0.08)]';
const FIELD = 'w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500/40 focus:bg-white outline-none font-semibold text-gray-900 transition-all';
const LABEL = 'text-[11px] font-semibold text-gray-500 ml-1 mb-2 block';
const SECTION_ICON = 'p-2.5 rounded-xl';
const PRIMARY_BTN = 'px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed';

const PushNotificationSettingsCard: React.FC<{ userId: string | null }> = ({ userId }) => {
  const { permission, isSubscribed, isLoading, requestPermission, unsubscribe } = usePushNotifications({ userId });

  if (permission === 'unsupported') {
    return (
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 p-2.5 rounded-xl text-gray-400">
            <BellOff size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800">Notifications Push</h4>
            <p className="text-xs text-gray-500 font-medium">Non prises en charge sur ce navigateur</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-4">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600">
          <Bell size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-900">Notifications du navigateur</h4>
          <p className="text-xs text-gray-500 font-medium">Recevez des alerte directes sur vos revenus et validations.</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="text-xs font-semibold">
          Statut : {permission === 'granted' && isSubscribed ? (
            <span className="text-emerald-600 font-bold">Actif (Abonné)</span>
          ) : permission === 'denied' ? (
            <span className="text-red-500 font-bold">Bloqué par le navigateur</span>
          ) : (
            <span className="text-amber-500 font-bold">Inactif</span>
          )}
        </div>

        {permission === 'granted' && isSubscribed ? (
          <button
            onClick={unsubscribe}
            disabled={isLoading}
            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            {isLoading ? '...' : 'Désactiver'}
          </button>
        ) : (
          <button
            onClick={() => {
              localStorage.removeItem('sikaads_push_dismissed');
              requestPermission();
            }}
            disabled={isLoading || permission === 'denied'}
            className="px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition-all disabled:opacity-50"
          >
            {isLoading ? 'Activation...' : 'Activer les notifications'}
          </button>
        )}
      </div>

      {permission === 'denied' && (
        <p className="text-[11px] text-red-500 bg-red-50 p-3 rounded-xl font-medium">
          Les notifications sont bloquées dans votre navigateur. Cliquez sur le cadenas à côté de l'URL pour réautoriser les notifications.
        </p>
      )}
    </div>
  );
};

interface ProfilePageProps {
  onBack: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onBack }) => {
  const {userData} = useUserData();
  const [user, setUser] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form States
  const [displayName, setDisplayName] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI States
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Danger Zone States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const currentUser = session.user;
      setUser(currentUser);
      setDisplayName(currentUser.user_metadata?.name || currentUser.user_metadata?.displayName || '');
      setPhotoURL(currentUser.user_metadata?.photoURL || currentUser.user_metadata?.avatar_url || '');

      try {
        const { data: userDoc } = await supabase
          .from('users')
          .select('momoNumber, name')
          .eq('id', currentUser.id)
          .single();

        if (userDoc) {
          setMomoNumber(userDoc.momoNumber || '');
          if (userDoc.name) setDisplayName(userDoc.name);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  // --- AVATAR MANAGEMENT ---

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      // 1. Upload to Storage
      const filePath = `${user.id}`;
      const { error: uploadErr } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      const downloadURL = urlData.publicUrl;

      // 2. Update Auth
      await supabase.auth.updateUser({
        data: { photoURL: downloadURL }
      });

      setPhotoURL(downloadURL);
      showSuccess("Photo de profil mise à jour !");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      showError("Erreur lors du téléchargement de l'image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!user || !photoURL) return;
    if (!confirm("Voulez-vous vraiment supprimer votre photo de profil ?")) return;

    setIsUploading(true);
    try {
      // 1. Try deleting from storage
      await supabase.storage
        .from('profile-pictures')
        .remove([user.id])
        .catch(err => console.warn("Image not found in storage", err));

      // 2. Update Auth
      await supabase.auth.updateUser({
        data: { photoURL: null }
      });

      setPhotoURL('');
      showSuccess("Photo de profil supprimée.");
    } catch (error) {
      console.error("Error deleting avatar:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // --- INFO MANAGEMENT ---

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      // 1. Update Auth Profile
      const { error: authErr } = await supabase.auth.updateUser({
        data: { name: displayName }
      });
      if (authErr) throw authErr;

      // 2. Update users Table
      const { error: dbErr } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          name: displayName,
          momoNumber: momoNumber,
          email: user.email
        });

      if (dbErr) throw dbErr;

      showSuccess("Informations enregistrées avec succès !");
    } catch (error) {
      console.error("Error saving info:", error);
      showError("Une erreur est survenue lors de la sauvegarde.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Veuillez saisir votre mot de passe actuel.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("Le nouveau mot de passe doit etre different de l'ancien.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });
      if (signInErr) {
        setPasswordError('Mot de passe actuel incorrect.');
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (updateErr) throw updateErr;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showSuccess('Mot de passe modifie avec succes !');
    } catch (error: any) {
      console.error('Change password error:', error);
      setPasswordError(error.message || 'Une erreur est survenue lors de la modification.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 4000);
  };

  // --- ACCOUNT DELETION ---

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'SUPPRIMER' || !user) return;

    setIsDeleting(true);
    try {
      const uid = user.id;

      // 1. Delete user row from database
      const { error: dbErr } = await supabase.from('users').delete().eq('id', uid);
      if (dbErr) throw dbErr;

      // 2. Delete Profile Picture (if exists)
      await supabase.storage.from('profile-pictures').remove([uid]).catch(() => { });

      // 3. Sign Out
      await supabase.auth.signOut();
    } catch (error: any) {
      console.error("Delete account error:", error);
      alert("Une erreur critique est survenue. Contactez le support.");
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 animate-pulse">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="h-9 w-56 bg-gray-200 rounded-xl" />
          <div className="h-44 bg-white rounded-3xl border border-gray-100" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-80 lg:col-span-2 bg-white rounded-3xl border border-gray-100" />
            <div className="space-y-6">
              <div className="h-72 bg-white rounded-3xl border border-gray-100" />
              <div className="h-36 bg-white rounded-3xl border border-gray-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Mon Profil</h1>
            <p className="text-sm text-gray-500 font-medium">Gérez vos informations personnelles et votre compte.</p>
          </div>
        </div>

        {/* Success Toast */}
        {successMessage && (
          <div className="fixed top-24 right-4 z-50 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-right duration-300">
            <CheckCircle2 size={20} />
            <span className="font-bold text-sm">{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="fixed top-24 right-4 z-50 bg-red-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-right duration-300">
            <AlertCircle size={20} />
            <span className="font-bold text-sm">{errorMessage}</span>
          </div>
        )}

        {/* Hero */}
        <div className={`${TILE} ${TILE_HOVER} p-8 relative overflow-hidden`}>
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br from-indigo-100/70 to-teal-100/40 blur-3xl pointer-events-none" aria-hidden />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="relative group shrink-0">
              <div className={`w-24 h-24 rounded-full p-[3px] bg-gradient-to-br from-indigo-500 to-teal-400 ${isUploading ? 'opacity-70' : ''}`}>
                <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                  {photoURL ? (
                    <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-black text-blue-700 select-none">
                      {displayName ? displayName.charAt(0).toUpperCase() : <UserIcon size={40} />}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0.5 right-0.5 p-2.5 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all disabled:opacity-70"
                aria-label="Changer la photo de profil"
              >
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-gray-900 tracking-tight truncate">{displayName || 'Utilisateur'}</h2>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${userData?.role === UserRole.ADMIN ? 'bg-orange-50 text-orange-700 border-orange-200' : userData?.role === UserRole.MODERATOR ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                  {userData?.role === UserRole.ADMIN ? 'Admin' : userData?.role === UserRole.MODERATOR ? 'Modérateur' : 'Membre'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Compte actif
                </span>
              </div>
              <p className="text-sm text-gray-500 font-medium mt-1 truncate">{user?.email}</p>
              {photoURL && (
                <button
                  onClick={handleDeleteAvatar}
                  disabled={isUploading}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  Supprimer la photo
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Right Column: Info Form */}
          <div className="md:col-span-2 space-y-8">
            <form onSubmit={handleSaveInfo} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600">
                  <UserIcon size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Informations Personnelles</h3>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Nom Complet</span>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-900 transition-all focus:bg-white"
                      placeholder="Votre nom"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Adresse Email (Non modifiable)</span>
                  <div className="relative opacity-60">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full bg-gray-100 border border-gray-200 rounded-2xl p-4 pl-12 font-bold text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Numéro de Téléphone (Mobile Money)</span>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input
                      type="text"
                      value={momoNumber}
                      onChange={(e) => setMomoNumber(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-900 transition-all focus:bg-white"
                      // placeholder="+228 90 00 00 00"
                    />
                  </div>
                </label>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Enregistrer
                </button>
              </div>
            </form>



            {/* Danger Zone */}
            <div className="bg-red-50/50 p-8 rounded-[2rem] border-2 border-red-100 space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2.5 rounded-xl text-red-600">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="text-lg font-bold text-red-700">Zone de Danger</h3>
              </div>

              <p className="text-sm text-red-900/60 font-medium leading-relaxed">
                La suppression de votre compte est irréversible. Toutes vos données, y compris votre solde non retiré, vos historiques et vos statistiques seront définitivement effacées.
              </p>

              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-6 py-3 bg-white border border-red-200 text-red-600 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm"
              >
                Supprimer mon compte
              </button>
            </div>
          </div>

          {/* Password Form */}
          <div className="md:col-span-1 space-y-8">
            <form onSubmit={handleChangePassword} className="bg-white p-8 rounded-[2rem] shadow-sm border flex flex-col items-center text-start border-gray-100 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Securite du compte</h3>
              </div>

               {passwordError && (
                <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100">
                  <AlertCircle size={18} className="shrink-0" />
                  <p className="text-xs font-bold">{passwordError}</p>
                </div>
              )}

              <div className="space-y-4">
                <label className="block">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Mot de passe actuel</span>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-900 transition-all focus:bg-white"
                      placeholder="Votre mot de passe actuel"
                      autoComplete="current-password"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Nouveau mot de passe</span>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-900 transition-all focus:bg-white"
                      placeholder="Minimum 6 caracteres"
                      autoComplete="new-password"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Confirmer le nouveau mot de passe</span>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-900 transition-all focus:bg-white"
                      placeholder="Repetez le nouveau mot de passe"
                      autoComplete="new-password"
                    />
                  </div>
                </label>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isChangingPassword ? <Loader2 className="animate-spin" size={20} /> : <Lock size={20} />}
                  Modifier
                </button>
              </div>
            </form>

           
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-red-100 w-12 h-12 rounded-2xl flex items-center justify-center text-red-600">
                <Trash2 size={24} />
              </div>
              <button onClick={() => setShowDeleteModal(false)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <h3 className="text-xl font-black text-gray-900 mb-2">Suppression définitive ?</h3>
            <p className="text-gray-500 text-sm font-medium mb-6 leading-relaxed">
              Pour confirmer la suppression, veuillez tapez <span className="font-bold text-gray-900">SUPPRIMER</span> dans le champ ci-dessous.
            </p>

            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="SUPPRIMER"
              className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 mb-6 font-bold text-center focus:border-red-500 focus:ring-0 outline-none uppercase tracking-widest"
            />

            <button
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== 'SUPPRIMER' || isDeleting}
              className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-100 hover:bg-red-700 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isDeleting ? <Loader2 className="animate-spin" size={20} /> : "Confirmer la suppression"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
