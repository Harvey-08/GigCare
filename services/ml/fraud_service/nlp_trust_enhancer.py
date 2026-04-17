# services/ml/fraud_service/nlp_trust_enhancer.py
# NLP-based trust score enhancement
# Analyzes worker profile signals, claim history patterns, and linguistic patterns
# to provide enhanced trust signal grounded in behavioral linguistics

import re
from collections import Counter


class NLPTrustEnhancer:
    def __init__(self):
        self.complaint_keywords = [
            'fraud', 'scam', 'fake', 'stolen', 'unauthorized', 'protest',
            'misbehave', 'aggressive', 'threat', 'abuse', 'harass'
        ]
        self.legit_keywords = [
            'accident', 'illness', 'emergency', 'breakdown', 'safe', 'reliable',
            'punctual', 'honest', 'professional', 'helpful', 'experienced'
        ]

    def extract_linguistic_features(self, text):
        """Extract linguistic signals from worker communication"""
        if not text or not isinstance(text, str):
            return {
                'has_complaint': 0,
                'has_explicit_language': 0,
                'text_coherence': 0.5,
                'message_length_words': 0,
            }

        text_lower = text.lower()

        # Check for complaint linguistics
        complaint_score = sum(1 for kw in self.complaint_keywords if kw in text_lower)
        legit_score = sum(1 for kw in self.legit_keywords if kw in text_lower)

        # Explicit/abusive language heuristics
        explicit_patterns = [r'\$\$', r'f[u!]\*\*', r'[a-z]\*+[a-z]', r'!!!+', r'\?\?+']
        explicit_score = sum(1 for pattern in explicit_patterns if re.search(pattern, text_lower))

        # Text coherence: presence of structured communication
        words = text_lower.split()
        word_count = len([w for w in words if len(w) > 1])
        avg_word_length = sum(len(w) for w in words) / max(1, len(words))

        coherence = min(1.0, avg_word_length / 6.0)

        return {
            'has_complaint': min(1, complaint_score / 3.0),
            'has_explicit_language': min(1, explicit_score / 2.0),
            'text_coherence': coherence,
            'message_length_words': min(1, word_count / 50.0),
            'legit_keyword_count': legit_score,
        }

    def analyze_behavior_patterns(self, worker_history):
        """Analyze historical worker behavior for trust signals"""
        if not worker_history or not isinstance(worker_history, dict):
            return {
                'consistency_score': 0.5,
                'average_claim_value_norm': 0.5,
                'claim_frequency_norm': 0.5,
                'timezone_consistency': 0.8,
            }

        total_claims = worker_history.get('total_claims', 0)
        average_payout = worker_history.get('average_payout_rupees', 0)
        approved_ratio = worker_history.get('approved_claims_ratio', 0.5)
        days_active = worker_history.get('days_active', 1)

        # Consistency: active workers with steady claim rate
        consistency = max(0, min(1, (total_claims / (days_active + 1)) / 2.0))

        # Average payout should be moderate (not extreme)
        average_payout_norm = max(0, 1.0 - abs(average_payout - 800) / 800.0)

        # Frequency should be reasonable (not spamming claims)
        claim_frequency = min(1, total_claims / 30.0)

        # Timezone heuristic: workers claiming consistently in their local timezone
        timezone_consistency = 0.8  # Placeholder for cross-timezone analysis

        return {
            'consistency_score': consistency,
            'average_claim_value_norm': average_payout_norm,
            'claim_frequency_norm': claim_frequency,
            'timezone_consistency': timezone_consistency,
            'approval_ratio': approved_ratio,
        }

    def calculate_nlp_trust_boost(self, linguistic_features, behavior_patterns, base_trust_score):
        """
        Calculate NLP-based trust boost to apply to base fraud score
        Returns a multiplicative factor (0.8-1.2) to adjust trust_score
        """
        linguistic_boost = 0.0

        # Positive signals
        linguistic_boost += linguistic_features.get('text_coherence', 0) * 0.1
        linguistic_boost += linguistic_features.get('message_length_words', 0) * 0.05
        linguistic_boost += linguistic_features.get('legit_keyword_count', 0) * 0.05

        # Negative signals
        linguistic_boost -= linguistic_features.get('has_complaint', 0) * 0.15
        linguistic_boost -= linguistic_features.get('has_explicit_language', 0) * 0.1

        # Behavioral boost
        behavior_boost = behavior_patterns.get('consistency_score', 0) * 0.15
        behavior_boost += behavior_patterns.get('average_claim_value_norm', 0) * 0.1
        behavior_boost += behavior_patterns.get('approval_ratio', 0) * 0.15

        total_boost = linguistic_boost + behavior_boost
        # Clamp boost to reasonable range: -0.3 to +0.3
        total_boost = max(-0.3, min(0.3, total_boost))

        # Apply boost multiplicatively
        adjustment_factor = 1.0 + total_boost
        adjusted_trust = base_trust_score * adjustment_factor
        return {
            'adjusted_trust_score': max(0.0, min(1.0, adjusted_trust)),
            'linguistic_boost': linguistic_boost,
            'behavioral_boost': behavior_boost,
            'adjustment_factor': adjustment_factor,
        }

    def enhance_claim_decision(self, base_decision, linguistic_features, behavior_patterns):
        """
        Enhance fraud decision with NLP signals
        Can upgrade FLAGGED→PARTIAL or downgrade APPROVED→PARTIAL based on signals
        """
        base_trust = {'APPROVED': 0.9, 'PARTIAL': 0.65, 'FLAGGED': 0.35}.get(base_decision, 0.5)

        nlp_result = self.calculate_nlp_trust_boost(linguistic_features, behavior_patterns, base_trust)
        adjusted_trust = nlp_result['adjusted_trust_score']

        # Map adjusted trust back to decision
        if adjusted_trust > 0.85:
            new_decision = 'APPROVED'
        elif adjusted_trust >= 0.60:
            new_decision = 'PARTIAL'
        else:
            new_decision = 'FLAGGED'

        return {
            'original_decision': base_decision,
            'enhanced_decision': new_decision,
            'adjusted_trust_score': adjusted_trust,
            'nlp_features': linguistic_features,
            'behavior_patterns': behavior_patterns,
        }


nlp_enhancer = NLPTrustEnhancer()
