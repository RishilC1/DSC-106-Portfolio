const status = document.querySelector('#meta-status');
const tooltip = document.querySelector('#commit-tooltip');
const number = new Intl.NumberFormat();
const formatDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' });
const formatTime = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });
const languageNames = { html: 'HTML', css: 'CSS', js: 'JavaScript' };
const repo = 'https://github.com/RishilC1/DSC-106-Portfolio';
let hideTimer;

function processCommits(d3, data) {
  return d3.groups(data, (line) => line.commit).map(([id, lines]) => {
    const { author, datetime } = lines[0];
    const commit = {
      id,
      url: `${repo}/commit/${id}`,
      author,
      datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60 + datetime.getSeconds() / 3600,
      totalLines: lines.length,
    };
    Object.defineProperty(commit, 'lines', { value: lines });
    return commit;
  });
}

function renderStats(d3, data, commits) {
  const fileLengths = d3.rollup(data, (lines) => lines.length, (line) => line.file);
  const stats = [
    ['Lines in snapshot', number.format(data.length)],
    ['Commits represented', number.format(commits.length)],
    ['Files analyzed', number.format(fileLengths.size)],
    ['Longest file', `${number.format(d3.max(fileLengths.values()))} lines`],
    ['Average file length', `${d3.mean(fileLengths.values()).toFixed(1)} lines`],
    ['Max indentation', `${number.format(d3.max(data, (line) => line.depth))} levels`],
  ];

  const items = d3.select('#stats').append('dl').attr('class', 'meta-stats')
    .selectAll('div').data(stats).join('div');
  items.append('dt').text(([label]) => label);
  items.append('dd').text(([, value]) => value);
}

function showTooltip(commit, x, y) {
  clearTimeout(hideTimer);
  const link = document.querySelector('#commit-link');
  link.href = commit.url;
  link.textContent = commit.id.slice(0, 8);
  document.querySelector('#commit-date').textContent = formatDate.format(commit.datetime);
  document.querySelector('#commit-time').textContent = formatTime.format(commit.datetime);
  document.querySelector('#commit-author').textContent = commit.author;
  document.querySelector('#commit-lines').textContent = number.format(commit.totalLines);
  tooltip.hidden = false;

  const gap = 12;
  const left = x + gap + tooltip.offsetWidth > window.innerWidth ? x - gap - tooltip.offsetWidth : x + gap;
  const top = y + gap + tooltip.offsetHeight > window.innerHeight ? y - gap - tooltip.offsetHeight : y + gap;
  tooltip.style.left = `${Math.max(gap, Math.min(left, window.innerWidth - tooltip.offsetWidth - gap))}px`;
  tooltip.style.top = `${Math.max(gap, Math.min(top, window.innerHeight - tooltip.offsetHeight - gap))}px`;
}

function hideTooltipSoon() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    if (!tooltip.matches(':focus-within')) tooltip.hidden = true;
  }, 180);
}

tooltip.addEventListener('pointerenter', () => clearTimeout(hideTimer));
tooltip.addEventListener('pointerleave', hideTooltipSoon);
tooltip.addEventListener('focusout', hideTooltipSoon);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') tooltip.hidden = true;
});

function renderLanguageBreakdown(d3, commits) {
  const lines = commits.flatMap((commit) => commit.lines);
  const counts = d3.rollups(lines, (group) => group.length, (line) => line.type)
    .sort((a, b) => b[1] - a[1]);
  const percent = d3.format('.1~%');
  document.querySelector('#selection-details').hidden = lines.length === 0;

  const items = d3.select('#language-breakdown').selectAll('div').data(counts, ([type]) => type)
    .join((enter) => {
      const item = enter.append('div');
      item.append('dt');
      item.append('dd');
      return item;
    });
  items.select('dt').text(([type]) => languageNames[type] ?? type);
  items.select('dd').text(([, count]) => `${number.format(count)} lines (${percent(count / lines.length)})`);
}

