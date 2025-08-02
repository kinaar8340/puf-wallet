/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:                 process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    // Add any other vars here if needed
  },
};

export default nextConfig; 
