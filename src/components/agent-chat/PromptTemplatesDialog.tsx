"use client";

import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { Search, Copy, X, Check, Sparkles } from "lucide-react";

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
import {
  promptTemplateCategories,
  promptTemplates,
  type PromptTemplate,
  type PromptTemplateCategory,
} from "@/data/prompt-templates";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type PromptTemplatesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type CategoryFilter = PromptTemplateCategory | "all";

const categoryLabel: Record<PromptTemplateCategory, string> =
  promptTemplateCategories.reduce(
    (acc, category) => ({ ...acc, [category.id]: category.label }),
    {} as Record<PromptTemplateCategory, string>,
  );

export function PromptTemplatesDialog({
  open,
  onOpenChange,
}: PromptTemplatesDialogProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  // Reset search when dialog opens
  useEffect(() => {
    if (open) {
      setSearch("");
      setCategory("all");
      setCopiedId(null);
    }
  }, [open]);

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return promptTemplates.filter((template) => {
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
  }, [category, search]);

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
                Selecione um template curado e copie para o chat
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
                      : "bg-muted/50 text-foreground hover:bg-muted",
                  )}
                >
                  Todos
                  <Badge
                    variant="secondary"
                    className="ml-1.5 h-5 min-w-5 rounded-full px-1.5 text-xs"
                  >
                    {promptTemplates.length}
                  </Badge>
                </TabsTrigger>
                {promptTemplateCategories.map((item) => {
                  const count = promptTemplates.filter(
                    (t) => t.category === item.id,
                  ).length;
                  return (
                    <TabsTrigger
                      key={item.id}
                      value={item.id}
                      className={cn(
                        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-all sm:text-sm",
                        category === item.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/50 text-foreground hover:bg-muted",
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
            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-6">
              {filteredTemplates.map((template) => {
                const isCopied = copiedId === template.id;
                const isExpanded = expandedId === template.id;
                return (
                  <Card
                    key={template.id}
                    className={cn(
                      "group relative flex h-full flex-col transition-all hover:shadow-md",
                      isCopied && "ring-2 ring-primary ring-offset-2",
                    )}
                  >
                    <CardHeader
                      className="pb-3 cursor-pointer select-none"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : template.id)
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <CardTitle className="line-clamp-2 text-base sm:text-lg">
                            {template.title}
                          </CardTitle>
                          <CardDescription className="line-clamp-2 text-xs sm:text-sm">
                            {template.description}
                          </CardDescription>
                        </div>
                        <Badge
                          variant="secondary"
                          className="shrink-0 whitespace-nowrap text-xs"
                        >
                          {categoryLabel[template.category]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-3">
                      <p
                        className={cn(
                          "text-xs text-muted-foreground sm:text-sm transition-all",
                          isExpanded
                            ? "whitespace-pre-line"
                            : "line-clamp-4 flex-1 sm:line-clamp-3",
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
                              Usar template
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
              <div className="text-muted-foreground flex min-h-[300px] flex-col items-center justify-center gap-3 p-8 text-center sm:min-h-[400px]">
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
