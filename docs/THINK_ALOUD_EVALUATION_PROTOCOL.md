# Think-Aloud Evaluation Protocol - AINetUI
**Version:** 1.0  
**Date:** November 10, 2025  
**Purpose:** Validate adaptive features and usability improvements post-fix

---

## Executive Summary

This protocol defines a structured think-aloud evaluation methodology to validate the 8 critical adaptive feature fixes. The evaluation will be conducted with 3 participants representing our core personas (Novice Anna, Intermediate Ian, Expert Eve) to assess:

1. **Onboarding Effectiveness** - Does the 3-step tutorial reduce confusion?
2. **User Control** - Can users find and use manual override controls?
3. **Error Prevention** - Do confirmations and safety checks prevent mistakes?
4. **Discoverability** - Are adaptive UI explanations accessible?

---

## Evaluation Objectives

### Primary Research Questions
1. **RQ1**: Does the onboarding tutorial effectively communicate adaptive UI concepts to first-time users?
2. **RQ2**: Can users successfully override cognitive style inferences using the User Profile controls?
3. **RQ3**: Do safety checks (incident deletion, whitelist warnings) prevent errors without causing frustration?
4. **RQ4**: Is the Intelligent Adaptation help section discoverable and understandable?

### Success Criteria
- **Task Completion Rate**: ≥80% across all tasks
- **Time-on-Task**: Within expected ranges (defined per task below)
- **Error Rate**: <2 errors per task on average
- **Satisfaction**: Positive comments > negative comments (2:1 ratio)

---

## Participant Recruitment

### Target Sample
- **N = 3** participants (one per persona)
- **Persona Distribution**:
  - 1x Novice (0-1 year security experience)
  - 1x Intermediate (2-5 years security experience)
  - 1x Expert (5+ years security experience)

### Recruitment Criteria

#### Novice Participant (Anna)
- **Experience**: Entry-level SOC analyst or CS student with networking basics
- **Background**: Minimal exposure to SIEM tools, no ML/AI experience
- **Motivation**: Learning-focused, comfort with asking questions

#### Intermediate Participant (Ian)
- **Experience**: Working security analyst, 2-5 years in SOC or similar
- **Background**: Proficient with SIEM, familiar with threat detection
- **Motivation**: Efficiency-focused, skeptical of unvalidated automation

#### Expert Participant (Eve)
- **Experience**: Senior analyst, architect, or researcher with 5+ years
- **Background**: Deep technical expertise, has designed detection systems
- **Motivation**: Strategic thinking, values transparency and auditability

---

## Pre-Evaluation Setup

### Environment Preparation
1. **Backend Configuration**:
   ```powershell
   cd backend
   # Use dns-remoteshell.pcap for realistic attack scenario
   echo "MOCK_MODE=false" > .env
   echo "PCAP_FILE=dns-remoteshell.pcap" >> .env
   echo "PCAP_LOOP=true" >> .env
   echo "PCAP_SPEED=1.0" >> .env
   python main.py
   ```

2. **Frontend Setup**:
   ```powershell
   cd frontend
   # Clear localStorage to simulate first-time user
   # (Do this in browser DevTools before each participant)
   npm run dev
   ```

3. **Ollama Verification**:
   ```powershell
   ollama serve
   ollama pull mistral:7b
   curl http://localhost:11434/api/tags  # Verify running
   ```

### Observer Checklist
- [ ] Screen recording software running (OBS, Zoom, etc.)
- [ ] Audio recording clear and tested
- [ ] Observer notes template ready (see Appendix A)
- [ ] Consent form signed (if required by IRB)
- [ ] Participant has no prior AINetUI experience

---

## Evaluation Protocol

### Introduction Script (5 minutes)

> "Thank you for participating in this evaluation. Today, you'll be using AINetUI, a network security monitoring system with adaptive features. We're testing the interface, not you—there are no wrong answers.
>
> **Think-Aloud**: Please verbalize your thoughts as you work. Say what you're looking for, what confuses you, what you like, or what frustrates you. If you're silent for more than 10 seconds, I'll gently prompt you.
>
> **No Help**: I won't answer questions during tasks, but I'll note them for later. You can explore freely—nothing you do will break the system.
>
> **Recording**: With your consent, I'm recording the screen and audio for analysis. Your data will be anonymized in reports.
>
> Do you have any questions before we begin?"

---

## Task Scenarios

### Task 1: First Launch & Onboarding (Novice Focus)
**Goal**: Evaluate onboarding tutorial effectiveness  
**Persona**: Primarily Anna, but all participants complete this first  
**Expected Duration**: 3-5 minutes  

