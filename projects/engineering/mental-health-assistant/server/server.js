const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/suggestion', async (req, res) => {
  const { challenge } = req.body;
  try {
    // Mock xAI Grok API call (replace with actual API in production)
    const mockResponse = {
      suggestion: `Acknowledge the patient's feelings and suggest a grounding technique, like the 5-4-3-2-1 sensory exercise.`
    };
    // Actual API call (commented out for POC):
    /*
    const response = await fetch('https://api.x.ai/grok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer YOUR_API_KEY' },
      body: JSON.stringify({
        prompt: `You are an experienced mental health counselor. Based on the following patient challenge, generate a concise, empathetic, and actionable suggestion to help the counselor address it. Use a professional tone and draw inspiration from responses like: "It sounds overwhelming. Have you tried mindfulness techniques?" or "Let’s explore what triggers these feelings." Patient challenge: ${challenge}`,
        max_tokens: 100
      })
    });
    const data = await response.json();
    */
    res.json(mockResponse);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate suggestion' });
  }
});

app.listen(3001, () => console.log('Server running on port 3001'));
