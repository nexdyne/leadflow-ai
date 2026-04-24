import React from 'react';
import ResourcePageLayout, { H2, H3, P, UL, LI, Callout, Table, Code } from './ResourcePageLayout';
import { RESOURCE_BY_SLUG } from './_resourceTheme';

// /resources/epa-rrp-updates
// News/regulatory update page on the January 2025 EPA amendment that
// lowered DLHS/DLCL and its flow-through effects on the RRP rule.
export default function EPARRPUpdates() {
  const resource = RESOURCE_BY_SLUG['epa-rrp-updates'];

  return (
    <ResourcePageLayout resource={resource}>
      <P>
        EPA finalized the most consequential amendment to its lead program in a decade on
        <strong> January 17, 2025</strong>, when it republished 40 CFR 745.65 with lower dust-lead hazard
        identification standards and made parallel adjustments to the Renovation, Repair, and Painting (RRP)
        Rule at 40 CFR Part 745 Subpart E. This resource is a plain-English walk through the final rule, what
        it changed, what it didn't change, and what it means for Michigan renovators and inspectors working in
        pre-1978 housing.
      </P>

      <Callout tone="warning" title="RRP vs. abatement">
        This update is about the Renovation, Repair, and Painting Rule — work that disturbs painted surfaces
        incidental to a non-lead-abatement project (remodeling, window replacement, HVAC penetrations, etc.). It
        is a different legal regime from Michigan's Part 551 abatement program. An RRP renovation does not
        produce a LIRA report and is not performed by a Certified Risk Assessor. Know which regime your job is
        under before quoting the work.
      </Callout>

      <H2>1. What the January 2025 rule actually changed</H2>

      <P>
        The final rule made three concrete changes. Understanding which is which prevents confusion between the
        hazard standards, the clearance standards, and the RRP work-practice trigger:
      </P>

      <H3>A. Dust-Lead Reporting Level (DLRL) lowered to detection limit</H3>
      <P>
        EPA replaced the prior numeric dust-lead hazard standards for floors (10 µg/ft²) and interior window
        sills (100 µg/ft²) with a requirement to identify a hazard at <strong>any reportable level</strong> —
        i.e., at or above the laboratory's reliable detection limit. NLLAP-recognized labs typically report
        reliable detections at 3 to 5 µg/ft² for floor wipes; after January 2025, that detectable dust is a
        hazard.
      </P>

      <H3>B. Dust-Lead Clearance Level (DLCL) held steady</H3>
      <P>
        Clearance numbers did not move. 5 µg/ft² for floors, 40 µg/ft² for interior window sills, and 100 µg/ft²
        for window troughs remain the pass/fail levels for post-abatement or post-RRP cleanup clearance.
      </P>

      <H3>C. RRP work-practice scoping unchanged</H3>
      <P>
        The RRP Rule still triggers on the same scope — any renovation that disturbs more than 6 square feet of
        interior paint per room, 20 square feet of exterior paint, or involves window replacement or demolition,
        in target housing (pre-1978) or child-occupied facilities. The January 2025 rule did not change the
        square-footage triggers; it changed what happens after work is done, because the new hazard definition
        now applies to clearance wipes that some renovators voluntarily perform and to post-work testing that
        property owners increasingly request.
      </P>

      <H2>2. Old numbers vs. current numbers at a glance</H2>

      <Table
        caption="Source: 40 CFR 745.65 as amended January 2025; 40 CFR 745.227(e) unchanged for clearance."
        rows={[
          ['Metric', 'Pre–Jan 2025', 'Post–Jan 2025 (current)'],
          ['Floor dust hazard (risk assessment)', '10 µg/ft²', 'Any reportable level (lab detection limit)'],
          ['Interior window sill dust hazard', '100 µg/ft²', 'Any reportable level'],
          ['Floor clearance', '10 µg/ft²', '5 µg/ft²'],
          ['Interior window sill clearance', '100 µg/ft²', '40 µg/ft²'],
          ['Window trough clearance', '400 µg/ft²', '100 µg/ft²'],
          ['Definition of LBP', '1.0 mg/cm² or 0.5% by weight', '1.0 mg/cm² or 0.5% by weight (unchanged)'],
          ['Bare soil, play area', '400 ppm', '400 ppm (unchanged)'],
        ]}
      />

      <Callout tone="danger" title="The clearance numbers DID move in 2021">
        Clearance floor/sill/trough numbers were lowered in a separate 2021 rulemaking (5/40/100 µg/ft²), which
        is distinct from the January 2025 DLRL amendment. The 2025 rule did not change clearance; it changed
        hazard identification. If your thinking about thresholds dates from before 2021 you have two separate
        updates to absorb.
      </Callout>

      <H2>3. What this means for RRP certified renovators</H2>

      <P>
        RRP firms are certified by EPA under 40 CFR 745.89 and must use EPA-accredited lead-safe work practices,
        including containment, prohibited practices (open-flame burning, high-heat gun above 1100°F, etc.), and
        a cleaning verification protocol. RRP does not require post-work clearance wipes in most cases; the
        Cleaning Verification protocol using the approved wet-white and dry-white cloths substitutes for
        numeric clearance. The January 2025 rule did not change Cleaning Verification.
      </P>

      <P>
        Practically, the change matters in two scenarios where numeric wipe results re-enter an RRP job:
      </P>

      <UL>
        <LI><strong>Property owner requests wipe testing after the job.</strong> If the owner (or their
          insurance carrier, or their tenant's attorney) has a risk assessment performed after an RRP
          renovation, the wipes will be evaluated against the post-2025 "any reportable level" hazard
          standard. A renovator who leaves detectable dust behind — even though Cleaning Verification would
          have passed — is now exposed to a "hazard present after renovation" finding.</LI>
        <LI><strong>Occupied housing with a young child.</strong> Local health departments doing EBL
          investigations increasingly perform dust wipes after disclosed renovation work. Detectable dust
          after RRP can retroactively implicate the renovator in the child's exposure.</LI>
      </UL>

      <Callout tone="info" title="Renovator response">
        Many RRP firms have upgraded to post-job wipe sampling on high-risk jobs (windows, demolition) as a
        defensive practice. It exceeds what RRP requires, but it matches what an EBL investigator would find
        if they looked, and it lets the renovator hand the owner a documented passing result rather than
        relying solely on Cleaning Verification.
      </Callout>

      <H2>4. What this means for Michigan risk assessors</H2>

      <P>
        Risk assessors bear the operational burden of the rule change. Every risk assessment performed after
        the January 2025 effective date must apply the new hazard standard when classifying dust-wipe results.
        Three practical implications:
      </P>

      <UL>
        <LI><strong>Almost every pre-1978 Michigan home will now show a dust-lead hazard.</strong> Background
          lead is high enough in older housing stock that detectable dust is nearly universal. The "no hazard"
          finding is becoming rare.</LI>
        <LI><strong>Laboratory detection limits matter more than they used to.</strong> If your lab reports
          a reliable detection limit of 5 µg/ft², then dust at 4 µg/ft² is "not detected" and no hazard. If
          your lab reports 3 µg/ft², the same sample is a hazard. Pick labs with documented, audited detection
          limits and report them on the face of the risk assessment.</LI>
        <LI><strong>Hazard control recommendations need to change tone.</strong> A report that finds hazards
          on the vast majority of tested components should emphasize prioritization — child's sleeping area,
          play surfaces, friction surfaces — rather than reading as a universal condemnation of the dwelling.</LI>
      </UL>

      <H2>5. Michigan-specific overlay</H2>

      <P>
        EPA administers RRP directly in Michigan; the state has not sought delegation of RRP authority under
        40 CFR 745.324. That means Michigan renovators interact with the EPA Region 5 office in Chicago for
        RRP certification, compliance, and enforcement, while lead abatement interactions are with EGLE in
        Lansing. This division is a common source of confusion on the ground.
      </P>

      <P>
        EGLE did issue guidance (IB 2024-4 and subsequent communications) acknowledging the federal DLRL change
        and aligning Michigan's hazard determinations at R 325.99305 with the new federal language. No separate
        Michigan rulemaking was needed because the Michigan rule text references the federal hazard definition
        by citation rather than numeric copy.
      </P>

      <Callout tone="warning" title="Practical rule for a Michigan job">
        If you are signing a Michigan LIRA or risk assessment in 2026, you must apply the post–January 2025
        dust-lead hazard standard — any reportable dust on a floor or interior window sill is a hazard. If you
        are operating under an RRP certification doing a renovation, the same change affects how owners and
        tenants interpret your work, even though it did not change your RRP work-practice rules.
      </Callout>

      <H2>6. Other moving pieces to watch</H2>

      <H3>Abatement worker protection</H3>
      <P>
        OSHA and MIOSHA lead standards (29 CFR 1926.62 / Part 603) retain the 50 µg/m³ permissible exposure
        limit and 30 µg/m³ action level, which did not change with the EPA rule. Worker protection and
        environmental hazard identification are separate regulatory tracks and should be addressed separately
        in every job plan.
      </P>

      <H3>HUD alignment</H3>
      <P>
        HUD's Lead Safe Housing Rule at 24 CFR 35.1320 cross-references 40 CFR 745.65 for hazard identification
        and 40 CFR 745.227(e) for clearance. HUD's thresholds therefore track EPA's — HUD has not published a
        separate rule to adopt the January 2025 change, but by reference the new standards apply to federally
        assisted pre-1978 housing.
      </P>

      <H3>Blood-lead reference value</H3>
      <P>
        CDC's blood-lead reference value remains 3.5 µg/dL (set October 2021). Michigan EBL response under
        MCL 333.5474a triggers at this level. CDC has signaled that the reference value is recalculated every
        four years based on NHANES data; a further reduction to 3.0 or lower is plausible in 2026–2027 but
        has not been finalized.
      </P>

      <H2>7. Compliance checklist — renovators</H2>

      <UL>
        <LI>EPA Lead-Safe Certified Firm status current (renewed every 5 years)</LI>
        <LI>Each renovator who directs or performs RRP work has Certified Renovator Initial training or
          refresher current (refresher every 5 years)</LI>
        <LI>EPA-approved Pre-Renovation Education Rule pamphlet delivered to owner and occupants</LI>
        <LI>Containment and work-practice protocol implemented per 40 CFR 745.85</LI>
        <LI>Cleaning Verification completed using the approved protocol — or voluntary wipe sampling with
          lab reports retained</LI>
        <LI>Records retained for 3 years per 40 CFR 745.86</LI>
      </UL>

      <H2>8. Compliance checklist — risk assessors</H2>

      <UL>
        <LI>Hazard classifications on every dust wipe applied against post–January 2025 "any reportable
          level" standard for floors and sills</LI>
        <LI>Laboratory report with documented detection limit attached as appendix</LI>
        <LI>Hazard control recommendations include prioritization, not just a list</LI>
        <LI>EBL investigations (if applicable) completed within the 45-day Michigan deadline</LI>
        <LI>Certification number and signed accuracy statement on every report</LI>
      </UL>

      <Callout tone="success" title="Staying current with LeadFlow AI">
        Every new project in LeadFlow AI applies the currently-effective dust-lead hazard standard to your
        wipe results. The Thresholds tab displays the exact numeric rules in effect for your report, so you
        can verify at a glance. When EPA next updates 40 CFR 745.65 we push the new thresholds in a software
        release and your future reports pick them up automatically. Your signed reports carry the threshold
        version in effect on the date of issuance.
      </Callout>

      <H2>Primary references</H2>

      <UL>
        <LI>40 CFR 745.65 — Identification of dangerous levels of lead (as amended 90 FR 5662, January 17, 2025)</LI>
        <LI>40 CFR 745 Subpart E — Renovation, Repair, and Painting Rule</LI>
        <LI>40 CFR 745.85 — Work practice standards for RRP</LI>
        <LI>40 CFR 745.86 — RRP recordkeeping and reporting</LI>
        <LI>40 CFR 745.227(e) — Clearance sampling criteria (unchanged from 2021 rulemaking)</LI>
        <LI>24 CFR 35.1320 — HUD hazard evaluation and clearance requirements</LI>
        <LI>29 CFR 1926.62 — OSHA construction lead standard</LI>
        <LI>EGLE Information Bulletin IB 2024-4 — Michigan alignment with amended federal hazard standards</LI>
      </UL>
    </ResourcePageLayout>
  );
}
