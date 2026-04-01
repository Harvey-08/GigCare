-- GigCare Demo Seed Data
-- Run this after migrations to populate demo data

-- =====================================================
-- CLEAR ALL DATA (RESTART SEQUENCES)
-- =====================================================
TRUNCATE TABLE trigger_events, location_signals, claims, policies, 
              premium_quotes, devices, workers, admins, zones RESTART IDENTITY CASCADE;

-- =====================================================
-- ZONES (5 Bengaluru zones with different risk profiles)
-- =====================================================
INSERT INTO zones (zone_id, name, city, zone_risk_score, zone_risk_level, flood_prone, lat, lon)
VALUES
  ('zone_01', 'Koramangala', 'Bengaluru', 0.85, 'LOW', FALSE, 12.9352, 77.6245),
  ('zone_02', 'Whitefield', 'Bengaluru', 1.60, 'HIGH', TRUE, 12.9698, 77.7499),
  ('zone_03', 'Indiranagar', 'Bengaluru', 1.00, 'MEDIUM', FALSE, 12.9716, 77.6412),
  ('zone_04', 'HSR Layout', 'Bengaluru', 1.20, 'MEDIUM', FALSE, 12.9151, 77.6398),
  ('zone_05', 'Bommanahalli', 'Bengaluru', 1.45, 'HIGH', TRUE, 12.9010, 77.6182);

-- =====================================================
-- DEMO WORKERS (for testing)
-- =====================================================
INSERT INTO workers (worker_id, name, phone, platform, zone_id, bike_type, avg_daily_income, avg_daily_orders, shifts, trust_score)
VALUES
  ('w-demo-001', 'Priya Sharma', '+919876543210', 'ZOMATO', 'zone_02', 'TWO_WHEELER', 700.0, 25, ARRAY['EVENING'::shift_enum], 0.95),
  ('w-demo-002', 'Raj Kumar', '+918765432109', 'SWIGGY', 'zone_01', 'TWO_WHEELER', 650.0, 22, ARRAY['MORNING'::shift_enum, 'EVENING'::shift_enum], 0.88),
  ('w-demo-003', 'Anjali Verma', '+917654321098', 'ZEPTO', 'zone_03', 'E_BIKE', 550.0, 20, ARRAY['SPLIT'::shift_enum], 0.92),
  ('w-demo-004', 'Arjun Singh', '+916543210987', 'AMAZON', 'zone_04', 'TWO_WHEELER', 720.0, 28, ARRAY['EVENING'::shift_enum], 0.78),
  ('w-demo-005', 'Maya Gupta', '+915432109876', 'ZOMATO', 'zone_05', 'BICYCLE', 450.0, 18, ARRAY['MORNING'::shift_enum], 0.85);

-- =====================================================
-- DEVICES (for fraud detection context)
-- =====================================================
INSERT INTO devices (device_id, worker_id, fingerprint_hash, rooted_flag, shared_account_count, last_seen)
VALUES
  ('dev-001', 'w-demo-001', 'abc123xyz789', FALSE, 1, CURRENT_TIMESTAMP),
  ('dev-002', 'w-demo-002', 'def456uvw456', FALSE, 1, CURRENT_TIMESTAMP),
  ('dev-003', 'w-demo-003', 'ghi789pqr123', FALSE, 1, CURRENT_TIMESTAMP),
  ('dev-004', 'w-demo-004', 'jkl012mno456', FALSE, 1, CURRENT_TIMESTAMP),
  ('dev-005', 'w-demo-005', 'pqr345stu789', FALSE, 1, CURRENT_TIMESTAMP);

