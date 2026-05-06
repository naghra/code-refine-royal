import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, FlaskConical, Award, Truck, Star, Clock, ChevronDown, CheckCircle2, Activity, Zap, HeartPulse, Lock } from "lucide-react";
import productImg from "@/assets/powerspry-product-real.png";
import labImg from "@/assets/powerspry-lab.jpg";
import circulationImg from "@/assets/powerspry-circulation.jpg";
import lifestyleImg from "@/assets/powerspry-lifestyle.jpg";
import ingredientsImg from "@/assets/powerspry-ingredients.jpg";
import doctorImg from "@/assets/powerspry-doctor.jpg";

const NAVY = "#0B2545";
const NAVY_DARK = "#08182F";
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C97A";

const testimonials = [
  { name: "أحمد العتيبي", age: 42, city: "الرياض", text: "بعد أسابيع من الاستخدام لاحظت فرقاً كبيراً، استعدت ثقتي وأدائي تماماً كما كنت في العشرينات." },
  { name: "خالد الشمري", age: 38, city: "جدة", text: "منتج محترم وتغليف طبي راقي. النتائج بدأت تظهر من الأيام الأولى، أنصح به بقوة." },
  { name: "سعد القحطاني", age: 45, city: "الدمام", text: "كنت أعاني من ضعف وقلة ثقة، لكن دراغون باور غيّر حياتي الزوجية بشكل لا يصدق." },
  { name: "ماجد الحربي", age: 50, city: "مكة", text: "تركيبة طبيعية وآمنة، شعرت بفرق واضح في الطاقة والقوة من أول استخدام." },
  { name: "فهد الدوسري", age: 36, city: "الطائف", text: "جربت كثير من المنتجات بدون نتيجة، هذا المنتج فعلاً مختلف ويستحق كل ريال." },
  { name: "ناصر العنزي", age: 47, city: "تبوك", text: "زوجتي لاحظت الفرق قبل ما أقولها، الحمدلله رجعت العلاقة أقوى من قبل." },
  { name: "بدر السبيعي", age: 41, city: "بريدة", text: "الاستخدام سهل والنتائج سريعة. شعرت بثقة أكبر وأداء أطول. شكراً للفريق الطبي." },
  { name: "عبدالله المطيري", age: 44, city: "أبها", text: "منتج طبي بمواصفات عالية، التوصيل كان سريع والنتائج فاقت التوقعات." },
];

const faqs = [
  { q: "هل المنتج آمن؟", a: "نعم، التركيبة طبيعية بالكامل ومصنوعة في معامل طبية معتمدة، خالية من المواد الضارة وتم اختبارها سريرياً للتأكد من سلامتها." },
  { q: "متى تظهر النتائج؟", a: "تبدأ معظم النتائج بالظهور خلال أيام من الاستخدام المنتظم، وتصل لأفضل أداء بعد 2-4 أسابيع." },
  { q: "كيف يتم الاستخدام؟", a: "يستخدم البخاخ موضعياً قبل العلاقة بـ 10-15 دقيقة. رجّ العبوة جيداً ثم رش 2-3 بخّات على المنطقة المطلوبة." },
  { q: "هل يمكن استعماله يومياً؟", a: "نعم، يمكن استخدامه بشكل منتظم بأمان تام، ولا يسبب الإدمان أو الاعتماد." },
];

