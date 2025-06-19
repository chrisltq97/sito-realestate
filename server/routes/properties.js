const express = require('express');
const { supabase } = require('../supabaseClient');

const router = express.Router();

// Get all properties
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('properties').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Get property by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('properties').select('*').eq('id', id).single();
  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

// Create property
router.post('/', async (req, res) => {
  const { data, error } = await supabase.from('properties').insert([req.body]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// Update property
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('properties').update(req.body).eq('id', id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Delete property
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('properties').delete().eq('id', id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).end();
});

module.exports = router; 