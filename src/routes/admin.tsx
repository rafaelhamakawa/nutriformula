import { LogoLoader } from "@/components/logo-loader";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppHeader } from "@/components/app-header";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";
import { NUTRIENT_COLUMNS } from "@/routes/ingredientes";
import iconExigencias from "@/assets/dashboard/exigencias.png";
import { Plus, Search, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Administração — NutriForm" }] }),
  component: AdminPage,
});

const ESPECIES = ["Cães", "Gatos", "Equinos", "Bovinos", "Aves", "Suínos", "Outros"] as const;

type NutrientKey = (typeof NUTRIENT_COLUMNS)[number]["key"];

const emptyNutrients = (): Record<NutrientKey, number> =>
  NUTRIENT_COLUMNS.reduce((acc, c) => {
    acc[c.key] = 0;
    return acc;
  }, {} as Record<NutrientKey, number>);

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  disabled: boolean;
  created_at: string;
  roles: string[];
}

interface GlobalIngredient {
  id: string;
  nome: string;
  preco: number;
  nutrientes: Record<string, number>;
}

interface GlobalRequirement {
  id: string;
  especie: string;
  categoria: string;
  observacao: string;
  nutrientes: Record<string, number>;
}

function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !roleLoading && user && !isAdmin) {
      toast.error("Acesso restrito ao administrador.");
      navigate({ to: "/dashboard" });
    }
  }, [authLoading, roleLoading, user, isAdmin, navigate]);

  if (authLoading || roleLoading || !user || !isAdmin) {
    return <LogoLoader />;
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      <AppHeader />
      <main className="container mx-auto px-6 py-8 md:py-10">
        <PageHeader
          icon={iconExigencias}
          title="Painel do Administrador"
          description="Gerencie usuários, alimentos globais e exigências nutricionais compartilhadas."
        />

        <Tabs defaultValue="usuarios" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="usuarios"><Users className="h-4 w-4 mr-2" /> Usuários</TabsTrigger>
            <TabsTrigger value="alimentos">Alimentos globais</TabsTrigger>
            <TabsTrigger value="exigencias">Exigências globais</TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios">
            <UsuariosTab currentUserId={user.id} />
          </TabsContent>
          <TabsContent value="alimentos">
            <AlimentosGlobaisTab />
          </TabsContent>
          <TabsContent value="exigencias">
            <ExigenciasGlobaisTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ============================================================
 * USUÁRIOS
 * ============================================================ */

function UsuariosTab({ currentUserId }: { currentUserId: string }) {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ProfileRow | null>(null);
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: profs, error: pErr } = await supabase
      .from("profiles")
      .select("id, email, full_name, disabled, created_at")
      .order("created_at", { ascending: false });
    if (pErr) {
      toast.error("Não foi possível carregar usuários.");
      setLoading(false);
      return;
    }
    const { data: rolesData } = await supabase.from("user_roles").select("user_id, role");
    const roleMap = new Map<string, string[]>();
    for (const r of rolesData ?? []) {
      const list = roleMap.get(r.user_id as string) ?? [];
      list.push(r.role as string);
      roleMap.set(r.user_id as string, list);
    }
    setProfiles(
      (profs ?? []).map((p) => ({
        id: p.id as string,
        email: (p.email as string | null) ?? null,
        full_name: (p.full_name as string | null) ?? null,
        disabled: !!p.disabled,
        created_at: p.created_at as string,
        roles: roleMap.get(p.id as string) ?? [],
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return profiles.filter(
      (p) =>
        (p.email ?? "").toLowerCase().includes(q) ||
        (p.full_name ?? "").toLowerCase().includes(q),
    );
  }, [profiles, search]);

  const toggleAdmin = async (p: ProfileRow) => {
    if (p.id === currentUserId) {
      toast.error("Você não pode alterar a sua própria role.");
      return;
    }
    const isCurrentlyAdmin = p.roles.includes("admin");
    if (isCurrentlyAdmin) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", p.id)
        .eq("role", "admin");
      if (error) return toast.error(error.message);
      toast.success("Admin revogado.");
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: p.id, role: "admin" });
      if (error) return toast.error(error.message);
      toast.success("Promovido a admin.");
    }
    void refresh();
  };

  const toggleDisabled = async (p: ProfileRow) => {
    if (p.id === currentUserId) {
      toast.error("Você não pode desabilitar a si mesmo.");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ disabled: !p.disabled })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(p.disabled ? "Usuário reativado." : "Usuário desativado.");
    setConfirmDelete(null);
    void refresh();
  };

  return (
    <Card className="p-4 md:p-6 bg-card/60 backdrop-blur border-border/50">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por e-mail ou nome..."
            className="pl-9"
          />
        </div>
        <Button onClick={() => setOpenCreate(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> Novo usuário
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-mail</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const isAdmin = p.roles.includes("admin");
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.email ?? "—"}</TableCell>
                    <TableCell>{p.full_name ?? "—"}</TableCell>
                    <TableCell>
                      {p.disabled ? (
                        <Badge variant="destructive">Desativado</Badge>
                      ) : (
                        <Badge variant="secondary">Ativo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Badge className="bg-primary/20 text-primary border-primary/40">
                          <ShieldCheck className="h-3 w-3 mr-1" /> admin
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">user</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleAdmin(p)}
                        disabled={p.id === currentUserId}
                      >
                        {isAdmin ? "Revogar admin" : "Tornar admin"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmDelete(p)}
                        disabled={p.id === currentUserId}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CreateUserDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreated={() => void refresh()}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete?.disabled ? "Reativar usuário?" : "Desativar usuário?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.disabled
                ? "O usuário voltará a ter acesso à plataforma."
                : "O usuário perderá acesso aos dados privados. Você pode reativá-lo depois."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && toggleDisabled(confirmDelete)}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!email || !password) {
      toast.error("Informe e-mail e senha.");
      return;
    }
    setSaving(true);
    // Cliente isolado para não afetar a sessão do admin
    const tempClient = createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await tempClient.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || null } },
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const newId = data.user?.id;
    if (makeAdmin && newId) {
      const { error: rErr } = await supabase
        .from("user_roles")
        .insert({ user_id: newId, role: "admin" });
      if (rErr) toast.error("Usuário criado, mas falha ao promover admin: " + rErr.message);
    }
    toast.success("Usuário criado.");
    setEmail("");
    setPassword("");
    setFullName("");
    setMakeAdmin(false);
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar novo usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={makeAdmin}
              onChange={(e) => setMakeAdmin(e.target.checked)}
            />
            Tornar este usuário administrador
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Criando..." : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
 * ALIMENTOS GLOBAIS
 * ============================================================ */

