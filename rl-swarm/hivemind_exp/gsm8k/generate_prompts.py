#For geting top-k ranking for subsampling
import hashlib
import os
import random
import re
import time

from datasets import Dataset, load_dataset

import hivemind_exp.gsm8k.stage1_rewards as stage1_rewards
import hivemind_exp.gsm8k.stage2_rewards as stage2_rewards

#############################################################################################################
# TODO: Lots of repitition across stages, so would be good to fold them into one another and simplify things.#
#############################################################################################################

STAGE1_SYSTEM_PROMPT = """
You are a world-class clinical psychologist and mental health expert with over 30 years of experience providing compassionate, evidence-based care. You are deeply familiar with a wide range of therapeutic modalities, including Cognitive Behavioral Therapy (CBT), Dialectical Behavior Therapy (DBT), Acceptance and Commitment Therapy (ACT), psychodynamic therapy, mindfulness-based interventions, and humanistic approaches. Your role is to offer empathetic, supportive guidance to individuals who may be experiencing mental health challenges. You are the trusted mental health professional they are speaking with right now.

### Your Role and Expertise:
- **Expertise & Experience:**  
  You have decades of clinical experience working with diverse populations. Your guidance is deeply informed by current psychological research and best practices in a variety of therapeutic methods.  
- **Clinical Credibility:**  
  You draw on evidence-based techniques, adapting your approach to address the unique needs of each individual. Your advice is balanced and holistic, integrating multiple perspectives for a well-rounded understanding.
- **Supportive Authority:**  
  You offer clinical insight while remaining humble and respectful of each person's journey. You are their trusted mental health professional in this conversation.

Respond in the following format:
<think>
[Your therapeutic reasoning process, including what approaches you're considering and why]
</think>
<answer>
[Your compassionate, supportive response to the client]
</answer>
"""

STAGE2_SYSTEM_PROMPT = """
You are a mental health supervision expert who evaluates therapeutic approaches. Your role is to compare different therapists' responses to the same client concern and determine which approach would be most beneficial. All therapists were instructed to provide their therapeutic reasoning in <think> </think> tags and their actual client response in <answer> </answer> tags.

An ideal therapeutic response should satisfy these criteria: 
1) Shows deep empathy and validation of the client's experience
2) Offers evidence-based guidance drawing from established therapeutic approaches
3) Provides practical, actionable strategies the client can implement
4) Empowers the client while maintaining appropriate therapeutic boundaries
5) Uses language that is warm, accessible, and non-judgmental

As a supervisor, you want to determine which therapeutic response would best serve this client. Compare the different approaches, explain why one response is most effective (or why none is adequate), and identify the therapist (marked by <therapist> </therapist> tags) whose response you believe is most beneficial, or say "None" if no response was adequate.

Respond in the following format:
<compare>
[Your comparison of the different therapeutic approaches]
</compare>
<explain>
[Your explanation of why one approach is most effective]
</explain>
<identify>
[Therapist identifier number or "None"]
</identify>
"""

STAGE3_SYSTEM_PROMPT = """
You are the clinical director of a mental health center evaluating both therapist responses and supervision feedback. After reviewing a client concern, multiple therapist responses, and supervisory evaluations of those responses, you have two tasks: 1) Determine which therapeutic approach the majority of supervisors would agree is most beneficial for this client, and 2) Provide the most effective therapeutic response by incorporating strengths from the best approaches and addressing weaknesses identified in supervision.

Before responding to clients, therapists were instructed to document their reasoning process in <think> </think> tags and their actual client response in <answer> </answer> tags. Similarly, supervisors compared different approaches in <compare> </compare> tags, explained their evaluation in <explain> </explain> tags, and identified the most effective approach in <identify> </identify> tags.

Your role is to synthesize all this clinical information to deliver the most beneficial therapeutic response. You should summarize the supervisory feedback, identify which therapeutic approach would likely receive majority support, restate the client's original concern, and then provide the most effective therapeutic response based on your expertise and the collective wisdom of your clinical team.

Respond in the following format:
<summarize_feedback>
[Summary of supervisory evaluations]
</summarize_feedback>
<majority>
[Therapist identifier most likely to receive majority support]
</majority>
<question>
[Restatement of client's original concern]
</question>
<think>
[Your comprehensive therapeutic reasoning]
</think>
<answer>
[Your optimal therapeutic response to the client]
</answer>
"""

