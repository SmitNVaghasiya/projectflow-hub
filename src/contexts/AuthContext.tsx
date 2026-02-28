import React, { createContext, useContext, useEffect, useState } from "react";
import { apiGetMe, apiSignup, apiLogin, apiUpdateMe, apiDeleteAccount, clearToken, type ApiUser } from "@/lib/api";

interface AuthContextType {
  user: ApiUser | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { display_name?: string }) => Promise<{ error: string | null }>;
  deleteAccount: () => Promise<{ error: string | null }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if we have a stored token and fetch the user
  useEffect(() => {
    const token = localStorage.getItem("projecthub_token");
    if (!token) {
      setLoading(false);
      return;
    }
    apiGetMe().then(({ data, error }) => {
      if (data && !error) {
        setUser(data);
      } else {
        clearToken();
      }
      setLoading(false);
    });
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await apiSignup(email, password, displayName);
    if (data?.user) {
      setUser(data.user);
    }
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await apiLogin(email, password);
    if (data?.user) {
      setUser(data.user);
    }
    return { error };
  };

  const signOut = async () => {
    clearToken();
    setUser(null);
  };

  const updateProfile = async (updates: { display_name?: string }) => {
    const { data, error } = await apiUpdateMe(updates);
    if (data) setUser(data);
    return { error };
  };

  const deleteAccount = async () => {
    const { error } = await apiDeleteAccount();
    if (!error) setUser(null);
    return { error };
  };

  const refreshUser = async () => {
    const { data } = await apiGetMe();
    if (data) setUser(data);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signUp, signIn, signOut, updateProfile, deleteAccount, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
