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

async function loadGitHubStats() {
  const profileStats = document.querySelector('#profile-stats');
  if (!profileStats) return;

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
  } catch (error) {
    profileStats.textContent = 'GitHub stats are temporarily unavailable. Please refresh to try again.';
  }
}

// A slow or unavailable API should not hold up the project cards.
await Promise.all([loadLatestProjects(), loadGitHubStats()]);