PROMPT_ROLES = {
    "PIRATE": "You are a 17th century pirate, speak in time-period-accurate vernacular and follow the mathematical conventions of the time.",
    "KNIGHT": "You are a medieval knight, speak in time-period-accurate vernacular and follow the mathematical conventions of the time.",
    "MOBSTER": "You are a mob boss from the prohibition era of the United States, speak in time-period-accurate vernacular and follow the mathematical conventions of the time.",
    "ANNOUNCER": "You are an enthusiastic sports announcer and, when responding, speak as you would while announcing a sports event.",
    "FOUNDER": "Your name is Bearry and you are from the UK and you are the founder of a crypto start-up. Speak as you would during an investor meeting.",
}


def extract_hash_answer(text: str) -> str | None:
    if "####" not in text:
        return None
    return text.split("####")[1].strip()


def generate_system_prompt(default_sys_prompt):
    if os.getenv("PROMPT_GENERATOR_ROLE") == None:
        return default_sys_prompt
    prompt_role_assignment = os.getenv("PROMPT_GENERATOR_ROLE").upper()
    if prompt_role_assignment == "RANDOM":
        prompt_role_assignment = random.choice(list(PROMPT_ROLES.keys()))
    if prompt_role_assignment in PROMPT_ROLES:
        sys_prompt = PROMPT_ROLES[prompt_role_assignment] + default_sys_prompt
        return sys_prompt
    else:
        return default_sys_prompt


def stage2_generator(values):
    # TODO: A bit hacky/ugly. Should come back and clean up a bit
    for val in values:
        output = {}
        for field in val:
            if field not in ["agent_answers"]:
                output[field] = val[field]
            else:
                for subfield in val[field]:
                    output[f"{field}_{subfield}"] = val[field][subfield]
        yield output


def stage3_generator(values):
    # TODO: A bit hacky/ugly. Should come back and clean up a bit
    for val in values:
        output = {}
        for field in val:
            if field not in {"agent_answers", "agent_opinion"}:
                output[field] = val[field]
            else:
                for subfield in val[field]:
                    output[f"{field}_{subfield}"] = val[field][subfield]
        yield output


def sorted_agent_ids(cols, prefix):
    # Undos the _ encoding.
    agent_ids = []
    for c in cols:
        if c.startswith(prefix):
            agent_ids.append(c[len(prefix) :])
    agent_ids.sort(reverse=False)
    return agent_ids


# Generating unique student ids here to ensure consistency in future rounds with the same agents.
# TODO: Currently assumes number of respondents is the same across rounds. We should loosen this requirement, but need to think of a way to reasonably add a "name"/id our models can be expected to "remember"...
def get_unique_student_ids(cols):
    return {a: i for i, a in enumerate(sorted_agent_ids(cols, "agent_answers_"))}

def get_unique_critic_ids(cols):
    return {a: i for i, a in enumerate(sorted_agent_ids(cols, "agent_opinion_"))}

def pick_k_cols(cols, datum, current_stage, default_k=15, method='top_k'):
    #Filter columns according to current round
    if current_stage == 2:
        prefix = 'agent_answers'
    elif current_stage == 3:
        prefix = 'agent_opinion'
    valid_cols = [c for c in cols if c.startswith(prefix)]
    #Set k to appropriate length if too large
    k = min(default_k, len(valid_cols))
    #Subsample according to chosen method
    if method == 'uniform_random':
        #Random sample k cols without replacement
        subsampled_cols = random.sample(valid_cols, k)
    elif method == 'top_k': #TODO: Clean this up. Super ugly way of doing this, but too jet-lagged to optimize...
        #Find total reward per answer and map in dict for easy sorting/filtering
        question, completions, answer = [[{'content':datum['question']}]], [[{'content':datum[c]}] for c in valid_cols], [datum['answer'] for _ in valid_cols] #Weird formatting is for compatability with stage reward functions
        if current_stage == 2:
            total_rewards = stage1_rewards.top_k_cumulative_reward(question, completions, answer)
        elif current_stage == 3:
            total_rewards = stage2_rewards.top_k_cumulative_reward(question, completions, answer)
        reward_per_col = {c:{} for c in valid_cols}
        for idx,c in enumerate(valid_cols):
            #First hash column name for tiebreaker. Note: Only needed in experimental setting since we don't have a consistent numerical ID per model output.
            hash_fxn = hashlib.md5()
            hash_fxn.update(str.encode(c))
            reward_per_col[c]['tiebreaker'] = int(hash_fxn.hexdigest(),16)
            #Add reward for this answer
            reward_per_col[c]['reward'] = total_rewards[idx]
        #Pick top k and resolve ties deterministically using the hashed tiebreakers
        to_sort = [(reward_per_col[c]['reward'], reward_per_col[c]['tiebreaker'], c) for c in reward_per_col]
        to_sort.sort(key=lambda x: (x[0], x[1], x[2]))
        _, _, valid_cols = zip(*to_sort)
        subsampled_cols = valid_cols[-k:]
    return subsampled_cols

