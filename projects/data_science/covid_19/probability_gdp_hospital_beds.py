import pandas as pd

# Load the dataset
covid_data = pd.read_csv('covid_data.csv')

# Filter the data to include only countries with at least 5 hospital beds per 1,000 inhabitants
filtered_beds_data = covid_data.dropna(subset=['gdp_per_capita', 'hospital_beds_per_thousand'])
at_least_5_beds = filtered_beds_data[filtered_beds_data['hospital_beds_per_thousand'] >= 5]

# Calculate the proportion of these countries that have a GDP over $10,000
gdp_over_10000 = at_least_5_beds['gdp_per_capita'] > 10000
probability_gdp_over_10000 = gdp_over_10000.mean()

print("Probability that a country has GDP over $10,000 given at least 5 hospital beds per 1,000 inhabitants:", probability_gdp_over_10000)
