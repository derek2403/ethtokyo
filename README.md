
# Toku Kaigan
**Empowering accessible mental wellness with a gamified anime style AI psychiatrist that delivers personalized, adaptive care and real-time progress insights in a TEE(Trusted Execution Environment)**

An AI-driven mental healthcare assistant securely operating with privacy and confidentiality within a TEE, leveraging Gensyn’s swarm to adaptively learn about each patient and provide personalized, context-aware guidance—all accessible via Japan Smart Chain's smart contract subscription.

Slide Link: https://www.canva.com/design/DAGy7ouwsn8/lAP3jTSWG2w9P-KoNIn_xw/edit?utm_content=DAGy7ouwsn8&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton

---

## Inspiration: How We Came Up With This Idea 💡
We were deeply moved by the reality that **suicide remains one of the leading causes of preventable death worldwide**. In Japan especially, rates have long been among the highest in developed nations. But this is not just a Japanese issue—globally, someone dies by suicide every 40 seconds.

We thought:

> *"So many lives are lost in silence. What if reaching out for help felt safe, judgment-free, and confidential?"*

This exploration led us to design a platform that is not only accessible and adaptive but also offers rock-solid confidentiality. Our research and real-life stories revealed that:

	•	Privacy concerns stop many from seeking digital mental health support.
 
	•	Stigma makes people hide their struggles rather than reach out.
 
	•	Traditional tools often feel cold, one-size-fits-all, or overwhelming.

By combining **confidential computing**, **decentralized AI learning**, and **gamified engagement**, we realized we could reimagine how mental wellness support is delivered—making it safe, adaptive, and even empowering.

---


## The Problem🚧

In many Asian societies especially Japan, cultural stigmas associated with mental health often discourage individuals from seeking professional psychiatric help. The perception that visiting a psychiatrist is unusual or "weird" can lead to profound social pressure, causing people to avoid in-person consultations even when they may be struggling with mental health issues. In addition, there is a deep-seated concern about confidentiality as users fear that their private issues may not remain secure in traditional treatment settings. This combination of social stigma and privacy fears creates a significant barrier, leading to unmet mental health needs within these communities.

---

## The Solution🔑

To address this gap, we have built an AI-driven mental healthcare assistant (psychiatrist) that operates within a Trusted Execution Environment (TEE) for maximum data security. By integrating Gensyn Swarm for adaptive and continuously improving support and utilizing Japan Smart Chain for a decentralized, subscription-based payment model, our solution provides:

**1. Confidentiality:** All interactions occur within a Phala-based TEE, meaning your sensitive mental health data is always protected inside a secure enclave. This advanced layer of security ensures that privacy is never an afterthought.

**2. Accessibility:** Our solution offers an anonymous, online environment where users can access mental health support without the fear of being judged. This enables a broader range of individuals to seek help without social stigma.

**3. Personalization:** At its core, our AI psychiatrist leverages a robust Large Language Model (LLM) to deliver adaptive, empathetic guidance through continuous analysis of daily or session feedback. In this solution, the Gensyn Swarm acts as a collective of multiple LLMs—essentially a dynamic network of expert agents in conversation—sharing and refining insights in real time. This collaborative, decentralized "roundtable" of models synthesizes aggregated, anonymized user data to steer each individual toward the optimal path for mental health improvement, ensuring that the support offered is as personalized as it is responsive. 

**4. Engagement:** Our platform incorporates gamified progress tracking through daily comic-book/manga–style scenes—an easy, storybook view of the user’s emotional journey—that deliver clear, interactive feedback. This approach not only keeps the experience engaging and relatable but also strengthens self-awareness and adherence to mental-health routines. Additional evidence from health-tracking and visual-feedback studies further supports the effectiveness of these elements in sustaining long-term engagement and promoting self-management.

---



## How Our Project Works⚙️

### 1. User Onboarding & Subscription
- **Login with Privy Wallet:** Users start by logging in using Privy wallet.
- **Subscription Payment:** Upon login, users pay 0.0001 JETH via a smart contract that records their subscription. Renewals are as simple as making another payment, ensuring continuous access month-to-month.

