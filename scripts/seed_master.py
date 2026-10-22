"""Authoring seed for the 44-course draft. Run: python3 scripts/seed_master.py.
The checked-in JSON is the runtime source; revise and review before publication.
These are curriculum *drafts*, not accredited or expert-approved lesson scripts.
"""
import json
import re
from pathlib import Path

STAGES = [
    (1, 6, 'Digital foundations', 'Begin with safe, useful everyday skills.'),
    (7, 11, 'Computational thinking', 'Think in steps, build with blocks and make the bridge to code.'),
    (12, 15, 'Creative digital production', 'Design, make and share with care.'),
    (16, 21, 'Web foundations', 'Understand, build and improve the web.'),
    (22, 27, 'Programming and software development', 'Turn ideas into tested, accessible software.'),
    (28, 32, 'Data and AI', 'Understand evidence and use intelligent tools responsibly.'),
    (33, 37, 'Networks, cybersecurity and cloud', 'Connect, protect and operate digital systems.'),
    (38, 40, 'Interactive technology', 'Create physical and interactive experiences safely.'),
    (41, 44, 'Career and capstone', 'Use your skills for people and explain what you made.'),
]

# Fields: title || purpose || hours || required project || assessment || four sequenced modules (title ~ measurable focus).
ROWS = '''
Getting Started with Learning and Digital Confidence||Introduce the learning space, safe learning habits, goal setting and confidence with technology.||2||Create a personal learning plan with one goal, a weekly practice schedule and a short reflection; an early learner may dictate their reflection.||Navigation task, orientation quiz and learning-plan rubric.||Welcome to Desloop~Locate the course map, lessons, tasks, feedback, accessibility settings and help;How learning works~Distinguish worked examples, guided practice, independent work, review and revision;Goals and routines~Set a realistic small goal and make a practice checklist;Digital wellbeing~Choose breaks, focus habits and respectful behaviour online.
Devices, Hardware and Operating Systems||Build practical understanding of common devices, hardware, software and safe device handling.||4||Create an annotated device map or presentation showing a device, its main parts and safe-care steps.||Component-identification check, device task and safe-handling rubric.||Digital devices~Compare phones, tablets, laptops, desktops and shared classroom devices;Parts and peripherals~Identify input, output, storage and processing components and describe their roles;Operating systems~Find apps, menus, windows and basic settings on a safe device;Care and basic troubleshooting~Check charging, sound and connectivity before escalating a problem.
Files, Folders and Digital Organisation||Create, name, find and safely manage digital files and backup copies.||3||Build a tidy project folder with an index, three descriptively named artefacts and a backup copy.||Practical file-management checklist and short formats/safe-deletion quiz.||Files and folders~Distinguish documents, images, audio, video, downloads and directories;Naming and organisation~Use descriptive filenames and a project-based folder structure;Saving and exporting~Save to an intended location, choose a suitable format and retrieve the file;Backup and recovery~Explain copies, recycle bins, cloud storage and safe deletion.
Typing, Accessibility and Productivity Basics||Develop efficient input skills and introduce accessible everyday productivity tools.||4||Produce a readable one-page guide with a heading, list, useful formatting and accessible layout.||Document checklist, input task and demonstration of accessibility settings.||Keyboard and input~Practise typing, punctuation, navigation and safe shortcuts;Documents~Create, edit, format, save and export a simple document;Accessibility tools~Try zoom, captions, text-to-speech, speech input and contrast options;Productivity habits~Use checklists, names and reminders to keep work organised.
Internet, Search and Digital Research||Browse responsibly, search effectively, evaluate sources and recognise misleading claims.||4||Compare three approved sources on a safe topic and explain which is most trustworthy and why.||Source-evaluation rubric plus safety and research check.||The web and browsers~Distinguish sites, tabs, addresses, links and search engines;Search strategies~Use keywords, phrase searches and appropriate filters;Trust and evidence~Compare authorship, date, evidence, purpose and independent corroboration;Misinformation and scams~Spot suspicious downloads, impersonation, sensational claims and unsupported headlines.
Digital Communication, Collaboration and Citizenship||Communicate respectfully, collaborate safely and recognise privacy and reporting boundaries.||4||Complete a supervised group task and reflect on contributions, feedback and online safety.||Message-writing task, collaboration observation and citizenship quiz.||Communication choices~Choose an appropriate tool for a message, discussion, meeting or shared work;Clear digital writing~Write subject lines, context, respectful requests and concise updates;Collaboration~Assign tasks, share constructive feedback and manage revisions respectfully;Digital citizenship~Practise consent, attribution, privacy, reporting and respectful disagreement.
Computational Thinking and Algorithms||Introduce decomposition, pattern recognition, abstraction and ordered problem-solving.||4||Design an algorithm for a familiar task, represent it as a flowchart and test it with a partner.||Algorithm trace, flowchart rubric and concept quiz.||Decomposition~Split a large task into small manageable steps;Patterns and abstraction~Find useful repetition and ignore irrelevant detail;Algorithms~Write ordered instructions and represent them in a flowchart;Tracing and improvement~Test instructions, discover ambiguity and repair the steps.
Creative Coding with Blocks||Create visual programs using events, sequences, repetition and interaction.||6||Build an interactive story, animation or simple game using an event, repetition and a user choice.||Project rubric, code explanation and debugging task.||First visual program~Open a supervised visual coding environment and run an example;Events and sequences~Trigger actions and arrange instructions in order;Loops and conditions~Repeat an action and respond to a choice;Variables and interaction~Store a changing value and make a creation respond to input.
Logic, Conditions and Repetition||Develop decisions and repetition as foundations for programming.||5||Create a quiz or decision-tree activity with at least two decisions and one repeated action.||Logic worksheet, tracing exercise and working activity.||Boolean thinking~Compare values and explain true and false outcomes;Decisions~Apply if and else rules to an everyday decision;Loops~Repeat work a number of times or until a condition changes;Combining logic~Trace a small program and predict the output.
Debugging, Testing and Problem Solving||Teach systematic investigation and testing instead of random code changes.||4||Repair a prepared broken visual project and record a before-and-after bug report.||Debugging checklist, repaired project and short reflection.||What is a bug~Distinguish syntax, logic and input problems;Reproduce the problem~Record steps, expected result and actual result;Test a hypothesis~Change one relevant thing at a time and check the outcome;Regression checks~Retest earlier behaviours after applying a fix.
First Steps in Text-Based Programming||Move from visual instructions to beginner-friendly text code.||6||Create a small interactive greeting, quiz or calculator in an approved beginner language.||Working program, walkthrough and introductory concept check.||Code environment~Run a first program in a supervised development space;Output and variables~Display text and store a value that can change;Input and decisions~Read safe input and use a basic condition;Translate and debug~Turn pseudocode into code and correct common syntax errors.
Visual Design Foundations||Create readable designs using hierarchy, alignment, contrast, spacing and type.||5||Design a poster or learning card for a chosen audience and revise it after feedback.||Rubric for purpose, hierarchy, readability, contrast and revision.||Audience and purpose~Define the message and who will use it;Hierarchy and layout~Group and align elements with proximity and whitespace;Typography and colour~Choose legible type and accessible contrast;Critique and iteration~Use feedback to improve a visible design choice.
Digital Graphics and Illustration||Work with raster and vector artwork, layers, exports and permitted assets.||6||Make an original or properly licensed logo concept, banner and square graphic.||Three artefacts, export quality and attribution/rights checklist.||Image types~Compare pixels, vectors, resolution and common formats;Shapes and layers~Build a simple illustration with grouping and alignment;Editing and export~Crop, resize and export versions for different uses;Licensing~Document permission and attribution for any borrowed asset.
Photography, Audio and Video Basics||Plan, capture and edit a short media story with captions and consent.||6||Produce a short educational media piece or an equivalent storyboard/audio work if recording is unsuitable.||Media rubric for clarity, sequence, captions, permissions and accessible alternatives.||Plan a story~Create a storyboard and simple shot or sound list;Capture~Use framing, lighting, sound and consent practices;Edit~Trim and arrange media into a coherent sequence;Accessibility and rights~Provide captions or an equivalent and use permitted media.
Content Creation, Copyright and Online Reputation||Plan responsible publishing with attribution, privacy and audience awareness.||4||Create a sample post with a content plan, attribution notes and a pre-publication privacy check; do not publish child information.||Content checklist, attribution accuracy and privacy scenarios.||Who owns content~Distinguish original, licensed and public-domain work conceptually;Attribution~Record creator, source and licence when required;Reputation and privacy~Review audience and what should stay private;Content planning~Set a purpose, format and safe review checklist.
How the Web Works||Introduce browsers, servers, URLs, domains and request-response concepts.||4||Draw a labelled diagram of a website request and response and annotate a safe example URL.||Diagram rubric and terminology quiz.||Web basics~Distinguish the internet, web, browsers and websites;URLs and domains~Identify protocol, domain, path and query in a safe URL;Client and server~Trace a page request from browser to server and back;Trust and performance~Explain HTTPS, caching and responsible browsing at a high level.
HTML: Structure and Meaning||Create semantic, accessible pages with appropriate content elements.||7||Build a multi-section informational website with semantic structure and meaningful link and image text.||Code review, browser check and introductory accessibility checklist.||HTML document~Create a valid page skeleton with elements and attributes;Content elements~Use headings, paragraphs, lists, links and images;Semantic structure~Choose header, nav, main, section and footer for meaning;Accessibility and validation~Add meaningful alt text, clear links and basic validation.
CSS: Styling and Layout||Use selectors, the box model and layout to communicate consistently.||8||Style the HTML project into a polished multi-section website with a coherent colour and spacing system.||Responsive visual review, code walkthrough and CSS quiz.||Selectors and cascade~Apply classes and recognise which declaration wins;Box model~Control margin, padding, borders and sizing;Layout~Use Flexbox and introductory Grid for structure;Polish and states~Style focus, hover, spacing and text consistently.
Responsive Web Design and Accessibility||Design mobile-first layouts and test accessibility at different widths.||6||Make a website usable on phone, tablet and desktop, and submit a responsive QA record.||Viewport checks, keyboard walkthrough and accessibility rubric.||Mobile-first thinking~Prioritise essential content and touch interaction;Breakpoints and fluid layout~Use relative units and responsive rules;Accessible interaction~Test keyboard navigation, labels, focus and contrast;Responsive QA~Inspect phone, tablet and desktop and fix blocked controls.
JavaScript Fundamentals||Introduce interactive browser behaviour and readable basic code.||10||Build an interactive quiz, calculator or task list with input validation and helpful feedback.||Functionality tests, code walkthrough and problem-solving quiz.||Values and expressions~Use variables, types, operators and expressions;Control flow and functions~Write decisions, loops and reusable functions;DOM and events~Respond to user actions and change visible content safely;Debugging~Use logs and test expected and unexpected input.
Git, GitHub and Version Control||Track changes, collaborate and protect secrets in repositories.||5||Create a non-sensitive learning repository with an organised project, README and meaningful commits.||Repository structure, commit-history and security-hygiene checklist.||Version control concepts~Explain why a change history supports learning and collaboration;Repositories and commits~Track work with specific, meaningful commit messages;Branches and collaboration~Practise a simple branch and review workflow;Repository hygiene~Write a README, ignore generated files and protect credentials.
Programming Fundamentals and Problem Solving||Translate requirements into functions, collections, validation and tests.||10||Build a small grade calculator, budget tool or quiz using synthetic data.||Requirements checklist, test cases, code review and demonstration.||Requirements and pseudocode~Describe inputs, outputs and steps before coding;Functions and collections~Organise reusable work and choose basic structures;Input and errors~Validate data and handle expected failure;Testing and readability~Name clearly and test normal and edge cases.
Data Structures and Algorithmic Thinking||Choose collections and reason about search, sort and edge cases.||8||Build a data organiser that can search, filter and sort synthetic records.||Algorithm trace, edge-case tests and code explanation.||Collections~Use lists and key-value records appropriately;Searching~Trace a linear search and introduce binary search when suitable;Sorting~Compare records and order them by a chosen key;Complexity intuition~Compare how work changes as inputs grow.
UI/UX Design and Prototyping||Understand user needs, map a task and revise after usability feedback.||7||Prototype an education-related interface, test it with a peer and improve the flow.||Design rubric, usability findings and at least one documented revision.||Users and needs~Write a bounded problem statement and user goal;Flows and wireframes~Map a task with low-fidelity screens;Prototype~Link screens to show the intended journey;Usability testing~Observe attempts, record friction and revise a design.
APIs and Data Exchange||Exchange structured information and handle request states safely.||8||Build an interface that uses a safe API or local mock and displays loading, empty and error states.||Working demonstration, request-response explanation and error-state test.||API concepts~Explain what an endpoint provides and why a contract matters;JSON~Read objects, lists and nested data;Requests and responses~Compare GET with introductory POST concepts and status codes;Error handling~Show useful loading, retry and empty states without crashing.
Software Engineering and Testing||Turn requirements into modular, tested and reviewable software.||8||Improve an earlier project with acceptance criteria, modular code, tests and release notes.||Test results, code-review checklist and requirements traceability.||Requirements~Write user stories and observable acceptance criteria;Design and modules~Separate responsibilities and describe interfaces;Testing~Write introductory unit and integration checks;Review and delivery~Review changes, record issues and document a release.
Frontend Application Development||Bring HTML, CSS, JavaScript and UX into a multi-page application.||12||Build a small educational or community frontend using mock services and a coherent design system.||Functional journeys, responsive QA, accessibility checklist and code review.||App structure~Organise pages, components and assets;Reusable components~Build consistent navigation, forms and cards;Forms and state~Validate input and communicate status changes;Quality and polish~Test keyboard use, breakpoints and error recovery.
Data Literacy and Responsible Data Use||Interpret information carefully and respect privacy and limitations.||6||Analyse a synthetic dataset, make a chart and write a supported insight with limitations.||Cleaning checklist, chart accuracy and interpretation rubric.||Data in daily life~Distinguish structured and unstructured information;Quality~Find missing values, duplicates and inconsistent formats;Interpretation~Read a chart without overstating its evidence;Ethics and privacy~Use synthetic data and minimise personal details.
Spreadsheets and Practical Analytics||Use formulas, organisation and charts to draw responsible conclusions.||7||Make a tracker with synthetic data, useful formulas, formatting and a chart.||Formula accuracy, data quality and chart interpretation.||Spreadsheet structure~Use cells, ranges and consistent data types;Formulas~Apply SUM, AVERAGE, COUNT and simple conditionals;Analysis~Sort, filter and check for errors;Visualisation~Choose a chart and explain what it does and does not show.
Databases and SQL Foundations||Model relational data and ask practical questions with basic SQL.||8||Design a small course-enrolment database and write queries answering simple questions.||Schema diagram, correct query results and data-safety quiz.||Database concepts~Model entities, records and relationships;Keys and constraints~Use identifiers and foreign-key relationships correctly;SQL querying~Filter, sort and aggregate sample data;Data safety~Use synthetic records and explain permissions and backups.
AI Literacy, Generative AI and Responsible Use||Recognise AI limits, write careful prompts, verify output and protect privacy.||6||Make an AI-assisted learning artefact with a prompt log, independent fact-check and revision notes.||Responsible-use scenarios, output verification and privacy rubric.||AI basics~Distinguish pattern-based outputs from verified facts;Generative systems~Compare text, image, audio and code generation conceptually;Prompting and verification~Specify context and constraints and independently check claims;Responsible use~Avoid private data, disclose assistance where required and inspect bias.
Practical AI Applications and Automation||Apply bounded AI or rules to a problem with tests and human oversight.||8||Prototype an education or productivity helper using mock data and a human review step.||Workflow diagram, test set, failure analysis and demonstration.||Workflow design~Define the trigger, input, steps and intended outcome;AI-assisted task~Use an approved sandbox or mock for a bounded task;Evaluation~Compare outputs with a rubric and try edge cases;Human oversight~Explain when to pause and request a human decision.
Computer Networks and Internet Fundamentals||Understand how devices connect and investigate connectivity safely.||6||Draw a labelled home, classroom or small-office network and a safe troubleshooting checklist.||Diagram rubric and network concepts quiz.||Network basics~Distinguish local network and internet connections;Addressing and DNS~Explain address and name resolution conceptually;Network equipment~Identify a router, switch, modem and access point;Troubleshooting~Check symptoms and connection state before escalating.
Cybersecurity and Digital Safety||Build defensive habits, account protection and safe incident reporting.||7||Audit a fictional account and device setup and make a personal or classroom safety checklist.||Scenario assessment, checklist rubric and safety-critical questions.||Threats and trust~Recognise phishing, malware, impersonation and unsafe downloads;Account protection~Use unique passwords and multifactor authentication where appropriate;Device and data safety~Explain updates, backups and least privilege;Incident response~Stop, preserve relevant evidence and report through an approved channel.
Privacy, Digital Footprints and Online Safety||Protect personal information and recognise unsafe contact and manipulation.||5||Assess fictional online situations and write a privacy plan with safe sharing and reporting steps.||Safety scenario assessment and privacy-plan review.||Personal data~Distinguish public, private and sensitive information;Digital footprints~Explain how audiences and persistence affect sharing;Consent and contact~Practise boundaries and recognise suspicious requests;Support and reporting~Choose a trusted adult or official reporting route for concerns.
Cloud Computing Foundations||Understand remote services, identity, reliability and cost trade-offs.||5||Diagram a learning app with users, frontend, API, database, storage and access boundaries.||Architecture diagram and cloud concepts quiz.||What is cloud~Compare local devices and remote services;Service models~Distinguish hosted software, platforms and infrastructure conceptually;Storage and identity~Describe permissions and shared responsibility;Reliability and cost~Plan backups, limits and monitoring at a high level.
Deployment, Hosting and Operations||Introduce build, release, configuration, monitoring and rollback.||7||Deploy a simple safe project using approved hosting or complete a fully documented simulation.||Deployment evidence, configuration checklist and troubleshooting report.||Build and release~Distinguish development, build, staging and production;Hosting~Publish a static project or follow an approved simulation;Configuration and secrets~Keep credentials out of browser bundles and repositories;Monitoring and rollback~Use logs and plan recovery from a failed change.
Game Design and Interactive Experiences||Use game rules, feedback and playtesting to create a usable interaction.||8||Build a small educational game or interactive story with a clear goal and completion state.||Playability rubric, test notes and design explanation.||Game concepts~Define goals, challenge, rules, feedback and fairness;Interaction and state~Respond to input and update progress or score;Prototype~Make a small playable experience;Playtesting~Gather feedback and improve one confusing moment.
Robotics and Physical Computing Concepts||Model sensors, control logic, outputs and low-voltage safety.||8||Build a simulation or approved-kit prototype such as a light indicator or plant-monitor concept.||System diagram, safe demonstration and input-output logic review.||Physical computing~Describe input, processing and output in a physical system;Sensors and actuators~Compare buttons, light sensors, LEDs and motors;Control logic~Use a condition or threshold to drive an output;Safety and testing~Use approved low-voltage equipment and test incrementally.
Automation and Digital Workflows||Map triggers, conditions, exceptions and safe failure in repeatable tasks.||6||Prototype a learning-task organiser or reminder using synthetic data and an exception path.||Workflow diagram, normal/exception tests and risk review.||Find the task~Identify repetition and a measurable goal;Workflow maps~Describe trigger, condition, action and exception;Build and test~Simulate or implement the rule with approved tools;Reliability and ethics~Add a stop option, monitoring and human review.
Entrepreneurship, Problem Discovery and Product Thinking||Connect technical work to ethical user needs and test assumptions.||6||Create a one-page product concept and test it through a facilitator-approved feedback activity.||Problem statement, value proposition, evidence log and ethical review.||Problem discovery~Describe a user, their need and relevant constraints;Value proposition~Explain who benefits and how the idea helps;Business model basics~Identify costs, revenue possibilities and trust without inventing promises;Validation~Test an assumption and revise the concept.
Communication, Teamwork and Professional Practice||Plan work, communicate clearly, credit contributions and revise from feedback.||5||Create a small project plan with tasks, a README, feedback record and retrospective.||Documentation rubric, collaboration evidence and reflection.||Planning and commitments~Set tasks, milestones and a realistic schedule;Communication~Write concise updates and useful handover notes;Collaboration and feedback~Address disagreement respectfully and improve work;Professional integrity~Credit collaborators and disclose AI assistance when required.
Professional Portfolio and Career Readiness||Present authentic skill evidence privately or publicly with appropriate permissions.||7||Create a portfolio with three evidence items or an age-appropriate private equivalent, each explaining your contribution.||Authenticity, clarity, accessibility, privacy and explanation rubric.||Evidence selection~Choose work that demonstrates real skills;Project storytelling~Describe problem, process, tools, results and lessons;Professional presentation~Create an accessible portfolio or private skills record;Next-step planning~Identify strengths, gaps and realistic next learning goals.
Final Integrated Capstone: Build, Test and Present||Integrate planning, making, testing, safety, documentation and presentation.||16||Build and explain an accessible website, data solution, safe automation, game, media package or physical-computing simulation.||Capstone rubric: problem 10%, functionality 25%, accessibility/design 15%, technical reasoning 15%, testing/revision 15%, safety/privacy 10%, presentation/reflection 10%; minimum 70% and no critical safety failure.||Proposal and planning~Define the problem, audience, scope, milestones and acceptance criteria;Build and document~Create a working artefact and record key decisions;Test and improve~Test requirements, gather feedback and revise;Present and reflect~Show the result, limitations, trade-offs and next steps.
'''.strip().splitlines()
assert len(ROWS) == 44, f'Expected 44 rows, got {len(ROWS)}'

