"use client";

import {
  useMemo,
  useState,
  useEffect,
  useCallback,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { Search, Copy, X, Check, Sparkles, Plus, Loader2 } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  promptTemplateCategories,
  promptTemplates,
  DEFAULT_TEMPLATE_PLANS,
  templateMatchesPlan,
  promptTemplatePlanOptions,
  promptTemplatePlanLabels,
  type PromptTemplate,
  type PromptTemplateCategory,
  type PromptTemplatePlan,
} from "@/data/prompt-templates";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { fetchWithAuth } from "@/lib/fetchWIthAuth";

type PromptTemplatesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planType?: string | null;
};

type CategoryFilter = PromptTemplateCategory | "all";

const categoryLabel: Record<PromptTemplateCategory, string> =
  promptTemplateCategories.reduce(
    (acc, category) => ({ ...acc, [category.id]: category.label }),
    {} as Record<PromptTemplateCategory, string>
  );

type TemplateFormState = {
  title: string;
  description: string;
  content: string;
  category: PromptTemplateCategory;
  keywords: string;
  planType: PromptTemplatePlan;
};

const templatePlanLabel = (template: PromptTemplate) => {
  const plans = template.availableToPlans ?? DEFAULT_TEMPLATE_PLANS;

  if (plans.includes("all")) {
    return promptTemplatePlanLabels.all;
  }

  const firstPlan = plans[0] ?? DEFAULT_TEMPLATE_PLANS[0];
  return promptTemplatePlanLabels[firstPlan] ?? "Plano específico";
};

