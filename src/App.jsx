
import React, { useState, useEffect } from 'react';
import {
  Truck,
  Package,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Upload,
  FileCheck2,
  FileText,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Loader2,
  LogOut,
} from 'lucide-react';
import { supabase } from './supabaseClient';

const MAX_FILE_MB = 5;

const THEME = {
  customer: {
    solid: 'bg-sky-600 hover:bg-sky-700 focus-visible:ring-sky-500',
    ring: 'focus:ring-sky-500 focus:border-sky-500',
    icon: 'bg-sky-100 text-sky-700',
    bar: 'bg-sky-600',
    link: 'text-sky-700',
  },
  driver: {
    solid: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500',
    ring: 'focus:ring-emerald-500 focus:border-emerald-500',
    icon: 'bg-emerald-100 text-emerald-700',
    bar: 'bg-emerald-600',
    link: 'text-emerald-700',
  },
};

// ترجمة رسائل الأخطاء التقنية إلى عبارات يفهمها المستخدم
function friendlyError(message = '') {
  const m = message.toLowerCase();
  if (m.includes('already registered')) return 'هذا البريد مسجّل من قبل. جرّب تسجيل الدخول.';
  if (m.includes('password should be')) return 'كلمة السر قصيرة. استخدم 6 أحرف على الأقل.';
  if (m.includes('invalid login')) return 'البريد الإلكتروني أو كلمة السر غير صحيحة.';
  if (m.includes('email not confirmed')) return 'فعّل بريدك أولًا من الرسالة التي وصلتك، ثم سجّل الدخول.';
  if (m.includes('rate limit') || m.includes('too many')) return 'محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.';
  if (m.includes('json object requested')) return 'لم نعثر على بيانات حسابك.';
  return 'حدث خطأ غير متوقع. حاول مرة أخرى.';
}

/* ---------- مكوّنات صغيرة (خارج App حتى لا يفقد الحقل التركيز أثناء الكتابة) ---------- */

function inputClass(theme, error) {
  return `w-full rounded-xl border bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
    error ? 'border-rose-400 focus:ring-rose-300' : `border-slate-300 ${theme.ring}`
  }`;
}

function Field({ id, label, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-sm text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

function PasswordInput({ id, value, onChange, theme, error, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name="password"
        type={show ? 'text' : 'password'}
        dir="ltr"
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        className={`${inputClass(theme, error)} pr-12`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'إخفاء كلمة السر' : 'إظهار كلمة السر'}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500 hover:text-slate-800 focus:outline-none focus-visible:text-slate-900"
      >
        {show ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
}

function FileField({ id, label, helper, icon: Icon, file, error, onPick }) {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(null);
  }, [file]);

  return (
    <Field id={id} label={label} error={error} hint={file ? undefined : helper}>
      <input id={id} type="file" accept="image/*,application/pdf" className="peer sr-only" onChange={onPick} />
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3">
          {preview ? (
            <img src={preview} alt="" className="h-14 w-14 rounded-lg object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white text-emerald-600">
              <FileCheck2 size={24} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p dir="ltr" className="truncate text-left text-sm font-medium text-slate-800">
              {file.name}
            </p>
            <p className="text-sm text-emerald-700">تم اختيار الملف</p>
          </div>
          <label
            htmlFor={id}
            className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-700 underline"
          >
            تغيير
          </label>
        </div>
      ) : (
        <label
          htmlFor={id}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-white px-4 py-6 text-center hover:border-slate-400 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 ${
            error ? 'border-rose-300' : 'border-slate-300'
          }`}
        >
          <Icon size={28} className="text-slate-400" />
          <span className="text-base font-medium text-slate-800">اضغط لالتقاط صورة أو اختيار ملف</span>
          <Upload size={16} className="text-slate-400" />
        </label>
      )}
    </Field>
  );
}

function RoleCard({ icon: Icon, title, description, theme, hoverBorder, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white p-4 text-right transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${hoverBorder}`}
    >
      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${theme.icon}`}>
        <Icon size={28} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold text-slate-900">{title}</span>
        <span className="mt-0.5 block text-sm text-slate-600">{description}</span>
      </span>
      <ArrowLeft size={20} className="shrink-0 text-slate-400" />
    </button>
  );
}

function Stepper({ current, total, label, theme }) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-sm font-medium text-slate-600">
        الخطوة {current} من {total} · {label}
      </p>
      <div className="flex gap-2" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < current ? theme.bar : 'bg-slate-200'}`} />
        ))}
      </div>
    </div>
  );
}