AGE_BASE = {
    'early': 'Use short, supervised activities, pictures, oral explanation and breaks. A facilitator may record a dictated response; never require a public child profile.',
    'junior': 'Use visual examples and checklists, then a short independent task in approved, moderated tools.',
    'teen': 'Invite deeper reasoning and documented decisions; collaboration and publishing remain moderated and privacy-aware.',
    'adult': 'Apply the same competency to a practical study, work or community context with clear documentation.',
}
SAFETY_COURSES = {5, 6, 14, 15, 21, 31, 32, 34, 35, 37, 39, 43, 44}
STAGE_CONTEXTS = [
    ('a fictional classroom routine with picture cards', 'a mock study or workplace task'),
    ('a paper instruction game and an approved coding sandbox', 'a small documented coding exercise'),
    ('a fictional poster or storyboard without identifiable people', 'an accessible campaign concept with cleared assets'),
    ('paper page cards and a supervised offline browser sandbox', 'a fictional service website with accessible components'),
    ('input-output cards and an approved code editor', 'a synthetic-data software tool with tests'),
    ('colour-coded pretend records and simple charts', 'a synthetic-data analysis with clear limitations'),
    ('a printed network map and defensive safety scenarios', 'a fictional team system and safe deployment simulation'),
    ('a paper game, simulation or approved low-voltage kit', 'a controlled prototype with a stop and test plan'),
    ('a private skills scrapbook or small classroom idea', 'a privacy-aware portfolio or practical community proposal'),
]

