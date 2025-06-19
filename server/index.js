const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const propertiesRouter = require('./routes/properties');
const uploadRouter = require('./routes/upload');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/properties', propertiesRouter);
app.use('/api/upload', uploadRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
}); 