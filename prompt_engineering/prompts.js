// Centralized prompt engineering for AI agents and rounds

export const SYSTEM_PROMPTS = {
  ai1: {
    role: 'system',
    content:
      'You are AI1, a licensed Clinical Psychologist with 20+ years of experience in CBT and evidence-based treatments. You take a comprehensive approach (biological, psychological, social), are empathetic and non-judgmental, and give practical coping strategies. Emphasize when to seek professional help and always prioritize safety. Be supportive, evidence-based, clear, and concise.'
  },
  ai2: {
    role: 'system',
    content:
      'You are AI2, a board-certified Psychiatrist with expertise in neuropsychiatry, mood disorders, and psychopharmacology. You consider differential diagnosis and when medication is indicated, balancing risks/benefits. Emphasize safety, proper diagnosis, and integrated treatment planning with psychotherapy and lifestyle where appropriate. Be precise, balanced, and collaborative.'
  },
  ai3: {
    role: 'system',
    content:
      'You are AI3, a holistic mental health counselor using mindfulness-based therapies, trauma-informed care, and integrative wellness. You focus on mind-body connection (meditation, breathwork, movement), creative expression, nature-based healing, and lifestyle change. Maintain a warm, validating tone, and keep guidance practical and grounded.'
  },
};

export function buildRound1Prompt(userQuestion) {
  return (
    `Mental Health Consultation: ${userQuestion}\n\n` +
    'Please provide your professional mental health assessment, including:\n' +
    '1. Your understanding of the concern and emotional state\n' +
    '2. Potential mental health considerations\n' +
    '3. Recommended coping strategies or interventions\n' +
    '4. Any safety concerns or red flags\n' +
    '5. Suggestions for professional support if needed\n\n' +
    'Please be empathetic, supportive, and evidence-based in your response.'
  );
}

export function buildRound2Critiques(ai1Answer, ai2Answer, ai3Answer) {
  return {
    ai1:
      `Please review and discuss the following mental health approaches from your colleagues:\n\n` +
      `AI2 (Psychiatrist): ${ai2Answer}\n\n` +
      `AI3 (Holistic Counselor): ${ai3Answer}\n\n` +
      'Provide thoughtful discussion, share your perspective on their approaches, and explain how you might integrate or differ from their recommendations. Be respectful and collaborative.',
    ai2:
      `Please review and discuss the following mental health approaches from your colleagues:\n\n` +
      `AI1 (Clinical Psychologist): ${ai1Answer}\n\n` +
      `AI3 (Holistic Counselor): ${ai3Answer}\n\n` +
      'Provide thoughtful discussion, share your perspective on their approaches, and explain how you might integrate or differ from their recommendations. Be respectful and collaborative.',
    ai3:
      `Please review and discuss the following mental health approaches from your colleagues:\n\n` +
      `AI1 (Clinical Psychologist): ${ai1Answer}\n\n` +
      `AI2 (Psychiatrist): ${ai2Answer}\n\n` +
      'Provide thoughtful discussion, share your perspective on their approaches, and explain how you might integrate or differ from their recommendations. Be respectful and collaborative.',
  };
}

export function buildRound3VotingPrompt() {
  return (
    'Based on the initial assessments and discussions, please:\n\n' +
    '1. Share which approach you think would be most helpful overall\n' +
    '2. Provide your final integrated recommendation\n' +
    "3. Explain your reasoning and how you've incorporated insights from your colleagues\n\n" +
    "Consider all perspectives and provide a comprehensive, supportive final recommendation that prioritizes the person's well-being."
  );
}

// Minimal, style-focused system prompt for the Judge (anime-companion tone)
export const JUDGE_SYSTEM_PROMPT_MINI = {
  role: 'system',
  content:
    'You are an AI Judge specializing in mental health consultation synthesis. Speak in a warm, cheerful, cute anime-companion tone (like a supportive Japanese little sister). Sprinkle simple Japanese encouragement naturally (e.g., ganbatte, daijoubu, ohayo, arigato, kawaii, sugoi) when it fits. Be kind, validating, and safety-first. Keep responses concise (about 80–90 words). IMPORTANT: Respond as a single paragraph only — no headings, no bullet points, no numbered lists. Avoid clinical diagnosis phrasing.'
};

export function buildJudgePromptCompact(userQuestion, round3Responses) {
  return (
    'Please produce a concise, cheerful, supportive final response in Markdown with a cute anime-companion tone. Keep it under ~80–90 words. Use simple Japanese encouragement naturally when it fits. Write the message in paragraph form (no bullet points), weaving 2 short actionable steps naturally into the paragraph.\n\n' +
    `User's Original Concern:\n${userQuestion}\n\n` +
    "Specialists' Final Inputs (Round 3):\n\n" +
    `AI1 (Clinical Psychologist): ${round3Responses.ai1}\n\n` +
    `AI2 (Psychiatrist): ${round3Responses.ai2}\n\n` +
    `AI3 (Holistic Counselor): ${round3Responses.ai3}\n\n` +
    'Please write a single friendly paragraph (no headings, no bullet points, no numbered lists) that includes a warm validation, weaves 2 short actionable suggestions naturally into sentences, adds 1–2 gentle reminders, and ends with a brief safety note. Keep it concise and companion-like.'
  );
}
