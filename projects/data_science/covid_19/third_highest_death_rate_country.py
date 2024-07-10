import pandas as pd

# Load the dataset
covid_data = pd.read_csv('covid_data.csv')

# Calculate the total number of deaths for each country
total_deaths = covid_data.groupby('location')['new_deaths'].sum()

# Retrieve the population for each country
population = covid_data.groupby('location')['population'].max()

# Calculate the death rate per million inhabitants for each country
death_rate_per_million = (total_deaths / population) * 1_000_000

# Find the country with the 3rd highest death rate
third_highest_death_rate_country = death_rate_per_million.nlargest(3).index[2]
third_highest_death_rate_value = death_rate_per_million.nlargest(3).iloc[2]

print("Country with the 3rd highest death rate:", third_highest_death_rate_country)
print("Death rate per million inhabitants:", third_highest_death_rate_value)
