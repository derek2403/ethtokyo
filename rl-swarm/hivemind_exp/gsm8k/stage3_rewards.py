import os
import random
import re
from difflib import SequenceMatcher

import numpy as np

import hivemind_exp.gsm8k.stage1_rewards as stage1_rewards
from hivemind_exp.hivemind_utils import HivemindNode


def extract_xml_identity(text: str) -> str:
    id = text.split("<majority>")[-1]
    id = id.split("</majority>")[0]
    return id.strip()


def extract_xml_final_answer(text: str) -> str:
    answer = text.split("<answer>")[-1]
    answer = answer.split("</answer>")[0]
    return answer.strip()


def extract_xml_question(text: str) -> str:
    question = text.split("<question>")[-1]
    question = question.split("</question>")[0]
    return question.strip()


def extract_xml_ids(text: str) -> str:
    ids = []
    ids_raw = text.split("<student>")[1:]
    for id in ids_raw:
        ids += [id.split("</student>")[0].strip()]
    return ids


# TODO: Rethink how we add this reward in general setting with delayed rewards. Agents might learn to reward hack by "spamming" identify tags of their choice...
def extract_xml_choices(text: str) -> str:
    ids = []
    ids_raw = text.split("<identify>")[1:]
    for id in ids_raw:
        ids += [id.split("</identify>")[0].strip()]
    return ids


def extract_original_question(text: str) -> str:
    q = text.split("  \n\nThe following answers to this question were suggested:")[0]
    q = q.split("The question we were given is: ")[-1]
    return q.strip()


def extract_answers(text: str) -> str:
    answers = {}
    raw = text.split(
        "  \nAfter comparing these answers, the following feedback was given about which answer is best: \n"
    )[0].split("<student>")[1:]
    for a in raw:
        id = a.split("</student>")[0].strip()
        ans = a.split("</student> said \n")[-1].strip()
        answers[id] = ans
    return answers


def count_xml(text) -> float:
    count = 0.0
    if text.count("<summarize_feedback>\n") == 1:
        count += 0.125
    if text.count("\n</summarize_feedback>\n") == 1:
        count += 0.125
    if text.count("<majority>\n") == 1:
        count += 0.125
    if text.count("\n</majority>\n") == 1:
        count += 0.125
    if text.count("<question>\n") == 1:
        count += 0.125
    if text.count("\n</question>\n") == 1:
        count += 0.125
    if text.count("<think>\n") == 1:
        count += 0.125
    if text.count("\n</think>\n") == 1:
        count += 0.125
    if text.count("\n<answer>\n") == 1:
        count += 0.125
        count -= len(text.split("\n</answer>\n")[-1]) * 0.001
    if text.count("\n</answer>") == 1:
        count += 0.125
        count -= (len(text.split("\n</answer>")[-1]) - 1) * 0.001
    return count


def swarm_majority(choices):
    votes = {}
    max_votes = 0
    for c in choices:
        if c in votes:
            votes[c] += 1
        else:
            votes[c] = 1
        if votes[c] > max_votes:
            max_votes = votes[c]
    majority = []
    for c in votes:
        if votes[c] >= max_votes:
            majority += [c]
    return majority


# Reward functions
def consensus_reward_func(
    prompts, completions, weighting=2.0, logging=False, **kwargs
) -> list[float]:
    responses = [completion[0]["content"] for completion in completions]
    p = prompts[0][-1]["content"]
    critic_choices = extract_xml_choices(p)
    majority_choices = swarm_majority(critic_choices)
    extracted_responses = [extract_xml_identity(r) for r in responses]
    if (random.random() < 0.01) and logging:  # 1% chance to write samples into a file
        os.makedirs(
            f"model_output_samples/multi_stage_gsm8k_samples_from_{os.getenv('HOSTNAME')}",
            exist_ok=True,
        )
        log_file = os.path.join(
            "model_output_samples",
            f"multi_stage_gsm8k_samples_from_{os.getenv('HOSTNAME')}",
            "consensus_samps.txt",
        )
        with open(log_file, "a") as f:
            f.write("-" * 20)
            out_line = f"\nPrompt:\n{p}\n\nResponse:\n{responses[0]}\n\nCritic Choice Distribution:\n{critic_choices}\n\nExtracted:\n{extracted_responses[0]}\n\nGot reward? {extracted_responses[0] in majority_choices}"
            f.write(out_line)
    return [
        1.0 * weighting if r in majority_choices else 0.0 for r in extracted_responses
    ]


