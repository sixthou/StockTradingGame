import { MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlestickSeries,
  createChart,
  HistogramData,
  HistogramSeries,
  IChartApi,
  ISeriesApi,
  LineData,
  LineSeries,
  LogicalRange,
  Time,
} from 'lightweight-charts';
import { theme } from '../styles/theme';
import { useGameStore } from '../state/gameStore';
import { buildCombinedData } from '../engine/chartData';
import { calcMA, calcMACD, calcRSI } from '../engine/indicators';

const MA_CONFIG = [
  { period: 5, color: '#f0f6fc' },
  { period: 10, color: '#7ee787' },
  { period: 20, color: '#79c0ff' },
  { period: 50, color: '#1f6feb' },
  { period: 100, color: '#f78166' },
  { period: 200, color: '#d2a8ff' },
] as const;

const PANEL_RATIOS_KEY = 'stock-trading-game-chart-ratios';
const DEFAULT_RATIOS = { main: 0.6, rsi: 0.2, macd: 0.2 };
const SPLITTER_SIZE = 8;
const MIN_PANEL_HEIGHT = 80;

function createManagedChart(
  container: HTMLDivElement,
  height: number,
  interactive: boolean,
): { chart: IChartApi; cleanup: () => void } {
  const chart = createChart(container, {
    width: Math.max(container.clientWidth, 300),
    height: Math.max(height, MIN_PANEL_HEIGHT),
    autoSize: false,
    layout: {
      background: { color: theme.bg.panel },
      textColor: theme.text.muted,
    },
    grid: {
      vertLines: { color: theme.border },
      horzLines: { color: theme.border },
    },
    handleScroll: interactive,
    handleScale: interactive,
    timeScale: { timeVisible: false, secondsVisible: false },
  });

  const observer = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(() => {
        chart.applyOptions({
          width: Math.max(container.clientWidth, 300),
          height: Math.max(container.clientHeight, MIN_PANEL_HEIGHT),
        });
      })
    : null;

  observer?.observe(container);

  return {
    chart,
    cleanup: () => {
      observer?.disconnect();
      chart.remove();
    },
  };
}

