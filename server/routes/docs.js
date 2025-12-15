const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Helper function to convert markdown to HTML
const markdownToHtml = (content, title) => {
  // Simple markdown to HTML conversion
  let html = content
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 900px; 
            margin: 0 auto; 
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        h1, h2, h3 { color: #1976d2; }
        h1 { 
            border-bottom: 3px solid #1976d2; 
            padding-bottom: 10px; 
            margin-bottom: 30px;
        }
        h2 { 
            border-bottom: 1px solid #e0e0e0; 
            padding-bottom: 8px; 
            margin-top: 30px;
            margin-bottom: 15px;
        }
        h3 {
            margin-top: 25px;
            margin-bottom: 10px;
        }
        code { 
            background: #f5f5f5; 
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Monaco', 'Consolas', monospace;
        }
        pre {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            border-left: 4px solid #1976d2;
        }
        .nav-menu {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
            border: 1px solid #e9ecef;
        }
        .nav-menu h3 {
            margin-top: 0;
            color: #495057;
        }
        .nav-menu a {
            display: inline-block;
            margin: 5px 10px 5px 0;
            padding: 8px 12px;
            background: #1976d2;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-size: 14px;
        }
        .nav-menu a:hover {
            background: #1565c0;
        }
        .emergency {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background: #f8f9fa;
            font-weight: 600;
        }
        .back-link {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #1976d2;
            color: white;
            padding: 10px 15px;
            text-decoration: none;
            border-radius: 5px;
            font-size: 14px;
        }
        .back-link:hover {
            background: #1565c0;
        }
    </style>
</head>
<body>
    <a href="/docs" class="back-link">← Back to Help Center</a>
    <div class="nav-menu">
        <h3>📚 Video Call Documentation</h3>
        <a href="/docs/video-call-help">Help Center</a>
        <a href="/docs/video-call-quick-fixes">Quick Fixes</a>
        <a href="/docs/video-call-faq">FAQ</a>
        <a href="/docs/video-call-troubleshooting">Troubleshooting</a>
        <a href="/docs/video-call-support">Support Guide</a>
    </div>
    <div class="content">
        <p>${html}</p>
    </div>
</body>
</html>`;
};

// Main documentation index
router.get('/', (req, res) => {
  const indexContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video Call Help Center</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 900px; 
            margin: 0 auto; 
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px;
            background: linear-gradient(135deg, #1976d2, #42a5f5);
            color: white;
            border-radius: 10px;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
        }
        .header p {
            margin: 10px 0 0 0;
            font-size: 1.2em;
            opacity: 0.9;
        }
        .quick-access {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .card {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 25px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        .card h3 {
            margin-top: 0;
            color: #1976d2;
            font-size: 1.3em;
        }
        .card p {
            margin-bottom: 15px;
            color: #666;
        }
        .card a {
            display: inline-block;
            background: #1976d2;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 500;
        }
        .card a:hover {
            background: #1565c0;
        }
        .emergency {
            background: #fff3cd;
            border: 2px solid #ffc107;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: center;
        }
        .emergency h3 {
            color: #856404;
            margin-top: 0;
        }
        .emergency a {
            background: #ffc107;
            color: #212529;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 600;
            margin: 0 10px;
        }
        .common-issues {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 8px;
            margin-top: 30px;
        }
        .common-issues h3 {
            margin-top: 0;
            color: #495057;
        }
        .issue-list {
            list-style: none;
            padding: 0;
        }
        .issue-list li {
            padding: 10px 0;
            border-bottom: 1px solid #dee2e6;
        }
        .issue-list li:last-child {
            border-bottom: none;
        }
        .issue-list a {
            color: #1976d2;
            text-decoration: none;
            font-weight: 500;
        }
        .issue-list a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏥 Video Call Help Center</h1>
        <p>Get help with video calls quickly and easily</p>
    </div>

    <div class="emergency">
        <h3>🚨 Need Help Right Now?</h3>
        <a href="/docs/video-call-quick-fixes">Quick Fixes (30 seconds)</a>
        <a href="mailto:support@smilingsteps.com?subject=URGENT Video Call Issue">Emergency Support</a>
    </div>

    <div class="quick-access">
        <div class="card">
            <h3>🚀 Quick Fixes</h3>
            <p>30-second solutions for the most common video call problems. Start here if you're having issues right now.</p>
            <a href="/docs/video-call-quick-fixes">Get Quick Help</a>
        </div>

        <div class="card">
            <h3>❓ Frequently Asked Questions</h3>
            <p>Answers to the most common questions about video calls, browsers, and technical requirements.</p>
            <a href="/docs/video-call-faq">View FAQ</a>
        </div>

        <div class="card">
            <h3>🔧 Complete Troubleshooting</h3>
            <p>Comprehensive guide for solving complex video call issues with step-by-step instructions.</p>
            <a href="/docs/video-call-troubleshooting">Full Guide</a>
        </div>

        <div class="card">
            <h3>🛠️ Support Staff Guide</h3>
            <p>Technical documentation for support staff and administrators to help diagnose and resolve issues.</p>
            <a href="/docs/video-call-support">Support Guide</a>
        </div>
    </div>

    <div class="common-issues">
        <h3>🔥 Most Common Issues</h3>
        <ul class="issue-list">
            <li><a href="/docs/video-call-quick-fixes#-cant-see-join-call-button">Can't see "Join Call" button</a> - Usually timing or payment related</li>
            <li><a href="/docs/video-call-quick-fixes#-camera-not-working">Camera permission denied</a> - Browser needs permission to access camera</li>
            <li><a href="/docs/video-call-quick-fixes#-connection-issues">Connection problems</a> - Network or firewall issues</li>
            <li><a href="/docs/video-call-faq#technical-issues">Audio/microphone issues</a> - Permission or hardware problems</li>
            <li><a href="/docs/video-call-troubleshooting#-screen-sharing-issues">Screen sharing not working</a> - Browser compatibility issues</li>
        </ul>
    </div>

    <div style="text-align: center; margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
        <h3>Still Need Help?</h3>
        <p>Contact our support team: <strong>support@smilingsteps.com</strong></p>
        <p>Response time: Within 2 hours during business hours</p>
    </div>
</body>
</html>`;
  
  res.send(indexContent);
});

