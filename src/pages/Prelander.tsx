import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import productImage from "@/assets/testosterone-boost.png";

const Prelander = () => {
  const [timeLeft, setTimeLeft] = useState({ h: 2, m: 47, s: 33 });

  useEffect(() => {
    document.title = "خبر صحي عاجل: تركيبة طبيعية تعيد التستوستيرون | تقرير صحي";
    // Load IBM Plex Sans Arabic font once
    if (!document.getElementById("ibm-plex-arabic-font")) {
      const preconnect1 = document.createElement("link");
      preconnect1.rel = "preconnect";
      preconnect1.href = "https://fonts.googleapis.com";
      document.head.appendChild(preconnect1);
      const preconnect2 = document.createElement("link");
      preconnect2.rel = "preconnect";
      preconnect2.href = "https://fonts.gstatic.com";
      preconnect2.crossOrigin = "anonymous";
      document.head.appendChild(preconnect2);
      const link = document.createElement("link");
      link.id = "ibm-plex-arabic-font";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
    const meta = document.querySelector('meta[name="description"]') || (() => {
      const m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
      return m;
    })();
    meta.setAttribute("content", "تقرير صحي: علماء يكشفون عن تركيبة طبيعية قد تدعم مستويات التستوستيرون والطاقة لدى الرجال خلال أسابيع.");

    const t = setInterval(() => {
      setTimeLeft((p) => {
        let { h, m, s } = p;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) { h = 0; m = 0; s = 0; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const today = new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div dir="rtl" className="min-h-screen bg-white text-neutral-900" style={{ fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif" }}>
      {/* Top news bar */}
      <header className="border-b border-neutral-200">
        <div className="bg-red-600 text-white text-xs sm:text-sm py-1.5 px-4 text-center font-semibold tracking-wide">
          🚨 عاجل — تقرير صحي حصري · {today}
        </div>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 text-white font-black px-2 py-1 text-sm tracking-tight">HEALTH</div>
            <span className="font-bold text-neutral-800 text-sm sm:text-base">التقرير الصحي اليومي</span>
          </div>
          <div className="text-xs text-neutral-500 hidden sm:block">قسم: صحة الرجل</div>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 py-6">
        {/* Category + headline */}
        <div className="text-xs font-bold text-red-600 mb-2 uppercase tracking-wider">صحة · بحوث · اكتشاف جديد</div>
        <h1 className="text-2xl sm:text-4xl font-black leading-tight mb-3 text-neutral-900">
          علماء يكشفون عن تركيبة طبيعية قد تعيد مستويات <span className="text-red-600">التستوستيرون</span> لدى الرجال خلال أسابيع
        </h1>
        <p className="text-base sm:text-lg text-neutral-600 leading-relaxed mb-4">
          تقرير خاص يستعرض نتائج مثيرة لاحظها باحثون في مجال صحة الرجل بعد دراسة تركيبة نباتية تُعرف باسم
          <strong className="text-neutral-900"> «Testosterone Boost» </strong>
          ويقولون إنها فاجأتهم بقدرتها على دعم الطاقة والحيوية.
        </p>

        {/* Byline */}
        <div className="flex items-center justify-between border-y border-neutral-200 py-3 my-4 text-sm text-neutral-600">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-neutral-300 flex items-center justify-center font-bold text-neutral-700">د.أ</div>
            <div>
              <div className="font-bold text-neutral-800">د. أحمد المنصوري</div>
              <div className="text-xs">محرر القسم الصحي</div>
            </div>
          </div>
          <div className="text-xs text-neutral-500">⏱ قراءة 4 دقائق</div>
        </div>

        {/* Hero image */}
        <figure className="mb-6">
          <div className="w-full bg-gradient-to-b from-neutral-100 to-neutral-200 rounded-md flex items-center justify-center py-6">
            <img
              src={productImage}
              alt="عبوة Testosterone Boost — مكمل غذائي لدعم الطاقة والحيوية"
              className="h-64 sm:h-96 w-auto object-contain drop-shadow-2xl"
              loading="eager"
            />
          </div>
          <figcaption className="text-xs text-neutral-500 mt-2 text-center">
            تركيبة Testosterone Boost — 30 كبسولة سريعة الذوبان لدعم التوازن الطبيعي عند الرجال.
          </figcaption>
        </figure>

        {/* Intro */}
        <section className="prose-content text-[17px] leading-loose space-y-4 text-neutral-800">
          <p>
            في تطور لافت داخل أوساط الباحثين في مجال صحة الرجل، أعلن فريق من المختصين في علوم التغذية عن ملاحظة نتائج
            «غير متوقعة» لتركيبة طبيعية تجمع بين أعشاب ومعادن وأحماض أمينية، يقولون إنها أظهرت قدرة على دعم
            مستويات التستوستيرون والطاقة لدى الرجال البالغين بعد أسابيع قليلة من الاستخدام المنتظم.
          </p>
          <p>
            التركيبة، التي أُطلق عليها اسم <strong>Testosterone Boost</strong>، استقطبت اهتماماً واسعاً بعد أن
            أشار عدد من المتطوعين إلى تحسّن في الحيوية والمزاج العام والقدرة على ممارسة النشاط اليومي،
            دون الإبلاغ عن أعراض جانبية تُذكر خلال فترة المتابعة.
          </p>
        </section>

        {/* Problem */}
        <h2 className="text-2xl font-black mt-10 mb-3 border-r-4 border-red-600 pr-3">لماذا يعاني ملايين الرجال في صمت؟</h2>
        <div className="text-[17px] leading-loose space-y-4 text-neutral-800">
          <p>
            تشير تقديرات صحية إلى أن أكثر من <strong>70% من الرجال فوق سن 35</strong> يلاحظون تراجعاً تدريجياً في
            الطاقة والرغبة والتركيز، وغالباً ما يُعزى ذلك إلى انخفاض طبيعي في مستويات التستوستيرون مع تقدم العمر،
            إلى جانب الضغوط اليومية وقلة النوم وسوء التغذية.
          </p>
          <p>الأعراض التي يصفها كثير من الرجال تشمل:</p>
          <ul className="list-disc pr-6 space-y-1 marker:text-red-600">
            <li>إرهاق دائم رغم النوم لساعات كافية</li>
            <li>انخفاض الرغبة وضعف الأداء</li>
            <li>تراجع في الثقة بالنفس والمزاج</li>
            <li>صعوبة بناء الكتلة العضلية وزيادة الدهون حول الخصر</li>
            <li>فقدان الحماس والدافع للعمل والحياة</li>
          </ul>
        </div>

        {/* Discovery */}
        <h2 className="text-2xl font-black mt-10 mb-3 border-r-4 border-red-600 pr-3">الاكتشاف: تركيبة Testosterone Boost</h2>
        <figure className="my-4 grid grid-cols-2 gap-3 items-center bg-neutral-50 border border-neutral-200 rounded-md p-4">
          <img
            src={productImage}
            alt="عبوة Testosterone Boost"
            className="h-44 sm:h-56 w-auto object-contain mx-auto drop-shadow-xl"
            loading="lazy"
          />
          <div className="text-sm text-neutral-700 leading-relaxed">
            <div className="font-black text-neutral-900 mb-1">Testosterone Boost</div>
            <div className="text-xs text-neutral-500 mb-2">30 كبسولة · سريعة الذوبان</div>
            <ul className="space-y-1 text-[13px]">
              <li>✓ مكونات طبيعية</li>
              <li>✓ يدعم الطاقة والحيوية</li>
              <li>✓ يدعم القوة والكتلة العضلية</li>
            </ul>
          </div>
        </figure>
        <div className="text-[17px] leading-loose space-y-4 text-neutral-800">
          <p>
            وفقاً للتقرير، تعتمد تركيبة <strong>Testosterone Boost</strong> على مزيج من المستخلصات النباتية
            والمعادن الأساسية والأحماض الأمينية، مستوحاة من ممارسات الطب التقليدي ومدعومة بأبحاث حديثة في مجال صحة الرجل.
          </p>
          <p>
            ما فاجأ الباحثين هو أن المتطوعين الذين التزموا بالاستخدام اليومي أبلغوا عن
            <strong> تحسن ملحوظ في الطاقة خلال أسبوعين إلى أربعة أسابيع</strong>، إلى جانب تحسن المزاج والقدرة على التركيز.
          </p>
        </div>

        {/* Benefits */}
        <h2 className="text-2xl font-black mt-10 mb-3 border-r-4 border-red-600 pr-3">ما الذي قد تقدمه التركيبة؟</h2>
        <ul className="space-y-3 text-[17px] text-neutral-800">
          {[
            "قد تدعم مستويات التستوستيرون الطبيعية لدى الرجال",
            "تساعد على تحسين الطاقة والحيوية اليومية",
            "تدعم المزاج العام والثقة بالنفس",
            "تساهم في تعزيز الأداء البدني الطبيعي",
            "تدعم التوازن الهرموني الصحي عند الرجال",
          ].map((b, i) => (
            <li key={i} className="flex gap-3 bg-neutral-50 border border-neutral-200 rounded-md p-3">
              <span className="text-red-600 font-black">✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-neutral-500 mt-3">
          * هذه عبارات داعمة لنمط حياة صحي ولا تُعدّ ادعاءً علاجياً أو تشخيصاً طبياً.
        </p>

        {/* Testimonials */}
        <h2 className="text-2xl font-black mt-10 mb-3 border-r-4 border-red-600 pr-3">ماذا قال المستخدمون؟</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { n: "خالد · 42 سنة", t: "بعد ثلاثة أسابيع، صرت أصحو بنشاط أكبر وأنجز يومي بدون شعور الإرهاق المعتاد. الفرق واضح في تركيزي ومزاجي." },
            { n: "سامي · 36 سنة", t: "كنت أشعر أن طاقتي اختفت بعد الثلاثين. اليوم أعود للرياضة بانتظام وأشعر أنني عدت لنفسي القديمة." },
            { n: "ماجد · 51 سنة", t: "ما كنت أتوقع تغيير بهذا العمر. تحسّن النوم، وعاد لي حماسي لأبسط الأشياء في حياتي اليومية." },
            { n: "يوسف · 29 سنة", t: "جربت أشياء كثيرة قبل. هذي أول مرة أحس فعلاً بفرق في طاقتي خلال أسابيع قليلة." },
          ].map((r, i) => (
            <div key={i} className="border border-neutral-200 rounded-md p-4 bg-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-neutral-700">
                  {r.n.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-sm text-neutral-800">{r.n}</div>
                  <div className="text-yellow-500 text-sm">★★★★★</div>
                </div>
              </div>
              <p className="text-[15px] leading-relaxed text-neutral-700">«{r.t}»</p>
            </div>
          ))}
        </div>

        {/* Urgency */}
        <div className="mt-10 border-2 border-red-600 rounded-md p-5 bg-red-50">
          <div className="text-red-700 font-black text-lg mb-2">⚠️ توفر محدود</div>
          <p className="text-neutral-800 text-[15px] leading-relaxed mb-4">
            بسبب الإقبال الكبير بعد نشر التقرير، تشير المصادر إلى أن المخزون الحالي محدود.
            ينصح خبراء الصحة بالتحقق من التوفر الرسمي قبل نفاد الكمية.
          </p>
          <div className="flex justify-center gap-2 sm:gap-3">
            {[
              { v: pad(timeLeft.h), l: "ساعة" },
              { v: pad(timeLeft.m), l: "دقيقة" },
              { v: pad(timeLeft.s), l: "ثانية" },
            ].map((u, i) => (
              <div key={i} className="bg-neutral-900 text-white rounded-md px-4 py-2 min-w-[70px] text-center">
                <div className="text-2xl sm:text-3xl font-black tabular-nums">{u.v}</div>
                <div className="text-[10px] uppercase tracking-wider text-neutral-300">{u.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            to="/order"
            className="inline-block bg-red-600 hover:bg-red-700 text-white font-black text-lg sm:text-xl px-8 py-4 rounded-md shadow-lg transition-all transform hover:scale-105"
          >
            ✅ تحقق من التوفر الرسمي الآن
          </Link>
          <div className="text-xs text-neutral-500 mt-3">اكتشف تركيبة Testosterone Boost — التوفر مرهون بالكمية</div>
        </div>

        {/* Trust badges */}
        <div className="mt-10 grid grid-cols-3 gap-3 text-center">
          {[
            { i: "🌿", t: "مكونات طبيعية" },
            { i: "🔬", t: "مدعوم بأبحاث" },
            { i: "🛡️", t: "جودة موثوقة" },
          ].map((b, i) => (
            <div key={i} className="border border-neutral-200 rounded-md p-3 bg-neutral-50">
              <div className="text-2xl mb-1">{b.i}</div>
              <div className="text-xs font-bold text-neutral-700">{b.t}</div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-10 border-t border-neutral-200 pt-5 text-xs text-neutral-500 leading-relaxed">
          <strong>إخلاء مسؤولية:</strong> هذا المقال ذو طابع معلوماتي ولا يُعتبر استشارة طبية.
          المنتج المذكور مكمل غذائي ولا يُقصد به تشخيص أو علاج أو الوقاية من أي مرض.
          النتائج قد تختلف من شخص لآخر. يُنصح باستشارة الطبيب قبل البدء بأي مكمل غذائي.
        </div>
      </article>

      <footer className="border-t border-neutral-200 mt-8 py-6 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} التقرير الصحي اليومي · جميع الحقوق محفوظة
      </footer>
    </div>
  );
};

export default Prelander;