function AlimentosGlobaisTab() {
  const [items, setItems] = useState<GlobalIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GlobalIngredient | null>(null);
  const [form, setForm] = useState<Omit<GlobalIngredient, "id">>({
    nome: "",
    preco: 0,
    nutrientes: emptyNutrients(),
  });
  const [toDelete, setToDelete] = useState<GlobalIngredient | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("global_ingredients")
      .select("*")
      .order("nome");
    if (error) {
      toast.error("Erro ao carregar alimentos globais.");
      setLoading(false);
      return;
    }
    setItems(
      (data ?? []).map((r) => ({
        id: r.id as string,
        nome: (r.nome as string) ?? "",
        preco: Number(r.preco) || 0,
        nutrientes: { ...emptyNutrients(), ...((r.nutrientes as Record<string, number>) ?? {}) },
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(
    () => items.filter((i) => i.nome.toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ nome: "", preco: 0, nutrientes: emptyNutrients() });
    setOpen(true);
  };
  const openEdit = (it: GlobalIngredient) => {
    setEditing(it);
    setForm({ nome: it.nome, preco: it.preco, nutrientes: { ...it.nutrientes } });
    setOpen(true);
  };

  const save = async () => {
    if (!form.nome.trim()) return toast.error("Informe o nome.");
    if (editing) {
      const { error } = await supabase
        .from("global_ingredients")
        .update({ nome: form.nome, preco: form.preco, nutrientes: form.nutrientes })
        .eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Alimento atualizado.");
    } else {
      const { error } = await supabase
        .from("global_ingredients")
        .insert({ nome: form.nome, preco: form.preco, nutrientes: form.nutrientes });
      if (error) return toast.error(error.message);
      toast.success("Alimento criado.");
    }
    setOpen(false);
    void refresh();
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("global_ingredients").delete().eq("id", toDelete.id);
    if (error) return toast.error(error.message);
    toast.success("Alimento removido.");
    setToDelete(null);
    void refresh();
  };

  return (
    <Card className="p-4 md:p-6 bg-card/60 backdrop-blur border-border/50">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="pl-9"
          />
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Novo alimento
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Preço (R$/kg)</TableHead>
              <TableHead className="text-right">PB (%)</TableHead>
              <TableHead className="text-right">EM (kcal)</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Nenhum alimento global cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">{it.nome}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {it.preco.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {it.nutrientes.proteina_bruta ?? 0}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {it.nutrientes.energia_metabolizavel ?? 0}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(it)}>
                      Editar
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setToDelete(it)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar alimento global" : "Novo alimento global"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Preço por kg</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.preco}
                  onChange={(e) => setForm({ ...form, preco: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="pt-2">
              <h4 className="font-semibold mb-3">Nutrientes</h4>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {NUTRIENT_COLUMNS.map((c) => (
                  <div key={c.key} className="space-y-1">
                    <Label className="text-xs">
                      {c.label} <span className="text-muted-foreground">({c.unit})</span>
                    </Label>
                    <Input
                      type="number"
                      step="any"
                      value={form.nutrientes[c.key] ?? 0}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          nutrientes: {
                            ...form.nutrientes,
                            [c.key]: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir alimento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/* ============================================================
 * EXIGÊNCIAS GLOBAIS
 * ============================================================ */

function ExigenciasGlobaisTab() {
  const [items, setItems] = useState<GlobalRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GlobalRequirement | null>(null);
  const [form, setForm] = useState<Omit<GlobalRequirement, "id">>({
    especie: "",
    categoria: "",
    observacao: "",
    nutrientes: emptyNutrients(),
  });
  const [toDelete, setToDelete] = useState<GlobalRequirement | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("global_requirements")
      .select("*")
      .order("especie")
      .order("categoria");
    if (error) {
      toast.error("Erro ao carregar exigências globais.");
      setLoading(false);
      return;
    }
    setItems(
      (data ?? []).map((r) => ({
        id: r.id as string,
        especie: (r.especie as string) ?? "",
        categoria: (r.categoria as string) ?? "",
        observacao: (r.observacao as string) ?? "",
        nutrientes: { ...emptyNutrients(), ...((r.nutrientes as Record<string, number>) ?? {}) },
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.especie.toLowerCase().includes(q) ||
        i.categoria.toLowerCase().includes(q),
    );
  }, [items, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ especie: "", categoria: "", observacao: "", nutrientes: emptyNutrients() });
    setOpen(true);
  };
  const openEdit = (it: GlobalRequirement) => {
    setEditing(it);
    const { id: _id, ...rest } = it;
    setForm({ ...rest, nutrientes: { ...emptyNutrients(), ...rest.nutrientes } });
    setOpen(true);
  };

  const save = async () => {
    if (!form.especie || !form.categoria.trim())
      return toast.error("Espécie e categoria são obrigatórias.");
    if (editing) {
      const { error } = await supabase
        .from("global_requirements")
        .update({
          especie: form.especie,
          categoria: form.categoria,
          observacao: form.observacao,
          nutrientes: form.nutrientes,
        })
        .eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Exigência atualizada.");
    } else {
      const { error } = await supabase.from("global_requirements").insert({
        especie: form.especie,
        categoria: form.categoria,
        observacao: form.observacao,
        nutrientes: form.nutrientes,
      });
      if (error) return toast.error(error.message);
      toast.success("Exigência cadastrada.");
    }
    setOpen(false);
    void refresh();
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("global_requirements").delete().eq("id", toDelete.id);
    if (error) return toast.error(error.message);
    toast.success("Exigência removida.");
    setToDelete(null);
    void refresh();
  };

  return (
    <Card className="p-4 md:p-6 bg-card/60 backdrop-blur border-border/50">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por espécie ou categoria..."
            className="pl-9"
          />
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nova exigência
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Espécie</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Observação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  Nenhuma exigência global cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">{it.especie}</TableCell>
                  <TableCell>{it.categoria}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{it.observacao}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(it)}>
                      Editar
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setToDelete(it)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar exigência global" : "Nova exigência global"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Espécie</Label>
                <Select
                  value={form.especie}
                  onValueChange={(v) => setForm({ ...form, especie: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ESPECIES.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Input
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Input
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              />
            </div>
            <div className="pt-2">
              <h4 className="font-semibold mb-3">Nutrientes</h4>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {NUTRIENT_COLUMNS.map((c) => (
                  <div key={c.key} className="space-y-1">
                    <Label className="text-xs">
                      {c.label} <span className="text-muted-foreground">({c.unit})</span>
                    </Label>
                    <Input
                      type="number"
                      step="any"
                      value={form.nutrientes[c.key] ?? 0}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          nutrientes: {
                            ...form.nutrientes,
                            [c.key]: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir exigência?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