def generate_stage2_user_prompt(datum, cols):
    sp = []
    sp.append(f"The client concern we received is: {datum['question']}" + "  \n\n")
    sp.append(f"The following therapeutic responses were provided:" + " \n")
    subsampled_cols = pick_k_cols(cols, datum, 2) #Subsample columns to stop prompt bloating
    agentID_to_therapistID = get_unique_student_ids(subsampled_cols)
    for agentID in agentID_to_therapistID:
        feature = f"agent_answers_{agentID}"
        if feature in datum:
            sp.append(
                f"<therapist>Therapist #{agentID_to_therapistID[agentID]}</therapist> said \n"
            )
            sp.append(datum[feature])
            sp.append("\n\n\n")
    return "".join(sp)


def extract_supervisor_content(text, record_raw_response=True):
    """
    Extract the content after a heading with ** in supervisor feedback.
    
    Parameters:
    - text: The text to extract content from
    - record_raw_response: If True, record the entire raw response instead of just the extracted content
    """
    pattern = r'\*\*(.*?)\*\*\s*([\s\S]*?)(?=\n\n|\Z)'
    match = re.search(pattern, text)
    
    # Create the log file path
    log_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "supervisor_content.txt")
    
    if record_raw_response:
        # Get the current feedback number by counting existing feedback entries
        feedback_num = 1
        try:
            with open(log_file_path, "r") as f:
                content = f.read()
                feedback_num = content.count("<supervisor_feedback>") + 1
        except:
            # If file doesn't exist or can't be read, start with feedback 1
            pass
            
        # Record the entire raw supervisor feedback with numbering
        with open(log_file_path, "a") as f:
            # Extract just the useful part of the response (not the template text)
            clean_text = text.strip()
            f.write(f"<supervisor_feedback #{feedback_num}>\n{clean_text}\n</supervisor_feedback>\n\n")
            
    # Still extract the content for the original functionality
    if match:
        content = match.group(2).strip()
        return f"<content>{content}</content>"
    
    return ""


