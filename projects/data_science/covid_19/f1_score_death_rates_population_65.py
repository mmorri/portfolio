import pandas as pd
from sklearn.metrics import f1_score, precision_score, recall_score, confusion_matrix

# Load the dataset
covid_data = pd.read_csv('covid_data.csv')

# Filter out countries with missing information
filtered_data = covid_data.dropna(subset=['aged_65_older_percent', 'new_deaths', 'population'])

# Calculate total deaths and death rate per million inhabitants for each country
total_deaths = filtered_data.groupby('location')['new_deaths'].sum()
population = filtered_data.groupby('location')['population'].max()
death_rate_per_million = (total_deaths / population) * 1_000_000

# Retrieve the percentage of the population over 65 for each country
aged_65_older_percent = filtered_data.groupby('location')['aged_65_older_percent'].max()

# Create binary classifications
over_65_high = aged_65_older_percent > 20
death_rate_high = death_rate_per_million > 50

# Ensure both classifications have the same index
common_countries = over_65_high.index.intersection(death_rate_high.index)
over_65_high = over_65_high[common_countries]
death_rate_high = death_rate_high[common_countries]

# Calculate the F1 score
f1 = f1_score(over_65_high, death_rate_high)
precision = precision_score(over_65_high, death_rate_high)
recall = recall_score(over_65_high, death_rate_high)
conf_matrix = confusion_matrix(over_65_high, death_rate_high)

print("F1 Score:", f1)
print("Precision:", precision)
print("Recall:", recall)
print("Confusion Matrix:")
print(conf_matrix)
