from scipy.optimize import curve_fit
import numpy as np
import pandas as pd

# Load the dataset
covid_data = pd.read_csv('covid_data.csv')

# Filter the data for Italy
italy_data = covid_data[covid_data['location'] == 'Italy']

# Filter data for Italy between 2020-02-28 and 2020-03-20
italy_data_filtered = italy_data[(italy_data['date'] >= '2020-02-28') & (italy_data['date'] <= '2020-03-20')]

# Define an exponential function
def exponential_func(x, a, b):
    return a * np.exp(b * x)

# Prepare the data for curve fitting
italy_data_filtered['days_passed'] = np.arange(len(italy_data_filtered))
x_data = italy_data_filtered['days_passed']
y_data = italy_data_filtered['cumulative_cases']

# Fit the exponential curve
params, _ = curve_fit(exponential_func, x_data, y_data, maxfev=10000)

# Predict cumulative cases on 2020-03-20 using the fitted exponential function
days_passed_2020_03_20 = (pd.to_datetime('2020-03-20') - pd.to_datetime('2020-02-28')).days
predicted_cases_2020_03_20 = exponential_func(days_passed_2020_03_20, *params)

# Actual cumulative cases on 2020-03-20
actual_cases_2020_03_20 = italy_data_filtered[italy_data_filtered['date'] == '2020-03-20']['cumulative_cases'].values[0]

# Calculate the difference
difference = predicted_cases_2020_03_20 - actual_cases_2020_03_20

print("Predicted cases on 2020-03-20:", predicted_cases_2020_03_20)
print("Actual cases on 2020-03-20:", actual_cases_2020_03_20)
print("Difference:", difference)
