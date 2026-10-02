import React, { useState } from 'react';
import { 
  Truck, 
  User, 
  ShieldAlert, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  QrCode, 
  Wallet, 
  MapPin, 
  Send,
  Upload,
  Coins
} from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState('customer');
  
  const [trip, setTrip] = useState({
    id: "TRIP-2026-X",
    status: "pending",
    pickup: "الخرطوم - السوق المحلي",
    dropoff: "عطبرة - السوق الكبير",
    cargo: "مواد غذائية - 5 طن",
    finalPrice: null,
    paymentStatus: "unpaid",
    paymentProof: null,
  });

  const [chat, setChat] = useState([
    { sender: 'system', text: 'تم إنشاء طلب الشحن بنجاح. في انتظار عروض السائقين...' }
  ]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [activeOffer, setActiveOffer] = useState(null);

  const handleSendMessage = (text, sender = 'customer') => {
    if (!text.trim()) return;
    setChat(prev => [...prev, { sender, text }]);
    setCurrentMessage("");
  };

  const handleSendOffer = (amount) => {
    setActiveOffer(amount);
    setChat(prev => [
      ...prev, 
      { sender: 'driver', text: `أقدم لك عرض شحن رسمي بقيمة ${amount.toLocaleString()} جنيه سوداني.` }
    ]);
  };

  const handleAcceptOffer = () => {
    setTrip(prev => ({ ...prev, status: 'negotiating', finalPrice: activeOffer }));
    setChat(prev => [...prev, { sender: 'system', text: `تم قبول العرض بقيمة ${activeOffer.toLocaleString()} جنيه. يرجى إيداع الضمان عبر تطبيق بنكك.` }]);
    setActiveOffer(null);
  };

  const handleUploadPayment = () => {
    setTrip(prev => ({ ...prev, paymentStatus: 'verification_pending' }));
    setChat(prev => [...prev, { sender: 'system', text: 'تم رفع إشعار التحويل المالي وبانتظار مراجعة إدارة المنصة.' }]);
  };

  const handleAdminApprovePayment = () => {
    setTrip(prev => ({ ...prev, paymentStatus: 'held', status: 'confirmed' }));
    setChat(prev => [...prev, { sender: 'system', text: 'تأكيد الدفع! المبلغ الآن بأمان في محفظة الضمان بالمنصة. يمكن للسائق التحرك للاستلام.' }]);
  };

  const handleScanQR = () => {
    setTrip(prev => ({ ...prev, status: 'delivered', paymentStatus: 'released' }));
    setChat(prev => [...prev, { sender: 'system', text: 'تم مسح بصمة الـ QR بنجاح! تم تسليم الشحنة وتحرير الأموال لحساب السائق.' }]);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" dir="rtl">
      
      {/* شريط التنقل العلوي */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-sky-600 p-2 rounded-xl text-white">
              <Truck size={28} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">تريلا الذكية</h1>
              <p className="text-xs text-slate-500">نظام نقل لوجستي آمن وضامن</p>
            </div>
          </div>
          
          <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 px-3 font-bold">تجربة اللوحات:</span>
            <button 
              onClick={() => setCurrentRole('customer')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${currentRole === 'customer' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-600'}`}
            >
              العميل
            </button>
            <button 
              onClick={() => setCurrentRole('driver')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${currentRole === 'driver' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-600'}`}
            >
              السائق
            </button>
            <button 
              onClick={() => setCurrentRole('admin')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${currentRole === 'admin' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-600'}`}
            >
              المسؤول
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* تفاصيل الشحنة */}
        <section className="md:col-span-1 flex flex-col gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-slate-800 text-lg">تفاصيل الرحلة</h2>
              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{trip.id}</span>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <MapPin className="text-emerald-500 shrink-0" size={20} />
                <div>
                  <p className="text-xs text-slate-400">نقطة الانطلاق</p>
                  <p className="text-sm font-bold text-slate-700">{trip.pickup}</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <MapPin className="text-rose-500 shrink-0" size={20} />
                <div>
                  <p className="text-xs text-slate-400">وجهة الوصول</p>
                  <p className="text-sm font-bold text-slate-700">{trip.dropoff}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-400">نوع البضاعة</p>
                <p className="text-sm font-bold text-slate-700">{trip.cargo}</p>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-400">الاتفاق المالي</p>
                  <p className="text-lg font-black text-sky-600">
                    {trip.finalPrice ? `${trip.finalPrice.toLocaleString()} ج.س` : "لم يتفق بعد"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">حالة الضمان</p>
                  {trip.paymentStatus === 'unpaid' && <span className="text-xs bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full font-bold">غير مدفوع</span>}
                  {trip.paymentStatus === 'verification_pending' && <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-bold">قيد المراجعة</span>}
                  {trip.paymentStatus === 'held' && <span className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-bold">مضمون بالمنصة</span>}
                  {trip.paymentStatus === 'released' && <span className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full font-bold">تم المحول للسائق</span>}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* التفاعل والدردشة */}
        <section className="md:col-span-2 flex flex-col gap-6">
          {currentRole === 'customer' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-lg mb-4">بوابة العميل (صاحب الشحنة)</h2>

                {trip.finalPrice && trip.paymentStatus === 'unpaid' && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex gap-3 items-start">
                      <Wallet className="text-amber-600 shrink-0 mt-1" />
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">إيداع الضمان عبر بنكك</h4>
                        <p className="text-xs text-slate-600">حَوِّل {trip.finalPrice.toLocaleString()} ج.س إلى حساب المنصة ثم أكد الإشعار.</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleUploadPayment}
                      className="bg-amber-600 text-white font-bold text-xs px-4 py-2.5 rounded-lg shrink-0"
                    >
                      تأكيد التحويل
                    </button>
                  </div>
                )}

                {trip.paymentStatus === 'held' && trip.status !== 'delivered' && (
                  <div className="bg-sky-50 border border-sky-200 p-5 rounded-xl mb-4 text-center">
                    <QrCode size={48} className="text-sky-600 mx-auto mb-2" />
                    <h4 className="font-bold text-slate-800 text-sm">رمز الاستلام الرقمي (QR)</h4>
                    <p className="text-xs text-slate-600 mb-3">أظهر هذا الرمز للسائق عند الاستلام لتأكيد العملية.</p>
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col h-72">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">شات التفاوض المالي</span>
                  {activeOffer && (
                    <button onClick={handleAcceptOffer} className="bg-emerald-600 text-white text-xs px-3 py-1 rounded font-bold">
                      قبول عرض {activeOffer.toLocaleString()} ج.س
                    </button>
                  )}
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
                  {chat.map((msg, index) => (
                    <div key={index} className={`flex ${msg.sender === 'customer' ? 'justify-start' : msg.sender === 'system' ? 'justify-center' : 'justify-end'}`}>
                      <div className={`p-3 rounded-xl max-w-sm text-xs ${
                        msg.sender === 'customer' ? 'bg-sky-600 text-white' : 
                        msg.sender === 'system' ? 'bg-slate-200 text-slate-600 font-bold' : 
                        'bg-white text-slate-800 border border-slate-200'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t border-slate-200 bg-white flex gap-2">
                  <input 
                    type="text" 
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="اكتب رسالتك..."
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                  <button onClick={() => handleSendMessage(currentMessage, 'customer')} className="bg-sky-600 text-white p-2 rounded-lg">
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentRole === 'driver' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-lg mb-4">بوابة السائق (كابتن الشاحنة)</h2>

                {trip.status === 'confirmed' && trip.paymentStatus === 'held' && (
                  <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl mb-4 text-center">
                    <p className="text-sm font-bold text-slate-800
