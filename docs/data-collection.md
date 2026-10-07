# Collecting real UniMelb data by hand

Everything here is done by a person in a normal browser (see [research.md](research.md): automated retrieval of University websites is not allowed). Copy the text, paste it into an issue, the app's *Add data* page, or a chat with a maintainer, and it becomes facts-only YAML.

Copy **only** the parts listed below. Never copy overviews, learning outcomes or assessment descriptions.

## Order of work (Bachelor of Science, 2026 Handbook)

### Step 1. Major and specialisation structures

These pages say which subjects each major needs. Copy the **subject tables** on each page: codes, names, and the "core" / "select N points from" headings.

| Component | Page |
|---|---|
| Computing and Software Systems | https://handbook.unimelb.edu.au/2026/components/b-sci-major-1/print |
| Data Science | https://handbook.unimelb.edu.au/2026/components/b-sci-major-8/print |
| Mathematics and Statistics | https://handbook.unimelb.edu.au/2026/components/b-sci-major-29/print |
| Artificial Intelligence (specialisation) | https://handbook.unimelb.edu.au/2026/components/b-sci-spec-1/print |
| Advanced Computing (specialisation) | https://handbook.unimelb.edu.au/2026/components/b-sci-spec-2/print |

### Step 2. Which subjects count as "science"

The list of science discipline subjects decides science vs breadth. Copy the subject codes listed under each area (you can start with the computing, maths and statistics areas):

https://handbook.unimelb.edu.au/2026/components/b-sci-infspc-1/print

### Step 3. Every subject named in steps 1–2

For each subject:

1. Open `https://handbook.unimelb.edu.au/2026/subjects/<code>/eligibility-and-requirements` and copy everything from **Prerequisites** down to **Non-allowed subjects**.
2. On the subject's overview page, copy the **Availability** line (e.g. "Semester 1 - On Campus").
3. Note the **level** and **points** from the header.

### Step 4. Popular breadth subjects (optional)

Breadth is the easy-WAM question students ask most. Add level-1 and level-2 breadth subjects that students actually take, using the same copy steps as step 3.

## Tips

- Batches are fine. For example, paste 10 subjects one after another, each starting with its code and title.
- If a requirement is unusual (e.g. "permission of coordinator"), paste it anyway. It's kept as "check manually" rather than guessed.
- Record the date you copied it. That date becomes `verified_on`.
