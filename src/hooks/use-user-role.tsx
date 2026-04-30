import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type AppRole = "admin" | "user";

/**
 * Lê as roles do usuário logado em public.user_roles.
 * Retorna { isAdmin, roles, loading }.
 */
export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (cancelled) return;
      if (error) {
        console.error("[user_roles] load error", error);
        setRoles([]);
      } else {
        setRoles((data ?? []).map((r) => r.role as AppRole));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { roles, isAdmin: roles.includes("admin"), loading };
}
