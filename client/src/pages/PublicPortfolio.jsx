import React, { useEffect, useState } from 'react';
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
    <div className="container animate-fade-in" style={{ paddingTop: '40px' }}>
      
      {/* --- HERO / PORTFOLIO HEADER --- */}
      <section className="card flex justify-between items-center" style={{ marginBottom: '40px', flexWrap: 'wrap', gap: '24px' }}>
        <div className="flex items-center gap-4" style={{ flexWrap: 'wrap', textAlign: 'left' }}>
          <img
            src={profile.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`}
            alt={username}
            style={{ width: '100px', height: '100px', borderRadius: '50%', border: `3px solid ${profile.accent_color}` }}
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 style={{ fontSize: '2rem' }}>{profile.site_title || username}</h2>
              <span className="badge badge-primary">@{username}</span>
            </div>
            <p style={{ fontSize: '1.1rem', color: 'var(--accent-color)', fontWeight: 600, marginTop: '4px' }}>
              {profile.hero_subtitle || 'Creative Software Engineer'}
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {followersCount} Followers
            </p>
          </div>
        </div>

        {/* Social interactions */}
        <div className="flex gap-2">
          {user && user.username !== username && (
            <button onClick={handleFollowToggle} className={`btn btn-${isFollowing ? 'secondary' : 'primary'}`}>
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
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {socialLinks.map(link => (
              <a 
                key={link.id} 
                href={link.url} 
                target="_blank" 
                rel="noreferrer" 
                className="btn btn-secondary" 
                style={{ padding: '8px' }}
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
      <section className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '32px', marginBottom: '40px' }}>
        
        {/* Main Bio Pitch */}
        <div className="card flex flex-col justify-center" style={{ textAlign: 'left' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--accent-color)' }}>
            {profile.hero_title || `Welcome to my showcase`}
          </h3>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '16px' }}>
            {profile.hero_description}
          </p>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
            {profile.about_bio}
          </p>
        </div>

        {/* Skills Categories list */}
        <div className="card" style={{ textAlign: 'left' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>Key Skills</h3>
          <div className="flex flex-col gap-4">
            {skills.map(s => (
              <div key={s.id}>
                <div className="flex justify-between" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                  <span>{s.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{s.proficiency}%</span>
                </div>
                <div style={{ height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${s.proficiency}%`, height: '100%', backgroundColor: profile.accent_color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- BEHANCE STYLE PROJECT DIRECTORY --- */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ textAlign: 'left', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Briefcase style={{ color: profile.accent_color }} /> Projects Showcase
        </h2>
        
        <div className="grid grid-cols-3">
          {projects.map(p => (
            <div 
              key={p.id} 
              className="card card-hover flex flex-col justify-between" 
              style={{ padding: 0, overflow: 'hidden', textAlign: 'left', cursor: 'pointer' }}
              onClick={() => handleProjectClick(p)}
            >
              <div style={{ height: '160px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={48} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '8px' }}>{p.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.description}
                </p>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '12px' }}>
                  {JSON.parse(p.tech_stack || '[]').slice(0, 3).map(tech => (
                    <span key={tech} className="badge">{tech}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- EXPERIENCE & EDUCATION TIMELINES --- */}
      <section className="grid grid-cols-2" style={{ gap: '32px', marginBottom: '40px', textAlign: 'left' }}>
        
        {/* Experience Timeline */}
        <div className="card">
          <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} style={{ color: profile.accent_color }} /> Professional Experience
          </h3>
          <div className="flex flex-col gap-6" style={{ borderLeft: '2px solid var(--border-color)', paddingLeft: '16px' }}>
            {experience.map(e => (
              <div key={e.id} style={{ position: 'relative' }}>
                {/* Timeline node */}
                <div style={{ position: 'absolute', left: '-25px', top: '5px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: profile.accent_color }} />
                
                <h4 style={{ fontSize: '1.1rem' }}>{e.role}</h4>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '2px 0 6px' }}>
                  <strong>{e.company}</strong> | {e.start_date} - {e.is_current === 1 ? 'Present' : e.end_date}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{e.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Education Timeline */}
        <div className="card">
          <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} style={{ color: profile.accent_color }} /> Academic & Certifications
          </h3>
          
          <div className="flex flex-col gap-4">
            {education.map(edu => (
              <div key={edu.id} style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '1.05rem' }}>{edu.degree} in {edu.field_of_study}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {edu.institution} | {edu.start_date} - {edu.end_date}
                </p>
              </div>
            ))}

            {certificates.map(cert => (
              <div key={cert.id} className="flex justify-between items-center" style={{ paddingTop: '8px' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem' }}>{cert.title}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Issuer: {cert.issuer} ({cert.issue_date})</p>
                </div>
                {cert.credential_url && (
                  <a href={cert.credential_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                    Verify
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- RECOMMENDATIONS CAROUSEL/LIST --- */}
      <section style={{ marginBottom: '40px', textAlign: 'left' }}>
        <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ThumbsUp style={{ color: profile.accent_color }} /> Peer Endorsements & Recommendations
        </h2>
        
        {recommendations.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No recommendations published yet.</p>
        ) : (
          <div className="grid grid-cols-2">
            {recommendations.map(r => (
              <div key={r.id} className="card" style={{ borderLeft: `3px solid ${profile.accent_color}` }}>
                <p style={{ fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  "{r.content}"
                </p>
                <strong>{r.giver_name}</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.giver_title}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* --- VISITORS CONTACT & PEER RECOMMENDATION FORMS --- */}
      <section className="grid grid-cols-2" style={{ gap: '32px', marginBottom: '8px', textAlign: 'left' }}>
        
        {/* Contact Form */}
        {settings.show_email_form !== 0 && (
          <div className="card">
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} style={{ color: profile.accent_color }} /> Contact Developer
            </h3>
            
            {msgFeedback.text && (
              <div style={{ 
                backgroundColor: msgFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: msgFeedback.type === 'success' ? 'var(--success)' : 'var(--danger)',
                padding: '10px', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '16px'
              }}>
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
                  rows={3} 
                  value={msgForm.content}
                  onChange={(e) => setMsgForm({ ...msgForm, content: e.target.value })}
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary w-full">
                Send Message <Send size={14} />
              </button>
            </form>
          </div>
        )}

        {/* Peer Recommendation Input (If Authenticated User) */}
        <div className="card">
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ThumbsUp size={18} style={{ color: profile.accent_color }} /> Submit Recommendation
          </h3>
          {user ? (
            user.username !== username ? (
              settings.allow_recommendations !== 0 ? (
                <form onSubmit={handleRecSubmit}>
                  {recFeedback && (
                    <div style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--success)', padding: '10px', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '16px' }}>
                      {recFeedback}
                    </div>
                  )}
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    As a verified platform developer, you can write an endorsement detailing your peer collaboration experience.
                  </p>
                  <div className="form-group">
                    <textarea 
                      placeholder="Write an endorsement (e.g. Abhilash is a fantastic developer, highly detailed...)" 
                      rows={4}
                      value={recContent}
                      onChange={(e) => setRecContent(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-secondary w-full" disabled={submittingRec}>
                    {submittingRec ? 'Submitting...' : 'Request Verification & Post'}
                  </button>
                </form>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>This developer is currently not accepting recommendations.</p>
              )
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>You cannot submit recommendations on your own showcase.</p>
            )
          ) : (
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Only registered developers on this platform can submit endorsements.
              </p>
              <Link to="/login" className="btn btn-secondary btn-sm">
                Sign In to Endorse
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* --- DETAIL PROJECT SHOWCASE MODAL --- */}
      {activeProject && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', zIndex: 100, padding: '24px'
        }} onClick={() => setActiveProject(null)}>
          <div 
            className="card animate-fade-in" 
            style={{ 
              maxWidth: '800px', width: '100%', maxHeight: '90vh', 
              overflowY: 'auto', textAlign: 'left', backgroundColor: 'var(--bg-secondary)' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <h2 style={{ fontSize: '1.6rem' }}>{activeProject.title}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveProject(null)}>Close</button>
            </div>

            <div style={{ height: '300px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <Briefcase size={64} style={{ color: 'var(--text-muted)' }} />
            </div>

            <h4 style={{ marginBottom: '8px' }}>Project Overview</h4>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              {activeProject.long_description || activeProject.description}
            </p>

            <h4 style={{ marginBottom: '8px' }}>Technologies Employed</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
              {JSON.parse(activeProject.tech_stack || '[]').map(t => (
                <span key={t} className="badge badge-primary">{t}</span>
              ))}
            </div>

            <div className="flex gap-2" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              {activeProject.live_url && (
                <a href={activeProject.live_url} target="_blank" rel="noreferrer" className="btn btn-primary">
                  Launch Live Prototype
                </a>
              )}
              {activeProject.github_url && (
                <a href={activeProject.github_url} target="_blank" rel="noreferrer" className="btn btn-secondary">
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