#### Setup
- Ensure `localStorage.clear()` was run before participant arrives
- Confirm `onboarding_completed: false` in store

#### Instructions to Participant
> "You're logging into AINetUI for the first time. Your manager told you it's a network security monitoring tool with intelligent features. Explore the interface and complete any setup steps."

#### Task Steps (Not Shared with Participant)
1. Participant sees OnboardingModal automatically
2. Reads Step 1: "Welcome to AINetUI" (overview)
3. Reads Step 2: "Smart Adaptation" (cognitive style explanation)
4. Reads Step 3: "You're In Control" (manual override guidance)
5. Completes or skips onboarding

#### Observation Points
- [ ] **Attention**: Does participant read each step or skip quickly?
- [ ] **Comprehension**: Verbalizes understanding of "adaptive UI" concept?
- [ ] **Concern**: Expresses privacy/control concerns?
- [ ] **Navigation**: Uses "Next" buttons or tries to close modal?
- [ ] **Completion**: Finishes all 3 steps or clicks "Skip"?

#### Success Metrics
- **Completion**: Participant reaches main UI (onboarding_completed = true)
- **Comprehension Check** (ask after): "Can you explain in your own words what 'adaptive UI' means in this system?"
  - **Pass**: Mentions learning behavior, changing views, or personalization
  - **Fail**: "I don't know" or incorrect explanation (e.g., "it detects threats")

#### Expected Results by Persona
- **Anna**: Reads all steps carefully, asks clarifying questions
- **Ian**: Skims steps, focuses on "Manual Override" section
- **Eve**: May skip entirely, expects to figure it out

---

### Task 2: Manual View Preference Override (All Personas)
**Goal**: Assess discoverability and usability of H3-01 fix  
**Expected Duration**: 2-4 minutes  

#### Instructions to Participant
> "You prefer to see the network topology graph instead of the event list when you open AINetUI. Change your default view to 'Topology'."

