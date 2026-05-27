"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface CardTvSlideProps {
  dashboard: string;
  intervalSec: number;
  children: React.ReactNode;
  onComplete?: () => void;
  onCardChange?: (index: number, total: number) => void;
}

type CardTvRowKind = "single" | "row" | "kpi-row";

interface CardTvRow {
  kind: CardTvRowKind;
  ids: string[];
}

interface CardTvCompositeSlide {
  rows: CardTvRow[];
}

const CARDTV_SLIDES: Record<string, CardTvCompositeSlide[]> = {
  geral: [
    {
      rows: [
        { kind: "single", ids: ["geral-info-projeto"] },
        { kind: "kpi-row", ids: ["geral-previsto-real", "geral-saude-ocupacional", "geral-pontos-atencao"] },
      ],
    },
    {
      rows: [
        { kind: "row", ids: ["geral-evolucao-projeto", "geral-linha-tempo-contrato"] },
      ],
    },
    {
      rows: [
        { kind: "row", ids: ["geral-status-contratacao", "geral-lista-funcoes"] },
      ],
    },
    {
      rows: [
        { kind: "single", ids: ["geral-status-geral"] },
      ],
    },
  ],
  rh: [
    {
      rows: [
        { kind: "kpi-row", ids: ["rh-total-cadastrados", "rh-admitidos", "rh-funcoes-distintas"] },
        { kind: "row", ids: ["rh-faixa-etaria", "rh-genero"] },
      ],
    },
    {
      rows: [
        { kind: "row", ids: ["rh-aso", "rh-escolaridade", "rh-experiencia-funcao"] },
      ],
    },
  ],
  logistica: [
    {
      rows: [
        { kind: "kpi-row", ids: ["logistica-ocupacao-total", "logistica-total-hospedes", "logistica-vagas-disponiveis"] },
        { kind: "single", ids: ["logistica-turnos"] },
      ],
    },
    {
      rows: [
        { kind: "single", ids: ["logistica-ocupacao-hotel"] },
        { kind: "single", ids: ["logistica-detalhes-hotel"] },
      ],
    },
  ],
  seguranca: [
    {
      rows: [
        { kind: "kpi-row", ids: ["seguranca-total-fits", "seguranca-treinamentos-concluidos", "seguranca-aprovados-portal"] },
        { kind: "single", ids: ["seguranca-status-treinamento"] },
      ],
    },
    {
      rows: [
        { kind: "row", ids: ["seguranca-status-portal", "seguranca-distribuicao-rpv"] },
      ],
    },
  ],
};

export function CardTvSlide({
  dashboard,
  intervalSec,
  children,
  onComplete,
  onCardChange,
}: CardTvSlideProps) {
  const sourceRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const slidesRef = useRef<CardTvCompositeSlide[]>([]);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);
  const onCompleteRef = useRef(onComplete);
  const onCardChangeRef = useRef(onCardChange);

  onCompleteRef.current = onComplete;
  onCardChangeRef.current = onCardChange;

  const [cardCount, setCardCount] = useState(0);

  const findItem = useCallback((id: string) => {
    return sourceRef.current?.querySelector<HTMLElement>(`[data-cardtv-id="${id}"]`) ?? null;
  }, []);

  const buildAvailableSlides = useCallback(() => {
    const configuredSlides = CARDTV_SLIDES[dashboard] ?? [];
    return configuredSlides
      .map((slide) => ({
        rows: slide.rows
          .map((row) => ({
            ...row,
            ids: row.ids.filter((id) => findItem(id)),
          }))
          .filter((row) => row.ids.length > 0),
      }))
      .filter((slide) => slide.rows.length > 0);
  }, [dashboard, findItem]);

  const cloneItem = useCallback((id: string) => {
    const source = findItem(id);
    if (!source) return null;

    const clone = source.cloneNode(true) as HTMLElement;
    clone.setAttribute("data-cardtv-clone", "true");
    clone.removeAttribute("data-cardtv-item");
    clone.style.width = "100%";
    clone.style.maxWidth = "100%";
    clone.style.gridColumn = "";
    clone.style.flex = "";
    return clone;
  }, [findItem]);

  const showCard = useCallback((index: number) => {
    const stage = stageRef.current;
    const slide = slidesRef.current[index];
    if (!stage || !slide) return;

    stage.innerHTML = "";

    const slideEl = document.createElement("div");
    slideEl.setAttribute("data-cardtv-slide", "true");
    slideEl.setAttribute("data-cardtv-dashboard", dashboard);

    for (const row of slide.rows) {
      const rowEl = document.createElement("div");
      rowEl.setAttribute("data-cardtv-row", row.kind);

      for (const id of row.ids) {
        const clone = cloneItem(id);
        if (clone) rowEl.appendChild(clone);
      }

      if (rowEl.children.length > 0) slideEl.appendChild(rowEl);
    }

    stage.appendChild(slideEl);
    stage.scrollTop = 0;
  }, [cloneItem, dashboard]);

  // Poll until enough dashboard content has rendered to build the configured TV slides.
  useEffect(() => {
    const el = sourceRef.current;
    if (!el) return;

    let lastCount = 0;
    let stableTicks = 0;
    const pollId = setInterval(() => {
      const slides = buildAvailableSlides();
      if (slides.length > 0 && slides.length === lastCount) {
        stableTicks++;
      } else {
        stableTicks = 0;
        lastCount = slides.length;
      }

      if (slides.length > 0 && stableTicks >= 3) {
        clearInterval(pollId);
        slidesRef.current = slides;
        setCardCount(slides.length);
      }
    }, 500);

    return () => {
      clearInterval(pollId);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [buildAvailableSlides]);

  // Start card cycle once cards are discovered
  useEffect(() => {
    if (cardCount === 0) return;

    // Show first card
    indexRef.current = 0;
    showCard(0);
    onCardChangeRef.current?.(0, cardCount);

    // Timer to advance cards
    timerRef.current = setInterval(() => {
      indexRef.current++;
      if (indexRef.current >= slidesRef.current.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        onCompleteRef.current?.();
        return;
      }
      showCard(indexRef.current);
      onCardChangeRef.current?.(indexRef.current, slidesRef.current.length);
    }, intervalSec * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cardCount, intervalSec, showCard]);

  return (
    <div className="relative h-full w-full">
      {/* Hidden source: renders dashboard so data loads and charts initialize */}
      <div
        ref={sourceRef}
        className="absolute inset-0 overflow-hidden"
        style={{ opacity: 0, pointerEvents: "none" }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Visible stage: shows one configured composite slide at a time */}
      <div
        ref={stageRef}
        data-cardtv-stage
        className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden p-6"
      />

      {/* Loading state when no cards yet */}
      {cardCount === 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ff460a] border-t-transparent" />
            <p className="text-sm text-muted-foreground">Carregando dados...</p>
          </div>
        </div>
      )}
    </div>
  );
}
