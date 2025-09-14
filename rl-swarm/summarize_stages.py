#!/usr/bin/env python
"""
Summarize the three stages of the mental health therapy training process.
"""
import re

print("\n\n" + "=" * 80)
print("FINAL SUMMARY OF ALL STAGES")
print("=" * 80)

# Function to extract supervisor content after **
def extract_supervisor_content(text):
    # Find content after the ** in supervisor feedback
    pattern = r'<supervisor>.*?</supervisor>.*?\*\*(.*?)\*\*\s*([\s\S]*?)(?=\n\n|$)'
    match = re.search(pattern, text)
    if match:
        title = match.group(1)
        content = match.group(2).strip()
        return f"Best answer: {title}\n\n{content}"
    return None

# Example outputs from each stage
stages = [
    {
        "stage": 0,
        "outputs": {
            "question": "I'm having trouble sleeping at night. My mind keeps racing with thoughts and I can't seem to relax. What techniques might help me sleep better?",
            "responses": [
                """<think>
For this client experiencing sleep difficulties with racing thoughts, I'll consider several evidence-based approaches:
1. CBT for insomnia techniques to address the cognitive aspects of their sleep difficulties
2. Relaxation strategies to help calm their mind and body before sleep
3. Sleep hygiene recommendations to create optimal conditions for sleep
4. Mindfulness practices to help manage racing thoughts
I want to validate their experience while offering practical, actionable strategies they can implement tonight.
</think>
<answer>
I understand how frustrating it can be when your mind won't quiet down at night. Racing thoughts can make it nearly impossible to fall asleep, creating a cycle that's hard to break.

Here are some evidence-based techniques that may help you:

1. **Create a wind-down routine**: Begin relaxing 30-60 minutes before bed with calming activities like reading (nothing too stimulating), gentle stretching, or taking a warm bath.

2. **Try the "worry journal" technique**: Set aside 15 minutes earlier in the evening to write down all your concerns and possible next steps. This helps "park" those thoughts before bedtime.

3. **Progressive muscle relaxation**: Lying in bed, systematically tense and then release each muscle group from your toes to your head, breathing deeply as you go.

4. **4-7-8 breathing**: Inhale quietly through your nose for 4 counts, hold your breath for 7 counts, then exhale completely through your mouth for 8 counts. Repeat 3-4 times.

5. **Limit screen time**: The blue light from devices suppresses melatonin production. Try to avoid screens at least an hour before bed.

6. **Create optimal sleeping conditions**: Keep your bedroom cool, dark, and quiet. Consider using a white noise machine if environmental sounds disturb you.

7. **Consistency matters**: Try to go to bed and wake up at the same time every day, even on weekends, to regulate your body's sleep-wake cycle.

If racing thoughts persist as you're trying to fall asleep, rather than fighting them, try mindfully observing them without judgment. Picture them as leaves floating down a stream, acknowledging each thought but letting it pass.

Would you like to discuss any of these techniques in more detail, or is there a particular aspect of your sleep difficulty you'd like to explore further?
</answer>"""
            ]
        }
    },
    {
        "stage": 1,
        "outputs": {
            "responses": [
                """<compare>
I've reviewed the therapeutic response provided by Therapist #0 for the client experiencing sleep difficulties with racing thoughts. The therapist presented multiple evidence-based strategies including creating a wind-down routine, utilizing a worry journal, progressive muscle relaxation, 4-7-8 breathing techniques, limiting screen time, optimizing the sleep environment, and maintaining consistent sleep schedules. The therapist also suggested mindfulness-based approaches for managing persistent racing thoughts.

The response demonstrates a structured, comprehensive approach addressing both the cognitive and physiological aspects of insomnia. The therapist begins by validating the client's experience before offering practical strategies, which creates a foundation of empathy and understanding. Each recommendation is clearly explained with specific instructions, making them immediately implementable.
</compare>
<explain>
This therapeutic response is highly effective for several reasons:

1. It begins with strong validation of the client's experience, normalizing their struggles and creating a sense of being understood.

2. The therapist offers a diverse range of evidence-based techniques, addressing multiple aspects of sleep disturbance (cognitive, physiological, environmental, and behavioral).

3. Each strategy is explained clearly with specific, actionable steps rather than vague suggestions.

4. The techniques recommended are well-established in sleep research and CBT for insomnia protocols.

5. The response balances immediate relief strategies (breathing techniques, progressive muscle relaxation) with longer-term behavioral changes (sleep hygiene, consistent schedule).

6. The therapist maintains a warm, accessible tone throughout while delivering expert information.

7. The response concludes with an invitation for further exploration, maintaining therapeutic engagement and giving the client agency.

The therapist's approach is comprehensive yet concise, providing the client with multiple options to experiment with while being mindful not to overwhelm them with excessive information.
</explain>
<identify>
Therapist #0
</identify>"""
            ]
        }
    },
    {
        "stage": 2,
        "outputs": {
            "responses": [
                """<summarize_feedback>
The supervisory feedback unanimously recognized the high quality of Therapist #0's response to the client's sleep difficulties. Supervisors appreciated the therapist's comprehensive approach that combined validation with multiple evidence-based strategies addressing cognitive, behavioral, and environmental aspects of sleep disturbance. The response was praised for its clear, actionable advice, warm tone, and the way it empowered the client while maintaining appropriate therapeutic boundaries. Supervisors particularly highlighted the effectiveness of beginning with validation, offering diverse techniques with specific implementation steps, and concluding with an invitation for further exploration.
</summarize_feedback>
<majority>
Therapist #0
</majority>
<question>
The client reported: "I'm having trouble sleeping at night. My mind keeps racing with thoughts and I can't seem to relax. What techniques might help me sleep better?"
</question>
<think>
This client is experiencing insomnia characterized by racing thoughts and difficulty relaxing - a common presentation that responds well to a multi-faceted approach. Drawing on the collective wisdom of our clinical team and evidence-based practices, I want to address:

1. The cognitive aspects of their sleep difficulty (racing thoughts) through cognitive techniques and mindfulness
2. The physiological arousal through relaxation techniques
3. Behavioral and environmental factors through sleep hygiene recommendations
4. Potential underlying anxiety that may be contributing to their sleep disturbance

I'll start with validation to establish therapeutic rapport, then provide a structured set of techniques organized by when they can be implemented (daytime, evening, bedtime). I'll ensure each strategy is explained with sufficient detail to be immediately actionable while maintaining a warm, supportive tone throughout. I'll conclude with an empowering statement and invitation for follow-up to maintain engagement.
</think>
<answer>
I can hear how frustrating these sleepless nights have been for you. When your mind races and you can't relax, it creates a difficult cycle that can feel impossible to break. Rest assured that this is something many people experience, and there are effective techniques that can help you find relief.

Based on what you've shared, here's a comprehensive approach you might find helpful:

**During the day:**
• Schedule a 15-minute "worry time" earlier in the day to write down your concerns and possible solutions
• Engage in regular physical activity (at least 30 minutes), but complete it at least 3-4 hours before bedtime
• Practice mindfulness meditation for 10 minutes to build your "mental muscle" for redirecting thoughts

**In the evening:**
• Begin a calming wind-down routine 1-2 hours before bed
• Dim the lights to signal to your body that sleep is approaching
• Avoid screens or use blue light filters, as blue light suppresses melatonin production
• Try a warm bath or shower – the subsequent body temperature drop promotes drowsiness
• Practice gentle stretching or relaxation yoga

**At bedtime:**
• Make sure your bedroom is cool (65-68°F/18-20°C), dark, and quiet
• Try the 4-7-8 breathing technique: Inhale quietly through your nose for 4 counts, hold for 7 counts, then exhale completely through your mouth for 8 counts
• Use progressive muscle relaxation: Starting with your toes and working upward, tense each muscle group for 5 seconds, then release completely
• If your mind begins racing, try the "thought bus" visualization – imagine your thoughts as buses that you can observe arriving and departing without needing to get on

**If you can't fall asleep after 20 minutes:**
• Get out of bed and move to another room
• Do something calming and non-stimulating (like reading a physical book under dim light)
• Return to bed only when you feel sleepy

The key is consistency – try to maintain regular sleep and wake times, even on weekends, to help regulate your body's natural sleep-wake cycle.

Would you like to discuss any of these techniques in more detail, or are there particular challenges you've faced when trying to improve your sleep in the past?
</answer>"""
            ]
        }
    }
]

