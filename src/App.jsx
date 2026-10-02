import React, { useState } from 'react';
import { Truck, CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function App() {
  const [view, setView] = useState('register');
  const [role, setRole] = useState('customer');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    licenseFile: null,
    idCardFile: null
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.files[0] });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      // 1. تسجيل الحساب في Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;
      const userId = authData.user.id;

      let licenseUrl = '';
      let idCardUrl = '';

      // 2. رفع صور السائق إذا وجِدت
      if (role === 'driver') {
        if (formData.licenseFile) {
          const fileExt = formData.licenseFile.name.split('.').pop();
          const fileName = `${userId}_license.${fileExt}`;
          const { error: licError } = await supabase.storage.from('driver-documents').upload(fileName, formData.licenseFile, { upsert: true });
          if (licError) console.warn("خطأ في رفع الرخصة:", licError.message);
          else {
            const { data: licData } = supabase.storage.from('driver-documents').getPublicUrl(fileName);
            licenseUrl = licData.publicUrl;
          }
        }

        if (formData.idCardFile) {
          const fileExt = formData.idCardFile.name.split('.').pop();
          const fileName = `${userId}_idcard.${fileExt}`;
          const { error: idError } = await supabase.storage.from('driver-documents').upload(fileName, formData.idCardFile, { upsert: true });
          if (idError) console.warn("خطأ في رفع الهوية:", idError.message);
          else {
            const { data: idData } = supabase.storage.from('driver-documents').getPublicUrl(fileName);
            idCardUrl = idData.publicUrl;
          }
        }
      }

      // 3. حفظ البيانات في جدول profiles
      const { error: profileError } = await supabase.from('profiles').insert([
        {
          id: userId,
          full_name: formData.fullName,
          email: formData.email,
          role: role,
          is_verified: role === 'customer' ? true : false,
          license_url: licenseUrl,
          id_card_url: idCardUrl
        }
      ]);

      if (profileError) throw profileError;

      alert('تم إنشاء الحساب بنجاح!');
      setView('dashboard');

    } catch (error) {
      console.error("خطأ مفصل:", error);
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" dir="rtl">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-sky-600 p-2 rounded-xl text-white">
            <Truck size={24} />
          </div>
          <h1 className="text-lg font-extrabold text-slate-800">تريلا الذكية</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        {view === 'register' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-lg w-full">
            <h2 className="text-xl font-black text-slate-800 mb-2">إنشاء حساب جديد</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                type="button"
                onClick={() => setRole('customer')}
                className={`py-3 px-4 rounded-xl font-bold text-xs border transition-all ${role === 'customer' ? 'border-sky-600 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-600'}`}
              >
                عميل (شاحن)
              </button>
              <button
                type="button"
                onClick={() => setRole('driver')}
                className={`py-3 px-4 rounded-xl font-bold text-xs border transition-all ${role === 'driver' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}
              >
                سائق (كابتن)
              </button>
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3 rounded-xl mb-4 font-bold">
                خطأ: {errorMessage}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم</label>
                <input 
                  type="text" 
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                <input 
                  type="email" 
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">كلمة السر</label>
                <input 
                  type="password" 
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs"
                />
              </div>

              {role === 'driver' && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رخصة القيادة</label>
                    <input 
                      type="file" 
                      name="licenseFile"
                      required
                      onChange={handleFileChange}
                      className="w-full text-xs text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الهوية الشخصية</label>
                    <input 
                      type="file" 
                      name="idCardFile"
                      required
                      onChange={handleFileChange}
                      className="w-full text-xs text-slate-500"
                    />
                  </div>
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 mt-6"
              >
                {loading ? 'جاري التسجيل...' : 'إتمام التسجيل'}
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        )}

        {view === 'dashboard' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full text-center">
            <CheckCircle size={54} className="mx-auto text-emerald-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">تم بنجاح!</h2>
            <button onClick={() => setView('register')} className="bg-slate-100 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl mt-4">
              تسجيل خروج
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
