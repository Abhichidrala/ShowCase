const bcrypt = require('bcryptjs');
const { initDb, dbRun, dbGet } = require('../../server/config/db');

async function seed() {
  console.log('🔄 Initializing database tables...');
  await initDb();
  console.log('✅ Tables initialized.');

  // Clean old data to avoid duplicates
  console.log('🧹 Cleaning old records...');
  const tables = [
    'users', 'profiles', 'projects', 'skills', 'experience', 'education', 
    'certificates', 'achievements', 'blogs', 'social_links', 'themes', 
    'portfolio_settings', 'followers', 'recommendations', 'notifications', 
    'messages', 'analytics', 'sessions', 'audit_logs'
  ];
  
  for (const table of tables) {
    try {
      await dbRun(`DELETE FROM ${table}`);
      // Reset autoincrement sequence
      await dbRun(`DELETE FROM sqlite_sequence WHERE name='${table}'`);
    } catch (e) {
      // Ignore if table doesn't support autoincrement or similar
    }
  }
  console.log('✅ Clean complete.');

  // 1. Seed Themes
  console.log('🎨 Seeding Themes...');
  const themes = [
    {
      name: 'classic-dark',
      config: JSON.stringify({
        background: '#0f172a',
        text: '#f8fafc',
        cardBg: '#1e293b',
        borderColor: '#334155',
        accentColor: '#3b82f6',
        fontFamily: 'Inter, sans-serif',
        glassmorphic: false
      })
    },
    {
      name: 'glassmorphic',
      config: JSON.stringify({
        background: 'radial-gradient(circle at top left, #1e1b4b, #03001e)',
        text: '#f8fafc',
        cardBg: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        accentColor: '#818cf8',
        fontFamily: 'Outfit, sans-serif',
        glassmorphic: true,
        blur: '12px'
      })
    },
    {
      name: 'neo-brutalism',
      config: JSON.stringify({
        background: '#fef08a',
        text: '#171717',
        cardBg: '#ffffff',
        borderColor: '#171717',
        accentColor: '#ff0055',
        fontFamily: 'Space Grotesk, sans-serif',
        borderWidth: '3px',
        shadowOffset: '6px'
      })
    },
    {
      name: 'minimalist',
      config: JSON.stringify({
        background: '#fafafa',
        text: '#171717',
        cardBg: '#ffffff',
        borderColor: '#e5e7eb',
        accentColor: '#171717',
        fontFamily: 'Courier New, monospace',
        flat: true
      })
    }
  ];

  for (const t of themes) {
    await dbRun('INSERT INTO themes (name, config) VALUES (?, ?)', [t.name, t.config]);
  }
  
  // Get theme IDs
  const classicDarkTheme = await dbGet('SELECT id FROM themes WHERE name = "classic-dark"');
  const glassmorphicTheme = await dbGet('SELECT id FROM themes WHERE name = "glassmorphic"');

  // 2. Seed Users
  console.log('👥 Seeding Users...');
  const passwordHash = bcrypt.hashSync('admin123', 12);
  const userPasswordHash = bcrypt.hashSync('qwertyuiop', 12);

  const adminResult = await dbRun(
    'INSERT INTO users (username, email, password_hash, role, is_verified) VALUES (?, ?, ?, ?, ?)',
    ['admin', 'admin@platform.com', passwordHash, 'super_admin', 1]
  );
  const adminId = adminResult.id;

  const abhiResult = await dbRun(
    'INSERT INTO users (username, email, password_hash, role, is_verified) VALUES (?, ?, ?, ?, ?)',
    ['abhiiii', 'abhi@example.com', userPasswordHash, 'user', 1]
  );
  const abhiId = abhiResult.id;

  const johnResult = await dbRun(
    'INSERT INTO users (username, email, password_hash, role, is_verified) VALUES (?, ?, ?, ?, ?)',
    ['john', 'john@example.com', userPasswordHash, 'user', 1]
  );
  const johnId = johnResult.id;

  const elonResult = await dbRun(
    'INSERT INTO users (username, email, password_hash, role, is_verified) VALUES (?, ?, ?, ?, ?)',
    ['elon', 'elon@example.com', userPasswordHash, 'user', 1]
  );
  const elonId = elonResult.id;

  // 3. Seed Profiles
  console.log('👤 Seeding Profiles...');
  await dbRun(
    `INSERT INTO profiles (user_id, site_title, site_description, hero_title, hero_subtitle, hero_description, about_bio, email, theme_id, accent_color, accent_gradient, footer_text)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      adminId,
      'System Admin | Career Showcase',
      'System moderation and dashboard controls.',
      'Platform Admin Control',
      'Super Admin User',
      'Overseeing user profiles and showcase directories.',
      'System Administrator responsible for moderation, settings, and database management.',
      'admin@platform.com',
      classicDarkTheme.id,
      '#ef4444',
      'linear-gradient(135deg, #ef4444, #b91c1c)',
      '© 2026 Platform Admin. All rights reserved.'
    ]
  );

  await dbRun(
    `INSERT INTO profiles (user_id, site_title, site_description, hero_title, hero_subtitle, hero_description, about_bio, email, theme_id, accent_color, accent_gradient, footer_text, avatar_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      abhiId,
      'Abhilash | Creative Full Stack Developer',
      'Sleek portfolios and highly performant web application builder.',
      "Hi, I'm Abhilash",
      'Creative Technologist & Full-Stack Developer',
      'I design, build, and deploy visually stunning web solutions that optimize scale and user interaction.',
      'A software developer with 5+ years of experience in JavaScript frameworks, cloud operations, and responsive web design. I love bridging the gap between aesthetics and function.',
      'hello@example.com',
      glassmorphicTheme.id,
      '#818cf8',
      'linear-gradient(135deg, #818cf8, #c084fc)',
      '© 2026 Abhilash. Built with React & SQLite.',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=abhi'
    ]
  );

  await dbRun(
    `INSERT INTO profiles (user_id, site_title, site_description, hero_title, hero_subtitle, hero_description, about_bio, email, theme_id, accent_color, accent_gradient, footer_text, avatar_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      johnId,
      'John | UI/UX Designer',
      'Designing clean user flows and premium design systems.',
      'Design is thinking made visual',
      'Lead UI/UX Designer',
      'Providing intuitive structures for modern digital assets.',
      'Specializing in wireframing, high fidelity screens, and premium interactive prototypes.',
      'john@example.com',
      classicDarkTheme.id,
      '#f59e0b',
      'linear-gradient(135deg, #f59e0b, #ef4444)',
      '© 2026 John. Designing the future.',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=john'
    ]
  );

  // 4. Seed Projects
  console.log('💻 Seeding Projects...');
  const abhiProjects = [
    {
      title: 'CloudSync Dashboard',
      slug: 'cloudsync-dashboard',
      description: 'Real-time cloud monitoring and telemetry analyzer.',
      long_description: 'Built to aggregate telemetry metrics from multiple AWS endpoints in real-time. Features include socket-driven charts, customizable alarm thresholds, and full team management panels.',
      tech_stack: JSON.stringify(['React', 'Node.js', 'WebSocket', 'Redis', 'PostgreSQL']),
      live_url: 'https://example.com/cloudsync',
      github_url: 'https://github.com/abhi/cloudsync',
      featured: 1,
      sort_order: 1
    },
    {
      title: 'AI Content Studio',
      slug: 'ai-content-studio',
      description: 'SEO analyzer and copy assistant powered by GPT-4.',
      long_description: 'An assistant tool facilitating clean article creation with automated structure review, keyword optimization suggestions, and visual card previews.',
      tech_stack: JSON.stringify(['Next.js', 'Python', 'OpenAI API', 'TailwindCSS']),
      live_url: 'https://example.com/studio',
      github_url: 'https://github.com/abhi/studio',
      featured: 1,
      sort_order: 2
    }
  ];

  for (const p of abhiProjects) {
    await dbRun(
      `INSERT INTO projects (user_id, title, slug, description, long_description, tech_stack, live_url, github_url, featured, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [abhiId, p.title, p.slug, p.description, p.long_description, p.tech_stack, p.live_url, p.github_url, p.featured, p.sort_order]
    );
  }

  // 5. Seed Skills
  console.log('⚡ Seeding Skills...');
  const abhiSkills = [
    { name: 'JavaScript', category: 'Frontend', proficiency: 95, icon: 'JS', sort_order: 1 },
    { name: 'TypeScript', category: 'Frontend', proficiency: 88, icon: 'TS', sort_order: 2 },
    { name: 'React', category: 'Frontend', proficiency: 92, icon: 'Re', sort_order: 3 },
    { name: 'Node.js', category: 'Backend', proficiency: 90, icon: 'Node', sort_order: 4 },
    { name: 'Docker', category: 'DevOps', proficiency: 75, icon: 'Dk', sort_order: 5 }
  ];

  for (const s of abhiSkills) {
    await dbRun(
      'INSERT INTO skills (user_id, name, category, proficiency, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [abhiId, s.name, s.category, s.proficiency, s.icon, s.sort_order]
    );
  }

  // 6. Seed Experience
  console.log('💼 Seeding Experience...');
  await dbRun(
    `INSERT INTO experience (user_id, role, company, location, start_date, end_date, description, is_current, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      abhiId,
      'Senior Full-Stack Developer',
      'TechCorp Inc.',
      'San Francisco, CA',
      '2023-01',
      '',
      'Spearheading the core API scaling strategies and UI design systems. Integrated socket messaging pipelines.',
      1,
      1
    ]
  );

  // 7. Seed Education
  console.log('🎓 Seeding Education...');
  await dbRun(
    `INSERT INTO education (user_id, institution, degree, field_of_study, start_date, end_date, description, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      abhiId,
      'Stanford University',
      'Master of Science',
      'Computer Science',
      '2017-09',
      '2019-06',
      'Specialized in Web Systems and Interface Design.',
      1
    ]
  );

  // 8. Seed Certificates
  console.log('📜 Seeding Certificates...');
  await dbRun(
    `INSERT INTO certificates (user_id, title, issuer, issue_date, credential_url, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      abhiId,
      'AWS Solutions Architect',
      'Amazon Web Services',
      '2024-03',
      'https://aws.amazon.com',
      1
    ]
  );

  // 9. Seed Achievements
  console.log('🏆 Seeding Achievements...');
  await dbRun(
    'INSERT INTO achievements (user_id, title, description, date) VALUES (?, ?, ?, ?)',
    [
      abhiId,
      'Winner of HackFS 2024',
      'Won first place in the developer productivity tools category.',
      '2024-05'
    ]
  );

  // 10. Seed Blogs
  console.log('✍️ Seeding Blogs...');
  await dbRun(
    `INSERT INTO blogs (user_id, title, slug, excerpt, content, tags, published)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      abhiId,
      'Building Scalable APIs with Node.js',
      'building-scalable-apis-nodejs',
      'Reviewing patterns to build scalable services.',
      '# Building Scalable APIs\n\nScale is key. Let us look at rate limiting, caching with Redis, and index optimization.',
      JSON.stringify(['Node.js', 'Scaling']),
      1
    ]
  );

  // 11. Seed Social Links
  console.log('🔗 Seeding Social Links...');
  await dbRun(
    'INSERT INTO social_links (user_id, platform, url, sort_order) VALUES (?, ?, ?, ?)',
    [abhiId, 'github', 'https://github.com/abhi', 1]
  );
  await dbRun(
    'INSERT INTO social_links (user_id, platform, url, sort_order) VALUES (?, ?, ?, ?)',
    [abhiId, 'linkedin', 'https://linkedin.com/in/abhi', 2]
  );

  // 12. Seed Portfolio Settings
  console.log('⚙️ Seeding Portfolio Settings...');
  await dbRun(
    `INSERT INTO portfolio_settings (user_id, custom_domain, seo_title, seo_description, seo_keywords)
     VALUES (?, ?, ?, ?, ?)`,
    [
      abhiId,
      'abhi.codes',
      'Abhilash | Full Stack Specialist',
      'Professional portfolio of Abhilash.',
      'developer, portfolio, react, nodejs'
    ]
  );

  // 13. Seed Followers
  console.log('🤝 Seeding Followers...');
  // john follows abhi
  await dbRun('INSERT INTO followers (follower_id, following_id) VALUES (?, ?)', [johnId, abhiId]);
  // elon follows abhi
  await dbRun('INSERT INTO followers (follower_id, following_id) VALUES (?, ?)', [elonId, abhiId]);

  // 14. Seed Recommendations
  console.log('💬 Seeding Recommendations...');
  await dbRun(
    `INSERT INTO recommendations (giver_id, receiver_id, giver_name, giver_title, content, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      johnId,
      abhiId,
      'John Smith',
      'Lead UI/UX Designer at TechCorp',
      'Abhilash is an exceptional coder. He is quick to translate user requirements into responsive code layouts. Working together was fantastic.',
      'approved'
    ]
  );

  // 15. Seed Notifications
  console.log('🔔 Seeding Notifications...');
  await dbRun(
    'INSERT INTO notifications (user_id, type, sender_id, content) VALUES (?, ?, ?, ?)',
    [abhiId, 'follow', johnId, 'john started following your portfolio.']
  );

  // 16. Seed Messages
  console.log('✉️ Seeding Messages...');
  await dbRun(
    `INSERT INTO messages (sender_id, receiver_id, sender_name, sender_email, subject, content)
     VALUES (NULL, ?, ?, ?, ?, ?)`,
    [
      abhiId,
      'Alice Visitor',
      'alice@visitor.com',
      'Collaboration Inquiry',
      'Hey Abhilash, I saw your project CloudSync Dashboard. I would love to talk about building a similar dashboard for our product.'
    ]
  );

  // 17. Seed Analytics
  console.log('📈 Seeding Analytics...');
  const analyticsEvents = [
    { event: 'page_view', hash: 'session_hash_1', path: null, ref: 'github.com', br: 'Chrome', os: 'Windows' },
    { event: 'page_view', hash: 'session_hash_2', path: null, ref: 'linkedin.com', br: 'Safari', os: 'macOS' },
    { event: 'project_click', hash: 'session_hash_1', path: 1, ref: 'google.com', br: 'Firefox', os: 'Linux' },
    { event: 'resume_download', hash: 'session_hash_3', path: null, ref: 'abhi.codes', br: 'Chrome', os: 'Android' }
  ];

  for (const a of analyticsEvents) {
    await dbRun(
      `INSERT INTO analytics (user_id, event_type, visitor_session_hash, resource_id, referrer, browser, os)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [abhiId, a.event, a.hash, a.path, a.ref, a.br, a.os]
    );
  }

  // 18. Seed Session / Audit log (Optional)
  console.log('📝 Seeding Audit logs...');
  await dbRun(
    'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
    [abhiId, 'UPDATE_PROFILE', JSON.stringify({ fields: ['hero_title', 'about_bio'] }), '127.0.0.1']
  );

  console.log('\n🎉 SQLite Database seeded successfully!');
}

if (require.main === module) {
  seed().catch(err => {
    console.error('Error seeding SQLite database:', err);
  });
}

module.exports = { seed };
