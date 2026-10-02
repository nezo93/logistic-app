import React, { useState } from 'react';
import { 
  Truck, 
  User, 
  ShieldAlert, 
  QrCode, 
  Wallet, 
  MapPin, 
  Send,
  Coins,
  CheckCircle
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
    paymentStatus: "unpaid"
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
    setChat(prev => [...prev, { sender: 'system', text: `تم قبول العرض بقيمة ${activeOffer.toLocaleString()} جنيه. يرجى إيداع الضمان عبر بنكك.` }]);
    setActiveOffer(null);
  };

  const handleUploadPayment = () => {
    setTrip(prev => ({ ...prev, paymentStatus: 'verification_pending' }));
    setChat(prev => [...prev, { sender: 'system', text: 'تم رفع إشعار التحويل وبانتظار مراجعة المنصة.' }]);
  };

  const handleAdminApprovePayment = () => {
    setTrip(prev => ({ ...prev, paymentStatus: 'held', status: 'confirmed' }));
    setChat(prev => [...prev, { sender: 'system', text: 'تأكيد الدفع! المبلغ الآن مضمون بالمنصة.' }]);
  };

  const handleScanQR = () => {
    setTrip(prev => ({ ...prev, status: 'delivered', paymentStatus: 'released' }));
    setChat(prev => [...prev, { sender: 'system', text: 'تم مسح QR بنجاح وتكتمل الرحلة!' }]);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" dir="rtl">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-sky-600 p-2 rounded-xl text-white">
              <Truck size={28} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">تريلا الذكية</h1>
              <p className="text-xs text-slate-500">نظام نقل لوجستي آمن</p>
            </div>
          </div>
          
          <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200">
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
        <section className="md:col-span-1 flex flex-col gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="font-bold text-slate-800 text-lg mb-4">تفاصيل الرحلة</h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <MapPin className="text-emerald-500 shrink-0" size={20} />
                <div>
                  <p className="text-xs text-slate-400">الانطلاق</p>
                  <p className="text-sm font-bold text-slate-700">{trip.pickup}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="text-rose-500 shrink-0" size={20} />
                <div>
                  <p className="text-xs text-slate-400">الوصول</p>
                  <p className="text-sm font-bold text-slate-700">{trip.dropoff}</p>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-400">البضاعة</p>
                <p className="text-sm font-bold text-slate-700">{trip.cargo}</p>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-400">السعر المتفق عليه</p>
                  <p className="text-lg font-black text-sky-600">
                    {trip.finalPrice ? `${trip.finalPrice.toLocaleString()} ج.س` : "غير محدد"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="md:col-span-2 flex flex-col gap-6">
          {currentRole === 'customer' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-lg mb-4">لوحة العميل</h2>

                {trip.finalPrice && trip.paymentStatus === 'unpaid' && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-4 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">تحويل الضمان عبر بنكك</h4>
                      <p className="text-xs text-slate-600">حّول {trip.finalPrice.toLocaleString()} ج.س لحساب المنصة</p>
                    </div>
                    <button onClick={handleUploadPayment} className="bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-lg">
                      تأكيد التحويل
                    </button>
                  </div>
                )}

                {trip.paymentStatus === 'held' && trip.status !== 'delivered' && (
                  <div className="bg-sky-50 border border-sky-200 p-5 rounded-xl mb-4 text-center">
                    <QrCode size={48} className="text-sky-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-600">رمز الاستلام الرقمي جاهز للتقديم للسائق</p>
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col h-72">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">التفاوض المالي</span>
                  {activeOffer && (
                    <button onClick={handleAcceptOffer} className="bg-emerald-600 text-white text-xs px-3 py-1 rounded font-bold">
                      قبول {activeOffer.toLocaleString()} ج.س
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
                    placeholder="اكتب رسالة..."
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
                <h2 className="font-bold text-slate-800 text-lg mb-4">لوحة السائق</h2>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                  <p className="text-xs font-bold text-slate-700 mb-2">تقديم عرض سعر:</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleSendOffer(400000)} className="bg-white border px-3 py-1.5 rounded text-xs font-bold">400,000 ج.س</button>
                    <button onClick={() => handleSendOffer(420000)} className="bg-white border px-3 py-1.5 rounded text-xs font-bold">420,000 ج.س</button>
                  </div>
                </div>

                {trip.status === 'confirmed' && (
                  <button onClick={handleScanQR} className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg w-full">
                    مسح كود الاستلام QR
                  </button>
                )}
              </div>
            </div>
          )}

          {currentRole === 'admin' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1">
              <h2 className="font-bold text-slate-800 text-lg mb-4">لوحة المسؤول</h2>
              {trip.paymentStatus === 'verification_pending' ? (
                <button onClick={handleAdminApprovePayment} className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg">
                  تأكيد مطابقة الإيداع عبر بنكك
                </button>
              ) : (
                <p className="text-xs text-slate-400">لا يوجد إيداعات معلقة حالياً</p>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