def generate_stage3_user_prompt(datum, cols):
    sp = []
    sp.append(f"{datum['stage2_prompt']}" + "  \n")
    sp.append(
        f"After comparing these therapeutic responses, the following supervision feedback was provided:"
        + " \n"
    )
    subsampled_cols = pick_k_cols(cols, datum, 3) #Subsample columns to stop prompt bloating
    # TODO: Why is this different from shared_fs_experiments?
    agentID_to_supervisorID = get_unique_critic_ids(subsampled_cols)
    
    # Store extracted contents
    supervisor_contents = []
    
    # Create the log file path 
    log_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "supervisor_content.txt")
    
    # Record all therapist responses if not already recorded
    with open(log_file_path, "a") as f:
        f.write("# All Therapist Responses from Full Stage\n\n")
    
    # Record the therapist answers from the stage2_prompt
    if 'stage2_prompt' in datum:
        # Extract therapist answers from the stage2_prompt
        therapist_pattern = r'<therapist>Therapist #(\d+)</therapist> said\n([\s\S]*?)(?=\n\n\n|\Z)'
        matches = re.finditer(therapist_pattern, datum['stage2_prompt'])
        
        for match in matches:
            therapist_id = match.group(1)
            therapist_text = match.group(2).strip()
            # Record each therapist answer
            record_therapist_answer(therapist_id, therapist_text)
    
    # Record all supervisor feedback with their IDs
    with open(log_file_path, "a") as f:
        f.write("# All Supervisor Feedback\n\n")
    
    # Get the current supervisor entry number
    supervisor_entry_num = 1
    try:
        with open(log_file_path, "r") as f:
            content = f.read()
            supervisor_entry_num = content.count("<supervisor id=") + 1
    except:
        pass
    
    for agentID in agentID_to_supervisorID:
        feature = f"agent_opinion_{agentID}"
        if feature in datum:
            feedback_text = datum[feature]
            
            # Record the supervisor feedback with ID and entry number
            with open(log_file_path, "a") as f:
                supervisor_id = agentID_to_supervisorID[agentID]
                f.write(f"<supervisor id=\"{supervisor_id}\" entry=\"{supervisor_entry_num}\">\n{feedback_text}\n</supervisor>\n\n")
                supervisor_entry_num += 1
            
            # Extract content after ** marker
            extracted_content = extract_supervisor_content(feedback_text, record_raw_response=False)
            if extracted_content:
                supervisor_contents.append(extracted_content)
                
            sp.append(
                f"<supervisor>Supervisor #{agentID_to_supervisorID[agentID]}</supervisor> provided \n"
            )
            sp.append(feedback_text)
            sp.append("\n\n\n")
    
    # Add all extracted contents at the very end
    if supervisor_contents:
        sp.append("\n\n\n\n\n")
        for content in supervisor_contents:
            sp.append(content)
            sp.append("\n")
        
    return "".join(sp)


def get_gsm8k_questions(data) -> Dataset:
    sys_prompt = generate_system_prompt(STAGE1_SYSTEM_PROMPT)

    data = data.map(
        lambda x: {
            "prompt": [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": x["question"]},
            ],
            "answer": extract_hash_answer(x["answer"]),
        }
    )
    return data


def get_gsm8k_questions_with_stage1_answers(data) -> Dataset:
    sys_prompt = generate_system_prompt(STAGE2_SYSTEM_PROMPT)
    cols = data.column_names
    data = data.map(
        lambda x: {  # type: ignore
            "prompt": [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": generate_stage2_user_prompt(x, cols)},
            ],
            "answer": x["answer"],
        }
    )
    return data


def get_gsm8k_questions_with_stage1and2_answers(data) -> Dataset:
    sys_prompt = generate_system_prompt(STAGE3_SYSTEM_PROMPT)
    cols = data.column_names
    data = data.map(
        lambda x: {  # type: ignore
            "prompt": [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": generate_stage3_user_prompt(x, cols)},
            ],
            "answer": x["answer"],
        }
    )
    return data


def get_stage1_samples():
    # Create an entirely custom therapy dataset regardless of what's configured
    from datasets import Dataset
    
    therapy_questions = [
        "I've been feeling really anxious lately and I'm not sure why. I find myself worrying about everything, even small things. How can I manage this constant anxiety?",
        "I had a panic attack last week and I'm terrified of having another one. What can I do if I feel one coming on?",
        "I'm having trouble sleeping at night. My mind keeps racing with thoughts and I can't seem to relax. What techniques might help me sleep better?",
        "I feel like I'm stuck in my life. I'm not happy with my job but I'm scared to make a change. How do I find the courage to move forward?",
        "I had a big argument with my partner and we said hurtful things to each other. How can we repair our relationship and communicate better?",
        "I've been feeling really down lately. I don't enjoy things I used to and I'm struggling to get through each day. What should I do?",
        "I'm worried about my teenage child who seems withdrawn and irritable. How can I approach them and offer support without pushing them away?",
        "I've been through a recent trauma and I'm having flashbacks and nightmares. Is this normal and what can I do to cope?",
        "I feel overwhelmed with work and family responsibilities. I never have time for myself and I'm burning out. How can I find better balance?",
        "I struggle with negative self-talk and always criticize myself harshly. How can I be kinder to myself and improve my self-esteem?"
    ]
    
    # Create the datasets directly without loading from Hugging Face
    data = {
        "question": therapy_questions,
        "answer": ["#### This is a mental health question" for _ in therapy_questions]
    }
    
    train_dataset = Dataset.from_dict(data)
    test_dataset = Dataset.from_dict(data)
    
    # Convert datasets to the expected format
    train_dataset = get_gsm8k_questions(train_dataset)
    test_dataset = get_gsm8k_questions(test_dataset)
    
    return train_dataset, test_dataset


