"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Image from "next/image";
import { Loader2, X, ImagePlus, Pencil } from "lucide-react";
import {
  registrosFotograficosApi,
  type RegistroFotografico,
} from "@/lib/axios";

const Schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(255),
  descricao: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof Schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centroCusto: string | null;
  registro?: RegistroFotografico | null;
}

export function RegistroFotograficoModal({
  open,
  onOpenChange,
  centroCusto,
  registro,
}: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!registro;

  // Estados separados para evitar problemas de sincronização com props
  const [urlsToRemove, setUrlsToRemove] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      nome: registro?.nome ?? "",
      descricao: registro?.descricao ?? "",
    },
  });

  // Sempre que o modal abre, limpa estados de edição
  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!v) {
        // Fechando: limpa tudo
        setUrlsToRemove([]);
        setFiles([]);
        setPreviews([]);
        reset({ nome: "", descricao: "" });
      }
      onOpenChange(v);
    },
    [onOpenChange, reset],
  );

  const existingUrls = registro?.urls || [];

  const handleFilesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || []);
      if (selected.length === 0) return;

      const images = selected.filter((f) => f.type.startsWith("image/"));
      if (images.length !== selected.length) {
        toast.warning("Apenas arquivos de imagem são permitidos");
      }

      setFiles((prev) => [...prev, ...images]);

      images.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    },
    [],
  );

  const removeNewFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const toggleRemoveExisting = useCallback((url: string) => {
    setUrlsToRemove((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
    );
  }, []);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!centroCusto) {
        throw new Error("Selecione um centro de custo");
      }

      const formData = new FormData();
      formData.append("nome", values.nome);
      if (values.descricao) formData.append("descricao", values.descricao);

      if (isEdit && registro) {
        // Modo edição: envia URLs a remover e novas fotos
        if (urlsToRemove.length > 0) {
          formData.append("urls_removidas", JSON.stringify(urlsToRemove));
        }
        files.forEach((file) => formData.append("fotos", file));

        await registrosFotograficosApi.atualizarComFotos(registro.id, formData);
      } else {
        // Modo criação
        if (files.length === 0) {
          throw new Error("Selecione pelo menos uma foto");
        }
        formData.append("centro_custo", centroCusto);
        files.forEach((file) => formData.append("fotos", file));

        await registrosFotograficosApi.criar(formData);
      }
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? "Registro fotográfico atualizado com sucesso!"
          : "Registro fotográfico criado com sucesso!",
      );
      queryClient.invalidateQueries({ queryKey: ["registros-fotograficos"], type: "all" });
      setUrlsToRemove([]);
      setFiles([]);
      setPreviews([]);
      reset({ nome: "", descricao: "" });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const e = error as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      toast.error(
        e.response?.data?.error || e.message || "Erro ao salvar registro",
      );
    },
  });

  const fotosRestantes = existingUrls.filter(
    (url) => !urlsToRemove.includes(url),
  );
  const totalFotosAposSalvar = fotosRestantes.length + files.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Registro Fotográfico" : "Novo Registro Fotográfico"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Altere os dados, remova fotos existentes ou adicione novas."
              : `Adicione fotos vinculadas ao centro de custo ${centroCusto ?? "—"}.`}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
          className="space-y-5 pt-2"
        >
          {/* Nome */}
          <div className="space-y-1">
            <label htmlFor="rf-nome" className="text-sm font-medium">
              Nome do conjunto <span className="text-destructive">*</span>
            </label>
            <Input
              id="rf-nome"
              {...register("nome")}
              placeholder="Ex: Inspeção de segurança - Módulo A"
            />
            {errors.nome && (
              <p className="text-xs text-destructive">{errors.nome.message}</p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <label htmlFor="rf-descricao" className="text-sm font-medium">
              Descrição
            </label>
            <Textarea
              id="rf-descricao"
              {...register("descricao")}
              placeholder="Descreva o conteúdo das fotos (opcional)"
              rows={3}
            />
            {errors.descricao && (
              <p className="text-xs text-destructive">
                {errors.descricao.message}
              </p>
            )}
          </div>

          {/* Fotos existentes (modo edição) */}
          {isEdit && existingUrls.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Fotos existentes</label>
              <p className="text-xs text-muted-foreground">
                Clique no X para marcar fotos que serão removidas ao salvar.
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {existingUrls.map((url, idx) => {
                  const marcada = urlsToRemove.includes(url);
                  return (
                    <div
                      key={idx}
                      className={`relative group aspect-square rounded-md overflow-hidden border ${
                        marcada ? "opacity-40 grayscale" : ""
                      }`}
                    >
                      <Image
                        src={url}
                        alt={`Foto ${idx + 1}`}
                        fill
                        sizes="(max-width: 640px) 33vw, 25vw"
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => toggleRemoveExisting(url)}
                        className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title={marcada ? "Desfazer remoção" : "Remover foto"}
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {marcada && (
                        <div className="absolute inset-0 flex items-center justify-center z-0">
                          <span className="bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded">
                            REMOVER
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upload de novas fotos */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {isEdit ? "Adicionar novas fotos" : "Fotos"}{" "}
              {!isEdit && <span className="text-destructive">*</span>}
            </label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
              <label
                htmlFor="rf-fotos"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <ImagePlus className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Clique para selecionar ou arraste imagens aqui
                </span>
                <span className="text-xs text-muted-foreground">
                  JPG, PNG, WEBP — máx. 10MB por arquivo
                </span>
              </label>
              <Input
                id="rf-fotos"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFilesChange}
              />
            </div>
          </div>

          {/* Previews das novas fotos */}
          {previews.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Novas fotos</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {previews.map((src, idx) => (
                  <div
                    key={idx}
                    className="relative group aspect-square rounded-md overflow-hidden border"
                  >
                    <Image
                      src={src}
                      alt={`Nova foto ${idx + 1}`}
                      fill
                      sizes="(max-width: 640px) 33vw, 25vw"
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewFile(idx)}
                      className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info de fotos restantes */}
          {isEdit && (
            <p className="text-xs text-muted-foreground">
              Após salvar: {totalFotosAposSalvar} foto
              {totalFotosAposSalvar !== 1 ? "s" : ""} no conjunto
              {urlsToRemove.length > 0 && ` (${urlsToRemove.length} removida${urlsToRemove.length !== 1 ? "s" : ""})`}
              {files.length > 0 && ` (${files.length} nova${files.length !== 1 ? "s" : ""})`}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                mutation.isPending ||
                (!isEdit && files.length === 0) ||
                (isEdit && totalFotosAposSalvar === 0)
              }
            >
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEdit ? (
                <>
                  <Pencil className="mr-2 h-4 w-4" />
                  Salvar alterações
                </>
              ) : (
                "Salvar registro"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