// Individual documentation pages
router.get('/video-call-help', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../../VIDEO_CALL_HELP_CENTER.md');
    const content = fs.readFileSync(filePath, 'utf8');
    res.send(markdownToHtml(content, 'Video Call Help Center'));
  } catch (error) {
    res.status(404).send('<h1>Documentation not found</h1><p>The requested help document could not be found.</p>');
  }
});

router.get('/video-call-quick-fixes', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../../VIDEO_CALL_QUICK_FIXES.md');
    const content = fs.readFileSync(filePath, 'utf8');
    res.send(markdownToHtml(content, 'Video Call Quick Fixes'));
  } catch (error) {
    res.status(404).send('<h1>Documentation not found</h1><p>The requested help document could not be found.</p>');
  }
});

router.get('/video-call-faq', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../../VIDEO_CALL_FAQ.md');
    const content = fs.readFileSync(filePath, 'utf8');
    res.send(markdownToHtml(content, 'Video Call FAQ'));
  } catch (error) {
    res.status(404).send('<h1>Documentation not found</h1><p>The requested help document could not be found.</p>');
  }
});

router.get('/video-call-troubleshooting', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../../VIDEO_CALL_TROUBLESHOOTING_GUIDE.md');
    const content = fs.readFileSync(filePath, 'utf8');
    res.send(markdownToHtml(content, 'Video Call Troubleshooting Guide'));
  } catch (error) {
    res.status(404).send('<h1>Documentation not found</h1><p>The requested help document could not be found.</p>');
  }
});

router.get('/video-call-support', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../../VIDEO_CALL_SUPPORT_GUIDE.md');
    const content = fs.readFileSync(filePath, 'utf8');
    res.send(markdownToHtml(content, 'Video Call Support Guide'));
  } catch (error) {
    res.status(404).send('<h1>Documentation not found</h1><p>The requested help document could not be found.</p>');
  }
});

// API endpoint to get documentation list (for programmatic access)
router.get('/api/list', (req, res) => {
  res.json({
    documents: [
      {
        id: 'help-center',
        title: 'Video Call Help Center',
        description: 'Main help center with navigation to all resources',
        url: '/docs/video-call-help'
      },
      {
        id: 'quick-fixes',
        title: 'Quick Fixes',
        description: '30-second solutions for common problems',
        url: '/docs/video-call-quick-fixes'
      },
      {
        id: 'faq',
        title: 'Frequently Asked Questions',
        description: 'Answers to common video call questions',
        url: '/docs/video-call-faq'
      },
      {
        id: 'troubleshooting',
        title: 'Complete Troubleshooting Guide',
        description: 'Comprehensive problem-solving guide',
        url: '/docs/video-call-troubleshooting'
      },
      {
        id: 'support-guide',
        title: 'Support Staff Guide',
        description: 'Technical guide for support staff and administrators',
        url: '/docs/video-call-support'
      }
    ]
  });
});

module.exports = router;