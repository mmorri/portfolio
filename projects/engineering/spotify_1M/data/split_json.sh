#!/bin/bash

# Define the file path
FILE="spotify_million_playlist.json"

# Get the total number of playlists
TOTAL=$(jq '.playlists | length' $FILE)

# Calculate the half index
HALF=$((TOTAL / 2))

# Split the JSON file
jq --argjson half $HALF '.playlists | {playlists: .[:$half]}' $FILE > spotify_million_playlist_part1.json
jq --argjson half $HALF '.playlists | {playlists: .[$half:]}' $FILE > spotify_million_playlist_part2.json
