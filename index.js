import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

async function loadLatestProjects() {
  const container = document.querySelector('.projects');
  try {
    const projects = await fetchJSON(new URL('./lib/projects.json', import.meta.url));
    renderProjects(projects.slice(0, 3), container, 'h3');
  } catch (error) {
    container.textContent = 'Projects could not be loaded. Please refresh to try again.';
  }
}

const refreshStats = document.querySelector('#refresh-stats');
const statsStatus = document.querySelector('#stats-status');

async function loadGitHubStats() {
  const profileStats = document.querySelector('#profile-stats');
  if (!profileStats || !refreshStats || !statsStatus || refreshStats.disabled) return;

  refreshStats.disabled = true;
  refreshStats.textContent = 'Refreshing…';
  statsStatus.textContent = 'Loading live data from GitHub…';
  profileStats.setAttribute('aria-busy', 'true');

  try {
    const githubData = await fetchGitHubData('RishilC1');
    const stats = [
      ['Followers', githubData.followers],
      ['Following', githubData.following],
      ['Public Repos', githubData.public_repos],
      ['Public Gists', githubData.public_gists],
    ];
    const dl = document.createElement('dl');
    for (const [label, value] of stats) {
      const group = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value.toLocaleString();
      group.append(dt, dd);
      dl.append(group);
    }
    profileStats.replaceChildren(dl);
    statsStatus.textContent = `Last refreshed: ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    statsStatus.textContent = 'Could not refresh GitHub stats. Please try again.';
    if (!profileStats.querySelector('dl')) {
      profileStats.textContent = 'GitHub stats are temporarily unavailable.';
    }
  } finally {
    refreshStats.disabled = false;
    refreshStats.textContent = 'Refresh stats';
    profileStats.setAttribute('aria-busy', 'false');
  }
}

if (refreshStats) {
  refreshStats.hidden = false;
  refreshStats.addEventListener('click', loadGitHubStats);
}

// A slow or unavailable API should not hold up the project cards.
await Promise.all([loadLatestProjects(), loadGitHubStats()]);
