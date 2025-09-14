import unittest
from unittest.mock import MagicMock, patch, call
import time
from datetime import datetime, timezone
import threading
import sys
from pathlib import Path

# Add the parent directory to the Python path
parent_dir = Path(__file__).parent.parent
sys.path.append(str(parent_dir))

# Note: We're patching hivemind_exp functions (rewards_key, get_dht_value, get_name_from_peer_id)
# because these functions are only copied over at build time in Docker and aren't available during local testing.
# This allows us to test the DHTPublisher class without needing the actual hivemind_exp module.

from web.api.dht_pub import BaseDHTPublisher, RewardsDHTPublisher, GossipDHTPublisher
from web.api.kinesis import RewardsMessage, RewardsMessageData


class TestRewardsDHTPublisher(unittest.TestCase):
    """Tests for the RewardsDHTPublisher class."""

    def setUp(self):
        """Set up test fixtures."""
        # Create mock objects
        self.mock_dht = MagicMock()
        self.mock_kinesis = MagicMock()
        self.mock_logger = MagicMock()
        self.coordinator = MagicMock()
        
        # Create the publisher with a short poll interval for testing
        self.publisher = RewardsDHTPublisher(
            dht=self.mock_dht,
            kinesis_client=self.mock_kinesis,
            logger=self.mock_logger,
            poll_interval_seconds=0.1,
            coordinator=self.coordinator
        )

    def tearDown(self):
        """Clean up after tests."""
        # Stop the publisher if it's running
        if self.publisher.running:
            self.publisher.stop()
            # Give it a moment to stop
            time.sleep(0.2)

    def test_initialization(self):
        """Test that the publisher initializes correctly."""
        self.assertEqual(self.publisher.dht, self.mock_dht)
        self.assertEqual(self.publisher.kinesis_client, self.mock_kinesis)
        self.assertEqual(self.publisher.logger, self.mock_logger)
        self.assertEqual(self.publisher.coordinator, self.coordinator)
        self.assertEqual(self.publisher.poll_interval_seconds, 0.1)
        self.assertEqual(self.publisher.current_round, -1)
        self.assertEqual(self.publisher.current_stage, -1)
        self.assertIsNone(self.publisher.last_polled)
        self.assertFalse(self.publisher.running)
        self.assertIsNone(self.publisher._poll_thread)
        
        # Check that the logger was called
        self.mock_logger.info.assert_called_once_with("RewardsDHTPublisher initialized")

    def test_poll_once_no_change(self):
        """Test polling when there's no round/stage change."""
        # Set up the coordinator mock to return the same round/stage
        self.coordinator.get_round_and_stage.return_value = (1, 1)
        self.publisher.current_round = 1
        self.publisher.current_stage = 1
        
        # Poll once
        self.publisher._poll_once()
        
        # Check that get_round_and_stage was called on the coordinator
        self.coordinator.get_round_and_stage.assert_called_once()
        
        # Check that the round/stage didn't change
        self.assertEqual(self.publisher.current_round, 1)
        self.assertEqual(self.publisher.current_stage, 1)
        
        # Check that the logger was called
        self.mock_logger.info.assert_any_call("Polled for round/stage: round=1, stage=1")
        self.mock_logger.debug.assert_any_call("No round/stage change: 1/1")
        
        # Check that last_polled was updated
        self.assertIsNotNone(self.publisher.last_polled)

    def test_poll_once_with_change(self):
        """Test polling when there's a round/stage change."""
        # Set up the coordinator mock to return a different round/stage
        self.coordinator.get_round_and_stage.return_value = (2, 1)
        self.publisher.current_round = 1
        self.publisher.current_stage = 1
        
        # Mock the _publish_rewards method
        self.publisher._publish_rewards = MagicMock()
        
        # Poll once
        self.publisher._poll_once()
        
        # Check that get_round_and_stage was called on the coordinator
        self.coordinator.get_round_and_stage.assert_called_once()
        
        # Check that the round/stage changed
        self.assertEqual(self.publisher.current_round, 2)
        self.assertEqual(self.publisher.current_stage, 1)
        
        # Check that _publish_rewards was called for old round/stage
        self.publisher._publish_rewards.assert_has_calls([
            call(1, 1),  # Old round/stage
        ])
        
        # Check that the logger was called
        self.mock_logger.info.assert_any_call("Polled for round/stage: round=2, stage=1")
        self.mock_logger.info.assert_any_call("Round/stage changed: 1/1 -> 2/1")
        
        # Check that last_polled was updated
        self.assertIsNotNone(self.publisher.last_polled)

    def test_poll_once_error(self):
        """Test polling when there's an error."""
        # Set up the coordinator mock to raise an exception
        self.coordinator.get_round_and_stage.side_effect = Exception("Test error")
        
        # Poll once
        self.publisher._poll_once()
        
        # Check that get_round_and_stage was called on the coordinator
        self.coordinator.get_round_and_stage.assert_called_once()
        
        # Check that the round/stage didn't change
        self.assertEqual(self.publisher.current_round, -1)
        self.assertEqual(self.publisher.current_stage, -1)
        
        # Check that the logger was called with the error
        self.mock_logger.error.assert_called_once_with("Error polling for round/stage: Test error")
        
        # Check that last_polled was not updated
        self.assertIsNone(self.publisher.last_polled)

    def test_publish_rewards(self):
        """Test publishing rewards."""
        # Set up test data
        round_num = 1
        stage_num = 1
        rewards_data = {
            "peer_id_1": 0.5,
            "peer_id_2": 0.3
        }

        # Mock the _get_rewards_data method to return our test data
        self.publisher._get_rewards_data = MagicMock(return_value=rewards_data)
        
        # Mock the _get_peer_name_from_id method
        self.publisher._get_peer_name_from_id = MagicMock(side_effect=["name1", "name2"])
        
        # Mock the Kinesis client's put_rewards method
        self.publisher.kinesis_client.put_rewards = MagicMock()
        
        # Publish rewards
        self.publisher._publish_rewards(round_num, stage_num)
        
        # Check that _get_rewards_data was called with the correct arguments
        self.publisher._get_rewards_data.assert_called_once_with(round_num, stage_num)
        
        # Check that _get_peer_name_from_id was called for each peer ID
        self.publisher._get_peer_name_from_id.assert_any_call("peer_id_1")
        self.publisher._get_peer_name_from_id.assert_any_call("peer_id_2")
        
        # Check that put_rewards was called
        self.publisher.kinesis_client.put_rewards.assert_called_once()
        
        # Get the actual message that was passed to put_rewards
        actual_message = self.publisher.kinesis_client.put_rewards.call_args[0][0]
        
        # Check that the message has the correct type
        self.assertEqual(actual_message.type, "rewards")
        
        # Check that the message has the correct data
        self.assertEqual(len(actual_message.data), 2)
        
        # Check the first data item
        self.assertEqual(actual_message.data[0].peer_id, "peer_id_1")
        self.assertEqual(actual_message.data[0].peer_name, "name1")
        self.assertEqual(actual_message.data[0].amount, 0.5)
        self.assertEqual(actual_message.data[0].round, round_num)
        self.assertEqual(actual_message.data[0].stage, stage_num)
        
        # Check the second data item
        self.assertEqual(actual_message.data[1].peer_id, "peer_id_2")
        self.assertEqual(actual_message.data[1].peer_name, "name2")
        self.assertEqual(actual_message.data[1].amount, 0.3)
        self.assertEqual(actual_message.data[1].round, round_num)
        self.assertEqual(actual_message.data[1].stage, stage_num)
        
        # Check that the logger was called
        self.mock_logger.info.assert_any_call(f"Publishing rewards for round {round_num}, stage {stage_num}")
        self.mock_logger.info.assert_any_call(f"Successfully published rewards for round {round_num}, stage {stage_num}")

    def test_publish_rewards_no_data(self):
        """Test publishing rewards when there's no data."""
        # Set up test data
        round_num = 1
        stage_num = 1

        self.publisher._get_rewards_data = MagicMock(return_value=None)
        
        # Mock the _create_rewards_message method
        self.publisher._create_rewards_message = MagicMock()
        
        # Publish rewards
        self.publisher._publish_rewards(round_num, stage_num)
        
        # Check that _create_rewards_message was not called
        self.assertEqual(self.publisher._create_rewards_message.call_count, 0)
        
        # Check that put_rewards was not called
        self.assertEqual(self.mock_kinesis.put_rewards.call_count, 0)
        
        # Check that the logger was called
        self.mock_logger.warning.assert_called_once_with(f"No rewards data found for round {round_num}, stage {stage_num}")

    @patch('web.api.dht_pub.get_name_from_peer_id')
    def test_create_rewards_message(self, mock_get_name):
        """Test creating a rewards message."""
        # Set up test data
        round_num = 1
        stage_num = 1
        rewards_data = {
            "peer_id_1": 0.5,
            "peer_id_2": 0.3
        }
        
        # Set up mock
        mock_get_name.side_effect = ["name1", "name2"]
        
        # Create the rewards message
        message = self.publisher._create_rewards_message(rewards_data, round_num, stage_num)
        
        # Check that the message is a RewardsMessage
        self.assertIsInstance(message, RewardsMessage)
        
        # Check that the message has the correct type
        self.assertEqual(message.type, "rewards")
        
        # Check that the message has the correct data
        self.assertEqual(len(message.data), 2)
        
        # Check the first data item
        self.assertIsInstance(message.data[0], RewardsMessageData)
        self.assertEqual(message.data[0].peer_id, "peer_id_1")
        self.assertEqual(message.data[0].peer_name, "name1")
        self.assertEqual(message.data[0].amount, 0.5)
        self.assertEqual(message.data[0].round, round_num)
        self.assertEqual(message.data[0].stage, stage_num)
        
        # Check the second data item
        self.assertIsInstance(message.data[1], RewardsMessageData)
        self.assertEqual(message.data[1].peer_id, "peer_id_2")
        self.assertEqual(message.data[1].peer_name, "name2")
        self.assertEqual(message.data[1].amount, 0.3)
        self.assertEqual(message.data[1].round, round_num)
        self.assertEqual(message.data[1].stage, stage_num)


