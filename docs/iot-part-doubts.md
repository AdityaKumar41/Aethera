I’ll answer this only from the installer’s point of view, step by step, and explain where IoT fits, when data starts coming, and what is mandatory vs optional.

No buzzwords. No blockchain talk unless needed.

Installer’s View: Project Creation → IoT → Revenue → Yield
1️⃣ As an installer, what do I do FIRST?
Step 1: Create a project (NO IoT yet)

When an installer creates a project, they do NOT need IoT immediately.

At this stage, the project is:

A proposal

A financial plan

A future asset

Installer submits:

Project details (capacity, location, cost)

Expected production (forecast)

Timeline

Milestones

📌 Important:
👉 IoT is NOT required at project creation

Why?

The plant does not exist yet

No data can be generated yet

2️⃣ When does IoT actually matter?
IoT starts mattering ONLY after construction

There are 3 clear phases:

Phase	IoT Required?	Why
Project proposal	❌ No	Nothing exists
Construction	🟡 Optional	Proof of progress
Operational	✅ YES	Yield depends on data

This separation is critical.

3️⃣ How IoT fits into milestone-based funding

Let’s align this with milestones.

Example milestones:

Equipment purchased

Installation complete

Grid connected

Commissioned (START of IoT)

Operational (continuous IoT)

👉 IoT becomes mandatory at Milestone 4

4️⃣ What EXACTLY does installer do for IoT?
Step-by-step from installer side
🔹 Step A — Choose IoT integration mode

You give installer clear options:

Option 1: Aethera Device Agent (recommended)

Installer installs your software on:

Gateway device

Or supported inverter

You control signing & data format

Option 2: Approved third-party device

Must meet:

Signing requirements

API standards

Less preferred, more checks

Option 3: Manual reporting (temporary fallback)

Allowed only:

For early pilots

With strict limits

Lower trust score

🔹 Step B — Device registration (THIS IS KEY)

Before any data is accepted:

Installer must:

Register device in Aethera dashboard

Link device → project

What happens:

Device ID created

Cryptographic key issued

Device status = PENDING

No registration → no data accepted

🔹 Step C — Go live at commissioning

When milestone = Commissioned:

Installer:

Turns on solar plant

Activates IoT device / agent

From now on:

Data starts flowing automatically

Manual uploads are disabled

5️⃣ Where does the IoT data go?

Here is the exact path:

Solar Meter / Inverter
        ↓
Aethera Device Agent
        ↓
Signed Data Payload
        ↓
Aethera Ingestion API
        ↓
Oracle Verification
        ↓
Production Database
        ↓
Blockchain Commitment (periodic)


Installer does not touch data after this.

6️⃣ What data is expected from installer’s IoT?

Installer does NOT decide this freely.

You define a minimum required dataset:

Timestamp

Energy produced (kWh)

Device ID

Status (online/offline)

Optional extras:

Voltage

Temperature

Fault codes

If installer does not provide minimum data:

Yield = paused

7️⃣ What happens if installer delays or avoids IoT?

This is very important for enforcement.

Case 1: IoT not installed after commissioning

Project status = ACTIVE_PENDING_DATA

Yield distribution = blocked

Investor dashboard shows “Data missing”

Case 2: IoT installed but data inconsistent

Oracle flags anomaly

Project enters DISPUTED

Payments paused

Case 3: Installer refuses IoT

Project suspended

Governance or admin action

👉 IoT is mandatory for yield, not for fundraising.

8️⃣ How installer benefits from IoT (not just investors)

This is important for adoption.

Installer benefits:

Faster milestone verification

Faster fund release

Higher trust score

Lower financing cost in future projects

Over time:

Installers with good IoT data raise money faster & cheaper.

9️⃣ One clean mental model (remember this)

Installer raises money on forecasts,
but gets paid based on verified reality.

Forecast → used for fundraising

IoT data → used for yield & trust

They serve different purposes.

🔟 One sentence answer to your question

As an installer, I create the project first without IoT, but once the plant is commissioned, I must integrate approved IoT so real production data flows automatically — only then do investors start earning yield.

That’s it. Clean. Logical. Defensible.