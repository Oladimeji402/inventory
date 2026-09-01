import { isSupabaseConfigured, supabase } from './supabase';
import { isValidStoreSlug, RESERVED_SLUGS, slugifyStoreName } from './merchantConstants';

export async function checkStoreSlug(raw) {
  const slug = slugifyStoreName(raw);
  if (!isValidStoreSlug(slug)) {
    return { slug, status: 'invalid' };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { slug, status: 'reserved' };
  }
  if (!isSupabaseConfigured) {
    return { slug, status: 'error', error: 'Store URL checks are not configured.' };
  }

  const { data, error } = await supabase.rpc('is_slug_available', { p_slug: slug });
  if (error) {
    return { slug, status: 'error', error: error.message };
  }
  return { slug, status: data ? 'available' : 'taken' };
}