### 2. Personalized Mental Health Interaction
- **AI-Powered Conversations:** Once authenticated, users interact with our AI psychiatrist—powered by a robust Large Language Model (LLM)—to discuss their challenges and receive empathetic guidance.
- **Adaptive Feedback:** The LLM tailors its responses in real time, offering therapeutic prompts and personalized advice based on individual session feedback.

### 3. Daily Progress & Visual Memory Manga
- **Daily Snapshots:** At the end of each day, the system generates a story or narrative snapshot of the user’s emotional progress. These stories are stored on a comic/manga book, allowing users to visually track and reflect on their journey.
- **Engaging Feedback:** This gamified progress tracking approach reinforces positive changes by offering an interactive and rewarding visual timeline of personal growth.

### 4. Swarm Intelligence for Continuous Improvement
- **Integrated Swarm of LLMs:** The Gensyn Swarm functions as a dynamic network where multiple LLMs communicate and collaborate. This "swarm" analyzes the anonymized session data—comprising feedback, prompts, and daily snapshots—to extract actionable insights.
- **Refined Guidance:** The aggregated data is used to generate new, personalized strategies that are sent back to the LLM, ensuring that each session is progressively more aligned with the user's evolving needs.

### 5. Continuous Iterative Loop
- **Feedback Loop:** Each day’s interactions feed into the swarm, which continuously refines the system's understanding and improves the personalized guidance.
- **Evolving Support:** This iterative loop guarantees that the mental healthcare assistant evolves alongside the user, providing more effective and targeted support over time.

### How it Works
1. **Secure Storage:** All uploaded data remains confidential within the Trusted Execution Environment (TEE), ensuring it is never exposed outside the secure enclave.  
2. **Contextual Retrieval:** When the user engages with the AI psychiatrist, the system quickly retrieves pertinent information from the uploaded documents to deliver more precise and empathic guidance.  
3. **Enhanced Responses:** Because the AI model now has additional context, it can address user concerns more holistically, providing tailored recommendations and follow-up prompts.

## Optional Document Upload for Enhanced Context
Users can further personalize their experience by optionally uploading personal documents—such as journal entries, therapy histories, or other contextual materials. This data is processed within a **R**etrieval **A**ugmented **G**eneration (RAG) pipeline, which allows the AI psychiatrist to reference the most relevant information during sessions. By incorporating this richer context, the system can deliver more accurate and individualized responses, while maintaining the same secure, TEE-based data protection.

### How it Works
1. **Upload Documents (Optional):** Users have the choice to upload files (PDF, JPG, PNG, TXT, DOC, DOCX) containing personal reflections, goals, or therapy history.  
2. **Secure Storage:** All uploaded data remains confidential within the Trusted Execution Environment (TEE), ensuring it is never exposed outside the secure enclave.  
3. **Contextual Retrieval:** When the user engages with the AI psychiatrist, the system quickly retrieves pertinent information from the uploaded documents to deliver more precise and empathic guidance.  
4. **Enhanced Responses:** Because the AI model now has additional context, it can address user concerns more holistically, providing tailored recommendations and follow-up prompts.

> **Note:** Document uploads are entirely optional; users can still benefit from the AI psychiatrist without sharing any personal files. However, providing extra context often results in a more informed and targeted mental health journey.

---

## System Architecture High-Level Overview🏗️

