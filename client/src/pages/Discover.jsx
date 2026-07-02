import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { Search, Flame, BookOpen, Briefcase, Award, ArrowRight, UserPlus, ShieldAlert } from 'lucide-react';

export default function Discover() {
  const [data, setData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDiscover = async () => {
      try {
        const { data: res } = await apiService.public.getDiscover();
        setData(res);
      } catch (err) {
        console.error('Failed to load discover feed', err);
      }
    };
    fetchDiscover();
  }, []);

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const { data: res } = await apiService.public.search(searchQuery);
      setSearchResults(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  if (!data) {
    return (
      <div className="container animate-fade-in" style={{ paddingTop: '40px' }}>
        {/* Hero Section Skeleton */}
        <section className="text-center" style={{ marginBottom: '60px' }}>
          <div className="skeleton" style={{ margin: '0 auto 16px', width: '320px', height: '48px', borderRadius: 'var(--radius-sm)' }}></div>
          <div className="skeleton" style={{ margin: '0 auto 12px', width: '80%', maxWidth: '600px', height: '18px', borderRadius: 'var(--radius-sm)' }}></div>
          <div className="skeleton" style={{ margin: '0 auto 32px', width: '50%', maxWidth: '400px', height: '18px', borderRadius: 'var(--radius-sm)' }}></div>

          {/* Stats Skeleton */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '40px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ width: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div className="skeleton" style={{ width: '50px', height: '40px', borderRadius: 'var(--radius-sm)' }}></div>
                <div className="skeleton" style={{ width: '60px', height: '14px', borderRadius: 'var(--radius-sm)' }}></div>
              </div>
            ))}
          </div>

          {/* Search Bar Skeleton */}
          <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', gap: '12px' }}>
            <div className="skeleton" style={{ flex: 1, height: '48px', borderRadius: 'var(--radius-sm)' }}></div>
            <div className="skeleton" style={{ width: '100px', height: '48px', borderRadius: 'var(--radius-sm)' }}></div>
          </div>
        </section>

        {/* Featured Showcases Skeleton */}
        <section style={{ marginBottom: '60px' }}>
          <div className="skeleton skeleton-title" style={{ width: '220px', height: '28px', borderRadius: 'var(--radius-sm)', marginBottom: '24px' }}></div>
          <div className="grid grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card flex flex-col justify-between" style={{ minHeight: '220px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    <div className="skeleton skeleton-circle"></div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div className="skeleton" style={{ width: '100px', height: '16px', borderRadius: 'var(--radius-sm)' }}></div>
                      <div className="skeleton" style={{ width: '60px', height: '12px', borderRadius: 'var(--radius-sm)' }}></div>
                    </div>
                  </div>
                  <div className="skeleton skeleton-text" style={{ width: '60%', height: '14px', marginBottom: '12px', borderRadius: 'var(--radius-sm)' }}></div>
                  <div className="skeleton skeleton-text" style={{ width: '100%', borderRadius: 'var(--radius-sm)' }}></div>
                  <div className="skeleton skeleton-text" style={{ width: '90%', borderRadius: 'var(--radius-sm)' }}></div>
                </div>
                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                  <div className="skeleton" style={{ width: '110px', height: '32px', borderRadius: 'var(--radius-sm)' }}></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const devList = searchResults || data.developers;

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '40px' }}>
      
      {/* --- HERO PLATFORM SECTION --- */}
      <section className="text-center" style={{ marginBottom: '60px' }}>
        <h1 style={{ marginBottom: '16px' }}>ShowCase</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto 32px' }}>
          Explore professional developer showcases, read technical blogs, and discover outstanding project designs in one centralized hub.
        </p>

        {/* --- STATS COUNTER --- */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '40px' }}>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-color)' }}>{data.stats.users}</div>
            <label>Developers</label>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-color)' }}>{data.stats.projects}</div>
            <label>Projects</label>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-color)' }}>{data.stats.blogs}</div>
            <label>Articles</label>
          </div>
        </div>

        {/* --- SEARCH FORM --- */}
        <form onSubmit={handleSearchSubmit} style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search developers by skills, name, role..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value) setSearchResults(null);
              }}
              style={{ paddingLeft: '44px', height: '48px' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: '48px', padding: '0 24px' }}>
            Search
          </button>
        </form>
      </section>

      {/* --- DEVELOPER SHOWCASE CARDS --- */}
      <section style={{ marginBottom: '60px' }}>
        <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus style={{ color: 'var(--accent-color)' }} />
          {searchResults ? 'Search Results' : 'Featured Showcases'}
        </h2>
        {searching && <div className="text-center">Searching...</div>}
        {!searching && devList.length === 0 && (
          <div className="card text-center" style={{ padding: '40px' }}>
            <ShieldAlert size={48} style={{ color: 'var(--danger)', margin: '0 auto 16px' }} />
            <h3>No developers found</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Try broadening your search query tags or terms.</p>
          </div>
        )}
        <div className="grid grid-cols-3">
          {devList.map((dev) => (
            <div 
              key={dev.username} 
              className="card card-hover flex flex-col justify-between"
              style={{ 
                borderTop: `4px solid ${dev.accent_color || 'var(--border-color)'}`,
                background: dev.accent_gradient ? `linear-gradient(to bottom, rgba(255,255,255,0.01), var(--bg-secondary))` : undefined
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <img
                    src={dev.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${dev.username}`}
                    alt={dev.username}
                    style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid var(--border-color)' }}
                  />
                  <div style={{ textAlign: 'left' }}>
                    <h3 style={{ fontSize: '1.1rem' }}>{dev.site_title || dev.username}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>@{dev.username}</p>
                  </div>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'left', marginBottom: '16px' }}>
                  {dev.hero_subtitle || 'Software Specialist'}
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'left', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {dev.about_bio}
                </p>
              </div>
              <div style={{ marginTop: '24px', textAlign: 'right' }}>
                <Link to={`/${dev.username}`} className="btn btn-secondary btn-sm">
                  View Showcase <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- FEATURED PROJECTS (BEHANCE STYLE) --- */}
      <section style={{ marginBottom: '60px' }}>
        <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Flame style={{ color: 'var(--accent-color)' }} /> Hot Projects
        </h2>
        <div className="grid grid-cols-2">
          {data.featuredProjects.map((project) => (
            <div key={project.id} className="card card-hover flex flex-col justify-between" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ height: '200px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border-color)' }}>
                {project.image_url ? (
                  <img src={project.image_url} alt={project.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Briefcase size={48} style={{ color: 'var(--text-muted)' }} />
                )}
              </div>
              <div style={{ padding: '24px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <img src={project.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${project.username}`} alt={project.username} style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>by @{project.username}</span>
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>{project.title}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>{project.description}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(Array.isArray(project.tech_stack) ? project.tech_stack : JSON.parse(project.tech_stack || '[]')).slice(0, 3).map((tech) => (
                    <span key={tech} className="badge">{tech}</span>
                  ))}
                </div>
              </div>
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                <Link to={`/${project.username}`} className="btn btn-secondary btn-sm">
                  View Developer
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- RECENT ARTICLES --- */}
      <section style={{ marginBottom: '60px' }}>
        <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen style={{ color: 'var(--accent-color)' }} /> Latest Articles
        </h2>
        <div className="grid grid-cols-3">
          {data.recentBlogs.map((blog) => (
            <div key={blog.slug} className="card card-hover flex flex-col justify-between">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <img src={blog.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${blog.username}`} alt={blog.username} style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>by @{blog.username}</span>
                </div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', textAlign: 'left' }}>{blog.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'left', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {blog.excerpt}
                </p>
              </div>
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(blog.created_at).toLocaleDateString()}
                </span>
                <Link to={`/${blog.username}`} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>
                  Read More
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
