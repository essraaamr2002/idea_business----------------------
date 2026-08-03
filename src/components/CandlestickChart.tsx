import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';

export function CandlestickChart({ candles, height = 360 }: { candles: any[]; height?: number }) {
  const option = useMemo(() => {
    const data = candles.map((c) => [c.ts, Number(c.open), Number(c.close), Number(c.low), Number(c.high)]);
    const vol = candles.map((c) => [c.ts, Number(c.volume), Number(c.close) >= Number(c.open) ? 1 : -1]);
    return {
      animation: false,
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      grid: [
        { left: 50, right: 20, top: 20, height: '60%' },
        { left: 50, right: 20, top: '78%', height: '15%' },
      ],
      xAxis: [
        { type: 'time', boundaryGap: false, axisLine: { onZero: false } },
        { type: 'time', gridIndex: 1, axisLabel: { show: false } },
      ],
      yAxis: [
        { scale: true, splitArea: { show: true } },
        { gridIndex: 1, splitNumber: 2, axisLabel: { show: false }, axisLine: { show: false }, splitLine: { show: false } },
      ],
      dataZoom: [
        { type: 'inside', xAxisIndex: [0, 1], start: 60, end: 100 },
        { type: 'slider', xAxisIndex: [0, 1], top: '95%', start: 60, end: 100, height: 18 },
      ],
      series: [
        {
          name: 'OHLC',
          type: 'candlestick',
          data: data.map((d) => [d[1], d[2], d[3], d[4]]),
          itemStyle: { color: '#10b981', color0: '#ef4444', borderColor: '#10b981', borderColor0: '#ef4444' },
        },
        {
          name: 'Volume',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: vol.map((v) => ({ value: v[1], itemStyle: { color: v[2] === 1 ? '#10b98180' : '#ef444480' } })),
        },
      ],
    };
  }, [candles]);

  return <ReactECharts option={option} style={{ height }} notMerge lazyUpdate />;
}
