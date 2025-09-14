
# Cure Me Baby
**Empowering accessible mental wellness with a gamified AI psychiatrist that delivers personalized, adaptive care and real-time progress insights in a TEE(Trusted Execution Environment)**

An AI-driven mental healthcare assistant securely operating with privacy and confidentiality within a TEE, leveraging Gensyn’s swarm to adaptively learn about each patient and provide personalized, context-aware guidance—all accessible via Japan Smart Chain's smart contract subscription.

Check out the live demo of **Cure Me Baby**:  👉 [Click here to try it out](https://e6df18cd50509713f55d4a9091642db764e3ff31-3000.dstack-prod5.phala.network/)

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
- **Subscription Payment:** Upon login, users pay 0.001 JETH via a smart contract that records their subscription. Renewals are as simple as making another payment, ensuring continuous access month-to-month.

### 2. Personalized Mental Health Interaction
- **AI-Powered Conversations:** Once authenticated, users interact with our AI psychiatrist—powered by a robust Large Language Model (LLM)—to discuss their challenges and receive empathetic guidance.
- **Adaptive Feedback:** The LLM tailors its responses in real time, offering therapeutic prompts and personalized advice based on individual session feedback.

### 3. Daily Progress & Visual Memory Wall
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


---

## System Architecture High-Level Overview🏗️

![Logo]()

### 1. User Onboarding & Subscription

- **Privy Wallet Login:**  
  Users log in via their Privy wallet, which provides secure authentication and ease of access.

- **Smart Contract-Based Subscription:**  
  The subscription process is executed through a Japan Smart Chain smart contract:
  - Users pay 0.001 JETH to subscribe.
  - The contract records the payment and activates the subscription.
  - Monthly renewals are handled in the same way, ensuring continuous access.

---

### 2. Secure Processing within a TEE

- **Phala Network TEE:**  
  All core processing—including AI interactions and data storage is conducted within a Trusted Execution Environment provided by Phala Network. This ensures:
  - Maximum data security and privacy.
  - All sensitive user data remains secure and never leaves the enclave.

- **Integrated LLM:**  
  The TEE hosts a robust Large Language Model (LLM) that serves as the AI psychiatrist. Additionally, models like Red Pill (ex. Deepseek that are pre-deployed in TEEs by Phala Network) can be utilized without the need for self-hosting, enhancing the system’s capabilities.

---

## 3. Dynamic Adaptive Guidance with Swarm Intelligence

- **Gensyn Swarm as a Collective:**  
  The Gensyn Swarm represents a network of multiple LLMs collaborating in real time. It:
  - Aggregates anonymized session data and user feedback.
  - Functions as a roundtable of models, continuously refining and updating the prompt to make it better each time.

- **Continuous Refinement:**  
  Off-chain, the swarm analyzes data from daily interactions, generating new approaches and personalized prompts. These updates are fed back into the TEE, ensuring that the LLM evolves and adapts over time based on the user's condition.

---

## 4. Gamified Daily Memory & Progress Tracking

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
- **Red Pill** – A fine-tuned Deepseek model deployed in a TEE, hosted via Phala Network.
- **Privy** – Privacy-preserving auth and embedded wallet SDK that supports email/phone/social login and passkeys.

---

## How to Run This Project 🚀
---

## Important Code Directories 📂
---

## Future Implementations 🚀
---





## Team👥

- **Derek Liew Qi Jian**  
  - *Role*: Project Lead, AI & TEE Integration
  - [LinkedIn](https://www.linkedin.com/in/derek2403/) | [Twitter](https://x.com/derek2403)

- **Phen Jing Yuan**  
  - *Role*: 
  - [LinkedIn](https://www.linkedin.com/in/jing-yuan-phen-b42266295/) | [Twitter](https://x.com/ilovedahmo)

- **Marcus Tan Chi Yau**  
  - *Role*: Frontend Developer & UI/UX Design 
  - [LinkedIn](https://www.linkedin.com/in/marcus-tan-8846ba271/)

