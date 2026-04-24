import React from 'react';
import ResourcePageLayout, { H2, H3, P, UL, LI, Callout, Table, Code } from './ResourcePageLayout';
import { RESOURCE_BY_SLUG } from './_resourceTheme';

// /resources/michigan-lira-2026
// Authoritative reference page on Michigan LIRA compliance. Targets a
// working inspector or lead supervisor who needs to understand what a
// lead inspection, risk assessment, and clearance actually require
// under the current EGLE + EPA regime. Content is written for Apr 2026
// and should be re-reviewed when EGLE or EPA next issues guidance.
export default function MichiganLIRAGuide() {
  const resource = RESOURCE_BY_SLUG['michigan-lira-2026'];

  return (
    <ResourcePageLayout resource={resource}>
      <P>
        Michigan's lead hazard control regime is layered: a federal floor set by EPA under the Toxic Substances
        Control Act (TSCA) sections 402 and 406, a separate federal framework for federally-assisted housing under
        HUD 24 CFR Part 35, and a state overlay administered by the Michigan Department of Environment, Great Lakes,
        and Energy (EGLE) under the Lead Abatement Act, Part 551 of the Public Health Code (MCL 333.5451 et seq.),
        and its implementing rules at Mich. Admin. Code R 325.99101 through R 325.99910. Every inspector working in
        a pre-1978 Michigan property operates inside that stack.
      </P>

      <P>
        This guide walks through what a <strong>lead inspection</strong>, a <strong>risk assessment</strong>, and
        a <strong>clearance examination</strong> are under Michigan rules — how they differ, who can perform them,
        what sampling is required, what thresholds apply, and how a report must be written and retained. It reflects
        the regulatory landscape as of April 2026, including the January 2025 EPA rule that lowered the dust-lead
        hazard identification standard to the detectable level.
      </P>

      <Callout tone="warning" title="Who this guide is for">
        Michigan Certified Lead Inspectors, Risk Assessors, and Supervisors performing work under Part 551. Abatement
        Contractors will find the clearance section directly relevant; Renovators working under the EPA RRP Rule
        should read the companion <Code>EPA Lead Paint RRP Rule Updates</Code> resource — RRP renovations are not
        abatement and do not require a LIRA-style report.
      </Callout>

      <H2>1. The three services defined by Part 551</H2>

      <P>
        Part 551 distinguishes three lead-related evaluations, each with a distinct purpose, method, and credential
        requirement. Inspectors routinely blur them in conversation; EGLE does not.
      </P>

      <H3>Lead Inspection</H3>
      <P>
        A surface-by-surface investigation to determine the presence of lead-based paint (LBP). Its output is a
        presence/absence determination for every painted surface tested, typically via X-ray fluorescence (XRF).
        A lead inspection does not, by itself, identify hazards — only whether lead-based paint exists. Under
        R 325.99110, a lead inspection must be performed by a Michigan Certified Lead Inspector or Risk Assessor.
      </P>

      <H3>Risk Assessment</H3>
      <P>
        An on-site investigation to identify lead-based paint <em>hazards</em>: deteriorated LBP, lead-contaminated
        dust, lead-contaminated soil, and friction or impact surfaces that are likely to create hazards. A risk
        assessment synthesizes a visual inspection, dust wipe sampling, and sometimes soil sampling, and produces
        written hazard control options. Only a Michigan Certified Risk Assessor can sign a risk assessment report.
        Risk assessments are the predicate document for most EBL (elevated blood-lead) response work ordered by
        local health departments under MCL 333.5474a.
      </P>

      <H3>Clearance Examination</H3>
      <P>
        A post-abatement or post-renovation evaluation confirming the work area is safe for reoccupancy. Clearance
        combines visual verification that all debris and dust have been removed with dust wipe sampling against
        numeric clearance levels. Clearance may be performed by a Certified Risk Assessor, Lead Inspector, or
        Lead Project Designer who was not employed by the abatement contractor on the same project — the
        independence rule at R 325.99110(5) prevents the abater from self-clearing their own work.
      </P>

      <Callout tone="info" title="Practical takeaway">
        If a client asks you to "test the house for lead," you need to clarify whether they want LBP presence
        (inspection), hazard identification for an occupied home (risk assessment), or reoccupancy clearance after
        an abatement job. The three reports look different and the certifications required to sign them differ.
      </Callout>

      <H2>2. Combined Lead Inspection / Risk Assessment (LIRA)</H2>

      <P>
        Most Michigan pre-1978 inspections for HUD-assisted housing, EBL response, and state-mandated evaluations
        are delivered as a combined Lead Inspection and Risk Assessment — a LIRA — because it answers both
        "is there lead-based paint?" and "are there lead hazards requiring control?" in a single site visit. The
        combined report has become the de facto standard in Michigan and is what EGLE and most local health
        departments expect to see when they request lead documentation.
      </P>

      <P>
        A Michigan-compliant LIRA report must include at minimum the elements below. The list derives from
        R 325.99910 (reporting requirements), HUD's Lead Safe Housing Rule at 24 CFR 35.1320, and the sections
        of 40 CFR 745 Subpart L that Michigan incorporates by reference.
      </P>

      <Table
        caption="Source: R 325.99910; 24 CFR 35.1320; 40 CFR 745.227."
        rows={[
          ['Report element', 'Where it comes from'],
          ['Identification of the certified individual(s) who performed the work and their certification numbers', 'R 325.99910(2)(a)'],
          ['Property address, age of the dwelling, and date(s) of the site visit', 'R 325.99910(2)(b)'],
          ['Scope: whether inspection, risk assessment, or both', 'R 325.99910(2)(c)'],
          ['Complete list of testing combinations (component, substrate, color, location)', '24 CFR 35.1320(b)(3); 40 CFR 745.227(b)'],
          ['XRF readings with substrate corrections applied, or paint-chip lab results with detection limits', '40 CFR 745.227(b); ASTM E1828'],
          ['Dust wipe results reported in µg/ft², with the laboratory analytical report attached', '40 CFR 745.227(d)'],
          ['Visual condition of painted surfaces using the deteriorated / intact / damaged scheme', 'R 325.99305'],
          ['Hazard determination for each tested component (LBP hazard / no hazard)', '40 CFR 745.65; EPA Jan 2025 amendment'],
          ['Hazard control options ranked by effectiveness and cost, if a risk assessment was performed', '24 CFR 35.1320(b)(7)'],
          ['A signed statement by the certified individual that the report is accurate', 'R 325.99910(3)'],
        ]}
      />

      <H2>3. Current identification thresholds (post–January 2025 EPA rule)</H2>

      <P>
        EPA's January 2025 amendment to 40 CFR 745.65 lowered the dust-lead hazard identification standards to the
        reliable detection limit — sometimes called "any reportable level" — for floors and interior window sills.
        Michigan adopts the federal hazard definitions under R 325.99305, so the new thresholds apply to Michigan
        risk assessments performed after the federal effective date.
      </P>

      <Table
        caption="Sources: 40 CFR 745.65 (as amended Jan 2025); 40 CFR 745.227(e); HUD 24 CFR 35.1320 clearance column."
        rows={[
          ['Medium / surface', 'Hazard identification (risk assessment)', 'Clearance (post-abatement)'],
          ['Floors, interior', 'Any reportable level (detection limit)', '5 µg/ft²'],
          ['Interior window sills', 'Any reportable level (detection limit)', '40 µg/ft²'],
          ['Window troughs', '(not a hazard metric post-2025)', '100 µg/ft²'],
          ['Bare soil, play areas', '400 ppm', '400 ppm'],
          ['Bare soil, rest of yard', '1,200 ppm average', '1,200 ppm'],
          ['Paint (LBP definition)', '1.0 mg/cm² or 0.5% by weight', '—'],
        ]}
      />

      <Callout tone="danger" title="The January 2025 shift matters">
        Pre-2025, a floor dust wipe reporting 9 µg/ft² produced a "no hazard" finding. Under the amended rule, any
        reportable dust-lead on a floor or sill constitutes a hazard and must be controlled. This is the single
        biggest practical change in hazard assessment this decade and your risk assessment reports must reflect it.
        Clearance numbers (5, 40, 100 µg/ft²) were not lowered — only the hazard identification column.
      </Callout>

      <H2>4. Sampling design: how many, and where</H2>

      <P>
        A Michigan LIRA uses XRF for paint testing and dust wipes for hazard identification. The sampling design
        is prescribed by HUD and EPA methodology and reinforced by EGLE's reporting rule.
      </P>

      <H3>XRF painted-surface testing</H3>
      <P>
        Every distinct testing combination — a unique combination of component, substrate, color, and room
        equivalent — must be tested. HUD's <em>Guidelines for the Evaluation and Control of Lead-Based Paint
        Hazards in Housing</em>, Chapter 7, and 40 CFR 745.227(b) require a systematic inventory: list every
        room equivalent, then for each room list every painted component (walls, ceilings, trim, doors, door
        frames, windows, window frames, floors, stairs), sample one reading per component unless a component
        spans multiple colors or substrates, and record the raw XRF reading plus the substrate-corrected result.
      </P>

      <H3>Dust wipes</H3>
      <P>
        At least one floor and one interior window sill wipe must be collected per room that is visually or
        functionally distinct (kitchen, each bathroom, each bedroom, living/dining, plus common halls). High-use
        rooms (kitchen and rooms used by children under six) warrant additional wipes. Every wipe is lab-analyzed
        by an NLLAP-recognized laboratory reporting in µg/ft² after area conversion. Include the lab's analytical
        report as an appendix — regulators routinely check that the detection limit is below the relevant hazard
        or clearance threshold.
      </P>

      <H3>Soil sampling</H3>
      <P>
        Collect composite soil samples from bare areas in the dripline, play areas, and side/rear yard if the
        scope includes risk assessment. Sample only bare soil; mulched or grass-covered areas are not sampled.
        Results are reported in mg/kg (equivalent to ppm) against the 400 ppm (play) / 1,200 ppm (other) hazard
        thresholds.
      </P>

      <H2>5. Assumed lead-based paint</H2>

      <P>
        R 325.99305(1) and 40 CFR 745.227(b)(1) allow a presumption of LBP for components that cannot be tested
        or for untested components in pre-1978 housing. Many Michigan inspectors adopt a presumption-of-positive
        strategy for exterior components (eaves, soffits, rakes) where XRF testing is impractical due to ladder
        access. Assumed LBP components must be listed explicitly in the report with the basis for the assumption
        noted. Assumed-positive components are hazards if they are deteriorated; they are not hazards if intact.
      </P>

      <H2>6. Clearance after abatement or interim controls</H2>

      <P>
        When abatement is performed under a Michigan-certified Abatement Contractor, clearance by an independent
        Certified Risk Assessor, Lead Inspector, or Lead Project Designer is mandatory before reoccupancy. The
        clearance protocol is laid out at R 325.99402 and 40 CFR 745.227(e):
      </P>

      <UL>
        <LI><strong>Visual clearance first</strong> — the examiner confirms no visible dust, debris, paint chips,
          or residue in the work area. Failing visual clearance stops the process; re-clean and re-examine.</LI>
        <LI><strong>Dust wipe sampling</strong> — one floor wipe per room, one interior window sill wipe per
          room with a window, and one window trough wipe per window (if the window was abated). Use the
          HUD-specified random location selection pattern.</LI>
        <LI><strong>Results below clearance levels</strong> — 5 µg/ft² floors, 40 µg/ft² sills, 100 µg/ft²
          troughs. If any wipe exceeds, the abatement contractor must re-clean, and the affected rooms are
          re-sampled after cleaning.</LI>
        <LI><strong>Written clearance report</strong> — issued by the independent clearance examiner, with the
          lab report attached. The abatement is not complete until clearance is passed and documented.</LI>
      </UL>

      <H2>7. EBL (Elevated Blood Lead) environmental investigations</H2>

      <P>
        When a child under six registers a venous blood-lead level at or above CDC's blood-lead reference value
        (currently 3.5 µg/dL), the local health department is authorized under MCL 333.5474a to require an
        environmental investigation at the child's primary residence. These investigations are Part 551 risk
        assessments with an expedited scope: they must be completed within 45 days of LHD referral, must identify
        any dust-lead, soil-lead, or deteriorated LBP hazard, and must generate hazard control options. EBL
        investigations are the most common trigger for an independent Michigan risk assessor to enter a home.
      </P>

      <Callout tone="info" title="Reference value history">
        CDC's blood lead reference value was 5.0 µg/dL from 2012 to 2021, and was lowered to 3.5 µg/dL in
        October 2021. Michigan's statute references "elevated blood lead level" without pinning a number, so the
        triggering threshold changes when CDC moves. Always confirm the current reference value before accepting
        an EBL-case scope.
      </Callout>

      <H2>8. Certification, renewal, and CE</H2>

      <P>
        EGLE's Lead Abatement Program issues four Michigan certifications: Lead Inspector, Risk Assessor,
        Supervisor, and Worker. A Lead Project Designer credential exists at the federal level (40 CFR 745.226)
        but Michigan issues it under its Supervisor certification in practice. Each certification:
      </P>

      <UL>
        <LI>Requires successful completion of an EGLE-accredited initial training course (typically 24 hours for
          Risk Assessor on top of the Inspector prerequisite; 32 hours for Supervisor)</LI>
        <LI>Requires passing a discipline-specific third-party certification exam</LI>
        <LI>Is valid for three years</LI>
        <LI>Requires an EGLE-accredited refresher course prior to the expiration date (typically 8 hours)</LI>
        <LI>Requires continuous compliance with the work-practice rules at R 325.99301 through R 325.99411</LI>
      </UL>

      <P>
        Certification numbers must appear on every signed report. A signed report from an expired certification
        holder is not compliant and can be grounds for enforcement action under MCL 333.5462.
      </P>

      <H2>9. Recordkeeping</H2>

      <P>
        Under R 325.99910(4), lead inspection and risk assessment reports, clearance reports, training records,
        and certification copies must be retained for <strong>3 years</strong> by the certified individual and
        their firm. HUD's Lead Safe Housing Rule requires property owners to retain the same documents for
        <strong> 3 years after the conclusion of Federal assistance</strong> (24 CFR 35.175), and OSHA's lead
        standard (29 CFR 1926.62) requires exposure monitoring records to be kept for
        <strong> 30 years</strong>. Inspectors generally retain longer than the 3-year floor because liability
        tails run 6 years under MCL 600.5805 for environmental claims.
      </P>

      <H2>10. Common enforcement flags</H2>

      <P>
        EGLE's most frequent citations in audited reports, based on the 2023–2025 enforcement summaries:
      </P>

      <UL>
        <LI>Missing substrate-correction documentation for XRF readings</LI>
        <LI>Dust wipe results reported without the laboratory's analytical detection limit</LI>
        <LI>Hazard determinations that still use pre-2025 dust thresholds (9 / 100 / 100 µg/ft²) instead of the current "any reportable level" floor/sill threshold</LI>
        <LI>Risk assessment reports signed by a Lead Inspector only</LI>
        <LI>Clearance examiners employed by the abatement contractor on the same job (independence violation)</LI>
        <LI>Missing signed statement of accuracy from the certified individual</LI>
      </UL>

      <Callout tone="success" title="What LeadFlow AI handles for you">
        The platform's Hazard Analysis and Generate Report tabs are wired to the post-January-2025 dust thresholds
        and surface a warning any time a sample is near-limit. The Thresholds tab lets you view the exact numeric
        rules being applied to your report. Substrate correction is captured per XRF reading. The signed-statement
        block is emitted automatically from your certified-individual profile. You still make the professional
        judgment; the system keeps the regulatory plumbing current.
      </Callout>

      <H2>Primary references</H2>

      <UL>
        <LI>MCL 333.5451 through 333.5479 — Michigan Lead Abatement Act, Part 551 of the Public Health Code</LI>
        <LI>Mich. Admin. Code R 325.99101 through R 325.99910 — EGLE implementing rules</LI>
        <LI>40 CFR Part 745 — Lead-Based Paint Poisoning Prevention in Certain Residential Structures (TSCA)</LI>
        <LI>40 CFR 745.65 — Identification of dangerous levels of lead (amended January 2025)</LI>
        <LI>24 CFR Part 35 — HUD Requirements for Notification, Evaluation, and Reduction of Lead-Based Paint Hazards</LI>
        <LI>HUD <em>Guidelines for the Evaluation and Control of Lead-Based Paint Hazards in Housing</em>, current edition, Chapters 5 and 7</LI>
        <LI>ASTM E1828 — Standard Practice for Evaluating the Performance Characteristics of Qualitative Test Kits and Technologies</LI>
        <LI>29 CFR 1926.62 — OSHA Construction Lead Standard</LI>
      </UL>
    </ResourcePageLayout>
  );
}
