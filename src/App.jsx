import React, { useState, useEffect } from 'react';
import { Truck } from 'lucide-react';
import { supabase } from './supabaseClient';

import LandingPage from './components/LandingPage';
import AuthScreen from './components/AuthScreen';
import AdminDashboard from './components/AdminDashboard';
import Dashboard from './components/Dashboard';

export default function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'auth' | 'dashboard' | 'admin'
  const [authMode, setAuthMode] = useState('login');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();

    // مراقبة المصادقة بدون إعادة توجيه إجباري يغلق الشاشات
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id, false); // false تعني عدم تغيير الصفحة تلقائياً
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => authListener?.subscription?.unsubscribe();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchProfile(session.user.id, false);
    } else {
      setLoading(false);
    }
  };

  // دالة جلب البيانات مع تحكم ذكي في التوجيه
  const fetchProfile = async (userId, autoRedirect = true) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);

      // التوجيه التلقائي يحدث فقط عند تسجيل الدخول الفعلي وليس تجديد الجلسة
      if (autoRedirect) {
        setView('dashboard');
      }
    } catch (err) {
      console.error('خطأ في جلب الملف الشخصي:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (targetView, mode = 'login') => {
    setAuthMode(mode);
    setView(targetView);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setView('landing');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center font-sans text-white">
        <div className="text-center">
          <Truck size={48} className="animate-bounce text-sky-400 mx-auto mb-3" />
          <p className="text-sm font-bold tracking-wide">جاري تشغيل منصة تريلا الذكية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" dir="rtl">
      {view === 'landing' && (
        <LandingPage onNavigate={handleNavigate} />
      )}

      {view === 'auth' && (
        <AuthScreen 
          initialMode={authMode} 
          onNavigate={handleNavigate} 
          onAuthSuccess={(userId) => fetchProfile(userId, true)} 
        />
      )}

      {view === 'dashboard' && profile && (
        <Dashboard 
          profile={profile} 
          onLogout={handleLogout} 
          onRefreshProfile={() => fetchProfile(profile.id, false)} 
        />
      )}

      {view === 'admin' && (
        <AdminDashboard 
          onNavigate={handleNavigate} 
        />
      )}
    </div>
  );
}
