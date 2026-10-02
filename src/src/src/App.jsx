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
  // إدارة الأدوار الحالية لتجربة المنصة بالكامل
  const [currentRole, setCurrentRole] = useState('customer'); // customer, driver, admin
  
  // حالة الرحلة التجريبية لمحاكاة النظام بالكامل
  const [trip, setTrip] = useState({
    id: "TRIP-2026-X",
    status: "pending", // pending, negotiating, confirmed, picked_up, delivered
    pickup: "الخرطوم - السوق المحلي",
    dropoff: "عطبرة - السوق الكبير",
    cargo: "مواد غذائية - 5 طن",
    finalPrice: null,
    paymentStatus: "unpaid", // unpaid, verification_pending, held, released
    paymentProof: null,
  });

  // إدارة نظام التفاوض الداخلي
  const [chat, setChat] = useState([
    { sender: 'system', text: 'تم إنشاء طلب الشحن بنجاح. في انتظار عروض السائقين...' }
  ]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [activeOffer, setActiveOffer] = useState(null);

  // إرسال رسالة عادية في الشات
  const handleSendMessage = (text, sender = 'customer') => {
    if (!text.trim()) return;
    setChat(prev => [...prev, { sender, text }]);
    setCurrentMessage("");
  };

  // قيام السائق بتقديم عرض سعر رسمي
  const handleSendOffer = (amount) => {
    setActiveOffer(amount);
    setChat(prev => [
      ...prev, 
      { sender: 'driver', text: `أقدم لك عرض شحن رسمي بقيمة ${amount.toLocaleString()} جنيه سوداني.` }
    ]);
  };

  // قبول العميل لعرض السعر
  const handleAcceptOffer = () => {
    setTrip(prev => ({ ...prev, status: 'negotiating', finalPrice: activeOffer }));
    setChat(prev => [...prev, { sender: 'system', text: `تم قبول العرض بقيمة ${activeOffer.toLocaleString()} جنيه. يرجى إيداع الضمان عبر تطبيق بنكك.` }]);
    setActiveOffer(null);
  };

  // محاكاة دفع العميل عبر بنكك ورفع الصورة
  const handleUploadPayment = () => {
    setTrip(prev => ({ ...prev, paymentStatus: 'verification_pending' }));
    setChat(prev => [...prev, { sender: 'system', text: 'تم رفع إشعار التحويل المالي وبانتظار مراجعة إدارة المنصة.' }]);
  };

  // تأكيد الإدارة للدفع (بنكك)
  const handleAdminApprovePayment = () => {
    setTrip(prev => ({ ...prev, paymentStatus: 'held', status: 'confirmed' }));
    setChat(prev => [...prev, { sender: 'system', text: 'تأكيد الدفع! المبلغ الآن بأمان في محفظة الضمان بالمنصة. يمكن للسائق التحرك للاستلام.' }]);
  };

  // محاكاة مسح الكود وإنهاء العملية
  const handleScanQR = () => {
    setTrip(prev => ({ ...prev, status: 'delivered', paymentStatus: 'released' }));
    setChat(prev => [...prev, { sender: 'system', text: 'تم مسح بصمة الـ QR بنجاح! تم تسليم الشحنة وتحرير الأموال لحساب السائق.' }]);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* شريط التنقل العلوي وتحديد الأدوار التجريبية */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-sky-600 p-2 rounded-xl text-white">
              <Truck size={28} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">تريلا الذكية</h1>
              <p className="text-xs text-slate-500">نظام نقل لوجستي آمن وضامن</p>
            </div>
          </div>
          
          <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 px-3 font-bold">لوحة التجربة السريعة:</span>
            <button 
              onClick={() => setCurrentRole('customer')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${currentRole === 'customer' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              العميل (الشاحن)
            </button>
            <button 
              onClick={() => setCurrentRole('driver')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${currentRole === 'driver' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              السائق (الناقل)
            </button>
            <button 
              onClick={() => setCurrentRole('admin')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${currentRole === 'admin' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              المسؤول (المنصة)
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* العمود الأيمن: تفاصيل حالة الشحنة النشطة */}
        <section className="md:col-span-1 flex flex-col gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-slate-800 text-lg">تفاصيل الرحلة الحالية</h2>
              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-md">ID: {trip.id}</span>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <MapPin className="text-emerald-500 shrink-0" size={20} />
                <div>
                  <p className="text-xs text-slate-400">نقطة الانطلاق (الموقع)</p>
                  <p className="text-sm font-bold text-slate-700">{trip.pickup}</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <MapPin className="text-rose-500 shrink-0" size={20} />
                <div>
                  <p className="text-xs text-slate-400">وجهة الوصول (المستلم)</p>
                  <p className="text-sm font-bold text-slate-700">{trip.dropoff}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-400">نوع البضاعة وحجمها</p>
                <p className="text-sm font-bold text-slate-700">{trip.cargo}</p>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-400">سعر الاتفاق المالي</p>
                  <p className="text-lg font-black text-sky-600">
                    {trip.finalPrice ? `${trip.finalPrice.toLocaleString()} ج.س` : "لم يتفق بعد"}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-400">حالة الضمان</p>
                  {trip.paymentStatus === 'unpaid' && <span className="text-xs bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full font-bold border border-amber-200">غير مدفوع</span>}
                  {trip.paymentStatus === 'verification_pending' && <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-bold border border-blue-200">بانتظار المراجعة</span>}
                  {trip.paymentStatus === 'held' && <span className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-bold border border-emerald-200">مضمون بالمنصة</span>}
                  {trip.paymentStatus === 'released' && <span className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full font-bold border border-purple-200">تم الدفع للسائق</span>}
                </div>
              </div>
            </div>
          </div>

          {/* حالة تتبع مسار الرحلة اللوجستي */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">مراحل التنفيذ اللوجستي</h3>
            <div className="relative border-r-2 border-slate-100 pr-5 space-y-6">
              
              <div className="relative">
                <span className="absolute -right-[27px] top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-4 border-white"></span>
                <p className="text-sm font-bold text-slate-700">طلب الرحلة وتعبئة البيانات</p>
                <p className="text-xs text-slate-400">تم النشر للبحث عن ناقل متاح</p>
              </div>

              <div className="relative">
                <span className={`absolute -right-[27px] top-1 w-3.5 h-3.5 rounded-full border-4 border-white ${trip.finalPrice ? 'bg-emerald-500' : 'bg-slate-200'}`}></span>
                <p className="text-sm font-bold text-slate-700">الاتفاق والمفاوضة السعرية</p>
                <p className="text-xs text-slate-400">التفاوض المفتوح عبر التطبيق مباشرة</p>
              </div>

              <div className="relative">
                <span className={`absolute -right-[27px] top-1 w-3.5 h-3.5 rounded-full border-4 border-white ${trip.paymentStatus === 'held' || trip.paymentStatus === 'released' ? 'bg-emerald-500' : 'bg-slate-200'}`}></span>
                <p className="text-sm font-bold text-slate-700">إيداع الضمان المالي</p>
                <p className="text-xs text-slate-400">حفظ المال بالمنصة لحين إتمام العمل</p>
              </div>

              <div className="relative">
                <span className={`absolute -right-[27px] top-1 w-3.5 h-3.5 rounded-full border-4 border-white ${trip.status === 'delivered' ? 'bg-emerald-500' : 'bg-slate-200'}`}></span>
                <p className="text-sm font-bold text-slate-700">إثبات الاستلام الرقمي بالـ QR</p>
                <p className="text-xs text-slate-400">التسليم الآمن وتحويل مستحقات السائق</p>
              </div>

            </div>
          </div>
        </section>

        {/* العمود الأوسط والأيسر: لوحات التحكم التفاعلية بحسب الأدوار */}
        <section className="md:col-span-2 flex flex-col gap-6">
          
          {/* لوحة تحكم دور العميل الحالي */}
          {currentRole === 'customer' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <User className="text-sky-600" />
                    <h2 className="font-bold text-slate-800 text-lg">بوابة العميل (صاحب الشحنة)</h2>
                  </div>
                  <span className="text-xs bg-sky-50 text-sky-700 px-3 py-1 rounded-full font-bold">نشط حالياً</span>
                </div>

                {trip.finalPrice && trip.paymentStatus === 'unpaid' && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex gap-3 items-start">
                      <Wallet className="text-amber-600 shrink-0 mt-1" />
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">خطوة الإيداع المالي عبر تطبيق بنكك</h4>
                        <p className="text-xs text-slate-600">يرجى تحويل مبلغ {trip.finalPrice.toLocaleString()} ج.س إلى حساب المنصة (رقم: 1234567) برقم إشعار مميز ثم تأكيد التحويل.</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleUploadPayment}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 shrink-0 transition-colors"
                    >
                      <Upload size={14} />
                      تأكيد التحويل وإرسال الإشعار
                    </button>
                  </div>
                )}

                {trip.paymentStatus === 'held' && trip.status !== 'delivered' && (
                  <div className="bg-sky-50 border border-sky-200 p-5 rounded-xl mb-4 text-center flex flex-col items-center">
                    <QrCode size={48} className="text-sky-600 mb-3" />
                    <h4 className="font-bold text-slate-800 text-sm mb-1">رمز التحقق الرقمي للتسليم الآمن</h4>
                    <p className="text-xs text-slate-600 mb-3">أظهر الرمز التالي للسائق عند استلام شحنتك لتأكيد العملية بنجاح.</p>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 inline-block">
                      <div className="w-32 h-32 bg-slate-900 flex items-center justify-center text-white font-bold text-xs rounded">
                        رمز QR مؤمن ومحمي
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* شات المحادثة والتفاوض داخل التطبيق للعميل */}
              <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col h-80">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">شات التفاوض مع السائق</span>
                  {activeOffer && (
                    <div className="bg-amber-50 border border-amber-200 p-1.5 px-3 rounded-lg flex items-center gap-3">
                      <span className="text-xs font-bold text-amber-800">عرض جديد: {activeOffer.toLocaleString()} ج.س</span>
                      <button 
                        onClick={handleAcceptOffer}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2 py-1 rounded"
                      >
                        قبول
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
                  {chat.map((msg, index) => (
                    <div 
                      key={index} 
                      className={`flex ${msg.sender === 'customer' ? 'justify-start' : msg.sender === 'system' ? 'justify-center' : 'justify-end'}`}
                    >
                      <div className={`p-3 rounded-xl max-w-sm text-xs ${
                        msg.sender === 'customer' ? 'bg-sky-600 text-white rounded-br-none' : 
                        msg.sender === 'system' ? 'bg-slate-200 text-slate-600 text-center font-bold font-mono' : 
                        'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
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
                    placeholder="اكتب استفسارك للسائق هنا..."
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500"
                  />
                  <button 
                    onClick={() => handleSendMessage(currentMessage, 'customer')}
                    className="bg-sky-600 hover:bg-sky-700 text-white p-2 rounded-lg transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* لوحة تحكم دور السائق الحالي */}
          {currentRole === 'driver' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <Truck className="text-emerald-600" />
                    <h2 className="font-bold text-slate-800 text-lg">بوابة السائق (كابتن الشاحنة)</h2>
                  </div>
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold">متصل ومتاح</span>
                </div>

                {trip.status === 'confirmed' && trip.paymentStatus === 'held' && (
                  <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl mb-4 text-center">
                    <p className="text-sm font-bold text-slate-800 mb-1">الضمان جاهز في خزينة المنصة!</p>
                    <p className="text-xs text-slate-600 mb-4">يرجى تحريك الشاحنة للعميل وعند استلام الحمولة بنجاح، قم بمسح الرمز الرقمي من هاتف العميل.</p>
                    <button 
                      onClick={handleScanQR}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl inline-flex items-center gap-2 shadow-sm transition-colors"
                    >
                      <QrCode size={16} />
                      تفعيل الكاميرا ومسح كود QR
                    </button>
                  </div>
                )}

                {/* التفاوض وعروض الأسعار التفاعلية من طرف السائق */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                  <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1">
                    <Coins size={14} />
                    تقديم عروض أسعار تفاوضية سريعة:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => handleSendOffer(380000)}
                      className="bg-white border border-slate-200 hover:border-emerald-500 text-xs font-bold text-slate-700 px-3 py-2 rounded-lg transition-all"
                    >
                      380,000 ج.س
                    </button>
                    <button 
                      onClick={() => handleSendOffer(400000)}
                      className="bg-white border border-slate-200 hover:border-emerald-500 text-xs font-bold text-slate-700 px-3 py-2 rounded-lg transition-all"
                    >
                      400,000 ج.س
                    </button>
                    <button 
                      onClick={() => handleSendOffer(420000)}
                      className="bg-white border border-slate-200 hover:border-emerald-500 text-xs font-bold text-slate-700 px-3 py-2 rounded-lg transition-all"
                    >
                      420,000 ج.س
                    </button>
                    <button 
                      onClick={() => handleSendOffer(450000)}
                      className="bg-white border border-slate-200 hover:border-emerald-500 text-xs font-bold text-slate-700 px-3 py-2 rounded-lg transition-all"
                    >
                      450,000 ج.س
                    </button>
                  </div>
                </div>
              </div>

              {/* شات التفاوض والمحادثة للسائق */}
              <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col h-64">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-700">الدردشة مع العميل</span>
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
                  {chat.map((msg, index) => (
                    <div 
                      key={index} 
                      className={`flex ${msg.sender === 'driver' ? 'justify-start' : msg.sender === 'system' ? 'justify-center' : 'justify-end'}`}
                    >
                      <div className={`p-3 rounded-xl max-w-sm text-xs ${
                        msg.sender === 'driver' ? 'bg-emerald-600 text-white rounded-br-none' : 
                        msg.sender === 'system' ? 'bg-slate-200 text-slate-600 text-center font-bold font-mono' : 
                        'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
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
                    placeholder="اكتب رسالتك للعميل هنا..."
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <button 
                    onClick={() => handleSendMessage(currentMessage, 'driver')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* لوحة تحكم دور المسؤول المالي للتحقق من المعاملات */}
          {currentRole === 'admin' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="text-rose-600" />
                  <h2 className="font-bold text-slate-800 text-lg">بوابة المراجعة المالية والتحقق</h2>
                </div>
                <span className="text-xs bg-rose-50 text-rose-700 px-3 py-1 rounded-full font-bold">صلاحيات الإشراف المباشر</span>
              </div>

              {trip.paymentStatus === 'verification_pending' ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <h4 className="font-bold text-slate-800 text-sm mb-3">عملية إيداع مالية معلقة بانتظار التحقق من كشف حساب بنكك:</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-400">القيمة المطلوبة للمطابقة</p>
                      <p className="text-lg font-black text-slate-800">{trip.finalPrice?.toLocaleString()} ج.س</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 text-xs font-mono">
                      [صورة إشعار التحويل من العميل]
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button 
                      onClick={handleAdminApprovePayment}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle size={14} />
                      تأكيد مطابقة التحويل ومطابقة المبلغ
                    </button>
                    <button 
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <XCircle size={14} />
                      رفض التحويل لوجود خطأ
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400">
                  <CheckCircle size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-xs font-bold">لا توجد عمليات إيداع أو تأكيد تحويل بانتظار المراجعة حالياً.</p>
                </div>
              )}
            </div>
          )}

        </section>
      </main>
    </div>
  );
}
