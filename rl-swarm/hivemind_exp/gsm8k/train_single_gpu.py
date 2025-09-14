import logging
import os
import colorlog
from trl import GRPOConfig, ModelConfig, TrlParser
import time
import argparse
import json

from hivemind_exp.chain_utils import (
    ModalSwarmCoordinator,
    WalletSwarmCoordinator,
    setup_web3,
)
from hivemind_exp.gsm8k.generate_prompts import get_stage1_samples, get_user_input_samples, get_user_input_with_supervisor_simulation, get_user_input_with_continuous_conversation, record_therapist_answer
from hivemind_exp.runner.gensyn.testnet_grpo_runner import (
    TestnetGRPOArguments,
    TestnetGRPORunner,
)
from hivemind_exp.runner.grpo_runner import GRPOArguments, GRPORunner
from hivemind_exp.gsm8k.stage3_rewards import print_training_summary

# Create a custom output recorder
def record_model_output(output, file_path=None, conversation_mode=False):
    """
    Record the model's output to a file.
    
    Parameters:
    - output: The output to record
    - file_path: The path to the file to record to (defaults to supervisor_content.txt in root directory)
    - conversation_mode: If True, format output for continuous conversation
    """
    if file_path is None:
        # Get the path to the rl-swarm directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.dirname(os.path.dirname(current_dir))
        file_path = os.path.join(root_dir, "supervisor_content.txt")
    
    # Get the current response number by counting existing responses in the file
    response_num = 1
    try:
        with open(file_path, "r") as f:
            content = f.read()
            response_num = content.count("<model_response") + 1
    except:
        # If file doesn't exist or can't be read, start with response 1
        pass
    
    with open(file_path, "a") as f:
        # Add a clear separator between entries with response number
        if conversation_mode:
            f.write(f"<model_response #{response_num} conversation=\"ongoing\">\n{output}\n</model_response>\n\n")
        else:
            f.write(f"<model_response #{response_num}>\n{output}\n</model_response>\n\n")
        f.write("-" * 80 + "\n\n")  # Add a separator line for readability
    
    print(f"Model output (Response #{response_num}) recorded to {file_path}")

# Custom logging handler that writes to both console and file
class DualHandler(logging.Handler):
    def __init__(self, file_path):
        super().__init__()
        self.file_path = file_path
        
    def emit(self, record):
        log_entry = self.format(record)
        # Write to the file
        with open(self.file_path, "a") as f:
            f.write(log_entry + "\n")

# Function to record all data from round_cache
def record_complete_round_cache(node, file_path):
    """
    Record the complete round_cache data to the supervisor_content.txt file.
    
    Parameters:
    - node: The HivemindNode instance containing the round_cache
    - file_path: Path to the supervisor_content.txt file
    """
    if not hasattr(node, 'round_cache'):
        return
        
    with open(file_path, "a") as f:
        f.write("\n\n# Complete Round Cache Data\n\n")
        
        for stage, cache_data in node.round_cache.items():
            round_num, stage_num = stage
            f.write(f"## Round {round_num}, Stage {stage_num} Complete Data\n\n")
            
            for q_hash, (timestamp, outputs) in cache_data.items():
                f.write(f"### Hash: {q_hash}\n")
                f.write(f"Timestamp: {timestamp}\n\n")
                
                # Write all outputs
                for key, value in outputs.items():
                    if isinstance(value, (list, dict)):
                        try:
                            # Try to format as JSON for better readability
                            value_str = json.dumps(value, indent=2)
                            f.write(f"#### {key}:\n```\n{value_str}\n```\n\n")
                        except:
                            # Fallback if not JSON serializable
                            f.write(f"#### {key}:\n{str(value)}\n\n")
                    else:
                        # Handle string values with nice formatting
                        f.write(f"#### {key}:\n{str(value)}\n\n")
                
                f.write("-" * 80 + "\n\n")

