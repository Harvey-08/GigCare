import pickle

import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier


def main():
    frame = pd.read_csv('fraud_training_data.csv')
    features = [column for column in frame.columns if column != 'label']
    X = frame[features]
    y = frame['label']

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        stratify=y,
        random_state=42,
    )

    model = XGBClassifier(
        n_estimators=400,
        max_depth=6,
        learning_rate=0.04,
        scale_pos_weight=4,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric='auc',
        random_state=42,
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    iso_forest = IsolationForest(contamination=0.05, n_estimators=200, random_state=42)
    iso_forest.fit(X_train[y_train == 0])

    try:
        import shap

        explainer = shap.TreeExplainer(model)
        shap_available = True
        _ = explainer.shap_values(X_test.iloc[:5])
    except Exception:
        explainer = None
        shap_available = False

    probabilities = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, probabilities)
    predictions = (probabilities > 0.5).astype(int)
    report = classification_report(y_test, predictions, target_names=['Legit', 'Fraud'])
    matrix = confusion_matrix(y_test, predictions)
    false_positive_rate = matrix[0, 1] / max(1, (matrix[0, 0] + matrix[0, 1]))

    print(f'AUC: {auc:.4f}')
    print(report)
    print(f'False Positive Rate: {false_positive_rate:.4f}')

    artifact = {
        'xgb_model': model,
        'iso_forest': iso_forest,
        'features': features,
        'shap_explainer': explainer,
        'shap_available': shap_available,
        'auc': float(auc),
        'false_positive_rate': float(false_positive_rate),
    }

    with open('fraud_models.pkl', 'wb') as handle:
        pickle.dump(artifact, handle)

    print('Fraud models saved.')


if __name__ == '__main__':
    main()