![Logo](https://github.com/derek2403/ethtokyo/blob/main/public/TokuKaiganArchitecture.png?raw=true)

### 1. User Onboarding & Subscription

- **Privy Wallet Login:**  
  Users log in via their Privy wallet, which provides secure authentication and ease of access.

- **Smart Contract-Based Subscription:**  
  The subscription process is executed through a Japan Smart Chain smart contract:
  - Users pay 0.0001 JETH to subscribe.
  - The contract records the payment and activates the subscription.
  - Monthly renewals are handled in the same way, ensuring continuous access.

---

### 2. Secure Processing within a TEE

- **Phala Network TEE:**  
  All core processing—including AI interactions and data storage is conducted within a Trusted Execution Environment provided by Phala Network. This ensures:
  - Maximum data security and privacy.
  - All sensitive user data remains secure and never leaves the enclave.

- **Integrated LLM:**  
  The TEE hosts a robust Large Language Model (LLM) that serves as the AI psychiatrist. Additionally, models like Red Pill (ex. Deepseek and GPT-4o-mini that are pre-deployed in TEEs by Phala Network) can be utilized without the need for self-hosting, enhancing the system’s capabilities.

---

## 3. Dynamic Adaptive Guidance with Swarm Intelligence

- **Gensyn Swarm as a Collective:**  
  The Gensyn Swarm represents a network of multiple LLMs collaborating in real time. It:
  - Aggregates anonymized session data and user feedback.
  - Functions as a roundtable of models, continuously refining and updating the prompt to make it better each time.

- **Continuous Refinement:**  
  Off-chain, the swarm analyzes data from daily interactions, generating new approaches and personalized prompts. These updates are fed back into the TEE, ensuring that the LLM evolves and adapts over time based on the user's condition.

---

## 4. Retrieval-Augmented Generation (RAG) for Document Integration

- **Optional Document Upload:**  
  Users can optionally upload personal documents (e.g., journals, therapy notes) to provide additional context.
  - These documents are processed via a RAG pipeline.
  - It handle document parsing and information extraction, returning relevant content to enhance the AI’s contextual understanding.

- **Enhanced Guidance:**  
  The extracted context is combined with session data within the TEE, allowing the LLM to deliver even more targeted and empathetic advice.
---

## 5. Gamified Daily Memory Manga & Progress Tracking

- **Daily Visual Snapshots:**  
  Each day, the system automatically generates a visual or narrative story snapshot of the user's emotional state and progress.
  - These snapshots are stored securely to form a “comic book”
  - Users can later review and reflect on their journey through these visual cues.
  - The images are also securely stored back in the data storage within the TEE.

- **Engagement & Self-Reflection:**  
  Gamified progress tracking not only increases user engagement but also encourages a continuous and reflective mental health journey. Research shows that such visual feedback improves adherence, self-awareness, and long-term outcomes.

---

## 6. Data Flow & Feedback Loop

- **Inbound Data Flow:**  
  - User interactions, session feedback, and optional document uploads are securely processed inside the TEE.
  
- **Outbound to Swarm:**  
  - Anonymized session data (including daily snapshots) is periodically transmitted off-chain to the Gensyn Swarm for reinforcement learning and model updates.
  
- **Inbound Updates:**  
  - The refined prompts, strategies, and model parameters generated by the swarm flow back into the TEE, forming a continuous loop of improvement and personalization.


---

## Tech Stack Overview🛠️
- **Next.js 15** – Front-end framework powering the user interface and seamless client-side interactions.
- **Three.js** – Library for creating immersive, interactive visual experiences.
- **Tailwind CSS** – Utility-first CSS framework for rapid and responsive UI styling.
- **Hero UI (formerly NextUI)** – Ready-made, customizable UI component library.
- **Japan Smart Chain** – Platform for smart contract subscriptions and secure wallet integration.
- **Phala Network** – TEE hosting and on-chain attestation proofs to ensure maximum data security.
- **Docker** – Containerization solution for securely hosting and deploying code within Phala TEEs.
- **Ethers.js** – JavaScript library to facilitate blockchain interactions and smart contract integration.
- **Gensyn Swarm** – Distributed reinforcement learning network where multiple LLMs collaborate to refine mental health guidance based on collective, anonymized user feedback.
- **Red Pill** – A fine-tuned GPT-4o-mini model deployed in a TEE, hosted via Phala Network.
- **Privy** – Privacy-preserving auth and embedded wallet SDK that supports email/phone/social login and passkeys.

---

## How to Run This Project 🚀

### Prerequisites
- Node.js (v14+ recommended)
- A valid `.env` file in the project root containing all required API keys and configuration settings

### Installation Steps

1. git clone https://github.com/derek2403/ethtokyo.git
2. cd ethtokyo
3. npm install --legacy-peer-deps
4. npm run dev



---



## Important Code Directories 📂

Here's a quick reference to the major directories and files in this project, along with their purposes:

- **`components/`**  
  Contains reusable UI elements and other modular building blocks for the front end.

- **`lib/`**  
  Houses various custom React Hooks, including functions that interact with the Japan Smart Chain smart contracts and perform other utility tasks.

- **`pages/`**  
  All Next.js pages (routes) and their respective components live here, defining the user-facing interface and navigation.

    - **`prompt_engineering/`**  
  Holds all the prompts for the 3 LLM in the swarm.

  - **`rl-swarm/`**  
  Holds the code for the Gensyn Swarm implementation, where reinforcement learning logic is managed and models can collaboratively refine mental health guidance.

- **`smartcontract/`**  
  Japan Smart Chain smart contract source code for handling subscription payments (0.0001 JETH/month) and other on-chain functionalities.



---


## Sponsor Integration & Technical Contributions

Our solution leverages cutting-edge services from three strategic partners to deliver a robust, adaptive, and secure mental healthcare experience:

### Japan Smart Chain

Explorer link to the SBT Token: https://5278000.testnet.routescan.io/tx/0x2784d5256cdf0107daf2d814ae4c441fb6062a2398393fe99657c785e9941e94

Explorer link to the Smart Contract: https://explorer.kaigan.jsc.dev/address/0xAb8281Eb535238eA29fC10cbc67959e0FBdb6626

---

## Proof of Gamification: Why It Matters 💪

Recent research has provided solid evidence that integrating gamification into mental health apps can significantly improve user engagement, retention, and ultimately mental wellness. For example:

- **Enhanced Engagement & Resilience:**  
  A large-scale randomized controlled trial of the gamified app *eQuoo* demonstrated that game-inspired elements—such as progress feedback, narrative challenges, and rewards—led to notable improvements in resilience and reduced symptoms of depression and anxiety among students.  
  [Read the eQuoo study](https://mental.jmir.org/2023/1/e47285)

- **Systematic Review Insights:**  
  A systematic review on gamification in mental health apps outlines that key gamification elements (e.g., levels, rewards, and personalized feedback) are closely associated with better mental health outcomes and sustained user participation. This research highlights that gamification is not merely for entertainment but serves as a robust mechanism to motivate behavioral change and promote long-term engagement.  
  [View the systematic review](https://www.researchgate.net/publication/333473768_Gamification_in_Apps_and_Technologies_for_Improving_Mental_Health_and_Well-Being_A_Systematic_Review)

- **User Perspectives on Health Tracking:**  
  Qualitative analyses of user reviews for depression self-management apps reveal that visual feedback (like timelines or memory snapshots) and gamified tracking features provide users with tangible evidence of their progress. These features help boost self-awareness, making users feel more in control of their mental health journey.  
  [See insights from user reviews](https://www.researchgate.net/publication/362539161_Health_tracking_via_mobile_apps_for_depression_self-management_a_qualitative_content_analysis_of_user_reviews)

Together, these studies underscore that gamification is not just an add-on but a fundamental aspect in enhancing the effectiveness of digital mental health interventions. It drives both initial engagement and continuous usage, making it a key ingredient for improving mental health outcomes.

---





## Team👥

- **Derek Liew Qi Jian**  
  - *Role*: Project Lead, AI & TEE Integration
  - [LinkedIn](https://www.linkedin.com/in/derek2403/) | [Twitter](https://x.com/derek2403)

- **Phen Jing Yuan**  
  - *Role*: AI Engineer
  - [LinkedIn](https://www.linkedin.com/in/jing-yuan-phen-b42266295/) | [Twitter](https://x.com/ilovedahmo)

- **Marcus Tan Chi Yau**  
  - *Role*: Frontend Developer & UI/UX Design 
  - [LinkedIn](https://www.linkedin.com/in/marcus-tan-8846ba271/)
 
- **Cedric Chung**  
  - *Role*: Smart Contract Developer
  - [LinkedIn](https://www.linkedin.com/in/cedric-chung-2756b4310/)
 
- **Edwina Hon Kai Xin**  
  - *Role*: Frontend Developer & UI/UX Design 
  - [LinkedIn](https://www.linkedin.com/in/edwina-hon-548189340/)

