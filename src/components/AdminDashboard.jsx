import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  RefreshCw, 
  Eye, 
  ZoomIn, 
  Send, 
  UserCheck, 
  UserX, 
  MessageCircle, 
  Search, 
  Ban, 
  Clock, 
  CheckCircle, 
  Phone, 
  Mail, 
  X,
  Truck
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function AdminDashboard({ onNavigate }) {
  const [driversList, setDriversList] = useState([]);
  const [adminTab, setAdminTab] = useState('pending'); // pending, approved, rejected
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedRejectTemplate, setSelectedRejectTemplate] = useState('');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const rejectionTemplates = [
    'صورة رخصة القيادة غير واضحة أو باهتة، يرجى إعادة تصويرها.',
    'صورة البطاقة القومية/الهوية غير مكتملة الحواف أو منتهية الصلاحية.',
    'الصورة الشخصية (السيلفي) غير مطابقة للوجه في الهوية الرسمية.',
    'المستندات المرفوعة لا تخص صاحب الطلب المسجل.',
    'سبب مخصص (كتابة نص آخر)...'
  ];

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
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
      console.error('خطأ في جلب السائقين:', err);
    } finally {
      setActionLoading(false);
    }
  };

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
      alert('تم اعتماد وتفعيل السائق بنجاح!');
      setSelectedDriver(null);
      fetchDrivers();
    } catch (err) {
      alert('خطأ أثناء الاعتماد: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

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
      alert('تم تسجيل الرفض وحفظ السبب ليظهر في حساب السائق.');
      setShowRejectBox(false);
      setSelectedDriver(null);
      setSelectedRejectTemplate('');
      setCustomRejectReason('');
      fetchDrivers();
    } catch (err) {
      alert('خطأ أثناء الرفض: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

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
      fetchDrivers();
    } catch (err) {
      alert('خطأ أثناء التجميد: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenWhatsApp = (driver) => {
    if (!driver.phone) {
      alert('رقم هاتف السائق غير متوفر');
      return;
    }
    let phone = driver.phone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '249' + phone.substring(1);
    const msg = encodeURIComponent(`مرحباً كابتن ${driver.full_name}، معك إدارة منصة تريلا الذكية بخصوص حسابك.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const filteredDrivers = driversList.filter((d) => {
    const matchesTab = 
      adminTab === 'pending' 
        ? (d.driver_status === 'pending' || (!d.is_verified && d.driver_status !== 'rejected' && d.driver_status !== 'suspended'))
        : adminTab === 'approved' 
        ? (d.driver_status === 'approved' || d.is_verified)
        : (d.driver_status === 'rejected' || d.driver_status === 'suspended');

    const matchesSearch = 
      (d.full_name && d.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.phone && d.phone.includes(searchQuery)) ||
      (d.email && d.email.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  const stats = {
    pending: driversList.filter(d => d.driver_status === 'pending' || (!d.is_verified && d.driver_status !== 'rejected' && d.driver_status !== 'suspended')).length,
    approved: driversList.filter(d => d.driver_status === 'approved' || d.is_verified).length,
    rejected: driversList.filter(d => d.driver_status === 'rejected' || d.driver_status === 'suspended').length
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 min-h-screen" dir="rtl">
      
      {/* شريط التنقل العلوي */}
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
              onClick={fetchDrivers} 
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
            >
              <RefreshCw size={14} className={actionLoading ? 'animate-spin' : ''} />
              <span>تحديث</span>
            </button>
            <button 
              onClick={() => onNavigate('landing')} 
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all"
            >
              إغلاق اللوحة
            </button>
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        
        {/* بطاقات الإحصائيات السريعة */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button 
            onClick={() => setAdminTab('pending')} 
            className={`p-5 rounded-2xl border text-right transition-all cursor-pointer ${adminTab === 'pending' ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-white border-slate-200'}`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500">بانتظار التدقيق</span>
              <Clock size={18} className="text-amber-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">{stats.pending}</p>
          </button>

          <button 
            onClick={() => setAdminTab('approved')} 
            className={`p-5 rounded-2xl border text-right transition-all cursor-pointer ${adminTab === 'approved' ? 'bg-emerald-50 border-emerald-300 shadow-sm' : 'bg-white border-slate-200'}`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500">السائقون المعتمدون</span>
              <CheckCircle size={18} className="text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">{stats.approved}</p>
          </button>

          <button 
            onClick={() => setAdminTab('rejected')} 
            className={`p-5 rounded-2xl border text-right transition-all cursor-pointer ${adminTab === 'rejected' ? 'bg-rose-50 border-rose-300 shadow-sm' : 'bg-white border-slate-200'}`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500">المرفوضون والمجمدون</span>
              <UserX size={18} className="text-rose-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">{stats.rejected}</p>
          </button>
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

          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute right-3 top-3 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              placeholder="ابحث بالاسم، الهاتف، أو الإيميل..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-4 py-2 text-xs focus:outline-none focus:border-sky-500" 
            />
          </div>
        </div>

        {/* جدول السائقين */}
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
                    <td colSpan="6" className="p-8 text-center text-slate-400 font-bold">
                      لا توجد سجلات في هذا القسم حالياً
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
                            <CheckCircle size={12} /> معتمد
                          </span>
                        ) : d.driver_status === 'rejected' ? (
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                            <UserX size={12} /> مرفوض
                          </span>
                        ) : d.driver_status === 'suspended' ? (
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                            <Ban size={12} /> مجمد
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                            <Clock size={12} /> قيد التدقيق
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenWhatsApp(d)} 
                          title="تواصل عبر واتساب" 
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 p-2 rounded-xl transition-all"
                        >
                          <MessageCircle size={14} />
                        </button>
                        <button 
                          onClick={() => { setSelectedDriver(d); setShowRejectBox(false); }} 
                          className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <Eye size={14} />
                          <span>معاينة</span>
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

      {/* Modal نافذة المعاينة المنبثقة للمطابقة الثلاثية */}
      {selectedDriver && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-5xl w-full max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center font-bold">
                  <Truck size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900">مطابقة ملف: {selectedDriver.full_name}</h3>
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

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                
                {/* السيلفي */}
                <div className="bg-slate-50 p-4 rounded-2xl border-2 border-sky-100 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-sky-900">1. السيلفي (الوجه)</span>
                    <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded font-bold">وجه الكابتن</span>
                  </div>
                  <div className="relative group rounded-xl overflow-hidden bg-slate-200 h-48 flex items-center justify-center">
                    {selectedDriver.selfie_url ? (
                      <>
                        <img src={selectedDriver.selfie_url} alt="سيلفي" className="h-full w-full object-cover" />
                        <button 
                          onClick={() => setZoomedImage(selectedDriver.selfie_url)} 
                          className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-xs font-bold transition-all"
                        >
                          <ZoomIn size={16} /> تكبير
                        </button>
                      </>
                    ) : <span className="text-xs text-slate-400">غير متوفرة</span>}
                  </div>
                </div>

                {/* الهوية */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-800">2. البطاقة القومية</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">الرقم الوطني</span>
                  </div>
                  <div className="relative group rounded-xl overflow-hidden bg-slate-200 h-48 flex items-center justify-center">
                    {selectedDriver.id_card_url ? (
                      <>
                        <img src={selectedDriver.id_card_url} alt="هوية" className="h-full w-full object-cover" />
                        <button 
                          onClick={() => setZoomedImage(selectedDriver.id_card_url)} 
                          className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-xs font-bold transition-all"
                        >
                          <ZoomIn size={16} /> تكبير
                        </button>
                      </>
                    ) : <span className="text-xs text-slate-400">غير متوفرة</span>}
                  </div>
                </div>

                {/* الرخصة */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-800">3. رخصة القيادة</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">سارية</span>
                  </div>
                  <div className="relative group rounded-xl overflow-hidden bg-slate-200 h-48 flex items-center justify-center">
                    {selectedDriver.license_url ? (
                      <>
                        <img src={selectedDriver.license_url} alt="رخصة" className="h-full w-full object-cover" />
                        <button 
                          onClick={() => setZoomedImage(selectedDriver.license_url)} 
                          className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-xs font-bold transition-all"
                        >
                          <ZoomIn size={16} /> تكبير
                        </button>
                      </>
                    ) : <span className="text-xs text-slate-400">غير متوفرة</span>}
                  </div>
                </div>

              </div>

              {selectedDriver.rejection_reason && (
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 font-bold">
                  📌 ملاحظة سابقة: {selectedDriver.rejection_reason}
                </div>
              )}

              {/* صندوق الرفض الذكي */}
              {showRejectBox && (
                <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl space-y-3">
                  <label className="block text-xs font-bold text-rose-900">اختر سبب الرفض:</label>
                  <select 
                    value={selectedRejectTemplate} 
                    onChange={e => setSelectedRejectTemplate(e.target.value)} 
                    className="w-full bg-white border border-rose-300 rounded-xl p-2.5 text-xs focus:outline-none"
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
                      onChange={e => setCustomRejectReason(e.target.value)} 
                      placeholder="اكتب السبب..." 
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
                      <span>{actionLoading ? 'جاري الحفظ...' : 'تأكيد الرفض'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
              <button 
                onClick={() => handleOpenWhatsApp(selectedDriver)} 
                className="text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 font-bold px-4 py-2 rounded-xl flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <MessageCircle size={15} />
                <span>واتساب</span>
              </button>

              <div className="flex gap-2.5 w-full sm:w-auto justify-end">
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
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-md shadow-emerald-600/20"
                  >
                    <UserCheck size={16} />
                    <span>{actionLoading ? 'جاري الاعتماد...' : 'اعتماد وتفعيل'}</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* نافذة تكبير الصور */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-60 flex items-center justify-center p-4 cursor-pointer" 
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl">
            <img src={zoomedImage} alt="مكبرة" className="w-full h-full object-contain" />
            <span className="absolute top-3 right-3 bg-black/70 text-white text-xs px-3 py-1 rounded-full">
              انقر للإغلاق ✕
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
