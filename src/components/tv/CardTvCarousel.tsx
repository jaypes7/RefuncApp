"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { TvFilterProvider } from "./TvProvider";
import { TvHeader } from "./TvHeader";
import { TvFooter } from "./TvFooter";
import { CardTvSlide } from "./CardTvSlide";

const DashboardGeral = dynamic(() => import("@/app/dashboard/page"), { ssr: false });
const DashboardRH = dynamic(() => import("@/app/dashboard/rh/page"), { ssr: false });
const DashboardLogistica = dynamic(() => import("@/app/dashboard/logistica/page"), { ssr: false });
const DashboardSeguranca = dynamic(() => import("@/app/dashboard/seguranca/page"), { ssr: false });

const DASHBOARD_COMPONENTS: Record<string, React.ComponentType> = {
  geral: DashboardGeral,
  rh: DashboardRH,
  logistica: DashboardLogistica,
  seguranca: DashboardSeguranca,
};

const DEFAULT_DASHBOARDS = ["geral", "rh", "logistica", "seguranca"];
const DEFAULT_INTERVAL = 10;

interface PlaylistItem {
  projeto: string;
  dashboard: string;
}

interface CardTvCarouselProps {
  projetos: string[];
  dashboards?: string[];
  intervalSec?: number;
}

export function CardTvCarousel({
  projetos,
  dashboards = DEFAULT_DASHBOARDS,
  intervalSec = DEFAULT_INTERVAL,
}: CardTvCarouselProps) {
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
  const [lastUpdate, setLastUpdate] = useState<Date | null>(() => new Date());
  const [direction, setDirection] = useState(1);
  const [footerKey, setFooterKey] = useState(0);

  const advance = useCallback(() => {
    setDirection(1);
    setIndex((prev) => (prev + 1) % playlist.length);
    setLastUpdate(new Date());
    setFooterKey((k) => k + 1);
  }, [playlist.length]);

  const handleSlideComplete = useCallback(() => {
    advance();
  }, [advance]);

  const handleCardChange = useCallback(() => {
    setFooterKey((k) => k + 1);
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
            <CardTvSlide
              dashboard={current.dashboard}
              intervalSec={intervalSec}
              onComplete={handleSlideComplete}
              onCardChange={handleCardChange}
            >
              <TvFilterProvider centroCusto={current.projeto}>
                <Component />
              </TvFilterProvider>
            </CardTvSlide>
          </motion.div>
        </AnimatePresence>
      </div>

      <TvFooter key={footerKey} intervalSec={intervalSec} />
    </div>
  );
}
