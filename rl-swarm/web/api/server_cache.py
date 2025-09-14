from collections import defaultdict
import hashlib
import itertools
from datetime import datetime, timezone
import random
import os
from .gossip_utils import *

from hivemind_exp.dht_utils import *
from hivemind_exp.name_utils import get_name_from_peer_id
from .gossip_utils import stage1_message, stage2_message, stage3_message
from .kinesis import GossipMessage, GossipMessageData, RewardsMessage, RewardsMessageData


class Cache:
    def __init__(self, dht, coordinator, manager, logger, kinesis_client):
        self.dht = dht
        self.coordinator = coordinator

        self.manager = manager
        self.logger = logger
        self.kinesis_client = kinesis_client
        self.lock = manager.Lock()
        self.reset()

    def reset(self):
        self.leaderboard = self.manager.dict()
        self.leaderboard_v2 = self.manager.dict() # Cumulative rewards leaderboard.

        self.rewards_history = self.manager.dict()
        self.gossips = self.manager.dict()

        self.current_round = self.manager.Value("i", -1)
        self.current_stage = self.manager.Value("i", -1)

        self.last_polled = None

    def get_round_and_stage(self):
        return self.current_round.value, self.current_stage.value

    def get_leaderboard(self):
        return dict(self.leaderboard)

    def get_leaderboard_cumulative(self):
        return dict(self.leaderboard_v2)

    def get_gossips(self, since_round=0):
        return dict(self.gossips)

    def get_last_polled(self):
        return self.last_polled

    def poll_dht(self):
        try:
            self._get_round_and_stage()
            self._get_leaderboard()
            self._get_leaderboard_v2()
            self._get_gossip()

            with self.lock:
                self.last_polled = datetime.now()
        except Exception as e:
            self.logger.error("cache failed to poll dht: %s", e)

    def _get_dht_value(self, beam_size=100, **kwargs):
        return get_dht_value(self.dht, beam_size=beam_size, **kwargs)

    def _get_round_and_stage(self):
        try:
            r, s = self.coordinator.get_round_and_stage()
            self.logger.info(f"cache polled round and stage: r={r}, s={s}")
            with self.lock:
                self.current_round.value = r
                self.current_stage.value = s
        except ValueError as e:
            self.logger.warning(
                "could not get current round or stage; default to -1: %s", e
            )

    def _previous_round_and_stage(self):
        r = self.current_round.value
        s = self.current_stage.value

        s -= 1
        if s < 0:
            s = 2
            r -= 1

        return max(0, r), max(0, s)

    def _current_rewards(self) -> dict[str, Any] | None:
        # Basically a proxy for the reachable peer group.
        curr_round = self.current_round.value
        curr_stage = self.current_stage.value
        return self._get_dht_value(key=rewards_key(curr_round, curr_stage))

    def _previous_rewards(self):
        return self._get_dht_value(key=rewards_key(*self._previous_round_and_stage()))


    def _get_leaderboard_v2(self):
        try:
            rewards = self._current_rewards()
            if not rewards:
                return None

            curr_round = self.current_round.value
            curr_stage = self.current_stage.value

            with self.lock:
                # Initialize or get existing leaderboard_v2
                if "leaders" not in self.leaderboard_v2:
                    self.leaderboard_v2 = {"leaders": []}

                # Create a map of existing entries for easy lookup
                existing_entries = {entry["id"]: entry for entry in self.leaderboard_v2["leaders"]}

                # Process each peer's rewards
                current_time = int(datetime.now().timestamp())
                for peer_id, score in rewards.items():
                    if peer_id not in existing_entries:
                        # First time seeing this peer
                        existing_entries[peer_id] = {
                            "id": peer_id,
                            "nickname": get_name_from_peer_id(peer_id),
                            "recordedRound": curr_round,
                            "recordedStage": curr_stage,
                            "cumulativeScore": float(score),  # Initial score
                            "lastScore": float(score),  # Track last score
                            "scoreHistory": [{"x": current_time, "y": float(score)}]  # Initialize history with first point
                        }
                    else:
                        entry = existing_entries[peer_id]
                        # Same round/stage - just update current score
                        if (entry["recordedRound"] == curr_round and
                            entry["recordedStage"] == curr_stage):
                            entry["cumulativeScore"] = float(score)
                            entry["lastScore"] = float(score)  # Update last score
                            # Update history, keeping last 30 points
                            entry["scoreHistory"] = (entry["scoreHistory"] + [{"x": current_time, "y": float(score)}])[-30:]
                        # Different round/stage - add to cumulative
                        else:
                            entry["cumulativeScore"] += float(score)
                            entry["lastScore"] = float(score)  # Update last score
                            entry["recordedRound"] = curr_round
                            entry["recordedStage"] = curr_stage
                            # Add new score to history, keeping last 30 points
                            entry["scoreHistory"] = (entry["scoreHistory"] + [{"x": current_time, "y": entry["cumulativeScore"]}])[-30:]

                # Remove entries that are not in the current or previous round/stage.
                prev_round, prev_stage = self._previous_round_and_stage()
                current_entries = {}
                for peer_id, entry in existing_entries.items():
                    in_current = (entry["recordedRound"] == curr_round and entry["recordedStage"] == curr_stage)
                    in_prev = (entry["recordedRound"] == prev_round and entry["recordedStage"] == prev_stage)
                    if in_current or in_prev:
                        current_entries[peer_id] = entry
                    else:
                        self.logger.info(f"removing entry for peer {peer_id} because it is not in the current or previous round/stage")

                # Convert back to sorted list
                sorted_leaders = sorted(
                    current_entries.values(),
                    key=lambda x: (x["cumulativeScore"], x["id"]),
                    reverse=True
                )

                # Update leaderboard_v2
                self.leaderboard_v2 = {
                    "leaders": sorted_leaders,
                    "total": len(sorted_leaders)
                }

                # Convert to RewardsMessage format and send to Kinesis
                # self._send_rewards_to_kinesis(sorted_leaders, curr_round, curr_stage)

                return self.leaderboard_v2

        except Exception as e:
            self.logger.warning("could not get leaderboard data: %s", e)
            return None
            

    # Sends the rewards data to a Kinesis stream where it can be processed by the UI server.
    def _send_rewards_to_kinesis(self, leaders, round, stage):
        """Convert leaderboard data to RewardsMessage format and send to Kinesis"""
        try:
            current_time = datetime.now(timezone.utc)  
            rewards_data = []
            
            for leader in leaders:
                rewards_data.append(
                    RewardsMessageData(
                        peerId=leader["id"],
                        peerName=leader["nickname"],
                        amount=leader["cumulativeScore"],
                        round=round,
                        stage=stage,
                        timestamp=current_time
                    )
                )
                
            rewards_message = RewardsMessage(type="rewards", data=rewards_data)
            self.kinesis_client.put_rewards(rewards_message)
            
        except Exception as e:
            self.logger.error(f"!!! Failed to send rewards to Kinesis: {e}")

    def _send_gossip_to_kinesis(self, gossips):
        try:
            gossip_data = []

            for ts, gossip in gossips:  # ts is a float timestamp
                # Convert float timestamp to UTC datetime
                dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                    
                gossip_data.append(
                    GossipMessageData(
                        id=gossip["id"],
                        peerId=gossip["nodeId"],
                        peerName=gossip["node"],
                        message=gossip["message"],
                        timestamp=dt  # Use the converted UTC datetime
                    )
                )

            gossip_message = GossipMessage(type="gossip", data=gossip_data)
            self.kinesis_client.put_gossip(gossip_message)
            
        except Exception as e:
            self.logger.error(f"!!! Failed to send gossip to Kinesis: {e}")
                

    def _get_leaderboard(self):
        try:
            if rewards := self._current_rewards():
                # Sorted list of (node_key, reward) pairs.
                raw = list(
                    sorted(rewards.items(), key=lambda t: (t[1], t[0]), reverse=True)
                )
            else:
                raw = []

            # Create entries for all participants
            all_entries = [
                {
                    "id": str(t[0]),
                    "nickname": get_name_from_peer_id(t[0]),
                    "score": t[1],
                    "values": [],
                }
                for t in raw
            ]
            self.logger.info(">>> lb_entries length: %d", len(all_entries))

            current_history = []
            with self.lock:
                for entry in all_entries:
                    latestScore = entry["score"]
                    id = entry["id"]
                    nn = entry["nickname"]

                    past_scores = self.rewards_history.get(id, [])
                    next_scores = (
                        past_scores
                        + [{"x": int(datetime.now().timestamp()), "y": latestScore}][
                            -100:
                        ]
                    )
                    self.logger.info(
                        ">>> id: %s, past_scores length: %d, next_scores length: %d",
                        id,
                        len(past_scores),
                        len(next_scores),
                    )
                    self.rewards_history[id] = next_scores
                    current_history.append(
                        {
                            "id": id,
                            "nickname": nn,
                            "values": next_scores,
                        }
                    )

            with self.lock:
                self.leaderboard = {
                    "leaders": all_entries,
                    "total": len(raw),
                    "rewardsHistory": current_history,
                }
        except Exception as e:
            self.logger.warning("could not get leaderboard data: %s", e)

    def _get_gossip(self):
        MESSAGE_TARGET = 200
        NODE_TARGET = 20
        STAGE_MESSAGE_FNS = [stage1_message, stage2_message, stage3_message]

        round_gossip = []
        start_time = datetime.now()
        try:
            curr_round = self.current_round.value
            curr_stage = self.current_stage.value
            rewards = self._current_rewards()
            if not rewards:
                raise ValueError("missing rewards")

            all_nodes = rewards.keys()
            nodes = random.sample(
                list(all_nodes), min(NODE_TARGET, len(all_nodes))
            )  # Sample uniformly
            node_gossip_count = defaultdict(int)
            node_gossip_limit = max(1, MESSAGE_TARGET / len(nodes))

            start_round = max(0, curr_round - 3)
            for r, s, node_key in itertools.product(
                reversed(range(start_round, curr_round + 1)),  # Most recent first
                reversed(range(0, 3)),
                nodes,
            ):
                # Check if we've exceeded 10 seconds
                # Adding this as a stop gap to make sure the gossip collection doesn't stop other data from being polled.
                if (datetime.now() - start_time).total_seconds() > 10:
                    self.logger.warning(">>> gossip collection timed out after 10s")
                    break

                if r == curr_round and s > curr_stage:
                    continue

                if node_gossip_count[node_key] > node_gossip_limit:
                    break

                if outputs := self._get_dht_value(key=outputs_key(node_key, r, s)):
                    sorted_outputs = sorted(
                        list(outputs.items()), key=lambda t: t[1][0]
                    )
                    for question, (ts, outputs) in sorted_outputs:
                        gossip_id = hashlib.md5(
                            f"{node_key}_{r}_{s}_{question}".encode()
                        ).hexdigest()
                        if s < len(STAGE_MESSAGE_FNS):
                            message = STAGE_MESSAGE_FNS[s](
                                node_key, question, ts, outputs
                            )
                        else:
                            message = f"Cannot render output for unknown stage {s}"
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

        except Exception as e:
            self.logger.warning("could not get gossip: %s", e)
        finally:
            elapsed = (datetime.now() - start_time).total_seconds()
            self.logger.info(
                ">>> completed gossip with %d messages in %.2fs",
                len(round_gossip),
                elapsed,
            )

        # self._send_gossip_to_kinesis(round_gossip)

        with self.lock:
            self.gossips = {
                "messages": [msg for _, msg in sorted(round_gossip, reverse=True)]
                or [],
            }
