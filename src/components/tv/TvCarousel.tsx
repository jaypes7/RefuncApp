"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { TvFilterProvider } from "./TvProvider";
import { TvHeader } from "./TvHeader";
import { TvFooter } from "./TvFooter";
import { TvSlide } from "./TvSlide";

const DashboardGeral = dynamic(() => import("@/app/dashboard/page"), { ssr: false });
const DashboardRH = dynamic(() => import("@/app/dashboard/rh/page"), { ssr: false });
const DashboardLogistica = dynamic(() => import("@/app/dashboard/logistica/page"), { ssr: false });
const DashboardSeguranca = dynamic(() => import("@/app/dashboard/seguranca/page"), { ssr: false });
const DashboardSuprimentos = dynamic(() => import("@/app/dashboard/suprimentos/page"), { ssr: false });

const DASHBOARD_COMPONENTS: Record<string, React.ComponentType> = {
  geral: DashboardGeral,
  rh: DashboardRH,
  logistica: DashboardLogistica,
  seguranca: DashboardSeguranca,
  suprimentos: DashboardSuprimentos,
};

const DEFAULT_DASHBOARDS = ["geral", "rh", "logistica", "seguranca", "suprimentos"];
const DEFAULT_INTERVAL = 30;

interface PlaylistItem {
  projeto: string;
  dashboard: string;
}

interface TvCarouselProps {
  projetos: string[];
  dashboards?: string[];
  intervalSec?: number;
}

export function TvCarousel({
  projetos,
  dashboards = DEFAULT_DASHBOARDS,
  intervalSec = DEFAULT_INTERVAL,
}: TvCarouselProps) {
  const playlist = useMemo<PlaylistItem[]>(
    () =>
      projetos.flatMap((projeto) =>
        dashboards
          .filter((d) => d in DASHBOARD_COMPONENTS)
          .map((dashboard) => ({ projeto, dashboard })),
      ),
    [projetos, dashboards],
  );

  const [index, setIndex] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);
  const [footerKey, setFooterKey] = useState(0);

  const advance = useCallback(() => {
    setDirection(1);
    setIndex((prev) => (prev + 1) % playlist.length);
    setLastUpdate(new Date());
    setFooterKey((k) => k + 1);
  }, [playlist.length]);

  useEffect(() => {
    if (playlist.length <= 1) return;
    timerRef.current = setInterval(advance, intervalSec * 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [advance, intervalSec, playlist.length]);

  useEffect(() => {
    setLastUpdate(new Date());
  }, []);

  if (playlist.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        <p>Nenhum projeto configurado.</p>
      </div>
    );
  }

  const current = playlist[index];
  const currentSlideKey = `${current.projeto}-${current.dashboard}`;
  const Component = DASHBOARD_COMPONENTS[current.dashboard];

  return (
    <div className="flex h-screen w-screen flex-col bg-background overflow-hidden select-none">
      <TvHeader
        centroCusto={current.projeto}
        dashboard={current.dashboard}
        slideIndex={index}
        totalSlides={playlist.length}
        lastUpdate={lastUpdate}
      />

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentSlideKey}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <TvSlide intervalSec={intervalSec}>
              <TvFilterProvider centroCusto={current.projeto}>
                <Component />
              </TvFilterProvider>
            </TvSlide>
          </motion.div>
        </AnimatePresence>
      </div>

      <TvFooter key={footerKey} intervalSec={intervalSec} />
    </div>
  );
}