def question_recreation_reward_func(
    prompts, completions, weighting=1.0, logging=False, **kwargs
) -> list[float]:
    responses = [completion[0]["content"] for completion in completions]
    p = prompts[0][-1]["content"]
    q = extract_original_question(p)
    recreated_qs = [extract_xml_question(r) for r in responses]
    if (random.random() < 0.01) and logging:  # 1% chance to write samples into a file
        os.makedirs(
            f"model_output_samples/multi_stage_gsm8k_samples_from_{os.getenv('HOSTNAME')}",
            exist_ok=True,
        )
        log_file = os.path.join(
            "model_output_samples",
            f"multi_stage_gsm8k_samples_from_{os.getenv('HOSTNAME')}",
            "question_recreation_samps.txt",
        )
        with open(log_file, "a") as f:
            f.write("-" * 20)
            out_line = f"\nPrompt:\n{p}\n\nResponse:\n{responses[0]}\n\nOriginal Question:\n{q}\n\nExtracted recreation:\n{recreated_qs[0]}\n\nGot reward? {SequenceMatcher(None, recreated_qs[0], q).ratio()}"
            f.write(out_line)
    return [SequenceMatcher(None, r, q).ratio() * weighting for r in recreated_qs]


def concensus_correctness_reward_func(
    prompts, completions, answer, weighting=2.0, logging=False, **kwargs
) -> list[float]:
    responses = [completion[0]["content"] for completion in completions]
    p = prompts[0][-1]["content"]
    agent_answers = extract_answers(p)
    extracted_responses = [extract_xml_identity(r) for r in responses]
    chosen_rewards = []
    for r in extracted_responses:
        cur_reward = 0
        if r in agent_answers:
            if stage1_rewards.extract_xml_answer(agent_answers[r]) == answer[0]:
                cur_reward += 1.0
            if stage1_rewards.extract_xml_answer(agent_answers[r]).isdigit():
                cur_reward += 0.5
            pattern = r"^<think>\n.*?\n</think>\n<answer>\n.*?\n</answer>\n$"
            if re.match(pattern, agent_answers[r]):
                cur_reward += 0.5
            pattern = r"<think>.*?</think>\s*<answer>.*?</answer>"
            if re.match(pattern, agent_answers[r]):
                cur_reward += 0.5
            cur_reward += stage1_rewards.count_xml(agent_answers[r])
        elif r in [
            "None",
            "No one",
            "All answers are wrong",
            "All answers were wrong",
            "All are wrong",
            "All were wrong",
            "None are correct",
            "None were correct",
            "No one is correct",
        ]:
            agent_as = [
                stage1_rewards.extract_xml_answer(agent_answers[id])
                for id in agent_answers
            ]
            check_submissions = [
                True if r == a else False for r, a in zip(agent_as, answer)
            ]
            if all(check_submissions):
                cur_reward += 10
        chosen_rewards += [cur_reward]
    if (random.random() < 0.01) and logging:  # 1% chance to write samples into a file
        if extracted_responses[0] in agent_answers:
            os.makedirs(
                f"model_output_samples/multi_stage_gsm8k_samples_from_{os.getenv('HOSTNAME')}",
                exist_ok=True,
            )
            log_file = os.path.join(
                "model_output_samples",
                f"multi_stage_gsm8k_samples_from_{os.getenv('HOSTNAME')}",
                "correctness_samps.txt",
            )
            with open(log_file, "a") as f:
                f.write("-" * 20)
                out_line = f"\nPrompt:\n{p}\n\nResponse:\n{responses[0]}\n\nChosen answer ID:\n{extracted_responses[0]}\n\nExtracted:\n{agent_answers[extracted_responses[0]]}\n\nReward for choice: {chosen_rewards[0]}"
                f.write(out_line)
    return [r * weighting for r in chosen_rewards]


