export function showSupabaseError(toast: any, where: string, err: any) {
  const msg = (err?.message || err?.error_description || err?.hint || 'Unknown error');
  console.error(`[Supabase] ${where}:`, err);
  toast({
    title: 'Error',
    description: `${where}: ${msg}`,
    variant: 'destructive'
  });
  return msg;
}