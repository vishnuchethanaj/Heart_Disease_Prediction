# =========================================
# Heart Disease Prediction using ANN
# Evaluation with Graphs
# =========================================

# -------- 1. Import Libraries --------
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import confusion_matrix, roc_curve, auc

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense

# -------- 2. Load Dataset --------
data = pd.read_csv("C:/Users/kswat/Downloads/heart_disease_raw_data.csv")

print("Dataset Loaded")
print("Shape:", data.shape)

# -------- 3. Feature Extraction (Correlation Based) --------
correlation = data.corr()["target"].sort_values(ascending=False)

# Select top features (excluding target)
important_features = correlation.index[1:8]
print("Selected Features:", list(important_features))

# Create reduced dataset
data_selected = data[list(important_features) + ["target"]]

# -------- 4. Split Features and Target --------
X = data_selected.drop("target", axis=1)
y = data_selected["target"]

# -------- 5. Scale Data --------
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# -------- 6. Train-Test Split --------
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42
)

# -------- 7. Build ANN (One Hidden Layer) --------
model = Sequential()
model.add(Dense(8, activation="relu", input_shape=(X_train.shape[1],)))
model.add(Dense(1, activation="sigmoid"))

model.compile(
    optimizer="adam",
    loss="binary_crossentropy",
    metrics=["accuracy"]
)

# -------- 8. Train Model --------
history = model.fit(
    X_train, y_train,
    epochs=50,
    batch_size=16,
    validation_split=0.1,
    verbose=1
)

# -------- 9. Predictions --------
y_pred_prob = model.predict(X_test)
y_pred = (y_pred_prob > 0.5).astype(int)

# =========================================
# -------- 10. GRAPH EVALUATION --------
# =========================================

# ---- Graph 1: Training vs Validation Accuracy ----
plt.figure()
plt.plot(history.history['accuracy'], label='Training Accuracy')
plt.plot(history.history['val_accuracy'], label='Validation Accuracy')
plt.xlabel('Epochs')
plt.ylabel('Accuracy')
plt.title('Training and Validation Accuracy')
plt.legend()
plt.show()

# ---- Graph 2: Training vs Validation Loss ----
plt.figure()
plt.plot(history.history['loss'], label='Training Loss')
plt.plot(history.history['val_loss'], label='Validation Loss')
plt.xlabel('Epochs')
plt.ylabel('Loss')
plt.title('Training and Validation Loss')
plt.legend()
plt.show()

# ---- Graph 3: Confusion Matrix ----
cm = confusion_matrix(y_test, y_pred)

plt.figure()
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.title('Confusion Matrix')
plt.show()

# ---- Graph 4: ROC Curve ----
fpr, tpr, _ = roc_curve(y_test, y_pred_prob)
roc_auc = auc(fpr, tpr)

plt.figure()
plt.plot(fpr, tpr, label='ANN (AUC = %0.2f)' % roc_auc)
plt.plot([0, 1], [0, 1], linestyle='--')
plt.xlabel('False Positive Rate')
plt.ylabel('True Positive Rate')
plt.title('ROC Curve')
plt.legend()
plt.show()