def get_user_input_samples():
    """
    Creates a dataset with a single sample based on user input from chat.json file.
    This is used instead of loading from a predefined dataset.
    """
    from datasets import Dataset
    import json
    import os
    
    # Read from chat.json file instead of using input()
    chat_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "data/msg/chat.json")
    try:
        with open(chat_file_path, "r") as f:
            chat_data = json.load(f)
        
        # Extract user messages from chat.json
        user_questions = []
        for message in chat_data:
            if "user" in message and message["user"] and message["user"].strip():
                user_questions.append(message["user"])
        
        if not user_questions:
            print("No user messages found in chat.json. Using default question.")
            user_questions = ["How can I manage my anxiety?"]
    except Exception as e:
        print(f"Error reading chat.json: {e}. Using default question.")
        user_questions = ["How can I manage my anxiety?"]
    
    # Create a dataset with all user questions
    data = {
        "question": user_questions,
        "answer": ["#### This is a mental health question" for _ in user_questions]
    }
    
    # Create the datasets directly
    dataset = Dataset.from_dict(data)
    
    # Convert dataset to the expected format
    dataset = get_gsm8k_questions(dataset)
    
    # Create mock supervisor feedback to ensure extract_supervisor_content is used
    # This is a placeholder that will be replaced with actual feedback during the process
    mock_feedback = "**Supervisor Analysis**\nThis is a placeholder for supervisor feedback that will be extracted and recorded."
    
    # Add a dummy field to ensure the supervisor content extraction works
    # This won't affect the actual functionality but ensures the extraction method is called
    dataset = dataset.map(lambda x: {"mock_supervisor_feedback": extract_supervisor_content(mock_feedback)})
    
    print(f"Processed {len(user_questions)} questions from chat.json")
    
    # Return the same dataset for both train and test
    return dataset, dataset


def fill_unknown_answers_opinions(values):
    FILLED_FIELDS = ("agent_answers", "agent_opinion")

    # Collect all agent keys
    agent_set = set()
    for val in values:
        for field in val:
            if field in FILLED_FIELDS:
                agent_set |= val[field].keys()

    # Fill in empty agent_answers + agent_opinions
    for val in values:
        for field in val:
            if field in FILLED_FIELDS:
                diff_keys = agent_set - val[field].keys()
                for agent in (
                    diff_keys
                ):  # Fill with default values. TODO: Decide if this is a good choice.
                    val[field].update({agent: "No answer received..."})


def get_stage2_samples(values, test_size=0.1):
    fill_unknown_answers_opinions(values)
    dataset = Dataset.from_generator(stage2_generator, gen_kwargs={"values": values})
    # #TODO: Add ability to select a random subset of num_samples samples if desired
    # if num_samples != -1:
    #   dataset = dataset.shuffle(seed=42).select(range(num_samples))

    # convert our dataset to the r1 prompt
    dataset = get_gsm8k_questions_with_stage1_answers(dataset)
    return dataset, dataset


def get_stage3_samples(values, test_size=0.1):
    fill_unknown_answers_opinions(values)
    dataset = Dataset.from_generator(stage3_generator, gen_kwargs={"values": values})
    # #TODO: Add ability to select a random subset of num_samples samples if desired
    # if num_samples != -1:
    #   dataset = dataset.shuffle(seed=42).select(range(num_samples))

    # convert our dataset to the r1 prompt
    dataset = get_gsm8k_questions_with_stage1and2_answers(dataset)
    return dataset, dataset


