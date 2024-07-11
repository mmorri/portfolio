import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score
import os

# Define the paths
data_path = '/home/mmorri/Desktop/projects_data/EPFL/Project_HD/data'
x_train_path = os.path.join(data_path, 'x_train.csv')
y_train_path = os.path.join(data_path, 'y_train.csv')
x_test_path = os.path.join(data_path, 'x_test.csv')

# Load the data
X_train = pd.read_csv(x_train_path)
y_train = pd.read_csv(y_train_path)
X_test = pd.read_csv(x_test_path)

# Merge the training data
train_data = pd.merge(X_train, y_train, on='Id')

# Separate features and target variable
X = train_data.drop(['Id', '_MICHD'], axis=1)
y = train_data['_MICHD']

# Convert target variable to [0, 1]
y = y.replace(-1, 0)

# Split the data into training and validation sets
X_train_split, X_val_split, y_train_split, y_val_split = train_test_split(X, y, test_size=0.2, random_state=42)

# Initialize models with a pipeline that includes an imputer
models = {
    "Logistic Regression": Pipeline([
        ('imputer', SimpleImputer(strategy='mean')),
        ('classifier', LogisticRegression(max_iter=1000))
    ]),
    "Random Forest": Pipeline([
        ('imputer', SimpleImputer(strategy='mean')),
        ('classifier', RandomForestClassifier(n_estimators=100))
    ]),
    "XGBoost": Pipeline([
        ('imputer', SimpleImputer(strategy='mean')),
        ('classifier', XGBClassifier(use_label_encoder=False, eval_metric='logloss'))
    ])
}

# Train and evaluate models
best_model = None
best_accuracy = 0
best_model_name = ""

for name, model in models.items():
    model.fit(X_train_split, y_train_split)
    y_pred_split = model.predict(X_val_split)
    accuracy = accuracy_score(y_val_split, y_pred_split)
    print(f'{name} Validation Accuracy: {accuracy}')
    if accuracy > best_accuracy:
        best_accuracy = accuracy
        best_model = model
        best_model_name = name

print(f'Best Model: {best_model_name} with Validation Accuracy: {best_accuracy}')

# Generate predictions for the test set using the best model
X_test_ids = X_test['Id']
X_test_features = X_test.drop('Id', axis=1)
y_test_pred = best_model.predict(X_test_features)

# Create a submission file
submission = pd.DataFrame({'Id': X_test_ids, '_MICHD': y_test_pred})
submission.to_csv(os.path.join(data_path, 'submission.csv'), index=False)

print('Submission file created successfully!')
