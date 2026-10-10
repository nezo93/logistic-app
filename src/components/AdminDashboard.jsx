import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, RefreshCw, ZoomIn, Send, UserCheck, UserX, 
  MessageCircle, Search, Ban, Clock, CheckCircle, Phone, Mail, X, Truck 
} from 'lucide-react';
import { supabase } from '../supabaseClient';

// تعريف أيقونة العين يدوياً لحل مشكلة "Eye is not defined" نهائياً
const Eye = ({ size = 16, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export default function AdminDashboard({ onNavigate }) {
  const [driversList, setDriversList] = useState([]);
  const [adminTab, setAdminTab] = useState('pending');
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
      console.error('Error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveDriver = async (driverId) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: true, driver_status: 'approved', rejection_reason: null })
        .eq('id', driverId);
      if (error) throw error;
      alert('تم الاعتماد بنجاح');
      setSelectedDriver(null);
      fetchDrivers();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectDriver = async (driverId) => {
    const finalReason = selectedRejectTemplate === 'سبب مخصص (كتابة نص آخر)...' ? customRejectReason : selectedRejectTemplate;
    if (!finalReason) return alert('اختر سبب الرفض');
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: false, driver_status: 'rejected', rejection_reason: finalReason })
        .eq('id', driverId);
      if (error) throw error;
      alert('تم تسجيل الرفض');
      setShowRejectBox(false);
      setSelectedDriver(null);
      fetchDrivers();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredDrivers = driversList.filter((d) => {
    const status = d.driver_status || 'pending';
    const matchesTab = adminTab === 'pending' ? (status === 'pending') : adminTab === 'approved' ? (status === 'approved') : (status === 'rejected' || status === 'suspended');
    const matchesSearch = d.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || d.phone?.includes(searchQuery);
    return matchesTab && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col bg-slate-100 min-h-screen" dir="rtl">
      <header className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-amber-500" />
          <h1 className="text-base font-bold text-white">لوحة الإشراف</h1>
        </div>
        <button onClick={() => onNavigate('landing')} className="bg-rose-600 text-white px-4 py-1.5 rounded-lg text-xs">إغلاق</button>
      </header>

      <main className="p-6 space-y-6">
        <div className="flex bg-white p-1 rounded-xl w-fit border border-slate-200">
          {['pending', 'approved', 'rejected'].map(tab => (
            <button key={tab} onClick={() => setAdminTab(tab)} className={`px-4 py-2 text-xs font-bold rounded-lg ${adminTab === tab ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>
              {tab === 'pending' ? 'قيد التدقيق' : tab === 'approved' ? 'المعتمدون' : 'المرفوضون'}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="p-4">الاسم</th>
                <th className="p-4">الهاتف</th>
                <th className="p-4 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map(d => (
                <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="p-4 font-bold">{d.full_name}</td>
                  <td className="p-4">{d.phone}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => setSelectedDriver(d)} className="bg-sky-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 mx-auto">
                      <Eye size={14} /> معاينة
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal المعاينة */}
      {selectedDriver && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-4xl w-full max-h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold">{selectedDriver.full_name}</h3>
              <button onClick={() => setSelectedDriver(null)}><X /></button>
            </div>
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'سيلفي', url: selectedDriver.selfie_url },
                { label: 'رخصة', url: selectedDriver.license_url },
                { label: 'هوية', url: selectedDriver.id_card_url }
              ].map((img, i) => (
                <div key={i} className="space-y-2 text-center">
                  <p className="text-xs font-bold">{img.label}</p>
                  <div className="bg-slate-100 h-48 rounded-xl overflow-hidden border">
                    {img.url ? <img src={img.url} className="w-full h-full object-cover" onClick={() => setZoomedImage(img.url)} /> : 'لا توجد صورة'}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t flex justify-end gap-2 bg-slate-50">
              <button onClick={() => setShowRejectBox(true)} className="bg-rose-100 text-rose-600 px-4 py-2 rounded-lg font-bold text-xs">رفض</button>
              <button onClick={() => handleApproveDriver(selectedDriver.id)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-xs">اعتماد</button>
            </div>
            {showRejectBox && (
              <div className="p-4 border-t bg-rose-50 space-y-3">
                <select className="w-full p-2 rounded-lg text-xs border" onChange={e => setSelectedRejectTemplate(e.target.value)}>
                  <option value="">-- اختر سبب الرفض --</option>
                  {rejectionTemplates.map((t, i) => <option key={i} value={t}>{t}</option>)}
                </select>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowRejectBox(false)} className="text-xs">إلغاء</button>
                  <button onClick={() => handleRejectDriver(selectedDriver.id)} className="bg-rose-600 text-white px-4 py-1.5 rounded-lg text-xs">تأكيد الرفض</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {zoomedImage && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={() => setZoomedImage(null)}>
          <img src={zoomedImage} className="max-w-full max-h-full rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
}
