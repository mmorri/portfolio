# Spotify Million Playlist Dataset Challenge

This repository contains three different solutions for the Spotify Million Playlist Dataset Challenge, showcasing various recommendation system techniques.

## Solutions

1. **Collaborative Filtering with Surprise**
    - `collaborative_filtering_surprise.py`
    - Uses SVD and KNN algorithms from the Surprise library.

2. **Matrix Factorization with LightFM**
    - `matrix_factorization_lightfm.py`
    - Uses the LightFM library for matrix factorization.

3. **Neural Collaborative Filtering with PyTorch**
    - `neural_collaborative_filtering_pytorch.py`
    - Implements a neural collaborative filtering model using PyTorch.

## Requirements

- pandas
- surprise
- lightfm
- torch

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/mmorri/spotify-million-playlist-challenge.git
    cd spotify-million-playlist-challenge
    ```

2. Install the required libraries:
    ```bash
    pip install pandas surprise lightfm torch
    ```

## Usage

Run the desired solution script:

```bash
python collaborative_filtering_surprise.py
