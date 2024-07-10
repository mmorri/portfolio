import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset

# Load dataset
playlists = pd.read_json('data/spotify_million_playlist.json')

# Extract relevant data
data = []
for playlist in playlists['playlists']:
    for track in playlist['tracks']:
        data.append([playlist['pid'], track['track_uri']])

df = pd.DataFrame(data, columns=['playlist_id', 'track_uri'])

# Convert track URIs to integers
track_to_int = {uri: i for i, uri in enumerate(df['track_uri'].unique())}
df['track_int'] = df['track_uri'].map(track_to_int)

# Create PyTorch Dataset
class PlaylistDataset(Dataset):
    def __init__(self, df):
        self.df = df

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        playlist_id = self.df.iloc[idx]['playlist_id']
        track_id = self.df.iloc[idx]['track_int']
        return torch.tensor(playlist_id), torch.tensor(track_id)

dataset = PlaylistDataset(df)
dataloader = DataLoader(dataset, batch_size=512, shuffle=True)

# Define model
class NeuralCF(nn.Module):
    def __init__(self, n_playlists, n_tracks, n_factors):
        super(NeuralCF, self).__init__()
        self.playlist_embedding = nn.Embedding(n_playlists, n_factors)
        self.track_embedding = nn.Embedding(n_tracks, n_factors)
        self.fc1 = nn.Linear(n_factors*2, 128)
        self.fc2 = nn.Linear(128, 64)
        self.fc3 = nn.Linear(64, 1)

    def forward(self, playlist_id, track_id):
        playlist_emb = self.playlist_embedding(playlist_id)
        track_emb = self.track_embedding(track_id)
        x = torch.cat([playlist_emb, track_emb], dim=-1)
        x = torch.relu(self.fc1(x))
        x = torch.relu(self.fc2(x))
        x = torch.sigmoid(self.fc3(x))
        return x

# Train model
n_playlists = df['playlist_id'].nunique()
n_tracks = df['track_int'].nunique()
model = NeuralCF(n_playlists, n_tracks, n_factors=50)
criterion = nn.BCELoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

epochs = 5
for epoch in range(epochs):
    model.train()
    for playlists, tracks in dataloader:
        optimizer.zero_grad()
        outputs = model(playlists, tracks).squeeze()
        loss = criterion(outputs, torch.ones_like(outputs, dtype=torch.float32))
        loss.backward()
        optimizer.step()
    print(f'Epoch {epoch+1}/{epochs}, Loss: {loss.item()}')

# Recommend for a specific playlist
def recommend_tracks(model, playlist_id, top_n=10):
    model.eval()
    with torch.no_grad():
        all_tracks = torch.tensor(np.arange(n_tracks))
        scores = model(torch.tensor([playlist_id]*n_tracks), all_tracks).squeeze()
        top_items = torch.topk(scores, top_n).indices.numpy()
    return [list(track_to_int.keys())[i] for i in top_items]

# Example recommendation
print(recommend_tracks(model, playlist_id=1))
