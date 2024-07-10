import pandas as pd
from lightfm import LightFM
from lightfm.data import Dataset
from lightfm.evaluation import precision_at_k

# Load dataset
playlists = pd.read_json('data/spotify_million_playlist.json')

# Extract relevant data
data = []
for playlist in playlists['playlists']:
    for track in playlist['tracks']:
        data.append([playlist['pid'], track['track_uri']])

df = pd.DataFrame(data, columns=['playlist_id', 'track_uri'])

# Build interaction matrix
dataset = Dataset()
dataset.fit(df['playlist_id'], df['track_uri'])
interactions, weights = dataset.build_interactions(zip(df['playlist_id'], df['track_uri']))

# Train LightFM model
model = LightFM(loss='warp')
model.fit(interactions, epochs=30, num_threads=2)

# Evaluate model
train_precision = precision_at_k(model, interactions, k=10).mean()
print(f'Train precision at k=10: {train_precision}')

# Recommend for a specific playlist
def recommend_tracks(model, interactions, playlist_id, top_n=10):
    n_users, n_items = interactions.shape
    scores = model.predict(playlist_id, np.arange(n_items))
    top_items = np.argsort(-scores)[:top_n]
    return [dataset.mapping()[2][item] for item in top_items]

# Example recommendation
print(recommend_tracks(model, interactions, playlist_id=1))
