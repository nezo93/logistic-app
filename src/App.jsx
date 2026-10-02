import React, { useState } from 'react';
import { Truck, User, ShieldAlert, Upload, CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function App() {
  // حالة التنقل بين صفحات المصادقة والتطبيق
  const [view, setView] = useState('register'); // register, login, dashboard
  const [role, setRole] = useState('customer'); // customer, driver
  
  // حقول نموذج التسجيل
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    licenseFile: null,
    idCardFile: null
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // التعامل مع إدخال النصوص
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // التعامل مع اختيار الملفات (الرخصة والهوية)
  const handleFileChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.files[0] });
  };

  // تنفيذ عملية التسجيل الحقيقي عبر Supabase
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      // 1. إنشاء الحساب في نظام المصادقة
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;
      const userId = authData.user.id;

      let licenseUrl = '';
      let idCardUrl = '';

      // 2. إذا كان المستخدم سائقاً، نقوم برفع صور الرخصة والهوية إلى سوبابيز ستورج
      if (role === 'driver') {
        if (formData.licenseFile) {
          const fileExt = formData.licenseFile.name.split('.').pop();
          const fileName = `${userId}_license.${fileExt}`;
          const { error: licError } = await supabase.storage.from('driver-documents').upload(fileName, formData.licenseFile);
          if (licError) throw licError;
          const { data: licData } = supabase.storage.from('driver-documents').getPublicUrl(fileName);
          licenseUrl = licData.publicUrl;
        }

        if (formData.idCardFile) {
          const fileExt = formData.idCardFile.name.split('.').pop();
          const fileName = `${userId}_idcard.${fileExt}`;
          const { error: idError } = await supabase.storage.from('driver-documents').upload(fileName, formData.idCardFile);
          if (idError) throw idError;
          const { data: idData } = supabase.storage.from('driver-documents').getPublicUrl(fileName);
          idCardUrl = idData.publicUrl;
        }
      }

      // 3. حفظ بيانات المستخدم الإضافية في جدول profiles
      const { error: profileError } = await supabase.from('profiles').insert([
        {
          id: userId,
          full_name: formData.fullName,
          email: formData.email,
          role: role,
          is_verified: role === 'customer' ? true : false, // السائق يبدأ غير موثق لحين مراجعة الإدارة
          license_url: licenseUrl,
          id_card_url: idCardUrl
        }
      ]);

      if (profileError) throw profileError;

      alert(role === 'driver' ? 'تم تسجيل الحساب بنجاح! حسابك قيد المراجعة من الإدارة للتحقق من المستندات.' : 'تم إنشاء الحساب وتسجيل الدخول بنجاح!');
      setView('dashboard');

    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" dir="rtl">
      {/* شريط علوي */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-sky-600 p-2 rounded-xl text-white">
            <Truck size={24} />
          </div>
          <h1 className="text-lg font-extrabold text-slate-800">تريلا الذكية</h1>
        </div>
        {view !== 'dashboard' && (
          <div className="text-xs text-slate-500">
            لديك حساب بالفعل؟ <button onClick={() => setView('login')} className="text-sky-600 font-bold hover:underline">تسجيل الدخول</button>
          </div>
        )}
      </header>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 flex items-center justify-center p-4">
        
        {view === 'register' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-lg w-full">
            <h2 className="text-xl font-black text-slate-800 mb-2">إنشاء حساب جديد</h2>
            <p className="text-xs text-slate-500 mb-6">اختر نوع الحساب وابدأ رحلتك معنا بكل أمان.</p>

            {/* اختيار الدور */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                type="button"
                onClick={() => setRole('customer')}
                className={`py-3 px-4 rounded-xl font-bold text-xs border transition-all ${role === 'customer' ? 'border-sky-600 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-600'}`}
              >
                تسجيل كـ (عميل / شاحن)
              </button>
              <button
                type="button"
                onClick={() => setRole('driver')}
                className={`py-3 px-4 rounded-xl font-bold text-xs border transition-all ${role === 'driver' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}
              >
                تسجيل كـ (سائق / كابتن)
              </button>
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3 rounded-xl mb-4 font-bold">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {role === 'driver' ? 'الاسم الرباعي الكامل' : 'الاسم الكامل'}
                </label>
                <input 
                  type="text" 
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder={role === 'driver' ? 'محمد أحمد علي عمر' : 'محمد أحمد'}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                <input 
                  type="email5" 
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-sky-500"
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
                  placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* حقول خاصة بالسائق (رفع المستندات) */}
              {role === 'driver' && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-800">
                    ⚠️ يتطلب حساب السائق رفع المستندات الرسمية لكي تتمكن الإدارة من مطابقتها وتفعيل حسابك.
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">صورة رخصة القيادة</label>
                    <input 
                      type="file" 
                      name="licenseFile"
                      required
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">صورة البطاقة الشخصية (الهوية)</label>
                    <input 
                      type="file" 
                      name="idCardFile"
                      required
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                  </div>
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2 mt-6"
              >
                {loading ? 'جاري إنشاء الحساب ورفع الملفات...' : 'إتمام التسجيل'}
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        )}

        {view === 'dashboard' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full text-center">
            <CheckCircle size={54} className="mx-auto text-emerald-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">مرحباً بك في المنصة!</h2>
            <p className="text-xs text-slate-500 mb-6">تم تسجيل حسابك بنجاح وقاعدة البيانات استقبلت بياناتك ومستنداتك بنجاح.</p>
            <button 
              onClick={() => setView('register')} 
              className="bg-slate-100 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl"
            >
              تسجيل الخروج والعودة
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