const Powerspry = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showSticky, setShowSticky] = useState(false);
  const [stock, setStock] = useState(17);

  useEffect(() => {
    document.title = "Dragon Power 9000 — استعد قوتك وثقتك من جديد | بخاخ الأداء الطبي";
    const meta = document.querySelector('meta[name="description"]') || (() => {
      const m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); return m;
    })();
    meta.setAttribute("content", "دراغون باور 9000: تركيبة طبية متطورة لدعم الانتصاب وتحسين الأداء والمساعدة في التحكم الأفضل. آمن، طبيعي، ونتائج سريعة.");

    if (!document.getElementById("powerspry-font")) {
      const link = document.createElement("link");
      link.id = "powerspry-font";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;900&display=swap";
      document.head.appendChild(link);
    }

    const onScroll = () => setShowSticky(window.scrollY > 700);
    window.addEventListener("scroll", onScroll, { passive: true });
    const stockTimer = setInterval(() => setStock(s => Math.max(3, s - (Math.random() > 0.7 ? 1 : 0))), 18000);
    return () => { window.removeEventListener("scroll", onScroll); clearInterval(stockTimer); };
  }, []);

  const ctaTarget = "/order";

  return (
    <div dir="rtl" className="min-h-screen bg-white" style={{ fontFamily: "'Cairo','Tajawal',system-ui,sans-serif", color: NAVY_DARK }}>
      {/* Top trust bar */}
      <div className="text-white text-xs sm:text-sm py-2 px-3 text-center" style={{ background: NAVY_DARK }}>
        <span className="inline-flex items-center gap-2">
          <ShieldCheck size={14} style={{ color: GOLD }} />
          منتج طبي معتمد · شحن سريع · الدفع عند الاستلام
        </span>
      </div>

      {/* Header */}
      <header className="border-b" style={{ borderColor: "#EAEAEA" }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: NAVY }}>
              <span className="text-xs font-black" style={{ color: GOLD }}>DP9</span>
            </div>
            <div className="leading-tight">
              <div className="font-black text-sm" style={{ color: NAVY }}>DRAGON POWER 9000</div>
              <div className="text-[10px] tracking-widest" style={{ color: GOLD }}>PHARMACEUTICAL GRADE</div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-xs text-neutral-600">
            <Award size={14} style={{ color: GOLD }} /> توصية المختصين
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DARK} 100%)` }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #fff 0, transparent 40%), radial-gradient(circle at 80% 80%, #fff 0, transparent 40%)" }} />
        <div className="max-w-5xl mx-auto px-4 py-10 sm:py-16 grid md:grid-cols-2 gap-8 items-center relative">
          <div className="text-white order-2 md:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4" style={{ background: "rgba(201,168,76,0.15)", color: GOLD_LIGHT, border: `1px solid ${GOLD}` }}>
              <FlaskConical size={12} /> تركيبة طبية مرخصة
            </div>
            <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-4">
              استعد <span style={{ color: GOLD }}>قوتك</span> وثقتك من جديد
            </h1>
            <p className="text-base sm:text-lg text-white/85 leading-relaxed mb-6">
              تركيبة متطورة تساعد على دعم الانتصاب، تحسين الأداء، والمساعدة في التحكم الأفضل أثناء العلاقة.
            </p>
            <div className="flex flex-wrap gap-3 mb-6 text-xs sm:text-sm">
              {["طبيعي 100%", "نتائج سريعة", "آمن طبياً"].map(t => (
                <span key={t} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                  <CheckCircle2 size={14} style={{ color: GOLD }} /> {t}
                </span>
              ))}
            </div>
            <a href={ctaTarget} className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-xl font-black text-base shadow-2xl transition-transform active:scale-95" style={{ background: `linear-gradient(180deg, ${GOLD_LIGHT}, ${GOLD})`, color: NAVY_DARK }}>
              اكتشف الحل الآن ←
            </a>
            <div className="flex items-center gap-4 mt-5 text-xs text-white/70">
              <div className="flex items-center gap-1"><Lock size={12} /> دفع آمن</div>
              <div className="flex items-center gap-1"><Truck size={12} /> توصيل سريع</div>
              <div className="flex items-center gap-1"><ShieldCheck size={12} /> ضمان الجودة</div>
            </div>
          </div>
          <div className="order-1 md:order-2 flex justify-center">
            <div className="relative">
              <div className="absolute -inset-6 rounded-full opacity-30 blur-3xl" style={{ background: GOLD }} />
              <img src={productImg} alt="Dragon Power 9000 بخاخ الأداء الطبي" className="relative w-64 sm:w-80 h-auto rounded-2xl shadow-2xl" width={1024} height={1024} />
            </div>
          </div>
        </div>
      </section>

      {/* Logos / trust */}
      <section className="border-y py-5" style={{ borderColor: "#EAEAEA", background: "#F8FAFC" }}>
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { icon: ShieldCheck, t: "معتمد طبياً" },
            { icon: FlaskConical, t: "مختبر سريرياً" },
            { icon: Award, t: "جودة صيدلية" },
            { icon: Truck, t: "شحن لكل المدن" },
          ].map(({ icon: Icon, t }, i) => (
            <div key={i} className="flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold" style={{ color: NAVY }}>
              <Icon size={18} style={{ color: GOLD }} /> {t}
            </div>
          ))}
        </div>
      </section>

      {/* PROBLEM */}
      <section className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-10">
          <div className="text-xs font-bold tracking-widest mb-2" style={{ color: GOLD }}>المشكلة الصامتة</div>
          <h2 className="text-2xl sm:text-4xl font-black" style={{ color: NAVY }}>هل تعاني من إحدى هذه المشاكل؟</h2>
          <p className="text-neutral-600 mt-3 max-w-2xl mx-auto">أكثر من 65% من الرجال يعانون بصمت ولا يجدون حلاً حقيقياً يعيد لهم ثقتهم.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { t: "ضعف الانتصاب", d: "صعوبة في الحصول على انتصاب قوي ومستمر." },
            { t: "سرعة القذف", d: "نهاية مبكرة تُفقد الطرفين متعة العلاقة." },
            { t: "ضعف الثقة بالنفس", d: "خوف وقلق دائم من خيبة الأمل." },
            { t: "ضعف الأداء", d: "إرهاق سريع وانخفاض في الطاقة الجنسية." },
          ].map((p, i) => (
            <div key={i} className="rounded-2xl p-5 border bg-white shadow-sm hover:shadow-md transition" style={{ borderColor: "#EEF2F7" }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: "#FEF3F2" }}>
                <HeartPulse size={20} style={{ color: "#B42318" }} />
              </div>
              <div className="font-bold mb-1" style={{ color: NAVY }}>{p.t}</div>
              <p className="text-sm text-neutral-600 leading-relaxed">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SCIENTIFIC */}
      <section className="py-14 sm:py-20" style={{ background: "#F8FAFC" }}>
        <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-xs font-bold tracking-widest mb-2" style={{ color: GOLD }}>التفسير العلمي</div>
            <h2 className="text-2xl sm:text-4xl font-black mb-4" style={{ color: NAVY }}>كيف يعمل دراغون باور 9000؟</h2>
            <p className="text-neutral-700 leading-relaxed mb-5">
              تعتمد التركيبة على مكونات نباتية مدروسة سريرياً تساعد على:
            </p>
            <ul className="space-y-3">
              {[
                { i: Activity, t: "تحسين تدفق الدم", d: "توسيع الأوعية الدموية ودعم وصول الدم بكفاءة عالية." },
                { i: Zap, t: "تنظيم الحساسية العصبية", d: "تأخير الاستجابة العصبية للمساعدة في التحكم الأفضل." },
                { i: HeartPulse, t: "دعم الحيوية الذكورية", d: "تعزيز الطاقة والقدرة على التحمل لفترات أطول." },
              ].map(({ i: Icon, t, d }, k) => (
                <li key={k} className="flex gap-3">
                  <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center" style={{ background: NAVY }}>
                    <Icon size={18} style={{ color: GOLD }} />
                  </div>
                  <div>
                    <div className="font-bold" style={{ color: NAVY }}>{t}</div>
                    <div className="text-sm text-neutral-600">{d}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <img src={circulationImg} alt="رسم توضيحي للدورة الدموية" className="col-span-2 rounded-xl border shadow-sm w-full h-auto" loading="lazy" width={1024} height={768} style={{ borderColor: "#EAEAEA" }} />
            <img src={labImg} alt="مختبر طبي" className="rounded-xl border shadow-sm w-full h-auto" loading="lazy" width={1024} height={1024} style={{ borderColor: "#EAEAEA" }} />
            <img src={ingredientsImg} alt="مكونات عشبية فاخرة" className="rounded-xl border shadow-sm w-full h-auto" loading="lazy" width={1024} height={768} style={{ borderColor: "#EAEAEA" }} />
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-10">
          <div className="text-xs font-bold tracking-widest mb-2" style={{ color: GOLD }}>الفوائد</div>
          <h2 className="text-2xl sm:text-4xl font-black" style={{ color: NAVY }}>ماذا ستلاحظ بعد الاستخدام؟</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            "دعم الانتصاب القوي",
            "المساعدة في تأخير القذف",
            "تحسين الثقة أثناء العلاقة",
            "تعزيز الأداء والقدرة على التحمل",
            "نتائج سريعة وملموسة",
            "تركيبة آمنة 100% طبيعية",
          ].map((b, i) => (
            <div key={i} className="rounded-2xl p-5 border bg-white flex items-start gap-3 hover:-translate-y-0.5 transition" style={{ borderColor: "#EEF2F7" }}>
              <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})` }}>
                <CheckCircle2 size={20} style={{ color: NAVY_DARK }} />
              </div>
              <div className="font-bold pt-1.5" style={{ color: NAVY }}>{b}</div>
            </div>
          ))}
        </div>
      </section>

      {/* LIFESTYLE */}
      <section className="py-12 sm:py-16" style={{ background: NAVY_DARK }}>
        <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-2 gap-8 items-center">
          <img src={lifestyleImg} alt="رجل واثق بنفسه" className="rounded-2xl shadow-2xl w-full h-auto" loading="lazy" width={1024} height={768} />
          <div className="text-white">
            <div className="text-xs font-bold tracking-widest mb-2" style={{ color: GOLD }}>تغيير حقيقي</div>
            <h2 className="text-2xl sm:text-4xl font-black mb-4">رجل جديد. ثقة جديدة. حياة جديدة.</h2>
            <p className="text-white/80 leading-relaxed mb-5">
              آلاف الرجال استعادوا قوتهم وثقتهم بفضل دراغون باور 9000. الآن دورك لتختبر الفرق بنفسك.
            </p>
            <a href={ctaTarget} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black" style={{ background: `linear-gradient(180deg, ${GOLD_LIGHT}, ${GOLD})`, color: NAVY_DARK }}>
              اطلب الآن وابدأ التغيير ←
            </a>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-10">
          <div className="text-xs font-bold tracking-widest mb-2" style={{ color: GOLD }}>شهادات حقيقية</div>
          <h2 className="text-2xl sm:text-4xl font-black" style={{ color: NAVY }}>ماذا يقول الرجال عن دراغون باور؟</h2>
          <div className="flex items-center justify-center gap-1 mt-3">
            {[1,2,3,4,5].map(i => <Star key={i} size={18} fill={GOLD} stroke={GOLD} />)}
            <span className="text-sm text-neutral-600 mr-2">4.9/5 من أكثر من 12,400 عميل</span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {testimonials.map((t, i) => (
            <div key={i} className="rounded-2xl p-5 bg-white border shadow-sm" style={{ borderColor: "#EEF2F7" }}>
              <div className="flex items-center gap-1 mb-2">
                {[1,2,3,4,5].map(s => <Star key={s} size={12} fill={GOLD} stroke={GOLD} />)}
              </div>
              <p className="text-sm text-neutral-700 leading-relaxed mb-3">"{t.text}"</p>
              <div className="text-xs font-bold" style={{ color: NAVY }}>{t.name} · {t.age} سنة</div>
              <div className="text-xs text-neutral-500">{t.city}</div>
            </div>
          ))}
        </div>
      </section>

      {/* DOCTOR */}
      <section className="py-12 sm:py-16" style={{ background: "#F8FAFC" }}>
        <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-2 gap-8 items-center">
          <img src={doctorImg} alt="توصية طبية" className="rounded-2xl shadow-lg w-full h-auto border" style={{ borderColor: "#EAEAEA" }} loading="lazy" width={1024} height={768} />
          <div>
            <div className="text-xs font-bold tracking-widest mb-2" style={{ color: GOLD }}>رأي المختصين</div>
            <h2 className="text-2xl sm:text-4xl font-black mb-4" style={{ color: NAVY }}>ماذا يقول المختصون؟</h2>
            <blockquote className="border-r-4 pr-4 text-neutral-700 leading-loose mb-4" style={{ borderColor: GOLD }}>
              "دراغون باور 9000 تركيبة طبية متوازنة تجمع بين مكونات طبيعية مدروسة. ألاحظ تحسناً ملموساً لدى المرضى الذين يلتزمون بالاستخدام، خاصة في جوانب الأداء والثقة."
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-black" style={{ background: NAVY, color: GOLD }}>د.</div>
              <div>
                <div className="font-bold" style={{ color: NAVY }}>استشاري الصحة الذكورية</div>
                <div className="text-xs text-neutral-500">عضو الجمعية الدولية للطب التكميلي</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-8">
          <div className="text-xs font-bold tracking-widest mb-2" style={{ color: GOLD }}>الأسئلة الشائعة</div>
          <h2 className="text-2xl sm:text-4xl font-black" style={{ color: NAVY }}>كل ما تحتاج معرفته</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: "#EEF2F7" }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between text-right px-5 py-4 font-bold" style={{ color: NAVY }}>
                <span>{f.q}</span>
                <ChevronDown size={18} className={`transition ${openFaq === i ? "rotate-180" : ""}`} style={{ color: GOLD }} />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-sm text-neutral-700 leading-relaxed border-t" style={{ borderColor: "#EEF2F7" }}>
                  <div className="pt-3">{f.a}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-14 sm:py-20 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DARK} 100%)` }}>
        <div className="max-w-3xl mx-auto px-4 text-center text-white relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4" style={{ background: "rgba(239,68,68,0.15)", color: "#FCA5A5", border: "1px solid #EF4444" }}>
            <Clock size={12} /> الكمية محدودة بسبب الطلب الكبير
          </div>
          <h2 className="text-3xl sm:text-5xl font-black mb-4">ابدأ التغيير الحقيقي اليوم</h2>
          <p className="text-white/85 mb-2">لم يتبقَ سوى <span className="font-black" style={{ color: GOLD }}>{stock} عبوة</span> في المخزون.</p>
          <p className="text-white/70 text-sm mb-6">الدفع عند الاستلام · شحن سريع · ضمان الاسترجاع</p>
          <a href={ctaTarget} className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-10 py-4 rounded-xl font-black text-lg shadow-2xl active:scale-95 transition" style={{ background: `linear-gradient(180deg, ${GOLD_LIGHT}, ${GOLD})`, color: NAVY_DARK }}>
            اطلب الآن ←
          </a>
          <div className="flex items-center justify-center gap-5 mt-6 text-xs text-white/70">
            <div className="flex items-center gap-1"><ShieldCheck size={12} /> ضمان الجودة</div>
            <div className="flex items-center gap-1"><Truck size={12} /> توصيل لكل المدن</div>
            <div className="flex items-center gap-1"><Lock size={12} /> دفع آمن</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-neutral-500 border-t" style={{ borderColor: "#EAEAEA" }}>
        <div>© {new Date().getFullYear()} Dragon Power 9000 · جميع الحقوق محفوظة</div>
        <div className="mt-2 max-w-2xl mx-auto px-4 leading-relaxed">
          هذا المنتج مكمل غذائي طبيعي وليس دواءً. النتائج قد تختلف من شخص لآخر. استشر طبيبك في حال وجود حالات صحية مزمنة.
        </div>
      </footer>

      {/* Sticky CTA */}
      {showSticky && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-3 border-t shadow-2xl" style={{ background: "rgba(255,255,255,0.98)", borderColor: "#EAEAEA" }}>
          <a href={ctaTarget} className="block max-w-md mx-auto text-center py-3.5 rounded-xl font-black active:scale-95 transition" style={{ background: `linear-gradient(180deg, ${GOLD_LIGHT}, ${GOLD})`, color: NAVY_DARK }}>
            اطلب الآن — الكمية محدودة ←
          </a>
        </div>
      )}
    </div>
  );
};

export default Powerspry;
