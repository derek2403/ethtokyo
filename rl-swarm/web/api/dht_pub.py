from collections import defaultdict
import hashlib
import itertools
import time
import logging
import threading
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
import random
from abc import ABC, abstractmethod

from hivemind.dht import DHT
from hivemind_exp.dht_utils import get_dht_value, rewards_key, outputs_key
from hivemind_exp.name_utils import get_name_from_peer_id
from hivemind_exp.chain_utils import ModalSwarmCoordinator

from .gossip_utils import stage1_message, stage2_message, stage3_message
from .kinesis import Kinesis, GossipMessage, GossipMessageData, RewardsMessage, RewardsMessageData


class BaseDHTPublisher(ABC):
    """
    Base class for DHT publishers that poll the DHT for changes and publish data to Kinesis.
    This is an abstract base class that cannot be instantiated directly.
    """
    
    def __init__(
        self,
        dht: DHT,
        kinesis_client: Kinesis,
        logger: logging.Logger,
        poll_interval_seconds: int = 300,  # 5 minutes default
        coordinator: Optional[ModalSwarmCoordinator] = None
    ):
        """
        Initialize the DHT publisher.
        
        Args:
            dht: The DHT instance to poll
            kinesis_client: The Kinesis client to publish to
            logger: Logger instance
            poll_interval_seconds: How often to poll the DHT (in seconds)
            coordinator: The coordinator to get round and stage information from
        """
        self.dht = dht
        self.kinesis_client = kinesis_client
        self.logger = logger
        self.poll_interval_seconds = poll_interval_seconds
        self.coordinator = coordinator
        
        # Thread control
        self._stop_event = threading.Event()
        self._poll_thread = None
        self.running = False
        
        # State tracking
        self.current_round = -1
        self.current_stage = -1
        self.last_polled = None
        
        self.logger.info(f"{self.__class__.__name__} initialized")
    

    def start(self):
        """Start the polling thread."""
        if self._poll_thread:
            self.logger.warning(f"{self.__class__.__name__} is already running")
            return

        self.logger.info(f"{self.__class__.__name__} starting")
        
        self._poll_thread = threading.Thread(target=self._poll_loop, daemon=True)
        self._poll_thread.start()
        self.running = True
        self.logger.info(f"{self.__class__.__name__} started")
    

    def stop(self):
        """Stop the polling thread."""
        if not self._poll_thread:
            self.logger.warning(f"{self.__class__.__name__} is not running")
            return
        
        self._stop_event.set()
        self._poll_thread.join(timeout=5)
        self.running = False
        self.logger.info(f"{self.__class__.__name__} stopped")
    

    def get_last_polled(self):
        """Get the time of the last poll."""
        return self.last_polled


    def _get_rewards_data(self, round_num: int, stage_num: int) -> dict[str, Any] | None:
        rewards_key_str = rewards_key(round_num, stage_num)
        rewards_data = get_dht_value(self.dht, key=rewards_key_str)
        return rewards_data


    def _get_outputs_data(self, node_key: str, round_num: int, stage_num: int) -> dict[str, Any] | None:
        outputs_key_str = outputs_key(node_key, round_num, stage_num)
        outputs_data = get_dht_value(self.dht, key=outputs_key_str)
        return outputs_data


    def _get_peer_name_from_id(self, peer_id: str) -> str:
        return get_name_from_peer_id(peer_id) or peer_id


    def _poll_loop(self):
        """Main polling loop."""

        while not self._stop_event.is_set():
            self.logger.info(f"Polling for round/stage: class={self.__class__.__name__}, round={self.current_round}, stage={self.current_stage}")
            self._poll_once()
            time.sleep(self.poll_interval_seconds)
    

    @abstractmethod
    def _poll_once(self):
        """
        Perform a single poll of the DHT.
        This method should be overridden by subclasses to implement specific polling logic.
        """
        pass


