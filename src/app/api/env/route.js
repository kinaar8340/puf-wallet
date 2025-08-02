// app/api/env/route.js
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'undefined on server';
  console.log('Server-side Supabase URL:', url); // This logs to your terminal
  return Response.json({ supabaseUrl: url });
}
