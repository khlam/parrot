# works cited: https://towardsdatascience.com/how-to-build-an-amazing-music-recommendation-system-4cce2719a572?gi=63516270052c
import os
import json
import joblib
import difflib
import argparse
import numpy as np
import pandas as pd

from collections import defaultdict
from collections import defaultdict
from scipy.spatial.distance import cdist
from sklearn.metrics import euclidean_distances

import spotipy
from spotipy.oauth2 import SpotifyClientCredentials

song_cluster_pipeline = joblib.load('/app/src/python/song_similarity/song_cluster_pipeline.pkl')
spotify_data = pd.read_csv('/app/src/python/song_similarity/data/data.csv')

use_spotify = False

if os.environ.get('SPOTIFY_CLIENT') is not None and os.environ.get('SPOTIFY_SECRET') is not None:
    use_spotify = True

sp = False
if (use_spotify == True):
    sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(client_id=os.environ['SPOTIFY_CLIENT'], client_secret=os.environ['SPOTIFY_SECRET']))
    
number_cols = ['valence', 'year', 'acousticness', 'danceability', 'duration_ms', 'energy', 'explicit', 'instrumentalness', 'key', 'liveness', 'loudness', 'mode', 'popularity', 'speechiness', 'tempo']

def find_song(track):
    song_data = defaultdict()
    results = sp.search(q= 'track:{}'.format(track), limit=1)
    if results['tracks']['items'] == []:
        return None
    
    results = results['tracks']['items'][0]

    track_id = results['id']
    audio_features = sp.audio_features(track_id)[0]
    
    song_data['track'] = [track]
    song_data['year'] = [int(results['album']['release_date'].split('-')[0])]
    song_data['explicit'] = [int(results['explicit'])]
    song_data['duration_ms'] = [results['duration_ms']]
    song_data['popularity'] = [results['popularity']]
    
    for key, value in audio_features.items():
        song_data[key] = value
    
    return pd.DataFrame(song_data)

def get_song_data(song, spotify_data):
    try:
        song_data = spotify_data[(spotify_data['name'] == song['track'])].iloc[0]
        return song_data
    
    except IndexError:
        if (use_spotify == True):
            return find_song(song['track'])
        else:
            return None
        

def get_mean_vector(song_list, spotify_data):
    song_vectors = []
    
    for song in song_list:
        song_data = get_song_data(song, spotify_data)
        if song_data is None:
            print('Warning: {} does not exist in Spotify or in database'.format(song['track']))
            continue
        song_vector = song_data[number_cols].values
        song_vectors.append(song_vector)  
    
    song_matrix = np.array(list(song_vectors))
    return np.mean(song_matrix, axis=0)

def flatten_dict_list(dict_list):
    flattened_dict = defaultdict()
    for key in dict_list[0].keys():
        flattened_dict[key] = []
    
    for dictionary in dict_list:
        for key, value in dictionary.items():
            flattened_dict[key].append(value)
            
    return flattened_dict
        

def recommend_songs(song_list, spotify_data, n_songs=20):
    metadata_cols = ['name', 'year', 'artists']
    song_dict = flatten_dict_list(song_list)
    
    song_center = get_mean_vector(song_list, spotify_data)
    scaler = song_cluster_pipeline.steps[0][1]
    scaled_data = scaler.transform(spotify_data[number_cols])
    scaled_song_center = scaler.transform(song_center.reshape(1, -1))
    distances = cdist(scaled_song_center, scaled_data, 'cosine')
    index = list(np.argsort(distances)[:, :n_songs][0])
    
    rec_songs = spotify_data.iloc[index]
    rec_songs = rec_songs[~rec_songs['name'].isin(song_dict['track'])]
    return rec_songs[metadata_cols].to_dict(orient='records')

if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    parser.add_argument("--input", type=str, default=None)

    args = parser.parse_args()
    
    tracks_str = str(args.input)

    tracks_str = tracks_str.split("|")

    tracks = []

    # convert input string to python list of json objects
    for i, str_track in enumerate(tracks_str):
        try:
            tracks.append(json.loads(str_track))
        except:
            pass

    result = recommend_songs(tracks, spotify_data, n_songs=20)

    print(json.dumps(result))