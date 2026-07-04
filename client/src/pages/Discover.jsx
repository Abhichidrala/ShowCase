import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import { Search, Flame, BookOpen, Briefcase, ArrowRight, UserPlus, ShieldAlert, Zap, Users, Code2 } from 'lucide-react';

// Safe JSON parse helper
function safeParseTechStack(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
  }
}

// Developer card skeleton
function DevCardSkeleton() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="skeleton skeleton-circle" style={{ width: '52px', height: '52px', flexShrink: 0 }}></div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="skeleton" style={{ height: '18px', width: '60%' }}></div>
          <div className="skeleton" style={{ height: '13px', width: '40%' }}></div>
        </div>
      </div>
      <div className="skeleton skeleton-text"></div>
      <div className="skeleton skeleton-text" style={{ width: '75%' }}></div>
      <div className="skeleton" style={{ height: '32px', width: '120px', alignSelf: 'flex-end', marginTop: '8px' }}></div>
    </div>
  );
}

export default function Discover() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [flippedCards, setFlippedCards] = useState({});

  const toggleCardFlip = (username) => {
    setFlippedCards(prev => ({
      ...prev,
      [username]: !prev[username]
    }));
  };

  useEffect(() => {
    const fetchDiscover = async () => {
      try {
        setError('');
        const { data: res } = await apiService.public.getDiscover();
        setData(res);
      } catch (err) {
        console.error('Failed to load discover feed', err);
        setError('Unable to connect to server. Please make sure the backend is running on port 5000.');
      }
    };
    fetchDiscover();
  }, []);

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setSearchError('');
      return;
    }
    setSearching(true);
    setSearchError('');
    try {
      const { data: res } = await apiService.public.search(searchQuery);
      setSearchResults(res);
    } catch (err) {
      setSearchError('Search failed. Please try again.');
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setSearchError('');
  };

  // --- LOADING STATE ---
  if (!data && !error) {
    return (
      <div className="container animate-fade-in" style={{ paddingTop: '48px', paddingBottom: '48px' }}>
        {/* Hero Skeleton */}
        <section className="text-center" style={{ marginBottom: '64px' }}>
          <div className="skeleton" style={{ margin: '0 auto 20px', width: '340px', height: '52px', borderRadius: 'var(--radius-md)' }}></div>
          <div className="skeleton" style={{ margin: '0 auto 12px', width: '70%', maxWidth: '560px', height: '18px', borderRadius: 'var(--radius-sm)' }}></div>
          <div className="skeleton" style={{ margin: '0 auto 40px', width: '45%', maxWidth: '380px', height: '18px', borderRadius: 'var(--radius-sm)' }}></div>
          
          {/* Stats skeleton */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', marginBottom: '40px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                <div className="skeleton" style={{ width: '64px', height: '40px', borderRadius: 'var(--radius-sm)' }}></div>
                <div className="skeleton" style={{ width: '80px', height: '14px', borderRadius: 'var(--radius-sm)' }}></div>
              </div>
            ))}
          </div>

          {/* Search skeleton */}
          <div className="skeleton" style={{ margin: '0 auto', width: '100%', maxWidth: '600px', height: '48px', borderRadius: 'var(--radius-sm)' }}></div>
        </section>

        {/* Developer Grid Skeleton */}
        <section style={{ marginBottom: '60px' }}>
          <div className="skeleton" style={{ width: '220px', height: '28px', marginBottom: '24px', borderRadius: 'var(--radius-sm)' }}></div>
          <div className="grid grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => <DevCardSkeleton key={i} />)}
          </div>
        </section>
      </div>
    );
  }

  // --- ERROR STATE ---
  if (error) {
    return (
      <div className="container text-center" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
        <div className="card" style={{ maxWidth: '520px', margin: '0 auto', padding: '48px 32px' }}>
          <ShieldAlert size={56} style={{ color: 'var(--danger)', margin: '0 auto 20px' }} />
          <h2 style={{ marginBottom: '12px' }}>Connection Failed</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', lineHeight: 1.7 }}>{error}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Retry Connection
            </button>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Make sure the backend server is running: <code style={{ color: 'var(--accent-color)' }}>npm run server</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const devList = searchResults || data.developers;

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '48px', paddingBottom: '48px' }}>
      
      {/* --- HERO SECTION --- */}
      <section className="text-center relative" style={{ marginBottom: '80px', padding: '40px 0' }}>
        {/* Background ambient orbs */}
        <div style={{ position: 'absolute', top: '0', left: '25%', right: '25%', height: '350px', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 80%)', borderRadius: '50%', pointerEvents: 'none', filter: 'blur(50px)', zIndex: 0 }}></div>
        
        <div style={{ 
          position: 'relative',
          zIndex: 1,
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: 'rgba(99, 102, 241, 0.1)', 
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 'var(--radius-full)', 
          padding: '8px 20px', 
          marginBottom: '28px',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase'
        }}>
          <Zap size={14} style={{ color: 'var(--text-primary)' }} /> Discover Developer Portfolios
        </div>
        
        <h1 style={{ position: 'relative', zIndex: 1, marginBottom: '20px', letterSpacing: '-0.04em', fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.1 }}>
          One Hub for{' '}
          <span style={{ 
            background: 'linear-gradient(135deg, #ffffff 0%, #a3a3a3 50%, #525252 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent'
          }}>
            Developer Talent
          </span>
        </h1>
        
        <p style={{ position: 'relative', zIndex: 1, color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto 48px', lineHeight: 1.8 }}>
          Explore professional portfolios, read technical articles, and connect with verified developers in a modern portfolio hub.
        </p>

        {/* Stats Grid */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', gap: '64px', marginBottom: '56px', flexWrap: 'wrap' }}>
          {[
            { icon: <Users size={22} style={{ color: 'var(--text-primary)' }} />, value: data.stats.users, label: 'Developers' },
            { icon: <Code2 size={22} style={{ color: 'var(--text-secondary)' }} />, value: data.stats.projects, label: 'Projects' },
            { icon: <BookOpen size={22} style={{ color: 'var(--text-muted)' }} />, value: data.stats.blogs, label: 'Articles' },
          ].map(stat => (
            <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'rgba(30, 41, 59, 0.4)', padding: '16px 28px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.03)', minWidth: '150px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                {stat.icon}
                <span style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                  {stat.value}
                </span>
              </div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</label>
            </div>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} style={{ position: 'relative', zIndex: 1, maxWidth: '640px', margin: '0 auto', display: 'flex', gap: '14px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search developers by name, skills, role..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value) { setSearchResults(null); setSearchError(''); }
              }}
              style={{ paddingLeft: '48px', paddingRight: searchQuery ? '44px' : '16px', height: '54px', fontSize: '1.05rem', backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: 'var(--radius-md)' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', lineHeight: 1 }}
              >
                ✕
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: '54px', padding: '0 32px', fontSize: '1rem', borderRadius: 'var(--radius-md)' }} disabled={searching}>
            {searching ? <span className="spinner spinner-sm"></span> : 'Search'}
          </button>
        </form>
        {searchError && <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginTop: '12px' }}>{searchError}</p>}
      </section>

      {/* --- DEVELOPER SHOWCASE CARDS --- */}
      <section style={{ marginBottom: '88px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between', justifyContent: 'space-between', marginBottom: '32px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>
            <UserPlus size={24} style={{ color: 'var(--accent-color)' }} />
            {searchResults ? `Results for "${searchQuery}"` : 'Featured Creators'}
          </h2>
          {searchResults && (
            <button onClick={clearSearch} className="btn btn-secondary btn-sm">
              Clear Search
            </button>
          )}
        </div>

        {searching && (
          <div className="page-loader" style={{ minHeight: '200px' }}>
            <div className="spinner"></div>
            <span>Searching developers...</span>
          </div>
        )}

        {!searching && devList.length === 0 && (
          <div className="glass-panel text-center empty-state" style={{ padding: '60px 40px' }}>
            <div className="empty-state-icon" style={{ fontSize: '4rem', marginBottom: '24px' }}>👨‍💻</div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', color: 'var(--text-primary)' }}>{searchResults ? 'No developers found' : 'No showcases registered'}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px' }}>
              {searchResults ? 'Try adjusting your search terms or filters.' : 'Be the first pioneer to publish a developer portfolio here!'}
            </p>
            {!searchResults && (
              <Link to="/register" className="btn btn-primary" style={{ padding: '12px 32px' }}>Create Showcase</Link>
            )}
          </div>
        )}

        {!searching && devList.length > 0 && (
          <div className="grid grid-cols-5" style={{ gap: '20px' }}>
            {devList.map((dev, index) => (
              <div 
                key={dev.username} 
                className={`flip-card ${flippedCards[dev.username] ? 'is-flipped' : ''} animate-fade-in-up animate-stagger-${(index % 5) + 1}`}
                onClick={() => toggleCardFlip(dev.username)}
              >
                <div className="flip-card-inner">
                  {/* Front Side */}
                  <div className="flip-card-front">
                    {/* Visual card header bar */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: dev.accent_color || 'var(--primary-gradient)', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)' }}></div>
                    
                    <img
                      src={dev.avatar_url || `https://api.dicebear.com/9.x/adventurer/svg?seed=${dev.username}&skinColor=f8d9b2`}
                      alt={dev.username}
                      className="avatar"
                      style={{ width: '64px', height: '64px', marginBottom: '16px' }}
                      onError={(e) => { e.target.src = `https://api.dicebear.com/9.x/initials/svg?seed=${dev.username}`; }}
                    />
                    
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%', color: 'var(--text-primary)' }}>
                      {dev.site_title || dev.username}
                    </h3>
                    
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '12px' }}>
                      @{dev.username}
                    </p>
                    
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%', marginTop: '4px' }}>
                      {dev.hero_subtitle || 'Software Architect'}
                    </p>

                    <div style={{ marginTop: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Click to flip
                    </div>
                  </div>

                  {/* Back Side */}
                  <div className="flip-card-back">
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%', color: 'var(--text-primary)' }}>
                      {dev.site_title || dev.username}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '16px' }}>
                      @{dev.username}
                    </p>
                    
                    <p style={{ 
                      fontSize: '0.85rem', 
                      color: 'var(--text-primary)', 
                      lineHeight: 1.5,
                      display: '-webkit-box', 
                      WebkitLineClamp: 4, 
                      WebkitBoxOrient: 'vertical', 
                      overflow: 'hidden',
                      marginBottom: '24px',
                      padding: '0 8px',
                      flex: 1
                    }}>
                      {dev.about_bio || 'Passionate developer constructing exceptional digital solutions.'}
                    </p>
                    
                    <div style={{ width: '100%', marginTop: 'auto' }}>
                      <Link 
                        to={`/${dev.username}`} 
                        className="btn btn-secondary btn-sm" 
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                          gap: '6px', 
                          width: '100%', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          borderColor: dev.accent_color ? `${dev.accent_color}44` : undefined,
                          color: dev.accent_color || undefined
                        }}
                      >
                        View Showcase <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* --- FEATURED PROJECTS --- */}
      {!searchResults && data.featuredProjects.length > 0 && (
        <section style={{ marginBottom: '88px' }}>
          <h2 style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.75rem', fontWeight: 800, borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <Flame size={24} style={{ color: 'var(--accent-color)' }} /> Popular Projects
          </h2>
          <div className="grid grid-cols-2" style={{ gap: '28px' }}>
            {data.featuredProjects.map((project, index) => {
              const techStack = safeParseTechStack(project.tech_stack);
              return (
                <div key={project.id} className={`card card-hover animate-fade-in-up animate-stagger-${(index % 4) + 1}`} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
                  <div style={{ height: '200px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border-color)', overflow: 'hidden', position: 'relative' }}>
                    {project.image_url ? (
                      <img src={project.image_url.startsWith('/') ? `http://localhost:5000${project.image_url}` : project.image_url} alt={project.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
                        <Briefcase size={44} style={{ color: 'rgba(255,255,255,0.15)' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Project Preview</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', top: '16px', left: '16px' }}>
                      <span className="badge badge-primary" style={{ fontSize: '0.75rem', padding: '6px 14px', background: 'rgba(6, 182, 212, 0.2)', borderColor: 'rgba(6, 182, 212, 0.4)' }}>⭐ FEATURED</span>
                    </div>
                  </div>
                  <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                      <img 
                        src={project.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${project.username}`} 
                        alt={project.username} 
                        style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1.5px solid var(--border-color)' }} 
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>by <strong style={{ color: 'var(--text-primary)' }}>@{project.username}</strong></span>
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>{project.title}</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '20px', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.6 }}>
                      {project.description}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {techStack.slice(0, 3).map((tech) => (
                          <span key={tech} className="badge" style={{ fontSize: '0.7rem' }}>{tech}</span>
                        ))}
                        {techStack.length > 3 && <span className="badge" style={{ fontSize: '0.7rem' }}>+{techStack.length - 3}</span>}
                      </div>
                      <Link to={`/${project.username}`} className="btn btn-secondary btn-sm" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                        Profile
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* --- RECENT ARTICLES --- */}
      {!searchResults && data.recentBlogs.length > 0 && (
        <section style={{ marginBottom: '88px' }}>
          <h2 style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.75rem', fontWeight: 800, borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <BookOpen size={24} style={{ color: 'var(--accent-color)' }} /> Latest Articles
          </h2>
          <div className="grid grid-cols-3" style={{ gap: '28px' }}>
            {data.recentBlogs.map((blog, index) => (
              <div key={`${blog.username}-${blog.slug}`} className={`card card-hover animate-fade-in-up animate-stagger-${(index % 4) + 1}`} style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', padding: '24px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <img 
                      src={blog.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${blog.username}`} 
                      alt={blog.username} 
                      style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1.5px solid var(--border-color)' }} 
                    />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>@{blog.username}</span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '10px', lineHeight: 1.4, color: 'var(--text-primary)' }}>{blog.title}</h3>
                  <p style={{ 
                    fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                  }}>
                    {blog.excerpt || 'Read this article to learn more...'}
                  </p>
                </div>
                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '14px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {new Date(blog.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <Link to={`/${blog.username}`} className="btn btn-secondary btn-sm" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                    Read →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- CTA Banner for non-registered users --- */}
      {!searchResults && (
        <section style={{ marginBottom: '40px' }}>
          <div className="glass-panel text-center empty-state" style={{ padding: '64px 32px', background: 'var(--bg-secondary)' }}>
            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }}></div>
            <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(6, 182, 212, 0.06) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }}></div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ marginBottom: '14px', fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Ready to Showcase Your Work?</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '36px', fontSize: '1.05rem', maxWidth: '540px', margin: '0 auto 36px', lineHeight: 1.7 }}>
                Join developers building premium showcase profiles and sharing their portfolio links with recruiters and peers.
              </p>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/register" className="btn btn-primary" style={{ padding: '14px 36px', fontSize: '1rem', borderRadius: 'var(--radius-md)' }}>
                  Create Showcase
                </Link>
                <Link to="/login" className="btn btn-secondary" style={{ padding: '14px 36px', fontSize: '1rem', borderRadius: 'var(--radius-md)' }}>
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
