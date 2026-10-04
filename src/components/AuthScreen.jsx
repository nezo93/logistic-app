import React, { useState } from 'react';
import { 
  ArrowLeft, 
  AlertTriangle, 
  Camera, 
  ArrowRight,
  Truck,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function AuthScreen({ 
  initialMode = 'login', 
  onNavigate, 
  onAuthSuccess 
}) {
  const [authMode, setAuthMode] = useState(initialMode); // 'login' | 'register'
  const [role, setRole] = useState('customer'); // 'customer' | 'driver'
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

  // تسجيل الدخول
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
      if (onAuthSuccess) onAuthSuccess(data.user.id);
    } catch (err) {
      setErrorMsg(err.message === 'Invalid login credentials' 
        ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
        : err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // إنشاء حساب جديد
  const handleRegister = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');

    try {
      if (role === 'driver' && (!formData.licenseFile || !formData.idCardFile || !formData.selfieFile)) {
        throw new Error('يرجى إرفاق صورة رخصة القيادة، الهوية الشخصية، وصورة السيلفي للمتابعة.');
      }

      // 1. إنشاء المستخدم في auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      });

      if (authErr) throw authErr;
      const userId = authData.user.id;

      let licenseUrl = '';
      let idCardUrl = '';
      let selfieUrl = '';

      // 2. رفع الملفات للسائق
      if (role === 'driver') {
        // الرخصة
        const licExt = formData.licenseFile.name.split('.').pop();
        const licPath = `drivers/${userId}/license.${licExt}`;
        const { error: licErr } = await supabase.storage
          .from('driver-documents')
          .upload(licPath, formData.licenseFile, { upsert: true });
        if (licErr) throw licErr;
        const { data: licRes } = supabase.storage
          .from('driver-documents')
          .getPublicUrl(licPath);
        licenseUrl = licRes.publicUrl;

        // الهوية
        const idExt = formData.idCardFile.name.split('.').pop();
        const idPath = `drivers/${userId}/idcard.${idExt}`;
        const { error: idErr } = await supabase.storage
          .from('driver-documents')
          .upload(idPath, formData.idCardFile, { upsert: true });
        if (idErr) throw idErr;
        const { data: idRes } = supabase.storage
          .from('driver-documents')
          .getPublicUrl(idPath);
        idCardUrl = idRes.publicUrl;

        // السيلفي
        const selfieExt = formData.selfieFile.name.split('.').pop();
        const selfiePath = `drivers/${userId}/selfie.${selfieExt}`;
        const { error: selfieErr } = await supabase.storage
          .from('driver-documents')
          .upload(selfiePath, formData.selfieFile, { upsert: true });
        if (selfieErr) throw selfieErr;
        const { data: selfieRes } = supabase.storage
          .from('driver-documents')
          .getPublicUrl(selfiePath);
        selfieUrl = selfieRes.publicUrl;
      }

      // 3. حفظ بيانات الملف الشخصي
      const { error: profErr } = await supabase
        .from('profiles')
        .insert([{
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

      // 4. إضافة مركبة للسائق
      if (role === 'driver') {
        await supabase.from('vehicles').insert([{
          driver_id: userId,
          v_type: formData.vehicleType,
          plate_number: 'قيد المراجعة'
        }]);
      }

      if (onAuthSuccess) onAuthSuccess(userId);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
        
        {/* زر العودة للرئيسية */}
        <button 
          onClick={() => onNavigate('landing')} 
          className="text-xs text-slate-400 hover:text-slate-700 font-bold mb-4 inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} className="rotate-180" />
          العودة للرئيسية
        </button>

        {/* العنوان */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-slate-900 mb-1">
            {authMode === 'register' ? 'تسجيل حساب جديد' : 'تسجيل الدخول'}
          </h2>
          <p className="text-xs text-slate-500">
            {authMode === 'register' 
              ? 'اختر صفتك في المنصة وأدخل بياناتك للمتابعة' 
              : 'أهلاً بك مجدداً! ادخل بيانات حسابك'}
          </p>
        </div>

        {/* رسالة الخطأ */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3 rounded-xl mb-4 font-bold flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* اختيار نوع الحساب في التسجيل */}
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

          {/* حقول رفع مستندات السائق مع المعاينة الفورية */}
          {authMode === 'register' && role === 'driver' && (
            <div className="space-y-4 pt-3 border-t border-slate-100">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-800 leading-relaxed">
                ⚠️ يتطلب توثيق حساب السائق مطابقة ثلاثية (سيلفي، رخصة، وهوية) لتفعيل الحساب.
              </div>

              {/* السيلفي */}
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
            {actionLoading ? 'جاري المعالجة ورفع الصور...' : authMode === 'register' ? 'إنشاء الحساب والمتابعة' : 'تسجيل الدخول'}
            <ArrowRight size={16} />
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
  );
}

export default AuthScreen;