export function ChartPanel() {
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);

  const mainChartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);

  const candleSeriesRef = useRef<ISeriesApi<'Candlestick', Time> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram', Time> | null>(null);
  const maSeriesRef = useRef<ISeriesApi<'Line', Time>[]>([]);
  const rsiSeriesRef = useRef<ISeriesApi<'Line', Time> | null>(null);
  const rsiUpperRef = useRef<ISeriesApi<'Line', Time> | null>(null);
  const rsiLowerRef = useRef<ISeriesApi<'Line', Time> | null>(null);
  const macdSeriesRef = useRef<ISeriesApi<'Line', Time> | null>(null);
  const signalSeriesRef = useRef<ISeriesApi<'Line', Time> | null>(null);
  const histogramSeriesRef = useRef<ISeriesApi<'Histogram', Time> | null>(null);
  const macdAnchorSeriesRef = useRef<ISeriesApi<'Line', Time> | null>(null);

  const dragStateRef = useRef<{
    split: 'main-rsi' | 'main-macd' | 'rsi-macd';
    startY: number;
    startPixels: { main: number; rsi: number; macd: number };
  } | null>(null);

  const indicators = useGameStore((s) => s.indicators);
  const toggleIndicator = useGameStore((s) => s.toggleIndicator);
  const preGameCandles = useGameStore((s) => s.preGameCandles);
  const dailyCandles = useGameStore((s) => s.dailyCandles);
  const dayIndex = useGameStore((s) => s.dayIndex);

  const [panelRatios, setPanelRatios] = useState(() => {
    try {
      const saved = localStorage.getItem(PANEL_RATIOS_KEY);
      if (!saved) return DEFAULT_RATIOS;
      return { ...DEFAULT_RATIOS, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_RATIOS;
    }
  });
  const [areaHeight, setAreaHeight] = useState(520);

  useEffect(() => {
    try {
      localStorage.setItem(PANEL_RATIOS_KEY, JSON.stringify(panelRatios));
    } catch {
      // ignore localStorage failures
    }
  }, [panelRatios]);

  useEffect(() => {
    if (!chartAreaRef.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 0;
      if (height > 0) setAreaHeight(height);
    });
    observer.observe(chartAreaRef.current);
    return () => observer.disconnect();
  }, []);

  const visible = { rsi: indicators.rsi, macd: indicators.macd };
  const splitterCount = (visible.rsi ? 1 : 0) + (visible.macd ? 1 : 0);
  const usableHeight = Math.max(200, areaHeight - splitterCount * SPLITTER_SIZE - splitterCount * 6);

  const normalizedRatios = useMemo(() => {
    if (!visible.rsi && !visible.macd) return { main: 1, rsi: 0, macd: 0 };
    if (visible.rsi && !visible.macd) {
      const total = panelRatios.main + panelRatios.rsi;
      return { main: panelRatios.main / total, rsi: panelRatios.rsi / total, macd: 0 };
    }
    if (!visible.rsi && visible.macd) {
      const total = panelRatios.main + panelRatios.macd;
      return { main: panelRatios.main / total, rsi: 0, macd: panelRatios.macd / total };
    }
    const total = panelRatios.main + panelRatios.rsi + panelRatios.macd;
    return { main: panelRatios.main / total, rsi: panelRatios.rsi / total, macd: panelRatios.macd / total };
  }, [panelRatios, visible.macd, visible.rsi]);

  const panelPixels = useMemo(() => {
    const main = Math.max(MIN_PANEL_HEIGHT, Math.round(usableHeight * normalizedRatios.main));
    const rsi = visible.rsi ? Math.max(MIN_PANEL_HEIGHT, Math.round(usableHeight * normalizedRatios.rsi)) : 0;

    if (!visible.rsi && !visible.macd) return { main: usableHeight, rsi: 0, macd: 0 };
    if (visible.rsi && !visible.macd) return { main, rsi: Math.max(MIN_PANEL_HEIGHT, usableHeight - main), macd: 0 };
    if (!visible.rsi && visible.macd) return { main, rsi: 0, macd: Math.max(MIN_PANEL_HEIGHT, usableHeight - main) };

    const remainder = usableHeight - main - rsi;
    return { main, rsi, macd: Math.max(MIN_PANEL_HEIGHT, remainder) };
  }, [normalizedRatios, usableHeight, visible.macd, visible.rsi]);

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const delta = event.clientY - drag.startY;

      let nextPixels = { ...drag.startPixels };
      if (drag.split === 'main-rsi') {
        const combined = drag.startPixels.main + drag.startPixels.rsi;
        nextPixels.main = Math.max(MIN_PANEL_HEIGHT, Math.min(combined - MIN_PANEL_HEIGHT, drag.startPixels.main + delta));
        nextPixels.rsi = combined - nextPixels.main;
      } else if (drag.split === 'main-macd') {
        const combined = drag.startPixels.main + drag.startPixels.macd;
        nextPixels.main = Math.max(MIN_PANEL_HEIGHT, Math.min(combined - MIN_PANEL_HEIGHT, drag.startPixels.main + delta));
        nextPixels.macd = combined - nextPixels.main;
      } else {
        const combined = drag.startPixels.rsi + drag.startPixels.macd;
        nextPixels.rsi = Math.max(MIN_PANEL_HEIGHT, Math.min(combined - MIN_PANEL_HEIGHT, drag.startPixels.rsi + delta));
        nextPixels.macd = combined - nextPixels.rsi;
      }

      const total = nextPixels.main + nextPixels.rsi + nextPixels.macd;
      setPanelRatios({
        main: nextPixels.main / total,
        rsi: nextPixels.rsi / total,
        macd: nextPixels.macd / total,
      });
    };

    const handleUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  const startResize = (split: 'main-rsi' | 'main-macd' | 'rsi-macd') => (event: ReactMouseEvent<HTMLDivElement>) => {
    dragStateRef.current = {
      split,
      startY: event.clientY,
      startPixels: panelPixels,
    };
  };

  useEffect(() => {
    if (!mainContainerRef.current) return;
    const { chart, cleanup } = createManagedChart(mainContainerRef.current, panelPixels.main, true);
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: theme.up,
      downColor: theme.down,
      borderUpColor: theme.up,
      borderDownColor: theme.down,
      wickUpColor: theme.up,
      wickDownColor: theme.down,
    });
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    mainChartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    return () => {
      mainChartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      maSeriesRef.current = [];
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (!indicators.rsi || !rsiContainerRef.current) return;
    const { chart, cleanup } = createManagedChart(rsiContainerRef.current, panelPixels.rsi, false);
    const rsiSeries = chart.addSeries(LineSeries, {
      color: '#f78166',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const upper = chart.addSeries(LineSeries, {
      color: '#8b949e',
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const lower = chart.addSeries(LineSeries, {
      color: '#8b949e',
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    chart.priceScale('right').applyOptions({ autoScale: false, scaleMargins: { top: 0.1, bottom: 0.1 } });
    const range = mainChartRef.current?.timeScale().getVisibleLogicalRange();
    if (range) chart.timeScale().setVisibleLogicalRange(range);
    rsiChartRef.current = chart;
    rsiSeriesRef.current = rsiSeries;
    rsiUpperRef.current = upper;
    rsiLowerRef.current = lower;
    return () => {
      rsiChartRef.current = null;
      rsiSeriesRef.current = null;
      rsiUpperRef.current = null;
      rsiLowerRef.current = null;
      cleanup();
    };
  }, [indicators.rsi]);

  useEffect(() => {
    if (!indicators.macd || !macdContainerRef.current) return;
    const { chart, cleanup } = createManagedChart(macdContainerRef.current, panelPixels.macd, false);
    const histogram = chart.addSeries(HistogramSeries, {
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const macdSeries = chart.addSeries(LineSeries, {
      color: '#79c0ff',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const signalSeries = chart.addSeries(LineSeries, {
      color: '#f78166',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const anchorSeries = chart.addSeries(LineSeries, {
      color: 'rgba(0,0,0,0)',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const range = mainChartRef.current?.timeScale().getVisibleLogicalRange();
    if (range) chart.timeScale().setVisibleLogicalRange(range);
    macdChartRef.current = chart;
    histogramSeriesRef.current = histogram;
    macdSeriesRef.current = macdSeries;
    signalSeriesRef.current = signalSeries;
    macdAnchorSeriesRef.current = anchorSeries;
    return () => {
      macdChartRef.current = null;
      histogramSeriesRef.current = null;
      macdSeriesRef.current = null;
      signalSeriesRef.current = null;
      macdAnchorSeriesRef.current = null;
      cleanup();
    };
  }, [indicators.macd]);

  useEffect(() => {
    mainChartRef.current?.applyOptions({ height: Math.max(panelPixels.main, MIN_PANEL_HEIGHT) });
    rsiChartRef.current?.applyOptions({ height: Math.max(panelPixels.rsi, MIN_PANEL_HEIGHT) });
    macdChartRef.current?.applyOptions({ height: Math.max(panelPixels.macd, MIN_PANEL_HEIGHT) });
  }, [panelPixels.macd, panelPixels.main, panelPixels.rsi]);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    const { candles: candleData, volumes: volumeData } = buildCombinedData(preGameCandles, dailyCandles, dayIndex);
    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    maSeriesRef.current.forEach((series) => {
      try { mainChartRef.current?.removeSeries(series); } catch {}
    });
    maSeriesRef.current = [];

    if (indicators.ma && mainChartRef.current) {
      const closes = candleData.map((candle) => candle.close);
      MA_CONFIG.forEach(({ period, color }) => {
        const values = calcMA(closes, period);
        const lineData: LineData[] = [];
        candleData.forEach((candle, index) => {
          if (values[index] !== null) {
            lineData.push({ time: candle.time as Time, value: values[index] as number });
          }
        });
        if (lineData.length > 0) {
          const series = mainChartRef.current!.addSeries(LineSeries, {
            color,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          series.setData(lineData);
          maSeriesRef.current.push(series);
        }
      });
    }

    if (rsiSeriesRef.current && rsiUpperRef.current && rsiLowerRef.current) {
      const values = calcRSI(candleData.map((candle) => candle.close), 14);
      const rsiData: LineData[] = [];
      const upperData: LineData[] = [];
      const lowerData: LineData[] = [];
      candleData.forEach((candle, index) => {
        if (values[index] !== null) {
          rsiData.push({ time: candle.time as Time, value: values[index] as number });
        }
        upperData.push({ time: candle.time as Time, value: 70 });
        lowerData.push({ time: candle.time as Time, value: 30 });
      });
      rsiSeriesRef.current.setData(rsiData);
      rsiUpperRef.current.setData(upperData);
      rsiLowerRef.current.setData(lowerData);
    }

    if (macdSeriesRef.current && signalSeriesRef.current && histogramSeriesRef.current && macdAnchorSeriesRef.current) {
      const macd = calcMACD(candleData.map((candle) => candle.close));
      const macdData: LineData[] = [];
      const signalData: LineData[] = [];
      const histogramData: HistogramData<Time>[] = [];
      const anchorData: LineData[] = [];
      candleData.forEach((candle, index) => {
        anchorData.push({ time: candle.time as Time, value: 0 });
        if (macd.macd[index] !== null) {
          macdData.push({ time: candle.time as Time, value: macd.macd[index] as number });
        }
        if (macd.signal[index] !== null) {
          signalData.push({ time: candle.time as Time, value: macd.signal[index] as number });
        }
        if (macd.histogram[index] !== null) {
          histogramData.push({
            time: candle.time as Time,
            value: macd.histogram[index] as number,
            color: (macd.histogram[index] as number) >= 0 ? 'rgba(63,185,80,0.5)' : 'rgba(248,81,73,0.5)',
          });
        }
      });
      macdAnchorSeriesRef.current.setData(anchorData);
      macdSeriesRef.current.setData(macdData);
      signalSeriesRef.current.setData(signalData);
      histogramSeriesRef.current.setData(histogramData);
    }
  }, [preGameCandles, dailyCandles, dayIndex, indicators.ma, indicators.rsi, indicators.macd]);

  useEffect(() => {
    if (!mainChartRef.current) return;
    const timeScale = mainChartRef.current.timeScale();
    const syncRange = (range: LogicalRange | null) => {
      if (!range) return;
      rsiChartRef.current?.timeScale().setVisibleLogicalRange(range);
      macdChartRef.current?.timeScale().setVisibleLogicalRange(range);
    };
    timeScale.subscribeVisibleLogicalRangeChange(syncRange);
    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange(syncRange);
    };
  }, [indicators.rsi, indicators.macd]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, height: '100%', minHeight: 0 }}>
      <div
        style={{
          background: theme.bg.panel,
          padding: 10,
          borderRadius: theme.radius,
          border: `1px solid ${theme.border}`,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: theme.text.muted }}>Daily</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['ma', 'rsi', 'macd'] as const).map((indicator) => (
              <button
                key={indicator}
                onClick={() => toggleIndicator(indicator)}
                style={{
                  color: indicators[indicator] ? theme.accent : theme.text.muted,
                  border: indicators[indicator] ? `1px solid ${theme.accent}` : 'none',
                  background: 'transparent',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {indicator}
              </button>
            ))}
          </div>
        </div>

        {indicators.ma && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
            {MA_CONFIG.map(({ period, color }) => (
              <div key={period} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: theme.text.muted }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: color, display: 'inline-block' }} />
                <span>MA {period}</span>
              </div>
            ))}
          </div>
        )}

        <div ref={chartAreaRef} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 6, overflow: 'hidden' }}>
          <div style={{ height: panelPixels.main, minHeight: 0 }}>
            <div ref={mainContainerRef} style={{ width: '100%', height: '100%' }} />
          </div>

          {indicators.rsi && (
            <div
              onMouseDown={startResize(indicators.macd ? 'main-rsi' : 'main-rsi')}
              style={{ height: SPLITTER_SIZE, cursor: 'row-resize', background: theme.bg.primary, borderRadius: 999, border: `1px solid ${theme.border}`, flexShrink: 0 }}
            />
          )}

          {indicators.rsi && (
            <div style={{ height: panelPixels.rsi, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ fontSize: 10, color: theme.text.muted, marginBottom: 4 }}>RSI 14</div>
              <div ref={rsiContainerRef} style={{ width: '100%', flex: 1, minHeight: 0 }} />
            </div>
          )}

          {indicators.rsi && indicators.macd && (
            <div
              onMouseDown={startResize('rsi-macd')}
              style={{ height: SPLITTER_SIZE, cursor: 'row-resize', background: theme.bg.primary, borderRadius: 999, border: `1px solid ${theme.border}`, flexShrink: 0 }}
            />
          )}

          {indicators.macd && !indicators.rsi && (
            <div
              onMouseDown={startResize('main-macd')}
              style={{ height: SPLITTER_SIZE, cursor: 'row-resize', background: theme.bg.primary, borderRadius: 999, border: `1px solid ${theme.border}`, flexShrink: 0 }}
            />
          )}

          {indicators.macd && (
            <div style={{ height: panelPixels.macd, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ fontSize: 10, color: theme.text.muted, marginBottom: 4 }}>MACD 12, 26, 9</div>
              <div ref={macdContainerRef} style={{ width: '100%', flex: 1, minHeight: 0 }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
