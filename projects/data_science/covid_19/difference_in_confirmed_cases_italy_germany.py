import pandas as pd

# Load the dataset
covid_data = pd.read_csv('covid_data.csv')

# Filter the data for Italy and Germany
italy_data = covid_data[covid_data['location'] == 'Italy']
germany_data = covid_data[covid_data['location'] == 'Germany']

# Calculate the cumulative confirmed cases for each country by date
italy_data['cumulative_cases'] = italy_data['new_cases'].cumsum()
germany_data['cumulative_cases'] = germany_data['new_cases'].cumsum()

# Merge the datasets on the date
merged_data = pd.merge(italy_data[['date', 'cumulative_cases']], germany_data[['date', 'cumulative_cases']], on='date', suffixes=('_italy', '_germany'))

# Calculate the difference in cumulative cases
merged_data['case_difference'] = abs(merged_data['cumulative_cases_italy'] - merged_data['cumulative_cases_germany'])

# Find the date when the difference exceeds 10,000
date_difference_exceeds_10000 = merged_data[merged_data['case_difference'] > 10000].iloc[0]['date']

print("Date when the difference in total confirmed cases between Italy and Germany exceeded 10,000:", date_difference_exceeds_10000)
