"""
Kaggle Dataset Loader & Disease-Symptom Knowledge Base.
Loads and caches dhivyeshrk/diseases-and-symptoms-dataset (246,945 rows, 773 diseases, 377 symptoms).
Provides precomputed disease-symptom conditional prevalence matrices for instant ML inference.
"""
import os
import logging
from typing import List, Dict, Tuple, Optional
import pandas as pd
import numpy as np

logger = logging.getLogger("smart_health_grid.kaggle_dataset")

DATASET_HANDLE = "dhivyeshrk/diseases-and-symptoms-dataset"
CSV_FILE_NAME = "Final_Augmented_dataset_Diseases_and_Symptoms.csv"
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
PARQUET_PATH = os.path.join(DATA_DIR, "diseases_symptoms.parquet")
PROFILE_MATRIX_PATH = os.path.join(DATA_DIR, "disease_profile_matrix.parquet")

_cached_dataframe: Optional[pd.DataFrame] = None
_cached_profile_matrix: Optional[pd.DataFrame] = None
_cached_symptoms_list: Optional[List[str]] = None
_cached_diseases_list: Optional[List[str]] = None


def load_dataset_from_kaggle() -> pd.DataFrame:
    """
    Loads the diseases and symptoms dataset using kagglehub.
    First checks local cached parquet; if missing, downloads from Kaggle.
    """
    global _cached_dataframe
    if _cached_dataframe is not None:
        return _cached_dataframe

    os.makedirs(DATA_DIR, exist_ok=True)

    # 1. Try loading pre-existing parquet (instant <50ms load)
    if os.path.exists(PARQUET_PATH):
        try:
            logger.info("Loading diseases and symptoms dataset from cached parquet: %s", PARQUET_PATH)
            df = pd.read_parquet(PARQUET_PATH)
            _cached_dataframe = df
            return df
        except Exception as e:
            logger.warning("Failed to load cached parquet (%s), attempting Kaggle download...", e)

    # 2. Download via kagglehub
    try:
        import kagglehub
        from kagglehub import KaggleDatasetAdapter

        # Attempt kagglehub.load_dataset first
        try:
            logger.info("Attempting kagglehub.load_dataset with KaggleDatasetAdapter.PANDAS...")
            df = kagglehub.load_dataset(
                KaggleDatasetAdapter.PANDAS,
                DATASET_HANDLE,
                CSV_FILE_NAME,
            )
        except Exception as kerr:
            logger.info("kagglehub.load_dataset encountered (%s). Using kagglehub.dataset_download archive...", kerr)
            download_dir = kagglehub.dataset_download(DATASET_HANDLE)
            csv_path = os.path.join(download_dir, CSV_FILE_NAME)
            if not os.path.exists(csv_path):
                # Check any csv in download_dir
                csv_files = [f for f in os.listdir(download_dir) if f.endswith(".csv")]
                if csv_files:
                    csv_path = os.path.join(download_dir, csv_files[0])
                else:
                    raise FileNotFoundError(f"No CSV found in Kaggle download directory: {download_dir}")

            df = pd.read_csv(csv_path)

        # Save parquet cache for fast future startup
        df.to_parquet(PARQUET_PATH, compression="snappy")
        _cached_dataframe = df
        logger.info("Dataset successfully loaded and cached. Shape: %s", df.shape)
        return df

    except Exception as e:
        logger.error("Failed to download dataset via kagglehub: %s", e)
        raise RuntimeError(f"Could not load Kaggle dataset {DATASET_HANDLE}: {e}") from e


def get_disease_profile_matrix() -> pd.DataFrame:
    """
    Returns a (773 diseases x 377 symptoms) DataFrame where values represent
    the probability P(symptom=1 | disease).
    Precomputed and cached in data/disease_profile_matrix.parquet.
    """
    global _cached_profile_matrix, _cached_symptoms_list, _cached_diseases_list
    if _cached_profile_matrix is not None:
        return _cached_profile_matrix

    os.makedirs(DATA_DIR, exist_ok=True)

    if os.path.exists(PROFILE_MATRIX_PATH):
        try:
            matrix = pd.read_parquet(PROFILE_MATRIX_PATH)
            _cached_profile_matrix = matrix
            _cached_symptoms_list = matrix.columns.tolist()
            _cached_diseases_list = matrix.index.tolist()
            return matrix
        except Exception as e:
            logger.warning("Failed to load precomputed matrix: %s. Recomputing...", e)

    # Compute from full dataset
    df = load_dataset_from_kaggle()
    logger.info("Computing Disease-Symptom profile matrix from %d records...", len(df))
    matrix = df.groupby("diseases").mean()
    matrix.to_parquet(PROFILE_MATRIX_PATH, compression="snappy")

    _cached_profile_matrix = matrix
    _cached_symptoms_list = matrix.columns.tolist()
    _cached_diseases_list = matrix.index.tolist()
    logger.info("Computed profile matrix for %d diseases across %d symptoms.", len(matrix), len(matrix.columns))
    return matrix


def get_all_symptoms() -> List[str]:
    """Returns the list of all 377 recognized symptom features."""
    global _cached_symptoms_list
    if _cached_symptoms_list is not None:
        return _cached_symptoms_list
    matrix = get_disease_profile_matrix()
    _cached_symptoms_list = matrix.columns.tolist()
    return _cached_symptoms_list


def get_all_diseases() -> List[str]:
    """Returns the list of all 773 recognized clinical conditions."""
    global _cached_diseases_list
    if _cached_diseases_list is not None:
        return _cached_diseases_list
    matrix = get_disease_profile_matrix()
    _cached_diseases_list = matrix.index.tolist()
    return _cached_diseases_list
