import React, { createContext, useContext, useState, useEffect } from 'react';

interface AdminProxyContextType {
  adminMode: boolean;
  adminId: string | null;
  actingAsUserId: string | null;
  actingAsUserEmail: string | null;
  actingAsUserName: string | null;
  setAdminProxy: (userId: string, email: string, name: string) => void;
  clearAdminProxy: () => void;
}

const AdminProxyContext = createContext<AdminProxyContextType | undefined>(undefined);

export function AdminProxyProvider({ children }: { children: React.ReactNode }) {
  const [adminMode, setAdminMode] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [actingAsUserId, setActingAsUserId] = useState<string | null>(null);
  const [actingAsUserEmail, setActingAsUserEmail] = useState<string | null>(null);
  const [actingAsUserName, setActingAsUserName] = useState<string | null>(null);

  useEffect(() => {
    // Load from sessionStorage on mount
    const storedAdminMode = sessionStorage.getItem('adminMode');
    const storedAdminId = sessionStorage.getItem('adminId');
    const storedActingAsUserId = sessionStorage.getItem('actingAsUserId');
    const storedActingAsUserEmail = sessionStorage.getItem('actingAsUserEmail');
    const storedActingAsUserName = sessionStorage.getItem('actingAsUserName');

    if (storedAdminMode === 'true') {
      setAdminMode(true);
      setAdminId(storedAdminId);
      setActingAsUserId(storedActingAsUserId);
      setActingAsUserEmail(storedActingAsUserEmail);
      setActingAsUserName(storedActingAsUserName);
    }
  }, []);

  const setAdminProxy = (userId: string, email: string, name: string) => {
    // Get the current admin's ID from session
    import('@/integrations/supabase/client').then(({ supabase }) => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          const currentAdminId = user.id;
          
          setAdminMode(true);
          setAdminId(currentAdminId);
          setActingAsUserId(userId);
          setActingAsUserEmail(email);
          setActingAsUserName(name);

          sessionStorage.setItem('adminMode', 'true');
          sessionStorage.setItem('adminId', currentAdminId);
          sessionStorage.setItem('actingAsUserId', userId);
          sessionStorage.setItem('actingAsUserEmail', email);
          sessionStorage.setItem('actingAsUserName', name);
        }
      });
    });
  };

  const clearAdminProxy = () => {
    setAdminMode(false);
    setAdminId(null);
    setActingAsUserId(null);
    setActingAsUserEmail(null);
    setActingAsUserName(null);

    sessionStorage.removeItem('adminMode');
    sessionStorage.removeItem('adminId');
    sessionStorage.removeItem('actingAsUserId');
    sessionStorage.removeItem('actingAsUserEmail');
    sessionStorage.removeItem('actingAsUserName');
  };

  return (
    <AdminProxyContext.Provider
      value={{
        adminMode,
        adminId,
        actingAsUserId,
        actingAsUserEmail,
        actingAsUserName,
        setAdminProxy,
        clearAdminProxy,
      }}
    >
      {children}
    </AdminProxyContext.Provider>
  );
}

export function useAdminProxy() {
  const context = useContext(AdminProxyContext);
  if (context === undefined) {
    throw new Error('useAdminProxy must be used within an AdminProxyProvider');
  }
  return context;
}