# Selected higher-fidelity editorial examples for entry, safety and capstone lessons.
# Other modules are structured authoring drafts and need subject expert rewriting.
EDITORIAL_OVERRIDES = {
    (1, 1): (
        'The course map shows the required order, the current lesson and what is locked. Feedback, accessibility settings and support should be easy to find before you start. Exploring an outline is not the same as entering a locked lesson.',
        'Alex opens Course 01 and sees “current”. Course 02 is visible but locked. Alex identifies the first lesson, the help link and a text-size option, then returns to the pathway map without entering any private details.',
        'Find the pathway map and name your current course, its first lesson, a way to ask for help and one display setting. A trusted adult may record a spoken answer.',
    ),
    (1, 2): (
        'A useful learning cycle is: observe an example, practise together, try a small independent step, check the result and revise. A wrong first answer is information for the next attempt, not a reason to skip.',
        'Alex watches a file-naming example, tries one name with help, then names a second practice file. Feedback reveals that the name is vague, so Alex adds a topic and date before trying again.',
        'Describe a time you used an example, tried a step, checked feedback and changed your approach. Use a fictional or non-sensitive task.',
    ),
    (1, 3): (
        'A helpful goal names one action you can repeat, a realistic amount of time and a way to notice progress without competition. Pacing can change without changing the course requirements.',
        'Instead of “learn everything this week”, Alex chooses “practise one lesson for 15 minutes on Tuesday and Friday”. A checkbox records the attempts; a missed day becomes a plan adjustment, not a failure.',
        'Write or dictate one specific practice goal, choose two possible times and explain how you will adjust if a session does not happen.',
    ),
    (1, 4): (
        'Digital wellbeing includes taking breaks, staying comfortable, protecting personal details and seeking support when a task feels confusing or unsafe. Rest is not a shortcut around learning; it helps people continue safely.',
        'After a short practice session, Alex pauses, stretches and checks whether the exercise needs personal information. It does not, so Alex uses a made-up name and asks for a hint instead of sharing real details.',
        'Create a small safety-and-break plan: identify a pause cue, a trusted support route and one thing you will never put into a practice answer.',
    ),
    (5, 3): (
        'A search result is not evidence by itself. Compare who made a claim, when it was published, what evidence is provided and whether independent sources agree. A polished design does not prove accuracy.',
        'Two fictional pages make different claims about a river. Alex checks author, date and cited source, then looks for a third independent source rather than trusting whichever page appears first.',
        'Compare two approved, fictional or public non-sensitive sources. Record author, date, evidence and one claim you would verify independently.',
    ),
    (5, 4): (
        'Suspicious links may imitate a familiar site or use urgency to pressure people into entering a password or downloading a file. Do not test unknown links by opening them; pause, use a known address and ask a trusted adult or appropriate support team.',
        'A pretend “urgent account warning” asks Alex to click a shortened link. Alex does not click. Instead, Alex opens the known service address directly and reports the suspicious message through an approved route.',
        'With a facilitator, analyse a fictional scam message on paper. Identify the urgency cue, the requested action and the safer response. Do not click a real suspicious link.',
    ),
    (34, 1): (
        'Defensive cybersecurity starts by recognising a suspicious request and preserving a safe boundary. This lesson does not teach intrusion, credential harvesting or testing other people’s systems.',
        'A fictional message pretends to be technical support and asks for a password. The learner pauses, compares the sender with an approved channel and reports it without opening attachments.',
        'Mark the warning signs on a printed fictional message. Explain how you would verify the sender and whom you would contact without forwarding private content widely.',
    ),
    (34, 4): (
        'When something unsafe happens, stop the risky action, keep useful evidence without circulating sensitive content and tell an authorised person. Do not investigate somebody else’s account or attempt retaliation.',
        'A learner notices an unfamiliar login notification. In the fictional scenario they stop, use the official account recovery route, contact trusted support and record the time for a responsible report.',
        'Order safe response cards for a fictional account incident: stop, verify via a known route, seek authorised help and document the concern. Explain why clicking unknown links is not a repair step.',
    ),
    (35, 1): (
        'Personal data includes details that identify, contact or locate someone. A harmless-looking combination of school, photo, name and routine can become identifying. Practise with fictional details only.',
        'A sample portfolio card includes a full name, school crest and daily commute. The learner replaces it with a first-name initial, a private skills explanation and no location clues.',
        'Sort fictional examples into public, private and sensitive information. Revise a practice profile so that it shows a skill without identifying a child.',
    ),
    (35, 3): (
        'Consent matters when sharing work, images and contact information. A request for secrecy, personal photos or private conversation from an unknown adult is a reason to stop and speak to a trusted adult or safeguarding contact.',
        'A fictional stranger asks a young creator to move a project discussion into private messages. The safe response is not to reply with details; use the reporting tools and ask a trusted adult.',
        'Role-play a paper-based fictional contact request with a facilitator. Name the boundary, the approved report route and one trusted person who can help.',
    ),
    (44, 1): (
        'A capstone begins with one bounded problem, the people affected, a safe scope and observable acceptance criteria. A smaller tested solution is stronger evidence than an oversized untested promise.',
        'A fictional classroom wants a simple recycling guide. The proposal identifies readers, three needed pages, a keyboard-accessible route, a test plan and a private feedback method—without collecting classmates’ personal information.',
        'Draft a one-page proposal: problem, fictional users, two essential features, an accessibility need, safety/privacy rule and one testable success criterion.',
    ),
    (44, 2): (
        'Build the first usable version and keep a decision log. Record which tools and assets are permitted, what you made yourself and what still needs verification or human input.',
        'The recycling-guide team builds a plain-language first page, adds labelled navigation and records why they used synthetic examples instead of real learner data.',
        'Create or simulate one working slice of your capstone. Record one design decision, its trade-off and any licensed asset or AI assistance.',
    ),
    (44, 3): (
        'Test the capstone against the proposal, not just whether it looks finished. Include normal and edge cases, keyboard/accessibility use, consent and a documented revision after feedback.',
        'A tester cannot reach the guide’s last section by keyboard. The learner logs the step, fixes focus order, repeats the test and notes that a larger assistive-technology review remains necessary.',
        'Write expected versus actual results for two checks, including accessibility or safety. Revise one observed problem and explain what remains untested.',
    ),
    (44, 4): (
        'A responsible presentation explains the problem, what works, what failed and changed, safety and accessibility choices, and honest limitations. Do not claim production impact or expose child data.',
        'The learner shows a fictional user journey, a test record and a before-and-after improvement. They explain one limitation and ask for specific feedback rather than claiming that the project is certified.',
        'Prepare a private or approved presentation of your artefact, test evidence, one revision, privacy choices and next steps. A facilitator may record an oral presentation.',
    ),
}

