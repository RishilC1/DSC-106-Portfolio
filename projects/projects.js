import { fetchJSON, renderProjects } from '../global.js';

const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');
const searchInput = document.querySelector('.searchBar');
const clearYearButton = document.querySelector('#clear-year');
const filterStatus = document.querySelector('#filter-status');
const chartMessage = document.querySelector('#chart-message');
const plot = document.querySelector('#projects-pie-plot');

let projects = [];
let query = '';
let selectedYear = null;
let d3;
let colors;

function toggleYear(year) {
  // Store the year, not a slice index: search can change the slice order.
  selectedYear = selectedYear === year ? null : year;
  updateView();
}

function renderPieChart(searchMatches) {
  if (!d3) return;

  // The chart summarizes the search results, before applying the year filter.
  // Keeping every matching year visible lets users switch or deselect a year.
  const data = d3.rollups(searchMatches, (group) => group.length, (project) => String(project.year))
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => Number(b.label) - Number(a.label));
  const arcs = d3.pie().sort(null).value((item) => item.value)(data);
  const arcGenerator = d3.arc().innerRadius(0).outerRadius(48);
  const svg = d3.select(plot);

  plot.toggleAttribute('hidden', data.length === 0);
  chartMessage.hidden = data.length > 0;
  chartMessage.textContent = data.length === 0 ? 'No matching projects to chart.' : '';

  // Keyed joins update existing elements and remove obsolete slices/legend rows.
  svg.selectAll('path')
    .data(arcs, (arc) => arc.data.label)
    .join('path')
    .attr('d', arcGenerator)
    .attr('fill', (arc) => colors(arc.data.label))
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (arc) => `${arc.data.label}: ${arc.data.value} ${arc.data.value === 1 ? 'project' : 'projects'}`)
    .attr('aria-pressed', (arc) => String(arc.data.label === selectedYear))
    .classed('selected', (arc) => arc.data.label === selectedYear)
    .on('click', (event, arc) => toggleYear(arc.data.label))
    .on('keydown', (event, arc) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleYear(arc.data.label);
      }
    })
    .selectAll('title')
    .data((arc) => [arc])
    .join('title')
    .text((arc) => `${arc.data.label}: ${arc.data.value} ${arc.data.value === 1 ? 'project' : 'projects'}`);

  const items = d3.select('.legend').selectAll('li')
    .data(data, (item) => item.label)
    .join((enter) => {
      const li = enter.append('li').attr('class', 'legend-item');
      const button = li.append('button').attr('type', 'button').attr('class', 'legend-button');
      button.append('span').attr('class', 'swatch').attr('aria-hidden', 'true');
      button.append('span').attr('class', 'legend-label');
      return li;
    })
    .style('--color', (item) => colors(item.label))
    .classed('selected', (item) => item.label === selectedYear);

  items.select('button')
    .attr('aria-pressed', (item) => String(item.label === selectedYear))
    .attr('aria-label', (item) => `Filter ${item.label}: ${item.value} ${item.value === 1 ? 'project' : 'projects'}`)
    .on('click', (event, item) => toggleYear(item.label));
  items.select('.legend-label').text((item) => `${item.label} (${item.value})`);
}

function updateView() {
  // Both event handlers use these same two filters, fixing the lab's pitfall.
  const searchMatches = projects.filter((project) =>
    Object.values(project).join('\n').toLowerCase().includes(query.trim().toLowerCase()),
  );
  const visibleProjects = searchMatches.filter((project) =>
    selectedYear === null || String(project.year) === selectedYear,
  );

  renderProjects(visibleProjects, projectsContainer, 'h2');
  if (visibleProjects.length === 0) {
    projectsContainer.textContent = 'No projects match these filters. Try another search or clear the year filter.';
  }
  projectsTitle.textContent = `${visibleProjects.length} ${visibleProjects.length === 1 ? 'Project' : 'Projects'}`;
  filterStatus.textContent = `Showing ${visibleProjects.length} of ${projects.length} projects${selectedYear ? ` · Year: ${selectedYear}` : ''}${query.trim() ? ` · Search: “${query.trim()}”` : ''}`;
  clearYearButton.hidden = selectedYear === null;
  renderPieChart(searchMatches);
}

searchInput.addEventListener('input', (event) => {
  query = event.target.value;
  updateView();
});
clearYearButton.addEventListener('click', () => {
  selectedYear = null;
  updateView();
  searchInput.focus();
});

try {
  projects = await fetchJSON(new URL('../lib/projects.json', import.meta.url));
  if (!Array.isArray(projects)) throw new TypeError('Expected an array of projects.');
  searchInput.disabled = false;
  updateView();

  // Search and project cards still work if the external chart library is unavailable.
  try {
    d3 = await import('https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm');
    const years = [...new Set(projects.map((project) => String(project.year)))].sort();
    colors = d3.scaleOrdinal(years, d3.schemeTableau10);
    updateView();
  } catch (error) {
    console.error('Could not load the year chart:', error);
    chartMessage.hidden = false;
    chartMessage.textContent = 'The year chart could not load. You can still search the projects below.';
  }
} catch (error) {
  projectsContainer.textContent = 'Projects could not be loaded. Please refresh to try again.';
  chartMessage.textContent = 'The chart is unavailable because project data could not be loaded.';
  filterStatus.textContent = '';
}
