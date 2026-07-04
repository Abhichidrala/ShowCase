import React, { useEffect, useState } from 'react';

// Safe JSON parse for tech_stack
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

function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  // Relative paths served through Vite proxy to backend /uploads
  return url;
}
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import { 
  BarChart2, User, Briefcase, Award, MessageSquare, 
  ThumbsUp, Shield, LogOut, Check, Trash2, Plus, 
  Eye, Settings, Save, Sparkles, Star, Moon, Globe, Copy, RefreshCw
} from 'lucide-react';

export default function DashboardOverview() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Tab 1: Profile & Customization state
  const [profile, setProfile] = useState({});
  const [settings, setSettings] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null);
  const [themesList, setThemesList] = useState([]);

  // Tab 2: Projects CRUD state
  const [projects, setProjects] = useState([]);
  const [newProject, setNewProject] = useState({ title: '', description: '', long_description: '', tech_stack: '', live_url: '', github_url: '', featured: false });
  const [projectFile, setProjectFile] = useState(null);
  const [editProjectId, setEditProjectId] = useState(null);

  // Tab 3: Skills CRUD state
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState({ name: '', category: 'Frontend', proficiency: 80 });

  // Tab 4: Messages Inbox
  const [messages, setMessages] = useState([]);

  // Tab 5: Recommendations
  const [recommendations, setRecommendations] = useState([]);

  // Tab 6: 2FA Setup state
  const [twoFactorSecret, setTwoFactorSecret] = useState(null);
  const [twoFactorQr, setTwoFactorQr] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [current2FAEnabled, setCurrent2FAEnabled] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState('');

  // Fetch summary and tab details
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: statsRes } = await apiService.dashboard.getSummary();
      setStats(statsRes);

      // Load Profile & Settings
      const { data: profRes } = await apiService.dashboard.getProfile();
      setProfile(profRes.profile || {});
      setSettings(profRes.settings || {});
      setCurrent2FAEnabled(!!(profRes.profile?.two_factor_enabled));

      // Load Projects
      const { data: projRes } = await apiService.dashboard.getProjects();
      setProjects(projRes);

      // Load Skills
      const { data: skillRes } = await apiService.dashboard.getSkills();
      setSkills(skillRes);

      // Load Messages
      const { data: msgRes } = await apiService.dashboard.getMessages();
      setMessages(msgRes);

      // Load Recommendations
      const { data: recRes } = await apiService.dashboard.getRecommendations();
      setRecommendations(recRes);

      // Load themes list
      const { data: themeRes } = await apiService.dashboard.getThemes();
      setThemesList(themeRes);

    } catch (e) {
      console.error(e);
      showMsg('Failed to load dashboard data. Please try again.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 5000);
  };

  // Profile Save
  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(profile).forEach(key => {
        if (profile[key] !== null && profile[key] !== undefined) {
          formData.append(key, profile[key]);
        }
      });
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      await apiService.dashboard.updateProfile(formData);
      await apiService.dashboard.updateSettings(settings);
      showMsg('Profile customizations saved successfully.');
      fetchDashboardData();
      
      setAvatarFile(null);
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
        setAvatarPreviewUrl(null);
      }
    } catch (err) {
      showMsg(err.response?.data?.error || 'Failed to save profile changes.', 'danger');
    }
  };

  // Project CRUD Actions
  const handleProjectCreate = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(newProject).forEach(key => {
        formData.append(key, newProject[key]);
      });
      if (projectFile) {
        formData.append('image', projectFile);
      }

      if (editProjectId) {
        await apiService.dashboard.updateProject(editProjectId, formData);
        showMsg('Project updated successfully.');
      } else {
        await apiService.dashboard.createProject(formData);
        showMsg('Project created successfully.');
      }

      // Reset
      setNewProject({ title: '', description: '', long_description: '', tech_stack: '', live_url: '', github_url: '', featured: false });
      setProjectFile(null);
      setEditProjectId(null);
      
      const { data: projRes } = await apiService.dashboard.getProjects();
      setProjects(projRes);
    } catch (err) {
      showMsg(err.response?.data?.error || 'Failed to save project.', 'danger');
    }
  };

  const handleProjectEdit = (p) => {
    setEditProjectId(p.id);
    let techStr = '';
    try {
      techStr = Array.isArray(JSON.parse(p.tech_stack)) ? JSON.parse(p.tech_stack).join(', ') : '';
    } catch(e) {
      techStr = p.tech_stack || '';
    }
    setNewProject({
      title: p.title,
      description: p.description,
      long_description: p.long_description,
      tech_stack: techStr,
      live_url: p.live_url,
      github_url: p.github_url,
      featured: p.featured === 1
    });
    showMsg('Editing project details. Make modifications below.');
  };

  const handleProjectDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await apiService.dashboard.deleteProject(id);
      showMsg('Project removed successfully.');
      const { data: projRes } = await apiService.dashboard.getProjects();
      setProjects(projRes);
    } catch (err) {
      showMsg('Failed to delete project.', 'danger');
    }
  };

  // Skills actions
  const handleSkillAdd = async (e) => {
    e.preventDefault();
    try {
      await apiService.dashboard.createSkill(newSkill);
      setNewSkill({ name: '', category: 'Frontend', proficiency: 80 });
      showMsg('Skill added successfully.');
      const { data: skillRes } = await apiService.dashboard.getSkills();
      setSkills(skillRes);
    } catch (err) {
      showMsg('Failed to add skill.', 'danger');
    }
  };

  const handleSkillDelete = async (id) => {
    try {
      await apiService.dashboard.deleteSkill(id);
      showMsg('Skill deleted.');
      const { data: skillRes } = await apiService.dashboard.getSkills();
      setSkills(skillRes);
    } catch (err) {
      showMsg('Failed to delete skill.', 'danger');
    }
  };

  // Message Inbox Action
  const handleMsgRead = async (id) => {
    try {
      await apiService.dashboard.markMessageRead(id);
      showMsg('Message marked as read.');
      const { data: msgRes } = await apiService.dashboard.getMessages();
      setMessages(msgRes);
    } catch (e) {
      showMsg('Failed updating message.');
    }
  };

  const handleMsgDelete = async (id) => {
    try {
      await apiService.dashboard.deleteMessage(id);
      showMsg('Message deleted.');
      const { data: msgRes } = await apiService.dashboard.getMessages();
      setMessages(msgRes);
    } catch (e) {
      showMsg('Failed to delete message.');
    }
  };

  // Recommendation status action
  const handleRecStatus = async (id, status) => {
    try {
      await apiService.dashboard.updateRecommendationStatus(id, status);
      showMsg(`Recommendation ${status}.`);
      const { data: recRes } = await apiService.dashboard.getRecommendations();
      setRecommendations(recRes);
    } catch (e) {
      showMsg('Failed updating status.', 'danger');
    }
  };

  // 2FA Actions
  const handle2FASetup = async () => {
    try {
      const { data } = await apiService.auth.setup2FA();
      setTwoFactorSecret(data.secret);
      setTwoFactorQr(data.otpauthUrl);
      showMsg('TOTP secret generated. Verify the code to enable 2FA.');
    } catch (e) {
      showMsg('Failed to initialize 2FA setup.', 'danger');
    }
  };

  const handle2FAEnable = async (e) => {
    e.preventDefault();
    try {
      await apiService.auth.enable2FA(twoFactorCode);
      showMsg('2FA has been successfully activated!');
      setCurrent2FAEnabled(true);
      setTwoFactorSecret(null);
      setTwoFactorCode('');
    } catch (err) {
      showMsg(err.response?.data?.error || 'Invalid TOTP code.', 'danger');
    }
  };

  const handle2FADisable = async (e) => {
    e.preventDefault();
    try {
      await apiService.auth.disable2FA(disable2FAPassword);
      showMsg('2FA has been deactivated.');
      setCurrent2FAEnabled(false);
      setDisable2FAPassword('');
    } catch (err) {
      showMsg(err.response?.data?.error || 'Incorrect account password.', 'danger');
    }
  };

  if (loading) {
    return (
      <div className="container animate-fade-in" style={{ padding: '40px 0' }}>
        {/* Header Skeleton */}
        <header className="flex justify-between items-center" style={{ marginBottom: '32px' }}>
          <div>
            <div className="skeleton" style={{ width: '240px', height: '32px', marginBottom: '8px', borderRadius: 'var(--radius-sm)' }}></div>
            <div className="skeleton" style={{ width: '380px', height: '16px', borderRadius: 'var(--radius-sm)' }}></div>
          </div>
          <div className="flex gap-2">
            <div className="skeleton" style={{ width: '130px', height: '32px', borderRadius: 'var(--radius-sm)' }}></div>
            <div className="skeleton" style={{ width: '90px', height: '32px', borderRadius: 'var(--radius-sm)' }}></div>
          </div>
        </header>

        {/* Core Layout Skeleton */}
        <div className="grid" style={{ gridTemplateColumns: '240px 1fr' }}>
          {/* Sidebar Skeleton */}
          <aside className="card flex flex-col gap-2" style={{ padding: '16px', height: '300px' }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton" style={{ width: '100%', height: '38px', borderRadius: 'var(--radius-sm)' }}></div>
            ))}
          </aside>

          {/* Main Card Skeleton */}
          <main className="card" style={{ padding: '32px' }}>
            <div className="skeleton" style={{ width: '220px', height: '24px', marginBottom: '24px', borderRadius: 'var(--radius-sm)' }}></div>
            
            {/* Metrics Grid */}
            <div className="grid grid-cols-4" style={{ marginBottom: '32px' }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card text-center flex flex-col items-center gap-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <div className="skeleton" style={{ width: '40px', height: '28px', borderRadius: 'var(--radius-sm)' }}></div>
                  <div className="skeleton" style={{ width: '60px', height: '12px', borderRadius: 'var(--radius-sm)' }}></div>
                </div>
              ))}
            </div>

            {/* Large Card Graph Mock Skeleton */}
            <div className="card" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '32px' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
                <div className="skeleton" style={{ width: '200px', height: '20px', borderRadius: 'var(--radius-sm)' }}></div>
                <div className="skeleton" style={{ width: '120px', height: '20px', borderRadius: 'var(--radius-sm)' }}></div>
              </div>
              <div className="skeleton" style={{ width: '100%', height: '14px', marginBottom: '8px', borderRadius: 'var(--radius-sm)' }}></div>
              <div className="skeleton" style={{ width: '90%', height: '14px', marginBottom: '24px', borderRadius: 'var(--radius-sm)' }}></div>
              <div className="skeleton" style={{ width: '100%', height: '200px', borderRadius: 'var(--radius-sm)' }}></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ padding: '60px 0' }}>
      
      {/* --- DASHBOARD HEADER --- */}
      <header className="flex justify-between items-center" style={{ marginBottom: '40px', borderBottom: '1px solid var(--border-color)', paddingBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '6px' }}>Career Showcase Portal</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Welcome back, <strong style={{ color: 'var(--text-primary)' }}>@{user?.username}</strong> — {user?.role === 'super_admin' ? 'Platform Admin' : 'Developer Account'}</p>
        </div>
        <div className="flex gap-3">
          <a href={`/${user?.username}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ borderRadius: 'var(--radius-sm)' }}>
            <Eye size={15} /> Preview Portfolio
          </a>
          <button onClick={logout} className="btn btn-danger btn-sm" style={{ borderRadius: 'var(--radius-sm)' }}>
            <LogOut size={15} /> Logout
          </button>
        </div>
      </header>

      {/* --- MESSAGE BANNER --- */}
      {msg.text && (
        <div className="alert alert-success" style={{ marginBottom: '32px' }}>
          {msg.text}
        </div>
      )}

      {/* --- CORE DASHBOARD SECTION --- */}
      <div className="grid" style={{ gridTemplateColumns: '260px 1fr', gap: '32px' }}>
        
        {/* --- SIDEBAR MENU TABS --- */}
        <aside className="glass-panel flex flex-col gap-3" style={{ padding: '20px', height: 'fit-content' }}>
          {[
            { id: 'overview', label: 'Overview', icon: <BarChart2 size={18} /> },
            { id: 'profile', label: 'Profile & Themes', icon: <User size={18} /> },
            { id: 'projects', label: 'Projects CRUD', icon: <Briefcase size={18} /> },
            { id: 'skills', label: 'Skills Setup', icon: <Award size={18} /> },
            { id: 'messages', label: 'Inbox Messages', icon: <MessageSquare size={18} /> },
            { id: 'recommendations', label: 'Recommendations', icon: <ThumbsUp size={18} /> },
            { id: 'security', label: 'Security (2FA)', icon: <Shield size={18} /> },
          ].map(tab => (
            <button 
              key={tab.id}
              className={`btn w-full justify-between`}
              style={{
                background: activeTab === tab.id ? 'var(--primary-gradient)' : 'transparent',
                borderColor: activeTab === tab.id ? 'transparent' : 'rgba(255, 255, 255, 0.03)',
                color: activeTab === tab.id ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                padding: '12px 18px',
                borderRadius: 'var(--radius-sm)',
                boxShadow: activeTab === tab.id ? '0 4px 12px rgba(255, 255, 255, 0.08)' : 'none'
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{tab.label}</span>
              {tab.icon}
            </button>
          ))}
        </aside>

        {/* --- MAIN TAB CONTENT --- */}
        <main className="glass-panel" style={{ padding: '36px' }}>
          
          {/* TAB 1: OVERVIEW SUMMARY */}
          {activeTab === 'overview' && (
            <div>
              <h3 style={{ marginBottom: '28px', fontSize: '1.4rem', fontWeight: 800 }}>Performance Overview</h3>
              
              {/* Metrics Grid */}
              <div className="grid grid-cols-4" style={{ marginBottom: '36px', gap: '20px' }}>
                {[
                  { label: 'Total Views', value: stats?.pageViews, color: 'var(--text-primary)' },
                  { label: 'Followers', value: stats?.followers, color: 'var(--text-primary)' },
                  { label: 'Projects', value: stats?.projects, color: 'var(--text-primary)' },
                  { label: 'Unread Emails', value: stats?.messages, color: 'var(--text-primary)' }
                ].map(metric => (
                  <div key={metric.label} className="card text-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderColor: 'rgba(255,255,255,0.02)', padding: '20px' }}>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, color: metric.color, letterSpacing: '-0.02em', marginBottom: '4px' }}>
                      {metric.value}
                    </div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{metric.label}</label>
                  </div>
                ))}
              </div>

              {/* Analytics graph mock */}
              <div className="card" style={{ backgroundColor: 'rgba(255, 255, 255, 0.01)', padding: '32px' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Interactive Analytics Telemetry</h4>
                  <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>Live Tracking Active</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '28px' }}>
                  Our analytics track visitors visits, project link clicks, and download requests under strict hashed session privacy parameters. Keep building elements to grow your reach!
                </p>
                <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginTop: '24px' }}>
                  {/* Mock bar chart graph */}
                  <div style={{ flex: 1, background: 'linear-gradient(to top, #ffffff, #888888)', height: '40%', borderRadius: '4px 4px 0 0', boxShadow: '0 0 15px rgba(255, 255, 255, 0.05)' }}></div>
                  <div style={{ flex: 1, background: 'linear-gradient(to top, #ffffff, #888888)', height: '60%', borderRadius: '4px 4px 0 0', boxShadow: '0 0 15px rgba(255, 255, 255, 0.05)' }}></div>
                  <div style={{ flex: 1, background: 'linear-gradient(to top, #ffffff, #888888)', height: '55%', borderRadius: '4px 4px 0 0', boxShadow: '0 0 15px rgba(255, 255, 255, 0.05)' }}></div>
                  <div style={{ flex: 1, background: 'linear-gradient(to top, #dddddd, #555555)', height: '80%', borderRadius: '4px 4px 0 0', boxShadow: '0 0 15px rgba(255, 255, 255, 0.05)' }}></div>
                  <div style={{ flex: 1, background: 'linear-gradient(to top, #dddddd, #555555)', height: '70%', borderRadius: '4px 4px 0 0', boxShadow: '0 0 15px rgba(255, 255, 255, 0.05)' }}></div>
                  <div style={{ flex: 1, background: 'linear-gradient(to top, #aaaaaa, #222222)', height: '90%', borderRadius: '4px 4px 0 0', boxShadow: '0 0 15px rgba(255, 255, 255, 0.05)' }}></div>
                  <div style={{ flex: 1, background: 'linear-gradient(to top, #aaaaaa, #222222)', height: '95%', borderRadius: '4px 4px 0 0', boxShadow: '0 0 15px rgba(255, 255, 255, 0.05)' }}></div>
                </div>
                <div className="flex justify-between" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '12px', fontWeight: 500 }}>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE & THEMES */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSave}>
              <h3 style={{ marginBottom: '24px' }}>Customize Profile & Theme Style</h3>
              
              <div className="form-group" style={{ marginBottom: '28px' }}>
                <label>Profile Avatar Picture</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginTop: '8px' }}>
                  <img 
                    src={avatarPreviewUrl || resolveImageUrl(profile.avatar_url) || `https://api.dicebear.com/9.x/adventurer/svg?seed=${user?.username}&skinColor=f8d9b2`} 
                    alt="Avatar Preview" 
                    className="avatar"
                    style={{ width: '56px', height: '56px' }}
                  />
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setAvatarFile(file);
                          if (avatarPreviewUrl) {
                            URL.revokeObjectURL(avatarPreviewUrl);
                          }
                          setAvatarPreviewUrl(URL.createObjectURL(file));
                        }
                      }}
                      style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                      PNG, JPG, or SVG. Staged changes preview instantly. Click "Save Customizations" to submit.
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2">
                <div className="form-group">
                  <label>Portfolio Site Name</label>
                  <input 
                    type="text" 
                    value={profile.site_title || ''}
                    onChange={(e) => setProfile({ ...profile, site_title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Public Professional Title</label>
                  <input 
                    type="text" 
                    value={profile.hero_subtitle || ''} 
                    onChange={(e) => setProfile({ ...profile, hero_subtitle: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Intro Welcome Message (Hero Title)</label>
                <input 
                  type="text" 
                  value={profile.hero_title || ''} 
                  onChange={(e) => setProfile({ ...profile, hero_title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Elevator Pitch (Hero description)</label>
                <textarea 
                  rows={2} 
                  value={profile.hero_description || ''}
                  onChange={(e) => setProfile({ ...profile, hero_description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Detailed About Bio (Supports Markdown)</label>
                <textarea 
                  rows={4} 
                  value={profile.about_bio || ''}
                  onChange={(e) => setProfile({ ...profile, about_bio: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2">
                <div className="form-group">
                  <label>Profile Accent Color</label>
                  <input 
                    type="color" 
                    value={profile.accent_color || '#3b82f6'} 
                    onChange={(e) => setProfile({ ...profile, accent_color: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Portfolio Access Theme</label>
                  <select 
                    value={profile.theme_id || ''}
                    onChange={(e) => setProfile({ ...profile, theme_id: e.target.value })}
                  >
                    <option value="">Default Classic Dark</option>
                    {themesList.map(t => (
                      <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2">
                <div className="form-group">
                  <label>SEO Title Tag</label>
                  <input 
                    type="text" 
                    value={settings.seo_title || ''}
                    onChange={(e) => setSettings({ ...settings, seo_title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Custom Showcase Domain Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. yourname.codes"
                    value={settings.custom_domain || ''}
                    onChange={(e) => setSettings({ ...settings, custom_domain: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: '24px' }}>
                <button type="submit" className="btn btn-primary">
                  <Save size={16} /> Save Customizations
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: PROJECTS CRUD */}
          {activeTab === 'projects' && (
            <div>
              <h3 style={{ marginBottom: '24px' }}>
                {editProjectId ? 'Edit Project Details' : 'Add New Portfolio Project'}
              </h3>
              
              <form onSubmit={handleProjectCreate} style={{ marginBottom: '40px' }}>
                <div className="grid grid-cols-2">
                  <div className="form-group">
                    <label>Project Title</label>
                    <input 
                      type="text" 
                      value={newProject.title}
                      onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Technologies Used (comma separated)</label>
                    <input 
                      type="text" 
                      placeholder="React, TypeScript, AWS"
                      value={newProject.tech_stack}
                      onChange={(e) => setNewProject({ ...newProject, tech_stack: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Brief Description (Card Text)</label>
                  <input 
                    type="text" 
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Long Project Documentation (Supports Markdown)</label>
                  <textarea 
                    rows={4}
                    value={newProject.long_description}
                    onChange={(e) => setNewProject({ ...newProject, long_description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2">
                  <div className="form-group">
                    <label>Live URL</label>
                    <input 
                      type="url" 
                      value={newProject.live_url}
                      onChange={(e) => setNewProject({ ...newProject, live_url: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>GitHub Repository URL</label>
                    <input 
                      type="url" 
                      value={newProject.github_url}
                      onChange={(e) => setNewProject({ ...newProject, github_url: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4" style={{ margin: '12px 0 24px' }}>
                  <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={newProject.featured}
                      onChange={(e) => setNewProject({ ...newProject, featured: e.target.checked })}
                      style={{ width: 'auto' }}
                    />
                    <span>Highlight Project as Featured</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary">
                    {editProjectId ? 'Update Project' : 'Publish Project'}
                  </button>
                  {editProjectId && (
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditProjectId(null);
                        setNewProject({ title: '', description: '', long_description: '', tech_stack: '', live_url: '', github_url: '', featured: false });
                      }}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>

              <h4>Current Projects ({projects.length})</h4>
              <div className="table-container" style={{ marginTop: '16px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Featured</th>
                      <th>Stack</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map(p => (
                      <tr key={p.id}>
                        <td><strong>{p.title}</strong></td>
                        <td>{p.featured === 1 ? <span className="badge badge-primary">Featured</span> : 'No'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {safeParseTechStack(p.tech_stack).slice(0, 2).map(t => (
                              <span key={t} className="badge">{t}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={() => handleProjectEdit(p)} className="btn btn-secondary btn-sm">Edit</button>
                          <button onClick={() => handleProjectDelete(p.id)} className="btn btn-danger btn-sm"><Trash2 size={12} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SKILLS */}
          {activeTab === 'skills' && (
            <div>
              <h3 style={{ marginBottom: '24px' }}>Skills & Core Proficiencies</h3>
              <form onSubmit={handleSkillAdd} className="flex gap-2 items-center" style={{ marginBottom: '32px' }}>
                <input 
                  type="text" 
                  placeholder="Skill name, e.g. React"
                  value={newSkill.name} 
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  required
                />
                <select 
                  value={newSkill.category}
                  onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
                  style={{ width: '180px' }}
                >
                  <option value="Frontend">Frontend</option>
                  <option value="Backend">Backend</option>
                  <option value="DevOps">DevOps</option>
                  <option value="Design">Design</option>
                </select>
                <div style={{ width: '150px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="range" 
                    min="10" max="100" step="5"
                    className="slider"
                    value={newSkill.proficiency}
                    onChange={(e) => setNewSkill({ ...newSkill, proficiency: parseInt(e.target.value) })}
                  />
                  <span>{newSkill.proficiency}%</span>
                </div>
                <button type="submit" className="btn btn-primary"><Plus size={16} /> Add</button>
              </form>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Skill</th>
                      <th>Category</th>
                      <th>Proficiency</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skills.map(s => (
                      <tr key={s.id}>
                        <td>{s.name}</td>
                        <td><span className="badge">{s.category}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${s.proficiency}%`, height: '100%', backgroundColor: 'var(--primary-color)' }}></div>
                            </div>
                            <span>{s.proficiency}%</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => handleSkillDelete(s.id)} className="btn btn-danger btn-sm"><Trash2 size={12} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: MESSAGES */}
          {activeTab === 'messages' && (
            <div>
              <h3 style={{ marginBottom: '24px' }}>Visitor Contact Inbox ({messages.length})</h3>
              {messages.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Your inbox is currently empty.</p>}
              <div className="flex flex-col gap-4">
                {messages.map(m => (
                  <div key={m.id} className="card" style={{ 
                    textAlign: 'left', 
                    borderLeft: `3px solid ${m.is_read === 0 ? 'var(--accent-color)' : 'var(--border-color)'}`,
                    backgroundColor: m.is_read === 0 ? 'rgba(255, 255, 255, 0.03)' : undefined
                  }}>
                    <div className="flex justify-between items-center" style={{ marginBottom: '8px' }}>
                      <strong>{m.sender_name} ({m.sender_email})</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      <strong>Subject:</strong> {m.subject || '(No Subject)'}
                    </div>
                    <p style={{ fontSize: '0.95rem', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{m.content}</p>
                    
                    <div className="flex gap-2" style={{ marginTop: '16px', justifyContent: 'flex-end' }}>
                      {m.is_read === 0 && (
                        <button onClick={() => handleMsgRead(m.id)} className="btn btn-secondary btn-sm">Mark Read</button>
                      )}
                      <button onClick={() => handleMsgDelete(m.id)} className="btn btn-danger btn-sm"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: RECOMMENDATIONS */}
          {activeTab === 'recommendations' && (
            <div>
              <h3 style={{ marginBottom: '24px' }}>Peer Recommendations Requests</h3>
              {recommendations.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No recommendations found.</p>}
              <div className="flex flex-col gap-4">
                {recommendations.map(r => (
                  <div key={r.id} className="card" style={{ textAlign: 'left' }}>
                    <div className="flex justify-between items-center" style={{ marginBottom: '8px' }}>
                      <div>
                        <strong>{r.giver_name}</strong>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.giver_title}</p>
                      </div>
                      <span className={`badge badge-${r.status === 'approved' ? 'success' : (r.status === 'pending' ? 'primary' : 'danger')}`}>
                        {r.status.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      "{r.content}"
                    </p>
                    {r.status === 'pending' && (
                      <div className="flex gap-2" style={{ marginTop: '16px', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleRecStatus(r.id, 'approved')} className="btn btn-primary btn-sm"><Check size={12} /> Approve</button>
                        <button onClick={() => handleRecStatus(r.id, 'rejected')} className="btn btn-danger btn-sm">Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: 2FA SECURITY */}
          {activeTab === 'security' && (
            <div>
              <h3 style={{ marginBottom: '24px' }}>Two-Factor Authentication Security (2FA)</h3>
              
              {current2FAEnabled ? (
                /* --- DISABLE 2FA FORM --- */
                <form onSubmit={handle2FADisable} className="card" style={{ maxWidth: '400px', backgroundColor: 'var(--bg-tertiary)' }}>
                  <p style={{ color: 'var(--success)', fontWeight: 600, marginBottom: '16px' }}>
                    ✓ 2FA is currently active on your account.
                  </p>
                  <div className="form-group">
                    <label>Confirm Password to Deactivate</label>
                    <input 
                      type="password" 
                      value={disable2FAPassword}
                      onChange={(e) => setDisable2FAPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-danger w-full" style={{ marginTop: '8px' }}>
                    Disable 2FA Security
                  </button>
                </form>
              ) : (
                /* --- ENABLE 2FA FLOW --- */
                <div>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    Adding 2FA protects your account by requiring an authenticator code (Google Authenticator, Authy, etc.) during login.
                  </p>
                  
                  {!twoFactorSecret ? (
                    <button onClick={handle2FASetup} className="btn btn-primary">
                      Initialize 2FA Configuration
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="card text-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <h4 style={{ marginBottom: '12px' }}>1. Scan QR Code</h4>
                        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: 'var(--radius-sm)', display: 'inline-block', marginBottom: '12px' }}>
                          {/* Simulated QR Code for simple local verification */}
                          <div style={{ width: '150px', height: '150px', border: '5px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800 }}>
                            QR CODE (TOTP)
                          </div>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Scan using Authy, Google Authenticator, or generic TOTP generators.
                        </p>
                        <div style={{ marginTop: '12px' }}>
                          <code style={{ fontSize: '0.8rem' }}>Secret: {twoFactorSecret}</code>
                        </div>
                      </div>

                      <div className="card" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <h4 style={{ marginBottom: '12px' }}>2. Enter Code to Enable</h4>
                        <form onSubmit={handle2FAEnable}>
                          <div className="form-group">
                            <label>Authenticator verification token</label>
                            <input 
                              type="text" 
                              placeholder="000000" 
                              maxLength={6}
                              value={twoFactorCode}
                              onChange={(e) => setTwoFactorCode(e.target.value)}
                              required
                            />
                          </div>
                          <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '12px' }}>
                            Verify & Activate
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
