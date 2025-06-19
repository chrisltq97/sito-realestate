const express = require('express');
const multer = require('multer');
const { supabase } = require('../supabaseClient');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const fileExt = req.file.originalname.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
  const { data, error } = await supabase.storage
    .from('property-images')
    .upload(fileName, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false
    });
  if (error) return res.status(500).json({ error: error.message });
  const publicUrl = supabase.storage.from('property-images').getPublicUrl(fileName).data.publicUrl;
  res.json({ url: publicUrl });
});

module.exports = router; 