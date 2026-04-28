"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { geoMercator, geoPath } from "d3-geo";

const geoUrl = "/geo/br-states.json";

interface BrazilMapProps {
  data: Array<{ uf: string; count: number }>;
}

interface GeoFeature {
  type: "Feature";
  properties: {
    id?: number;
    name?: string;
    sigla?: string;
    [key: string]: unknown;
  };
  geometry: {
    type: string;
    coordinates: unknown;
  };
}

interface GeoCollection {
  type: "FeatureCollection";
  features: GeoFeature[];
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
  const map = useMemo(() => new Map(data.map((d) => [d.uf.toUpperCase(), d.count])), [data]);
  const max = Math.max(...data.map((d) => d.count), 1);

  const [geographies, setGeographies] = useState<GeoFeature[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    text: "",
  });

  useEffect(() => {
    fetch(geoUrl)
      .then((res) => res.json())
      .then((geoData: GeoCollection) => {
        setGeographies(geoData.features || []);
      })
      .catch((err) => {
        console.error("Erro ao carregar GeoJSON:", err);
      });
  }, []);

  // Projeção e path generator — fitSize centraliza e maximiza o mapa no SVG
  const pathStrings = useMemo(() => {
    if (!geographies.length) return [];

    const projection = geoMercator().fitSize([800, 600], {
      type: "FeatureCollection",
      features: geographies,
    } as unknown as GeoJSON.FeatureCollection);

    const pathGenerator = geoPath(projection);

    return geographies.map((geo) => ({
      feature: geo,
      d: pathGenerator(geo as unknown as GeoJSON.Feature) ?? "",
    }));
  }, [geographies]);

  const handleMouseEnter = useCallback(
    (geo: GeoFeature, count: number) => {
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
      <svg viewBox="0 0 800 600" className="w-full flex-1 min-h-0">
        <g>
          {pathStrings.map(({ feature, d }, index) => {
            const sigla = String(
              feature.properties?.sigla ?? feature.properties?.SIGLA ?? ""
            ).toUpperCase();
            const count = map.get(sigla) ?? 0;
            return (
              <path
                key={String(feature.properties?.id ?? sigla ?? `geo-${index}`)}
                d={d}
                fill={getColor(count, max)}
                stroke="#fff"
                strokeWidth={0.6}
                className="outline-none hover:cursor-pointer"
                style={{ transition: "fill 150ms ease" }}
                onMouseEnter={() => handleMouseEnter(feature, count)}
                onMouseLeave={handleMouseLeave}
                onMouseOver={(e) => {
                  (e.currentTarget as SVGPathElement).style.fill = "#416e7d";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as SVGPathElement).style.fill = getColor(count, max);
                }}
              />
            );
          })}
        </g>
      </svg>

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
