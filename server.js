const express = require('express');
const path = require('path');
const compression = require('compression');
const app = express();
const PORT = process.env.PORT || 8080;

// Enable compression for all responses
app.use(compression());

// Serve static files from the current directory
app.use(express.static(__dirname));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Handle all routes by serving index.html
app.get('*', (req, res) => {
  // Don't serve index.html for static files
  if (req.path.startsWith('/css/') || 
      req.path.startsWith('/js/') || 
      req.path.startsWith('/images/') ||
      req.path.startsWith('/img/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send('Server error: ' + err.message);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
}); 