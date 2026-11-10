// Star history line chart for a repo page. Data comes from the data-chart attribute.
(() => {
  const el = document.querySelector('[data-chart]');
  if (!el || !window.Chart) return;
  const points = JSON.parse(el.dataset.chart);
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const day = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  let chart;

  // Redrawn on a light/dark switch, because the colours come from the page's CSS variables.
  const draw = () => {
    if (chart) chart.destroy();
    const font = { family: css('--font') };
    const ticks = { color: css('--ink-soft'), font };
    chart = new window.Chart(el.querySelector('canvas'), {
      type: 'line',
      data: {
        labels: points.map((p) => p.d),
        datasets: [{ data: points.map((p) => p.s), borderColor: css('--bar'), borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, pointHoverBackgroundColor: css('--mark') }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false, // the tide bars are the page's one animation
        plugins: { legend: { display: false }, tooltip: { callbacks: { title: (items) => day(items[0].label) } } },
        scales: {
          // Ticks and horizontal rules only, like the tide table's own scale.
          x: { grid: { display: false }, border: { color: css('--ink-soft') }, ticks: { ...ticks, maxRotation: 0, maxTicksLimit: innerWidth < 600 ? 4 : 6, callback(v) { return day(this.getLabelForValue(v)); } } },
          y: { grid: { color: css('--rule') }, border: { display: false }, ticks: { ...ticks, callback: (v) => v.toLocaleString('en-US') } },
        },
      },
    });
  };

  draw();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);
})();
