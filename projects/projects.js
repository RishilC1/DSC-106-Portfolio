import { fetchJSON, renderProjects } from '../global.js';

const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');

try {
  const projects = await fetchJSON(new URL('../lib/projects.json', import.meta.url));
  renderProjects(projects, projectsContainer, 'h2');
  projectsTitle.textContent = `${projects.length} ${projects.length === 1 ? 'Project' : 'Projects'}`;
} catch (error) {
  projectsContainer.textContent = 'Projects could not be loaded. Please refresh to try again.';
}
