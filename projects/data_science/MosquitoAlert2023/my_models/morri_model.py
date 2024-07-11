import os
import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout, Input
from tensorflow.keras.optimizers import Adam
from sklearn.model_selection import train_test_split

# Path to the data directory
data_dir = '/Users/mmorri/Desktop/data'

# Load the CSV file containing image filenames and their class labels
data = pd.read_csv(os.path.join(data_dir, 'phase2_train_v0.csv'))
print(f"Loaded {len(data)} rows from the CSV file.")

# Define paths
image_dir = os.path.join(data_dir, 'final')

# Append the path to the image filenames
data['img_path'] = data['img_fName'].apply(lambda x: os.path.join(image_dir, x))

# Split the data into training and validation sets
train_df, val_df = train_test_split(data, test_size=0.2, stratify=data['class_label'], random_state=42)
print(f"Training set: {len(train_df)} images")
print(f"Validation set: {len(val_df)} images")

# Image data generators
train_datagen = ImageDataGenerator(rescale=1./255, shear_range=0.2, zoom_range=0.2, horizontal_flip=True)
val_datagen = ImageDataGenerator(rescale=1./255)

batch_size = 32

train_generator = train_datagen.flow_from_dataframe(
    train_df, 
    x_col='img_path', 
    y_col='class_label', 
    target_size=(150, 150), 
    batch_size=batch_size, 
    class_mode='categorical'
)

val_generator = val_datagen.flow_from_dataframe(
    val_df, 
    x_col='img_path', 
    y_col='class_label', 
    target_size=(150, 150), 
    batch_size=batch_size, 
    class_mode='categorical'
)

print(f"Number of classes: {len(train_generator.class_indices)}")

# Build the CNN model using Input layer
model = Sequential([
    Input(shape=(150, 150, 3)),
    Conv2D(32, (3, 3), activation='relu'),
    MaxPooling2D(pool_size=(2, 2)),
    Conv2D(64, (3, 3), activation='relu'),
    MaxPooling2D(pool_size=(2, 2)),
    Conv2D(128, (3, 3), activation='relu'),
    MaxPooling2D(pool_size=(2, 2)),
    Flatten(),
    Dense(512, activation='relu'),
    Dropout(0.5),
    Dense(len(train_generator.class_indices), activation='softmax')
])

# Compile the model
model.compile(optimizer=Adam(learning_rate=0.001), loss='categorical_crossentropy', metrics=['accuracy'])

# Calculate the number of steps per epoch
steps_per_epoch = len(train_df) // batch_size
validation_steps = len(val_df) // batch_size

print(f"Steps per epoch: {steps_per_epoch}")
print(f"Validation steps: {validation_steps}")

# Train the model
print("Starting model training...")
history = model.fit(
    train_generator,
    steps_per_epoch=steps_per_epoch,
    validation_data=val_generator,
    validation_steps=validation_steps,
    epochs=10
)
print("Model training completed.")

# Save the model in Keras format
model.save('mosquito_model.keras')
print("Model saved as mosquito_model.keras")

# Load the test data
test_data = pd.read_csv(os.path.join(data_dir, 'phase2_train_v0.csv'))
test_data['img_path'] = test_data['img_fName'].apply(lambda x: os.path.join(image_dir, x))

print(f"Number of test images: {len(test_data)}")

# Image data generator for test data
test_datagen = ImageDataGenerator(rescale=1./255)
test_generator = test_datagen.flow_from_dataframe(
    test_data, 
    x_col='img_path', 
    y_col=None, 
    target_size=(150, 150), 
    batch_size=batch_size, 
    class_mode=None, 
    shuffle=False
)

print("Generating predictions...")
predictions = model.predict(test_generator, steps=np.ceil(len(test_data) / batch_size).astype(int))
predicted_class_indices = np.argmax(predictions, axis=1)
print(f"Number of predictions: {len(predicted_class_indices)}")

# Map predicted class indices to class labels
labels = (train_generator.class_indices)
labels = dict((v, k) for k, v in labels.items())
predicted_labels = [labels[k] for k in predicted_class_indices]

print(f"Number of predicted labels: {len(predicted_labels)}")

# Ensure predicted_labels matches the length of test_data
if len(predicted_labels) < len(test_data):
    print("Warning: Number of predictions is less than number of test images.")
    print("Padding predictions with 'unknown' to match test data length.")
    predicted_labels.extend(['unknown'] * (len(test_data) - len(predicted_labels)))
elif len(predicted_labels) > len(test_data):
    print("Warning: Number of predictions is more than number of test images.")
    print("Truncating predictions to match test data length.")
    predicted_labels = predicted_labels[:len(test_data)]

# Create a submission file
submission = pd.DataFrame({
    'id': test_data['img_fName'],
    'prediction': predicted_labels
})

print(f"Final submission shape: {submission.shape}")
submission.to_csv('submission.csv', index=False)
print('Submission file saved as submission.csv')