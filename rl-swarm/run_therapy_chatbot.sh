#!/bin/bash

# This script runs the therapy chatbot with continuous conversation mode,
# which will use supervisor feedback from entries 3, 6, 9, etc. and also
# record all therapist answers for improving the model.

# Get the absolute path to the script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo "Starting Therapy Chatbot in Continuous Conversation Mode"
echo "This mode will:"
echo "1. Use supervisor feedback from entries 3, 6, 9, etc. to improve responses"
echo "2. Record all therapist responses with unique IDs"
echo "3. Support continuous conversation with follow-up messages"
echo ""

# Run the training script with continuous conversation mode enabled
python -m hivemind_exp.gsm8k.train_single_gpu \
  --continuous \
  --model_name="mistralai/Mixtral-8x7B-Instruct-v0.1" \
  --tokenizer_name="mistralai/Mixtral-8x7B-Instruct-v0.1" \
  --grpo_target_limit=1 \
  --grpo_num_steps=1

echo ""
echo "Therapy chatbot session ended."
echo "All feedback and therapist responses have been recorded in supervisor_content.txt"
echo "Use this file to further improve the model in future sessions." 