class TestGossipDHTPublisher(unittest.TestCase):
    """Tests for the GossipDHTPublisher class."""

    def setUp(self):
        """Set up test fixtures."""
        # Create mock objects
        self.mock_dht = MagicMock()
        self.mock_kinesis = MagicMock()
        self.mock_logger = MagicMock()
        self.coordinator = MagicMock()
        
        # Create the publisher with a short poll interval for testing
        self.publisher = GossipDHTPublisher(
            dht=self.mock_dht,
            kinesis_client=self.mock_kinesis,
            logger=self.mock_logger,
            poll_interval_seconds=0.1,  # 100ms for faster tests
            coordinator=self.coordinator
        )

    def tearDown(self):
        """Clean up after tests."""
        # Stop the publisher if it's running
        if self.publisher.running:
            self.publisher.stop()
            # Give it a moment to stop
            time.sleep(0.2)

    def test_initialization(self):
        """Test that the publisher initializes correctly."""
        self.assertEqual(self.publisher.dht, self.mock_dht)
        self.assertEqual(self.publisher.kinesis_client, self.mock_kinesis)
        self.assertEqual(self.publisher.logger, self.mock_logger)
        self.assertEqual(self.publisher.coordinator, self.coordinator)
        self.assertEqual(self.publisher.poll_interval_seconds, 0.1)
        self.assertEqual(self.publisher.current_round, -1)
        self.assertEqual(self.publisher.current_stage, -1)
        self.assertIsNone(self.publisher.last_polled)
        self.assertFalse(self.publisher.running)
        self.assertIsNone(self.publisher._poll_thread)
        
        # Check that the logger was called
        self.mock_logger.info.assert_called_once_with("GossipDHTPublisher initialized")

    def test_poll_once_no_rewards(self):
        """Test gossip polling when there's no rewards data."""

        # Set up mocks
        self.coordinator.get_round_and_stage.return_value = (1, 1)
        self.publisher._get_rewards_data = MagicMock(return_value=None)

        # Poll once
        self.publisher._poll_once()
        
        # Check that get_round_and_stage was called on the coordinator
        self.coordinator.get_round_and_stage.assert_called_once()
        
        # Check that the logger was called
        self.mock_logger.error.assert_any_call("Error polling for round/stage: missing rewards")

    def test_poll_once_with_rewards(self):
        """Test gossip polling when there is rewards data."""
        # Set up mocks
        self.coordinator.get_round_and_stage.return_value = (1, 1)
        rewards_data = {"peer_id_1": 0.5, "peer_id_2": 0.3}
        self.publisher._get_rewards_data = MagicMock(return_value=rewards_data)
        
        # Mock the _get_outputs_data method to return None (no outputs)
        self.publisher._get_outputs_data = MagicMock(return_value=None)
        
        # Mock the _publish_gossip method
        self.mock_kinesis.put_gossip = MagicMock()
        
        # Poll once
        self.publisher._poll_once()
        
        # Check that get_round_and_stage was called on the coordinator
        self.coordinator.get_round_and_stage.assert_called_once()
        
        # Check that _get_rewards_data was called with the correct arguments
        self.publisher._get_rewards_data.assert_called_once_with(1, 1)
        
        # Check that _publish_gossip was called
        self.mock_kinesis.put_gossip.assert_not_called()
        
        # Check that the logger was called
        self.mock_logger.info.assert_any_call("Polled for round/stage: round=1, stage=1")
        self.mock_logger.info.assert_any_call("Publishing 0 gossip messages")
        
        # Check that last_polled was updated
        self.assertIsNotNone(self.publisher.last_polled)

    def test_poll_once_error(self):
        """Test polling when there's an error."""
        # Set up the coordinator mock to raise an exception
        self.coordinator.get_round_and_stage.side_effect = Exception("Test error")
        
        # Poll once
        self.publisher._poll_once()
        
        # Check that get_round_and_stage was called on the coordinator
        self.coordinator.get_round_and_stage.assert_called_once()
        
        # Check that the logger was called with the error
        self.mock_logger.error.assert_called_once_with("Error polling for round/stage: Test error")
        
        # Check that last_polled was not updated
        self.assertIsNone(self.publisher.last_polled)

    def test_publish_gossip(self):
        """Test publishing gossip data."""
        # Set up test data
        gossip = [
            (1000.0, {"id": "id1", "message": "message1", "node": "node1", "nodeId": "peer_id_1"}),
            (1001.0, {"id": "id2", "message": "message2", "node": "node2", "nodeId": "peer_id_2"})
        ]
        
        # Mock the put_gossip method
        self.mock_kinesis.put_gossip = MagicMock()
        
        # Publish gossip
        self.publisher._publish_gossip(gossip)
        
        # Check that put_gossip was called
        self.mock_kinesis.put_gossip.assert_called_once()
        
        # Check that the logger was called
        self.mock_logger.info.assert_any_call("Publishing 2 gossip messages")
        self.mock_logger.info.assert_any_call("Successfully published gossip")


if __name__ == '__main__':
    unittest.main() 