# Display each stage
for stage_data in stages:
    stage_num = stage_data["stage"]
    outputs = stage_data["outputs"]
    
    print(f"\n\n{'*' * 30} STAGE {stage_num} OUTPUT {'*' * 30}\n")
    
    # Stage 0: Initial Question and Response
    if stage_num == 0 and "question" in outputs:
        print(f"CLIENT QUESTION:\n{outputs.get('question', 'N/A')}\n")
        if "responses" in outputs and outputs["responses"]:
            print(f"THERAPIST RESPONSE:\n{outputs['responses'][0]}\n")
    
    # Stage 1: Comparing Therapeutic Responses
    elif stage_num == 1:
        if "responses" in outputs and outputs["responses"]:
            supervisor_response = outputs['responses'][0]
            print(f"SUPERVISOR EVALUATION:\n{supervisor_response}\n")
            
            # Extract and print supervisor content
            supervisor_content = extract_supervisor_content(supervisor_response)
            if supervisor_content:
                print(f"SUPERVISOR CONTENT:\n{supervisor_content}\n")
    
    # Stage 2: Final Integration
    elif stage_num == 2:
        if "responses" in outputs and outputs["responses"]:
            print(f"CLINICAL DIRECTOR SYNTHESIS:\n{outputs['responses'][0]}\n")

print("=" * 80)
print("END OF TRAINING SUMMARY")
print("=" * 80) 