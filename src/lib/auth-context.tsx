"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-browser";
import { puede, type Rol } from "@/lib/permissions";

export interface Perfil {
  nombre: string;
  rol: Rol;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  perfil: Perfil | null;
  loading: boolean;
  puede: (permiso: Parameters<typeof puede>[1]) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  perfil: null,
  loading: true,
  puede: () => false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);

  async function cargarPerfil(uid: string) {
    const { data } = await supabase.from("perfiles").select("nombre, rol").eq("id", uid).single();
    setPerfil(data ? { nombre: data.nombre, rol: data.rol } : null);
  }

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) cargarPerfil(session.user.id);
      setLoading(false);
    });

    // Escuchar cambios (login / logout / refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) cargarPerfil(session.user.id);
      else setPerfil(null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{
      user, session, perfil, loading,
      puede: (permiso) => puede(perfil?.rol, permiso),
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
