console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Treat an explicit index.html URL as the same page as its directory.
function pagePath(pathname) {
  return pathname.replace(/index\.html$/, '');
}

// global.js lives at the site root, locally and under the GitHub Pages repo path.
const baseURL = new URL('./', import.meta.url);
const pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'resume/', title: 'Resume' },
  { url: 'https://github.com/RishilC1', title: 'GitHub' },
];

const nav = document.createElement('nav');
nav.setAttribute('aria-label', 'Main navigation');
document.body.prepend(nav);

for (const page of pages) {
  const a = document.createElement('a');
  a.href = new URL(page.url, baseURL).href;
  a.textContent = page.title;

  if (a.host === location.host && pagePath(a.pathname) === pagePath(location.pathname)) {
    a.classList.add('current');
    a.setAttribute('aria-current', 'page');
  }

  if (a.host !== location.host) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }

  nav.append(a);
}

// Add the switcher on every page alongside the shared navigation.
document.body.insertAdjacentHTML(
  'afterbegin',
  `<label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>`,
);

const select = document.querySelector('.color-scheme select');
const colorSchemes = ['light dark', 'light', 'dark'];

function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty('color-scheme', colorScheme);
  select.value = colorScheme;
}

// Theme switching still works if the browser blocks persistent storage.
try {
  const savedScheme = localStorage.getItem('colorScheme');
  if (colorSchemes.includes(savedScheme)) {
    setColorScheme(savedScheme);
  }
} catch (error) {
  console.warn('Could not read the saved theme preference.', error);
}

select.addEventListener('input', (event) => {
  const colorScheme = event.target.value;
  setColorScheme(colorScheme);
  try {
    localStorage.setItem('colorScheme', colorScheme);
  } catch (error) {
    console.warn('Could not save the theme preference.', error);
  }
});

// Percent-encode spaces and special characters for mail clients.
const form = document.querySelector('form[action^="mailto:"]');
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const parameters = [];

  for (const [name, value] of data) {
    parameters.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
  }

  location.href = `${form.action}?${parameters.join('&')}`;
});
