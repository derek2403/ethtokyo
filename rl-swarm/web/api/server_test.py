import itertools
import logging
import time
import unittest

from fastapi.testclient import TestClient
from hivemind.utils import get_dht_time

from hivemind_exp.chain_utils import SwarmCoordinator
from hivemind_exp.dht_utils import outputs_key, rewards_key

from . import global_dht, server

logger = logging.getLogger(__name__)


class DummySwarmCoordinator(SwarmCoordinator):
    def __init__(self) -> None:
        pass

    def register_peer(self, peer_id):
        pass

    def submit_winners(self, round_num, winners):
        pass

    def get_bootnodes(self):
        return []

    def get_round_and_stage(self):
        return 3, 0

class TestServer(unittest.TestCase):
    def setUp(self):
        global_dht.setup_global_dht([], DummySwarmCoordinator(), logger)
        assert global_dht.dht
        assert global_dht.dht_cache
        self.dht = global_dht.dht
        self.dht_cache = global_dht.dht_cache

        self.client = TestClient(server.app)

    def tearDown(self):
        assert global_dht.dht
        assert global_dht.dht_cache
        global_dht.dht.shutdown()
        global_dht.dht_cache.reset()

    def test_get_gossip(self):
        for r, s, n in itertools.product(range(4), range(3), ("node_0", "node_1")):
            self.dht.store(
                key=rewards_key(r, s),
                subkey=n,
                value=1.0,
                expiration_time=get_dht_time() + 5,
            )

        q = "best dairy?"
        self.dht.store(
            key=outputs_key("node_0", 1, 0),
            subkey=q,
            value=(time.time(), {"question": q, "answer": "cheese"}),
            expiration_time=get_dht_time() + 5,
        )
        self.dht.store(
            key=outputs_key("node_1", 1, 1),
            subkey=q,
            value=(
                time.time(),
                {
                    "question": q,
                    "answer": "rocks",
                    "agent_opinion": {
                        "node_0": "<explain>\n nah \n</explain> <identify>\nStudent #1\n</identify>",
                        "node_1": "<explain>\n idk \n</explain> <identify>\nStudent #1\n</identify>",
                    },
                },
            ),
            expiration_time=get_dht_time() + 5,
        )
        self.dht.store(
            key=outputs_key("node_1", 1, 2),
            subkey=q,
            value=(
                time.time(),
                {
                    "question": q,
                    "answer": "rocks",
                    "final_agent_decision": {
                        "node_0": "<summarize_feedback>\n good job \n</summarize_feedback> <majority>\nStudent #1\n</majority>",
                        "node_1": "<summarize_feedback>\n bad job \n</summarize_feedback> <majority>\nStudent #1\n</majority>",
                    },
                },
            ),
            expiration_time=get_dht_time() + 5,
        )
        # Wrong format, defaults to stage 1 Q&A message.
        self.dht.store(
            key=outputs_key("node_1", 2, 2),
            subkey=q,
            value=(time.time(), {"question": q, "answer": "rocks"}),
            expiration_time=get_dht_time() + 5,
        )
        self.dht_cache.poll_dht()

        response = self.client.get("/api/gossip?since_round=0")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            set((val["node"], val["message"]) for val in response.json()["messages"]),
            {
                ("deadly energetic raven", "best dairy?...Answer: rocks"),  # stage 0
                ("deadly energetic raven", "idk...Identify: Student #1"),  # stage 1
                ("deadly energetic raven", "bad job...Majority: Student #1"),  # stage 2
                ("freckled snorting raccoon", "best dairy?...Answer: cheese"),  # stage 0 fallback
            },
        )


if __name__ == "__main__":
    unittest.main()
