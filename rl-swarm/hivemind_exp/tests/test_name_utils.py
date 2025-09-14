from hivemind_exp.name_utils import get_name_from_peer_id, search_peer_ids_for_name

TEST_PEER_IDS = [
    "QmYyQSo1c1Ym7orWxLYvCrM2EmxFTANf8wXmmE7DWjhx5N",
    "Qma9T5YraSnpRDZqRR4krcSJabThc8nwZuJV3LercPHufi",
    "Qmb8wVVVMTRmG4U1tCdaCCqietuWwpGRSbL53PA5azBViP",
]


def test_get_name_from_peer_id():
    names = [get_name_from_peer_id(peer_id) for peer_id in TEST_PEER_IDS]
    assert names == [
        "thorny fishy meerkat",
        "singing keen cow",
        "toothy carnivorous bison",
    ]
    assert get_name_from_peer_id(TEST_PEER_IDS[-1], True) == "toothy_carnivorous_bison"


def test_search_peer_ids_for_name():
    names = ["none", "not an animal", "toothy carnivorous bison"]
    results = [search_peer_ids_for_name(TEST_PEER_IDS, name) for name in names]
    assert results == [None, None, "Qmb8wVVVMTRmG4U1tCdaCCqietuWwpGRSbL53PA5azBViP"]
