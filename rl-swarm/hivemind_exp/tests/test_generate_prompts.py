import copy

import pytest

from hivemind_exp.gsm8k.generate_prompts import *
from hivemind_exp.tests.fake_data import *


def test_get_stage2_samples():
    print(get_stage2_samples([STAGE_1_MERGED]))


def test_get_stage2_samples_missing_agents():
    s1 = copy.deepcopy(STAGE_1_MERGED)
    s2 = copy.deepcopy(s1)
    del s1["agent_answers"]["0"]
    del s2["agent_answers"]["1"]
    get_stage2_samples([s1, s2])


def test_get_stage3_samples():
    print(get_stage3_samples([STAGE_2_MERGED]))


def test_get_stage3_samples_missing_agents():
    s1 = copy.deepcopy(STAGE_2_MERGED)
    s2 = copy.deepcopy(s1)
    del s1["agent_opinion"][CK]
    del s2["agent_opinion"]["0"]
    get_stage3_samples([s1, s2])
