import pytest

from hivemind_exp.gsm8k.stage_merger import *
from hivemind_exp.tests.fake_data import *


def test_merge_stage1():
    merged = merge_stage1_question(STAGE_1_OUTPUTS)
    assert merged == STAGE_1_MERGED


def test_merge_stage2():
    merged = merge_stage2_question(STAGE_2_OUTPUTS)
    assert merged == STAGE_2_MERGED
