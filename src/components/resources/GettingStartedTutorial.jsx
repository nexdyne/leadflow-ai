import React from 'react';
import ResourcePageLayout, { H2, H3, P, UL, LI, Callout, Table, Code } from './ResourcePageLayout';
import { RESOURCE_BY_SLUG } from './_resourceTheme';

// /resources/getting-started
// Walk-through tutorial that describes the real screens and tab names
// in the current LeadFlow AI build. Sourced from App.jsx tabs list and
// the ProjectDashboard view states so inspectors can follow along in
// the product.
export default function GettingStartedTutorial() {
  const resource = RESOURCE_BY_SLUG['getting-started'];

  return (
    <ResourcePageLayout resource={resource}>
      <P>
        This walkthrough takes a new inspector from signing up to handing over a finished Michigan LIRA report.
        It follows the actual screens in LeadFlow AI as of April 2026, so you can open the app in a second tab
        and do the steps in parallel. No part of this flow requires installing software or a credit card; the
        preview is free.
      </P>

      <Callout tone="info" title="What you'll need before starting">
        Your Michigan certification number (Lead Inspector / Risk Assessor), your XRF analyzer's serial number
        and source date, and a working email address. A test project can be completed end-to-end using the
        built-in sample data if you don't have a live job in hand.
      </Callout>

      <H2>Step 1 — Create your account</H2>

      <P>
        Open <Code>abatecomply.com</Code> and click <strong>Start free</strong> in the header. You will land on
        the registration form. Enter your work email, a strong password, and your full name as it should appear
        on signed reports. If your firm already has a LeadFlow AI team, an existing admin can send you an invite
        instead — check your email for an invitation link before registering a brand-new account, since accepting
        an invite automatically puts you on your firm's team.
      </P>

      <P>
        After registering you will be prompted to verify your email address. Open the verification email (check
        spam if it doesn't arrive within a minute) and click the verification link. Your account is now active
        and you are signed in at the Project Dashboard.
      </P>

      <H2>Step 2 — Complete your inspector profile</H2>

      <P>
        Your certification metadata appears on every signed report, so fill it out once and completely. From
        the Project Dashboard, click the notification bell in the top-right to confirm messaging is working,
        then click <strong>Dashboard</strong> and look for the user management entry. Inside your user record,
        enter:
      </P>

      <UL>
        <LI>Your Michigan Lead Inspector or Risk Assessor certification number</LI>
        <LI>Certification issue and expiration dates</LI>
        <LI>Your signature image (captured in the Signatures tab during a project, or uploaded here)</LI>
        <LI>Your firm name and license number if different from the account's organization</LI>
      </UL>

      <Callout tone="warning" title="The signed statement depends on this">
        Every LeadFlow AI report ends with a signed statement of accuracy that pulls your name, certification
        number, and signature from your profile. If these are missing, the generated report will show a
        placeholder and fail regulator review. Fill this in before generating your first real report.
      </Callout>

      <H2>Step 3 — Invite your team</H2>

      <P>
        If you work with other inspectors, a project manager, or a clerical staff member, bring them onto the
        platform now. From the Dashboard, click <strong>Manage Teams</strong> (or the link in your organization's
        admin panel). Invite team members by email with the appropriate role:
      </P>

      <Table
        caption="Roles are enforced across the app — a viewer cannot save changes, for example."
        rows={[
          ['Role', 'Can do', 'Cannot do'],
          ['Admin', 'Everything — projects, users, billing, team settings', '—'],
          ['Inspector', 'Create and edit projects, upload photos, generate reports', 'Change billing, invite users'],
          ['Viewer', 'Open projects read-only, download finished reports', 'Edit anything, generate reports'],
          ['Client', 'See projects shared with them via invite link, exchange messages', 'Edit inspector content'],
        ]}
      />

      <P>
        Invitees receive an email with a secure invite link. Clicking the link walks them through account
        creation and auto-joins them to your team.
      </P>

      <H2>Step 4 — Add a client (optional)</H2>

      <P>
        If you want to share a project with the property owner or tenant for transparency, click
        <strong> Manage Clients</strong> from the Dashboard and add the client's name and email. You can share
        a specific project with them later from the project record. Clients do not see each other's projects or
        any of your firm's internal data.
      </P>

      <H2>Step 5 — Create your first project</H2>

      <P>
        On the Project Dashboard click <strong>New Project</strong>. You will drop into the inspection editor
        with the first tab — <strong>Project Info</strong> — open. Fill in:
      </P>

      <UL>
        <LI><strong>Project Name</strong> — a short descriptive name. This is what appears in "My Projects" on
          the dashboard.</LI>
        <LI><strong>Property Address</strong> — street, city, ZIP. The MI Registry tab later pulls Michigan
          property data from this address.</LI>
        <LI><strong>Year Built</strong> — critical for the pre-1978 trigger. Sources include the Michigan
          Registry lookup (covered in Step 10) or your county assessor's records.</LI>
        <LI><strong>Client / owner name and contact</strong></LI>
        <LI><strong>Type of service</strong> — Lead Inspection, Risk Assessment, combined LIRA, Clearance, or
          EBL Investigation. The system uses this to scope required tabs and sections of the final report.</LI>
        <LI><strong>Date of site visit</strong></LI>
      </UL>

      <P>
        Click <strong>Save Progress</strong> at any time — the button saves locally to your browser and to the
        cloud so your work is persisted whether you have connectivity or not. The status line under the button
        shows both "Saved locally" and "Cloud-synced" timestamps. You can also use <strong>Save &amp; Next
        Tab →</strong> to advance while saving in one motion.
      </P>

      <Callout tone="info" title="Autosave is always on">
        In addition to the Save Progress button, LeadFlow AI auto-saves every 2 seconds of inactivity. The
        status line at the top of the header shows "Saved at HH:MM" in green. If the app ever loses connection,
        your local save is preserved and will sync to the cloud when you reconnect.
      </Callout>

      <H2>Step 6 — XRF Data</H2>

      <P>
        Click the <strong>XRF Data</strong> tab. This is where you record every XRF reading from the site. The
        tab supports both manual entry and CSV import from common analyzers (Niton, Radek, Viken). For each
        reading, capture:
      </P>

      <UL>
        <LI>Room equivalent (e.g., "Bedroom 1")</LI>
        <LI>Component (wall, door, window frame, trim, floor, etc.)</LI>
        <LI>Substrate (wood, drywall, metal, concrete, brick)</LI>
        <LI>Color layer being tested</LI>
        <LI>Raw XRF reading in mg/cm²</LI>
        <LI>Substrate correction and corrected reading (auto-filled from the PCS you select at project setup)</LI>
      </UL>

      <P>
        Inconclusive readings are automatically flagged with a yellow indicator and you will be prompted to
        resolve them (via re-read or paint-chip sample) before you can generate a final report. See the
        <Code> XRF Testing Best Practices </Code>resource for the technical background on inconclusives.
      </P>

      <H2>Step 7 — Lab Results</H2>

      <P>
        Click the <strong>Lab Results</strong> tab to enter dust-wipe and paint-chip results from your
        NLLAP-recognized lab. For each result:
      </P>

      <UL>
        <LI>Sample ID and collection location (room, surface, position within the surface)</LI>
        <LI>Sample type (floor wipe, sill wipe, trough wipe, paint chip, soil)</LI>
        <LI>Analytical result and units (µg/ft², mg/kg, % by weight)</LI>
        <LI>Laboratory name and report date</LI>
        <LI>Laboratory's reliable detection limit for the analyte</LI>
      </UL>

      <P>
        If your lab supplies a PDF analytical report, use the <strong>Lab PDF Import</strong> tab to upload it
        — LeadFlow AI's parser extracts the result table and pre-fills the Lab Results grid, which you then
        verify. The raw PDF is attached as an appendix on report generation.
      </P>

      <H2>Step 8 — Hazard Analysis</H2>

      <P>
        The <strong>Hazard Analysis</strong> tab is where the dust, soil, and painted-surface results combine
        into a hazard determination for each component. LeadFlow AI applies the post–January 2025 federal
        hazard standard — any reportable dust on a floor or interior sill is a hazard — and flags borderline
        results so you can make the final professional call. The tab's "Thresholds in effect" banner at the
        top shows which rule version you are classifying against; click it to jump to the full Thresholds tab.
      </P>

      <H2>Step 9 — Photos, Building Survey, and Resident Interview</H2>

      <P>
        These three tabs collect the contextual information regulators expect in a hazard-quality report:
      </P>

      <UL>
        <LI><strong>Photos</strong> — upload or drag in photographs of each tested component, deteriorated
          area, and site condition. The <strong>AI Photo Tags</strong> tab can pre-suggest captions and
          groupings; you review and correct them before they attach to the report.</LI>
        <LI><strong>Building Survey</strong> — structural observations, construction year evidence, window
          and door inventory, painted-component inventory at room-equivalent level.</LI>
        <LI><strong>Resident Interview</strong> — EBL-case-relevant questions about children under six,
          behavioral history, past hazard control work. This is required content for an EBL environmental
          investigation under MCL 333.5474a.</LI>
      </UL>

      <H2>Step 10 — Floor Plans and Property Records</H2>

      <P>
        Use the <strong>Floor Plans</strong> tab to sketch a room-equivalent-level diagram of the property;
        drop your testing locations and wipe-sample locations onto the drawing. The sketch is embedded in the
        final report in place of a hand-drawn version.
      </P>

      <P>
        The <strong>Property Records</strong> tab pulls county assessor records for the property address,
        confirming year built, owner of record, and parcel information that often ends up in the report's
        header. The <strong>MI Registry</strong> tab queries Michigan-specific property data where available.
      </P>

      <H2>Step 11 — Signatures</H2>

      <P>
        The <strong>Signatures</strong> tab captures the certified individual's signature and, where relevant,
        the property owner's or occupant's acknowledgment. Draw with a mouse, touchscreen, or stylus; click
        save. The signature flows into the report's signed statement block along with your name and
        certification number.
      </P>

      <H2>Step 12 — AI Report Writer and QA Review</H2>

      <P>
        The <strong>AI Report Writer</strong> tab synthesizes your tab-by-tab data into narrative report
        sections — Executive Summary, Methodology, Findings, Hazard Control Recommendations. The output is a
        draft you edit, not a finished report. Review every paragraph; regulator-facing language needs your
        professional judgment.
      </P>

      <P>
        The <strong>QA Review</strong> tab runs an automated pre-flight check: missing certification metadata,
        unresolved XRF inconclusives, missing lab detection limits, unsigned statements, photos without
        captions. Every flagged item links to the tab where you fix it. Clear the QA list before proceeding.
      </P>

      <H2>Step 13 — Generate the report</H2>

      <P>
        Click the <strong>Generate Report</strong> tab. Select the output format (DOCX for client-facing,
        PDF for archive). Pick your cover-page template. Click <strong>Generate</strong>. The system produces
        a compliant Michigan LIRA (or risk assessment, or clearance) report in about 30 seconds and drops it
        in your project file.
      </P>

      <P>
        The generated report includes: title page; property and scope information; methodology; XRF log with
        substrate corrections; dust-wipe and soil results with lab detection limits; hazard determinations per
        component; hazard control recommendations; photos; floor plan sketch; QC logs; appendices (lab PDF,
        certification copies). The signed statement of accuracy at the end pulls your name, certification
        number, and signature from your profile.
      </P>

      <H2>Step 14 — Share with the client</H2>

      <P>
        Back on the Project Dashboard, find your project row and click <strong>Share</strong>. Enter the
        client's email; the system generates a secure invite link and emails it. The client creates an account
        (one-click if they have the link) and lands in a client portal that shows only the projects shared
        with them. They can read the report, ask questions via the built-in messaging, and download the final
        PDF. Nothing in your firm's internal workspace is visible to them.
      </P>

      <Callout tone="success" title="What to expect on your first real job">
        Inspectors generally report that their first LeadFlow AI project takes roughly the same time as their
        prior manual workflow, because learning the tabs has a cost. The second project is 30–40% faster;
        the fifth is 60% faster. The biggest time savings come from Lab PDF Import (no more hand-keying wipe
        results), the AI Report Writer (no more typing the same methodology paragraph), and never having to
        hunt for your certification number or signature image again.
      </Callout>

      <H2>Troubleshooting quick reference</H2>

      <Table
        caption="If a step is not described here, contact support via the Support tab on the main site."
        rows={[
          ['Symptom', 'Likely cause', 'Fix'],
          ['Save button stays disabled', 'Save already in flight', 'Wait 1–2 seconds; the button re-enables when the cloud save completes'],
          ['"Cloud sync failed" in status line', 'Network blip', 'Click Save Progress again; local save is preserved, cloud will catch up'],
          ['Report generation blocked by QA Review', 'Unresolved flags', 'Open QA Review tab, click each flag to jump to the offending tab, resolve'],
          ['Email verification link expired', 'Link older than 24 hours', 'Request a new verification from the login screen'],
          ['Client did not receive invite', 'Invite email in spam', 'Ask client to check spam / promotions; you can also copy the link from the Share modal'],
          ['XRF reading flagged inconclusive', 'Reading in PCS inconclusive range', 'Re-read on the same spot, or collect a paint chip and log the substitution'],
        ]}
      />

      <H2>Next steps</H2>

      <P>
        Once you are comfortable with the standard flow, explore the advanced features: the
        <strong> Thresholds </strong>tab for per-project threshold overrides (rare but useful for
        pre-2025-referencing legacy jobs), the <strong>Compliance</strong> tab for a live checklist against
        Michigan rule citations, and the <strong>Assumed Positives</strong> tab for documenting
        presumption-of-positive components per R 325.99305(1). The Resources section of this site has
        companion pages on Michigan LIRA compliance, XRF best practices, and the EPA RRP rule.
      </P>

      <Callout tone="info" title="Getting help">
        Every page of the product has a support link that opens a ticket directly with our team. Response
        time is typically under one business day during the preview. If you find a bug or something feels
        off, the "Report a bug" option in the support form puts it straight into our triage queue.
      </Callout>
    </ResourcePageLayout>
  );
}
