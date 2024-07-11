# EPFL Machine Learning Project 1

## Project Description
This project is part of the EPFL Machine Learning Challenge. The goal is to predict the `_MICHD` variable using the provided training data.

## Solution
The solution involves comparing multiple machine learning models (Logistic Regression, Random Forest, and XGBoost) and selecting the best model based on validation accuracy. The selected model is then used to generate predictions for the test set.

## Files
- `ML_project1_solution.py`: The script to train and evaluate the models, and generate predictions.
- `data/`: Directory to store the training and test data (not tracked by Git).

## Instructions
1. Place the `X_train.csv`, `y_train.csv`, and `X_test.csv` files in the `data/` directory.
2. Run the `ML_project1_solution.py` script to train the models, evaluate them, and generate predictions.
3. The predictions will be saved in `submission.csv`.

## Requirements
- Python 3.x
- Pandas
- Scikit-learn
- XGBoost
