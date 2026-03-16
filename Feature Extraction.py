import pandas as pd

# Load dataset
data = pd.read_csv("C:/Users/kswat/Downloads/heart_disease_raw_data.csv")

# Find correlation with target
correlation = data.corr()["target"].sort_values(ascending=False)

print("Correlation of features with target:\n")
print(correlation)

# Select top features (excluding target itself)
important_features = correlation.index[1:8]  # top 7 features

print("\nSelected Important Features:")
print(list(important_features))

# Create new dataset with important features
data_selected = data[list(important_features) + ["target"]]

print("\nNew Dataset Shape:", data_selected.shape)
#saving new dataset
data_selected.to_csv("heart_disease_selected_features.csv", index=False)

print("New dataset saved as heart_disease_selected_features.csv")