class RewardsDHTPublisher(BaseDHTPublisher):
    """
    A class that polls the DHT for round and stage changes, and publishes rewards data to Kinesis.
    """
    
    def _poll_once(self):
        """Perform a single poll of the DHT for rewards data."""
        try:
            new_round, new_stage = self.coordinator.get_round_and_stage()
                
            self.logger.info(f"Polled for round/stage: round={new_round}, stage={new_stage}")
            
            # Update the last polled time
            self.last_polled = datetime.now(timezone.utc)
            
            # Check if round/stage has changed
            if new_round != self.current_round or new_stage != self.current_stage:
                self.logger.info(f"Round/stage changed: {self.current_round}/{self.current_stage} -> {new_round}/{new_stage}")
                
                # If we have a previous round/stage, publish its rewards
                if self.current_round >= 0 and self.current_stage >= 0:
                    self.logger.info(f"Found rewards for {self.current_round}/{self.current_stage}, publishing")
                    self._publish_rewards(self.current_round, self.current_stage)
                
                # Update current round and stage
                self.current_round = new_round
                self.current_stage = new_stage
                self.logger.info(f"Updated round/stage: {self.current_round}/{self.current_stage}")
                
            else:
                self.logger.debug(f"No round/stage change: {new_round}/{new_stage}")
                
        except Exception as e:
            self.logger.error(f"Error polling for round/stage: {e}")


    def _publish_rewards(self, round_num: int, stage_num: int):
        """
        Get rewards for the specified round and stage, and publish to Kinesis.
        
        Args:
            round_num: The round number
            stage_num: The stage number
        """
        try:
            # Get rewards data from DHT
            rewards_data = self._get_rewards_data(round_num, stage_num)
            
            if not rewards_data:
                self.logger.warning(f"No rewards data found for round {round_num}, stage {stage_num}")
                return
            
            self.logger.info(f"Publishing rewards for round {round_num}, stage {stage_num}")
            
            # Convert rewards data to RewardsMessage format
            rewards_message = self._create_rewards_message(rewards_data, round_num, stage_num)
            
            # Publish to Kinesis
            self.kinesis_client.put_rewards(rewards_message)
            
            self.logger.info(f"Successfully published rewards for round {round_num}, stage {stage_num}")
            
        except Exception as e:
            self.logger.error(f"Error publishing rewards for round {round_num}, stage {stage_num}: {e}")
    

    def _create_rewards_message(self, rewards_data: Dict[str, Any], round_num: int, stage_num: int) -> RewardsMessage:
        """
        Create a RewardsMessage from rewards data.
        
        Args:
            rewards_data: The rewards data from the DHT
            round_num: The round number
            stage_num: The stage number
            
        Returns:
            A RewardsMessage object
        """
        timestamp = datetime.now(timezone.utc)
        message_data = []
        
        for peer_id, score in rewards_data.items():
            
            # Get peer name from peer ID
            peer_name = self._get_peer_name_from_id(peer_id) or peer_id
            
            # Create a RewardsMessageData object
            message_data.append(
                RewardsMessageData(
                    peerId=peer_id,
                    peerName=peer_name,
                    amount=float(score),
                    round=round_num,
                    stage=stage_num,
                    timestamp=timestamp
                )
            )
        
        # Create and return the RewardsMessage
        return RewardsMessage(type="rewards", data=message_data)


class GossipDHTPublisher(BaseDHTPublisher):
    """
    A class that polls the DHT for gossip data and publishes it to Kinesis.
    """
    
    def _poll_once(self):
        """Perform a single poll of the DHT for gossip data."""
        MESSAGE_TARGET = 200
        NODE_TARGET = 20
        STAGE_MESSAGE_FNS = [stage1_message, stage2_message, stage3_message]

        round_gossip = []

        try:
            # Get current round and stage from coordinator
            new_round, new_stage = self.coordinator.get_round_and_stage()
            rewards = self._get_rewards_data(new_round, new_stage)

            if not rewards:
                raise ValueError("missing rewards")

            # Get a random sample of nodes
            all_nodes = rewards.keys()
            nodes = random.sample(
                list(all_nodes), min(NODE_TARGET, len(all_nodes))
            )
            node_gossip_count = defaultdict(int)
            node_gossip_limit = max(1, MESSAGE_TARGET / len(nodes))

            self.logger.info(f"Polled for round/stage: round={new_round}, stage={new_stage}")

            start_round = max(0, new_round - 3)
            
            # Update the last polled time
            self.last_polled = datetime.now(timezone.utc)

            for r, s, node_key in itertools.product(
                reversed(range(start_round, new_round + 1)),  # Most recent first
                reversed(range(0, 3)),
                nodes,
            ):
                if r == new_round and s > new_stage:
                    continue
                if node_gossip_count[node_key] > node_gossip_limit:
                    break

                outputs = self._get_outputs_data(node_key, r, s)
                if outputs is None:
                    continue

                sorted_outputs = sorted(list(outputs.items()), key=lambda t: t[1][0])
                self.logger.info(f">>> Sorted outputs: {sorted_outputs}")

                for question, (ts, outputs) in sorted_outputs:
                    # Generate a unique-ish ID for each message
                    gossip_id = hashlib.md5(
                        f"{node_key}_{r}_{s}_{question}".encode()
                    ).hexdigest()

                    message = f"Cannot render output for unknown stage {s}"
                    if s < len(STAGE_MESSAGE_FNS):
                        message = STAGE_MESSAGE_FNS[s](
                            node_key, question, ts, outputs
                        )
                    
                    round_gossip.append(
                        (
                            ts,
                            {
                                "id": gossip_id,
                                "message": message,
                                "node": get_name_from_peer_id(node_key),
                                "nodeId": node_key,
                            },
                        )
                    )
                    node_gossip_count[node_key] += 1
                    if node_gossip_count[node_key] > node_gossip_limit:
                        break
                            

            self._publish_gossip(round_gossip)
                
        except Exception as e:
            self.logger.error(f"Error polling for round/stage: {e}")
    
    def _publish_gossip(self, gossip: list[tuple[float, dict[str, Any]]]):
        """
        Publish gossip data to Kinesis.
        
        Args:
            gossip_data: The gossip data from the DHT
        """
        try:
            self.logger.info(f"Publishing {len(gossip)} gossip messages")
            gossip_data = []

            for ts, g in gossip:
                dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                gossip_data.append(
                    GossipMessageData(
                        id=g["id"],
                        peerId=g["nodeId"],
                        peerName=g["node"],
                        message=g["message"],
                        timestamp=dt,
                    )
                )
            
            if len(gossip_data) > 0:
                self.kinesis_client.put_gossip(GossipMessage(type="gossip", data=gossip_data))
                self.logger.info(f"Successfully published gossip")
            
        except Exception as e:
            self.logger.error(f"Error publishing gossip: {e}")