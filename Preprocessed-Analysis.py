# ================================
# Heart Disease Prediction Project
# ================================

# Import Libraries
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    classification_report,
    roc_curve,
    auc
)

# -------------------------------
# 1. Load Dataset
# -------------------------------
df = pd.read_csv("C:/Users/kswat/Downloads/heart_disease_raw_data.csv")

# -------------------------------
# 2. Split Features and Target
# -------------------------------
X = df.drop("target", axis=1)
y = df["target"]

# -------------------------------
# 3. Train-Test Split
# -------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# -------------------------------
# 4. Feature Scaling
# -------------------------------
scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)

# -------------------------------
# 5. Train Logistic Regression Model
# -------------------------------
model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)

# -------------------------------
# 6. Predictions
# -------------------------------
y_pred = model.predict(X_test)
y_prob = model.predict_proba(X_test)[:, 1]

# -------------------------------
# 7. Accuracy
# -------------------------------
accuracy = accuracy_score(y_test, y_pred)
print("Accuracy:", accuracy)

# -------------------------------
# 8. Confusion Matrix
# -------------------------------
cm = confusion_matrix(y_test, y_pred)
print("\nConfusion Matrix:\n", cm)

tn, fp, fn, tp = cm.ravel()

print("\nTrue Positives:", tp)
print("True Negatives:", tn)
print("False Positives:", fp)
print("False Negatives:", fn)

# -------------------------------
# 9. Classification Report
# -------------------------------
print("\nClassification Report:\n")
print(classification_report(y_test, y_pred))

# -------------------------------
# 10. ROC Curve
# -------------------------------
fpr, tpr, thresholds = roc_curve(y_test, y_prob)
roc_auc = auc(fpr, tpr)

plt.figure()
plt.plot(fpr, tpr)
plt.xlabel("False Positive Rate")
plt.ylabel("True Positive Rate")
plt.title("ROC Curve")
plt.show()

print("AUC Score:", roc_auc)