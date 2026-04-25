import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { db, clientFor, getAuthenticatedUserId } from "@/integrations/supabase/external";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/useAdmin";
import { useProductDraft, ProductDraftData } from "@/hooks/useProductDraft";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { CURRENCIES } from "@/hooks/useCurrency";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Save, Upload, X, GripVertical, Star, Trash2, Package,
  ImagePlus, Loader2, Eye, Tag, CloudOff, Check, Cloud, RotateCcw, Gift,
  Copy, ExternalLink, Wand2,
} from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type ProductImage = {
  id: string;
  url: string;
  storage_path: string | null;
  sort_order: number;
  is_main: boolean;
};

// --- Sortable Image ---
function SortableImage({ img, onSetMain, onDelete }: {
  img: ProductImage; onSetMain: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: img.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="relative group w-24 h-24 rounded-xl overflow-hidden border border-border/50 bg-muted shadow-sm">
      <div {...attributes} {...listeners} className="absolute top-1.5 right-1.5 z-10 cursor-grab p-0.5 bg-black/30 rounded">
        <GripVertical className="w-3.5 h-3.5 text-white" />
      </div>
      <img src={img.url} alt="" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
        <button onClick={onSetMain} className="p-1.5 bg-white/90 rounded-lg shadow transition-transform hover:scale-110" title="صورة رئيسية">
          <Star className={`w-3.5 h-3.5 ${img.is_main ? "text-yellow-500 fill-yellow-500" : "text-gray-600"}`} />
        </button>
        <button onClick={onDelete} className="p-1.5 bg-white/90 rounded-lg shadow transition-transform hover:scale-110" title="حذف">
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </button>
      </div>
      {img.is_main && (
        <span className="absolute bottom-0 inset-x-0 bg-yellow-500 text-white text-[9px] text-center py-0.5 font-medium">رئيسية</span>
      )}
    </div>
  );
}