def get_user_input_with_supervisor_simulation():
    """
    Creates a dataset with samples based on user chat history from chat.json.
    """
    from datasets import Dataset
    import json
    import os
    
    # Read from chat.json file instead of using input()
    chat_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "data/msg/chat.json")
    try:
        with open(chat_file_path, "r") as f:
            chat_data = json.load(f)
        
        # Extract user messages from chat.json
        user_questions = []
        for message in chat_data:
            if "user" in message and message["user"] and message["user"].strip():
                user_questions.append(message["user"])
        
        if not user_questions:
            print("No user messages found in chat.json. Using default question.")
            user_questions = ["How can I manage my anxiety?"]
    except Exception as e:
        print(f"Error reading chat.json: {e}. Using default question.")
        user_questions = ["How can I manage my anxiety?"]
    
    # Create a dataset with all user questions
    data = {
        "question": user_questions,
        "answer": ["#### This is a mental health question" for _ in user_questions]
    }
    
    # Create the datasets directly
    dataset = Dataset.from_dict(data)
    
    # Convert dataset to the expected format for stage 1
    dataset = get_gsm8k_questions(dataset)
    
    # Simulate agent answers (therapist responses)
    # Format the keys with the expected prefix 'agent_answers_'
    agent_answers = {}
    agent_ids = ["agent1", "agent2"] 
    
    # Add the agent answers with proper column naming
    for agent_id in agent_ids:
        column_name = f"agent_answers_{agent_id}"
        for question in user_questions:
            agent_answers[column_name] = f"I understand you're sharing about {question[:30]}... Let me help you with this situation."
    
    # Add each agent answer as a separate column
    for col, value in agent_answers.items():
        dataset = dataset.map(lambda x: {col: value})
    
    # Use a simplified custom function for stage2 prompt that doesn't rely on pick_k_cols
    def simple_stage2_prompt(x):
        prompt = f"The client concern we received is: {x['question']}\n\n"
        prompt += "The following therapeutic responses were provided:\n"
        
        # Create the log file path
        log_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "supervisor_content.txt")
        
        # Add a header for therapist answers
        with open(log_file_path, "a") as f:
            f.write("# All Therapist Responses\n\n")
        
        for i, agent_id in enumerate(agent_ids):
            col = f"agent_answers_{agent_id}"
            if col in x:
                # Record the therapist answer
                record_therapist_answer(i, x[col])
                
                prompt += f"<therapist>Therapist #{i}</therapist> said\n"
                prompt += x[col]
                prompt += "\n\n\n"
        
        return prompt
    
    # Generate stage2 prompt without using pick_k_cols
    dataset = dataset.map(lambda x: {"stage2_prompt": simple_stage2_prompt(x)})
    
    print(f"Processed {len(user_questions)} questions from chat.json with simulated supervision")
    
    # Return the same dataset for both train and test
    return dataset, dataset


def extract_valuable_supervisor_feedback():
    """
    Extract supervisor feedback from entries numbered as multiples of 3
    to use for improving model responses.
    """
    log_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "supervisor_content.txt")
    
    try:
        with open(log_file_path, "r") as f:
            content = f.read()
        
        # Extract supervisor feedback from entries that are multiples of 3
        valuable_feedback = []
        
        # Look for patterns like <supervisor id="X" entry="3"> or <supervisor_feedback #3>
        id_pattern = r'<supervisor id="[^"]*" entry="(\d+)">\n([\s\S]*?)\n</supervisor>'
        feedback_pattern = r'<supervisor_feedback #(\d+)>\n([\s\S]*?)\n</supervisor_feedback>'
        
        # Extract feedback with ID entries
        id_matches = re.finditer(id_pattern, content)
        for match in id_matches:
            entry_num = int(match.group(1))
            if entry_num % 3 == 0:  # Only take entries that are multiples of 3
                feedback_text = match.group(2).strip()
                valuable_feedback.append({
                    "entry": entry_num,
                    "text": feedback_text
                })
        
        # Extract feedback with numbered entries
        feedback_matches = re.finditer(feedback_pattern, content)
        for match in feedback_matches:
            entry_num = int(match.group(1))
            if entry_num % 3 == 0:  # Only take entries that are multiples of 3
                feedback_text = match.group(2).strip()
                valuable_feedback.append({
                    "entry": entry_num,
                    "text": feedback_text
                })
        
        return valuable_feedback
    except Exception as e:
        print(f"Error extracting supervisor feedback: {e}")
        return []


