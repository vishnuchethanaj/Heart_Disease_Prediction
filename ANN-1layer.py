import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense

# Load data
data = pd.read_csv("C:/Users/kswat/Downloads/heart_disease_raw_data.csv")

# Feature selection
correlation = data.corr()["target"].sort_values(ascending=False)
important_features = correlation.index[1:8]

data_selected = data[list(important_features) + ["target"]]

# Split features and target
X = data_selected.drop("target", axis=1)
y = data_selected["target"]

# Scale data
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42
)

# Build ANN (ONE hidden layer)
model = Sequential()
model.add(Dense(8, activation="relu", input_shape=(X_train.shape[1],)))
model.add(Dense(1, activation="sigmoid"))

# Compile
model.compile(
    optimizer="adam",
    loss="binary_crossentropy",
    metrics=["accuracy"]
)

# Train
model.fit(X_train, y_train, epochs=50, batch_size=16, verbose=1)