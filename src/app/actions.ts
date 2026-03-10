"use server";

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createWhiteboard() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('whiteboards')
    .insert([{ title: 'Untitled Whiteboard', data: {} }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  
  revalidatePath('/');
  return data;
}

export async function deleteWhiteboard(id: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('whiteboards')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  
  revalidatePath('/');
}

export async function renameWhiteboard(id: string, title: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('whiteboards')
    .update({ title })
    .eq('id', id);

  if (error) throw new Error(error.message);
  
  revalidatePath('/');
}