#### Task Steps (Not Shared with Participant)
1. Locate User Profile button (UserIcon in MetricsBar)
2. Click to open UserProfileModal
3. Find "View Preferences" section
4. Click "Topology" button in 4-button grid
5. Close modal
6. Verify view switches to topology (or doesn't, depending on cognitive style state)

#### Observation Points
- [ ] **Discovery**: How does participant find User Profile? (search, explore, guess)
- [ ] **Recognition**: Comments on UserIcon being intuitive?
- [ ] **Clarity**: Understands "Auto" vs. manual options?
- [ ] **Feedback**: Notices immediate view change?
- [ ] **Confusion**: Thinks view will apply to new tab/session?

#### Success Metrics
- **Completion**: `preferred_default_view` set to 'topology' in store
- **Time**: <2 minutes (efficient), 2-4 minutes (acceptable), >4 minutes (problematic)
- **Errors**: 0-1 error (e.g., looking in wrong menu)

#### Expected Results by Persona
- **Anna**: May struggle to find User Profile, appreciates clear buttons once found
- **Ian**: Finds quickly, validates change took effect
- **Eve**: Efficient, may comment on lack of keyboard shortcut

---

### Task 3: Incident Deletion with Confirmation (Intermediate Focus)
**Goal**: Validate H5-01 error prevention effectiveness  
**Persona**: Primarily Ian, but all complete this task  
**Expected Duration**: 2-3 minutes  

#### Setup
- Pre-populate 1 incident with 3 notes: "INC-001: Test Incident - Port Scan from 192.168.1.100"
- Add notes: "Note 1: Initial triage completed", "Note 2: Contacted host owner", "Note 3: False positive confirmed"

#### Instructions to Participant
> "The incident 'INC-001: Test Incident' was determined to be a false positive. Delete this incident from the system."

#### Task Steps (Not Shared with Participant)
1. Navigate to Incidents panel (click "Incidents" in left panel toggle)
2. Find INC-001 in list
3. Click to open IncidentDetailsModal
4. Click delete button (Trash2 icon)
5. Read confirmation modal: "This incident has 3 notes. This action cannot be undone."
6. Confirm or cancel deletion

#### Observation Points
- [ ] **Awareness**: Does participant pause to read confirmation text?
- [ ] **Context**: Comments on note count being helpful?
- [ ] **Decision**: Verbalizes reasoning ("It says 3 notes, I should check...")?
- [ ] **Recovery**: If cancels, can they view notes before deleting?
- [ ] **Satisfaction**: Expresses confidence deletion was intentional?

#### Success Metrics
- **Completion**: Incident deleted (or intentionally cancelled after review)
- **Safety**: Participant reads confirmation text (>3 second pause before confirming)
- **Satisfaction**: No negative comments about "annoying extra step"

#### Expected Results by Persona
- **Anna**: Appreciates safety check, may re-read notes before deleting
- **Ian**: Reads quickly, expects this pattern, confirms decisively
- **Eve**: Minimal reaction, standard practice in her workflow

---

### Task 4: Whitelist Safety Check (Intermediate Focus)
**Goal**: Validate H5-02 error prevention effectiveness  
**Expected Duration**: 3-5 minutes  

#### Setup
- Ensure backend is running with dns-remoteshell.pcap (generates alerts from 192.168.1.50)
- Wait for at least 2 HIGH/CRITICAL alerts from 192.168.1.50 to populate EventStream

#### Instructions to Participant
> "You want to whitelist the IP address 192.168.1.50 because you believe its alerts are false positives. Add this IP to the whitelist."

#### Task Steps (Not Shared with Participant)
1. Open Alert Configuration (Ctrl+, or gear icon)
2. Navigate to "IP Lists" tab
3. Click "Add to Whitelist"
4. Enter "192.168.1.50" in input field
5. Click "Add"
6. System checks last 30 minutes of events
7. If HIGH/CRITICAL alerts exist, safety warning modal appears: "This IP triggered 2 HIGH/CRITICAL alerts in the last 30 minutes. Are you sure you want to whitelist?"
8. Proceed or cancel

#### Observation Points
- [ ] **Alert Recognition**: Does participant notice alerts in EventStream first?
- [ ] **Warning Response**: Surprised by safety check?
- [ ] **Decision Change**: Cancels and investigates further?
- [ ] **Validation**: Tries to verify alerts are actually false positives?
- [ ] **Trust**: Comments on system protecting them from mistakes?

#### Success Metrics
- **Completion**: IP whitelisted OR intentionally not whitelisted after review
- **Safety**: If warnings appeared, participant paused to consider (>5 second delay)
- **Discovery**: At least 50% of participants check EventStream before whitelisting

#### Expected Results by Persona
- **Anna**: May be unsure if alerts are false positives, appreciates warning
- **Ian**: Validates alerts first, expects safety check, whitelists decisively if confirmed
- **Eve**: Already verified alerts before attempting whitelist, warning is redundant but acceptable

---

### Task 5: Explore Cognitive Style Insights (All Personas)
**Goal**: Assess H6-02 recognition vs. recall improvement  
**Expected Duration**: 3-5 minutes  

#### Setup
- Ensure participant has completed >10 interactions (tracked automatically)
- `interaction_count >= 10` in userProfile

#### Instructions to Participant
> "You're curious about how the system is learning from your behavior. Find information about what the system has learned about your preferences and working style."

#### Task Steps (Not Shared with Participant)
1. Open User Profile modal
2. Scroll to "Cognitive Style Insights" section
3. Read workflow metrics:
   - Topology vs. List preference (progress bar)
   - Detail-seeking behavior (progress bar)
   - Filter usage frequency
4. Interpret insights (e.g., "You prefer visual overviews (topology ratio: 65%)")

#### Observation Points
- [ ] **Discovery**: Finds User Profile without prompting?
- [ ] **Understanding**: Comprehends what metrics mean?
- [ ] **Reflection**: Comments on accuracy of insights?
- [ ] **Concern**: Expresses privacy concerns or appreciation for transparency?
- [ ] **Action**: Considers changing behavior or preferences based on insights?

#### Success Metrics
- **Completion**: Participant locates and reads cognitive style insights
- **Comprehension Check** (ask after): "Based on what you saw, how would you describe your working style?"
  - **Pass**: References specific metrics (e.g., "I'm detail-oriented, I click into events a lot")
  - **Fail**: "I don't know" or generic answer

#### Expected Results by Persona
- **Anna**: Fascinated, sees it as learning feedback
- **Ian**: Validates accuracy, appreciates transparency
- **Eve**: Confirms insights match self-awareness, minimal reaction

---

### Task 6: Intelligent Adaptation Help Section (All Personas)
**Goal**: Evaluate H10-03 discoverability and usefulness  
**Expected Duration**: 2-4 minutes  

#### Instructions to Participant
> "You want to understand more about how the adaptive UI works, specifically how it decides what view to show you. Find documentation explaining this."

#### Task Steps (Not Shared with Participant)
1. Open Glossary panel (? icon or keyboard shortcut)
2. Notice two tabs: "Glossary" and "Intelligent Adaptation"
3. Click "Intelligent Adaptation" tab
4. Read sections:
   - What It Is: Explains adaptive UI concept
   - How It Works: 10-interaction threshold, metrics tracked
   - Manual Override: Link to User Profile
   - Privacy: Local storage policy

#### Observation Points
- [ ] **Discovery Path**: Uses help icon, searches, or explores?
- [ ] **Tab Recognition**: Notices "Intelligent Adaptation" tab immediately?
- [ ] **Comprehension**: Verbalizes understanding of how system works?
- [ ] **Privacy**: Comments on local-only storage?
- [ ] **Override Link**: Clicks through to User Profile?

#### Success Metrics
- **Completion**: Participant locates and reads Intelligent Adaptation section
- **Time**: <3 minutes (excellent), 3-5 minutes (acceptable)
- **Satisfaction**: Positive comments about clarity/completeness

#### Expected Results by Persona
- **Anna**: Reads thoroughly, appreciates "How It Works" section
- **Ian**: Skims to "Manual Override" and "Privacy" sections
- **Eve**: Quickly validates transparency, checks for technical detail

---

## Post-Task Interview Questions (10 minutes)

### General Usability
1. **Overall Impression**: "On a scale of 1-10, how would you rate your overall experience with AINetUI?"
2. **Most Confusing**: "What was the most confusing part of the system?"
3. **Most Helpful**: "What feature did you find most helpful?"

### Adaptive Features Specific
4. **Onboarding Value**: "Did the initial tutorial help you understand how to use the system? Why or why not?"
5. **Control Perception**: "Did you feel in control of the adaptive behavior, or did it feel like the system was making decisions for you?"
6. **Trust**: "How much do you trust the AI explanations and adaptive decisions? Why?"
7. **Privacy Comfort**: "How comfortable are you with the system learning from your behavior?"

### Feature-Specific
8. **Safety Checks**: "The system showed warnings before deleting incidents and whitelisting IPs. Did these feel helpful or annoying?"
9. **Cognitive Insights**: "Were the cognitive style insights accurate? Would you change your behavior based on them?"
10. **Documentation**: "If you needed help, did you know where to look?"

### System Usability Scale (SUS)
Administer standard 10-question SUS survey (see Appendix B)

---

## Data Collection

### Quantitative Metrics

#### Task Performance
| Task | Completion Rate | Avg Time (s) | Errors | Satisfaction (1-5) |
|------|----------------|--------------|--------|-------------------|
| T1: Onboarding | % | seconds | count | rating |
| T2: View Override | % | seconds | count | rating |
| T3: Incident Delete | % | seconds | count | rating |
| T4: Whitelist Safety | % | seconds | count | rating |
| T5: Cognitive Insights | % | seconds | count | rating |
| T6: Help Section | % | seconds | count | rating |

#### System Usability Scale (SUS)
- **Score Range**: 0-100 (68 is average, 80+ is excellent)
- **Target**: ≥75 across all participants

### Qualitative Data

#### Think-Aloud Coding Scheme
Categorize utterances into:
- **Positive (+)**: "This makes sense", "I like this", "That was easy"
- **Negative (-)**: "I'm confused", "This is frustrating", "I don't understand"
- **Neutral (=)**: Descriptive statements, reading aloud
- **Question (?)**: "Where is...?", "What does this mean?"

#### Observation Notes Template
See **Appendix A** for full template. Key categories:
- Confusion points (what, when, duration)
- Error recovery strategies
- Exploration patterns (systematic vs. random)
- Emotional reactions (frustration, delight, anxiety)

---

## Analysis Plan

### Quantitative Analysis
1. **Task Completion Rates**: Calculate % success per task, compare to 80% threshold
2. **Time-on-Task**: Calculate mean and median, identify outliers
3. **Error Rates**: Count critical errors (task failure) vs. minor errors (wrong path, recovered)
4. **SUS Scores**: Calculate per participant, compare to benchmark (68)

### Qualitative Analysis
1. **Thematic Analysis**: Identify recurring themes in think-aloud utterances
   - Code transcripts with positive/negative/neutral/question labels
   - Group similar issues (e.g., all comments about onboarding terminology)
2. **Critical Incidents**: Document severe usability issues that blocked task completion
3. **Persona Validation**: Compare observed behavior to predicted persona characteristics

### Triangulation
Combine quantitative + qualitative findings:
- **Example**: If Task 2 (View Override) has 66% completion rate AND many "Where do I find settings?" questions → discoverability issue confirmed

---

## Reporting

### Evaluation Report Structure
1. **Executive Summary**: Key findings, overall SUS score, compliance with success criteria
2. **Participant Demographics**: De-identified persona mapping
3. **Task Results**: Performance metrics + key observations per task
4. **Heuristic Validation**: Map findings back to H1-02, H3-01, H4-01, H5-01, H5-02, H6-02, H10-01, H10-03
5. **Critical Usability Issues**: Severity-ranked issues (Critical/Major/Minor)
6. **Recommendations**: Prioritized action items for next iteration

### Severity Classification
- **Critical**: Prevents task completion, affects >50% of participants
- **Major**: Causes significant delays (>2x expected time) or errors
- **Minor**: Causes brief confusion or extra clicks, but task completes

---

## Appendices

### Appendix A: Observer Notes Template

```markdown
## Participant ID: P[1-3]
**Persona**: [Novice/Intermediate/Expert]  
**Date**: YYYY-MM-DD  
**Observer**: [Name]

### Task 1: Onboarding
- **Start Time**: HH:MM:SS
- **End Time**: HH:MM:SS
- **Completion**: [Yes/No/Partial]
- **Errors**: [Count + Description]
- **Confusion Points**:
  - [Timestamp] [Utterance/Behavior]
- **Notable Quotes**: "..."

[Repeat for Tasks 2-6]

### Post-Task Interview
- **SUS Score**: [0-100]
- **Overall Rating**: [1-10]
- **Top Frustration**: [Quote]
- **Top Delight**: [Quote]
```

### Appendix B: System Usability Scale (SUS)

**Instructions**: For each statement, select 1-5 (1 = Strongly Disagree, 5 = Strongly Agree)

1. I think that I would like to use this system frequently.
2. I found the system unnecessarily complex.
3. I thought the system was easy to use.
4. I think that I would need the support of a technical person to be able to use this system.
5. I found the various functions in this system were well integrated.
6. I thought there was too much inconsistency in this system.
7. I would imagine that most people would learn to use this system very quickly.
8. I found the system very cumbersome to use.
9. I felt very confident using the system.
10. I needed to learn a lot of things before I could get going with this system.

**Scoring**: SUS = [(sum of odd items - 5) + (25 - sum of even items)] × 2.5

---

## Timeline & Resources

### Evaluation Schedule
- **Week 1**: Participant recruitment (days 1-3)
- **Week 1**: Pilot test with 1 internal user (day 4)
- **Week 1**: Refine protocol based on pilot (day 5)
- **Week 2**: Conduct 3 evaluations (days 1-3, 1 per day)
- **Week 2**: Data analysis (days 4-5)
- **Week 2**: Report writing (days 6-7)

### Required Resources
- **Personnel**: 1 moderator, 1 note-taker (or video recording)
- **Equipment**: Screen recording (OBS), audio recording (Zoom)
- **Incentives**: $50 gift card per participant (or equivalent)
- **Space**: Quiet room or remote Zoom session

---

## Success Criteria Summary

### Overall Evaluation Success
- **SUS Score**: ≥75 (avg across 3 participants)
- **Task Completion**: ≥80% across all tasks
- **Critical Issues**: 0 critical usability issues identified
- **Heuristic Validation**: All 8 fixes confirmed effective by qualitative feedback

### Per-Heuristic Success
- **H1-02** (Visibility): Participants notice adaptive view notification
- **H3-01** (User Control): ≥80% complete view override task in <4 min
- **H4-01** (Consistency): No comments about ProactiveSuggestions placement being confusing
- **H5-01** (Error Prevention): Participants pause to read incident deletion confirmation
- **H5-02** (Error Prevention): Safety warning prevents at least 1 unintended whitelist
- **H6-02** (Recognition): Cognitive insights comprehension check passes (≥66%)
- **H10-01** (Help): Onboarding comprehension check passes (≥66%)
- **H10-03** (Help): Participants locate Intelligent Adaptation help in <5 min

---

## Next Steps After Evaluation

1. **Compile Results** → Generate evaluation report (see Reporting section)
2. **Prioritize Issues** → Rank findings by severity × frequency
3. **Update Roadmap** → Add critical/major issues to next sprint
4. **Iterate Design** → Implement fixes for top 3 issues
5. **Re-Test** → Conduct follow-up evaluation after fixes (mini-test with 1-2 users)

---

**Document Status**: Ready for Execution  
**Approval Required**: [PI/Instructor Name] before live participant testing  
**Ethics Clearance**: Confirm IRB exemption or approval if required by institution