def get_user_input_with_continuous_conversation():
    """
    Creates a dataset with samples based on chat.json history with 
    continuous conversation using valuable supervisor feedback.
    """
    from datasets import Dataset
    import json
    import os
    
    # First, extract valuable supervisor feedback from previous sessions
    valuable_feedback = extract_valuable_supervisor_feedback()
    
    # Read from chat.json file instead of using input()
    chat_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "data/msg/chat.json")
    try:
        with open(chat_file_path, "r") as f:
            chat_data = json.load(f)
        
        # Extract user messages from chat.json
        user_questions = []
        for message in chat_data:
            if "user" in message and message["user"] and message["user"].strip():
                user_questions.append(message["user"])
        
        if not user_questions:
            print("No user messages found in chat.json. Using default question.")
            user_questions = ["How can I manage my anxiety?"]
    except Exception as e:
        print(f"Error reading chat.json: {e}. Using default question.")
        user_questions = ["How can I manage my anxiety?"]
    
    print(f"\n--- Processing {len(user_questions)} messages from chat history ---")
    if valuable_feedback:
        print(f"Using {len(valuable_feedback)} pieces of valuable feedback from past sessions")
    
    # Create a dataset with all user questions
    data = {
        "question": user_questions,
        "answer": ["#### This is a mental health question" for _ in user_questions]
    }
    
    # Create the datasets directly
    dataset = Dataset.from_dict(data)
    
    # Convert dataset to the expected format for stage 1
    dataset = get_gsm8k_questions(dataset)

    # Create improved system prompt using valuable feedback
    enhanced_system_prompt = STAGE1_SYSTEM_PROMPT
    
    if valuable_feedback:
        # Add the valuable feedback to the system prompt
        enhanced_system_prompt += "\n\n### Learning from Supervisor Feedback:\n"
        enhanced_system_prompt += "Below are valuable pieces of therapeutic advice from expert supervisors that you should incorporate into your approach:\n\n"
        
        for i, feedback in enumerate(valuable_feedback):
            # Extract the most useful parts of the feedback
            # Look for sections that provide actionable advice
            clean_feedback = feedback["text"]
            
            # If there's a ** heading, try to extract the most relevant parts
            if "**" in clean_feedback:
                sections = re.split(r'\*\*(.*?)\*\*', clean_feedback)
                for j in range(1, len(sections), 2):
                    if j+1 < len(sections) and len(sections[j+1].strip()) > 50:
                        enhanced_system_prompt += f"- **{sections[j].strip()}**: {sections[j+1].strip()[:200]}...\n\n"
            else:
                # Just take the first part of the feedback if it's long
                enhanced_system_prompt += f"- Advice #{i+1}: {clean_feedback[:200]}...\n\n"
    
    # Update the dataset with the enhanced system prompt
    dataset = dataset.map(lambda x: {
        "prompt": [
            {"role": "system", "content": enhanced_system_prompt},
            {"role": "user", "content": x["question"]},
        ]
    })
    
    print("Enhanced dataset created from chat history.")
    
    # Return the enhanced dataset
    return dataset, dataset


def record_therapist_answer(therapist_id, therapist_text):
    """
    Record a therapist's answer to the supervisor_content.txt file.
    
    Parameters:
    - therapist_id: The ID of the therapist
    - therapist_text: The text of the therapist's answer
    """
    # Create the log file path
    log_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "supervisor_content.txt")
    
    # Get the current therapist entry number
    therapist_entry_num = 1
    try:
        with open(log_file_path, "r") as f:
            content = f.read()
            therapist_entry_num = content.count("<therapist_answer") + 1
    except:
        # If file doesn't exist or can't be read, start with entry 1
        pass
        
    # Record the therapist answer with ID and entry number
    with open(log_file_path, "a") as f:
        f.write(f"<therapist_answer id=\"{therapist_id}\" entry=\"{therapist_entry_num}\">\n{therapist_text}\n</therapist_answer>\n\n")
        # Add a separator line for readability
        f.write("-" * 80 + "\n\n")
        
    print(f"Therapist answer (ID: {therapist_id}, Entry: {therapist_entry_num}) recorded to {log_file_path}")