export function PromptTemplatesDialog({
  open,
  onOpenChange,
  planType,
}: PromptTemplatesDialogProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [customTemplates, setCustomTemplates] = useState<PromptTemplate[]>([]);
  const [isLoadingCustomTemplates, setIsLoadingCustomTemplates] =
    useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<TemplateFormState>(() => ({
    title: "",
    description: "",
    content: "",
    category: promptTemplateCategories[0]?.id ?? "anamnese",
    keywords: "",
    planType:
      (promptTemplatePlanOptions.find((plan) => plan.id === planType)?.id ??
        "pro") as PromptTemplatePlan,
  }));
  const isMobile = useIsMobile();
  // Reset search when dialog opens
  useEffect(() => {
    if (open) {
      setSearch("");
      setCategory("all");
      setCopiedId(null);
      setIsFormOpen(false);
      setExpandedId(null);
      setFormData((prev) => ({
        ...prev,
        title: "",
        description: "",
        content: "",
        keywords: "",
      }));
    }
  }, [open]);

  useEffect(() => {
    if (!planType) return;
    const normalized =
      (promptTemplatePlanOptions.find((plan) => plan.id === planType)?.id ??
        "pro") as PromptTemplatePlan;
    setFormData((prev) => ({ ...prev, planType: normalized }));
  }, [planType]);

  const normalizedPlan = useMemo(
    () =>
      (promptTemplatePlanOptions.find((plan) => plan.id === planType)?.id ??
        null) as PromptTemplatePlan | null,
    [planType]
  );

  const currentPlanLabel =
    (normalizedPlan && promptTemplatePlanLabels[normalizedPlan]) ||
    "Plano ativo";

  const curatedTemplates = useMemo(
    () =>
      promptTemplates.map(
        (template): PromptTemplate => ({
          ...template,
          availableToPlans: template.availableToPlans ?? DEFAULT_TEMPLATE_PLANS,
          source: "curated",
        })
      ),
    []
  );

  const allTemplates = useMemo(() => {
    const base = curatedTemplates.filter((template) =>
      templateMatchesPlan(template, normalizedPlan)
    );

    const customs = customTemplates
      .map(
        (template): PromptTemplate => ({
          ...template,
          availableToPlans:
            template.availableToPlans && template.availableToPlans.length > 0
              ? template.availableToPlans
              : [normalizedPlan ?? DEFAULT_TEMPLATE_PLANS[0]],
          source: "custom",
        })
      )
      .filter((template) => templateMatchesPlan(template, normalizedPlan));

    return [...base, ...customs];
  }, [customTemplates, curatedTemplates, normalizedPlan]);

  const loadCustomTemplates = useCallback(async () => {
    setIsLoadingCustomTemplates(true);
    try {
      const response = await fetchWithAuth("/api/prompt-templates");
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error ?? "Não foi possível carregar templates personalizados."
        );
      }

      const incoming = Array.isArray(data.templates) ? data.templates : [];
      setCustomTemplates(
        incoming.map(
          (template: PromptTemplate): PromptTemplate => ({
            ...template,
            availableToPlans:
              template.availableToPlans &&
              (template.availableToPlans as PromptTemplatePlan[]).length > 0
                ? template.availableToPlans
                : DEFAULT_TEMPLATE_PLANS,
            source: "custom",
          })
        )
      );
    } catch (error) {
      console.error("[PromptTemplates] Falha ao carregar templates", error);
      setCustomTemplates([]);
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao carregar templates personalizados."
      );
    } finally {
      setIsLoadingCustomTemplates(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadCustomTemplates();
    }
  }, [open, loadCustomTemplates, planType]);

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allTemplates.filter((template) => {
      const matchCategory =
        category === "all" || template.category === category;
      if (!matchCategory) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        template.title,
        template.description,
        template.content,
        ...(template.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [allTemplates, category, search]);

  const handleCopy = async (template: PromptTemplate) => {
    try {
      await navigator.clipboard.writeText(template.content);
      setCopiedId(template.id);
      toast.success("Prompt copiado!", {
        description: "Cole no chat para começar.",
        position: isMobile ? "top-right" : "bottom-right",
      });

      // Reset copied state after animation
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = template.content;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopiedId(template.id);
        toast.success("Prompt copiado!", {
          description: "Cole no chat para começar.",
          position: isMobile ? "top-right" : "bottom-right",
        });
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        toast.error("Não foi possível copiar o prompt.");
      }
    }
  };

  const handleCreateTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Preencha pelo menos o título e o conteúdo do template.");
      return;
    }

    setIsCreating(true);
    try {
      const keywords = formData.keywords
        ? formData.keywords
            .split(",")
            .map((keyword) => keyword.trim())
            .filter(Boolean)
        : [];

      const response = await fetchWithAuth("/api/prompt-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          content: formData.content,
          category: formData.category,
          keywords,
          planType: formData.planType,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error ?? "Não foi possível criar o template personalizado."
        );
      }

      const created: PromptTemplate = {
        ...(data?.template as PromptTemplate),
        availableToPlans:
          data?.template?.availableToPlans ?? [formData.planType],
        source: "custom",
      };

      setCustomTemplates((current) => [created, ...current]);
      toast.success("Template criado!", {
        description:
          data?.message ??
          "Seu template já está disponível para o plano escolhido.",
        position: isMobile ? "top-right" : "bottom-right",
      });

      setFormData((prev) => ({
        ...prev,
        title: "",
        description: "",
        content: "",
        keywords: "",
      }));
      setIsFormOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar seu template personalizado."
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleUseTemplate = (template: PromptTemplate) => {
    handleCopy(template);
    // Auto close after copy for better UX
    setTimeout(() => onOpenChange(false), 500);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="max-w-full sm:max-w-2xl p-0 flex flex-col"
      >
        <SheetHeader className="space-y-3 border-b p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1.5">
              <SheetTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                <Sparkles className="size-5 text-primary sm:size-6" />
                Templates de prompts
              </SheetTitle>
              <SheetDescription className="text-sm sm:text-base">
                Selecione um template curado ou crie versões personalizadas por
                plano
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 sm:hidden"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
              <span className="sr-only">Fechar</span>
            </Button>
          </div>

          {/* Search bar */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
              <Input
                autoFocus
                placeholder="Buscar templates..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 pl-9 pr-10 sm:h-11"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 size-8 -translate-y-1/2"
                  onClick={() => setSearch("")}
                >
                  <X className="size-4" />
                  <span className="sr-only">Limpar busca</span>
                </Button>
              )}
            </div>
            <div className="text-muted-foreground hidden text-xs sm:block">
              Atalho: <kbd className="rounded border px-1.5 py-0.5">⌘/Ctrl</kbd>{" "}
              + <kbd className="rounded border px-1.5 py-0.5">K</kbd>
            </div>
          </div>

          {/* Category filters */}
          <Tabs
            value={category}
            onValueChange={(value) => setCategory(value as CategoryFilter)}
          >
            <ScrollArea className="w-full">
              <TabsList className="inline-flex h-auto w-full flex-nowrap justify-start gap-2 bg-transparent p-0 sm:flex-wrap">
                <TabsTrigger
                  value="all"
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all sm:text-sm",
                    category === "all"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 text-foreground hover:bg-muted"
                  )}
                >
                  Todos
                  <Badge
                    variant="secondary"
                    className="ml-1.5 h-5 min-w-5 rounded-full px-1.5 text-xs"
                  >
                    {allTemplates.length}
                  </Badge>
                </TabsTrigger>
                {promptTemplateCategories.map((item) => {
                  const count = allTemplates.filter(
                    (t) => t.category === item.id
                  ).length;
                  return (
                    <TabsTrigger
                      key={item.id}
                      value={item.id}
                      className={cn(
                        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-all sm:text-sm",
                        category === item.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/50 text-foreground hover:bg-muted"
                      )}
                    >
                      {item.label}
                      <Badge
                        variant="secondary"
                        className="ml-1.5 h-5 min-w-5 rounded-full px-1.5 text-xs"
                      >
                        {count}
                      </Badge>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </ScrollArea>
          </Tabs>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full max-h-[calc(90vh-280px)] sm:max-h-[calc(85vh-280px)]">
            <div className="space-y-4 p-4 sm:p-6">
              <div className="rounded-lg border bg-muted/40 p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Templates personalizados por plano
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Crie prompts exclusivos para assinantes do plano
                      escolhido.
                    </p>
                    {!isFormOpen && (
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="border-dashed text-[11px]">
                          {normalizedPlan
                            ? `Plano atual: ${currentPlanLabel}`
                            : "Plano não identificado"}
                        </Badge>
                        <Badge variant="outline" className="text-[11px]">
                          {customTemplates.length} personalizado
                          {customTemplates.length === 1 ? "" : "s"}
                        </Badge>
                        {isLoadingCustomTemplates && (
                          <span className="flex items-center gap-1">
                            <Loader2 className="size-3 animate-spin" />
                            Atualizando
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant={isFormOpen ? "ghost" : "secondary"}
                    size="sm"
                    onClick={() => setIsFormOpen((prev) => !prev)}
                    className="whitespace-nowrap"
                  >
                    {isFormOpen ? (
                      <>
                        <X className="mr-2 size-4" />
                        Cancelar
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 size-4" />
                        Novo template
                      </>
                    )}
                  </Button>
                </div>

                {isFormOpen && (
                  <form
                    onSubmit={handleCreateTemplate}
                    className="mt-3 grid gap-3"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <Label htmlFor="template-title">Título</Label>
                        <Input
                          id="template-title"
                          value={formData.title}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              title: event.target.value,
                            }))
                          }
                          placeholder="Ex.: Template para acompanhamento VIP"
                          required
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="template-plan">Plano alvo</Label>
                        <select
                          id="template-plan"
                          value={formData.planType}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              planType: event.target
                                .value as PromptTemplatePlan,
                            }))
                          }
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          {promptTemplatePlanOptions.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <Label htmlFor="template-category">Categoria</Label>
                        <select
                          id="template-category"
                          value={formData.category}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              category: event.target
                                .value as PromptTemplateCategory,
                            }))
                          }
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          {promptTemplateCategories.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="template-keywords">
                          Palavras-chave (opcional)
                        </Label>
                        <Input
                          id="template-keywords"
                          value={formData.keywords}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              keywords: event.target.value,
                            }))
                          }
                          placeholder="Separadas por vírgula"
                        />
                      </div>
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="template-description">
                        Descrição (opcional)
                      </Label>
                      <Input
                        id="template-description"
                        value={formData.description}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            description: event.target.value,
                          }))
                        }
                        placeholder="Resumo curto para identificar o template"
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="template-content">Conteúdo</Label>
                      <Textarea
                        id="template-content"
                        value={formData.content}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            content: event.target.value,
                          }))
                        }
                        placeholder="Cole ou escreva o prompt completo"
                        rows={6}
                        required
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsFormOpen(false)}
                      >
                        Fechar
                      </Button>
                      <Button type="submit" size="sm" disabled={isCreating}>
                        {isCreating ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 size-4" />
                            Salvar template
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                {filteredTemplates.map((template) => {
                  const isCopied = copiedId === template.id;
                  const isExpanded = expandedId === template.id;
                  return (
                    <Card
                      key={template.id}
                      className={cn(
                        "group relative flex h-full flex-col transition-all hover:shadow-md",
                        isCopied && "ring-2 ring-primary ring-offset-2"
                      )}
                    >
                      <CardHeader
                        className="pb-3 cursor-pointer select-none"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : template.id)
                        }
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <CardTitle className="line-clamp-2 text-base sm:text-lg">
                                {template.title}
                              </CardTitle>
                              {template.source === "custom" && (
                                <Badge
                                  variant="default"
                                  className="text-[11px]"
                                >
                                  Personalizado
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="line-clamp-2 text-xs sm:text-sm">
                              {template.description}
                            </CardDescription>
                            <div className="flex flex-wrap gap-1.5">
                              <Badge
                                variant="secondary"
                                className="shrink-0 whitespace-nowrap text-[11px]"
                              >
                                {categoryLabel[template.category]}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="shrink-0 whitespace-nowrap text-[11px]"
                              >
                                {templatePlanLabel(template)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-3">
                        <p
                          className={cn(
                            "text-xs text-muted-foreground sm:text-sm transition-all",
                            isExpanded
                              ? "whitespace-pre-line"
                              : "line-clamp-4 flex-1 sm:line-clamp-3"
                          )}
                        >
                          {template.content}
                        </p>
                        {!isExpanded && (
                          <Button
                            variant="link"
                            size="sm"
                            className="self-start px-0 text-xs"
                            onClick={() => setExpandedId(template.id)}
                            tabIndex={0}
                          >
                            Ler tudo
                          </Button>
                        )}
                        {template.keywords && template.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {template.keywords.slice(0, 4).map((keyword) => (
                              <Badge
                                key={keyword}
                                variant="outline"
                                className="text-xs"
                              >
                                {keyword}
                              </Badge>
                            ))}
                            {template.keywords.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.keywords.length - 4}
                              </Badge>
                            )}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={() => handleUseTemplate(template)}
                            variant={isCopied ? "default" : "secondary"}
                            size="sm"
                            className="flex-1 transition-all"
                            disabled={isCopied}
                          >
                            {isCopied ? (
                              <>
                                <Check className="mr-2 size-4" />
                                Copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="mr-2 size-4" />
                                Copiar
                              </>
                            )}
                          </Button>
                          {isExpanded && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="self-start px-2 text-xs"
                              onClick={() => setExpandedId(null)}
                              tabIndex={0}
                            >
                              Fechar
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {filteredTemplates.length === 0 && (
                <div className="text-muted-foreground flex min-h-[300px] flex-col items-center justify-center gap-3 text-center sm:min-h-[400px]">
                  <Search className="size-12 opacity-20 sm:size-16" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium sm:text-base">
                      Nenhum template encontrado
                    </p>
                    <p className="text-xs sm:text-sm">
                      Tente ajustar a busca ou selecione outra categoria
                    </p>
                  </div>
                  {search && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearch("")}
                      className="mt-2"
                    >
                      Limpar busca
                    </Button>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer with stats */}
        <div className="border-t bg-muted/30 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground sm:text-sm">
            <span>
              {filteredTemplates.length}{" "}
              {filteredTemplates.length === 1 ? "template" : "templates"}{" "}
              {category !== "all" && `em ${categoryLabel[category]}`}
            </span>
            <span className="hidden sm:inline">
              Toque ou clique para copiar
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
