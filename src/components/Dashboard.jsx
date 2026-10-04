import React, { useState } from 'react';
import { 
  Truck, 
  LogOut, 
  Clock, 
  CheckCircle, 
  UserX, 
  Ban, 
  RefreshCw 
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Dashboard({ profile, onLogout, onRefreshProfile }) {
  const [actionLoading, setActionLoading] = useState(false);

  // إعادة رفع مستند محدد للسائق المعلق أو المرفوض
  const handleReuploadDoc = async (file, type) => {
    if (!file || !profile) return;
    setActionLoading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `drivers/${profile.id}/${type}.${ext}`;
      
      const { error: upErr } = await supabase.storage
        .from('driver-documents')
        .upload(path, file, { upsert: true });

      if (upErr) throw upErr;

      const { data: res } = supabase.storage
        .from('driver-documents')
        .getPublicUrl(path);

      let updateField = { driver_status: 'pending', rejection_reason: null };
      if (type === 'license') updateField.license_url = res.publicUrl;
      else if (type === 'idcard') updateField.id_card_url = res.publicUrl;
      else if (type === 'selfie') updateField.selfie_url = res.publicUrl;

      const { error: dbErr } = await supabase
        .from('profiles')
        .update(updateField)
        .eq('id', profile.id);

      if (dbErr) throw dbErr;

      alert('تم رفع المستند بنجاح وهو الآن قيد المراجعة والتدقيق مجدداً!');
      if (onRefreshProfile) onRefreshProfile();
    } catch (err) {
      alert('حدث خطأ أثناء الرفع: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* شريط علوي */}
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
              onClick={onLogout}
              className="bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <LogOut size={14} />
              <span>تسجيل خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col justify-center">
        
        {/* أ- السائق غير المعتمد / المعلق / المرفوض / المجمد */}
        {profile.role === 'driver' && (!profile.is_verified || profile.driver_status !== 'approved') ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
            
            {/* في حالة الرفض */}
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
              /* في حالة التجميد */
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
              /* في حالة الانتظار */
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

            {/* الأزرار المعطلة */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 mb-8 opacity-50 cursor-not-allowed">
              <button disabled className="bg-slate-200 text-slate-500 font-bold text-xs px-6 py-3 rounded-xl">
                البحث عن شحنات قريبة (معطل)
              </button>
              <button disabled className="bg-slate-200 text-slate-500 font-bold text-xs px-6 py-3 rounded-xl">
                استقبال طلبات النقل (معطل)
              </button>
            </div>

            {/* إكانية إعادة رفع المستندات */}
            <div className="border-t border-slate-100 pt-6 max-w-md mx-auto text-right">
              <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1">
                <RefreshCw size={14} className={`text-sky-600 ${actionLoading ? 'animate-spin' : ''}`} />
                إعادة رفع وتصحيح المستندات:
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-600">الصورة الشخصية (سيلفي)</span>
                  <label className="bg-white border border-slate-300 hover:border-sky-500 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all">
                    تعديل
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleReuploadDoc(e.target.files[0], 'selfie')} 
                      disabled={actionLoading}
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-600">رخصة القيادة</span>
                  <label className="bg-white border border-slate-300 hover:border-sky-500 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all">
                    تعديل
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleReuploadDoc(e.target.files[0], 'license')} 
                      disabled={actionLoading}
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-600">الهوية الشخصية</span>
                  <label className="bg-white border border-slate-300 hover:border-sky-500 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all">
                    تعديل
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleReuploadDoc(e.target.files[0], 'idcard')} 
                      disabled={actionLoading}
                    />
                  </label>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* ب- العميل أو السائق المعتمد */
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
  );
}
