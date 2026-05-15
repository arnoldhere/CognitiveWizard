"""
Dataset utilities and loaders for evaluation framework.

Provides:
- Dataset loading from JSONL files
- Dataset validation
- Batch processing
- Dataset statistics
"""

import json
from typing import List, Dict, Any, Optional, Iterator
from pathlib import Path
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)


@dataclass
class DatasetStats:
    """Statistics about a dataset."""

    total_samples: int
    difficulty_distribution: Dict[str, int]
    category_distribution: Dict[str, int]
    avg_query_length: float
    sample_ids: List[str]


class DatasetLoader:
    """Load and manage evaluation datasets."""

    @staticmethod
    def load_jsonl(filepath: str) -> Iterator[Dict[str, Any]]:
        """
        Load dataset from JSONL file.

        Args:
            filepath: Path to JSONL file

        Yields:
            Dictionary for each line
        """
        try:
            with open(filepath, "r") as f:
                for line in f:
                    if line.strip():
                        yield json.loads(line)
        except FileNotFoundError:
            logger.error(f"File not found: {filepath}")
            return
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            return

    @staticmethod
    def load_json(filepath: str) -> List[Dict[str, Any]]:
        """
        Load dataset from JSON file.

        Args:
            filepath: Path to JSON file

        Returns:
            List of dictionaries
        """
        try:
            with open(filepath, "r") as f:
                return json.load(f)
        except FileNotFoundError:
            logger.error(f"File not found: {filepath}")
            return []
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            return []

    @staticmethod
    def save_jsonl(data: List[Dict[str, Any]], filepath: str) -> None:
        """
        Save dataset to JSONL file.

        Args:
            data: List of dictionaries
            filepath: Output path
        """
        try:
            Path(filepath).parent.mkdir(parents=True, exist_ok=True)
            with open(filepath, "w") as f:
                for item in data:
                    f.write(json.dumps(item) + "\n")
            logger.info(f"Saved {len(data)} items to {filepath}")
        except Exception as e:
            logger.error(f"Error saving dataset: {e}")

    @staticmethod
    def save_json(data: List[Dict[str, Any]], filepath: str) -> None:
        """
        Save dataset to JSON file.

        Args:
            data: List of dictionaries
            filepath: Output path
        """
        try:
            Path(filepath).parent.mkdir(parents=True, exist_ok=True)
            with open(filepath, "w") as f:
                json.dump(data, f, indent=2)
            logger.info(f"Saved {len(data)} items to {filepath}")
        except Exception as e:
            logger.error(f"Error saving dataset: {e}")

    @staticmethod
    def get_dataset_stats(data: List[Dict[str, Any]]) -> DatasetStats:
        """
        Calculate statistics about a dataset.

        Args:
            data: List of sample dictionaries

        Returns:
            DatasetStats object
        """
        difficulty_dist = {}
        category_dist = {}
        query_lengths = []
        sample_ids = []

        for item in data:
            # Difficulty distribution
            difficulty = item.get("difficulty", "unknown")
            difficulty_dist[difficulty] = difficulty_dist.get(difficulty, 0) + 1

            # Category distribution
            category = item.get("category", "unknown")
            category_dist[category] = category_dist.get(category, 0) + 1

            # Query length
            query = item.get("query", item.get("question", ""))
            query_lengths.append(len(query.split()))

            # Sample IDs
            sample_ids.append(item.get("id", "unknown"))

        avg_query_length = (
            sum(query_lengths) / len(query_lengths) if query_lengths else 0
        )

        return DatasetStats(
            total_samples=len(data),
            difficulty_distribution=difficulty_dist,
            category_distribution=category_dist,
            avg_query_length=avg_query_length,
            sample_ids=sample_ids,
        )

    @staticmethod
    def filter_by_difficulty(
        data: List[Dict[str, Any]], difficulty: str
    ) -> List[Dict[str, Any]]:
        """
        Filter dataset by difficulty level.

        Args:
            data: Dataset
            difficulty: 'easy', 'medium', or 'hard'

        Returns:
            Filtered dataset
        """
        return [item for item in data if item.get("difficulty") == difficulty]

    @staticmethod
    def filter_by_category(
        data: List[Dict[str, Any]], category: str
    ) -> List[Dict[str, Any]]:
        """
        Filter dataset by category.

        Args:
            data: Dataset
            category: Category name

        Returns:
            Filtered dataset
        """
        return [item for item in data if item.get("category") == category]

    @staticmethod
    def get_batch(
        data: List[Dict[str, Any]], batch_size: int, start_idx: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get a batch of samples.

        Args:
            data: Dataset
            batch_size: Size of batch
            start_idx: Start index

        Returns:
            Batch of samples
        """
        return data[start_idx : start_idx + batch_size]

    @staticmethod
    def split_dataset(
        data: List[Dict[str, Any]],
        train_ratio: float = 0.7,
        val_ratio: float = 0.15,
        test_ratio: float = 0.15,
    ) -> tuple:
        """
        Split dataset into train/val/test.

        Args:
            data: Dataset
            train_ratio: Proportion for training
            val_ratio: Proportion for validation
            test_ratio: Proportion for testing

        Returns:
            Tuple of (train, val, test) datasets
        """
        n = len(data)
        train_size = int(n * train_ratio)
        val_size = int(n * val_ratio)

        train = data[:train_size]
        val = data[train_size : train_size + val_size]
        test = data[train_size + val_size :]

        return train, val, test

    @staticmethod
    def validate_retrieval_sample(sample: Dict[str, Any]) -> bool:
        """
        Validate a retrieval evaluation sample.

        Args:
            sample: Sample to validate

        Returns:
            True if valid, False otherwise
        """
        required_fields = ["id", "query", "expected_chunk_ids"]

        for field in required_fields:
            if field not in sample:
                logger.warning(f"Missing required field: {field}")
                return False

        if not isinstance(sample["expected_chunk_ids"], list):
            logger.warning("expected_chunk_ids must be a list")
            return False

        return True

    @staticmethod
    def validate_generation_sample(sample: Dict[str, Any]) -> bool:
        """
        Validate a generation evaluation sample.

        Args:
            sample: Sample to validate

        Returns:
            True if valid, False otherwise
        """
        required_fields = ["id", "query", "reference_answer"]

        for field in required_fields:
            if field not in sample:
                logger.warning(f"Missing required field: {field}")
                return False

        return True

    @staticmethod
    def validate_conversation_sample(sample: Dict[str, Any]) -> bool:
        """
        Validate a conversation evaluation sample.

        Args:
            sample: Sample to validate

        Returns:
            True if valid, False otherwise
        """
        required_fields = ["id", "conversation"]

        for field in required_fields:
            if field not in sample:
                logger.warning(f"Missing required field: {field}")
                return False

        if not isinstance(sample["conversation"], list):
            logger.warning("conversation must be a list")
            return False

        if len(sample["conversation"]) < 2:
            logger.warning("conversation must have at least 2 turns")
            return False

        return True


class EvaluationDatasetManager:
    """Manage evaluation datasets for different layers."""

    def __init__(self, base_path: str = "./evaluation/datasets"):
        self.base_path = Path(base_path)
        self.layers = {
            "retrieval": self.base_path / "retrieval",
            "generation": self.base_path / "generation",
            "conversation": self.base_path / "conversations",
            "hallucination": self.base_path / "hallucination",
            "quiz": self.base_path / "quizzes",
        }

        # Create directories
        for layer_path in self.layers.values():
            layer_path.mkdir(parents=True, exist_ok=True)

    def load_layer_dataset(self, layer: str) -> List[Dict[str, Any]]:
        """Load all samples from a layer."""
        layer_path = self.layers.get(layer)
        if not layer_path:
            logger.error(f"Unknown layer: {layer}")
            return []

        all_samples = []

        # Load JSONL files
        for jsonl_file in layer_path.glob("*.jsonl"):
            samples = list(DatasetLoader.load_jsonl(str(jsonl_file)))
            all_samples.extend(samples)

        return all_samples

    def save_layer_dataset(
        self, layer: str, data: List[Dict[str, Any]], filename: str
    ) -> None:
        """Save samples to a layer."""
        layer_path = self.layers.get(layer)
        if not layer_path:
            logger.error(f"Unknown layer: {layer}")
            return

        filepath = layer_path / filename
        DatasetLoader.save_jsonl(data, str(filepath))

    def get_layer_stats(self, layer: str) -> DatasetStats:
        """Get statistics for a layer."""
        data = self.load_layer_dataset(layer)
        return DatasetLoader.get_dataset_stats(data)
