import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import productImage from "@/assets/powerspry-product-real.png";
import productHero from "@/assets/powerspry-lab.jpg";
import productDiscovery from "@/assets/powerspry-ingredients.jpg";
import circulationImg from "@/assets/powerspry-circulation.jpg";
import doctorImg from "@/assets/powerspry-doctor.jpg";
import lifestyleImg from "@/assets/powerspry-lifestyle.jpg";

const Powerspry = () => {
  const [timeLeft, setTimeLeft] = useState({ h: 2, m: 47, s: 33 });
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    document.title = "تحقيق صحي: Dragon Power 9000 — الحل الطبيعي الذي أعاد القوة والثقة لآلاف الرجال";

    if (!document.getElementById("ibm-plex-arabic-font")) {
      const pc1 = document.createElement("link");
      pc1.rel = "preconnect"; pc1.href = "https://fonts.googleapis.com";
      document.head.appendChild(pc1);
      const pc2 = document.createElement("link");
      pc2.rel = "preconnect"; pc2.href = "https://fonts.gstatic.com"; pc2.crossOrigin = "anonymous";
      document.head.appendChild(pc2);
      const link = document.createElement("link");
      link.id = "ibm-plex-arabic-font";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700;800&display=swap";
      document.head.appendChild(link);
    }
    const meta = document.querySelector('meta[name="description"]') || (() => {
      const m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
      return m;
    })();
    meta.setAttribute("content", "تحقيق صحي: بخاخ Dragon Power 9000 الطبيعي يعيد القوة والثقة والتحكم لآلاف الرجال — اكتشف السر الذي يتحدث عنه الجميع.");

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

    const onScroll = () => setShowStickyCta(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearInterval(t);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const today = new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div dir="rtl" className="min-h-screen bg-white text-neutral-900 pb-24" style={{ fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif" }}>
      {/* Top news bar */}
      <header className="border-b border-neutral-200">
        <div className="text-white text-xs sm:text-sm py-1.5 px-4 text-center font-semibold tracking-wide" style={{ background: "#0B2545" }}>
          🩺 تحقيق طبي حصري — صحة الرجل · {today}
        </div>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-white font-black px-2 py-1 text-sm tracking-tight" style={{ background: "#0B2545" }}>
              <span style={{ color: "#C9A84C" }}>HEALTH</span>
            </div>
            <span className="font-bold text-neutral-800 text-sm sm:text-base">المجلة الطبية</span>
          </div>
          <div className="text-xs text-neutral-500 hidden sm:block">قسم: صحة الرجل · تحقيق</div>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 py-6">
        <div className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: "#C9A84C" }}>تحقيق طبي · صحة الرجل · اكتشاف جديد</div>
        <h1 className="text-[26px] sm:text-4xl font-black leading-[1.3] mb-3 text-neutral-900">
          أطباء يكشفون السبب الحقيقي وراء <span style={{ color: "#0B2545" }}>ضعف الانتصاب وسرعة القذف</span>…
          والحل الطبيعي الذي غيّر حياة آلاف الرجال
        </h1>
        <p className="text-base sm:text-lg text-neutral-600 leading-relaxed mb-4">
          تحقيق طبي خاص يرصد ما يصفه المختصون بـ«الأزمة الصامتة» التي تطارد ملايين الرجال،
          ويكشف عن بخاخ طبيعي يحمل اسم <strong className="text-neutral-900">«Dragon Power 9000»</strong>
          أعاد — بحسب المستخدمين — القوة والتحكم والثقة خلال أيام.
        </p>

        {/* Byline */}
        <div className="flex items-center justify-between border-y border-neutral-200 py-3 my-4 text-sm text-neutral-600">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white" style={{ background: "#0B2545" }}>د.م</div>
            <div>
              <div className="font-bold text-neutral-800">د. محمد الراشد</div>
              <div className="text-xs">المحرر الطبي · أخصائي صحة الرجل</div>
            </div>
          </div>
          <div className="text-xs text-neutral-500 text-left">
            <div>{today}</div>
            <div>⏱ قراءة 5 دقائق</div>
          </div>
        </div>

        {/* Hero */}
        <figure className="mb-6">
          <img
            src={productHero}
            alt="بخاخ Dragon Power 9000 في مختبر طبي"
            className="w-full h-56 sm:h-80 object-cover rounded-md"
            loading="eager"
          />
          <figcaption className="text-xs text-neutral-500 mt-2 text-center">
            بخاخ Dragon Power 9000 — تركيبة عشبية متطورة لدعم الأداء والتحكم.
          </figcaption>
        </figure>

        {/* Opening hook */}
        <section className="text-[17px] leading-loose space-y-4 text-neutral-800">
          <p>
            خلف الأبواب المغلقة، يعيش ملايين الرجال صراعاً صامتاً لا يجرؤون على البوح به:
            <strong> ضعف انتصاب، نهاية مبكرة، قلق قبل اللحظة الحاسمة، وشعور بالعجز يطاردهم خارج غرفة النوم.</strong>
            ما يبدأ كموقف عابر سرعان ما يتحول إلى دائرة من الإحباط وفقدان الثقة بالنفس.
          </p>
          <p>
            الإحصاءات الطبية الحديثة تشير إلى أن <strong>أكثر من 6 من كل 10 رجال</strong> فوق سن الثلاثين
            يعانون من شكل من أشكال ضعف الأداء، ومع ذلك لا يطلب أكثر من 1 من كل 10 منهم أي مساعدة.
            النتيجة: علاقات تنهار في صمت دون أن يفهم أحد السبب الحقيقي.
          </p>
        </section>

        {/* Highlight box */}
        <div className="mt-6 rounded-md p-4 text-[15px] leading-relaxed text-neutral-800" style={{ background: "#FFF8E6", borderRight: "4px solid #C9A84C" }}>
          💡 <strong>تنبيه طبي:</strong> ضعف الانتصاب وسرعة القذف ليسا «نهاية الرجولة»…
          بل في الغالب إشارة من جسدك بأن الدورة الدموية أو الاستجابة العصبية تحتاج إلى دعم.
          الخبر السار: الجسم قادر على استعادة توازنه طبيعياً عند تزويده بالمكونات الصحيحة.
        </div>

        {/* Problem escalation */}
        <h2 className="text-2xl font-black mt-10 mb-3 pr-3" style={{ borderRight: "4px solid #0B2545" }}>عندما يتحول الأمر إلى كابوس يومي</h2>
        <div className="text-[17px] leading-loose space-y-4 text-neutral-800">
          <p>
            في البداية يحاول الرجل تجاهل الأمر. يقول: «إرهاق… ضغط عمل… غداً أكون أفضل».
            لكن مع تكرار المواقف، يبدأ في <strong>تجنّب اللحظات الحميمة</strong>،
            ويختلق الأعذار، ويخلد للنوم مبكراً قبل أن تأتي زوجته. شيئاً فشيئاً يتسلل البرود إلى العلاقة.
          </p>
          <p>الأعراض التي يصفها أغلب الرجال:</p>
          <ul className="list-disc pr-6 space-y-1" style={{ listStyleType: "disc" }}>
            <li>ضعف الانتصاب أو عدم الثبات لمدة كافية</li>
            <li>سرعة القذف ونهاية مبكرة للعلاقة</li>
            <li>انخفاض الرغبة وفتور تجاه الشريكة</li>
            <li>قلق وتوتر قبل اللقاء الحميم</li>
            <li>إرهاق دائم وفقدان الحماس والثقة</li>
            <li>توتر وخلافات متكررة في العلاقة الزوجية</li>
          </ul>
          <p>
            هذه ليست مجرد «مشكلة في غرفة النوم»…
            بل <strong>أزمة تمتد إلى كل تفاصيل حياة الرجل</strong>: عمله، نومه، علاقاته، ونظرته لنفسه.
          </p>
        </div>

        {/* Scientific explanation */}
        <h2 className="text-2xl font-black mt-10 mb-3 pr-3" style={{ borderRight: "4px solid #0B2545" }}>السبب العلمي… الذي لا أحد يخبرك به</h2>
        <figure className="my-4">
          <img src={circulationImg} alt="رسم توضيحي للدورة الدموية" className="w-full h-56 sm:h-72 object-cover rounded-md bg-neutral-50" loading="lazy" />
          <figcaption className="text-xs text-neutral-500 mt-2 text-center">الدورة الدموية والاستجابة العصبية — حجر الأساس للأداء الجنسي.</figcaption>
        </figure>
        <div className="text-[17px] leading-loose space-y-4 text-neutral-800">
          <p>
            بحسب المختصين، يحدث الانتصاب نتيجة <strong>تدفق كافٍ للدم إلى الأنسجة الإسفنجية</strong>،
            بينما يعتمد التحكم في القذف على <strong>توازن الاستجابة العصبية</strong>.
            ضعف أيٍّ من العاملين يسبب المشكلة:
          </p>
          <ol className="list-decimal pr-6 space-y-2 marker:font-bold" style={{ listStyleType: "decimal" }}>
            <li><strong>صحة الدورة الدموية</strong> — الشرايين المرنة تسمح بتدفق دم قوي وسريع.</li>
            <li><strong>تنظيم الحساسية العصبية</strong> — تأخير الإشارة العصبية للتحكم بمدة أطول.</li>
            <li><strong>دعم الحيوية الذكورية</strong> — توازن الطاقة والقدرة على التحمل.</li>
          </ol>
          <p>
            عوامل نمط الحياة الحديث — <strong>الأطعمة المصنّعة، قلة النوم، الضغط النفسي، التدخين</strong> —
            تضرب هذه العوامل دفعة واحدة. والنتيجة: ضعف انتصاب، قذف سريع، وفقدان الثقة.
          </p>
        </div>

        {/* Expert quote */}
        <blockquote className="mt-6 text-white rounded-md p-5 sm:p-6" style={{ background: "#0B2545" }}>
          <div className="text-5xl leading-none mb-2" style={{ color: "#C9A84C" }}>”</div>
          <p className="text-lg sm:text-xl font-medium leading-relaxed">
            معظم حالات ضعف الأداء التي أراها في عيادتي ليست أمراضاً مزمنة…
            بل ناتجة عن ضعف الدورة الدموية وارتفاع الحساسية العصبية.
            دعم الجسم بمكونات نباتية موضعية صحيحة قد يحدث فرقاً ملحوظاً خلال أيام.
          </p>
          <footer className="mt-4 text-sm text-neutral-300">— د. سامي القحطاني، استشاري صحة الرجل</footer>
        </blockquote>

        {/* Doctor */}
        <figure className="my-6">
          <img src={doctorImg} alt="طبيب مختص" className="w-full h-56 sm:h-72 object-cover rounded-md" loading="lazy" />
          <figcaption className="text-xs text-neutral-500 mt-2 text-center">المختصون يؤكدون أهمية الحلول الموضعية الطبيعية.</figcaption>
        </figure>

        {/* Discovery */}
        <h2 className="text-2xl font-black mt-10 mb-3 pr-3" style={{ borderRight: "4px solid #0B2545" }}>الاكتشاف الذي يتحدث عنه الجميع</h2>
        <figure className="my-4">
          <img
            src={productDiscovery}
            alt="مكونات Dragon Power 9000 العشبية"
            className="w-full h-56 sm:h-80 object-cover rounded-md"
            loading="lazy"
          />
          <figcaption className="text-xs text-neutral-500 mt-2 text-center">
            مكونات نباتية مستوحاة من الطب التقليدي ومدعومة بأبحاث في صحة الرجل.
          </figcaption>
        </figure>
        <div className="text-[17px] leading-loose space-y-4 text-neutral-800">
          <p>
            بعد سنوات من البحث، طوّر فريق طبي تركيبة <strong>موضعية على شكل بخاخ</strong> تستهدف
            الأسباب الثلاثة معاً: تحسين تدفق الدم، تنظيم الحساسية العصبية للتحكم الأفضل،
            ودعم الحيوية الذكورية. أُطلق عليها اسم <strong>Dragon Power 9000</strong>.
          </p>
          <p>
            ما لفت الانتباه أن المستخدمين يصفون النتائج بأنها <strong>سريعة وملموسة من أول استخدام</strong>:
            انتصاب أقوى، تحكم أطول بكثير، وثقة استثنائية في النفس.
          </p>
          <div className="flex justify-center my-4">
            <img src={productImage} alt="بخاخ Dragon Power 9000" className="w-48 sm:w-64 h-auto object-contain" loading="lazy" />
          </div>
        </div>

        {/* Ingredients breakdown */}
        <h2 className="text-2xl font-black mt-10 mb-3 pr-3" style={{ borderRight: "4px solid #0B2545" }}>المكونات الفعالة وكيف تعمل</h2>
        <div className="space-y-3">
          {[
            { n: "خلاصة الجينسنغ الكوري", d: "يدعم تدفق الدم عبر تحفيز إنتاج أكسيد النيتريك المسؤول عن توسيع الأوعية الدموية." },
            { n: "مستخلص الماكا البيروفية", d: "جذور أنديزية تقليدية تُستخدم لدعم الرغبة والطاقة الذكورية والقدرة على التحمل." },
            { n: "زيت القرنفل الطبيعي", d: "يساعد على تنظيم الحساسية العصبية الموضعية للمساهمة في التحكم الأفضل بمدة العلاقة." },
            { n: "L-أرجينين", d: "حمض أميني يتحول داخل الجسم إلى أكسيد النيتريك لتحسين تدفق الدم وقوة الانتصاب." },
            { n: "خلاصة ترايبولوس", d: "نبتة تقليدية شهيرة تساعد الجسم على دعم مستويات التستوستيرون الطبيعية." },
            { n: "مستخلصات نباتية مهدّئة", d: "تخفّف التوتر العصبي وتدعم استرخاء الجسم لأداء أفضل وأطول." },
          ].map((b, i) => (
            <div key={i} className="flex gap-3 bg-neutral-50 border border-neutral-200 rounded-md p-4">
              <span className="font-black text-xl shrink-0" style={{ color: "#C9A84C" }}>✓</span>
              <div>
                <div className="font-bold text-neutral-900 mb-1">{b.n}</div>
                <div className="text-[15px] text-neutral-700 leading-relaxed">{b.d}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-neutral-500 mt-3">
          * هذه عبارات داعمة لنمط حياة صحي ولا تُعدّ ادعاءً علاجياً أو تشخيصاً طبياً.
        </p>

        {/* Real user transformation story */}
        <h2 className="text-2xl font-black mt-10 mb-3 pr-3" style={{ borderRight: "4px solid #0B2545" }}>قصة كريم… كيف استعاد ثقته في 14 يوماً</h2>
        <figure className="my-4">
          <img src={lifestyleImg} alt="رجل واثق بنفسه" className="w-full h-56 sm:h-72 object-cover rounded-md" loading="lazy" />
        </figure>
        <div className="text-[17px] leading-loose space-y-4 text-neutral-800">
          <p>
            <strong>كريم، 41 عاماً، موظف وأب لطفلين</strong>، كان يعيش ما يصفه بـ«أصعب مرحلة في حياته».
            بدأ يلاحظ ضعفاً وسرعة في النهاية قبل عامين، فحاول التجاهل. لكن الأمور ساءت
            حتى وصل لمرحلة بدأ يتجنّب فيها زوجته تماماً.
          </p>
          <p>
            «<em>كنت أشعر أني فقدت رجولتي. صرت أنام مبكراً، أصرخ على أولادي بدون سبب،
            وأشعر أن زوجتي تنظر إليّ بشفقة. كنت محطماً من الداخل.</em>»
          </p>
          <p>
            بعد أن قرأ مقالاً عن <strong>Dragon Power 9000</strong>، قرر أن يجرّب — كآخر محاولة.
            من <strong>أول استخدام</strong> لاحظ تحكّماً لم يعرفه منذ سنوات. خلال أسبوعين كانت زوجته أول من لاحظ الفرق.
          </p>
          <div className="grid grid-cols-2 gap-3 my-4">
            <div className="border rounded-md p-4 text-center" style={{ background: "#FEF2F2", borderColor: "#FCA5A5" }}>
              <div className="text-xs font-bold mb-1" style={{ color: "#B91C1C" }}>قبل</div>
              <div className="text-sm text-neutral-700 leading-relaxed">قلق · ضعف أداء · نهاية مبكرة · تجنّب · فقدان ثقة</div>
            </div>
            <div className="border rounded-md p-4 text-center" style={{ background: "#FFFBEB", borderColor: "#C9A84C" }}>
              <div className="text-xs font-bold mb-1" style={{ color: "#92400E" }}>بعد 14 يوماً</div>
              <div className="text-sm text-neutral-700 leading-relaxed">تحكم أطول · انتصاب أقوى · ثقة · علاقة أحلى</div>
            </div>
          </div>
          <p>
            «<em>اليوم، عادت ابتسامتي… وعادت العلاقة بيني وبين زوجتي أحلى من أيامنا الأولى.
            لا أصدّق أن بخاخاً طبيعياً غيّر حياتي بهذا الشكل.</em>»
          </p>
        </div>

        {/* Social proof */}
        <h2 className="text-2xl font-black mt-10 mb-3 pr-3" style={{ borderRight: "4px solid #0B2545" }}>آلاف الرجال استعادوا قوتهم</h2>
        <div className="grid grid-cols-3 gap-3 mb-5 text-center">
          <div className="text-white rounded-md p-3" style={{ background: "#0B2545" }}>
            <div className="text-2xl font-black" style={{ color: "#C9A84C" }}>+18,200</div>
            <div className="text-[10px] text-neutral-300 mt-1">عميل راضٍ</div>
          </div>
          <div className="text-white rounded-md p-3" style={{ background: "#0B2545" }}>
            <div className="text-2xl font-black" style={{ color: "#C9A84C" }}>96%</div>
            <div className="text-[10px] text-neutral-300 mt-1">نسبة الرضا</div>
          </div>
          <div className="text-white rounded-md p-3" style={{ background: "#0B2545" }}>
            <div className="text-2xl font-black" style={{ color: "#C9A84C" }}>4.9★</div>
            <div className="text-[10px] text-neutral-300 mt-1">متوسط التقييم</div>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { n: "خالد · 42 سنة · الرياض", t: "من أول استخدام لاحظت فرقاً في التحكم. زوجتي سعيدة وأنا استعدت ثقتي." },
            { n: "سامي · 36 سنة · جدة", t: "كنت أعاني من قذف سريع وقلق دائم. اليوم الأمور طبيعية والحمد لله." },
            { n: "ماجد · 51 سنة · الدمام", t: "في عمري ما توقعت أرجع لطاقتي. الفرق محسوس من أول رشّة." },
            { n: "يوسف · 29 سنة · مكة", t: "البخاخ سهل الاستخدام والمفعول سريع جداً. غيّر علاقتي تماماً." },
          ].map((r, i) => (
            <div key={i} className="border border-neutral-200 rounded-md p-4 bg-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white" style={{ background: "#0B2545" }}>
                  {r.n.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-sm text-neutral-800">{r.n}</div>
                  <div className="text-sm" style={{ color: "#C9A84C" }}>★★★★★ <span className="text-[10px] text-green-700 font-bold">✓ مستخدم موثّق</span></div>
                </div>
              </div>
              <p className="text-[15px] leading-relaxed text-neutral-700">«{r.t}»</p>
            </div>
          ))}
        </div>

        {/* Urgency */}
        <div className="mt-10 border-2 rounded-md p-5" style={{ borderColor: "#0B2545", background: "#F8FAFC" }}>
          <div className="font-black text-lg mb-2" style={{ color: "#0B2545" }}>⚠️ الكمية محدودة جداً</div>
          <p className="text-neutral-800 text-[15px] leading-relaxed mb-4">
            بسبب الإقبال الهائل بعد نشر التحقيق، نفذت كميات كبيرة من المخزون،
            ولم يبقَ سوى عدد محدود من العبوات بسعر التحقيق الخاص. ينتهي العرض خلال:
          </p>
          <div className="flex justify-center gap-2 sm:gap-3">
            {[
              { v: pad(timeLeft.h), l: "ساعة" },
              { v: pad(timeLeft.m), l: "دقيقة" },
              { v: pad(timeLeft.s), l: "ثانية" },
            ].map((u, i) => (
              <div key={i} className="text-white rounded-md px-4 py-2 min-w-[70px] text-center" style={{ background: "#0B2545" }}>
                <div className="text-2xl sm:text-3xl font-black tabular-nums" style={{ color: "#C9A84C" }}>{u.v}</div>
                <div className="text-[10px] uppercase tracking-wider text-neutral-300">{u.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            to="/order"
            className="inline-block font-black text-lg sm:text-xl px-8 py-4 rounded-md shadow-lg transition-all transform hover:scale-105"
            style={{ background: "linear-gradient(180deg, #E8C97A, #C9A84C)", color: "#0B2545" }}
          >
            ✅ تحقق من توفر Dragon Power 9000 الآن
          </Link>
          <div className="text-xs text-neutral-500 mt-3">الدفع عند الاستلام · شحن سريع · توفر مرهون بالكمية</div>
        </div>

        {/* Trust badges */}
        <div className="mt-10 grid grid-cols-3 gap-3 text-center">
          {[
            { i: "🌿", t: "100% طبيعي" },
            { i: "🔬", t: "مختبر سريرياً" },
            { i: "🛡️", t: "جودة صيدلية" },
          ].map((b, i) => (
            <div key={i} className="border border-neutral-200 rounded-md p-3 bg-neutral-50">
              <div className="text-2xl mb-1">{b.i}</div>
              <div className="text-xs font-bold text-neutral-700">{b.t}</div>
            </div>
          ))}
        </div>

        {/* Comments */}
        <h2 className="text-2xl font-black mt-12 mb-3 pr-3" style={{ borderRight: "4px solid #0B2545" }}>التعليقات (214)</h2>
        <div className="space-y-4">
          {[
            { n: "أبو فهد", a: "قبل ساعة", t: "والله جربت كل شي قبل، هذي أول مرة أحس بفرق حقيقي من أول استخدام. شكراً.", l: 87 },
            { n: "محمد .ع", a: "قبل 4 ساعات", t: "زوجتي هي اللي طلبت مني أكتب تعليق 😂 الفرق واضح من أول مرة.", l: 132 },
            { n: "سعد القرني", a: "أمس", t: "هل آمن مع أدوية الضغط؟ سؤال جدي.", l: 19, reply: "البخاخ موضعي ومكوناته طبيعية، لكن يُنصح دائماً باستشارة الطبيب قبل البدء." },
            { n: "بلال", a: "قبل يومين", t: "طلبته لأخوي وصار يحكيلي عن نتائج خرافية. شي ممتاز.", l: 74 },
            { n: "Anonymous", a: "قبل 3 أيام", t: "كنت محرج أعلق… لكن أقول للجميع: لا تستحوا، جربوه. غيّر علاقتي تماماً.", l: 198 },
          ].map((c, i) => (
            <div key={i} className="border-b border-neutral-200 pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ background: "#0B2545" }}>{c.n.charAt(0)}</div>
                <div className="flex-1">
                  <div className="font-bold text-sm text-neutral-800">{c.n}</div>
                  <div className="text-xs text-neutral-500">{c.a}</div>
                </div>
              </div>
              <p className="text-[15px] text-neutral-700 leading-relaxed mb-2">{c.t}</p>
              {c.reply && (
                <div className="mr-12 mt-2 bg-neutral-50 p-3 rounded text-[14px] text-neutral-700" style={{ borderRight: "2px solid #C9A84C" }}>
                  <strong className="text-neutral-900">↳ رد المحرر:</strong> {c.reply}
                </div>
              )}
              <div className="flex gap-4 text-xs text-neutral-500 mt-2">
                <span>👍 {c.l}</span>
                <span>رد</span>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-10 border-t border-neutral-200 pt-5 text-xs text-neutral-500 leading-relaxed">
          <strong>إخلاء مسؤولية:</strong> هذا المقال ذو طابع معلوماتي ولا يُعتبر استشارة طبية.
          المنتج المذكور مكمل طبيعي ولا يُقصد به تشخيص أو علاج أو الوقاية من أي مرض.
          النتائج قد تختلف من شخص لآخر. يُنصح باستشارة الطبيب قبل البدء بأي منتج.
        </div>
      </article>

      <footer className="border-t border-neutral-200 mt-8 py-6 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} المجلة الطبية · جميع الحقوق محفوظة
      </footer>

      {/* Sticky CTA */}
      <div
        className={`fixed bottom-0 inset-x-0 z-50 transition-transform duration-300 ${
          showStickyCta ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-white shadow-2xl px-3 py-3" style={{ borderTop: "2px solid #C9A84C" }}>
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <img src={productImage} alt="Dragon Power 9000" className="w-12 h-12 object-contain shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-neutral-900 truncate">Dragon Power 9000</div>
              <div className="text-[11px] font-semibold" style={{ color: "#0B2545" }}>⏱ ينتهي العرض خلال {pad(timeLeft.h)}:{pad(timeLeft.m)}:{pad(timeLeft.s)}</div>
            </div>
            <Link
              to="/order"
              className="font-black text-sm px-4 py-3 rounded-md shrink-0 shadow-md"
              style={{ background: "linear-gradient(180deg, #E8C97A, #C9A84C)", color: "#0B2545" }}
            >
              اطلب الآن ←
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Powerspry;
