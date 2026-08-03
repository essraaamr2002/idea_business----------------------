import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listProducts, upsertProduct, deleteProduct, listCategories, upsertCategory } from "@/lib/admin-pro.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Plus, Trash2, Edit, FolderTree } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/catalog")({ component: Page });

function Page() {
  const list = useServerFn(listProducts);
  const upsert = useServerFn(upsertProduct);
  const del = useServerFn(deleteProduct);
  const listCats = useServerFn(listCategories);
  const upsertCat = useServerFn(upsertCategory);
  const qc = useQueryClient();

  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => list() });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: () => listCats() });

  const saveM = useMutation({ mutationFn: (d: any) => upsert(d), onSuccess: () => { toast.success("تم الحفظ"); qc.invalidateQueries({ queryKey: ["products"] }); } });
  const delM = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["products"] }); } });
  const saveCatM = useMutation({ mutationFn: (d: any) => upsertCat(d), onSuccess: () => { toast.success("تم"); qc.invalidateQueries({ queryKey: ["categories"] }); } });

  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [catName, setCatName] = useState("");

  const newProduct = () => { setEditing({ name: "", price: 0, type: "physical", currency: "USD", is_active: true }); setOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">كتالوج المنتجات والخدمات</h1>
            <p className="text-sm text-muted-foreground">أضف منتجات مادية، رقمية، خدمات، أو اشتراكات.</p>
          </div>
        </div>
        <Button onClick={newProduct}><Plus className="h-4 w-4 mr-1" /> منتج جديد</Button>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">المنتجات ({products.length})</TabsTrigger>
          <TabsTrigger value="categories"><FolderTree className="h-4 w-4 mr-1" /> الفئات ({categories.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardContent className="p-0">
              <div className="grid gap-2 p-4">
                {products.length === 0 && <p className="text-center text-muted-foreground py-12">لا توجد منتجات بعد. ابدأ بإضافة أول منتج.</p>}
                {(products as any[]).map((p) => (
                  <div key={p.id} className="border rounded-lg p-3 flex items-center gap-3 bg-card">
                    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                      {p.images?.[0] ? <img src={p.images[0]} className="h-12 w-12 object-cover rounded" /> : <Package className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground flex gap-2 flex-wrap">
                        <Badge variant="outline">{p.type}</Badge>
                        <span>{p.price} {p.currency}</span>
                        {!p.is_active && <Badge variant="secondary">معطّل</Badge>}
                        {p.is_featured && <Badge>مميّز</Badge>}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => confirm("حذف؟") && delM.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader><CardTitle className="text-base">إضافة فئة</CardTitle></CardHeader>
            <CardContent className="flex gap-2">
              <Input placeholder="اسم الفئة" value={catName} onChange={(e) => setCatName(e.target.value)} />
              <Button onClick={() => { if (catName.trim()) { saveCatM.mutate({ name: catName.trim() }); setCatName(""); } }}>إضافة</Button>
            </CardContent>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {(categories as any[]).map((c) => (
                  <div key={c.id} className="border rounded p-3 flex items-center justify-between">
                    <span>{c.name}</span>
                    <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "نشط" : "معطّل"}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "تعديل منتج" : "منتج جديد"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>الاسم</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>السعر</Label><Input type="number" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></div>
                <div><Label>العملة</Label><Input value={editing.currency ?? "USD"} onChange={(e) => setEditing({ ...editing, currency: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>النوع</Label>
                  <Select value={editing.type ?? "physical"} onValueChange={(v) => setEditing({ ...editing, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="physical">منتج مادي</SelectItem>
                      <SelectItem value="digital">منتج رقمي</SelectItem>
                      <SelectItem value="service">خدمة</SelectItem>
                      <SelectItem value="subscription">اشتراك</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الفئة</Label>
                  <Select value={editing.category_id ?? ""} onValueChange={(v) => setEditing({ ...editing, category_id: v || null })}>
                    <SelectTrigger><SelectValue placeholder="بدون فئة" /></SelectTrigger>
                    <SelectContent>{(categories as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>وصف قصير</Label><Input value={editing.short_description ?? ""} onChange={(e) => setEditing({ ...editing, short_description: e.target.value })} /></div>
              <div><Label>الوصف الكامل</Label><Textarea rows={4} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div><Label>رابط الصورة</Label><Input value={editing.images?.[0] ?? ""} onChange={(e) => setEditing({ ...editing, images: e.target.value ? [e.target.value] : [] })} /></div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2"><input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> نشط</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={editing.is_featured ?? false} onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })} /> مميّز</label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={() => { saveM.mutate(editing); setOpen(false); }}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
