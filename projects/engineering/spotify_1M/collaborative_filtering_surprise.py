import pandas as pd
from surprise import Dataset, Reader, SVD, KNNBasic
from surprise.model_selection import train_test_split, cross_validate

# Load dataset
playlists = pd.read_json('data/spotify_million_playlist.json')

# Extract relevant data
data = []
for playlist in playlists['playlists']:
    for track in playlist['tracks']:
        data.append([playlist['pid'], track['track_uri']])

df = pd.DataFrame(data, columns=['playlist_id', 'track_uri'])

# Convert data to Surprise format
reader = Reader(rating_scale=(1, 1))
data = Dataset.load_from_df(df[['playlist_id', 'track_uri']], reader)

# Split data
trainset, testset = train_test_split(data, test_size=0.25)

# Train SVD model
svd_model = SVD()
svd_model.fit(trainset)

# Train KNN model
knn_model = KNNBasic()
knn_model.fit(trainset)

# Evaluate models
svd_results = cross_validate(svd_model, data, measures=['RMSE', 'MAE'], cv=5, verbose=True)
knn_results = cross_validate(knn_model, data, measures=['RMSE', 'MAE'], cv=5, verbose=True)

# Predict for a specific playlist
def recommend_tracks(model, playlist_id, top_n=10):
    all_tracks = df['track_uri'].unique()
    playlist_tracks = df[df['playlist_id'] == playlist_id]['track_uri']
    predictions = [(track, model.predict(playlist_id, track).est) for track in all_tracks if track not in playlist_tracks.values]
    top_n_tracks = sorted(predictions, key=lambda x: x[1], reverse=True)[:top_n]
    return [track for track, _ in top_n_tracks]

# Example recommendation
print(recommend_tracks(svd_model, playlist_id=1))
