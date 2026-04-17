import numpy as np
import pandas as pd


def main():
    np.random.seed(42)
    n_legit = 5000
    n_fraud = 1250

    legit = pd.DataFrame(
        {
            'gps_cell_offset_km': np.random.exponential(0.12, n_legit).clip(0, 0.8),
            'gps_wifi_offset_km': np.random.exponential(0.08, n_legit).clip(0, 0.5),
            'implied_max_speed_kmh': np.random.normal(26, 7, n_legit).clip(0, 60),
            'accelerometer_mag': np.random.normal(8.5, 2, n_legit).clip(1, 20),
            'accel_gps_delta': np.random.normal(2, 1, n_legit).clip(0, 8),
            'ip_gps_mismatch': np.random.binomial(1, 0.04, n_legit),
            'timezone_mismatch': np.random.binomial(1, 0.02, n_legit),
            'shared_device_count': np.random.choice([1, 1, 1, 1, 2], n_legit),
            'rooted_device': np.random.binomial(1, 0.03, n_legit),
            'claim_cluster_10min': np.random.poisson(1.5, n_legit).clip(0, 5),
            'claims_last_7_days': np.random.poisson(1.1, n_legit).clip(0, 4),
            'seconds_since_trigger': np.random.exponential(180, n_legit).clip(30, 3600),
            'gps_zone_offset_km': np.random.exponential(0.2, n_legit).clip(0, 0.9),
            'platform_login_match': np.random.binomial(1, 0.96, n_legit),
            'cross_city_claim': np.zeros(n_legit),
            'label': 0,
        }
    )

    fraud = pd.DataFrame(
        {
            'gps_cell_offset_km': np.random.normal(2.8, 0.9, n_fraud).clip(0.8, 8),
            'gps_wifi_offset_km': np.random.normal(3.2, 1.1, n_fraud).clip(0.8, 10),
            'implied_max_speed_kmh': np.random.choice([0.0, 0.05, 190, 220, 85], n_fraud),
            'accelerometer_mag': np.random.uniform(0, 0.25, n_fraud),
            'accel_gps_delta': np.random.normal(14, 4, n_fraud).clip(5, 25),
            'ip_gps_mismatch': np.random.binomial(1, 0.70, n_fraud),
            'timezone_mismatch': np.random.binomial(1, 0.45, n_fraud),
            'shared_device_count': np.random.choice([5, 6, 7, 8, 12, 15], n_fraud),
            'rooted_device': np.random.binomial(1, 0.72, n_fraud),
            'claim_cluster_10min': np.random.choice([18, 25, 32, 45, 60], n_fraud),
            'claims_last_7_days': np.random.randint(6, 15, n_fraud),
            'seconds_since_trigger': np.random.uniform(1, 25, n_fraud),
            'gps_zone_offset_km': np.random.normal(3.5, 1.2, n_fraud).clip(1.5, 10),
            'platform_login_match': np.random.binomial(1, 0.12, n_fraud),
            'cross_city_claim': np.random.binomial(1, 0.55, n_fraud),
            'label': 1,
        }
    )

    frame = pd.concat([legit, fraud]).sample(frac=1, random_state=42).reset_index(drop=True)
    frame.to_csv('fraud_training_data.csv', index=False)
    print(f'Generated {len(frame)} rows ({n_legit} legit, {n_fraud} fraud)')


if __name__ == '__main__':
    main()