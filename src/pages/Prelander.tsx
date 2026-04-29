import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import productImage from "@/assets/testosterone-boost.png";
import productHero from "@/assets/testosterone-boost-hero.jpg";
import productDiscovery from "@/assets/testosterone-boost-discovery.jpg";

const Prelander = () => {
  const [timeLeft, setTimeLeft] = useState({ h: 2, m: 47, s: 33 });
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    document.title = "تحقيق صحي: السبب الخفي وراء ضعف الانتصاب… والحل الطبيعي الذي غيّر حياة الآلاف";

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
    meta.setAttribute("content", "تحقيق صحي: خبراء يكشفون السبب الحقيقي وراء ضعف الانتصاب وضعف الأداء عند الرجال، والحل الطبيعي الذي أعاد الثقة لآلاف الرجال.");

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
        <div className="bg-red-600 text-white text-xs sm:text-sm py-1.5 px-4 text-center font-semibold tracking-wide">
          🚨 تحقيق صحي حصري — صحة الرجل · {today}
        </div>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 text-white font-black px-2 py-1 text-sm tracking-tight">HEALTH</div>
            <span className="font-bold text-neutral-800 text-sm sm:text-base">التقرير الصحي اليومي</span>
          </div>
          <div className="text-xs text-neutral-500 hidden sm:block">قسم: صحة الرجل · تحقيق</div>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 py-6">
        <div className="text-xs font-bold text-red-600 mb-2 uppercase tracking-wider">تحقيق · صحة الرجل · اكتشاف جديد</div>
        <h1 className="text-[26px] sm:text-4xl font-black leading-[1.3] mb-3 text-neutral-900">
          خبراء يكشفون السبب الخفي وراء <span className="text-red-600">ضعف الانتصاب</span> عند الرجال…
          والحل الطبيعي الذي غيّر حياة الآلاف
        </h1>
        <p className="text-base sm:text-lg text-neutral-600 leading-relaxed mb-4">
          تحقيق صحي خاص يرصد ما يصفه أطباء بأنه «وباء صامت» يصيب ملايين الرجال،
          ويكشف عن تركيبة نباتية تُعرف باسم <strong className="text-neutral-900">«Testosterone Boost»</strong>
          أعادت — بحسب المستخدمين — الثقة والقدرة والحيوية بعد أسابيع قليلة فقط.
        </p>

        {/* Byline */}
        <div className="flex items-center justify-between border-y border-neutral-200 py-3 my-4 text-sm text-neutral-600">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-neutral-300 flex items-center justify-center font-bold text-neutral-700">د.أ</div>
            <div>
              <div className="font-bold text-neutral-800">د. أحمد المنصوري</div>
              <div className="text-xs">محرر القسم الصحي · أخصائي صحة الرجل</div>
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
            alt="عبوة Testosterone Boost — مكمل غذائي لدعم الانتصاب والحيوية"
            className="w-full h-56 sm:h-80 object-cover rounded-md"
            loading="eager"
          />
          <figcaption className="text-xs text-neutral-500 mt-2 text-center">
            تركيبة Testosterone Boost — مزيج طبيعي يستهدف دعم الانتصاب والحيوية عند الرجال.
          </figcaption>
        </figure>

        {/* Opening hook */}
        <section className="text-[17px] leading-loose space-y-4 text-neutral-800">
          <p>
            خلف الأبواب الموصدة، يعيش ملايين الرجال في صمت معاناة لا يجرؤون على البوح بها لأقرب الناس إليهم:
            <strong> ضعف في الانتصاب، وقت أداء قصير، قلق قبل اللحظة الحاسمة، وشعور بالعجز يلاحقهم حتى خارج غرفة النوم.</strong>
            ما يبدأ كحادثة عابرة سرعان ما يتحول إلى دائرة مغلقة من التوتر والإحباط… وفقدان الثقة بالنفس.
          </p>
          <p>
            تشير دراسات حديثة إلى أن <strong>أكثر من 52% من الرجال بين 25 و60 عاماً</strong> يعانون من شكل من
            أشكال ضعف الأداء الجنسي، ومع ذلك لا يطلب أكثر من 1 من كل 10 منهم أي مساعدة.
            النتيجة؟ علاقات تتدهور في صمت، وزيجات تنهار دون أن يفهم أحد السبب الحقيقي.
          </p>
        </section>

        {/* Highlight box */}
        <div className="mt-6 bg-amber-50 border-r-4 border-amber-500 rounded-md p-4 text-[15px] leading-relaxed text-neutral-800">
          💡 <strong>تنبيه:</strong> ضعف الانتصاب ليس «نهاية الرجولة»… بل في الغالب إشارة من جسدك أن شيئاً ما
          في الدورة الدموية أو مستوى التستوستيرون يحتاج إلى دعم. والخبر الجيد أن الجسم قادر على استعادة توازنه
          بشكل طبيعي إذا حصل على المكونات الصحيحة.
        </div>

        {/* Problem escalation */}
        <h2 className="text-2xl font-black mt-10 mb-3 border-r-4 border-red-600 pr-3">عندما يتحول الأمر إلى كابوس يومي</h2>
        <div className="text-[17px] leading-loose space-y-4 text-neutral-800">
          <p>
            في البداية يحاول الرجل تجاهل الموضوع. يقول لنفسه: «إرهاق… ضغط عمل… سأكون أفضل غداً».
            لكن مع تكرار المواقف، يبدأ في <strong>تفادي اللحظات الحميمة</strong>، ويختلق الأعذار،
            ويخلد إلى النوم مبكراً قبل أن تأتي زوجته. شيئاً فشيئاً، يتسلل البرود إلى العلاقة.
          </p>
          <p>الأعراض التي يصفها أغلب الرجال تشمل:</p>
          <ul className="list-disc pr-6 space-y-1 marker:text-red-600">
            <li>ضعف الانتصاب أو عدم الثبات للمدة الكافية</li>
            <li>قِصَر مدة الأداء وسرعة القذف</li>
            <li>انخفاض الرغبة وفتور تجاه الشريكة</li>
            <li>قلق نفسي وتوتر قبل اللقاء الحميم</li>
            <li>إرهاق دائم وفقدان الحماس والثقة بالنفس</li>
            <li>توتر وخلافات متكررة داخل العلاقة الزوجية</li>
          </ul>
          <p>
            هذه ليست مجرد «مشكلة في غرفة النوم»… بل <strong>أزمة تمتد إلى كل تفاصيل حياة الرجل</strong>:
            عمله، علاقاته، نومه، وحتى نظرته لنفسه في المرآة.
          </p>
        </div>

        {/* Scientific explanation */}
        <h2 className="text-2xl font-black mt-10 mb-3 border-r-4 border-red-600 pr-3">السبب العلمي الحقيقي… لا أحد يخبرك به</h2>
        <div className="text-[17px] leading-loose space-y-4 text-neutral-800">
          <p>
            بحسب الأطباء، يحدث الانتصاب نتيجة <strong>تدفق كافٍ للدم إلى الأنسجة الإسفنجية في العضو الذكري</strong>،
            وهذا التدفق يعتمد على ثلاثة عوامل أساسية:
          </p>
          <ol className="list-decimal pr-6 space-y-2 marker:text-red-600 marker:font-bold">
            <li><strong>صحة الدورة الدموية</strong> — الشرايين النظيفة والمرنة تسمح بتدفق دم سريع وقوي.</li>
            <li><strong>مستوى التستوستيرون</strong> — الهرمون المسؤول عن الرغبة والطاقة الذكورية، يتراجع بنحو 1–2% سنوياً بعد سن الثلاثين.</li>
            <li><strong>التوازن النفسي</strong> — التوتر يرفع الكورتيزول الذي يخفض التستوستيرون ويضيّق الأوعية الدموية.</li>
          </ol>
          <p>
            عوامل نمط الحياة الحديث — <strong>الأطعمة المصنّعة، قلة النوم، الجلوس الطويل، التدخين، والضغط النفسي</strong> —
            تضرب هذه العوامل الثلاثة دفعة واحدة. النتيجة: ضعف انتصاب، أداء قصير، وفقدان للحيوية.
          </p>
        </div>

        {/* Expert quote */}
        <blockquote className="mt-6 bg-neutral-900 text-white rounded-md p-5 sm:p-6">
          <div className="text-5xl text-red-500 leading-none mb-2">”</div>
          <p className="text-lg sm:text-xl font-medium leading-relaxed">
            معظم حالات ضعف الانتصاب التي أراها في عيادتي ليست مرضية… بل ناتجة عن ضعف الدورة الدموية ونقص التستوستيرون.
            دعم الجسم بمكونات نباتية صحيحة قد يحدث فرقاً ملحوظاً خلال أسابيع.
          </p>
          <footer className="mt-4 text-sm text-neutral-300">— د. سامي القحطاني، استشاري صحة الرجل</footer>
        </blockquote>

        {/* Discovery */}
        <h2 className="text-2xl font-black mt-10 mb-3 border-r-4 border-red-600 pr-3">الاكتشاف الذي يتحدث عنه الجميع</h2>
        <figure className="my-4">
          <img
            src={productDiscovery}
            alt="تركيبة Testosterone Boost — مكونات طبيعية لدعم الانتصاب والحيوية"
            className="w-full h-56 sm:h-80 object-cover rounded-md"
            loading="lazy"
          />
          <figcaption className="text-xs text-neutral-500 mt-2 text-center">
            مكونات نباتية مستوحاة من الطب التقليدي ومدعومة بأبحاث في صحة الرجل.
          </figcaption>
        </figure>
        <div className="text-[17px] leading-loose space-y-4 text-neutral-800">
          <p>
            بعد سنوات من البحث، طوّر فريق من المختصين تركيبة طبيعية تستهدف <strong>الأسباب الثلاثة معاً</strong>:
            تحسين تدفق الدم، دعم مستوى التستوستيرون الطبيعي، وتقليل أثر التوتر على الأداء.
            أُطلق عليها اسم <strong>Testosterone Boost</strong>.
          </p>
          <p>
            ما لفت الانتباه أن مستخدميها يصفون شعوراً بـ
            <strong> «عودة الرجولة» خلال أسبوعين إلى أربعة أسابيع</strong> فقط:
            انتصاب أقوى، ثبات لمدة أطول، طاقة وحيوية، وثقة كبيرة في النفس.
          </p>
        </div>

        {/* Ingredients breakdown */}
        <h2 className="text-2xl font-black mt-10 mb-3 border-r-4 border-red-600 pr-3">المكونات الفعالة وكيف تعمل</h2>
        <div className="space-y-3">
          {[
            { n: "الجينسنغ الكوري الأحمر", d: "يُعرف منذ قرون بدعم الأداء والرغبة، ويُعتقد أنه يحسّن إنتاج أكسيد النيتريك المسؤول عن توسيع الأوعية وتدفق الدم." },
            { n: "الماكا البيروفية", d: "جذور أنديزية تقليدية تُستخدم لدعم الرغبة والطاقة الذكورية والقدرة على التحمل." },
            { n: "ترايبولوس تيريستريس", d: "نبتة شهيرة في الطب التقليدي تساعد الجسم على دعم مستويات التستوستيرون الطبيعية." },
            { n: "L-أرجينين", d: "حمض أميني يتحول داخل الجسم إلى أكسيد النيتريك، مما يساعد على تحسين تدفق الدم وقوة الانتصاب." },
            { n: "الزنك والمغنيسيوم", d: "معادن أساسية لإنتاج التستوستيرون وجودة النوم وتقليل أثر التوتر على الأداء." },
            { n: "أشواغاندا", d: "عشبة هندية معروفة بخفض الكورتيزول (هرمون التوتر) ودعم الحيوية والمزاج." },
          ].map((b, i) => (
            <div key={i} className="flex gap-3 bg-neutral-50 border border-neutral-200 rounded-md p-4">
              <span className="text-red-600 font-black text-xl shrink-0">✓</span>
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
        <h2 className="text-2xl font-black mt-10 mb-3 border-r-4 border-red-600 pr-3">قصة كريم… كيف استعاد ثقته في 30 يوماً</h2>
        <div className="text-[17px] leading-loose space-y-4 text-neutral-800">
          <p>
            <strong>كريم، 41 عاماً، موظف وأب لطفلين</strong>، كان يعيش ما يصفه بـ«أصعب مرحلة في حياته».
            بدأ يلاحظ ضعفاً في الأداء قبل عامين، فحاول تجاهل الأمر. لكن الأمور ساءت تدريجياً
            حتى وصل إلى مرحلة بدأ يتجنب فيها زوجته تماماً.
          </p>
          <p>
            «<em>كنت أشعر أنني فقدت رجولتي. صرت أنام مبكراً، أصرخ على أولادي بدون سبب،
            وأشعر أن زوجتي تنظر إليّ بشفقة. كنت محطماً من الداخل.</em>»
          </p>
          <p>
            بعد أن قرأ مقالاً مشابهاً عن <strong>Testosterone Boost</strong>، قرر أن يجرّب — كآخر محاولة.
            في الأسبوع الثاني بدأ يشعر بطاقة لم يعرفها منذ سنوات. في الأسبوع الرابع كانت زوجته أول من لاحظ الفرق.
          </p>
          <div className="grid grid-cols-2 gap-3 my-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
              <div className="text-xs text-red-700 font-bold mb-1">قبل</div>
              <div className="text-sm text-neutral-700 leading-relaxed">إرهاق · قلق · ضعف أداء · تجنّب · فقدان ثقة</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-md p-4 text-center">
              <div className="text-xs text-green-700 font-bold mb-1">بعد 30 يوماً</div>
              <div className="text-sm text-neutral-700 leading-relaxed">طاقة · ثقة · انتصاب أقوى · علاقة أحلى</div>
            </div>
          </div>
          <p>
            «<em>اليوم، عادت ابتسامتي… وعادت العلاقة بيني وبين زوجتي أحلى من أيامنا الأولى.
            لا أصدق أن مكمّلاً طبيعياً غيّر حياتي بهذا الشكل.</em>»
          </p>
        </div>

        {/* Social proof */}
        <h2 className="text-2xl font-black mt-10 mb-3 border-r-4 border-red-600 pr-3">آلاف الرجال استعادوا ثقتهم</h2>
        <div className="grid grid-cols-3 gap-3 mb-5 text-center">
          <div className="bg-neutral-900 text-white rounded-md p-3">
            <div className="text-2xl font-black">+12,400</div>
            <div className="text-[10px] text-neutral-300 mt-1">عميل راضٍ</div>
          </div>
          <div className="bg-neutral-900 text-white rounded-md p-3">
            <div className="text-2xl font-black">94%</div>
            <div className="text-[10px] text-neutral-300 mt-1">نسبة الرضا</div>
          </div>
          <div className="bg-neutral-900 text-white rounded-md p-3">
            <div className="text-2xl font-black">4.8★</div>
            <div className="text-[10px] text-neutral-300 mt-1">متوسط التقييم</div>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { n: "خالد · 42 سنة", t: "بعد 3 أسابيع لاحظت فرقاً كبيراً في الأداء وثبات أطول. زوجتي سعيدة وأنا استعدت ثقتي." },
            { n: "سامي · 36 سنة", t: "كنت أعاني من ضعف انتصاب وقلق دائم قبل اللقاء. اليوم الأمور طبيعية تماماً والحمد لله." },
            { n: "ماجد · 51 سنة", t: "في عمري ما توقعت أرجع لطاقتي وحيويتي. الفرق محسوس من الأسبوع الثاني." },
            { n: "يوسف · 29 سنة", t: "كان عندي قلق أداء بسبب الضغط. التركيبة هدّأت أعصابي وحسّنت ثقتي بنفسي بشكل كبير." },
          ].map((r, i) => (
            <div key={i} className="border border-neutral-200 rounded-md p-4 bg-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-neutral-700">
                  {r.n.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-sm text-neutral-800">{r.n}</div>
                  <div className="text-yellow-500 text-sm">★★★★★ <span className="text-[10px] text-green-700 font-bold">✓ مستخدم موثّق</span></div>
                </div>
              </div>
              <p className="text-[15px] leading-relaxed text-neutral-700">«{r.t}»</p>
            </div>
          ))}
        </div>

        {/* Urgency */}
        <div className="mt-10 border-2 border-red-600 rounded-md p-5 bg-red-50">
          <div className="text-red-700 font-black text-lg mb-2">⚠️ الكمية محدودة جداً</div>
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
            ✅ تحقق من توفر Testosterone Boost الآن
          </Link>
          <div className="text-xs text-neutral-500 mt-3">الدفع عند الاستلام · شحن سريع · توفر مرهون بالكمية</div>
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

        {/* Comments */}
        <h2 className="text-2xl font-black mt-12 mb-3 border-r-4 border-red-600 pr-3">التعليقات (138)</h2>
        <div className="space-y-4">
          {[
            { n: "أبو فهد", a: "قبل ساعتين", t: "والله جربت كل شي قبل، هذي أول مرة أحس بفرق حقيقي. شكراً على التقرير.", l: 47 },
            { n: "محمد .ع", a: "قبل 5 ساعات", t: "زوجتي هي اللي طلبت مني أكتب تعليق 😂 الفرق واضح من أول أسبوعين.", l: 89 },
            { n: "سعد القرني", a: "أمس", t: "هل آمن مع أدوية الضغط؟ سؤال جدي.", l: 12, reply: "يُنصح دائماً باستشارة الطبيب قبل البدء بأي مكمل غذائي." },
            { n: "بلال", a: "قبل يومين", t: "طلبته لوالدي، يقول صار ينام أحسن وعنده طاقة أكثر. شي ممتاز.", l: 64 },
            { n: "Anonymous", a: "قبل 3 أيام", t: "كنت محرج أعلق… لكن أقول للجميع: لا تستحوا، جربوه. غيّر حياتي.", l: 156 },
          ].map((c, i) => (
            <div key={i} className="border-b border-neutral-200 pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full bg-neutral-300 flex items-center justify-center font-bold text-neutral-700 text-sm">{c.n.charAt(0)}</div>
                <div className="flex-1">
                  <div className="font-bold text-sm text-neutral-800">{c.n}</div>
                  <div className="text-xs text-neutral-500">{c.a}</div>
                </div>
              </div>
              <p className="text-[15px] text-neutral-700 leading-relaxed mb-2">{c.t}</p>
              {c.reply && (
                <div className="mr-12 mt-2 bg-neutral-50 border-r-2 border-red-600 p-3 rounded text-[14px] text-neutral-700">
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
          المنتج المذكور مكمل غذائي ولا يُقصد به تشخيص أو علاج أو الوقاية من أي مرض.
          النتائج قد تختلف من شخص لآخر. يُنصح باستشارة الطبيب قبل البدء بأي مكمل غذائي.
        </div>
      </article>

      <footer className="border-t border-neutral-200 mt-8 py-6 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} التقرير الصحي اليومي · جميع الحقوق محفوظة
      </footer>

      {/* Sticky CTA */}
      <div
        className={`fixed bottom-0 inset-x-0 z-50 transition-transform duration-300 ${
          showStickyCta ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-white border-t-2 border-red-600 shadow-2xl px-3 py-3">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <img src={productImage} alt="Testosterone Boost" className="w-12 h-12 object-contain shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-neutral-900 truncate">Testosterone Boost</div>
              <div className="text-[11px] text-red-600 font-semibold">⏱ ينتهي العرض خلال {pad(timeLeft.h)}:{pad(timeLeft.m)}:{pad(timeLeft.s)}</div>
            </div>
            <Link
              to="/order"
              className="bg-red-600 hover:bg-red-700 text-white font-black text-sm px-4 py-3 rounded-md shrink-0 shadow-md"
            >
              اطلب الآن ←
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Prelander;
