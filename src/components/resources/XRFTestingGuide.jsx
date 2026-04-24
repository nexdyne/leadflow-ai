import React from 'react';
import ResourcePageLayout, { H2, H3, P, UL, LI, Callout, Table, Code } from './ResourcePageLayout';
import { RESOURCE_BY_SLUG } from './_resourceTheme';

// /resources/xrf-testing
// Field-grade reference on XRF best practices for Michigan lead
// inspectors. Content aligns with HUD Guidelines Chapter 7, ASTM E1828,
// and manufacturer-agnostic operating principles — the intent is that
// an inspector running a Niton, Radek, or Viken can follow along
// regardless of brand.
export default function XRFTestingGuide() {
  const resource = RESOURCE_BY_SLUG['xrf-testing'];

  return (
    <ResourcePageLayout resource={resource}>
      <P>
        X-ray fluorescence (XRF) is the dominant field method for identifying lead-based paint in Michigan
        dwellings. When used correctly it delivers definitive presence/absence results that do not require
        laboratory confirmation; when used carelessly it produces false negatives, false positives, and
        unauditable reports that fail EGLE inspection. This guide covers the operating standards that separate a
        clean XRF report from one that will not survive a regulator's second look.
      </P>

      <P>
        All procedural direction here traces back to three sources: the HUD <em>Guidelines for the Evaluation
        and Control of Lead-Based Paint Hazards in Housing</em> (current edition), Chapter 7; the Performance
        Characteristic Sheets (PCS) issued by EPA for each specific XRF analyzer/source/software combination; and
        the analyzer manufacturer's current operator manual. When these sources disagree, the PCS governs for
        the specific instrument in use.
      </P>

      <Callout tone="info" title="The PCS is the contract">
        Every XRF analyzer used for regulatory lead work must have a current EPA-published Performance
        Characteristic Sheet. The PCS defines the instrument's inconclusive range, substrate correction values,
        and the specific firmware/calibration combination to which those values apply. If your report cites XRF
        readings without referencing the governing PCS by document title and date, you have a hole that a
        reviewer can exploit.
      </Callout>

      <H2>1. What an XRF actually measures</H2>

      <P>
        A handheld XRF analyzer emits a primary X-ray beam from a radioactive source (most commonly Cd-109, sometimes
        Co-57) or an X-ray tube. The primary beam excites inner-shell electrons in the target material, and as
        outer-shell electrons drop to fill those vacancies, they emit characteristic fluorescence X-rays. The
        analyzer's detector counts photons at lead's K-alpha (88 keV for Cd-109) and L-alpha (~10 keV) energies,
        and firmware converts the counts into a surface-area lead concentration in mg/cm².
      </P>

      <P>
        Two operator-controlled variables determine reading quality: the count time (dwell) and the geometry of
        the measurement (probe flat against the surface, no gap, no movement). Both are within your control at
        every reading, and both have non-negligible effects on the result.
      </P>

      <H2>2. Daily QC: before the first reading</H2>

      <P>
        Before any reading that will appear in a report, perform and document the instrument's daily quality
        control check. The procedure varies slightly by manufacturer but always includes:
      </P>

      <UL>
        <LI><strong>Source age check.</strong> Cd-109 has a 464-day half-life; Co-57 is 272 days. Firmware
          automatically corrects for source decay, but beyond roughly two half-lives the signal-to-noise
          degrades enough that inconclusive rates climb. Log the source date on every report.</LI>
        <LI><strong>Nulling / blanking.</strong> A zero reading on a lead-free reference block (usually SRM
          quartz or manufacturer-supplied) confirms the detector responds correctly at zero lead.</LI>
        <LI><strong>Performance check on a Positive Reference Standard (PRS).</strong> Take three consecutive
          readings on the manufacturer's supplied known-positive standard (typically 1.02 ± 0.07 mg/cm²). The
          mean must agree with the certified value within the limits set in the PCS (generally ±0.15 mg/cm²).</LI>
        <LI><strong>Performance check on a Negative Reference Standard (NRS).</strong> Three consecutive
          readings on the lead-free standard. The mean must be below the PCS-specified zero tolerance
          (typically ≤ 0.10 mg/cm²).</LI>
      </UL>

      <P>
        Failure of any QC step disqualifies the instrument for reportable work until the issue is resolved.
        Retention: QC logs must be retained for the same 3-year minimum as the reports (R 325.99910(4)) and
        generally longer, since they are the first thing a plaintiff's attorney subpoenas.
      </P>

      <H2>3. Midday and closeout checks</H2>

      <P>
        HUD Chapter 7.3 calls for an additional PRS/NRS check every four hours of field testing, and a closeout
        PRS/NRS check at the end of the day. Many inspectors also re-check after any event that could affect
        the analyzer — a drop, a temperature excursion, a battery swap. Document every check with timestamp,
        standard used, the three readings, and the mean.
      </P>

      <H2>4. Testing combinations and sample design</H2>

      <P>
        A "testing combination" is the unit of XRF work. HUD defines it as a unique combination of room
        equivalent, component (wall, door, window frame, trim, floor, etc.), color, and substrate. The sampling
        design rule is that every testing combination gets tested — colors are tested separately because lead
        pigment formulations varied by color, and substrates are tested separately because substrate correction
        differs.
      </P>

      <Table
        caption="HUD Chapter 7 Table 7.3, simplified. Substrate correction values come from the governing PCS."
        rows={[
          ['Common substrate', 'Typical correction (approximate)', 'Why correction is needed'],
          ['Wood', '±0.0 to 0.2 mg/cm²', 'Low matrix interference; minimal correction'],
          ['Drywall / plaster', '±0.0 to 0.2 mg/cm²', 'Low matrix interference'],
          ['Concrete / masonry', '0.1 to 0.5 mg/cm²', 'Iron in substrate produces a low-energy peak near lead L-alpha'],
          ['Metal (ferrous)', '0.3 to 0.7 mg/cm²', 'Iron K-alpha overlaps with lead L-alpha; causes systematic bias'],
          ['Brick', '0.2 to 0.4 mg/cm²', 'Iron and other heavy elements in clay'],
        ]}
      />

      <Callout tone="warning" title="Always apply substrate correction">
        Reporting raw XRF readings without applying substrate correction is one of the most common regulatory
        citations in audited Michigan reports. The correction value is not a judgment call — it is specified in
        the PCS. If your instrument or software does not compute it automatically, you must do it manually and
        note the correction applied on each reading.
      </Callout>

      <H2>5. Reading geometry and count time</H2>

      <P>
        A single reading should be taken with the probe window flat against the painted surface, firm enough
        that there is no visible gap, and held steady through the full dwell. The dwell time varies by
        instrument and firmware — modern K+L mode analyzers complete a definitive reading in 1 to 5 seconds on
        most substrates — but any movement during the count will produce an inconclusive result. If your
        instrument reports "inconclusive" or flags high uncertainty, re-read rather than recording the flagged
        value.
      </P>

      <P>
        For components too small or too detailed for a flat probe-to-surface placement (narrow muntins,
        decorative trim), HUD Chapter 7.5 permits removing a paint chip for laboratory analysis rather than
        forcing a bad XRF geometry. Note the chip-sample substitution in the report.
      </P>

      <H2>6. The inconclusive range</H2>

      <P>
        Every XRF/substrate combination has a range of readings that are statistically neither clearly positive
        nor clearly negative. The PCS defines this inconclusive range — commonly ~0.4 to 1.4 mg/cm² for wood,
        with different ranges for other substrates. Readings in the inconclusive range must be either:
      </P>

      <UL>
        <LI>Confirmed by additional XRF readings on the same component (increased sampling drives the mean
          toward the true value), or</LI>
        <LI>Sent to a laboratory as a paint-chip sample for definitive quantitative analysis.</LI>
      </UL>

      <P>
        An inconclusive reading is <strong>not</strong> a negative. A report that treats inconclusive readings
        as negatives — "below the 1.0 mg/cm² action level, therefore no LBP" — is non-compliant and invalidates
        the LBP determination for that component.
      </P>

      <H2>7. Interpreting results against the LBP threshold</H2>

      <P>
        Under 40 CFR 745.83, lead-based paint is defined as any paint with a lead concentration of 1.0 mg/cm² or
        greater on a surface-area basis, or 0.5% by weight on a chip basis. After substrate correction is
        applied, an XRF reading at or above 1.0 mg/cm² is LBP; a reading below the inconclusive range lower
        bound is not LBP; a reading in the inconclusive range is undetermined until confirmed.
      </P>

      <Callout tone="danger" title="1.0 mg/cm² is an 'at or above' cutoff">
        The regulatory threshold is ≥ 1.0 mg/cm² — not &gt;. An XRF reading of exactly 1.0, after correction, is
        LBP. This trips up inspectors who interpret the threshold as strictly greater than. Check your reporting
        software's comparison operator.
      </Callout>

      <H2>8. Documenting each reading</H2>

      <P>
        A defensible XRF log captures, per reading:
      </P>

      <UL>
        <LI>Room equivalent (e.g., "Bedroom 1", "North hall")</LI>
        <LI>Component (e.g., "window sash, lower", "door, closet")</LI>
        <LI>Substrate (wood, metal, drywall, etc.)</LI>
        <LI>Color layer being tested</LI>
        <LI>Raw XRF reading in mg/cm²</LI>
        <LI>Substrate correction applied, from the PCS</LI>
        <LI>Corrected reading in mg/cm²</LI>
        <LI>Classification: LBP / Not LBP / Inconclusive</LI>
        <LI>Count time (dwell) if not the instrument default</LI>
        <LI>Any operator notes (e.g., "re-read due to movement", "chipped to confirm")</LI>
      </UL>

      <P>
        When an inconclusive reading is resolved via paint-chip sampling, the lab report must be appended to the
        inspection report and the XRF log must cross-reference the chip sample ID.
      </P>

      <H2>9. Radiation safety and licensing</H2>

      <P>
        XRF analyzers with radioactive sources are regulated in Michigan by EGLE's Radiation Safety Section
        under Part 135 of Act 368 and the corresponding rules at R 333.5051 et seq. Key obligations:
      </P>

      <UL>
        <LI>The analyzer must be registered with EGLE's Radiation Safety Section; registration is renewed
          annually</LI>
        <LI>The authorized user must complete a manufacturer-approved safety training course every two years</LI>
        <LI>Film-badge or OSL dosimetry is not required for normal handheld use below regulatory limits, but
          many firms require it as company policy</LI>
        <LI>Leak testing of the sealed source is required every six months; keep leak test reports with the QC
          logs</LI>
        <LI>Transportation follows 49 CFR 173 for Type A packages — know your DOT labeling before shipping or
          checking an analyzer as airline baggage</LI>
      </UL>

      <Callout tone="info" title="Tube-based XRF has different rules">
        X-ray tube analyzers (no radioactive source) do not have source decay or leak test requirements but are
        still regulated under the same Part 135 framework. The authorized-user and registration obligations
        apply to both technologies.
      </Callout>

      <H2>10. When not to use XRF</H2>

      <P>
        XRF has limitations that every inspector should respect. Do not rely on XRF alone for:
      </P>

      <UL>
        <LI><strong>Soil lead</strong> — field portable XRF for soil is technically possible but produces
          results that are generally not accepted in lieu of laboratory ICP analysis for regulatory risk
          assessments under 40 CFR 745.65(b)(2)</LI>
        <LI><strong>Dust wipes</strong> — dust wipe samples must be laboratory-analyzed; there is no approved
          field XRF method for dust-lead concentration in µg/ft²</LI>
        <LI><strong>Very thin paint layers over heavy-metal substrates</strong> — iron-containing metal
          substrates can produce a signal the analyzer cannot separate from thin paint; laboratory chip
          analysis is the fallback</LI>
        <LI><strong>Surfaces with unusual geometry</strong> — decorative molding, wrought iron, any surface
          where the probe cannot achieve flat contact</LI>
      </UL>

      <H2>11. Common XRF report errors</H2>

      <P>
        From EGLE's 2023–2025 audit summaries and peer reviews:
      </P>

      <UL>
        <LI>Missing or stale PCS reference on the report</LI>
        <LI>QC log not attached or missing the daily PRS/NRS check</LI>
        <LI>Raw readings reported without substrate correction</LI>
        <LI>Inconclusive readings reported as negatives</LI>
        <LI>Source age exceeding two half-lives without supplementary QC</LI>
        <LI>Single reading used for a component where HUD requires replicates after an inconclusive</LI>
        <LI>Missing operator certification number next to the reading log</LI>
      </UL>

      <Callout tone="success" title="How LeadFlow AI supports your XRF workflow">
        The XRF Data tab captures raw reading, substrate, color, component, and room in a single pass, then
        applies substrate correction from the PCS you select at project setup. Inconclusive readings are
        automatically flagged and you are prompted to resolve them via re-read or paint-chip sampling before
        report generation. QC log entries (daily PRS/NRS, midday, closeout) are tracked per analyzer and
        appended to every report. The system does not do the thinking for you; it removes the recordkeeping
        tax that eats your evenings after a field day.
      </Callout>

      <H2>Primary references</H2>

      <UL>
        <LI>HUD <em>Guidelines for the Evaluation and Control of Lead-Based Paint Hazards in Housing</em>, current edition, Chapter 7 (XRF)</LI>
        <LI>EPA XRF Performance Characteristic Sheets (instrument-specific; published in the EPA Lead Program document library)</LI>
        <LI>40 CFR 745.83 — definition of lead-based paint</LI>
        <LI>40 CFR 745.227(b) — lead inspection procedures</LI>
        <LI>ASTM E1828 — qualitative lead test kit and technology evaluation</LI>
        <LI>Michigan Part 135 and R 333.5051 et seq. — radiation safety for portable XRF analyzers</LI>
        <LI>29 CFR 1926.62 — OSHA construction lead standard (operator exposure framework)</LI>
      </UL>
    </ResourcePageLayout>
  );
}
