require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const bcrypt = require('bcryptjs');
const db = require('./schema');

function seed() {
  // --- Create admin user ---
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const existing = db.findBy('users', 'username', username);
  if (!existing) {
    const hash = bcrypt.hashSync(password, 12);
    db.insert('users', { username, password_hash: hash, created_at: new Date().toISOString() });
    console.log(`✓ Admin user created: ${username}`);
  } else {
    console.log(`• Admin user already exists: ${username}`);
  }

  // --- Default settings ---
  const defaults = {
    site_title: 'Abhilash | Developer Portfolio',
    site_description: 'Full-stack developer crafting beautiful digital experiences.',
    hero_title: "Hi, I'm Abhilash",
    hero_subtitle: 'Full-Stack Developer & Creative Technologist',
    hero_description: 'I craft performant, accessible, and visually stunning digital experiences. Passionate about clean code, modern design, and pushing the boundaries of the web.',
    about_bio: "I'm a passionate full-stack developer with a love for building beautiful, functional web applications. With expertise spanning frontend frameworks, backend systems, and cloud infrastructure, I bring ideas to life with clean, maintainable code.",
    avatar_url: '',
    resume_url: '',
    email: 'hello@example.com',
    github_url: 'https://github.com',
    linkedin_url: 'https://linkedin.com',
    twitter_url: 'https://twitter.com',
    accent_color: '#ffffff',
    accent_gradient: 'linear-gradient(135deg, #ffffff, #666666)',
    footer_text: '© 2026 Abhilash. Built with passion & code.'
  };

  for (const [key, value] of Object.entries(defaults)) {
    if (!db.getSetting(key)) {
      db.setSetting(key, value);
    }
  }
  console.log('✓ Default settings seeded');

  // --- Sample Skills ---
  if (db.count('skills') === 0) {
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
      { name: 'UI/UX Design', category: 'Design', proficiency: 76, icon: 'UX', sort_order: 14 },
    ];
    for (const s of skills) db.insert('skills', s);
    console.log('✓ Sample skills seeded');
  }

  // --- Sample Experience ---
  if (db.count('experience') === 0) {
    const experiences = [
      { role: 'Senior Full-Stack Developer', company: 'TechCorp Inc.', location: 'San Francisco, CA', start_date: '2023-01', end_date: '', description: 'Leading development of microservices architecture serving 2M+ users. Mentoring junior developers and establishing best practices for code quality and testing.', is_current: 1, sort_order: 1 },
      { role: 'Full-Stack Developer', company: 'StartupXYZ', location: 'Remote', start_date: '2021-06', end_date: '2022-12', description: 'Built and scaled a SaaS platform from 0 to 50K users. Implemented real-time features with WebSockets and optimized database queries for 10x performance improvement.', is_current: 0, sort_order: 2 },
      { role: 'Frontend Developer', company: 'DesignStudio', location: 'New York, NY', start_date: '2019-09', end_date: '2021-05', description: 'Created responsive, accessible web interfaces for Fortune 500 clients. Led the migration from legacy jQuery codebase to modern React architecture.', is_current: 0, sort_order: 3 },
    ];
    for (const e of experiences) db.insert('experience', e);
    console.log('✓ Sample experience seeded');
  }

  // --- Sample Projects ---
  if (db.count('projects') === 0) {
    const projects = [
      { title: 'CloudSync Dashboard', slug: 'cloudsync-dashboard', description: 'Real-time cloud infrastructure monitoring dashboard with live metrics, alerts, and team collaboration features.', long_description: 'A comprehensive cloud monitoring solution built to give DevOps teams real-time visibility into their infrastructure. Features include live metric streaming via WebSockets, intelligent alerting with customizable thresholds, team collaboration tools, and a beautiful dark-mode interface.\n\nThe dashboard processes millions of data points daily and renders them into actionable insights through interactive charts and heatmaps.', image_url: '', tech_stack: '["React","Node.js","WebSocket","Redis","PostgreSQL","Docker"]', live_url: 'https://example.com', github_url: 'https://github.com', featured: 1, sort_order: 1, created_at: new Date().toISOString() },
      { title: 'AI Content Studio', slug: 'ai-content-studio', description: 'AI-powered content creation platform with intelligent writing assistance, SEO optimization, and multi-format publishing.', long_description: 'An innovative content creation platform that leverages AI to help writers produce high-quality content faster. Features intelligent writing suggestions, automated SEO optimization, readability analysis, and one-click publishing to multiple platforms.\n\nBuilt with a focus on user experience, the editor provides a distraction-free writing environment with real-time collaboration capabilities.', image_url: '', tech_stack: '["Next.js","Python","OpenAI","TailwindCSS","PostgreSQL"]', live_url: 'https://example.com', github_url: 'https://github.com', featured: 1, sort_order: 2, created_at: new Date().toISOString() },
      { title: 'FinTrack Mobile', slug: 'fintrack-mobile', description: 'Personal finance tracking app with budget planning, expense categorization, and investment portfolio monitoring.', long_description: 'A beautiful, intuitive personal finance application that helps users take control of their financial health. Features include automatic expense categorization using ML, budget planning with visual progress tracking, investment portfolio monitoring, and detailed financial reports.\n\nThe app syncs across devices and provides personalized financial insights based on spending patterns.', image_url: '', tech_stack: '["React Native","TypeScript","Firebase","Plaid API","Chart.js"]', live_url: '', github_url: 'https://github.com', featured: 1, sort_order: 3, created_at: new Date().toISOString() },
      { title: 'DevConnect Social', slug: 'devconnect-social', description: 'Developer-focused social platform for sharing code snippets, technical articles, and collaborative problem-solving.', long_description: 'A social platform built specifically for developers to connect, share knowledge, and collaborate. Features include syntax-highlighted code sharing, technical article publishing with markdown support, real-time Q&A forums, and developer profile showcases.', image_url: '', tech_stack: '["Vue.js","Express","MongoDB","ElasticSearch","Socket.io"]', live_url: 'https://example.com', github_url: 'https://github.com', featured: 0, sort_order: 4, created_at: new Date().toISOString() },
    ];
    for (const p of projects) db.insert('projects', p);
    console.log('✓ Sample projects seeded');
  }

  // --- Sample Certificates ---
  if (db.count('certificates') === 0) {
    const certs = [
      { title: 'AWS Solutions Architect Associate', issuer: 'Amazon Web Services', issue_date: '2024-03', credential_url: 'https://aws.amazon.com', image_url: '', sort_order: 1 },
      { title: 'Google Professional Cloud Developer', issuer: 'Google Cloud', issue_date: '2023-11', credential_url: 'https://cloud.google.com', image_url: '', sort_order: 2 },
      { title: 'Meta Frontend Developer Professional', issuer: 'Meta (Coursera)', issue_date: '2023-06', credential_url: 'https://coursera.org', image_url: '', sort_order: 3 },
    ];
    for (const c of certs) db.insert('certificates', c);
    console.log('✓ Sample certificates seeded');
  }

  // --- Sample Blog Posts ---
  if (db.count('blogs') === 0) {
    const now = new Date().toISOString();
    const blogs = [
      { title: 'Building Scalable APIs with Node.js and Express', slug: 'building-scalable-apis-nodejs', excerpt: 'Learn the patterns and practices I use to build production-ready APIs that handle millions of requests.', content: '# Building Scalable APIs with Node.js and Express\n\nWhen it comes to building APIs that can handle production traffic, there are several key patterns that make all the difference.\n\n## 1. Proper Error Handling\n\nOne of the most important aspects of a production API is comprehensive error handling.\n\n```javascript\napp.use((err, req, res, next) => {\n  console.error(err.stack);\n  res.status(500).json({ error: \'Internal server error\' });\n});\n```\n\n## 2. Rate Limiting\n\nProtect your API from abuse with rate limiting.\n\n## 3. Input Validation\n\nNever trust user input. Always validate and sanitize data.\n\n## Conclusion\n\nBuilding scalable APIs requires thinking about performance, security, and maintainability from the start.', cover_image: '', tags: '["Node.js","API","Backend","Architecture"]', published: 1, created_at: now, updated_at: now },
      { title: 'The Art of Modern CSS: Beyond Frameworks', slug: 'modern-css-beyond-frameworks', excerpt: 'Exploring the power of modern CSS features that make frameworks unnecessary for many projects.', content: '# The Art of Modern CSS: Beyond Frameworks\n\nCSS has evolved dramatically in recent years. Features like CSS Grid, Custom Properties, and Container Queries have made it possible to build complex layouts without reaching for a framework.\n\n## CSS Custom Properties\n\nCustom properties enable dynamic theming and reduce repetition.\n\n```css\n:root {\n  --accent: #06b6d4;\n  --bg-primary: #0f172a;\n}\n```\n\n## CSS Grid for Complex Layouts\n\nGrid layout handles two-dimensional layouts with ease.\n\n## Conclusion\n\nModern CSS is incredibly powerful. Before reaching for a framework, consider whether native CSS features can solve your problem more elegantly.', cover_image: '', tags: '["CSS","Frontend","Design","Web Development"]', published: 1, created_at: now, updated_at: now },
      { title: 'From Junior to Senior: Lessons Learned', slug: 'junior-to-senior-lessons', excerpt: 'Reflections on my journey from junior developer to senior engineer, and the key lessons along the way.', content: '# From Junior to Senior: Lessons Learned\n\nThe path from junior to senior developer is not just about writing more code.\n\n## Think in Systems, Not Features\n\nSenior developers see the bigger picture.\n\n## Communication is a Superpower\n\nThe ability to explain complex technical concepts to non-technical stakeholders is invaluable.\n\n## Embrace Simplicity\n\nThe best code is often the simplest code.\n\n## Conclusion\n\nThe journey is as much about personal growth as technical skills.', cover_image: '', tags: '["Career","Growth","Software Engineering"]', published: 1, created_at: now, updated_at: now },
    ];
    for (const b of blogs) db.insert('blogs', b);
    console.log('✓ Sample blog posts seeded');
  }

  console.log('\n✅ Database seeded successfully!');
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
