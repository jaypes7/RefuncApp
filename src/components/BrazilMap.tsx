"use client";

import { useState, useCallback } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";

const geoUrl = "/geo/br-states.json";

interface BrazilMapProps {
  data: Array<{ uf: string; count: number }>;
}

// Escala de cor por threshold
function getColor(count: number, max: number): string {
  if (count === 0) return "#e2e2e2";
  if (max <= 5) return count >= 1 ? "#ff460a" : "#e2e2e2";
  const ratio = count / max;
  if (ratio <= 0.2) return "#ffa78b";
  if (ratio <= 0.5) return "#ff460a";
  if (ratio <= 0.8) return "#9c3022";
  return "#19365b";
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  text: string;
}

export function BrazilMap({ data }: BrazilMapProps) {
  const map = new Map(data.map((d) => [d.uf.toUpperCase(), d.count]));
  const max = Math.max(...data.map((d) => d.count), 1);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    text: "",
  });

  const handleMouseEnter = useCallback(
    (geo: { properties?: Record<string, unknown> }, count: number) => {
      const nome = String(
        geo.properties?.name ?? geo.properties?.nome ?? geo.properties?.NOME ?? geo.properties?.sigla ?? ""
      );
      setTooltip((prev) => ({
        ...prev,
        visible: true,
        text: `${nome}: ${count} colaborador${count !== 1 ? "es" : ""}`,
      }));
    },
    []
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltip((prev) => ({
      ...prev,
      x: e.clientX + 12,
      y: e.clientY - 24,
    }));
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <div className="w-full relative flex flex-col h-full" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 650, center: [-55, -15] }}
        className="w-full flex-1 min-h-0"
      >
        <ZoomableGroup>
          <Geographies geography={geoUrl}>
            {({ geographies }: { geographies: Array<{ rsmKey: string; properties?: Record<string, unknown> }> }) =>
              geographies.map((geo) => {
                const sigla = String(
                  geo.properties?.sigla ?? geo.properties?.SIGLA ?? ""
                ).toUpperCase();
                const count = map.get(sigla) ?? 0;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo as unknown as Parameters<typeof Geography>[0]["geography"]}
                    fill={getColor(count, max)}
                    stroke="#fff"
                    strokeWidth={0.6}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: "#416e7d", cursor: "pointer" },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={() => handleMouseEnter(geo, count)}
                    onMouseLeave={handleMouseLeave}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip custom */}
      {tooltip.visible && (
        <div
          className="fixed z-50 pointer-events-none rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="font-semibold text-foreground">{tooltip.text}</p>
        </div>
      )}

      {/* Legenda de escala */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="h-4 w-4 rounded-sm" style={{ background: "#e2e2e2" }} />
          0
        </div>
        <div className="flex items-center gap-1">
          <span className="h-4 w-4 rounded-sm" style={{ background: "#ffa78b" }} />
          1–{Math.max(1, Math.ceil(max * 0.2))}
        </div>
        <div className="flex items-center gap-1">
          <span className="h-4 w-4 rounded-sm" style={{ background: "#ff460a" }} />
          {Math.max(2, Math.ceil(max * 0.2) + 1)}–{Math.ceil(max * 0.5)}
        </div>
        <div className="flex items-center gap-1">
          <span className="h-4 w-4 rounded-sm" style={{ background: "#9c3022" }} />
          {Math.ceil(max * 0.5) + 1}–{Math.ceil(max * 0.8)}
        </div>
        <div className="flex items-center gap-1">
          <span className="h-4 w-4 rounded-sm" style={{ background: "#19365b" }} />
          {Math.ceil(max * 0.8) + 1}+
        </div>
      </div>
    </div>
  );
}
