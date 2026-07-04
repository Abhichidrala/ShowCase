import React, { useEffect, useState, useCallback } from 'react';

// Safe JSON parse for tech_stack arrays
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

// Resolve image URL (handles relative upload paths via Vite proxy)
function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  // Relative paths served through Vite proxy to backend /uploads
  return url;
}
import { useParams, Link } from 'react-router-dom';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Github, Linkedin, Twitter, Globe, Send, ThumbsUp, 
  UserPlus, UserMinus, MessageSquare, Briefcase, Award, BookOpen, 
  MapPin, Calendar, Heart, ShieldCheck, CheckCircle
} from 'lucide-react';

export default function PublicPortfolio() {
  const { username } = useParams();
  const { user } = useAuth();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal state
  const [activeProject, setActiveProject] = useState(null);
  
  // Interactive social forms
  const [msgForm, setMsgForm] = useState({ name: '', email: '', subject: '', content: '' });
  const [msgFeedback, setMsgFeedback] = useState({ text: '', type: '' });
  
  const [recContent, setRecContent] = useState('');
  const [recFeedback, setRecFeedback] = useState('');
  const [submittingRec, setSubmittingRec] = useState(false);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      setError('');
      const { data: res } = await apiService.portfolios.getByUsername(username);
      setData(res);
      
      // Update body theme configuration class dynamically
      const themeClass = res.profile?.theme_name ? `theme-${res.profile.theme_name}` : 'theme-classic-dark';
      document.body.className = themeClass;

      if (res.profile?.accent_color) {
        const c = res.profile.accent_color;
        document.documentElement.style.setProperty('--accent-color', c);
        document.documentElement.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${c}22 0%, transparent 100%)`);
        document.documentElement.style.setProperty('--primary-color', c);
        document.documentElement.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${c} 0%, ${c}88 50%, ${c}44 100%)`);
        document.documentElement.style.setProperty('--btn-primary-text', '#ffffff');
        document.documentElement.style.setProperty('--shadow-glow', `0 0 24px ${c}30`);
      }

      // Track analytics visit
      apiService.public.trackAnalytics(username, 'page_view');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to load developer portfolio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    
    // Clean up theme class when unmounting page
    return () => {
      document.body.className = '';
      document.documentElement.style.removeProperty('--accent-color');
      document.documentElement.style.removeProperty('--accent-gradient');
      document.documentElement.style.removeProperty('--primary-color');
      document.documentElement.style.removeProperty('--primary-gradient');
      document.documentElement.style.removeProperty('--btn-primary-text');
      document.documentElement.style.removeProperty('--shadow-glow');
    };
  }, [username]);

  // Handle follow
  const handleFollowToggle = async () => {
    if (!user) {
      alert('Please log in to follow developers.');
      return;
    }
    try {
      const { data: res } = await apiService.portfolios.toggleFollow(username);
      setData({
        ...data,
        isFollowing: res.followed,
        followersCount: res.followed ? data.followersCount + 1 : data.followersCount - 1
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Submit contact message
  const handleMessageSubmit = async (e) => {
    e.preventDefault();
    setMsgFeedback({ text: '', type: '' });
    try {
      const { data: res } = await apiService.portfolios.sendMessage(username, msgForm);
      setMsgFeedback({ text: res.message, type: 'success' });
      setMsgForm({ name: '', email: '', subject: '', content: '' });
    } catch (err) {
      setMsgFeedback({ text: err.response?.data?.error || 'Failed to deliver message.', type: 'danger' });
    }
  };

  // Submit peer recommendation
  const handleRecSubmit = async (e) => {
    e.preventDefault();
    if (!recContent.trim()) return;
    setRecFeedback('');
    setSubmittingRec(true);
    try {
      const { data: res } = await apiService.portfolios.giveRecommendation(username, { content: recContent });
      setRecFeedback(res.message);
      setRecContent('');
    } catch (err) {
      setRecFeedback(err.response?.data?.error || 'Failed to submit recommendation.');
    } finally {
      setSubmittingRec(false);
    }
  };

  // Track project link click
  const handleProjectClick = (project) => {
    setActiveProject(project);
    apiService.public.trackAnalytics(username, 'project_click', project.id);
  };

  if (loading) {
    return (
      <div className="container animate-fade-in" style={{ paddingTop: '40px' }}>
        {/* Hero Section Skeleton */}
        <section className="card flex justify-between items-center" style={{ marginBottom: '40px', flexWrap: 'wrap', gap: '24px' }}>
          <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
            <div className="skeleton skeleton-circle" style={{ width: '80px', height: '80px' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="skeleton" style={{ width: '180px', height: '24px', borderRadius: 'var(--radius-sm)' }}></div>
              <div className="skeleton" style={{ width: '120px', height: '14px', borderRadius: 'var(--radius-sm)' }}></div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="skeleton" style={{ width: '100px', height: '36px', borderRadius: 'var(--radius-sm)' }}></div>
            <div className="skeleton" style={{ width: '100px', height: '36px', borderRadius: 'var(--radius-sm)' }}></div>
          </div>
        </section>

        {/* Bio & Skills Grid Skeleton */}
        <section className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '32px', marginBottom: '40px' }}>
          {/* Main Bio Card */}
          <div className="card flex flex-col gap-4" style={{ minHeight: '200px' }}>
            <div className="skeleton skeleton-title" style={{ width: '240px', height: '24px' }}></div>
            <div className="skeleton skeleton-text" style={{ width: '90%' }}></div>
            <div className="skeleton skeleton-text" style={{ width: '95%' }}></div>
            <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
          </div>

          {/* Skills Card */}
          <div className="card flex flex-col gap-4">
            <div className="skeleton skeleton-title" style={{ width: '120px', height: '20px' }}></div>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className="skeleton" style={{ width: '60px', height: '14px' }}></div>
                  <div className="skeleton" style={{ width: '30px', height: '14px' }}></div>
                </div>
                <div className="skeleton" style={{ width: '100%', height: '8px' }}></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container text-center" style={{ paddingTop: '80px' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '40px' }}>
          <h3 style={{ color: 'var(--danger)', marginBottom: '16px' }}>Access Denied</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error}</p>
          <Link to="/" className="btn btn-primary">Go Back Home</Link>
        </div>
      </div>
    );
  }

  const { profile, settings, projects, skills, experience, education, certificates, achievements, socialLinks, blogs, recommendations, isFollowing, followersCount } = data;

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '60px', paddingBottom: '60px', position: 'relative' }}>
      {/* Background ambient decorative glowing orbs */}
      <div className="animate-float-blob" style={{ position: 'fixed', top: '10%', left: '5%', width: '380px', height: '380px', background: 'radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', filter: 'blur(50px)', zIndex: -1 }}></div>
      <div className="animate-float-blob-slow" style={{ position: 'fixed', bottom: '15%', right: '5%', width: '420px', height: '420px', background: 'radial-gradient(circle, rgba(255, 255, 255, 0.02) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', filter: 'blur(60px)', zIndex: -1 }}></div>

      {/* --- HERO / PORTFOLIO HEADER --- */}
      <section className="glass-panel flex justify-between items-center" style={{ marginBottom: '40px', flexWrap: 'wrap', gap: '28px', padding: '36px' }}>
        <div className="flex items-center gap-6" style={{ flexWrap: 'wrap', textAlign: 'left' }}>
          <img
            src={resolveImageUrl(profile.avatar_url) || `https://api.dicebear.com/9.x/adventurer/svg?seed=${username}&skinColor=f8d9b2`}
            onError={(e) => { e.target.src = `https://api.dicebear.com/9.x/initials/svg?seed=${username}`; }}
            alt={username}
            className="avatar"
            style={{ width: '108px', height: '108px' }}
          />
          <div>
            <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{profile.site_title || username}</h2>
              <span className="badge badge-primary" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>@{username}</span>
            </div>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', fontWeight: 700, marginTop: '6px' }}>
              {profile.hero_subtitle || 'Creative Software Engineer'}
            </p>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 500 }}>
              {followersCount} Followers
            </p>
          </div>
        </div>

        {/* Social interactions */}
        <div className="flex gap-3" style={{ alignItems: 'center' }}>
          {user && user.username !== username && (
            <button onClick={handleFollowToggle} className={`btn btn-${isFollowing ? 'secondary' : 'primary'}`} style={{ height: '44px', borderRadius: 'var(--radius-sm)' }}>
              {isFollowing ? (
                <>
                  <UserMinus size={16} /> Unfollow
                </>
              ) : (
                <>
                  <UserPlus size={16} /> Follow Developer
                </>
              )}
            </button>
          )}
          
          <div style={{ display: 'flex', gap: '10px' }}>
            {socialLinks.map(link => (
              <a 
                key={link.id} 
                href={link.url} 
                target="_blank" 
                rel="noreferrer" 
                className="btn btn-secondary" 
                style={{ padding: '10px', height: '44px', width: '44px', borderRadius: 'var(--radius-sm)', justifyContent: 'center' }}
                title={link.platform}
              >
                {link.platform === 'github' && <Github size={18} />}
                {link.platform === 'linkedin' && <Linkedin size={18} />}
                {link.platform === 'twitter' && <Twitter size={18} />}
                {!['github', 'linkedin', 'twitter'].includes(link.platform) && <Globe size={18} />}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* --- HERO DESCRIPTION / ABOUT BIO --- */}
      <section className="grid" style={{ gridTemplateColumns: skills.length > 0 ? '2fr 1fr' : '1fr', gap: '32px', marginBottom: '40px' }}>
        
        {/* Main Bio Pitch */}
        <div className="card flex flex-col justify-center" style={{ textAlign: 'left', padding: '36px' }}>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '20px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {profile.hero_title || `Welcome to my showcase`}
          </h3>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.7 }}>
            {profile.hero_description}
          </p>
          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {profile.about_bio}
          </p>
        </div>

        {/* Skills Categories list */}
        {skills.length > 0 && (
          <div className="card" style={{ textAlign: 'left', padding: '36px' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '24px' }}>Key Skills</h3>
            <div className="flex flex-col gap-5">
              {skills.map((s, index) => (
                <div key={s.id} className={`animate-fade-in-up animate-stagger-${(index % 5) + 1}`}>
                  <div className="flex justify-between" style={{ fontSize: '0.9rem', marginBottom: '6px', fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{s.proficiency}%</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${s.proficiency}%`, height: '100%', background: 'var(--primary-gradient)', borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* --- BEHANCE STYLE PROJECT DIRECTORY --- */}
      {projects.length > 0 && (
        <section style={{ marginBottom: '56px' }}>
          <h2 style={{ textAlign: 'left', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.75rem', fontWeight: 800 }}>
            <Briefcase style={{ color: 'var(--text-secondary)' }} /> Projects Showcase
          </h2>
          
          <div className="grid grid-cols-3" style={{ gap: '28px' }}>
            {projects.map((p, index) => (
              <div 
                key={p.id} 
                className={`card card-hover flex flex-col justify-between animate-fade-in-up animate-stagger-${(index % 4) + 1}`} 
                style={{ padding: 0, overflow: 'hidden', textAlign: 'left', cursor: 'pointer', background: 'var(--bg-secondary)' }}
                onClick={() => handleProjectClick(p)}
              >
                <div style={{ height: '180px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border-color)' }}>
                  <Award size={48} style={{ color: 'rgba(255,255,255,0.1)' }} />
                </div>
                <div style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary)' }}>{p.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.6 }}>
                    {p.description}
                  </p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '16px' }}>
                    {safeParseTechStack(p.tech_stack).slice(0, 3).map(tech => (
                      <span key={tech} className="badge" style={{ fontSize: '0.75rem' }}>{tech}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- EXPERIENCE & EDUCATION TIMELINES --- */}
      {(experience.length > 0 || education.length > 0 || certificates.length > 0) && (
        <section className="grid" style={{ gridTemplateColumns: (experience.length > 0 && (education.length > 0 || certificates.length > 0)) ? '1fr 1fr' : '1fr', gap: '32px', marginBottom: '56px', textAlign: 'left' }}>
          
          {/* Experience Timeline */}
          {experience.length > 0 && (
            <div className="card" style={{ padding: '36px' }}>
              <h3 style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem', fontWeight: 800 }}>
                <Calendar size={20} style={{ color: 'var(--text-secondary)' }} /> Professional Experience
              </h3>
              <div className="flex flex-col gap-6" style={{ borderLeft: '2px solid var(--border-color)', paddingLeft: '20px', marginLeft: '10px' }}>
                {experience.map((e, index) => (
                  <div key={e.id} className={`animate-fade-in-up animate-stagger-${(index % 4) + 1}`} style={{ position: 'relative' }}>
                    {/* Timeline node */}
                    <div style={{ position: 'absolute', left: '-31px', top: '6px', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary-gradient)', boxShadow: '0 0 10px rgba(255,255,255,0.3)' }} />
                    
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{e.role}</h4>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '4px 0 8px', fontWeight: 500 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{e.company}</strong> | {e.start_date} - {e.is_current === 1 ? 'Present' : e.end_date}
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{e.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education Timeline */}
          {(education.length > 0 || certificates.length > 0) && (
            <div className="card" style={{ padding: '36px' }}>
              <h3 style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem', fontWeight: 800 }}>
                <Award size={20} style={{ color: 'var(--text-secondary)' }} /> Academic & Certifications
              </h3>
              
              <div className="flex flex-col gap-4">
                {education.map((edu, index) => (
                  <div key={edu.id} className={`animate-fade-in-up animate-stagger-${(index % 4) + 1}`} style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{edu.degree} in {edu.field_of_study}</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {edu.institution} | {edu.start_date} - {edu.end_date}
                    </p>
                  </div>
                ))}

                {certificates.map((cert, index) => (
                  <div key={cert.id} className={`flex justify-between items-center animate-fade-in-up animate-stagger-${(index % 4) + 1}`} style={{ paddingTop: '12px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '12px' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{cert.title}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>Issuer: {cert.issuer} ({cert.issue_date})</p>
                    </div>
                    {cert.credential_url && (
                      <a href={cert.credential_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: 'var(--radius-sm)' }}>
                        Verify
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* --- RECOMMENDATIONS CAROUSEL/LIST --- */}
      {recommendations.length > 0 && (
        <section style={{ marginBottom: '56px', textAlign: 'left' }}>
          <h2 style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.75rem', fontWeight: 800 }}>
            <ThumbsUp style={{ color: 'var(--text-secondary)' }} /> Peer Endorsements
          </h2>
          
          <div className="grid grid-cols-2" style={{ gap: '28px' }}>
            {recommendations.map(r => (
              <div key={r.id} className="card" style={{ borderLeft: '4px solid var(--border-hover)', background: 'var(--bg-secondary)', padding: '28px' }}>
                <p style={{ fontStyle: 'italic', fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
                  "{r.content}"
                </p>
                <strong style={{ color: 'var(--text-primary)' }}>{r.giver_name}</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>{r.giver_title}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- VISITORS CONTACT & PEER RECOMMENDATION FORMS --- */}
      <section className="grid grid-cols-2" style={{ gap: '32px', marginBottom: '8px', textAlign: 'left' }}>
        
        {/* Contact Form */}
        {settings.show_email_form !== 0 && (
          <div className="card" style={{ padding: '36px' }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem', fontWeight: 800 }}>
              <MessageSquare size={20} style={{ color: 'var(--text-secondary)' }} /> Contact Developer
            </h3>
            
            {msgFeedback.text && (
              <div className="alert alert-success" style={{ marginBottom: '20px' }}>
                {msgFeedback.text}
              </div>
            )}

            <form onSubmit={handleMessageSubmit}>
              <div className="form-group">
                <input 
                  type="text" 
                  placeholder="Your Name" 
                  value={msgForm.name}
                  onChange={(e) => setMsgForm({ ...msgForm, name: e.target.value })}
                  required 
                />
              </div>
              <div className="form-group">
                <input 
                  type="email" 
                  placeholder="Your Email" 
                  value={msgForm.email}
                  onChange={(e) => setMsgForm({ ...msgForm, email: e.target.value })}
                  required 
                />
              </div>
              <div className="form-group">
                <input 
                  type="text" 
                  placeholder="Subject" 
                  value={msgForm.subject}
                  onChange={(e) => setMsgForm({ ...msgForm, subject: e.target.value })}
                />
              </div>
              <div className="form-group">
                <textarea 
                  placeholder="Your Message content..." 
                  rows={4} 
                  value={msgForm.content}
                  onChange={(e) => setMsgForm({ ...msgForm, content: e.target.value })}
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary w-full" style={{ height: '48px', fontSize: '1rem', marginTop: '8px' }}>
                Send Message <Send size={15} />
              </button>
            </form>
          </div>
        )}

        {/* Peer Recommendation Input (If Authenticated User) */}
        <div className="card" style={{ padding: '36px' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem', fontWeight: 800 }}>
            <ThumbsUp size={20} style={{ color: 'var(--text-secondary)' }} /> Submit Recommendation
          </h3>
          {user ? (
            user.username !== username ? (
              settings.allow_recommendations !== 0 ? (
                <form onSubmit={handleRecSubmit}>
                  {recFeedback && (
                    <div className="alert alert-success" style={{ marginBottom: '20px' }}>
                      {recFeedback}
                    </div>
                  )}
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
                    As a verified platform developer, you can write an endorsement detailing your peer collaboration experience.
                  </p>
                  <div className="form-group">
                    <textarea 
                      placeholder="Write an endorsement (e.g. Abhilash is a fantastic developer, highly detailed...)" 
                      rows={5}
                      value={recContent}
                      onChange={(e) => setRecContent(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-secondary w-full" style={{ height: '48px', fontSize: '1rem' }} disabled={submittingRec}>
                    {submittingRec ? 'Submitting...' : 'Request Verification & Post'}
                  </button>
                </form>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>This developer is currently not accepting recommendations.</p>
              )
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>You cannot submit recommendations on your own showcase.</p>
            )
          ) : (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Only registered developers on this platform can submit endorsements.
              </p>
              <Link to="/login" className="btn btn-secondary btn-sm" style={{ padding: '10px 24px' }}>
                Sign In to Endorse
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* --- DETAIL PROJECT SHOWCASE MODAL --- */}
      {activeProject && (
        <div className="modal-overlay" onClick={() => setActiveProject(null)}>
          <div 
            className="modal-content animate-fade-in" 
            style={{ 
              maxWidth: '820px', 
              width: '100%', 
              backgroundColor: 'var(--bg-secondary)',
              padding: '36px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{activeProject.title}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveProject(null)}>Close</button>
            </div>

            <div style={{ height: '320px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px', border: '1px solid var(--border-color)' }}>
              <Briefcase size={64} style={{ color: 'rgba(255,255,255,0.06)' }} />
            </div>

            <h4 style={{ marginBottom: '10px', fontSize: '1.1rem', fontWeight: 700 }}>Project Overview</h4>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.7, fontSize: '0.95rem' }}>
              {activeProject.long_description || activeProject.description}
            </p>

            <h4 style={{ marginBottom: '10px', fontSize: '1.1rem', fontWeight: 700 }}>Technologies Employed</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
              {safeParseTechStack(activeProject.tech_stack).map(t => (
                <span key={t} className="badge badge-primary" style={{ fontSize: '0.8rem' }}>{t}</span>
              ))}
            </div>

            <div className="flex gap-3" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
              {activeProject.live_url && (
                <a href={activeProject.live_url} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ height: '44px', borderRadius: 'var(--radius-sm)' }}>
                  Launch Live Prototype
                </a>
              )}
              {activeProject.github_url && (
                <a href={activeProject.github_url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ height: '44px', borderRadius: 'var(--radius-sm)' }}>
                  Inspect GitHub Repository
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="app-footer">
        {profile.footer_text || `© 2026 ${username}. All rights reserved.`}
      </footer>
    </div>
  );
}