# Introductory, illustrative questions. They are draft checks, NOT validated exam items.
def check_for(module_title, focus, course_title, safety, slot):
    question = f'Which action best supports the goal of “{module_title.lower()}” in {course_title}?'
    correct = focus.rstrip('.') + '.'
    wrong_one = 'Skip the example and assume the first attempt is always correct.'
    wrong_two = 'Share private information to prove the task was completed.' if safety else 'Avoid testing or explaining the result.'
    options = [wrong_one, wrong_two]
    correct_index = slot % 3
    options.insert(correct_index, correct)
    return {
        'question': question,
        'options': options,
        'correct': correct_index,
        'explanation': f'The relevant action is to {focus[0].lower() + focus[1:].rstrip(".")}. Explain it using a safe example and verify your result.',
        'safetyCritical': safety and module_title.lower() in {'digital citizenship','misinformation and scams','licensing','accessibility and rights','reputation and privacy','repository hygiene','responsible use','human oversight','threats and trust','account protection','incident response','personal data','consent and contact','support and reporting','configuration and secrets','safety and testing','professional presentation','present and reflect'},
    }

out = []
for i, row in enumerate(ROWS, 1):
    parts = row.split('||')
    assert len(parts) == 6, (i, len(parts))
    title, purpose, hours, project, assessment, modules_text = parts
    modules = []
    for j, item in enumerate(modules_text.split(';'), 1):
        module_title, focus = item.split('~', 1)
        lesson_id = f'c{i:02d}-l{j}'
        example = (
            'Imagine a fictional version of this course project. '
            f'The learner starts with {module_title.lower()}: {focus[0].lower() + focus[1:].rstrip(".")}. '
            'They make one small attempt, compare it with the goal and explain what they would change.'
        )
        practice = f'Use an approved tool, drawing or verbal explanation to demonstrate this step: {focus}. Record one choice you made and one thing you would check.'
        modules.append({
            'id': f'c{i:02d}-m{j}',
            'title': module_title,
            'focus': focus,
            'lessons': [{
                'id': lesson_id,
                'title': module_title,
                'minutes': max(12, round(int(hours) * 60 / 4 / 3)),
                'objective': focus,
                'explanation': f'{module_title} is part of {title.lower()}. {focus}. Start with the smallest safe example and connect each step to the project outcome.',
                'workedExample': example,
                'guidedPractice': f'With a facilitator or the on-screen checklist, try one example: {focus}. Ask what should happen before you continue.',
                'independentPractice': practice,
                'check': check_for(module_title, focus, title, i in SAFETY_COURSES, i + j),
            }],
        })
        if (i, j) in EDITORIAL_OVERRIDES:
            explanation, worked, independent = EDITORIAL_OVERRIDES[(i, j)]
            modules[-1]['lessons'][0].update({
                'explanation': explanation,
                'workedExample': worked,
                'independentPractice': independent,
            })
    assert len(modules) == 4, (i, len(modules))
    stage_index = next(n for n, (start, end, _, _) in enumerate(STAGES) if start <= i <= end)
    stage = STAGES[stage_index][2]
    early_context, adult_context = STAGE_CONTEXTS[stage_index]
    intro = 'Use a fictional or supervised scenario and do not share identifying details.' if i in SAFETY_COURSES else 'Use familiar objects, pictures and a facilitator-guided example.'
    age = {**AGE_BASE,
        'early': AGE_BASE['early'] + f' Use {early_context} to explore {modules[0]["title"].lower()} and explain a small result. ' + intro,
        'junior': AGE_BASE['junior'] + f' For this course, practise with {modules[0]["title"].lower()} before making the project.',
        'teen': AGE_BASE['teen'] + f' Explain decisions about {modules[2]["title"].lower()} in your own words.',
        'adult': AGE_BASE['adult'] + f' Apply the final module to {adult_context} and document how {modules[-1]["title"].lower()} improves your result.',
    }
    slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    out.append({
        'id': f'course-{i:02d}', 'number': i, 'slug': slug, 'version': 'draft-1',
        'stage': stage, 'title': title, 'purpose': purpose, 'guidedHours': int(hours),
        'outcomes': [m['focus'] for m in modules],
        'project': {'brief': project, 'requiredEvidence': ['A described or linked project artefact (text-only preview; no uploads)', 'A short explanation of choices and testing', 'A privacy and safety self-check']},
        'assessment': assessment, 'ageAdaptation': age,
        'safetyCritical': i in SAFETY_COURSES,
        'modules': modules,
        'reviewStatus': 'Curriculum authoring draft; subject-matter, age-safety and accessibility review required',
    })

payload = {'version': 'draft-1', 'status': 'UNREVIEWED curriculum content and sample checks; not an accredited programme', 'stages': [{'number': n+1, 'title': name, 'subtitle': description, 'first': start, 'last': end} for n, (start,end,name,description) in enumerate(STAGES)], 'scaffoldingContexts': [{'stage': name, 'early': STAGE_CONTEXTS[n][0], 'adult': STAGE_CONTEXTS[n][1]} for n, (_, _, name, _) in enumerate(STAGES)], 'courses': out}
path = Path(__file__).resolve().parent.parent / 'src/curriculum/master.json'
path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
print(f'Wrote {len(out)} ordered courses, {sum(len(c["modules"]) for c in out)} modules and {sum(len(m["lessons"]) for c in out for m in c["modules"])} lesson drafts: {path}')
