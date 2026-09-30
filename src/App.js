/* global chrome */
import { useState, useEffect, useCallback } from 'react';
import './App.css';
import fallbackProjectsData from './data/projects.json';

const API_URL = 'https://guindytechnology-solutions.com/guindy_manager_test/projets-list';

// Helper to safely format hostname
const getHostname = (url) => {
  if (!url) return 'Lien non défini';
  try {
    const validUrl = url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `https://${url}`;
    return new URL(validUrl).hostname;
  } catch {
    return url;
  }
};

// Transform API or fallback data into a unified list
const transformProjects = (rawList) => {
  if (!Array.isArray(rawList)) return [];

  const list = [];
  rawList.forEach((item, index) => {
    const baseId = item.id !== undefined ? item.id : `proj-${index}`;
    const name = item.nom || item.title || 'Projet';
    const icon = item.image || item.icon || 'guindy-logo.svg';

    // Direct url provided (e.g. from static projects.json or custom API)
    if (item.url) {
      list.push({
        id: baseId,
        title: name,
        url: item.url.trim(),
        icon,
      });
      return;
    }

    const hasTest = Boolean(item.link_test && item.link_test.trim());
    const hasProd = Boolean(item.link_prod && item.link_prod.trim());

    if (hasTest && hasProd) {
      list.push({
        id: `${baseId}-test`,
        title: `${name} Test`,
        url: item.link_test.trim(),
        icon,
      });
      list.push({
        id: `${baseId}-prod`,
        title: `${name} Prod`,
        url: item.link_prod.trim(),
        icon,
      });
    } else if (hasTest) {
      list.push({
        id: `${baseId}-test`,
        title: `${name} Test`,
        url: item.link_test.trim(),
        icon,
      });
    } else if (hasProd) {
      list.push({
        id: `${baseId}-prod`,
        title: `${name} Prod`,
        url: item.link_prod.trim(),
        icon,
      });
    } else {
      list.push({
        id: `${baseId}`,
        title: name,
        url: '',
        icon,
      });
    }
  });

  return list;
};

function App() {
  const [search, setSearch] = useState('');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('dark');

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`Erreur réseau (${response.status})`);
      }
      const json = await response.json();
      const rawList = Array.isArray(json)
        ? json
        : Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.projets)
        ? json.projets
        : [];

      const parsed = transformProjects(rawList);
      setProjects(parsed);
    } catch (err) {
      console.warn('Erreur récupération API, bascule sur données de secours:', err);
      setError("Serveur local indisponible. Affichage des projets en cache.");
      if (fallbackProjectsData && fallbackProjectsData.length > 0) {
        setProjects(transformProjects(fallbackProjectsData));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const openProject = (url) => {
    if (!url) return;
    // eslint-disable-next-line no-undef
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const filtered = projects.filter(p =>
    (p.title && p.title.toLowerCase().includes(search.toLowerCase())) || 
    (p.url && p.url.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-actions">
          <button 
            className={`icon-btn ${loading ? 'spin' : ''}`} 
            onClick={fetchProjects} 
            title="Rafraîchir les projets"
            disabled={loading}
            aria-label="Refresh"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
          <button className="icon-btn theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
        
        <div className="header-content">
          <img src="guindy-logo.svg" alt="Guindy Logo" className="header-logo" style={{ transform: 'scale(2)' }} />
          <h1>Guindy Solutions</h1>
        </div>
        <p className="subtitle">Accès rapide</p>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={fetchProjects} className="retry-btn">Réessayer</button>
        </div>
      )}

      <div className="search-container">
        <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder="Rechercher un projet..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      <div className="projects-list">
        {loading ? (
          <div className="loading-state">
            <div className="skeleton-card"></div>
            <div className="skeleton-card"></div>
            <div className="skeleton-card"></div>
            <div className="skeleton-card"></div>
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((p) => {
            const hasUrl = Boolean(p.url);
            return (
              <div 
                key={p.id} 
                className={`project-card ${!hasUrl ? 'disabled-card' : ''}`} 
                onClick={() => hasUrl && openProject(p.url)}
                title={hasUrl ? p.url : 'Aucun lien configuré pour ce projet'}
              >
                <div className="project-icon-wrapper">
                  <img 
                    src={p.icon} 
                    alt={p.title} 
                    className="project-icon" 
                    onError={(e) => {
                      e.currentTarget.src = 'guindy-logo.svg';
                    }}
                  />
                </div>
                <div className="project-info">
                  <h2 className="project-title">{p.title}</h2>
                  <span className={`project-url ${!hasUrl ? 'no-url-text' : ''}`}>
                    {getHostname(p.url)}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-results">
            <p>Aucun projet trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