def main():
    # Get path to supervisor_content.txt file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(os.path.dirname(current_dir))
    file_path = os.path.join(root_dir, "supervisor_content.txt")
    
    # Append a session marker instead of clearing the file
    with open(file_path, "a") as f:
        f.write("\n\n# New Session " + time.strftime("%Y-%m-%d %H:%M:%S") + "\n\n")
    
    print(f"Added new session marker to {file_path}")
    
    # Setup logging.
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Console handler with color
    console_handler = colorlog.StreamHandler()
    console_handler.setFormatter(
        colorlog.ColoredFormatter("%(green)s%(levelname)s:%(name)s:%(message)s")
    )
    root_logger.addHandler(console_handler)
    
    # Add file handler to also log everything to supervisor_content.txt
    file_handler = DualHandler(file_path)
    file_handler.setFormatter(logging.Formatter("%(levelname)s:%(name)s:%(message)s"))
    root_logger.addHandler(file_handler)
    
    # Log the start of recording
    root_logger.info("Starting complete log recording to supervisor_content.txt")

    # Add command-line argument for continuous conversation mode
    parser = argparse.ArgumentParser(description="Run the training loop")
    parser.add_argument("--continuous", action="store_true", help="Use continuous conversation mode")
    parser.add_argument("--use_chat_json", type=str, default="False", help="Read questions from chat.json instead of user input")
    args, unknown = parser.parse_known_args()
    
    # Determine which data getter function to use
    if args.use_chat_json.lower() == "true":
        print("Reading questions from chat.json file")
        data_getter = get_user_input_samples
    elif args.continuous:
        print("Using continuous conversation mode with feedback from previous sessions")
        data_getter = get_user_input_with_continuous_conversation 
    else:
        data_getter = get_user_input_with_supervisor_simulation
    
    # Initialize the TRL parser
    trl_parser = TrlParser((ModelConfig, GRPOArguments, TestnetGRPOArguments, GRPOConfig))
    model_args, grpo_args, testnet_args, training_args = trl_parser.parse_args_and_config(unknown)

    # Run main training loop.
    if org_id := testnet_args.modal_org_id:
        runner = TestnetGRPORunner(ModalSwarmCoordinator(org_id, web3=setup_web3()))
    elif priv_key := testnet_args.wallet_private_key:
        runner = TestnetGRPORunner(WalletSwarmCoordinator(priv_key, web3=setup_web3()))
    else:
        runner = GRPORunner()

    # Run training
    trainer = runner.run(model_args, grpo_args, training_args, data_getter)
    
    # Make sure the summary is printed
    if trainer and hasattr(trainer, 'node'):
        print_training_summary(trainer.node)
        
        # Record all data from round_cache for completeness
        record_complete_round_cache(trainer.node, file_path)
        
        # Record the model's outputs to supervisor_content.txt
        if hasattr(trainer.node, 'round_cache'):
            # Add a section header for model responses
            with open(file_path, "a") as f:
                f.write("\n# Detailed Model Responses\n\n")
            
            # Record each stage's responses
            for stage in [(0, 0), (0, 1), (0, 2)]:
                if stage in trainer.node.round_cache:
                    with open(file_path, "a") as f:
                        f.write(f"\n## Stage {stage[1]} Responses\n\n")
                    
                    for q_hash, (timestamp, outputs) in trainer.node.round_cache[stage].items():
                        if 'responses' in outputs and outputs['responses']:
                            record_model_output(
                                f"STAGE {stage[1]} RESPONSE:\n{outputs['responses'][0]}",
                                conversation_mode=args.continuous
                            )
                        elif 'final_agent_decision' in outputs:
                            for peer_id, response in outputs['final_agent_decision'].items():
                                record_model_output(
                                    f"STAGE {stage[1]} FINAL DECISION (Peer: {peer_id}):\n{response}",
                                    conversation_mode=args.continuous
                                )
                                break
            
            # For continuous mode, check if we should continue the conversation
            if args.continuous:
                continue_conversation = input("\nWould you like to continue the conversation? (y/n): ")
                while continue_conversation.lower().startswith('y'):
                    # Create a new dataset with the user's follow-up and previous context
                    follow_up = input("\nYour follow-up message: ")
                    
                    # Record the user's follow-up
                    with open(file_path, "a") as f:
                        f.write(f"\n<user_message>\n{follow_up}\n</user_message>\n\n")
                    
                    # Run the model again with this follow-up
                    # This is a simplified re-run to demonstrate the concept
                    print("\nProcessing your follow-up message...")
                    print("(In a full implementation, this would use the previous model response as context)")
                    
                    # Generate a therapist response for the follow-up
                    therapist_response = f"Thank you for sharing more. I understand your concerns about '{follow_up[:30]}...' Let me help you further with this situation."
                    
                    # Record as both a model response and a therapist answer
                    record_model_output(
                        f"FOLLOW-UP RESPONSE:\n{therapist_response}",
                        conversation_mode=True
                    )
                    
                    # Also record as a therapist answer for consistency
                    record_therapist_answer(
                        f"follow-up-{response_num}", 
                        therapist_response
                    )
                    
                    continue_conversation = input("\nWould you like to continue the conversation? (y/n): ")

if __name__ == "__main__":
    main()