def final_correctness_reward_func(
    prompts, completions, answer, weighting=2.0, logging=False, **kwargs
) -> list[float]:
    responses = [completion[0]["content"] for completion in completions]
    p = prompts[0][-1]["content"]
    extracted_responses = [extract_xml_final_answer(r) for r in responses]
    if (random.random() < 0.01) and logging:  # 1% chance to write samples into a file
        os.makedirs(
            f"model_output_samples/multi_stage_gsm8k_samples_from_{os.getenv('HOSTNAME')}",
            exist_ok=True,
        )
        log_file = os.path.join(
            "model_output_samples",
            f"multi_stage_gsm8k_samples_from_{os.getenv('HOSTNAME')}",
            "final_answer_correctness_samples.txt",
        )
        with open(log_file, "a") as f:
            f.write("-" * 20)
            out_line = f"Prompt:\n{p}\n\nAnswer:\n{answer[0]}\n\nResponse:\n{responses[0]}\n\nExtracted:\n{extracted_responses[0]}"
            f.write(out_line)
    return [
        1.0 * weighting if r == a else 0.0 for r, a in zip(extracted_responses, answer)
    ]


def strict_format_reward_func(
    completions, weighting=0.5, logging=False, **kwargs
) -> list[float]:
    """Reward function that checks if the completion has a specific format."""
    pattern = r"^<summarize_feedback>\n.*?\n</summarize_feedback>\n<majority>\n.*?\n</majority>\n<question>\n.*?\n</question>\n<think>\n.*?\n</think>\n<answer>\n.*?\n</answer>\n$"
    responses = [completion[0]["content"] for completion in completions]
    matches = [re.match(pattern, r) for r in responses]
    if (random.random() < 0.01) and logging:  # 1% chance to write samples into a file
        os.makedirs(
            f"model_output_samples/multi_stage_gsm8k_samples_from_{os.getenv('HOSTNAME')}",
            exist_ok=True,
        )
        log_file = os.path.join(
            "model_output_samples",
            f"multi_stage_gsm8k_samples_from_{os.getenv('HOSTNAME')}",
            "s3_strict_format_samps.txt",
        )
        with open(log_file, "a") as f:
            f.write("-" * 20)
            out_line = f"\nResponse:\n{responses[0]}\n\nMatches? {matches[0]}"
            f.write(out_line)
    return [1.0 * weighting if match else 0.0 for match in matches]


def soft_format_reward_func(
    completions, weighting=0.5, logging=False, **kwargs
) -> list[float]:
    """Reward function that checks if the completion has a specific format."""
    pattern = r"<summarize_feedback>.*?</summarize_feedback>\s*<majority>.*?</majority>\s*<question>.*?</question>\s*<think>.*?</think>\s*<answer>.*?</answer>"
    responses = [completion[0]["content"] for completion in completions]
    matches = [re.match(pattern, r) for r in responses]
    if (random.random() < 0.01) and logging:  # 1% chance to write samples into a file
        os.makedirs(
            f"model_output_samples/multi_stage_gsm8k_samples_from_{os.getenv('HOSTNAME')}",
            exist_ok=True,
        )
        log_file = os.path.join(
            "model_output_samples",
            f"multi_stage_gsm8k_samples_from_{os.getenv('HOSTNAME')}",
            "s3_soft_format_samps.txt",
        )
        with open(log_file, "a") as f:
            f.write("-" * 20)
            out_line = f"\nResponse:\n{responses[0]}\n\nMatches? {matches[0]}"
            f.write(out_line)
    return [1.0 * weighting if match else 0.0 for match in matches]


