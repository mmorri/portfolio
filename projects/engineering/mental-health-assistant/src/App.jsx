import React, { useState } from 'react';

function App() {
  const [input, setInput] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) {
      setError('Please enter a description of the patient challenge.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:3001/api/suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge: input }),
      });
      const data = await response.json();
      setSuggestion(data.suggestion || 'Try discussing coping strategies with the patient.');
    } catch (err) {
      setError('Error generating suggestion. Please try again.');
      setSuggestion('');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow-lg mx-auto mt-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Mental Health Counselor Assistant</h1>
      <form onSubmit={handleSubmit}>
        <label className="block text-gray-700 mb-2">
          Describe the challenge you are facing with a patient:
        </label>
        <textarea
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="4"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g., Patient reports feeling anxious about work and struggles to cope."
        />
        <button
          type="submit"
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Get Suggestion'}
        </button>
      </form>
      {error && <p className="mt-4 text-red-500">{error}</p>}
      {suggestion && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-800">Suggestion:</h2>
          <p className="text-gray-700">{suggestion}</p>
        </div>
      )}
    </div>
  );
}

export default App;
