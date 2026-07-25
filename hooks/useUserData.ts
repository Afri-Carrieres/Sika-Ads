import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User, UserRole } from '../types';

interface UserDataHook {
  user: SupabaseUser | null;
  userData: User | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  incrementUserDailyCount: () => Promise<void>;
}

export const useUserData = (): UserDataHook => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  // 1. Listen for Auth State Changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Listen for User Row Changes (dependent on user)
  useEffect(() => {
    let channel: any;

    if (authLoading) return;

    if (!user) {
      setUserData(null);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);

    supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("useUserData: error fetching initial user data:", error);
          if (error.code === 'PGRST116') {
            // Profil manquant : arrive quand email_confirmations est activé dans Supabase.
            // On auto-crée le profil en utilisant les données stockées dans user_metadata
            // lors de l'inscription (voir RegistrationForm.tsx → signUp options.data).
            console.log("useUserData: Profile not found in public.users, auto-creating from user_metadata...");
            const meta = user.user_metadata || {};
            const generatedRefCode = meta.referralCode
              || ((meta.full_name || 'AMB').substring(0, 3) + Math.floor(1000 + Math.random() * 9000)).toUpperCase().replace(/\s/g, '');

            // ⚠️ Colonnes réelles de la table (schéma migration 20260702_create_users.sql)
            // gender, city, ageRange, paymentMethod ne sont PAS dans la table → omis
            // momoNumber est NOT NULL dans le schéma → valeur vide si absent
            supabase.from('users').insert({
              id: user.id,
              name: meta.full_name || user.email?.split('@')[0] || 'User',
              email: user.email,
              momoNumber: meta.momoNumber || '',
              role: 'AMBASSADOR',
              status: 'active',
              balance: 0,
              totalEarned: 0,
              clicks: 0,
              referralCode: generatedRefCode,
              referralCount: 0,
              referralEarnings: 0,
            }).then(({ error: insertErr }) => {
              if (insertErr) {
                console.error("useUserData: Failed to auto-create missing user profile:", insertErr);
              } else {
                console.log("useUserData: Profile auto-created from user_metadata ✅");
                // Re-fetch pour peupler le state immédiatement
                supabase.from('users').select('*').eq('id', user.id).single().then(({ data: freshData }) => {
                  if (freshData) setUserData(freshData as User);
                });
              }
            });
          }
        } else if (data) {
          setUserData(data as User);
        }
        setDataLoading(false);
      });

    // Realtime PostgreSQL listener
    const uniqueChannelName = `user_changes_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    channel = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log("useUserData: Realtime update received:", payload);
          if (payload.new) {
            setUserData(payload.new as User);
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, authLoading]);

  const isAdmin = userData?.role === UserRole.ADMIN;
  const isStaff = userData?.role === UserRole.ADMIN || userData?.role === UserRole.MODERATOR;

  const incrementUserDailyCount = async () => {
    if (!user || !userData) return;

    const today = new Date().toDateString();
    const currentStats = userData.dailyStats || { lastSharedDate: '', sharedCount: 0 };

    let newCount = 1;
    if (currentStats.lastSharedDate === today) {
      newCount = (currentStats.sharedCount || 0) + 1;
    }

    const { error } = await supabase
      .from('users')
      .update({
        dailyStats: {
          lastSharedDate: today,
          sharedCount: newCount
        }
      })
      .eq('id', user.id);

    if (error) {
      console.error("Error updating dailyStats:", error);
    }
  };

  return {
    user,
    userData,
    loading: authLoading || dataLoading,
    isAdmin,
    isStaff,
    incrementUserDailyCount
  };
};
