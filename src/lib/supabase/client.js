import { createBrowserClient } from '@supabase/ssr';

// Initialize Supabase client for client-side usage
// Note: For server-side usage (API routes, Server Components), 
// you'll typically use createServerClient or createRouteHandlerClient from @supabase/ssr 
// or createClient from @supabase/supabase-js with the service_role key if needed.

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ); 