const bcrypt = require('bcryptjs');
const { dbRun, dbGet, initDb } = require('./db');

async function seed() {
  console.log('Initializing database tables...');
  await initDb();
  console.log('Tables initialized.');

  // Create super admin if not exists
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminEmail = 'admin@platform.com';

  const existingAdmin = await dbGet('SELECT * FROM users WHERE username = ?', [adminUsername]);
  let adminId;
  if (!existingAdmin) {
    const hash = bcrypt.hashSync(adminPassword, 12);
    const result = await dbRun(
      'INSERT INTO users (username, email, password_hash, role, is_verified) VALUES (?, ?, ?, ?, ?)',
      [adminUsername, adminEmail, hash, 'super_admin', 1]
    );
    adminId = result.id;
    console.log(`✓ Super Admin user created: ${adminUsername}`);
  } else {
    adminId = existingAdmin.id;
    console.log(`• Super Admin user already exists: ${adminUsername}`);
  }

  // Ensure profile for admin exists
  const existingAdminProfile = await dbGet('SELECT * FROM profiles WHERE user_id = ?', [adminId]);
  if (!existingAdminProfile) {
    await dbRun(
      `INSERT INTO profiles (user_id, site_title, site_description, hero_title, hero_subtitle, hero_description, about_bio, email) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        adminId,
        'Platform Admin Showcase',
        'System Administrator of Showcase SaaS.',
        'Platform Management Panel',
        'SaaS System Administrator',
        'This is the system admin portfolio.',
        'Welcome to the admin portfolio of Showcase SaaS.',
        adminEmail
      ]
    );
  }

  // Create standard user "abhi" if not exists
  const abhiUsername = 'abhi';
  const abhiPassword = 'qwertyuiop';
  const abhiEmail = 'abhi@example.com';

  const existingAbhi = await dbGet('SELECT * FROM users WHERE username = ?', [abhiUsername]);
  let abhiId;
  if (!existingAbhi) {
    const hash = bcrypt.hashSync(abhiPassword, 12);
    const result = await dbRun(
      'INSERT INTO users (username, email, password_hash, role, is_verified) VALUES (?, ?, ?, ?, ?)',
      [abhiUsername, abhiEmail, hash, 'user', 1]
    );
    abhiId = result.id;
    console.log(`✓ User created: ${abhiUsername}`);
  } else {
    abhiId = existingAbhi.id;
    console.log(`• User already exists: ${abhiUsername}`);
  }

  // Seed "abhi" portfolio if profile doesn't exist
  const existingAbhiProfile = await dbGet('SELECT * FROM profiles WHERE user_id = ?', [abhiId]);
  if (!existingAbhiProfile) {
    await dbRun(
      `INSERT INTO profiles (user_id, site_title, site_description, hero_title, hero_subtitle, hero_description, about_bio, email, github_url, linkedin_url, twitter_url, accent_color, accent_gradient, footer_text) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        abhiId,
        'Abhilash | Developer Portfolio',
        'Full-stack developer crafting beautiful digital experiences.',
        "Hi, I'm Abhilash",
        'Full-Stack Developer & Creative Technologist',
        'I craft performant, accessible, and visually stunning digital experiences. Passionate about clean code, modern design, and pushing the boundaries of the web.',
        "I'm a passionate full-stack developer with a love for building beautiful, functional web applications. With expertise spanning frontend frameworks, backend systems, and cloud infrastructure, I bring ideas to life with clean, maintainable code.",
        'hello@example.com',
        'https://github.com',
        'https://linkedin.com',
        'https://twitter.com',
        '#ffffff',
        'linear-gradient(135deg, #ffffff, #666666)',
        '© 2026 Abhilash. Built with passion & code.'
      ]
    );

    // Seed Skills
    const skills = [
      { name: 'JavaScript', category: 'Frontend', proficiency: 95, icon: 'JS', sort_order: 1 },
      { name: 'TypeScript', category: 'Frontend', proficiency: 88, icon: 'TS', sort_order: 2 },
      { name: 'React', category: 'Frontend', proficiency: 92, icon: 'Re', sort_order: 3 },
      { name: 'Vue.js', category: 'Frontend', proficiency: 80, icon: 'Vu', sort_order: 4 },
      { name: 'HTML/CSS', category: 'Frontend', proficiency: 98, icon: 'HC', sort_order: 5 },
      { name: 'Node.js', category: 'Backend', proficiency: 90, icon: 'No', sort_order: 6 },
      { name: 'Python', category: 'Backend', proficiency: 85, icon: 'Py', sort_order: 7 },
      { name: 'PostgreSQL', category: 'Backend', proficiency: 82, icon: 'PG', sort_order: 8 },
      { name: 'MongoDB', category: 'Backend', proficiency: 78, icon: 'MG', sort_order: 9 },
      { name: 'Docker', category: 'DevOps', proficiency: 75, icon: 'Dk', sort_order: 10 },
      { name: 'AWS', category: 'DevOps', proficiency: 72, icon: 'AW', sort_order: 11 },
      { name: 'Git', category: 'DevOps', proficiency: 93, icon: 'Gt', sort_order: 12 },
      { name: 'Figma', category: 'Design', proficiency: 70, icon: 'Fg', sort_order: 13 },
      { name: 'UI/UX Design', category: 'Design', proficiency: 76, icon: 'UX', sort_order: 14 }
    ];

    for (const s of skills) {
      await dbRun(
        'INSERT INTO skills (user_id, name, category, proficiency, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [abhiId, s.name, s.category, s.proficiency, s.icon, s.sort_order]
      );
    }

    // Seed Experience
    const experiences = [
      { role: 'Senior Full-Stack Developer', company: 'TechCorp Inc.', location: 'San Francisco, CA', start_date: '2023-01', end_date: '', description: 'Leading development of microservices architecture serving 2M+ users. Mentoring junior developers and establishing best practices for code quality and testing.', is_current: 1, sort_order: 1 },
      { role: 'Full-Stack Developer', company: 'StartupXYZ', location: 'Remote', start_date: '2021-06', end_date: '2022-12', description: 'Built and scaled a SaaS platform from 0 to 50K users. Implemented real-time features with WebSockets and optimized database queries for 10x performance improvement.', is_current: 0, sort_order: 2 },
      { role: 'Frontend Developer', company: 'DesignStudio', location: 'New York, NY', start_date: '2019-09', end_date: '2021-05', description: 'Created responsive, accessible web interfaces for Fortune 500 clients. Led the migration from legacy jQuery codebase to modern React architecture.', is_current: 0, sort_order: 3 }
    ];

    for (const e of experiences) {
      await dbRun(
        'INSERT INTO experience (user_id, role, company, location, start_date, end_date, description, is_current, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [abhiId, e.role, e.company, e.location, e.start_date, e.end_date, e.description, e.is_current, e.sort_order]
      );
    }

    // Seed Education
    const educations = [
      { institution: 'Stanford University', degree: 'Master of Science', field_of_study: 'Computer Science', start_date: '2017-09', end_date: '2019-06', description: 'Specialized in Artificial Intelligence and Software Engineering. Active member of Computer Science Society.', sort_order: 1 },
      { institution: 'UC Berkeley', degree: 'Bachelor of Science', field_of_study: 'Electrical Engineering & Computer Science', start_date: '2013-09', end_date: '2017-05', description: 'Graduated with Honors. Coursework in Data Structures, Algorithms, and Operating Systems.', sort_order: 2 }
    ];

    for (const edu of educations) {
      await dbRun(
        'INSERT INTO education (user_id, institution, degree, field_of_study, start_date, end_date, description, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [abhiId, edu.institution, edu.degree, edu.field_of_study, edu.start_date, edu.end_date, edu.description, edu.sort_order]
      );
    }

    // Seed Projects
    const projects = [
      { title: 'CloudSync Dashboard', slug: 'cloudsync-dashboard', description: 'Real-time cloud infrastructure monitoring dashboard with live metrics, alerts, and team collaboration features.', long_description: 'A comprehensive cloud monitoring solution built to give DevOps teams real-time visibility into their infrastructure. Features include live metric streaming via WebSockets, intelligent alerting with customizable thresholds, team collaboration tools, and a beautiful dark-mode interface.\n\nThe dashboard processes millions of data points daily and renders them into actionable insights through interactive charts and heatmaps.', image_url: '', tech_stack: '["React","Node.js","WebSocket","Redis","PostgreSQL","Docker"]', live_url: 'https://example.com', github_url: 'https://github.com', featured: 1, sort_order: 1 },
      { title: 'AI Content Studio', slug: 'ai-content-studio', description: 'AI-powered content creation platform with intelligent writing assistance, SEO optimization, and multi-format publishing.', long_description: 'An innovative content creation platform that leverages AI to help writers produce high-quality content faster. Features intelligent writing suggestions, automated SEO optimization, readability analysis, and one-click publishing to multiple platforms.\n\nBuilt with a focus on user experience, the editor provides a distraction-free writing environment with real-time collaboration capabilities.', image_url: '', tech_stack: '["Next.js","Python","OpenAI","TailwindCSS","PostgreSQL"]', live_url: 'https://example.com', github_url: 'https://github.com', featured: 1, sort_order: 2 },
      { title: 'FinTrack Mobile', slug: 'fintrack-mobile', description: 'Personal finance tracking app with budget planning, expense categorization, and investment portfolio monitoring.', long_description: 'A beautiful, intuitive personal finance application that helps users take control of their financial health. Features include automatic expense categorization using ML, budget planning with visual progress tracking, investment portfolio monitoring, and detailed financial reports.\n\nThe app syncs across devices and provides personalized financial insights based on spending patterns.', image_url: '', tech_stack: '["React Native","TypeScript","Firebase","Plaid API","Chart.js"]', live_url: '', github_url: 'https://github.com', featured: 1, sort_order: 3 },
      { title: 'DevConnect Social', slug: 'devconnect-social', description: 'Developer-focused social platform for sharing code snippets, technical articles, and collaborative problem-solving.', long_description: 'A social platform built specifically for developers to connect, share knowledge, and collaborate. Features include syntax-highlighted code sharing, technical article publishing with markdown support, real-time Q&A forums, and developer profile showcases.', image_url: '', tech_stack: '["Vue.js","Express","MongoDB","ElasticSearch","Socket.io"]', live_url: 'https://example.com', github_url: 'https://github.com', featured: 0, sort_order: 4 }
    ];

    for (const p of projects) {
      await dbRun(
        'INSERT INTO projects (user_id, title, slug, description, long_description, image_url, tech_stack, live_url, github_url, featured, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [abhiId, p.title, p.slug, p.description, p.long_description, p.image_url, p.tech_stack, p.live_url, p.github_url, p.featured, p.sort_order]
      );
    }

    // Seed Certificates
    const certs = [
      { title: 'AWS Solutions Architect Associate', issuer: 'Amazon Web Services', issue_date: '2024-03', credential_url: 'https://aws.amazon.com', image_url: '', sort_order: 1 },
      { title: 'Google Professional Cloud Developer', issuer: 'Google Cloud', issue_date: '2023-11', credential_url: 'https://cloud.google.com', image_url: '', sort_order: 2 },
      { title: 'Meta Frontend Developer Professional', issuer: 'Meta (Coursera)', issue_date: '2023-06', credential_url: 'https://coursera.org', image_url: '', sort_order: 3 }
    ];

    for (const c of certs) {
      await dbRun(
        'INSERT INTO certificates (user_id, title, issuer, issue_date, credential_url, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [abhiId, c.title, c.issuer, c.issue_date, c.credential_url, c.image_url, c.sort_order]
      );
    }

    // Seed Blogs
    const now = new Date().toISOString();
    const blogs = [
      { title: 'Building Scalable APIs with Node.js and Express', slug: 'building-scalable-apis-nodejs', excerpt: 'Learn the patterns and practices I use to build production-ready APIs that handle millions of requests.', content: '# Building Scalable APIs with Node.js and Express\n\nWhen it comes to building APIs that can handle production traffic, there are several key patterns that make all the difference.\n\n## 1. Proper Error Handling\n\nOne of the most important aspects of a production API is comprehensive error handling.\n\n```javascript\napp.use((err, req, res, next) => {\n  console.error(err.stack);\n  res.status(500).json({ error: \'Internal server error\' });\n});\n```\n\n## 2. Rate Limiting\n\nProtect your API from abuse with rate limiting.\n\n## 3. Input Validation\n\nNever trust user input. Always validate and sanitize data.\n\n## Conclusion\n\nBuilding scalable APIs requires thinking about performance, security, and maintainability from the start.', cover_image: '', tags: '["Node.js","API","Backend","Architecture"]', published: 1 },
      { title: 'The Art of Modern CSS: Beyond Frameworks', slug: 'modern-css-beyond-frameworks', excerpt: 'Exploring the power of modern CSS features that make frameworks unnecessary for many projects.', content: '# The Art of Modern CSS: Beyond Frameworks\n\nCSS has evolved dramatically in recent years. Features like CSS Grid, Custom Properties, and Container Queries have made it possible to build complex layouts without reaching for a framework.\n\n## CSS Custom Properties\n\nCustom properties enable dynamic theming and reduce repetition.\n\n```css\n:root {\n  --accent: #06b6d4;\n  --bg-primary: #0f172a;\n}\n```\n\n## CSS Grid for Complex Layouts\n\nGrid layout handles two-dimensional layouts with ease.\n\n## Conclusion\n\nModern CSS is incredibly powerful. Before reaching for a framework, consider whether native CSS features can solve your problem more elegantly.', cover_image: '', tags: '["CSS","Frontend","Design","Web Development"]', published: 1 },
      { title: 'From Junior to Senior: Lessons Learned', slug: 'junior-to-senior-lessons', excerpt: 'Reflections on my journey from junior developer to senior engineer, and the key lessons along the way.', content: '# From Junior to Senior: Lessons Learned\n\nThe path from junior to senior developer is not just about writing more code.\n\n## Think in Systems, Not Features\n\nSenior developers see the bigger picture.\n\n## Communication is a Superpower\n\nThe ability to explain complex technical concepts to non-technical stakeholders is invaluable.\n\n## Embrace Simplicity\n\nThe best code is often the simplest code.\n\n## Conclusion\n\nThe journey is as much about personal growth as technical skills.', cover_image: '', tags: '["Career","Growth","Software Engineering"]', published: 1 }
    ];

    for (const b of blogs) {
      await dbRun(
        'INSERT INTO blogs (user_id, title, slug, excerpt, content, cover_image, tags, published, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [abhiId, b.title, b.slug, b.excerpt, b.content, b.cover_image, b.tags, b.published, now, now]
      );
    }

    console.log('✓ Sample portfolio seeded for user: abhi');
  }

  console.log('\n✅ SQLite Database seeded successfully!');
}

if (require.main === module) {
  seed().catch(err => {
    console.error('Error seeding SQLite database:', err);
  });
}

module.exports = { seed };
