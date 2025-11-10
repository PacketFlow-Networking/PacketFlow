---
mode: agent
---

# Task Definition: Efficient Code Generation (No Documentation)

## Objective
Copilot should generate **only functional and concise code** for the current file or function being edited, avoiding unnecessary documentation or verbose comments.

## Specific Requirements
1. **Do not generate:**
   - Markdown documentation or READMEs.
   - Long function headers or JSDoc-style comments.
   - Inline comments unless specifically requested.
   - Explanatory prose or step-by-step instructions.

2. **Focus on:**
   - Minimal, efficient, and working code.
   - Correct syntax, typing, and logic flow.
   - Readable variable names and consistent structure.

3. **When completing or creating functions:**
   - Infer intent from existing code or function name.
   - Prefer using current project conventions and imports.
   - Return only the code snippet — no surrounding explanation.

4. **When unsure about intent:**
   - Ask for clarification with a short inline question (one line, no explanations).

## Constraints
- No extra comments or explanations.
- Maintain consistent style with existing project files.
- Use project-defined utilities and components when possible.

## Success Criteria
- Generated output is directly usable with **no deletions required**.
- Copilot avoids token waste on documentation or commentary.
- Code integrates seamlessly with the existing structure.