function renderScatterPlot(d3, commits) {
  const width = 920;
  const height = 365;
  const margin = { top: 24, right: 26, bottom: 54, left: 76 };
  const right = width - margin.right;
  const bottom = height - margin.bottom;
  const [first, last] = d3.extent(commits, (commit) => commit.datetime);
  // A single commit still needs a nonzero date range.
  const dates = +first === +last
    ? [d3.timeDay.floor(first), d3.timeDay.offset(d3.timeDay.floor(first), 1)]
    : [first, last];
  const x = d3.scaleTime().domain(dates).range([margin.left, right]).nice();
  const y = d3.scaleLinear().domain([0, 24]).range([bottom, margin.top]);
  const radius = d3.scaleSqrt()
    .domain([0, d3.max(commits, (commit) => commit.totalLines)])
    .range([0, 21]);
  const hours = d3.range(0, 25, 4);
  const hourLabel = (hour) => `${String(hour).padStart(2, '0')}:00`;

  const svg = d3.select('#chart').append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'group')
    .attr('aria-label', 'Scatterplot of portfolio commits')
    .attr('aria-describedby', 'chart-help');

  svg.append('g').attr('class', 'meta-gridlines').attr('aria-hidden', 'true')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).tickValues(hours).tickFormat(() => '').tickSize(margin.left - right));
  svg.append('g').attr('transform', `translate(0, ${bottom})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat('%b %d')));
  svg.append('g').attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).tickValues(hours).tickFormat(hourLabel));

  svg.append('text').attr('class', 'meta-axis-label').attr('text-anchor', 'middle')
    .attr('x', (margin.left + right) / 2).attr('y', height - 8).text('Commit date');
  svg.append('text').attr('class', 'meta-axis-label').attr('text-anchor', 'middle')
    .attr('transform', `translate(17, ${(margin.top + bottom) / 2}) rotate(-90)`)
    .text('Time of day (local)');

  // Keep the brush behind the dots so they still receive hover and focus events.
  const brushLayer = svg.append('g').attr('class', 'meta-brush').attr('aria-hidden', 'true');
  const links = svg.append('g').attr('class', 'meta-dots').selectAll('a')
    .data(d3.sort(commits, (commit) => -commit.totalLines), (commit) => commit.id)
    .join('a').attr('href', (commit) => commit.url)
    .attr('target', '_blank').attr('rel', 'noopener noreferrer').attr('tabindex', 0)
    .attr('aria-label', (commit) =>
      `Commit ${commit.id.slice(0, 8)} on ${formatDate.format(commit.datetime)} at ${formatTime.format(commit.datetime)}, ${commit.totalLines} lines`)
    .on('pointerenter', (event, commit) => showTooltip(commit, event.clientX, event.clientY))
    .on('pointerleave', hideTooltipSoon)
    .on('focus', (event, commit) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      showTooltip(commit, bounds.right, bounds.top);
    })
    .on('blur', hideTooltipSoon);
  const dots = links.append('circle')
    .attr('cx', (commit) => x(commit.datetime))
    .attr('cy', (commit) => y(commit.hourFrac))
    .attr('r', (commit) => Math.max(3, radius(commit.totalLines)));

  const count = document.querySelector('#selection-count');
  const clear = document.querySelector('#clear-brush');
  const brush = d3.brush()
    .extent([[margin.left, margin.top], [right, bottom]])
    .on('start brush end', (event) => {
      if (event.type === 'start') tooltip.hidden = true;
      const selection = event.selection;
      const selected = selection ? commits.filter((commit) => {
        const [[x0, y0], [x1, y1]] = selection;
        const cx = x(commit.datetime);
        const cy = y(commit.hourFrac);
        return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
      }) : [];
      const ids = new Set(selected.map((commit) => commit.id));
      dots.classed('selected', (commit) => ids.has(commit.id));
      const message = selected.length
        ? `${selected.length} ${selected.length === 1 ? 'commit' : 'commits'} selected`
        : 'No commits selected';
      if (count.textContent !== message) count.textContent = message;
      clear.disabled = !selection;
      renderLanguageBreakdown(d3, selected);
    });

  brushLayer.call(brush);
  clear.addEventListener('click', () => brushLayer.call(brush.move, null));
}

try {
  const d3 = await import('https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm');
  const data = await d3.csv(new URL('loc.csv', import.meta.url), (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    datetime: new Date(row.datetime),
  }));
  if (!data.length || data.some((row) => !/^[0-9a-f]{7,40}$/.test(row.commit) || !Number.isFinite(+row.datetime))) {
    throw new Error('The line data is empty or has invalid Git metadata.');
  }
  const commits = processCommits(d3, data);
  renderStats(d3, data, commits);
  renderScatterPlot(d3, commits);
  status.hidden = true;
  document.querySelector('#meta-results').hidden = false;
} catch (error) {
  console.error('Could not load portfolio code history:', error);
  status.textContent = 'The code history could not load. Please refresh to try again.';
}