def xmlcount_reward_func(
    completions, weighting=1.0, logging=False, **kwargs
) -> list[float]:
    contents = [completion[0]["content"] for completion in completions]
    if (random.random() < 0.01) and logging:  # 1% chance to write samples into a file
        os.makedirs(
            f"model_output_samples/multi_stage_gsm8k_samples_from_{os.getenv('HOSTNAME')}",
            exist_ok=True,
        )
        log_file = os.path.join(
            "model_output_samples",
            f"multi_stage_gsm8k_samples_from_{os.getenv('HOSTNAME')}",
            "count_xml_samps.txt",
        )
        with open(log_file, "a") as f:
            f.write("-" * 20)
            out_line = (
                f"\nResponse:\n{contents[0]}\n\nCount reward: {count_xml(contents[0])}"
            )
            f.write(out_line)
    return [count_xml(c) * weighting for c in contents]


def hivemind_cumulative_reward(
    node: HivemindNode,
    prompts,
    completions,
    answer,
    logging=False,
    output_signal_selector="max",
    **kwargs,
) -> list[float]:
    """
    Dummy reward function that accumulates all rewards into one + saves JSON to node.outputs
    """
    consensus_reward = consensus_reward_func(prompts, completions, logging=logging)
    concensus_correctness = concensus_correctness_reward_func(
        prompts, completions, answer, logging=logging
    )
    question_recreation_reward = question_recreation_reward_func(
        prompts, completions, logging=logging
    )
    final_correctness = final_correctness_reward_func(
        prompts, completions, answer, logging=logging
    )
    strict_format_reward = strict_format_reward_func(completions, logging=logging)
    soft_format_reward = soft_format_reward_func(completions, logging=logging)
    xmlcount_reward = xmlcount_reward_func(completions, logging=logging)
    total_reward = [
        sum(tup)
        for tup in zip(
            consensus_reward,
            concensus_correctness,
            question_recreation_reward,
            final_correctness,
            strict_format_reward,
            soft_format_reward,
            xmlcount_reward,
        )
    ]

    prompt = prompts[0][-1]["content"]
    question = extract_original_question(prompt)
    if output_signal_selector == "max":
        # Generate output line
        maximal_reward_idx, responses = (
            np.argmax(total_reward),
            [completion[0]["content"] for completion in completions],
        )
        output_data = {
            "question": question,
            "answer": answer[0],
            "stage3_prompt": prompt,
            "final_agent_decision": {node.key: responses[maximal_reward_idx]},
        }

    if output_signal_selector != None:
        node.outputs = output_data
        node.rewards = total_reward

    # After the final stage, print a summary of all stages (if we have collected all stages)
    if node.stage_num == 2 and hasattr(node, 'round_cache'):
        print_training_summary(node)
        
    return [0.0 for _ in total_reward]

