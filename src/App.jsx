import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  ShieldCheck, 
  Clock, 
  LogOut, 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Zap,
  Lock,
  DollarSign,
  Camera,
  ShieldAlert,
  X,
  ZoomIn,
  Send,
  UserCheck,
  UserX,
  MessageCircle,
  Search,
  Users,
  Ban,
  Phone,
  Mail,
  FileText
} from 'lucide-react';
import { supabase } from './supabaseClient';

export default function App() {
  // حالة العرض: landing, auth, dashboard, admin
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
    vehicleType: 'medium',
    licenseFile: null,
    idCardFile: null,
    selfieFile: null
  });

  // روابط المعاينة الفورية
  const [licensePreview, setLicensePreview] = useState(null);
  const [idCardPreview, setIdCardPreview] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);

  // حالات لوحة المشرف
  const [driversList, setDriversList] = useState([]);
  const [adminTab, setAdminTab] = useState('pending'); // pending, approved, rejected
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedRejectTemplate, setSelectedRejectTemplate] = useState('');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);

  // قوالب أسباب الرفض الجاهزة
  const rejectionTemplates = [
    'صورة رخصة القيادة غير واضحة أو باهتة، يرجى إعادة تصويرها.',
    'صورة البطاقة القومية/الهوية غير مكتملة الحواف أو منتهية الصلاحية.',
    'الصورة الشخصية (السيلفي) غير مطابقة للوجه في الهوية الرسمية.',
    'المستندات المرفوعة لا تخص صاحب الطلب المسجل.',
    'سبب مخصص (كتابة نص آخر)...'
  ];

  // التحقق من الجلسة
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

  // جلب السائقين للوحة الإدارة
  const fetchDriversForAdmin = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDriversList(data || []);
    } catch (err) {
      console.error('خطأ في جلب السائقين للإدارة:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'license') {
      setFormData(prev => ({ ...prev, licenseFile: file }));
      setLicensePreview(URL.createObjectURL(file));
    } else if (type === 'idCard') {
      setFormData(prev => ({ ...prev, idCardFile: file }));
      setIdCardPreview(URL.createObjectURL(file));
    } else if (type === 'selfie') {
      setFormData(prev => ({ ...prev, selfieFile: file }));
      setSelfiePreview(URL.createObjectURL(file));
    }
  };

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

  const handleRegister = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');

    try {
      if (role === 'driver' && (!formData.licenseFile || !formData.idCardFile || !formData.selfieFile)) {
        throw new Error('يرجى إرفاق صورة رخصة القيادة، الهوية الشخصية، وصورة السيلفي للمتابعة.');
      }

      // 1. التسجيل في auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      });

      if (authErr) throw authErr;
      const userId = authData.user.id;

      let licenseUrl = '';
      let idCardUrl = '';
      let selfieUrl = '';

      // 2. رفع المستندات بهيكلية drivers/[user_id]/[type].[ext]
      if (role === 'driver') {
        // رخصة
        const licExt = formData.licenseFile.name.split('.').pop();
        const licPath = `drivers/${userId}/license.${licExt}`;
        const { error: licErr } = await supabase.storage.from('driver-documents').upload(licPath, formData.licenseFile, { upsert: true });
        if (licErr) throw licErr;
        const { data: licRes } = supabase.storage.from('driver-documents').getPublicUrl(licPath);
        licenseUrl = licRes.publicUrl;

        // هوية
        const idExt = formData.idCardFile.name.split('.').pop();
        const idPath = `drivers/${userId}/idcard.${idExt}`;
        const { error: idErr } = await supabase.storage.from('driver-documents').upload(idPath, formData.idCardFile, { upsert: true });
        if (idErr) throw idErr;
        const { data: idRes } = supabase.storage.from('driver-documents').getPublicUrl(idPath);
        idCardUrl = idRes.publicUrl;

        // سيلفي
        const selfieExt = formData.selfieFile.name.split('.').pop();
        const selfiePath = `drivers/${userId}/selfie.${selfieExt}`;
        const { error: selfieErr } = await supabase.storage.from('driver-documents').upload(selfiePath, formData.selfieFile, { upsert: true });
        if (selfieErr) throw selfieErr;
        const { data: selfieRes } = supabase.storage.from('driver-documents').getPublicUrl(selfiePath);
        selfieUrl = selfieRes.publicUrl;
      }

      // 3. حفظ بيانات الملف الشخصي
      const { error: profErr } = await supabase.from('profiles').insert([{
        id: userId,
        full_name: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        role: role,
        is_verified: role === 'customer',
        driver_status: role === 'customer' ? 'approved' : 'pending',
        license_url: licenseUrl,
        id_card_url: idCardUrl,
        selfie_url: selfieUrl
      }]);

      if (profErr) throw profErr;

      // 4. إضافة مركبة
      if (role === 'driver') {
        await supabase.from('vehicles').insert([{
          driver_id: userId,
          v_type: formData.vehicleType,
          plate_number: 'قيد المراجعة'
        }]);
      }

      await fetchProfile(userId);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // اعتماد السائق
  const handleApproveDriver = async (driverId) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_verified: true, 
          driver_status: 'approved',
          rejection_reason: null 
        })
        .eq('id', driverId);

      if (error) throw error;
      alert('تم اعتماد وتفعيل حساب السائق بنجاح!');
      setSelectedDriver(null);
      fetchDriversForAdmin();
    } catch (err) {
      alert('حدث خطأ أثناء الاعتماد: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // رفض السائق مع تسجيل السبب
  const handleRejectDriver = async (driverId) => {
    const finalReason = selectedRejectTemplate === 'سبب مخصص (كتابة نص آخر)...' 
      ? customRejectReason 
      : selectedRejectTemplate;

    if (!finalReason || !finalReason.trim()) {
      alert('يرجى اختيار أو كتابة سبب الرفض أولاً');
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_verified: false, 
          driver_status: 'rejected',
          rejection_reason: finalReason 
        })
        .eq('id', driverId);

      if (error) throw error;
      alert('تم تسجيل قرار الرفض وحفظ السبب ليظهر للسائق في شاشته.');
      setShowRejectBox(false);
      setSelectedDriver(null);
      setSelectedRejectTemplate('');
      setCustomRejectReason('');
      fetchDriversForAdmin();
    } catch (err) {
      alert('حدث خطأ: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // تجميد حساب سائق معتمد
  const handleSuspendDriver = async (driverId) => {
    const reason = prompt('يرجى كتابة سبب تجميد الحساب:');
    if (!reason) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_verified: false, 
          driver_status: 'suspended',
          rejection_reason: reason 
        })
        .eq('id', driverId);

      if (error) throw error;
      alert('تم تجميد حساب السائق بنجاح.');
      setSelectedDriver(null);
      fetchDriversForAdmin();
    } catch (err) {
      alert('حدث خطأ: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // فتح واتساب مباشرة مع السائق
  const handleOpenWhatsApp = (driver) => {
    if (!driver.phone) {
      alert('رقم هاتف السائق غير متوفر');
      return;
    }
    let phoneNum = driver.phone.replace(/[^0-9]/g, '');
    if (phoneNum.startsWith('0')) {
      phoneNum = '249' + phoneNum.substring(1); // تحويل للمفتاح الدولي للسودان
    }
    const message = encodeURIComponent(`مرحباً كابتن ${driver.full_name}، معك إدارة منصة تريلا الذكية بخصوص حسابك.`);
    window.open(`https://wa.me/${phoneNum}?text=${message}`, '_blank');
  };

  // إعادة رفع المستندات للسائق
  const handleReuploadDoc = async (file, type) => {
    if (!file || !profile) return;
    setActionLoading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `drivers/${profile.id}/${type}.${ext}`;
      const { error: upErr } = await supabase.storage.from('driver-documents').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: res } = supabase.storage.from('driver-documents').getPublicUrl(path);
      
      let updateField = { driver_status: 'pending', rejection_reason: null };
      if (type === 'license') updateField.license_url = res.publicUrl;
      else if (type === 'idcard') updateField.id_card_url = res.publicUrl;
      else if (type === 'selfie') updateField.selfie_url = res.publicUrl;

      await supabase.from('profiles').update(updateField).eq('id', profile.id);
      
      alert('تم رفع المستند بنجاح وهو الآن قيد التدقيق مجدداً!');
      fetchProfile(profile.id);
    } catch (err) {
      alert('حدث خطأ أثناء الرفع: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setView('landing');
  };

  // فلترة السائقين في لوحة المشرف
  const filteredDrivers = driversList.filter((d) => {
    const matchesTab = 
      adminTab === 'pending' ? (d.driver_status === 'pending' || (!d.is_verified && d.driver_status !== 'rejected' && d.driver_status !== 'suspended')) :
      adminTab === 'approved' ? (d.driver_status === 'approved' || d.is_verified) :
      (d.driver_status === 'rejected' || d.driver_status === 'suspended');

    const matchesSearch = 
      (d.full_name && d.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.phone && d.phone.includes(searchQuery)) ||
      (d.email && d.email.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  // حساب الإحصائيات
  const stats = {
    pending: driversList.filter(d => d.driver_status === 'pending' || (!d.is_verified && d.driver_status !== 'rejected' && d.driver_status !== 'suspended')).length,
    approved: driversList.filter(d => d.driver_status === 'approved' || d.is_verified).length,
    rejected: driversList.filter(d => d.driver_status === 'rejected' || d.driver_status === 'suspended').length
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

      {/* 1. الصفحة الترحيبية (Landing Page) */}
      {view === 'landing' && (
        <div className="flex-1 flex flex-col justify-between">
          <header className="max-w-6xl w-full mx-auto px-6 py-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-sky-600 text-white p-2.5 rounded-2xl shadow-md shadow-sky-600/20">
                <Truck size={26} />
              </div>
              <span className="text-xl font-extrabold text-slate-900">تريلا الذكية</span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => { setView('admin'); fetchDriversForAdmin(); }}
                className="bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              >
                <ShieldAlert size={14} />
                <span>لوحة المشرف (تجريبي)</span>
              </button>

              <button 
                onClick={() => { setView('auth'); setAuthMode('login'); }}
                className="text-xs font-bold text-slate-600 hover:text-sky-600 px-3.5 py-2 rounded-xl transition-all"
              >
                تسجيل الدخول
              </button>
            </div>
          </header>

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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-10 text-right">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3">
                  <Lock size={20} />
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-1">ضمان مالي (Escrow)</h3>
                <p className="text-xs text-slate-500 leading-normal">أموالك محفوظة بأمان ولا تسلم للسائق إلا بعد مسح رمز الاستلام الرقمي.</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center mb-3">
                  <DollarSign size={20} />
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-1">تفاوض حر ومباشر</h3>
                <p className="text-xs text-slate-500 leading-normal">حرية تامة في تقديم وقبول عروض الأسعار داخل التطبيق حسب ظروف السوق.</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-1">سائقون موثقون رسمياً</h3>
                <p className="text-xs text-slate-500 leading-normal">مطابقة ثلاثية (سيلفي، رخصة، وبطاقة قومية) قبل السماح بأي نقلة.</p>
              </div>
            </div>

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

      {/* 2. شاشات التسجيل والدخول (Auth Screens) */}
      {view === 'auth' && (
        <div className="flex-1 flex flex-col justify-center items-center p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
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

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3 rounded-xl mb-4 font-bold flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

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

              {/* حقول رفع وتدقيق مستندات السائق */}
              {authMode === 'register' && role === 'driver' && (
                <div className="space-y-4 pt-3 border-t border-slate-100">
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-800 leading-relaxed">
                    ⚠️ يتطلب توثيق حساب السائق مطابقة ثلاثية (سيلفي، رخصة، وهوية) لتفعيل الحساب.
                  </div>

                  {/* سيلفي */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Camera size={14} className="text-sky-600" />
                      صورة شخصية واضحة للوجه (سيلفي)
                    </label>
                    <input 
                      type="file" 
                      accept="image/*"
                      required
                      onChange={(e) => handleFileChange(e, 'selfie')}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                    />
                    {selfiePreview && (
                      <div className="mt-2 relative rounded-xl overflow-hidden border border-slate-200 h-28 bg-slate-100 flex items-center justify-center">
                        <img src={selfiePreview} alt="معاينة السيلفي" className="h-full w-full object-cover" />
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">معاينة السيلفي</span>
                      </div>
                    )}
                  </div>

                  {/* رخصة */}
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

                  {/* هوية */}
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
                {actionLoading ? 'جاري المعالجة ورفع الصور...' : authMode === 'register' ? 'إنشاء الحساب والمتابعة' : 'تسجيل الدخول'}
              </button>
            </form>

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

      {/* 3. الشاشة الرئيسية للعميل أو السائق (Dashboard) */}
      {view === 'dashboard' && profile && (
        <div className="flex-1 flex flex-col">
          <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-sm">
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

          <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col justify-center">
            {profile.role === 'driver' && (!profile.is_verified || profile.driver_status !== 'approved') ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
                
                {/* إذا كان مرفوضاً يظهر سبب الرفض بوضوح */}
                {profile.driver_status === 'rejected' ? (
                  <>
                    <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200">
                      <UserX size={32} />
                    </div>
                    <h2 className="text-xl font-black text-rose-900 mb-2">تم رفض طلب التوثيق من قبل الإدارة</h2>
                    
                    {profile.rejection_reason && (
                      <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl max-w-lg mx-auto mb-6 text-xs text-rose-800 leading-relaxed font-bold text-right">
                        📌 سبب الرفض: {profile.rejection_reason}
                      </div>
                    )}
                    <p className="text-xs text-slate-500 mb-6">
                      يرجى إعادة رفع المستند المطلوب بالأسفل بصورة واضحة لإعادة مراجعة حسابك وتفعيله.
                    </p>
                  </>
                ) : profile.driver_status === 'suspended' ? (
                  <>
                    <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200">
                      <Ban size={32} />
                    </div>
                    <h2 className="text-xl font-black text-rose-900 mb-2">تم تجميد الحساب مؤقتاً</h2>
                    {profile.rejection_reason && (
                      <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl max-w-lg mx-auto mb-6 text-xs text-rose-800 leading-relaxed font-bold text-right">
                        📌 السبب: {profile.rejection_reason}
                      </div>
                    )}
                    <p className="text-xs text-slate-500 mb-6">يرجى التواصل مع إدارة العمليات لفك تجميد الحساب.</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
                      <Clock size={32} className="animate-pulse" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mb-2">مستنداتك قيد التدقيق والمراجعة</h2>
                    <div className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-2xl max-w-lg mx-auto mb-6 text-xs text-amber-900 leading-relaxed">
                      مستنداتك قيد التدقيق لدى قسم العمليات، سيتم مطابقة السيلفي مع رخصة القيادة والهوية وتفعيل حسابك خلال 24 ساعة.
                    </div>
                  </>
                )}

                <div className="flex flex-col sm:flex-row justify-center gap-3 mb-8 opacity-50 cursor-not-allowed">
                  <button disabled className="bg-slate-200 text-slate-500 font-bold text-xs px-6 py-3 rounded-xl">
                    البحث عن شحنات قريبة (معطل)
                  </button>
                  <button disabled className="bg-slate-200 text-slate-500 font-bold text-xs px-6 py-3 rounded-xl">
                    استقبال طلبات النقل (معطل)
                  </button>
                </div>

                {/* إمكانية إعادة رفع المستندات الثلاثة */}
                <div className="border-t border-slate-100 pt-6 max-w-md mx-auto text-right">
                  <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1">
                    <RefreshCw size={14} className="text-sky-600" />
                    إعادة رفع وتصحيح المستندات:
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-xs text-slate-600">الصورة الشخصية (سيلفي)</span>
                      <label className="bg-white border border-slate-300 hover:border-sky-500 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all">
                        تعديل
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleReuploadDoc(e.target.files[0], 'selfie')} />
                      </label>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-xs text-slate-600">رخصة القيادة</span>
                      <label className="bg-white border border-slate-300 hover:border-sky-500 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all">
                        تعديل
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleReuploadDoc(e.target.files[0], 'license')} />
                      </label>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-xs text-slate-600">الهوية الشخصية</span>
                      <label className="bg-white border border-slate-300 hover:border-sky-500 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all">
                        تعديل
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleReuploadDoc(e.target.files[0], 'idcard')} />
                      </label>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
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
              </div>
            )}
          </main>
        </div>
      )}

      {/* 4. لوحة تحكم المشرف الذكية (Admin Verification Dashboard) */}
      {view === 'admin' && (
        <div className="flex-1 flex flex-col bg-slate-100">
          <header className="bg-slate-900 text-white px-6 py-4 sticky top-0 z-30 shadow-md">
            <div className="max-w-6xl mx-auto flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500 p-2 rounded-xl text-slate-950">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h1 className="text-base font-black text-white">لوحة الإشراف والمطابقة الأمنية</h1>
                  <p className="text-[10px] text-slate-400">توثيق وفحص ملفات كباتن الشاحنات</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={fetchDriversForAdmin} 
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw size={14} className={actionLoading ? 'animate-spin' : ''} />
                  <span>تحديث</span>
                </button>
                <button 
                  onClick={() => setView('landing')} 
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all"
                >
                  إغلاق اللوحة
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
            
            {/* بطاقات الإحصائيات السريعة */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div 
                onClick={() => setAdminTab('pending')}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${adminTab === 'pending' ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-white border-slate-200'}`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">بانتظار التدقيق</span>
                  <Clock size={18} className="text-amber-500" />
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">{stats.pending}</p>
              </div>

              <div 
                onClick={() => setAdminTab('approved')}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${adminTab === 'approved' ? 'bg-emerald-50 border-emerald-300 shadow-sm' : 'bg-white border-slate-200'}`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">السائقون المعتمدون</span>
                  <CheckCircle size={18} className="text-emerald-500" />
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">{stats.approved}</p>
              </div>

              <div 
                onClick={() => setAdminTab('rejected')}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${adminTab === 'rejected' ? 'bg-rose-50 border-rose-300 shadow-sm' : 'bg-white border-slate-200'}`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">المرفوضون والمجمدون</span>
                  <UserX size={18} className="text-rose-500" />
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">{stats.rejected}</p>
              </div>
            </div>

            {/* شريط البحث والتبويبات */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between gap-4 items-center">
              <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                <button 
                  onClick={() => setAdminTab('pending')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${adminTab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                  قيد التدقيق ({stats.pending})
                </button>
                <button 
                  onClick={() => setAdminTab('approved')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${adminTab === 'approved' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                  المعتمدون ({stats.approved})
                </button>
                <button 
                  onClick={() => setAdminTab('rejected')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${adminTab === 'rejected' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                  المرفوضون ({stats.rejected})
                </button>
              </div>

              {/* مربع البحث */}
              <div className="relative w-full sm:w-72">
                <Search size={16} className="absolute right-3 top-3 text-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم، الهاتف، أو الإيميل..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-4 py-2 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* جدول السائقين المطور */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                    <tr>
                      <th className="p-4">اسم السائق</th>
                      <th className="p-4">رقم الهاتف</th>
                      <th className="p-4">البريد الإلكتروني</th>
                      <th className="p-4">تاريخ التسجيل</th>
                      <th className="p-4">الحالة</th>
                      <th className="p-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {filteredDrivers.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-400">
                          لا توجد سجلات مطابقة في هذا التبويب
                        </td>
                      </tr>
                    ) : (
                      filteredDrivers.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/80 transition-all">
                          <td className="p-4 font-bold text-slate-900">{d.full_name}</td>
                          <td className="p-4 font-mono">{d.phone || 'غير مسجل'}</td>
                          <td className="p-4 font-mono text-[11px] text-slate-500">{d.email}</td>
                          <td className="p-4 text-slate-500">{new Date(d.created_at).toLocaleDateString('ar-EG')}</td>
                          <td className="p-4">
                            {d.is_verified || d.driver_status === 'approved' ? (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                <CheckCircle size={12} />
                                معتمد ومفعل
                              </span>
                            ) : d.driver_status === 'rejected' ? (
                              <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                <UserX size={12} />
                                مرفوض
                              </span>
                            ) : d.driver_status === 'suspended' ? (
                              <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                <Ban size={12} />
                                مجمد
                              </span>
                            ) : (
                              <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                <Clock size={12} />
                                قيد التدقيق
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center flex items-center justify-center gap-2">
                            {/* زر التواصل عبر واتساب */}
                            <button 
                              onClick={() => handleOpenWhatsApp(d)}
                              title="تواصل سريع عبر واتساب"
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 p-2 rounded-xl transition-all"
                            >
                              <MessageCircle size={14} />
                            </button>

                            {/* زر فحص المستندات والمطابقة الثلاثية */}
                            <button 
                              onClick={() => { setSelectedDriver(d); setShowRejectBox(false); }}
                              className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
                            >
                              <Eye size={14} />
                              <span>فحص المستندات</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>

          {/* ========================================================== */}
          {/* نافذة المعاينة المنبثقة الذكية (Modal Preview)              */}
          {/* ========================================================== */}
          {selectedDriver && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white max-w-5xl w-full max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-fadeIn">
                
                {/* رأس النافذة */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center font-bold">
                      <Truck size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-base">
                        مطابقة ملف الكابتن: {selectedDriver.full_name}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1"><Phone size={12} /> {selectedDriver.phone || 'غير مسجل'}</span>
                        <span className="flex items-center gap-1"><Mail size={12} /> {selectedDriver.email}</span>
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setSelectedDriver(null); setShowRejectBox(false); }}
                    className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* المعاينة المباشرة جنباً إلى جنب للمطابقة الفورية */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    
                    {/* 1. السيلفي في المنتصف أو الأول */}
                    <div className="bg-slate-50 p-4 rounded-2xl border-2 border-sky-100 flex flex-col justify-between shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-sky-900">1. الصورة الشخصية (سيلفي)</span>
                        <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded font-bold">وجه الكابتن</span>
                      </div>
                      <div className="relative group rounded-xl overflow-hidden bg-slate-200 h-48 flex items-center justify-center">
                        {selectedDriver.selfie_url ? (
                          <>
                            <img src={selectedDriver.selfie_url} alt="سيلفي السائق" className="h-full w-full object-cover" />
                            <button 
                              onClick={() => setZoomedImage(selectedDriver.selfie_url)}
                              className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-xs font-bold transition-all"
                            >
                              <ZoomIn size={16} /> انقر للتكبير
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">غير متوفرة</span>
                        )}
                      </div>
                    </div>

                    {/* 2. البطاقة القومية */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-800">2. البطاقة القومية / الهوية</span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">الرقم الوطني</span>
                      </div>
                      <div className="relative group rounded-xl overflow-hidden bg-slate-200 h-48 flex items-center justify-center">
                        {selectedDriver.id_card_url ? (
                          <>
                            <img src={selectedDriver.id_card_url} alt="الهوية الشخصية" className="h-full w-full object-cover" />
                            <button 
                              onClick={() => setZoomedImage(selectedDriver.id_card_url)}
                              className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-xs font-bold transition-all"
                            >
                              <ZoomIn size={16} /> انقر للتكبير
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">غير متوفرة</span>
                        )}
                      </div>
                    </div>

                    {/* 3. رخصة القيادة */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-800">3. رخصة القيادة</span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">سارية المفعول</span>
                      </div>
                      <div className="relative group rounded-xl overflow-hidden bg-slate-200 h-48 flex items-center justify-center">
                        {selectedDriver.license_url ? (
                          <>
                            <img src={selectedDriver.license_url} alt="رخصة القيادة" className="h-full w-full object-cover" />
                            <button 
                              onClick={() => setZoomedImage(selectedDriver.license_url)}
                              className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-xs font-bold transition-all"
                            >
                              <ZoomIn size={16} /> انقر للتكبير
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">غير متوفرة</span>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* إذا كان هناك سبب رفض مسجل مسبقاً */}
                  {selectedDriver.rejection_reason && (
                    <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 font-bold">
                      📌 ملاحظة التدقيق السابقة: {selectedDriver.rejection_reason}
                    </div>
                  )}

                  {/* صندوق الرفض الذكي وقوالب الأسباب */}
                  {showRejectBox && (
                    <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl space-y-3 animate-fadeIn">
                      <label className="block text-xs font-bold text-rose-900">
                        اختر سبب الرفض أو اكتب سبباً مخصصاً:
                      </label>
                      
                      <select 
                        value={selectedRejectTemplate}
                        onChange={(e) => setSelectedRejectTemplate(e.target.value)}
                        className="w-full bg-white border border-rose-300 rounded-xl p-2.5 text-xs focus:outline-none font-medium"
                      >
                        <option value="">-- اختر سبباً جاهزاً من القائمة --</option>
                        {rejectionTemplates.map((t, i) => (
                          <option key={i} value={t}>{t}</option>
                        ))}
                      </select>

                      {selectedRejectTemplate === 'سبب مخصص (كتابة نص آخر)...' && (
                        <textarea 
                          rows="2"
                          value={customRejectReason}
                          onChange={(e) => setCustomRejectReason(e.target.value)}
                          placeholder="اكتب ملاحظتك التوضيحية للسائق هنا..."
                          className="w-full border border-rose-300 rounded-xl p-3 text-xs focus:outline-none bg-white"
                        ></textarea>
                      )}

                      <div className="flex justify-end gap-2 pt-2">
                        <button 
                          onClick={() => setShowRejectBox(false)}
                          className="px-3 py-1.5 text-xs text-slate-600 font-bold"
                        >
                          إلغاء
                        </button>
                        <button 
                          onClick={() => handleRejectDriver(selectedDriver.id)}
                          disabled={actionLoading}
                          className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <Send size={14} />
                          <span>{actionLoading ? 'جاري التسجيل...' : 'تأكيد الرفض وتسجيل الملاحظة'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>

                {/* أزرار اتخاذ القرار النهائي */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <button 
                    onClick={() => handleOpenWhatsApp(selectedDriver)}
                    className="text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
                  >
                    <MessageCircle size={15} />
                    <span>تواصل عبر واتساب</span>
                  </button>

                  <div className="flex gap-2.5 w-full sm:w-auto justify-end">
                    {/* خيار التجميد إذا كان السائق معتمداً */}
                    {selectedDriver.is_verified && selectedDriver.driver_status === 'approved' && (
                      <button 
                        onClick={() => handleSuspendDriver(selectedDriver.id)}
                        className="bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
                      >
                        تجميد الحساب
                      </button>
                    )}

                    {!showRejectBox && !selectedDriver.is_verified && (
                      <button 
                        onClick={() => setShowRejectBox(true)}
                        className="bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all"
                      >
                        <UserX size={15} />
                        <span>رفض المستندات</span>
                      </button>
                    )}

                    {(!selectedDriver.is_verified || selectedDriver.driver_status !== 'approved') && (
                      <button 
                        onClick={() => handleApproveDriver(selectedDriver.id)}
                        disabled={actionLoading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20"
                      >
                        <UserCheck size={16} />
                        <span>{actionLoading ? 'جاري الاعتماد...' : 'اعتماد وتفعيل السائق فورا'}</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* نافذة التكبير للصور (Zoom Lightbox) */}
          {zoomedImage && (
            <div 
              className="fixed inset-0 bg-black/90 z-60 flex items-center justify-center p-4 cursor-pointer"
              onClick={() => setZoomedImage(null)}
            >
              <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl">
                <img src={zoomedImage} alt="صورة مكبرة" className="w-full h-full object-contain" />
                <span className="absolute top-3 right-3 bg-black/70 text-white text-xs px-3 py-1 rounded-full">
                  انقر في أي مكان للإغلاق ✕
                </span>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
