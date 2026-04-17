# services/ml/premium_service/train.py
import os
import pickle

import pandas as pd
import psycopg2
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import cross_val_score, train_test_split

DB_URL = os.environ['DATABASE_URL']

FEATURES = [
    'rain_mm_7day',
    'max_temp_c',
    'min_temp_c',
    'rain_days_count',
    'heavy_rain_days',
    'heat_days',
    'zone_risk_score',
    'flood_prone',
    'month',
    'is_monsoon',
    'is_summer',
]


def main():
    print('🚀 Training premium pricing model on real weather data...')
    connection = psycopg2.connect(DB_URL)

    df = pd.read_sql(
        '''
        SELECT
            rain_mm_7day,
            max_temp_c,
            min_temp_c,
            rain_days_count,
            heavy_rain_days,
            heat_days,
            zone_risk_score,
            COALESCE(flood_prone::int, 0) AS flood_prone,
            month,
            is_monsoon,
            is_summer,
            optimal_premium_rupees AS target
        FROM ml_training_data
        WHERE optimal_premium_rupees IS NOT NULL
          AND optimal_premium_rupees BETWEEN 60 AND 280
        ''',
        connection,
    )

    if df.empty:
        raise RuntimeError('No premium training data found. Run build_real_dataset.py first.')

    print(f'Training rows: {len(df)}')

    X = df[FEATURES].fillna(0)
    y = df['target']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = GradientBoostingRegressor(
        n_estimators=400,
        learning_rate=0.04,
        max_depth=5,
        subsample=0.8,
        random_state=42,
    )
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)
    cv_r2 = cross_val_score(model, X, y, cv=5, scoring='r2').mean()

    print(f'MAE: Rs.{mae:.2f}')
    print(f'R2: {r2:.4f}')
    print(f'CV-R2: {cv_r2:.4f}')

    with open('premium_model.pkl', 'wb') as handle:
        pickle.dump(
            {
                'model': model,
                'features': FEATURES,
                'mae': float(mae),
                'r2': float(r2),
                'cv_r2': float(cv_r2),
                'trained_on_rows': int(len(df)),
                'trained_at': pd.Timestamp.now().isoformat(),
            },
            handle,
        )

    print('💾 Model saved to premium_model.pkl')
    connection.close()


if __name__ == '__main__':
    main()
