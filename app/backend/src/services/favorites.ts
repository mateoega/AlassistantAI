import type { SupabaseClient } from '@supabase/supabase-js';
import { LISTING_SELECT, presentListings } from './listings.js';

/**
 * Los favoritos: los vehículos que un usuario guardó para volver a verlos.
 *
 * SEGURIDAD: todo pasa por el cliente del usuario. Las reglas de acceso de la
 * base son las que garantizan que nadie lea ni toque los favoritos de otro —
 * este archivo filtra por `user_id` además, pero si se olvidara de hacerlo la
 * base seguiría devolviendo solo los propios.
 */

/**
 * Solo los identificadores. Es lo que necesita el muro para saber cuáles de
 * las publicaciones que está mostrando ya están guardadas, sin traerse las
 * publicaciones enteras una segunda vez.
 */
export async function listFavoriteIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`No se pudieron leer los favoritos: ${error.message}`);
  }

  return ((data ?? []) as { listing_id: string }[]).map((row) => row.listing_id);
}

/**
 * Los favoritos con la publicación entera, para la pantalla.
 *
 * Vienen ordenados por cuándo se guardaron, el último primero. No por precio
 * ni por año: el orden que tiene sentido acá es el de la propia búsqueda del
 * que guardó.
 *
 * `unavailable` cuenta los que ya no se pueden mostrar. Pasa cuando el
 * vendedor pausa un aviso: la base deja de devolverlo y el favorito queda
 * apuntando a algo invisible. No se sabe nada de esos vehículos —ni la marca—,
 * así que lo único honesto que se puede hacer es decir cuántos son.
 */
export async function listFavorites(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('favorites')
    .select(`created_at, listing:listings ( ${LISTING_SELECT} )`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`No se pudieron leer los favoritos: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as { listing: unknown | null }[];
  const visible = rows.filter((row) => row.listing !== null).map((row) => row.listing);

  return {
    listings: await presentListings(visible),
    unavailable: rows.length - visible.length,
  };
}

/**
 * Guardar es idempotente: apretar dos veces deja el vehículo guardado una vez
 * y no falla. Que la clave primaria sea el par usuario-publicación es lo que
 * lo hace posible sin preguntar antes si ya estaba.
 */
export async function addFavorite(
  supabase: SupabaseClient,
  userId: string,
  listingId: string,
): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .upsert({ user_id: userId, listing_id: listingId }, { ignoreDuplicates: true });

  if (error) {
    throw new Error(`No se pudo guardar el vehículo: ${error.message}`);
  }
}

/** Sacar también es idempotente: sacar algo que no estaba no es un error. */
export async function removeFavorite(
  supabase: SupabaseClient,
  userId: string,
  listingId: string,
): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('listing_id', listingId);

  if (error) {
    throw new Error(`No se pudo sacar el vehículo de tus guardados: ${error.message}`);
  }
}
