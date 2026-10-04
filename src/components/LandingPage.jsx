import React from 'react';
import { 
  Truck, 
  ShieldAlert, 
  Zap, 
  Lock, 
  DollarSign, 
  ShieldCheck, 
  ArrowLeft 
} from 'lucide-react';

export default function LandingPage({ onNavigate }) {
  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* شريط علوي */}
      <header className="max-w-6xl w-full mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-sky-600 text-white p-2.5 rounded-2xl shadow-md shadow-sky-600/20">
            <Truck size={26} />
          </div>
          <span className="text-xl font-extrabold text-slate-900">تريلا الذكية</span>
        </div>

        <div className="flex items-center gap-2">
          {/* زر مؤقت للدخول المباشر للوحة الإدارة للتجربة */}
          <button 
            onClick={() => onNavigate('admin')}
            className="bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ShieldAlert size={14} />
            <span>لوحة المشرف (تجريبي)</span>
          </button>

          <button 
            onClick={() => onNavigate('auth', 'login')}
            className="text-xs font-bold text-slate-600 hover:text-sky-600 px-3.5 py-2 rounded-xl transition-all"
          >
            تسجيل الدخول
          </button>
        </div>
      </header>

      {/* المحتوى الترحيبي */}
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

        {/* بطاقات المميزات */}
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

        {/* زر البدء */}
        <button 
          onClick={() => onNavigate('auth', 'register')}
          className="bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-sm px-8 py-4 rounded-2xl shadow-lg shadow-sky-600/25 transition-all flex items-center gap-3"
        >
          <span>ابدأ الآن وانضم للمنصة</span>
          <ArrowLeft size={18} />
        </button>
      </main>

      {/* التذييل */}
      <footer className="text-center py-6 text-xs text-slate-400">
        © {new Date().getFullYear()} منصة تريلا الذكية - جميع الحقوق محفوظة
      </footer>
    </div>
  );
}
