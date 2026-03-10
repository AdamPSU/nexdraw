import { createClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: whiteboards } = await supabase
    .from('whiteboards')
    .select('id, title, created_at, updated_at, preview')
    .order('updated_at', { ascending: false });

  return <DashboardClient initialWhiteboards={whiteboards || []} />;
}