def print_training_summary(node: HivemindNode):
    """
    Print a comprehensive summary of all three stages of the training process.
    """
    # Check if we have data for all three stages
    if not all([(0, 0) in node.round_cache, (0, 1) in node.round_cache, (0, 2) in node.round_cache]):
        return
    
    # Get path to supervisor_content.txt file for direct writing
    import os
    current_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(os.path.dirname(current_dir))
    file_path = os.path.join(root_dir, "supervisor_content.txt")
    
    # Begin writing summary
    with open(file_path, "a") as f:
        f.write("\n\n" + "=" * 80 + "\n")
        f.write("FINAL SUMMARY OF ALL STAGES\n")
        f.write("=" * 80 + "\n")
    
    print("\n\n" + "=" * 80)
    print("FINAL SUMMARY OF ALL STAGES")
    print("=" * 80)
    
    # Collect data from each stage
    stages = []
    
    # Stage 0: Initial therapist response
    if (0, 0) in node.round_cache:
        stage0_outputs = {}
        # Get the first item from stage 0 cache
        for q_hash, (timestamp, outputs) in node.round_cache[(0, 0)].items():
            if 'question' in outputs:
                stage0_outputs['question'] = outputs.get('question', '')
                if 'responses' in outputs:
                    stage0_outputs['responses'] = outputs.get('responses', [])
                break
        
        if stage0_outputs:
            stages.append({
                'stage': 0,
                'outputs': stage0_outputs
            })
    
    # Stage 1: Supervisor evaluation
    if (0, 1) in node.round_cache:
        stage1_outputs = {}
        # Get the first item from stage 1 cache
        for q_hash, (timestamp, outputs) in node.round_cache[(0, 1)].items():
            if 'responses' in outputs:
                stage1_outputs['responses'] = outputs.get('responses', [])
                break
        
        if stage1_outputs:
            stages.append({
                'stage': 1,
                'outputs': stage1_outputs
            })
    
    # Stage 2: Clinical director synthesis
    if (0, 2) in node.round_cache:
        stage2_outputs = {}
        # Get the first item from stage 2 cache
        for q_hash, (timestamp, outputs) in node.round_cache[(0, 2)].items():
            if 'responses' in outputs:
                stage2_outputs['responses'] = outputs.get('responses', [])
                break
            if 'final_agent_decision' in outputs:
                for peer_id, response in outputs['final_agent_decision'].items():
                    stage2_outputs['responses'] = [response]
                    break
        
        if stage2_outputs:
            stages.append({
                'stage': 2,
                'outputs': stage2_outputs
            })
    
    # Display each stage
    for stage_data in stages:
        stage_num = stage_data["stage"]
        outputs = stage_data["outputs"]
        
        # Write to file
        with open(file_path, "a") as f:
            f.write(f"\n\n{'*' * 30} STAGE {stage_num} OUTPUT {'*' * 30}\n\n")
        
        # Also print to console
        print(f"\n\n{'*' * 30} STAGE {stage_num} OUTPUT {'*' * 30}\n")
        
        # Stage 0: Initial Question and Response
        if stage_num == 0 and "question" in outputs:
            question_text = outputs.get('question', 'N/A')
            print(f"CLIENT QUESTION:\n{question_text}\n")
            
            # Write to file
            with open(file_path, "a") as f:
                f.write(f"CLIENT QUESTION:\n{question_text}\n\n")
            
            if "responses" in outputs and outputs["responses"]:
                response_text = outputs['responses'][0]
                print(f"THERAPIST RESPONSE:\n{response_text}\n")
                
                # Write to file
                with open(file_path, "a") as f:
                    f.write(f"THERAPIST RESPONSE:\n{response_text}\n\n")
        
        # Stage 1: Comparing Therapeutic Responses
        elif stage_num == 1:
            if "responses" in outputs and outputs["responses"]:
                supervisor_text = outputs['responses'][0]
                print(f"SUPERVISOR EVALUATION:\n{supervisor_text}\n")
                
                # Write to file
                with open(file_path, "a") as f:
                    f.write(f"SUPERVISOR EVALUATION:\n{supervisor_text}\n\n")
        
        # Stage 2: Final Integration
        elif stage_num == 2:
            if "responses" in outputs and outputs["responses"]:
                synthesis_text = outputs['responses'][0]
                print(f"CLINICAL DIRECTOR SYNTHESIS:\n{synthesis_text}\n")
                
                # Write to file
                with open(file_path, "a") as f:
                    f.write(f"CLINICAL DIRECTOR SYNTHESIS:\n{synthesis_text}\n\n")
    
    # End of summary
    print("=" * 80)
    print("END OF TRAINING SUMMARY")
    print("=" * 80)
    
    # Write end of summary to file
    with open(file_path, "a") as f:
        f.write("=" * 80 + "\n")
        f.write("END OF TRAINING SUMMARY\n")
        f.write("=" * 80 + "\n")
