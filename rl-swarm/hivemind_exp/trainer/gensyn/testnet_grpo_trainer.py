from typing import Sequence

from hivemind_exp.chain_utils import SwarmCoordinator
from hivemind_exp.trainer.hivemind_grpo_trainer import HivemindGRPOTrainer


class TestnetGRPOTrainer(HivemindGRPOTrainer):
    def __init__(self, coordinator: SwarmCoordinator, **kwargs) -> None:
        self.coordinator = coordinator
        super().__init__(**kwargs)

    def submit_winners(self, round_num: int, winners: Sequence[str]):
        self.logger.info(f"🏆 Submitting winners for round {round_num}: {winners}")
        self.coordinator.submit_winners(round_num, winners[:1])

    def get_round_and_stage(self):
        return self.coordinator.get_round_and_stage()

    def train_stages(self, round_num, start_stage, is_coordinator):
        super().train_stages(round_num, start_stage, is_coordinator)
        self.submit_winners(round_num, self.stage_data.round_winner_fn())

    def _train(self):
        self.follower_train()