/* ---------- التطبيق ---------- */

const EMPTY_FORM = { fullName: '', email: '', password: '', licenseFile: null, idCardFile: null };

export default function App() {
  const [view, setView] = useState('register'); // register | login | done
  const [step, setStep] = useState(0); // 0: اختيار النوع، 1: البيانات، 2: مستندات السائق
  const [role, setRole] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [justRegistered, setJustRegistered] = useState(false);
  const [uploadWarning, setUploadWarning] = useState(false);

  const theme = THEME[role || 'customer'];

  const setField = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
    setFormError('');
  };

  const handleChange = (e) => setField(e.target.name, e.target.value);

  const pickFile = (name) => (ev) => {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    if (!(file.type.startsWith('image/') || file.type === 'application/pdf')) {
      setErrors((e) => ({ ...e, [name]: 'الملف يجب أن يكون صورة أو PDF' }));
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setErrors((e) => ({ ...e, [name]: `حجم الملف كبير. الحد الأقصى ${MAX_FILE_MB} ميجابايت` }));
      return;
    }
    setField(name, file);
  };

  const goTo = (nextView) => {
    setView(nextView);
    setErrors({});
    setFormError('');
  };

  const chooseRole = (r) => {
    setRole(r);
    setStep(1);
    setErrors({});
  };

  const validateBasics = () => {
    const e = {};
    if (form.fullName.trim().length < 2) e.fullName = 'اكتب اسمك الكامل';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'اكتب بريدًا إلكترونيًا صحيحًا، مثل name@example.com';
    if (form.password.length < 6) e.password = 'كلمة السر يجب أن تكون 6 أحرف على الأقل';
    return e;
  };

  const validateDocs = () => {
    const e = {};
    if (!form.licenseFile) e.licenseFile = 'أرفق صورة رخصة القيادة';
    if (!form.idCardFile) e.idCardFile = 'أرفق صورة الهوية الشخصية';
    return e;
  };

  /* ----- التسجيل ----- */
  const register = async () => {
    setLoading(true);
    setFormError('');
    setUploadWarning(false);

    try {
      const email = form.email.trim().toLowerCase();

      // 1. إنشاء الحساب في Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: form.password,
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Signup failed');
      // عند تفعيل تأكيد البريد، يعيد Supabase مستخدمًا بلا هويات إذا كان البريد مسجّلًا
      if (authData.user.identities && authData.user.identities.length === 0) {
        throw new Error('User already registered');
      }
      const userId = authData.user.id;

      let licenseUrl = '';
      let idCardUrl = '';

      // 2. رفع مستندات السائق
      if (role === 'driver') {
        const upload = async (file, suffix) => {
          const ext = file.name.split('.').pop();
          const fileName = `${userId}_${suffix}.${ext}`;
          const { error } = await supabase.storage
            .from('driver-documents')
            .upload(fileName, file, { upsert: true });
          if (error) {
            console.warn(`خطأ في رفع ${suffix}:`, error.message);
            setUploadWarning(true);
            return '';
          }
          const { data } = supabase.storage.from('driver-documents').getPublicUrl(fileName);
          return data.publicUrl;
        };

        if (form.licenseFile) licenseUrl = await upload(form.licenseFile, 'license');
        if (form.idCardFile) idCardUrl = await upload(form.idCardFile, 'idcard');
      }

      // 3. حفظ البيانات في جدول profiles
      const isVerified = role === 'customer';
      const { error: profileError } = await supabase.from('profiles').insert([
        {
          id: userId,
          full_name: form.fullName.trim(),
          email,
          role,
          is_verified: isVerified,
          license_url: licenseUrl,
          id_card_url: idCardUrl,
        },
      ]);
      if (profileError) throw profileError;

      setProfile({ full_name: form.fullName.trim(), role, is_verified: isVerified });
      setJustRegistered(true);
      setView('done');
    } catch (error) {
      console.error('خطأ مفصل:', error);
      setFormError(friendlyError(error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (ev) => {
    ev.preventDefault();
    if (loading) return;

    if (step === 1) {
      const e = validateBasics();
      setErrors(e);
      if (Object.keys(e).length) return;
      if (role === 'driver') {
        setStep(2);
        return;
      }
    } else if (step === 2) {
      const e = validateDocs();
      setErrors(e);
      if (Object.keys(e).length) return;
    }
    await register();
  };

  /* ----- تسجيل الدخول والخروج ----- */
  const handleLogin = async (ev) => {
    ev.preventDefault();
    if (loading) return;

    const e = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'اكتب بريدك الإلكتروني';
    if (!form.password) e.password = 'اكتب كلمة السر';
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    setFormError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      if (error) throw error;

      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('full_name, role, is_verified')
        .eq('id', data.user.id)
        .single();
      if (profError) throw profError;

      setProfile(prof);
      setJustRegistered(false);
      setUploadWarning(false);
      setView('done');
    } catch (error) {
      console.error('خطأ في الدخول:', error);
      setFormError(friendlyError(error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setForm(EMPTY_FORM);
    setRole(null);
    setStep(0);
    setProfile(null);
    setErrors({});
    setFormError('');
    setView('login');
  };

  /* ----- أجزاء الواجهة ----- */
  const primaryBtn = (themeObj) =>
    `flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${themeObj.solid}`;

  const ErrorBanner = () =>
    formError ? (
      <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
        {formError}
      </div>
    ) : null;

  const driverTotal = 2;
  const isDriverPending = profile && profile.role === 'driver' && !profile.is_verified;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50" dir="rtl" lang="ar" style={{ fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap');`}</style>

      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="rounded-xl bg-sky-600 p-2 text-white">
            <Truck size={24} />
          </div>
          <h1 className="text-lg font-bold text-slate-900">تريلا الذكية</h1>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center p-4 sm:items-center">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          {/* ===== تسجيل حساب جديد ===== */}
          {view === 'register' && (
            <>
              {step === 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">كيف تريد استخدام التطبيق؟</h2>
                  <p className="mb-6 mt-1 text-base text-slate-600">اختر نوع حسابك لنبدأ.</p>
                  <div className="space-y-3">
                    <RoleCard
                      icon={Package}
                      title="عميل"
                      description="أريد شحن بضاعة"
                      theme={THEME.customer}
                      hoverBorder="hover:border-sky-500"
                      onClick={() => chooseRole('customer')}
                    />
                    <RoleCard
                      icon={Truck}
                      title="سائق (كابتن)"
                      description="أملك شاحنة وأريد استلام الطلبات"
                      theme={THEME.driver}
                      hoverBorder="hover:border-emerald-500"
                      onClick={() => chooseRole('driver')}
                    />
                  </div>
                </div>
              )}

              {step >= 1 && (
                <form onSubmit={handleRegisterSubmit} noValidate>
                  {role === 'driver' && (
                    <Stepper
                      current={step}
                      total={driverTotal}
                      label={step === 1 ? 'بياناتك' : 'المستندات'}
                      theme={theme}
                    />
                  )}

                  <h2 className="mb-5 text-2xl font-bold text-slate-900">
                    {step === 1
                      ? role === 'driver'
                        ? 'أنشئ حساب سائق'
                        : 'أنشئ حساب عميل'
                      : 'أرفق مستنداتك'}
                  </h2>

                  <ErrorBanner />

                  {step === 1 && (
                    <div className="space-y-4">
                      <Field id="fullName" label="الاسم الكامل" error={errors.fullName}>
                        <input
                          id="fullName"
                          type="text"
                          name="fullName"
                          autoComplete="name"
                          value={form.fullName}
                          onChange={handleChange}
                          className={inputClass(theme, errors.fullName)}
                        />
                      </Field>

                      <Field id="email" label="البريد الإلكتروني" error={errors.email}>
                        <input
                          id="email"
                          type="email"
                          name="email"
                          dir="ltr"
                          inputMode="email"
                          autoComplete="email"
                          placeholder="name@example.com"
                          value={form.email}
                          onChange={handleChange}
                          className={inputClass(theme, errors.email)}
                        />
                      </Field>

                      <Field id="password" label="كلمة السر" error={errors.password} hint="6 أحرف على الأقل">
                        <PasswordInput
                          id="password"
                          value={form.password}
                          onChange={handleChange}
                          theme={theme}
                          error={errors.password}
                          autoComplete="new-password"
                        />
                      </Field>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-5">
                      <p className="text-base text-slate-600">
                        سنراجع المستندات قبل تفعيل حسابك. صوّر المستند في مكان مضيء وتأكد أن الكتابة واضحة.
                      </p>
                      <FileField
                        id="licenseFile"
                        label="رخصة القيادة"
                        helper={`صورة أو PDF، حتى ${MAX_FILE_MB} ميجابايت`}
                        icon={FileText}
                        file={form.licenseFile}
                        error={errors.licenseFile}
                        onPick={pickFile('licenseFile')}
                      />
                      <FileField
                        id="idCardFile"
                        label="الهوية الشخصية"
                        helper={`صورة أو PDF، حتى ${MAX_FILE_MB} ميجابايت`}
                        icon={CreditCard}
                        file={form.idCardFile}
                        error={errors.idCardFile}
                        onPick={pickFile('idCardFile')}
                      />
                    </div>
                  )}

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setErrors({});
                        setFormError('');
                        setStep(step - 1);
                      }}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-60"
                    >
                      <ArrowRight size={18} />
                      رجوع
                    </button>

                    <button type="submit" disabled={loading} className={primaryBtn(theme)}>
                      {loading ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          جاري إنشاء الحساب…
                        </>
                      ) : role === 'driver' && step === 1 ? (
                        <>
                          التالي
                          <ArrowLeft size={18} />
                        </>
                      ) : (
                        'إنشاء الحساب'
                      )}
                    </button>
                  </div>
                </form>
              )}

              <p className="mt-6 text-center text-base text-slate-600">
                لديك حساب؟{' '}
                <button
                  type="button"
                  onClick={() => goTo('login')}
                  className="font-bold text-sky-700 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                >
                  تسجيل الدخول
                </button>
              </p>
            </>
          )}

          {/* ===== تسجيل الدخول ===== */}
          {view === 'login' && (
            <form onSubmit={handleLogin} noValidate>
              <h2 className="mb-5 text-2xl font-bold text-slate-900">تسجيل الدخول</h2>
              <ErrorBanner />

              <div className="space-y-4">
                <Field id="loginEmail" label="البريد الإلكتروني" error={errors.email}>
                  <input
                    id="loginEmail"
                    type="email"
                    name="email"
                    dir="ltr"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={form.email}
                    onChange={handleChange}
                    className={inputClass(THEME.customer, errors.email)}
                  />
                </Field>

                <Field id="loginPassword" label="كلمة السر" error={errors.password}>
                  <PasswordInput
                    id="loginPassword"
                    value={form.password}
                    onChange={handleChange}
                    theme={THEME.customer}
                    error={errors.password}
                    autoComplete="current-password"
                  />
                </Field>
              </div>

              <button type="submit" disabled={loading} className={`${primaryBtn(THEME.customer)} mt-6 w-full`}>
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    جاري الدخول…
                  </>
                ) : (
                  'تسجيل الدخول'
                )}
              </button>

              <p className="mt-6 text-center text-base text-slate-600">
                ليس لديك حساب؟{' '}
                <button
                  type="button"
                  onClick={() => {
                    setStep(0);
                    setRole(null);
                    goTo('register');
                  }}
                  className="font-bold text-sky-700 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                >
                  أنشئ حسابًا
                </button>
              </p>
            </form>
          )}

          {/* ===== بعد النجاح ===== */}
          {view === 'done' && profile && (
            <div className="text-center">
              {isDriverPending ? (
                <Clock size={56} className="mx-auto mb-4 text-amber-500" />
              ) : (
                <CheckCircle2 size={56} className="mx-auto mb-4 text-emerald-500" />
              )}

              <h2 className="text-2xl font-bold text-slate-900">
                {justRegistered ? 'تم إنشاء حسابك' : `أهلًا ${profile.full_name}`}
              </h2>

              <p className="mt-2 text-base text-slate-600">
                {isDriverPending
                  ? 'نراجع رخصتك وهويتك الآن. سنفعّل حسابك بعد الموافقة.'
                  : 'حسابك جاهز للاستخدام.'}
              </p>

              {uploadWarning && (
                <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
                  تعذّر رفع بعض المستندات، وقد تتأخر المراجعة.
                </p>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="mx-auto mt-6 flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <LogOut size={18} />
                تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
```