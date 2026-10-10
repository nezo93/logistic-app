import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminDashboard({ onNavigate }) {
  const [driversList, setDriversList] = useState([]);
  const [adminTab, setAdminTab] = useState('pending'); // 'pending' | 'approved' | 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedRejectTemplate, setSelectedRejectTemplate] = useState('');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const rejectionTemplates = [
    'صورة رخصة القيادة غير واضحة أو باهتة، يرجى إعادة تصويرها.',
    'صورة البطاقة القومية/الهوية غير مكتملة الحواف أو منتهية الصلاحية.',
    'الصورة الشخصية (السيلفي) غير مطابقة للوجه في الهوية الرسمية.',
    'المستندات المرفوعة لا تخص صاحب الطلب المسجل.',
    'سبب مخصص (كتابة نص آخر)...'
  ];

  // جلب البيانات عند الفتح
  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDriversList(data || []);
    } catch (err) {
      console.error('خطأ في جلب البيانات:', err);
      setErrorMessage(err?.message || 'فشل الاتصال بقاعدة البيانات.');
    } finally {
      setLoading(false);
    }
  };

  // اعتماد وتفعيل السائق
  const handleApprove = async (driverId) => {
    if (!driverId) return;
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
      alert('✅ تم تفعيل واعتتماد حساب السائق بنجاح!');
      setSelectedDriver(null);
      await fetchDrivers();
    } catch (err) {
      alert('❌ حدث خطأ: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // رفض السائق
  const handleReject = async (driverId) => {
    const reason = selectedRejectTemplate === 'سبب مخصص (كتابة نص آخر)...' 
      ? customRejectReason 
      : selectedRejectTemplate;

    if (!reason || !reason.trim()) {
      alert('يرجى تحديد أو كتابة سبب الرفض أولاً.');
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_verified: false, 
          driver_status: 'rejected', 
          rejection_reason: reason 
        })
        .eq('id', driverId);

      if (error) throw error;
      alert('تم إرسال قرار الرفض وحفظ السبب في حساب السائق.');
      setShowRejectBox(false);
      setSelectedDriver(null);
      setSelectedRejectTemplate('');
      setCustomRejectReason('');
      await fetchDrivers();
    } catch (err) {
      alert('❌ حدث خطأ: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // تجميد الحساب
  const handleSuspend = async (driverId) => {
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
      alert('تم تجميد حساب السائق.');
      setSelectedDriver(null);
      await fetchDrivers();
    } catch (err) {
      alert('❌ حدث خطأ: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // فتح واتساب
  const handleWhatsApp = (driver) => {
    if (!driver?.phone) {
      alert('رقم الهاتف غير متاح.');
      return;
    }
    let phone = driver.phone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '249' + phone.substring(1);
    const text = encodeURIComponent(`مرحباً كابتن ${driver.full_name || ''}، معك إدارة منصة تريلا الذكية بخصوص حسابك.`);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  // الفلترة الآمنة
  const filteredDrivers = (driversList || []).filter((driver) => {
    const status = driver?.driver_status || (driver?.is_verified ? 'approved' : 'pending');
    
    const matchesTab = 
      adminTab === 'pending' ? (status === 'pending') :
      adminTab === 'approved' ? (status === 'approved') :
      (status === 'rejected' || status === 'suspended');

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      (driver?.full_name && driver.full_name.toLowerCase().includes(query)) ||
      (driver?.phone && driver.phone.includes(query)) ||
      (driver?.email && driver.email.toLowerCase().includes(query));

    return matchesTab && matchesSearch;
  });

  // حساب الأعداد
  const pendingCount = driversList.filter(d => (d.driver_status || (d.is_verified ? 'approved' : 'pending')) === 'pending').length;
  const approvedCount = driversList.filter(d => (d.driver_status || (d.is_verified ? 'approved' : 'pending')) === 'approved').length;
  const rejectedCount = driversList.filter(d => ['rejected', 'suspended'].includes(d.driver_status)).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans" dir="rtl">
      
      {/* 1. الشريط العلوي */}
      <header className="bg-slate-900 text-white px-6 py-4 sticky top-0 z-30 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-slate-950 font-black p-2 rounded-xl text-xs">🛡️ الإشراف</div>
          <div>
            <h1 className="text-base font-black text-white">لوحة تدقيق وتوثيق السائقين</h1>
            <p className="text-[10px] text-slate-400">إدارة المطابقة الثلاثية للمستندات</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchDrivers} 
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-xl font-bold transition-all"
          >
            🔄 إعادة تحميل
          </button>
          <button 
            onClick={() => onNavigate && onNavigate('landing')} 
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all"
          >
            ✕ خروج
          </button>
        </div>
      </header>

      {/* 2. محتوى الصفحة الرئيسي */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
        
        {/* رسائل الخطأ إن وجدت */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs font-bold">
            ⚠️ خطأ في الاتصال: {errorMessage}
          </div>
        )}

        {/* كروت الإحصائيات والتنقل */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div 
            onClick={() => setAdminTab('pending')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all ${adminTab === 'pending' ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-white border-slate-200'}`}
          >
            <p className="text-xs font-bold text-slate-500">⏳ قيد التدقيق والمراجعة</p>
            <p className="text-2xl font-black text-slate-900 mt-2">{pendingCount}</p>
          </div>

          <div 
            onClick={() => setAdminTab('approved')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all ${adminTab === 'approved' ? 'bg-emerald-50 border-emerald-300 shadow-sm' : 'bg-white border-slate-200'}`}
          >
            <p className="text-xs font-bold text-slate-500">✅ السائقون المعتمدون</p>
            <p className="text-2xl font-black text-slate-900 mt-2">{approvedCount}</p>
          </div>

          <div 
            onClick={() => setAdminTab('rejected')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all ${adminTab === 'rejected' ? 'bg-rose-50 border-rose-300 shadow-sm' : 'bg-white border-slate-200'}`}
          >
            <p className="text-xs font-bold text-slate-500">🚫 المرفوضون والمجمدون</p>
            <p className="text-2xl font-black text-slate-900 mt-2">{rejectedCount}</p>
          </div>
        </div>

        {/* أدوات الفلترة والبحث */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between gap-4 items-center">
          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button 
              onClick={() => setAdminTab('pending')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${adminTab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              قيد التدقيق ({pendingCount})
            </button>
            <button 
              onClick={() => setAdminTab('approved')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${adminTab === 'approved' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              المعتمدون ({approvedCount})
            </button>
            <button 
              onClick={() => setAdminTab('rejected')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${adminTab === 'rejected' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              المرفوضون ({rejectedCount})
            </button>
          </div>

          <div className="w-full sm:w-72">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 ابحث بالاسم، الرقم، أو البريد..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* الجدول الرئيسي */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400">
              جاري تحميل قائمة السائقين من قاعدة البيانات...
            </div>
          ) : (
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
                        لا توجد سجلات مطابقة حالياً
                      </td>
                    </tr>
                  ) : (
                    filteredDrivers.map((driver) => {
                      const st = driver?.driver_status || (driver?.is_verified ? 'approved' : 'pending');
                      return (
                        <tr key={driver.id} className="hover:bg-slate-50 transition-all">
                          <td className="p-4 font-bold text-slate-900">{driver.full_name || 'بدون اسم'}</td>
                          <td className="p-4 font-mono">{driver.phone || 'غير مسجل'}</td>
                          <td className="p-4 font-mono text-[11px] text-slate-500">{driver.email || '-'}</td>
                          <td className="p-4 text-slate-500">
                            {driver.created_at ? new Date(driver.created_at).toLocaleDateString('ar-EG') : '-'}
                          </td>
                          <td className="p-4">
                            {st === 'approved' ? (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold">
                                ✅ معتمد ومفعل
                              </span>
                            ) : st === 'rejected' ? (
                              <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full text-[10px] font-bold">
                                ❌ مرفوض
                              </span>
                            ) : st === 'suspended' ? (
                              <span className="bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1 rounded-full text-[10px] font-bold">
                                🚫 مجمد
                              </span>
                            ) : (
                              <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-bold">
                                ⏳ قيد التدقيق
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => handleWhatsApp(driver)}
                                title="محادثة واتساب"
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-2.5 py-1.5 rounded-xl font-bold text-[11px]"
                              >
                                💬 واتساب
                              </button>

                              <button 
                                onClick={() => { setSelectedDriver(driver); setShowRejectBox(false); }}
                                className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-sm transition-all"
                              >
                                👁️ معاينة
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* 3. نافذة المعاينة المنبثقة (Modal) */}
      {selectedDriver && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-5xl w-full max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            
            {/* رأس النافذة */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  مطابقة مستندات: {selectedDriver.full_name || 'بدون اسم'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  الهاتف: {selectedDriver.phone || 'غير مسجل'} | البريد: {selectedDriver.email || '-'}
                </p>
              </div>
              <button 
                onClick={() => { setSelectedDriver(null); setShowRejectBox(false); }}
                className="text-slate-400 hover:text-slate-700 font-black text-lg p-2"
              >
                ✕
              </button>
            </div>

            {/* محتوى المستندات (المطابقة الثلاثية) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                
                {/* 1. السيلفي */}
                <div className="bg-slate-50 p-4 rounded-2xl border-2 border-sky-100 flex flex-col justify-between">
                  <span className="text-xs font-bold text-sky-900 mb-2">1. الصورة الشخصية (سيلفي)</span>
                  <div className="rounded-xl overflow-hidden bg-slate-200 h-48 flex items-center justify-center">
                    {selectedDriver.selfie_url ? (
                      <img 
                        src={selectedDriver.selfie_url} 
                        alt="سيلفي" 
                        className="h-full w-full object-cover cursor-pointer hover:opacity-90"
                        onClick={() => setZoomedImage(selectedDriver.selfie_url)}
                      />
                    ) : (
                      <span className="text-xs text-slate-400 font-bold">لا توجد صورة سيلفي</span>
                    )}
                  </div>
                </div>

                {/* 2. البطاقة القومية */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-800 mb-2">2. البطاقة القومية / الهوية</span>
                  <div className="rounded-xl overflow-hidden bg-slate-200 h-48 flex items-center justify-center">
                    {selectedDriver.id_card_url ? (
                      <img 
                        src={selectedDriver.id_card_url} 
                        alt="هوية" 
                        className="h-full w-full object-cover cursor-pointer hover:opacity-90"
                        onClick={() => setZoomedImage(selectedDriver.id_card_url)}
                      />
                    ) : (
                      <span className="text-xs text-slate-400 font-bold">لا توجد صورة هوية</span>
                    )}
                  </div>
                </div>

                {/* 3. الرخصة */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-800 mb-2">3. رخصة القيادة</span>
                  <div className="rounded-xl overflow-hidden bg-slate-200 h-48 flex items-center justify-center">
                    {selectedDriver.license_url ? (
                      <img 
                        src={selectedDriver.license_url} 
                        alt="رخصة" 
                        className="h-full w-full object-cover cursor-pointer hover:opacity-90"
                        onClick={() => setZoomedImage(selectedDriver.license_url)}
                      />
                    ) : (
                      <span className="text-xs text-slate-400 font-bold">لا توجد صورة رخصة</span>
                    )}
                  </div>
                </div>

              </div>

              {/* ملاحظات الرفض السابقة */}
              {selectedDriver.rejection_reason && (
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 font-bold">
                  📌 ملاحظة المراجعة السابقة: {selectedDriver.rejection_reason}
                </div>
              )}

              {/* صندوق تحديد سبب الرفض */}
              {showRejectBox && (
                <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl space-y-3">
                  <label className="block text-xs font-bold text-rose-900">حدد سبب الرفض ليتم حفظه في حساب السائق:</label>
                  
                  <select 
                    value={selectedRejectTemplate}
                    onChange={(e) => setSelectedRejectTemplate(e.target.value)}
                    className="w-full bg-white border border-rose-300 rounded-xl p-2.5 text-xs focus:outline-none"
                  >
                    <option value="">-- اختر سبباً جاهزاً من القائمة --</option>
                    {rejectionTemplates.map((template, idx) => (
                      <option key={idx} value={template}>{template}</option>
                    ))}
                  </select>

                  {selectedRejectTemplate === 'سبب مخصص (كتابة نص آخر)...' && (
                    <textarea 
                      rows="2"
                      value={customRejectReason}
                      onChange={(e) => setCustomRejectReason(e.target.value)}
                      placeholder="اكتب سبب الرفض بالتفصيل..."
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
                      onClick={() => handleReject(selectedDriver.id)}
                      disabled={actionLoading}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm"
                    >
                      {actionLoading ? 'جاري الحفظ...' : 'تأكيد الرفض'}
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* أزرار اتخاذ القرار */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <button 
                onClick={() => handleWhatsApp(selectedDriver)}
                className="text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 font-bold px-4 py-2 rounded-xl"
              >
                💬 تواصل عبر واتساب
              </button>

              <div className="flex gap-2">
                {selectedDriver.is_verified && (
                  <button 
                    onClick={() => handleSuspend(selectedDriver.id)}
                    className="bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-700 text-xs font-bold px-4 py-2 rounded-xl"
                  >
                    🚫 تجميد الحساب
                  </button>
                )}

                {!showRejectBox && !selectedDriver.is_verified && (
                  <button 
                    onClick={() => setShowRejectBox(true)}
                    className="bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold px-5 py-2 rounded-xl"
                  >
                    ❌ رفض المستندات
                  </button>
                )}

                {!selectedDriver.is_verified && (
                  <button 
                    onClick={() => handleApprove(selectedDriver.id)}
                    disabled={actionLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-2 rounded-xl shadow-md"
                  >
                    {actionLoading ? 'جاري التفعيل...' : '✅ اعتماد وتفعيل السائق فوراً'}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 4. نافذة التكبير للصور */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-60 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl">
            <img src={zoomedImage} alt="صورة مكبرة" className="w-full h-full object-contain" />
            <span className="absolute top-3 right-3 bg-black/70 text-white text-xs px-3 py-1 rounded-full">
              انقر للإغلاق ✕
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
