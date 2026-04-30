import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Hook genérico para sincronizar uma coleção do usuário com uma tabela Supabase.
 *
 * - Mantém a API parecida com useState: [items, setItems, { loading, refresh }]
 * - Faz diff entre estado anterior e novo para gerar INSERT / UPDATE / DELETE.
 * - As tabelas devem ter colunas: id (uuid), user_id (uuid) + RLS por auth.uid().
 *
 * `mapToDb` converte item do app -> linha do banco (sem id/user_id).
 * `mapFromDb` converte linha do banco -> item do app (com id).
 */
export function useSupabaseCollection<TItem extends { id: string }, TRow extends { id: string }>(
  table: string,
  mapToDb: (item: TItem) => Record<string, unknown>,
  mapFromDb: (row: TRow) => TItem,
) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItemsState] = useState<TItem[]>([]);
  const [loading, setLoading] = useState(true);
  const lastRef = useRef<TItem[]>([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setItemsState([]);
      lastRef.current = [];
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (error) {
      console.error(`[${table}] load error`, error);
      setLoading(false);
      return;
    }
    const mapped = (data as TRow[]).map(mapFromDb);
    lastRef.current = mapped;
    setItemsState(mapped);
    setLoading(false);
  }, [user, table, mapFromDb]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  const setItems = useCallback(
    (next: TItem[] | ((prev: TItem[]) => TItem[])) => {
      setItemsState((prev) => {
        const newItems = typeof next === "function" ? (next as (p: TItem[]) => TItem[])(prev) : next;
        if (!user) {
          lastRef.current = newItems;
          return newItems;
        }
        const oldItems = lastRef.current;
        const oldMap = new Map(oldItems.map((i) => [i.id, i]));
        const newMap = new Map(newItems.map((i) => [i.id, i]));

        const toInsert: TItem[] = [];
        const toUpdate: TItem[] = [];
        const toDelete: string[] = [];

        for (const it of newItems) {
          const old = oldMap.get(it.id);
          if (!old) toInsert.push(it);
          else if (JSON.stringify(old) !== JSON.stringify(it)) toUpdate.push(it);
        }
        for (const it of oldItems) {
          if (!newMap.has(it.id)) toDelete.push(it.id);
        }

        lastRef.current = newItems;

        (async () => {
          try {
            if (toInsert.length) {
              const rows = toInsert.map((it) => ({
                id: it.id,
                user_id: user.id,
                ...mapToDb(it),
              }));
              const { error } = await supabase.from(table).insert(rows);
              if (error) console.error(`[${table}] insert`, error);
            }
            for (const it of toUpdate) {
              const { error } = await supabase
                .from(table)
                .update(mapToDb(it))
                .eq("id", it.id)
                .eq("user_id", user.id);
              if (error) console.error(`[${table}] update`, error);
            }
            if (toDelete.length) {
              const { error } = await supabase
                .from(table)
                .delete()
                .in("id", toDelete)
                .eq("user_id", user.id);
              if (error) console.error(`[${table}] delete`, error);
            }
          } catch (e) {
            console.error(`[${table}] sync error`, e);
          }
        })();

        return newItems;
      });
    },
    [user, table, mapToDb],
  );

  return [items, setItems, { loading, refresh }] as const;
}
