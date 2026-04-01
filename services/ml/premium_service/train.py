# services/ml/premium_service/train.py
# Train RandomForest premium pricing model - Person C

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import pickle

print("🚀 Training Premium Pricing Model...")

# Generate synthetic training data
np.random.seed(42)
n = 1200

df = pd.DataFrame({
    'zone_risk_score': np.random.uniform(0.8, 2.0, n),
    'historical_rain_events': np.random.randint(0, 15, n),
    'historical_heat_events': np.random.randint(0, 8, n),
    'forecast_rain_prob': np.random.uniform(0, 1, n),
    'forecast_max_temp_c': np.random.uniform(25, 44, n),
    'worker_experience_weeks': np.random.randint(1, 104, n),
    'past_claim_count': np.random.randint(0, 20, n),
    'past_fraud_flags': np.random.randint(0, 3, n),
})

df['past_claim_ratio'] = df['past_claim_count'] / (df['worker_experience_weeks'] + 1)

# Target: formula + realistic noise
forecast_mult = 0.9 + df['forecast_rain_prob'] * 0.5
trust_penalty = np.clip(df['past_fraud_flags'] * 0.15 - df['past_claim_count'].clip(0, 3) * 0.05, -0.1, 0.3)

df['premium_rupees'] = (
    100 * df['zone_risk_score'] * forecast_mult * (1 + trust_penalty) +
    np.random.normal(0, 5, n)
).clip(60, 280)

# Prepare features and target
features = [
    'zone_risk_score', 'historical_rain_events', 'historical_heat_events',
    'forecast_rain_prob', 'forecast_max_temp_c', 'worker_experience_weeks',
    'past_claim_count', 'past_fraud_flags', 'past_claim_ratio'
]

X = df[features]
y = df['premium_rupees']

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train RandomForest
model = RandomForestRegressor(n_estimators=200, max_depth=8, random_state=42)
model.fit(X_train, y_train)

# Evaluate
preds = model.predict(X_test)
rmse = np.sqrt(mean_squared_error(y_test, preds))
r2 = r2_score(y_test, preds)

print(f"✅ Model Training Complete:")
print(f"   RMSE: {rmse:.2f} Rs")
print(f"   R² Score: {r2:.4f}")
print(f"   Features: {len(features)}")
print(f"   Training samples: {len(X_train)}")

# Save model
with open('premium_model.pkl', 'wb') as f:
    pickle.dump({'model': model, 'features': features}, f)

print("💾 Model saved to premium_model.pkl")
