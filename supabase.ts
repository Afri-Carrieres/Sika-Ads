import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Graceful fallback for local dev preview: if env vars are missing, export a minimal stub
// so the app can render informational pages (e.g., About) without crashing.
let supabaseClient: any;
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Missing Supabase configuration. Some features will be disabled for local preview. Check .env.local");

    // Minimal auth implementation used by the app hooks
    const authStub = {
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: (_callback: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ data: null, error: new Error('Supabase not configured') }),
        signUp: async () => ({ data: null, error: new Error('Supabase not configured. Copy .env.example to .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.') }),
        signInWithOAuth: async () => ({ data: null, error: new Error('Supabase not configured. Check .env.local (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) and restart the dev server.') }),
        signOut: async () => ({ data: null, error: null }),
        resetPasswordForEmail: async () => ({ data: null, error: new Error('Supabase not configured') }),
        setSession: async () => ({ data: null, error: new Error('Supabase not configured') }),
    };

    const fromStub = (tableName?: string) => ({
        select: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: { code: 'PGRST116', message: 'not found' } }),
        eq: function () { return this; },
        insert: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        delete: async () => ({ data: null, error: null }),
    });

    const channelStub = (_name?: string) => ({
        on: function () { return this; },
        subscribe: async () => ({ status: 'SUBSCRIBED' }),
    });

    supabaseClient = {
        auth: authStub,
        from: fromStub,
        channel: channelStub,
        removeChannel: (_c: any) => {},
        functions: {
            invoke: async () => ({ data: null, error: new Error('Supabase not configured') }),
        },
        storage: {
            from: () => ({ getPublicUrl: () => ({ publicURL: '' }) }),
        },
    };
} else {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = supabaseClient;
