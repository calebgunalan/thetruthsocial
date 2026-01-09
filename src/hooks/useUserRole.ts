import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "moderator" | "user";

interface UserRole {
  role: AppRole;
  granted_at: string;
}

export const useUserRole = (userId: string | null) => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setRoles([]);
      setIsAdmin(false);
      setIsModerator(false);
      setLoading(false);
      return;
    }

    const fetchRoles = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role, granted_at")
          .eq("user_id", userId);

        if (error) throw error;

        const userRoles = (data || []) as UserRole[];
        setRoles(userRoles);
        setIsAdmin(userRoles.some((r) => r.role === "admin"));
        setIsModerator(userRoles.some((r) => r.role === "moderator"));
      } catch (error) {
        console.error("Error fetching user roles:", error);
        setRoles([]);
        setIsAdmin(false);
        setIsModerator(false);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [userId]);

  return {
    roles,
    isAdmin,
    isModerator,
    isAdminOrModerator: isAdmin || isModerator,
    loading,
  };
};
