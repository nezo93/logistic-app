import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  ShieldCheck, 
  Clock, 
  LogOut, 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle, 
  Upload, 
  Eye, 
  RefreshCw,
  Zap,
  Lock,
  DollarSign
} from 'lucide-react';
import { supabase } from './supabaseClient';

export default function App() {
  // حالة العرض: landing, auth, dashboard
  const [view, setView] = useState('landing');
  const [authMode, setAuthMode] = useState('register'); // register, login
  const [role, setRole] = useState('customer'); // customer, driver

  // بيانات المستخدم والجلسة
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // حقول نموذج التسجيل
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    vehicleType: 'medium', // light, medium, heavy
    licenseFile: null,
    idCardFile: null
  });

  // روابط المعاينة الفورية للصور
  const [licensePreview, setLicensePreview] = useState(null);
  const [idCardPreview, setIdCardPreview] = useState(null);

  // التحقق من الجلسة عند فتح التطبيق
  useEffect(() => {
    checkSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
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
      await fetchProfile(session.user.id);
    } else {
      setLoading(false);
    }
  };

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
      setView('dashboard');
    } catch (err) {
      console.error('خطأ في جلب الملف الشخصي:', err);
    } finally {
      setLoading(false);
    }
  };

  // معالجة النصوص
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // معالجة الصور مع المعاينة الفورية
  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'license') {
      setFormData(prev => ({ ...prev, licenseFile: file }));
      setLicensePreview(URL.createObjectURL(file));
    } else if (type === 'idCard') {
      setFormData(prev => ({ ...prev, idCardFile: file }));
      setIdCardPreview(URL.createObjectURL(file));
    }
  };

  // عملية تسجيل الدخول
  const handleLogin = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (error) throw error;
      await fetchProfile(data.user.id);
    } catch (err) {
      setErrorMsg(err.message === 'Invalid login credentials' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // عملية إنشاء حساب جديد
  const handleRegister = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');

    try {
      if (role === 'driver' && (!formData.licenseFile || !formData.idCardFile)) {
        throw new Error('يرجى إرفاق صورة رخصة القيادة وصورة الهوية الشخصية للمتابعة.');
      }

      // 1. التسجيل في نظام المصادقة
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      });

      if (authErr) throw authErr;
      const userId = authData.user.id;

      let licenseUrl = '';
      let idCardUrl = '';

      // 2. رفع المستندات للسائق
      if (role === 'driver') {
        const licExt = formData.licenseFile.name.split('.').pop();
        const licPath = `${userId}_license.${licExt}`;
        const { error: licErr } = await supabase.storage.from('driver-documents').upload(licPath, formData.licenseFile, { upsert: true });
        if (licErr) throw licErr;
        const { data: licRes } = supabase.storage.from('driver-documents').getPublicUrl(licPath);
        licenseUrl = licRes.publicUrl;

        const idExt = formData.idCardFile.name.split('.').pop();
        const idPath = `${userId}_idcard.${idExt}`;
        const { error: idErr } = await supabase.storage.from('driver-documents').upload(idPath, formData.idCardFile, { upsert: true });
        if (idErr) throw idErr;
        const { data: idRes } = supabase.storage.from('driver-documents').getPublicUrl(idPath);
        idCardUrl = idRes.publicUrl;
      }

      // 3. حفظ بيانات الملف الشخصي
      const { error: profErr } = await supabase.from('profiles').insert([{
        id: userId,
        full_name: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        role: role,
        is_verified: role === 'customer', // العميل يوثق فورا والسائق ينتظر المراجعة
        license_url: licenseUrl,
        id_card_url: idCardUrl
      }]);

      if (profErr) throw profErr;

      // 4. إذا كان سائقاً نضيف مركبته
      if (role === 'driver') {
        await supabase.from('vehicles').insert([{
          driver_id: userId,
          v_type: formData.vehicleType,
          plate_number: 'قيد التسجيل'
        }]);
      }

      await fetchProfile(userId);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // إعادة رفع المستندات للسائق المعلق
  const handleReuploadDoc = async (file, type) => {
    if (!file || !profile) return;
    setActionLoading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${profile.id}_${type}.${ext}`;
      const { error: upErr } = await supabase.storage.from('driver-documents').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: res } = supabase.storage.from('driver-documents').getPublicUrl(path);
      
      const updateField = type === 'license' ? { license_url: res.publicUrl } : { id_card_url: res.publicUrl };
      await supabase.from('profiles').update(updateField).eq('id', profile.id);
      
      alert('تم تحديث المستند بنجاح وهو قيد المراجعة!');
      fetchProfile(profile.id);
    } catch (err) {
      alert('حدث خطأ أثناء الرفع: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // تسجيل الخروج
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

      {/* ============================================================== */}
      {/* 1. الصفحة الترحيبية (Landing Page)                             */}
      {/* ============================================================== */}
      {view === 'landing' && (
        <div className="flex-1 flex flex-col justify-between">
          {/* شريط علوي بسيط */}
          <header className="max-w-6xl w-full mx-auto px-6 py-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-sky-600 text-white p-2.5 rounded-2xl shadow-md shadow-sky-600/20">
                <Truck size={26} />
              </div>
              <span className="text-xl font-extrabold text-slate-900">تريلا الذكية</span>
            </div>
            <button 
              onClick={() => { setView('auth'); setAuthMode('login'); }}
              className="text-xs font-bold text-slate-600 hover:text-sky-600 px-4 py-2 rounded-xl transition-all"
            >
              تسجيل الدخول
            </button>
          </header>

          {/* البانر الترحيبي الرئيسي */}
          <main className="max-w-4xl mx-auto px-6 py-12 text-center flex flex-col items-center">
            <div className="inline-flex items-center gap-2 bg-sky-50 text-sky-700 px-4 py-1.5 rounded-full text-xs font-bold mb-6 border border-sky-100">
              <Zap size={14} className="text-sky-500" />
              الجيل الجديد من النقل اللوجستي في السودان
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight mb-6">
              مرحباً بك في تطبيق <span className="text-sky-600">لوجستي</span> لخدمات النقل
            </h1>

            <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed mb-10">
              المنصة الأذكى والأكثر أماناً لنقل البضائع والمهمات بين المدن وداخلها. تفاوض مباشر، ضمان مالي معتمد عبر بنكك، وتوثيق رقمي يضمن حق الشاحن والناقل.
            </p>

            {/* بطاقات المميزات الرئيسية */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-10 text-right">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-sky-300 transition-all">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3">
                  <Lock size={20} />
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-1">ضمان مالي (Escrow)</h3>
                <p className="text-xs text-slate-500 leading-normal">أموالك محفوظة بأمان ولا تسلم للسائق إلا بعد مسح رمز الاستلام الرقمي.</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-sky-300 transition-all">
                <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center mb-3">
                  <DollarSign size={20} />
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-1">تفاوض حر ومباشر</h3>
                <p className="text-xs text-slate-500 leading-normal">حرية تامة في تقديم وقبول عروض الأسعار داخل التطبيق حسب ظروف السوق.</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-sky-300 transition-all">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-1">سائقون موثقون رسمياً</h3>
                <p className="text-xs text-slate-500 leading-normal">فحص ومطابقة دقيقة لرخص القيادة والهويات الشخصية قبل السماح بأي نقلة.</p>
              </div>
            </div>

            {/* زر البدء */}
            <button 
              onClick={() => { setView('auth'); setAuthMode('register'); }}
              className="bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-sm px-8 py-4 rounded-2xl shadow-lg shadow-sky-600/25 transition-all flex items-center gap-3"
            >
              <span>ابدأ الآن وانضم للمنصة</span>
              <ArrowLeft size={18} />
            </button>
          </main>

          <footer className="text-center py-6 text-xs text-slate-400">
            © {new Date().getFullYear()} منصة تريلا الذكية - جميع الحقوق محفوظة
          </footer>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. شاشات التسجيل والدخول (Auth Screens)                         */}
      {/* ============================================================== */}
      {view === 'auth' && (
        <div className="flex-1 flex flex-col justify-center items-center p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
            
            {/* العودة للرئيسية */}
            <button 
              onClick={() => setView('landing')} 
              className="text-xs text-slate-400 hover:text-slate-700 font-bold mb-4 inline-flex items-center gap-1"
            >
              <ArrowLeft size={14} className="rotate-180" />
              العودة للرئيسية
            </button>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-slate-900 mb-1">
                {authMode === 'register' ? 'تسجيل حساب جديد' : 'تسجيل الدخول'}
              </h2>
              <p className="text-xs text-slate-500">
                {authMode === 'register' ? 'اختر صفتك في المنصة وأدخل بياناتك للمتابعة' : 'أهلاً بك مجدداً! ادخل بيانات حسابك'}
              </p>
            </div>

            {/* رسالة الخطأ */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3 rounded-xl mb-4 font-bold flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* تبديل نوع الحساب في حالة التسجيل */}
            {authMode === 'register' && (
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl mb-5">
                <button 
                  type="button"
                  onClick={() => setRole('customer')}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all ${role === 'customer' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-600'}`}
                >
                  العميل (الشاحن)
                </button>
                <button 
                  type="button"
                  onClick={() => setRole('driver')}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all ${role === 'driver' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600'}`}
                >
                  السائق (الناقل)
                </button>
              </div>
            )}

            {/* النموذج */}
            <form onSubmit={authMode === 'register' ? handleRegister : handleLogin} className="space-y-4">
              
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {role === 'driver' ? 'الاسم الرباعي (كما في الأوراق الثبوتية)' : 'الاسم الكامل'}
                    </label>
                    <input 
                      type="text" 
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder={role === 'driver' ? 'محمد أحمد إبراهيم علي' : 'محمد أحمد'}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف (مفتاح التواصل الأساسي)</label>
                    <input 
                      type="tel" 
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="0912345678"
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {role === 'driver' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">نوع المركبة المبدئي</label>
                      <select 
                        name="vehicleType"
                        value={formData.vehicleType}
                        onChange={handleInputChange}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-sky-500 bg-white"
                      >
                        <option value="light">نقل خفيف (وانيت / بوكس / نصف نقل)</option>
                        <option value="medium">نقل متوسط (دفار / شاحنة 5-10 طن)</option>
                        <option value="heavy">نقل ثقيل (تريلا / قطار / شاحنة قلاب)</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                <input 
                  type="email" 
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="name@example.com"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور</label>
                <input 
                  type="password" 
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* حقول رفع وتدقيق مستندات السائق مع المعاينة الفورية */}
              {authMode === 'register' && role === 'driver' && (
                <div className="space-y-4 pt-3 border-t border-slate-100">
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-800 leading-relaxed">
                    ⚠️ يتطلب توثيق حساب السائق رفع صور واضحة لمطابقتها قبل تفعيل إمكانية قبول الرحلات.
                  </div>

                  {/* رخصة القيادة */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">صورة رخصة القيادة</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      required
                      onChange={(e) => handleFileChange(e, 'license')}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                    {licensePreview && (
                      <div className="mt-2 relative rounded-xl overflow-hidden border border-slate-200 h-28 bg-slate-100 flex items-center justify-center">
                        <img src={licensePreview} alt="معاينة الرخصة" className="h-full w-full object-cover" />
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">معاينة الرخصة</span>
                      </div>
                    )}
                  </div>

                  {/* البطاقة القومية */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">صورة البطاقة القومية / الهوية</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      required
                      onChange={(e) => handleFileChange(e, 'idCard')}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                    {idCardPreview && (
                      <div className="mt-2 relative rounded-xl overflow-hidden border border-slate-200 h-28 bg-slate-100 flex items-center justify-center">
                        <img src={idCardPreview} alt="معاينة الهوية" className="h-full w-full object-cover" />
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">معاينة الهوية</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button 
                type="submit"
                disabled={actionLoading}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-extrabold py-3.5 rounded-2xl text-xs transition-all shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 mt-4"
              >
                {actionLoading ? 'جاري المعالجة...' : authMode === 'register' ? 'إنشاء الحساب والمتابعة' : 'تسجيل الدخول'}
              </button>
            </form>

            {/* التبديل بين التسجيل والدخول */}
            <div className="text-center mt-6 pt-4 border-t border-slate-100">
              {authMode === 'register' ? (
                <p className="text-xs text-slate-500">
                  هل لديك حساب بالفعل؟{' '}
                  <button 
                    onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
                    className="text-sky-600 font-extrabold hover:underline"
                  >
                    تسجيل الدخول
                  </button>
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  ليس لديك حساب بعد؟{' '}
                  <button 
                    onClick={() => { setAuthMode('register'); setErrorMsg(''); }}
                    className="text-sky-600 font-extrabold hover:underline"
                  >
                    تسجيل حساب جديد
                  </button>
                </p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. الشاشة الرئيسية ولوحة التحكم (Dashboard)                     */}
      {/* ============================================================== */}
      {view === 'dashboard' && profile && (
        <div className="flex-1 flex flex-col">
          
          {/* شريط علوي للوحة التحكم */}
          <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30">
            <div className="max-w-6xl mx-auto flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-sky-600 text-white p-2 rounded-xl">
                  <Truck size={22} />
                </div>
                <span className="font-black text-slate-900">تريلا الذكية</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900">{profile.full_name}</p>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                    {profile.role === 'customer' ? 'عميل شاحن' : 'كابتن شاحنة'}
                  </span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <LogOut size={14} />
                  <span>تسجيل خروج</span>
                </button>
              </div>
            </div>
          </header>

          {/* محتوى الشاشة بحسب حالة السائق أو العميل */}
          <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col justify-center">

            {/* أ- في حالة السائق المعلق (Driver Pending Verification) */}
            {profile.role === 'driver' && !profile.is_verified ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
                  <Clock size={32} className="animate-pulse" />
                </div>

                <h2 className="text-xl font-black text-slate-900 mb-2">مستنداتك قيد التدقيق والمراجعة</h2>
                
                <div className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-2xl max-w-lg mx-auto mb-6 text-xs text-amber-900 leading-relaxed">
                  مستنداتك قيد التدقيق لدى قسم العمليات، سيتم التحقق من رخصة القيادة والهوية الشخصية وتفعيل حسابك خلال 24 ساعة.
                </div>

                {/* أزرار العمليات المعطلة */}
                <div className="flex flex-col sm:flex-row justify-center gap-3 mb-8 opacity-50 cursor-not-allowed">
                  <button disabled className="bg-slate-200 text-slate-500 font-bold text-xs px-6 py-3 rounded-xl">
                    البحث عن شحنات قريبة (معطل)
                  </button>
                  <button disabled className="bg-slate-200 text-slate-500 font-bold text-xs px-6 py-3 rounded-xl">
                    استقبال طلبات النقل (معطل)
                  </button>
                </div>

                {/* إمكانية إعادة رفع المستندات في حال وجود خطأ */}
                <div className="border-t border-slate-100 pt-6 max-w-md mx-auto text-right">
                  <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1">
                    <RefreshCw size={14} className="text-sky-600" />
                    تحديث أو إعادة رفع المستندات:
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-xs text-slate-600">رخصة القيادة</span>
                      <label className="bg-white border border-slate-300 hover:border-sky-500 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all">
                        تعديل الملف
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleReuploadDoc(e.target.files[0], 'license')} />
                      </label>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-xs text-slate-600">الهوية الشخصية</span>
                      <label className="bg-white border border-slate-300 hover:border-sky-500 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all">
                        تعديل الملف
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleReuploadDoc(e.target.files[0], 'idCard')} />
                      </label>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              /* ب- في حالة العميل أو السائق المعتمد (Active Dashboard) */
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                  <CheckCircle size={32} />
                </div>
                
                <h2 className="text-2xl font-black text-slate-900 mb-2">
                  مرحباً بك، {profile.full_name}!
                </h2>
                
                <p className="text-xs text-slate-500 mb-6">
                  {profile.role === 'customer' 
                    ? 'أنت جاهز الآن لطلب شحنات جديدة والتفاوض مع كباتن الشاحنات.' 
                    : 'حسابك موثق ومعتمد بالكامل! يمكنك الآن استقبال طلبات الشحن وبدء النقل.'}
                </p>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 inline-block text-right text-xs space-y-2 mb-6 min-w-[280px]">
                  <p><span className="font-bold text-slate-700">رقم الهاتف:</span> {profile.phone || 'غير مسجل'}</p>
                  <p><span className="font-bold text-slate-700">البريد:</span> {profile.email}</p>
                  <p><span className="font-bold text-slate-700">نوع الحساب:</span> {profile.role === 'customer' ? 'عميل شاحن' : 'سائق معتمد'}</p>
                  <p><span className="font-bold text-slate-700">حالة التوثيق:</span> <span className="text-emerald-600 font-bold">موثق ومفعل ✓</span></p>
                </div>

                <div className="block">
                  <button 
                    onClick={handleLogout}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-6 py-2.5 rounded-xl transition-all"
                  >
                    تسجيل الخروج
                  </button>
                </div>
              </div>
            )}

          </main>
        </div>
      )}

    </div>
  );
}