-- =====================================================
-- ACTIVE POLICIES (for demo flow)
-- =====================================================
INSERT INTO policies (policy_id, worker_id, coverage_tier, premium_paid, max_payout, week_start, week_end, status, razorpay_payment_id)
VALUES
  ('pol-001', 'w-demo-001', 'STANDARD', 162, 1200, CURRENT_DATE, CURRENT_DATE + 6, 'ACTIVE', 'pay_123456789'),
  ('pol-002', 'w-demo-002', 'STANDARD', 120, 1000, CURRENT_DATE, CURRENT_DATE + 6, 'ACTIVE', 'pay_987654321'),
  ('pol-003', 'w-demo-003', 'SEED', 95, 600, CURRENT_DATE, CURRENT_DATE + 6, 'ACTIVE', 'pay_555555555'),
  ('pol-004', 'w-demo-004', 'PREMIUM', 200, 1800, CURRENT_DATE, CURRENT_DATE + 6, 'ACTIVE', 'pay_444444444'),
  ('pol-005', 'w-demo-005', 'STANDARD', 150, 1200, CURRENT_DATE, CURRENT_DATE + 6, 'ACTIVE', 'pay_333333333');

-- =====================================================
-- TRIGGER EVENTS (simulate external disruptions)
-- =====================================================
INSERT INTO trigger_events (event_id, zone_id, trigger_type, trigger_value, severity_factor, peak_multiplier, order_drop_percentage, started_at, ended_at, event_status)
VALUES
  ('ev-001', 'zone_02', 'HEAVY_RAIN', 68.5, 1.3, 1.2, 45.0, CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP, 'ACTIVE'),
  ('ev-002', 'zone_01', 'EXTREME_HEAT', 42.1, 1.0, 1.0, 32.0, CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP, 'ACTIVE'),
  ('ev-003', 'zone_03', 'POOR_AQI', 315, 1.0, 1.0, 28.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '4 hours', 'ACTIVE');

-- =====================================================
-- CLAIMS (auto-created from trigger events)
-- =====================================================
INSERT INTO claims (claim_id, policy_id, worker_id, trigger_event_id, trigger_type, trigger_value, disruption_start, disruption_end, disruption_hours, raw_payout, final_payout, trust_score, status, razorpay_payout_id)
VALUES
  ('clm-001', 'pol-001', 'w-demo-001', 'ev-001', 'HEAVY_RAIN', 68.5, CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '0.5 hours', 1.5, 450, 380, 0.91, 'PAID', 'payout_aaa111'),
  ('clm-002', 'pol-002', 'w-demo-002', 'ev-002', 'EXTREME_HEAT', 42.1, CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP, 1.0, 325, 325, 0.88, 'APPROVED', NULL),
  ('clm-003', 'pol-003', 'w-demo-003', 'ev-003', 'POOR_AQI', 315, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '4 hours', 4.0, 550, 275, 0.72, 'PARTIAL', NULL);

-- =====================================================
-- LOCATION SIGNALS (fraud detection context)
-- =====================================================
INSERT INTO location_signals (signal_id, claim_id, device_id, gps_lat, gps_lon, gps_accuracy, cell_tower_ids, wifi_ssids, accelerometer_mag, ip_address, timestamp)
VALUES
  ('sig-001', 'clm-001', 'dev-001', 12.9698, 77.7499, 15.0, ARRAY['234', '235', '236'], ARRAY['Zomato_Zone02', 'Airtel_Home'], 3.2, '103.21.45.67', CURRENT_TIMESTAMP),
  ('sig-002', 'clm-002', 'dev-002', 12.9352, 77.6245, 12.0, ARRAY['121', '122'], ARRAY['Jio_Free'], 2.8, '103.21.40.89', CURRENT_TIMESTAMP),
  ('sig-003', 'clm-003', 'dev-003', 12.9716, 77.6412, 18.0, ARRAY['345', '346'], ARRAY['Vodafone_Indir'], 3.5, '103.21.50.123', CURRENT_TIMESTAMP);

-- =====================================================
-- ADMINS (for admin dashboard)
-- =====================================================
INSERT INTO admins (admin_id, email, name, phone, role, permissions, is_active)
VALUES
  ('admin-001', 'admin@gigcare.com', 'Admin User', '9876543210', 'ADMIN', ARRAY['read', 'write', 'admin'], TRUE);

-- =====================================================
-- ADMINS (for admin dashboard)
-- =====================================================
INSERT INTO admins (admin_id, email, name, phone, role, permissions, is_active)
VALUES
  ('admin-001', 'admin@gigcare.com', 'Admin User', '9876543210', 'ADMIN', ARRAY['read', 'write', 'admin'], TRUE);