// --- Preview Card ---
function PreviewCard({ name, price, compareAt, image, isActive }: {
  name: string; price: string; compareAt: string; image: string | null; isActive: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden"
    >
      <div className="p-3 border-b border-border/30 flex items-center gap-2">
        <Eye className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">معاينة المنتج</span>
      </div>
      <div className="p-4">
        <div className="aspect-square bg-muted rounded-xl overflow-hidden mb-3">
          {image ? (
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-10 h-10 text-muted-foreground/20" />
            </div>
          )}
        </div>
        <p className="text-sm font-semibold text-foreground truncate mb-1">
          {name || "اسم المنتج"}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-foreground">
            {price ? `${parseFloat(price).toLocaleString("en-US")} ر.س` : "0 ر.س"}
          </span>
          {compareAt && parseFloat(compareAt) > (parseFloat(price) || 0) && (
            <span className="text-xs text-muted-foreground line-through">
              {parseFloat(compareAt).toLocaleString("en-US")} ر.س
            </span>
          )}
        </div>
        <div className="mt-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
            isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-600 border-gray-200"
          }`}>
            {isActive ? "نشط" : "مسودة"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// --- Drag & Drop Upload Area ---
function ImageUploadArea({ onUpload, uploading, disabled }: {
  onUpload: (files: FileList) => void; uploading: boolean; disabled: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer ${
        dragOver ? "border-accent bg-accent/5 scale-[1.01]" : "border-border/60 hover:border-accent/50"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) onUpload(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files && onUpload(e.target.files)}
      />
      {uploading ? (
        <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
      ) : (
        <ImagePlus className="w-8 h-8 text-muted-foreground/40 mx-auto" />
      )}
      <p className="text-sm text-muted-foreground mt-3">
        {uploading ? "جاري رفع الصور..." : "اسحب الصور هنا أو اضغط للاختيار"}
      </p>
      <p className="text-[10px] text-muted-foreground/60 mt-1">PNG, JPG, WEBP</p>
    </motion.div>
  );
}

// === MAIN ===
export default function AdminProductEdit() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId } = useAdmin();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);

  // Form state
  const [nameAr, setNameAr] = useState("");
  const [descAr, setDescAr] = useState("");
  const [price, setPrice] = useState("");
  const [compareAt, setCompareAt] = useState("");
  const [inventory, setInventory] = useState("0");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [currencyEnabled, setCurrencyEnabled] = useState(false);
  const [currencyCode, setCurrencyCode] = useState("SAR");
  const [hiddenFromHome, setHiddenFromHome] = useState(false);
  const [slug, setSlug] = useState("");
  const [snapchatConversionValue, setSnapchatConversionValue] = useState("");
  const [hasGift, setHasGift] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Draft system
  const { saveStatus, hasDraft, getDraft, clearDraft, debouncedSave, setInitialData } = useProductDraft(id);

  const getCurrentFormData = useCallback((): ProductDraftData => ({
    nameAr, descAr, price, compareAt, inventory, sku, category,
    isActive, tags, currencyEnabled, currencyCode, hiddenFromHome, slug, snapchatConversionValue,
  }), [nameAr, descAr, price, compareAt, inventory, sku, category, isActive, tags, currencyEnabled, currencyCode, hiddenFromHome, slug, snapchatConversionValue, hasGift]);

  // Auto-save draft on form changes
  useEffect(() => {
    debouncedSave(getCurrentFormData());
  }, [nameAr, descAr, price, compareAt, inventory, sku, category, isActive, tags, currencyEnabled, currencyCode, hiddenFromHome, slug, snapchatConversionValue, debouncedSave, getCurrentFormData]);

  const applyDraft = useCallback((draft: ProductDraftData) => {
    setNameAr(draft.nameAr);
    setDescAr(draft.descAr);
    setPrice(draft.price);
    setCompareAt(draft.compareAt);
    setInventory(draft.inventory);
    setSku(draft.sku);
    setCategory(draft.category);
    setIsActive(draft.isActive);
    setTags(draft.tags);
    setCurrencyEnabled(draft.currencyEnabled);
    setCurrencyCode(draft.currencyCode);
    setHiddenFromHome(draft.hiddenFromHome);
    setSlug(draft.slug);
    setSnapchatConversionValue(draft.snapchatConversionValue || "");
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (isNew) {
      const initialData: ProductDraftData = {
        nameAr: "", descAr: "", price: "", compareAt: "", inventory: "0",
        sku: "", category: "", isActive: false, tags: [], currencyEnabled: false,
        currencyCode: "SAR", hiddenFromHome: false, slug: "", snapchatConversionValue: "",
      };
      setInitialData(initialData);
      
      // Check for existing draft
      const draft = getDraft();
      if (draft) {
        setShowDraftRecovery(true);
      }
      return;
    }
    (async () => {
      const { data: product } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();
      if (!product) { navigate("/admin/products"); return; }

      setNameAr(product.name_ar);
      setDescAr(product.description_ar || "");
      setPrice(String(product.price));
      setCompareAt(product.compare_at_price ? String(product.compare_at_price) : "");
      setInventory(String(product.inventory));
      setCategory(product.category || "");
      setSku(product.sku || "");
      setIsActive(product.status === "active");
      setTags(product.tags || []);
      setCurrencyEnabled((product as any).currency_enabled || false);
      setCurrencyCode((product as any).currency_code || "SAR");
      setHiddenFromHome((product as any).hidden_from_home || false);
      setSlug((product as any).slug || "");
      setSnapchatConversionValue((product as any).snapchat_conversion_value ? String((product as any).snapchat_conversion_value) : "");
      setHasGift((product as any).has_gift || false);
      setRequiresConfirmation((product as any).requires_confirmation || false);

      // Set initial data for change detection
      const initialData: ProductDraftData = {
        nameAr: product.name_ar,
        descAr: product.description_ar || "",
        price: String(product.price),
        compareAt: product.compare_at_price ? String(product.compare_at_price) : "",
        inventory: String(product.inventory),
        sku: product.sku || "",
        category: product.category || "",
        isActive: product.status === "active",
        tags: product.tags || [],
        currencyEnabled: (product as any).currency_enabled || false,
        currencyCode: (product as any).currency_code || "SAR",
        hiddenFromHome: (product as any).hidden_from_home || false,
        slug: (product as any).slug || "",
        snapchatConversionValue: (product as any).snapchat_conversion_value ? String((product as any).snapchat_conversion_value) : "",
      };
      setInitialData(initialData);

      // Check for existing draft
      const draft = getDraft();
      if (draft) {
        setShowDraftRecovery(true);
      }

      const { data: imgs } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", id)
        .order("sort_order");
      setImages((imgs as ProductImage[]) || []);
      setLoading(false);
    })();
  }, [id]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!nameAr.trim()) e.nameAr = "اسم المنتج مطلوب";
    if (!price || parseFloat(price) <= 0) e.price = "السعر مطلوب";
    if (!inventory && inventory !== "0") e.inventory = "المخزون مطلوب";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (publish = false) => {
    if (!validate()) return;
    setSaving(true);

    const payload: Record<string, any> = {
      name_ar: nameAr.trim(),
      name_en: null,
      description_ar: descAr.trim() || null,
      description_en: null,
      price: parseFloat(price) || 0,
      compare_at_price: compareAt ? parseFloat(compareAt) : null,
      cost: null,
      inventory: parseInt(inventory) || 0,
      sku: sku.trim() || null,
      category: category.trim() || null,
      tags: tags,
      status: publish ? "active" : isActive ? "active" : "draft",
      currency_enabled: currencyEnabled,
      currency_code: currencyEnabled ? currencyCode : null,
      hidden_from_home: hiddenFromHome,
      slug: slug.trim() || null,
      snapchat_conversion_value: snapchatConversionValue ? parseFloat(snapchatConversionValue) : null,
      has_gift: hasGift,
      requires_confirmation: requiresConfirmation,
    };

    try {
      let productId = id;

      if (isNew) {
        const { data, error } = await supabase.from("products").insert(payload as any).select().single();
        if (error) throw error;
        productId = data.id;
      } else {
        const { data: current } = await supabase.from("products").select("*").eq("id", id).single();
        if (current && userId) {
          await supabase.from("product_revisions").insert({
            product_id: id!,
            admin_id: userId,
            snapshot: current,
          });
          const { data: revisions } = await supabase
            .from("product_revisions")
            .select("id")
            .eq("product_id", id!)
            .order("created_at", { ascending: false });
          if (revisions && revisions.length > 10) {
            const toDelete = revisions.slice(10).map((r) => r.id);
            await supabase.from("product_revisions").delete().in("id", toDelete);
          }
        }

        const { error } = await supabase.from("products").update(payload as any).eq("id", id);
        if (error) throw error;
      }

      if (userId) {
        await db("audit_logs").insert({
          admin_id: userId,
          action_type: isNew ? "create" : "update",
          entity_type: "product",
          entity_id: productId,
          after_snapshot: payload,
        });
      }

      toast({ title: isNew ? "✅ تم إنشاء المنتج بنجاح" : "✅ تم حفظ التغييرات" });
      clearDraft();
      // Fire-and-forget sync to external DB (cloaking mode)
      if (productId) {
        supabase.functions
          .invoke("sync-product-to-external", { body: { product_id: productId } })
          .catch((e) => console.warn("External product sync failed:", e));
      }
      if (isNew) navigate(`/admin/products/${productId}`);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = useCallback(async (files: FileList) => {
    if (!id || isNew) {
      toast({ title: "تنبيه", description: "احفظ المنتج أولاً ثم أضف الصور", variant: "destructive" });
      return;
    }
    setUploading(true);

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${id}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadErr) {
        toast({ title: "خطأ", description: "فشل رفع الصورة", variant: "destructive" });
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);

      const isMain = images.length === 0;

      const { data: img } = await supabase
        .from("product_images")
        .insert({
          product_id: id,
          url: publicUrl,
          storage_path: path,
          sort_order: images.length,
          is_main: isMain,
        })
        .select()
        .single();

      if (img) setImages((prev) => [...prev, img as ProductImage]);
    }

    setUploading(false);
  }, [id, isNew, images.length]);

  const handleSetMain = async (imgId: string) => {
    const updated = images.map((i) => ({ ...i, is_main: i.id === imgId }));
    setImages(updated);
    await supabase.from("product_images").update({ is_main: false }).eq("product_id", id!);
    await supabase.from("product_images").update({ is_main: true }).eq("id", imgId);
  };

  const handleDeleteImage = async (img: ProductImage) => {
    setImages((prev) => prev.filter((i) => i.id !== img.id));
    await supabase.from("product_images").delete().eq("id", img.id);
    if (img.storage_path) {
      await supabase.storage.from("product-images").remove([img.storage_path]);
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = images.findIndex((i) => i.id === active.id);
    const newIdx = images.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(images, oldIdx, newIdx);
    setImages(reordered);
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from("product_images").update({ sort_order: i }).eq("id", reordered[i].id);
    }
  };

  const handleDeleteProduct = async () => {
    if (!id) return;
    await supabase.from("products").delete().eq("id", id);
    toast({ title: "تم حذف المنتج" });
    navigate("/admin/products");
  };

  const mainImage = images.find(i => i.is_main)?.url || images[0]?.url || null;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* Draft Recovery Dialog */}
      <AlertDialog open={showDraftRecovery} onOpenChange={setShowDraftRecovery}>
        <AlertDialogContent dir="rtl" className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-primary" />
              تم العثور على بيانات غير محفوظة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              لديك مسودة محفوظة سابقاً لهذا المنتج. هل تريد استعادتها؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel className="mt-0" onClick={() => { clearDraft(); setShowDraftRecovery(false); }}>
              تجاهل
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const draft = getDraft();
              if (draft) applyDraft(draft);
              setShowDraftRecovery(false);
              toast({ title: "✅ تم استعادة المسودة" });
            }} className="bg-primary text-primary-foreground">
              استعادة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/products")} className="rounded-xl">
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">
            {isNew ? "منتج جديد" : "تعديل المنتج"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isNew ? "أضف منتج جديد لمتجرك" : "عدّل تفاصيل المنتج"}
          </p>
        </div>
        {/* Save Status Indicator */}
        <AnimatePresence mode="wait">
          {saveStatus !== "idle" && (
            <motion.div
              key={saveStatus}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                saveStatus === "saving" ? "bg-muted text-muted-foreground border-border" :
                saveStatus === "saved" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800" :
                "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800"
              }`}
            >
              {saveStatus === "saving" && <><Cloud className="w-3.5 h-3.5 animate-pulse" /> جاري الحفظ...</>}
              {saveStatus === "saved" && <><Check className="w-3.5 h-3.5" /> تم الحفظ</>}
              {saveStatus === "unsaved" && <><CloudOff className="w-3.5 h-3.5" /> لم يُحفظ</>}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT - Main Content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Product Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-border/50 bg-card/90 backdrop-blur-sm p-5 space-y-4"
          >
            <h3 className="text-sm font-semibold text-foreground">معلومات المنتج</h3>

            <div>
              <Label className="text-xs">اسم المنتج *</Label>
              <Input
                value={nameAr}
                onChange={(e) => { setNameAr(e.target.value); setErrors(p => ({ ...p, nameAr: "" })); }}
                className={`mt-1 rounded-xl admin-input ${errors.nameAr ? "border-destructive" : ""}`}
                placeholder="مثال: كريم مرطب طبيعي"
              />
              {errors.nameAr && <p className="text-destructive text-xs mt-1">{errors.nameAr}</p>}
            </div>

            <div>
              <Label className="text-xs flex items-center gap-1.5">
                رابط المنتج (Slug)
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap" dir="ltr">/product/</span>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9\u0600-\u06FF-_]/g, "-").toLowerCase())}
                  dir="ltr"
                  className="rounded-xl admin-input flex-1"
                  placeholder="my-product-name"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-xl h-10 w-10 shrink-0"
                  title="اقتراح من الاسم"
                  onClick={() => {
                    if (nameAr.trim()) {
                      const suggested = nameAr.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9\u0600-\u06FF-_]/g, "").toLowerCase();
                      setSlug(suggested);
                    }
                  }}
                >
                  <Wand2 className="w-4 h-4" />
                </Button>
              </div>
              {/* Live URL Preview */}
              {slug && (
                <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/30">
                  <span className="text-[11px] text-muted-foreground truncate flex-1" dir="ltr">
                    {window.location.origin}/product/{slug}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/product/${slug}`);
                      toast({ title: "✅ تم نسخ الرابط" });
                    }}
                    className="p-1 hover:bg-muted rounded transition-colors shrink-0"
                    title="نسخ الرابط"
                  >
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  {!isNew && (
                    <a
                      href={`/product/${slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-muted rounded transition-colors shrink-0"
                      title="معاينة المنتج"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </a>
                  )}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                اتركه فارغاً لاستخدام الرابط التلقائي. اضغط العصا السحرية لاقتراح من الاسم.
              </p>
            </div>

            <div>
              <Label className="text-xs">الوصف</Label>
              <RichTextEditor
                content={descAr}
                onChange={(html) => setDescAr(html)}
                placeholder="أضف وصفاً جذاباً للمنتج..."
              />
            </div>
          </motion.div>

          {/* Images Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border/50 bg-card/90 backdrop-blur-sm p-5 space-y-4"
          >
            <h3 className="text-sm font-semibold text-foreground">الصور</h3>

            {!isNew ? (
              <>
                {images.length > 0 && (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={images.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
                      <div className="flex flex-wrap gap-3">
                        {images.map((img) => (
                          <SortableImage
                            key={img.id}
                            img={img}
                            onSetMain={() => handleSetMain(img.id)}
                            onDelete={() => handleDeleteImage(img)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
                <ImageUploadArea onUpload={handleImageUpload} uploading={uploading} disabled={false} />
              </>
            ) : (
              <div className="rounded-xl bg-muted/50 p-6 text-center">
                <ImagePlus className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">احفظ المنتج أولاً لتتمكن من إضافة الصور</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* RIGHT - Sidebar */}
        <div className="space-y-5">
          {/* Pricing & Stock Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-border/50 bg-card/90 backdrop-blur-sm p-5 space-y-4"
          >
            <h3 className="text-sm font-semibold text-foreground">التسعير والمخزون</h3>

            <div>
              <Label className="text-xs">السعر (ر.س) *</Label>
              <Input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => { setPrice(e.target.value); setErrors(p => ({ ...p, price: "" })); }}
                dir="ltr"
                className={`mt-1 rounded-xl admin-input ${errors.price ? "border-destructive" : ""}`}
                placeholder="0.00"
              />
              {errors.price && <p className="text-destructive text-xs mt-1">{errors.price}</p>}
            </div>

            <div>
              <Label className="text-xs">سعر المقارنة (ر.س)</Label>
              <Input
                type="number"
                step="0.01"
                value={compareAt}
                onChange={(e) => setCompareAt(e.target.value)}
                dir="ltr"
                className="mt-1 rounded-xl admin-input"
                placeholder="0.00"
              />
              {compareAt && price && parseFloat(compareAt) > parseFloat(price) && (
                <p className="text-xs text-emerald-600 mt-1">
                  خصم {Math.round((1 - parseFloat(price) / parseFloat(compareAt)) * 100)}%
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs">المخزون *</Label>
              <Input
                type="number"
                value={inventory}
                onChange={(e) => { setInventory(e.target.value); setErrors(p => ({ ...p, inventory: "" })); }}
                dir="ltr"
                className={`mt-1 rounded-xl admin-input ${errors.inventory ? "border-destructive" : ""}`}
                placeholder="0"
              />
              {errors.inventory && <p className="text-destructive text-xs mt-1">{errors.inventory}</p>}
            </div>

            <div>
              <Label className="text-xs">SKU (رمز المنتج)</Label>
              <Input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                dir="ltr"
                className="mt-1 rounded-xl admin-input"
                placeholder="مثال: PRF-001"
              />
            </div>

            <div>
              <Label className="text-xs">Snapchat Conversion Value</Label>
              <Input
                type="number"
                step="0.01"
                value={snapchatConversionValue}
                onChange={(e) => setSnapchatConversionValue(e.target.value)}
                dir="ltr"
                className="mt-1 rounded-xl admin-input"
                placeholder="اتركه فارغاً لاستخدام السعر الحقيقي"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                القيمة المخصصة التي تُرسل لـ Snapchat Pixel عند الشراء. إذا تُرك فارغاً يُستخدم السعر الحقيقي.
              </p>
            </div>
          </motion.div>

          {/* Currency Settings Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }}
            className="rounded-2xl border border-border/50 bg-card/90 backdrop-blur-sm p-5 space-y-4"
          >
            <h3 className="text-sm font-semibold text-foreground">إعدادات العملة</h3>

            <div className="flex items-center justify-between">
              <Label className="text-xs">تخصيص العملة</Label>
              <div className="flex items-center gap-2">
                <Switch checked={currencyEnabled} onCheckedChange={setCurrencyEnabled} />
                <span className={`text-xs font-medium ${currencyEnabled ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {currencyEnabled ? "مفعل" : "معطل"}
                </span>
              </div>
            </div>

            {currencyEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Label className="text-xs">اختر العملة</Label>
                <select
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value)}
                  className="w-full mt-1 h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name_ar}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  سيتم استبدال رمز العملة فقط بدون تحويل السعر
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Status & Category Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-border/50 bg-card/90 backdrop-blur-sm p-5 space-y-4"
          >
            <h3 className="text-sm font-semibold text-foreground">الحالة والتصنيف</h3>

            <div className="flex items-center justify-between">
              <Label className="text-xs">حالة المنتج</Label>
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <span className={`text-xs font-medium ${isActive ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {isActive ? "نشط" : "مسودة"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">إخفاء من الصفحة الرئيسية</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">المنتج يبقى متاحاً عبر الرابط المباشر</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={hiddenFromHome} onCheckedChange={setHiddenFromHome} />
                <span className={`text-xs font-medium ${hiddenFromHome ? "text-destructive" : "text-muted-foreground"}`}>
                  {hiddenFromHome ? "مخفي" : "ظاهر"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5" /> هدية مجانية مع المنتج 🎁
                </Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">عند التفعيل، يُعرض على العميل اختيار هدية بعد الطلب</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={hasGift} onCheckedChange={setHasGift} />
                <span className={`text-xs font-medium ${hasGift ? "text-pink-600" : "text-muted-foreground"}`}>
                  {hasGift ? "مفعل" : "معطل"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs flex items-center gap-1.5">
                  ✅ يتطلب تأكيد العميل قبل الحفظ
                </Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">عند التفعيل، يتم تحويل العميل لصفحة تأكيد قبل حفظ الطلب</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={requiresConfirmation} onCheckedChange={setRequiresConfirmation} />
                <span className={`text-xs font-medium ${requiresConfirmation ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {requiresConfirmation ? "مفعل" : "معطل"}
                </span>
              </div>
            </div>

            <div>
              <Label className="text-xs">التصنيف</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 rounded-xl admin-input"
                placeholder="مثال: العناية بالبشرة"
              />
            </div>

            <div>
              <Label className="text-xs flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> الوسوم
              </Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2">
                {tags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((_, idx) => idx !== i))}
                      className="hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
                      e.preventDefault();
                      if (!tags.includes(tagInput.trim())) {
                        setTags([...tags, tagInput.trim()]);
                      }
                      setTagInput("");
                    }
                  }}
                  className="rounded-xl admin-input flex-1"
                  placeholder="اكتب وسم واضغط Enter"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => {
                    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
                      setTags([...tags, tagInput.trim()]);
                    }
                    setTagInput("");
                  }}
                >
                  إضافة
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Preview Card */}
          <PreviewCard
            name={nameAr}
            price={price}
            compareAt={compareAt}
            image={mainImage}
            isActive={isActive}
          />

          {/* Delete Button */}
          {!isNew && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              <Button
                variant="outline"
                className="w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5 gap-2"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 className="w-4 h-4" /> حذف المنتج
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Sticky Save Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-background/80 backdrop-blur-xl border-t border-border/50"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/products")}
            className="rounded-xl"
          >
            إلغاء
          </Button>
          <div className="flex items-center gap-3">
            {!isNew && slug && (
              <a
                href={`/product/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="rounded-xl gap-2" type="button">
                  <Eye className="w-4 h-4" /> معاينة
                </Button>
              </a>
            )}
            {!isNew && (
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={saving}
                className="rounded-xl"
              >
                حفظ كمسودة
              </Button>
            )}
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="admin-gradient-btn text-sm flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "جاري الحفظ..." : isNew ? "إنشاء المنتج" : "حفظ ونشر"}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Delete Dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا المنتج نهائياً ولا يمكن استرجاعه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive text-destructive-foreground">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
