// Generated from the two approved Mevion interlock references listed below.
// Keep Analyzer behavior in error-analyzer-tool.js; this file is reference data only.
window.MevionInterlockCatalog = Object.freeze({
  sources: {
    catalog: "37022R13 - Interlock Spreadsheet Appendix B",
    guide: "SAF19-JA4 Guide to Interlocks, VID 6"
  },
  conditionAliases: {
    BEAM_KEY: "hBKey",
    TREATMENT_TIME_LIMIT: "dTime",
    RANGE_SHIFTER_PLATE_MOTION: "sRSPos",
    XYZ_SUBSYSTEM_LOADED: "sXYZLd",
    DOSE_COMPARISONS: "dCompare",
    SPOT_DOSE_LIMIT: "dCharge",
    AA_POSITION_MISMATCH: "sAAPos"
  },
  entries: [
    {
      ref: 1,
      subsystem: "Controls",
      name: "Cyclotron PLC",
      satisfiedCondition: "Satisfied while the Cyclotron PLC processor is not faulted.",
      type: "2",
      class: "B,M,C",
      enumId: "IL_CYCLOTRON_PLC",
      code: "cCyc",
      override: "No",
      guideName: "Cyclotron PLC",
      guideSatisfiedCondition: "Cyclotron PLC is powered on, communicating and not faulted.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 8
    },
    {
      ref: 2,
      subsystem: "Controls",
      name: "Cyclotron PLC Heartbeat",
      satisfiedCondition:
        "Satisfied while cyclotron PLC's heartbeat has changed at least once in the past 500ms.",
      type: "1",
      class: "B,M,C",
      enumId: "IL_CYCLOTRON_PLC_TO_MCC_COMMS",
      code: "cCycHB",
      override: "No",
      guideName: "Cyclotron PLC Heartbeat",
      guideSatisfiedCondition:
        "Cyclotron PLC’s heartbeat has updated at least once every 500ms to ensure non-stale communication.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 8
    },
    {
      ref: 3,
      subsystem: "Controls",
      name: "Cyclotron PLC Hardware",
      satisfiedCondition:
        "Satisfied while cyclotron PLC reports Hardware normal. (Entire cyclotron PLC health word is zero).",
      type: "2",
      class: "B,C",
      enumId: "IL_CYCLOTRON_PLC_HARDWARE",
      code: "cCycHW",
      override: "Yes",
      guideName: "Cyclotron PLC Hardware",
      guideSatisfiedCondition: "Cyclotron PLC reports Hardware normal.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 8
    },
    {
      ref: 4,
      subsystem: "Controls",
      name: "PLC Forced I/O",
      satisfiedCondition:
        "Satisfied when both PLCs (Cyclotron and Treatment) report that there are no Forced Inputs or Outputs.",
      type: "2",
      class: "B,C",
      enumId: "IL_PLC_FORCED_IO",
      code: "cFIO",
      override: "Yes",
      guideName: "PLC Forced I/O",
      guideSatisfiedCondition:
        "Both PLCs (Cyclotron & Treatment) report that there are not any forced inputs or outputs. No outside control (connected laptop)",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 8
    },
    {
      ref: 5,
      subsystem: "Controls",
      name: "Master Control Computer",
      satisfiedCondition:
        "Satisfied when: - MCC heartbeat is incrementing Also, set unsatisfied once on MCC boot where previous MCC shutdown was reported as UN-Planned. This will latch the interlock. If the other condition above is satisfied, the user can clear the latch and continue.",
      type: "2",
      class: "B,M,C,I",
      enumId: "IL_MCC_INTEGRITY",
      code: "cMCC",
      override: "No",
      guideName: "Master Control Computer",
      guideSatisfiedCondition:
        "MCC heartbeat is incrementing and there was not an unplanned shutdown of MCC.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 8
    },
    {
      ref: 6,
      subsystem: "Controls",
      name: "Couch Heartbeat",
      satisfiedCondition: "Satisfied when both PLCs report that Kuka Heartbeat from Kuka to PLC is OK.",
      type: "2",
      class: "B,M",
      enumId: "IL_PLC_TO_KUKA_COMMS",
      code: "cCchHB",
      override: "Yes",
      guideName: "Couch Heartbeat",
      guideSatisfiedCondition: "Treatment PLC reports heartbeat from Kuka to Treatment PLC is incrementing.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 8
    },
    {
      ref: 7,
      subsystem: "Controls",
      name: "Couch Pendant",
      satisfiedCondition:
        "Satisfied when Kuka Teach Pendant is in External Mode. This is when the dial on the teach pendant is at the 2 o'clock position.",
      type: "1",
      class: "B,M",
      enumId: "IL_COUCH_HAND_PENDANT",
      code: "cPend",
      override: "Yes",
      guideName: "Couch Pendant",
      guideSatisfiedCondition:
        "Kuka Teach Pendant is in External Mode (key at 2 o’clock position; teach pendant inactive) and no internal couch E-stops.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 8
    },
    {
      ref: 8,
      subsystem: "Controls",
      name: "Treatment PLC",
      satisfiedCondition:
        "Treatment Space PLC Software operation normal - Integrity Check OK, PLC SW Not Faulted, PLC HW Not Faulted - Resolver Module Fault",
      type: "2",
      class: "B,M,I",
      enumId: "IL_TREATMENT_PLC",
      code: "cTrt",
      override: "Yes",
      guideName: "Treatment PLC",
      guideSatisfiedCondition: "Treatment PLC is powered on, communicating and not faulted.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 8
    },
    {
      ref: 9,
      subsystem: "Controls",
      name: "Treatment PLC Heartbeat",
      satisfiedCondition: "Treatment Space PLC Heartbeat from PLC to MCC",
      type: "1",
      class: "B,M,I",
      enumId: "IL_TREATMENT_PLC_TO_MCC_COMMS",
      code: "cTrtHB",
      override: "Yes",
      guideName: "Treatment PLC Heartbeat",
      guideSatisfiedCondition:
        "Treatment PLC’s heartbeat has updated at least once every 500ms to ensure non-stale communication.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 8
    },
    {
      ref: 10,
      subsystem: "Controls",
      name: "Therapy Console Heartbeat",
      satisfiedCondition: "Satisfied when MevTDS is alive and publishing heartbeat to MCC.",
      type: "1",
      class: "B,C",
      enumId: "IL_TREATMENT_TC_TO_MCC_COMMS",
      code: "cTCHB",
      override: "Yes",
      guideName: "Therapy Console Heartbeat",
      guideSatisfiedCondition:
        "MevTDS is alive and publishing heartbeat to MCC. Only satisfied in Clinical or Physics Mode; always overridden in Service. (same as cTC for S250i)",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 8
    },
    {
      ref: 11,
      subsystem: "Controls",
      name: "Therapy Console",
      satisfiedCondition:
        "Satisfied when TC reports it is healthy, and MCC is receiving heartbeat data from TC Clinical.",
      type: "1",
      class: "B",
      enumId: "IL_TREATMENT_TC_READY",
      code: "cTC",
      override: "Yes",
      guideName: "Therapy Console",
      guideSatisfiedCondition:
        "TC reports it is healthy, and MCC is receiving heartbeat data from TC Clinical. Only satisfied in Clinical or Physics Mode; always overridden in Service. (same as cTCHB for S250i)",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 8
    },
    {
      ref: 12,
      subsystem: "Dosimetry",
      name: "Dosimetry Comparisons",
      satisfiedCondition:
        "Satisfied when all 8 Dosimetry comparisons are within configurable tolerances of configurable targets. DOSY 1. Doseplane 1 to Upstream Summed strips Y 2. Upstream Summed Strips Y to Downstream Summed Strips Y 3. Cumulative Synchronous Doseplane 1 to Recycling Integrator 1 DOS X 4. Doseplane 2 to Upstream Summed strips X 5. Upstream Summed Strips X to Downstream Summed Strips X 6. Cumulative Synchronous Doseplane 2 to Recycling Integrator 2 XYZ 7. Doseplane 1 to Doseplane 2 8. Doseplane 1 to BEQ Sum",
      type: "1",
      class: "B",
      enumId: "IL_DOSE_COMPARE",
      code: "dCompare",
      override: "Yes",
      guideName: "Dosimetry Charge Comparison",
      guideSatisfiedCondition:
        "All 8 Dosimetry comparisons are within configurable tolerances of configurable targets. DOSY 1. Doseplane 1 to Upstream Summed strips Y 2. Upstream Summed Strips Y to Downstream Summed Strips Y 3. Cumulative Synchronous Doseplane 1 to Recycling Integrator 1 DOS X 4. Doseplane 2 to Upstream Summed strips X 5. Upstream Summed Strips X to Downstream Summed Strips X 6. Cumulative Synchronous Doseplane 2 to Recycling Integrator 2 XYZ 7. Doseplane 1 to Doseplane 2 8. Doseplane 1 to BEQ Sum. This comparison has been turned off permanently by setting the tolerance to 50pC. Future systems will not even have a BEQ Comparison responsible for beam termination is recorded in the TC log.",
      configFiles: "/Dosimetry.XML /XYZ.XML",
      configValues:
        "For Both DosX & DosY: <DosXconfiguration> & <DosYconfiguration> Charge Calibration: <chargePerRecIntCount_pC> <dosePlaneSlope> <dosePlaneOffset> <upstreamTicSlope> <upstreamTicOffset> <downstreamTicSlope><downstreamTicOffset> Interlock Tolerances: <doseTicTolerance_pC> <usDsTolerance_pC> <doseIntTolerance_pC> Timing: <dosePlaneBackgroundNoiseSamplingDelay> <dosePlaneDataSamplingDelay> <ticBackgroundNoiseSamplingDelay> <ticDataSamplingDelay> <doseIntComparisonWindow_ms> Charge Calibration: <dosePlane1_Slope> <dosePlane1_Offset> <dosePlane2_Slope> <dosePlane2_Offset> <BEQ_Slope> <BEQ_Offset> Interlock Tolerances: <doseplaneTolerance_pC> <doseplaneBeqTolerance_pC> Timing: <BEQ_CollectionDelay_us>",
      guidePage: 12
    },
    {
      ref: 13,
      subsystem: "Dosimetry",
      name: "Beam Paused Timeout",
      satisfiedCondition: "Satisfied as long as Beam Paused has not exceeded configurable maximum time",
      type: "1",
      class: "B",
      enumId: "IL_DOSE_PAUSE_MAX_TIME",
      code: "dPMax",
      override: "Yes",
      guideName: "Beam Paused Timeout",
      guideSatisfiedCondition:
        "System has not been in the state “Beam Pause” for more than the configurable time.",
      configFiles: "/Dosimetry.XML",
      configValues: "Interlock Tolerance: <maxBeamPauseTime_sec>",
      guidePage: 11
    },
    {
      ref: 14,
      subsystem: "Dosimetry",
      name: "Dose 1",
      satisfiedCondition:
        "Total dose delivered to Doseplane1 (cumulative, synchronous) remains below configurable percent or absolute MU over prescribed total dose (MU1) e.g. 5% or 20MU. AND: Total dose delivered to Doseplane1 (recycling) remains below configurable percent or absolute MU over prescribed total dose (MU1) e.g. 5% or 20MU.",
      type: "1",
      class: "B",
      enumId: "IL_ACCUMULATED_DOSE_1",
      code: "dDose1",
      override: "Yes",
      guideName: "Total Dose Delivered to Doseplane 1",
      guideSatisfiedCondition:
        "Total dose delivered to Doseplane1 (cumulative, synchronous) remains below configurable percent or absolute MU over prescribed total dose (MU1) e.g. 5% or 20MU. AND: Total dose delivered to Doseplane1 (recycling) remains below configurable percent or absolute MU over prescribed total dose (MU1) e.g. 5% or 20MU.",
      configFiles: "/Dosimetry.XML",
      configValues:
        "MU Calibration: <MU_per_pC> Shared for DosY, X, Synchronous & Recycling (see dCompare for individual charge Calibration or Timing configuration parameters) Tolerances for sync (prim) and recyc (sec): <primary/secondaryTargetScaleFactorMU1/2> <primary/secondaryTargetMinimumMU1/2>",
      guidePage: 9
    },
    {
      ref: 15,
      subsystem: "Dosimetry",
      name: "Dose 2",
      satisfiedCondition:
        "Total dose delivered to Doseplane2 (cumulative, synchronous) remains below configurable percent or absolute MU over prescribed total dose (MU2) e.g. 10% or 40MU. AND: Total dose delivered to Doseplane2 (recycling) remains below configurable percent or absolute MU over prescribed total dose (MU2) e.g. 10% or 40MU..",
      type: "2",
      class: "B",
      enumId: "IL_ACCUMULATED_DOSE_2",
      code: "dDose2",
      override: "Yes",
      guideName: "Total Dose Delivered to Doseplane 2",
      guideSatisfiedCondition:
        "Total dose delivered to Doseplane2 (cumulative, synchronous) remains below configurable percent or absolute MU over prescribed total dose (MU2) e.g. 10% or 40MU. AND: Total dose delivered to Doseplane2 (recycling) remains below configurable percent or absolute MU over prescribed total dose (MU2) e.g. 10% or 40MU..",
      configFiles: "/Dosimetry.XML",
      configValues: "",
      guidePage: 9
    },
    {
      ref: 16,
      subsystem: "Dosimetry",
      name: "Prescription Time",
      satisfiedCondition:
        "Time in the state Beam On is less than the prescribed maximum time, calculated by applying a 20% overage to the expected time.",
      type: "1",
      class: "B",
      enumId: "IL_TIME_RX",
      code: "dTime",
      override: "Yes",
      guideName: "Prescription Time",
      guideSatisfiedCondition:
        "Time in the state Beam On is less than the prescribed maximum time, calculated by applying a 20% overage to the expected time given the number of pulse(let)s, layer switches, AA moves, magnitude of scanning magnet moves, average retries, etc.",
      configFiles: "MevTDS_Config. json /ROTC.XML",
      configValues:
        '"TreatmentTimeMultiplier" Additional multiplier to allow for a speed difference machine-to-machine. <rep_rate_Hz> Approx # pulses exit cyclotron in 1 second. Used to calculate time required to deliver treatment. Nominal 750 Hz for S250i.',
      guidePage: 11
    },
    {
      ref: 17,
      subsystem: "Dosimetry",
      name: "TIC Back projection",
      satisfiedCondition:
        "Charge weighted average error in the back-projected position is within the tolerance of nominal 0mm.",
      type: "1",
      class: "",
      enumId: "IL_DOSE_TIC_BACK_PROJECTION",
      code: "dTICBP",
      override: "Yes",
      guideName: "TIC Back- projection",
      guideSatisfiedCondition:
        "Charge weighted average error in the back- projected position is within the tolerance of nominal 0mm. This interlock is about backprojecting from the TICs to the bending source mid-scanning magnet. The XML still refer to the BEQ even though that’s no longer used.",
      configFiles: "/Dosimetry.XML /XYZ.XML",
      configValues:
        "vSADs: <ISO_source_mm> (crossplane) <BEQBP_InplaneMinSAD_mm> (neg IP bend) <BEQBP_InplaneMaxSAD_mm> (pos IP bend) <BEQBP_Positive/NegativeGantryAlignmentOffs et_mm> <BEQBP_Offset_mm> Tolerance: <BEQ_ProjectionComparisonTolerance_mm>",
      guidePage: 11
    },
    {
      ref: 18,
      subsystem: "Dosimetry",
      name: "BEQ Position",
      satisfiedCondition:
        "The measured X and Y positions at the exit port are within tolerance of center (0mm). This is evaluated at the end of a layer as a charge weighted average error if pulses are above the minimum charge.",
      type: "1",
      class: "",
      enumId: "IL_BEQ_POSITION",
      code: "dBEQPos",
      override: "Yes",
      guideName: "BEQ Position",
      guideSatisfiedCondition:
        "The measured X and Y positions at the exit port are within tolerance of center (0mm). This is evaluated at the end of a layer as a charge weighted average error if pulses are above the minimum charge. Position is calculated as below: CP=(TR+BR-TL-BL)/(TR+BR+TL+BL)*CPRadius IP=(BR+BL-TR-TL)/(TR+BR+TL+BL)*IPRadius Where T=Top, B=Bottom, R=Right, L=Left Note, this interlock has been switched to “off” by changing the tolerance to 5mm permanently. Future systems will not even have a BEQ",
      configFiles: "/XYZ.XML",
      configValues:
        "Targets for each gantry angle (22.5-deg) should always be 0mm. Tolerance: <BEQ_TargetTolerance_Y/X_mm> Min Charge: <BEQ_AvgPositionMinChargeThreshold_pC> Radii: <BEQ_CrossplaneSpotRadius_mm> <BEQ_InplaneSpotRadius_mm> Calibration: BEQ_CentroidOffset(A-D)_adc>",
      guidePage: 11
    },
    {
      ref: 19,
      subsystem: "Dosimetry",
      name: "Spot Charge",
      satisfiedCondition:
        "Individual spot charge has not exceeded prescribed charge by configurable amount (using large of percent and absolute pC).",
      type: "1",
      class: "",
      enumId: "IL_DOSE_CHARGE",
      code: "dCharge",
      override: "Yes",
      guideName: "Spot Charge Limit",
      guideSatisfiedCondition:
        "Individual spot charge has not exceeded prescribed charge by configurable amount (using large of percent and absolute pC).",
      configFiles: "/Dosimetry.XML",
      configValues: "Interlock Tolerances: <spotChargeLimitTolMin_pC> <spotChargeLimitTolPercentage>",
      guidePage: 9
    },
    {
      ref: 20,
      subsystem: "Dosimetry",
      name: "Treatment Complete",
      satisfiedCondition:
        "The XYZ module indicates that the entire spot map was delivered without errors, meaning each spot received enough beam such that it was within the ‘floor’ of the target, below the max # of retries, and not so much that it tripped dCharge or dDose1/2. This is the only proper end to a beam delivery. Interlock will be satisfied when a field is loaded and go unsatisfied at the end of a successful treatment.",
      type: "1",
      class: "",
      enumId: "IL_DOSE_DONE",
      code: "dDone",
      override: "Yes",
      guideName: "Treatment Complete",
      guideSatisfiedCondition:
        "The XYZ module indicates that the entire spot map was delivered without errors, meaning each spot received enough beam such that it was within the ‘floor’ of the target, below the max # of retries, and not so much that it tripped dCharge or dDose1/2. This is the only proper end to a beam delivery. Interlock will be satisfied when a field is loaded and go unsatisfied at the end of a successful treatment.",
      configFiles: "/XYZ.XML",
      configValues:
        "Retry Parameters: <pulseRetryShortage_pC> <pulseRetryMinimum_pC> <pulseRetryCountLimit> <spotChargeFloor_pC> Dose Control Parameters: <subPulseCount>&<subPulsePercentage01-06>",
      guidePage: 9
    },
    {
      ref: 21,
      subsystem: "Dosimetry",
      name: "Environmental Sensors",
      satisfiedCondition:
        "Satisfied when All three temperature and all 3 pressure readings within configurable min and max values, and all 3 readings for each agree within configurable values.",
      type: "1",
      class: "",
      enumId: "IL_DOSE_ENVIRONMENT",
      code: "dENV",
      override: "Yes",
      guideName: "Dosimetry Environmentals",
      guideSatisfiedCondition:
        "All three temperature and all 3 pressure readings within configurable min and max values, and all 3 readings for each agree within configurable values. Values are checked and interlock transitions from unsatisfied to satisfied as part of normal workflow.",
      configFiles: "/Dosimetry.XML",
      configValues:
        "Max/Min Tolerances: <min_pressure_hPa> <max_pressure_hPa> <min_temperature_C> <max_temperature_C> Sensor Agreement Tolerances: <pressure_deviation_tolerance_hPa> <temperature_deviation_tolerance_C> Pressure Calibration Offsets: <us/dsY/dsX_pressure_offset_hPa>",
      guidePage: 10
    },
    {
      ref: 22,
      subsystem: "Dosimetry",
      name: "Spot / Pulse Position",
      satisfiedCondition:
        'Spot / Pulse location is within the configured tolerance. Includes fast (gross) position check, comparing max channel to target max channel (at TIC) and adjacency check. Includes a slower (Correlation Filter) position check, used to both compute the average error for the layer and individual error for pulses/spots (pulses shifted by the average error and charge-weighted-summed into spots). Interlocks only active for pulses above minimum charge thresholds, and no position evaluations are done if beam is in the "low charge" retry state until after enough charge has been collected. Number of bad pulses must surpass statistical limits before tripping interlock.',
      type: "1",
      class: "",
      enumId: "IL_DOSE_POSITION",
      code: "dPos",
      override: "Yes",
      guideName: "Spot/Pulse Position Limit",
      guideSatisfiedCondition:
        'Spot / Pulse location is within the configured tolerance. Includes fast (gross) position check, comparing max channel to target max channel (at TIC) and adjacency check. Includes a slower (Correlation Filter) position check, used to both compute the average error for the layer and individual error for pulses/spots (pulses shifted by the average error and charge-weighted-summed into spots). Interlocks only active for pulses above minimum charge thresholds, and no position evaluations are done if beam is in the "low charge" retry state until after enough charge has been collected. Number of bad pulses must surpass statistical limits before tripping interlock. Percent is based on percent of treatment delivered “so far”. (10,000 pulse treatment no more than 10 bad pulses in the first 1000 pulses)',
      configFiles: "/Dosimetry.XML",
      configValues:
        "Min Charge Thresholds for Fast Checks, X&Y: <doseplaneLowThreshold_pC> <upstreamTicLowThreshold_pC> <downstreamTicLowThreshold_pC> Interlock Tolerances: <avgLayerErrorLimit_mm> <upstreamPeakChannelTolerance> <downstreamPeakChannelTolerance> <chargeLevel(01-06)_pC> <errorToleranceLevel(01-06)_mm> (chargeLevel01 is min charge for slow checks) (chargeLevel02 is when charge-weighted centroid calculations become correlation filter fits) <positionOutOfTolPulseLimit> for statistical eval. <positionOutOfTolPercentageLimit>",
      guidePage: 10
    },
    {
      ref: 23,
      subsystem: "Dosimetry",
      name: "Layer Shift",
      satisfiedCondition: "Requested one-time X or Y layer shift is below configurable value.",
      type: "1",
      class: "",
      enumId: "IL_DOSE_LAYER_SHIFT",
      code: "dShift",
      override: "Yes",
      guideName: "Total Layer Shift",
      guideSatisfiedCondition: "Requested one-time X or Y layer shift is below configurable value.",
      configFiles: "/Dosimetry.XML",
      configValues: "Interlock Tolerance: <totalLayerShiftLimit_mm>",
      guidePage: 9
    },
    {
      ref: 24,
      subsystem: "Dosimetry",
      name: "Spot Size",
      satisfiedCondition:
        "Spot size is within the configurable tolerance; includes both pulse to pulse and layer average checks. Spot size is evaluated both pulse by pulse and at the end of a layer as a charge-weighted average for the entire layer.",
      type: "1",
      class: "",
      enumId: "IL_SPOT_SIZE",
      code: "dSize",
      override: "Yes",
      guideName: "Spot Size",
      guideSatisfiedCondition:
        "Spot size is within the configurable tolerance; includes both pulse to pulse and layer average checks. Spot size is evaluated both pulse by pulse and at the end of a layer as a charge-weighted average for the entire layer.",
      configFiles: "/Dosimetry.XML",
      configValues:
        "Targets for both X and Y: <us/dsExpectedSpotSize_mm> Interlock Tolerance: <avgSpotSizeTolerance_mm> <grossSpotSizeTolerance_mm>",
      guidePage: 10
    },
    {
      ref: 25,
      subsystem: "Gantry",
      name: "Inner-Outer Gantry Alignment",
      satisfiedCondition:
        "Satisfied when Outer Gantry and Inner gantry offset is within tolerance of prescribed offset",
      type: "1",
      class: "",
      enumId: "IL_GANTRY_ALIGNED",
      code: "gAlign",
      override: "Yes",
      guideName: "Gantry-CIG Alignment",
      guideSatisfiedCondition:
        "Satisfied when Outer Gantry and Inner gantry offset is within tolerance of prescribed offset",
      configFiles: "OuterGantryLookupTable.XM L OuterGantry.XML",
      configValues:
        "Contains table of gantry offsets used in determining prescribed OG-CIG Offset. <inner_outer_gantry_angle_toleran ce>",
      guidePage: 14
    },
    {
      ref: 26,
      subsystem: "Gantry",
      name: "Outer Gantry Encoder",
      satisfiedCondition: "Neither of the Outer Gantry load encoders indicate a fault",
      type: "2",
      class: "B,M",
      enumId: "IL_GANTRY_ENCODER",
      code: "gEnc",
      override: "Yes",
      guideName: "Outer Gantry Encoders",
      guideSatisfiedCondition: "Neither of the two Outer Gantry Load Encoders indicate a fault.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 13
    },
    {
      ref: 27,
      subsystem: "Gantry",
      name: "Outer Gantry Limit",
      satisfiedCondition: "The Outer Gantry is within the soft end-of-travel limits (B-limits).",
      type: "2",
      class: "B,M",
      enumId: "IL_GANTRY_LIMIT",
      code: "gLimit",
      override: "Yes",
      guideName: "Outer Gantry Limit",
      guideSatisfiedCondition: "The outer gantry is within the soft end-of-travel limits (B-limit switches).",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 13
    },
    {
      ref: 28,
      subsystem: "Gantry",
      name: "Outer Gantry Minimum Park Time",
      satisfiedCondition:
        "The Outer Gantry is outside the Park Cooling Safe Range, or when the Time Parked exceeds the lesser of the Time Away or the configurable Gantry Away From Park Timeout Time while within the Park Cooling Safe Range.",
      type: "1",
      class: "M",
      enumId: "IL_GANTRY_MINIMUM_PARK_TIME",
      code: "gParkT",
      override: "Yes",
      guideName: "Outer Gantry Minimum Park Time",
      guideSatisfiedCondition:
        "If either the OG is outside the Park Cooling Safe Range, or if the Time Parked exceeds the lesser of the Time Away or the configurable timeout while within the Park Cooling Safe Range.",
      configFiles: "OuterGantry.XML",
      configValues: "<park_position_deg> <cooling_position_deg> <time_away_timeout> <time_away_warning>",
      guidePage: 13
    },
    {
      ref: 29,
      subsystem: "Gantry",
      name: "Outer Gantry Park Zone",
      satisfiedCondition: "The Outer Gantry is within the configurable Park Cooling Safe Range.",
      type: "1",
      class: "C",
      enumId: "IL_GANTRY_PARKED",
      code: "gParkZ",
      override: "Yes",
      guideName: "Outer Gantry Park Zone",
      guideSatisfiedCondition: "The Outer Gantry is within the configurable Park Cooling Safe Range.",
      configFiles: "OuterGantry.XML",
      configValues: "<park_position_deg> <cooling_position_deg>",
      guidePage: 13
    },
    {
      ref: 30,
      subsystem: "Gantry",
      name: "Outer Gantry READY",
      satisfiedCondition:
        "The Outer Gantry has successfully met the configuration specified by the TC for a given prescription.",
      type: "1",
      class: "B",
      enumId: "IL_GANTRY_READY",
      code: "gReady",
      override: "Yes",
      guideName: "Outer Gantry Ready",
      guideSatisfiedCondition:
        "The Outer Gantry has successfully met the configuration specified by the TC for a given prescription within the nominal 0.05deg tolerance.",
      configFiles: "OuterGantryLookupTable.XM L OuterGantry.XML",
      configValues:
        "Contains table of gantry offsets used in determining OG set-point. <position_tolerance_deg>",
      guidePage: 13
    },
    {
      ref: 31,
      subsystem: "Gantry",
      name: "Outer Gantry Slow Zone Speed",
      satisfiedCondition:
        "The PLC has not detected an excessive motor-encoder velocity in either of the Slow Speed Zones.",
      type: "2",
      class: "B,M",
      enumId: "IL_GANTRY_SLOW_VELOCITY",
      code: "gSpSZ",
      override: "No",
      guideName: "Outer Gantry Slow Zone Speed",
      guideSatisfiedCondition:
        "The PLC has not detected an excessive motor- encoder velocity in either of the Slow Speed Zones (A-limit switches).",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 13
    },
    {
      ref: 32,
      subsystem: "Gantry",
      name: "Outer Gantry Twist",
      satisfiedCondition:
        "The Outer Gantry's load encoders indicate that the arms are aligned to within the configurable Gantry Twist Max.",
      type: "2",
      class: "B,M",
      enumId: "IL_GANTRY_TWIST",
      code: "gTwist",
      override: "Yes",
      guideName: "Outer Gantry Twist",
      guideSatisfiedCondition:
        "The Outer Gantry's load encoders indicate that the arms are aligned to one another within the configurable Gantry Twist Max.",
      configFiles: "OuterGantry.XML",
      configValues: "<max_twist_deg>",
      guidePage: 13
    },
    {
      ref: 33,
      subsystem: "Gantry",
      name: "Outer Gantry Normal Zone Speed",
      satisfiedCondition:
        "The PLC has not detected an excessive motor-encoder velocity in the Normal Speed Zone.",
      type: "2",
      class: "B,M",
      enumId: "IL_GANTRY_VELOCITY",
      code: "gSpNZ",
      override: "No",
      guideName: "Outer Gantry Normal Zone Speed",
      guideSatisfiedCondition:
        "The PLC has not detected an excessive motor- encoder velocity in the Normal Speed Zone.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 13
    },
    {
      ref: 34,
      subsystem: "Treatment Room",
      name: "PA X-Ray Source Location",
      satisfiedCondition:
        "The PLC indicates that the source is at the retracted position as determined by the state and consistency of the secondary position sensors .",
      type: "1",
      class: "B,M",
      enumId: "IL_TREATMENT_XRAY_TUBE_RETRACTED",
      code: "tPAX",
      override: "No",
      guideName: "PA X-Ray Source Location",
      guideSatisfiedCondition:
        "The PLC indicates that the PA X-Ray source is at the retracted position as determined by the state and consistency of the secondary position sensors and the Outer Gantry is free to move anywhere.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 25
    },
    {
      ref: 35,
      subsystem: "Hospital",
      name: "Beam Enable Key",
      satisfiedCondition:
        "Satisfied when MCC is communicating with the PLC and PLC reports True for Facility Beam Enable Key Enabled and False for Facility Beam Enable Key Disabled.",
      type: "1",
      class: "B",
      enumId: "IL_FACILITY_BEAM_KEY",
      code: "hBKey",
      override: "No",
      guideName: "Beam Enable Key",
      guideSatisfiedCondition:
        "PLC reports that the Beam Enable key is enabled and any and all warning alarms and search keys have been activated, if installed. This unsatisfies HMKey and prevents motion.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 15
    },
    {
      ref: 36,
      subsystem: "Hospital",
      name: "Console Key",
      satisfiedCondition:
        "Satisfied when MCC is communicating with the PLC and PLC reports True for Facility Console Key Enabled and False for Facility Console Key Disabled.",
      type: "1",
      class: "B,M,C",
      enumId: "IL_FACILITY_CONSOLE_KEY",
      code: "hCKey",
      override: "No",
      guideName: "Console Key",
      guideSatisfiedCondition:
        "PLC reports console key is enabled. Locks TC when key is disabled or comms lost.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 14
    },
    {
      ref: 37,
      subsystem: "Hospital",
      name: "Emergency Off",
      satisfiedCondition:
        "Satisfied when MCC is communicating with the PLC and PLC reports True for Site Emergency Off Normal.",
      type: "1",
      class: "B,M,I",
      enumId: "IL_FACILITY_EMERGENCY_STOP",
      code: "hEmOff",
      override: "No",
      guideName: "Emergency Off",
      guideSatisfiedCondition: "PLC reports that none of the site Emergency Off buttons are engaged.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 14
    },
    {
      ref: 38,
      subsystem: "Hospital",
      name: "Lower Vault Door",
      satisfiedCondition:
        "Satisfied when MCC is communicating with the PLC and PLC reports True for Lower Vault Door Closed.",
      type: "1",
      class: "B,M",
      enumId: "IL_FACILITY_LOWER_VAULT_DOOR",
      code: "hVault",
      override: "Yes",
      guideName: "Lower Vault Door",
      guideSatisfiedCondition:
        "PLC reports that the lower vault door is closed and has sounded the 30-second warning alarm.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 14
    },
    {
      ref: 39,
      subsystem: "Hospital",
      name: "Maintenance Hatch",
      satisfiedCondition:
        "Satisfied when MCC is communicating with the PLC and PLC reports True for Maintenance Hatch Closed.",
      type: "1",
      class: "B,M",
      enumId: "IL_FACILITY_MAINTENANCE_HATCH",
      code: "hMaint",
      override: "Yes",
      guideName: "Maintenance Hatch",
      guideSatisfiedCondition: "PLC reports that the upper maintenance hatch door is closed.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 14
    },
    {
      ref: 40,
      subsystem: "Hospital",
      name: "Motion Enable Key",
      satisfiedCondition:
        "Satisfied when MCC is communicating with the PLC and PLC reports False for Facility Beam Enable Key Enabled and True for Facility Beam Enable Key Disabled.",
      type: "1",
      class: "M",
      enumId: "IL_FACILITY_MOTION_KEY",
      code: "hMKey",
      override: "No",
      guideName: "Motion Enable Key",
      guideSatisfiedCondition:
        "PLC reports that the Motion Enable key is enabled. This unsatisfies HBKey and prevents beam.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 15
    },
    {
      ref: 41,
      subsystem: "Hospital",
      name: "Secondary UPS",
      satisfiedCondition:
        "Unsatisfied when any of the conditions below have existed for more than the user configurable time period: o No communications with cyclotron PLC o UPS not on AC power o Battery not charged o Interface not OK o Battery not healthy o UPS overloaded o UPS faulted",
      type: "2",
      class: "B,C",
      enumId: "IL_FACILITY_SECONDARY_UPS",
      code: "hUPSSc",
      override: "Yes",
      guideName: "Secondary UPS",
      guideSatisfiedCondition:
        "Secondary UPS has not lost communications, gone off AC power, lost battery charge or health, overloaded, or faulted, for a configurable amount of time.",
      configFiles: "/UPS.XML",
      configValues: "UREQ_FACILITY_CFG_SECONDAR Y_UPS_ERROR_CONDITION_TIMEO UT_SECONDS",
      guidePage: 15
    },
    {
      ref: 42,
      subsystem: "Hospital",
      name: "UPS on AC",
      satisfiedCondition: 'Satisfied when the Site UPS is on AC (Not "On Battery")',
      type: "1",
      class: "B,C",
      enumId: "IL_FACILITY_UPS_ON_AC_POWER",
      code: "hUPSAC",
      override: "No",
      guideName: "UPS on AC",
      guideSatisfiedCondition: "Primary UPS is on AC Power (Not Battery).",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 15
    },
    {
      ref: 43,
      subsystem: "Hospital",
      name: "UPS",
      satisfiedCondition:
        "Satisfied when the Site UPS is on AC or on Battery for less than the configurable period (default 15 seconds)",
      type: "2",
      class: "B",
      enumId: "IL_FACILITY_UPS_ON_BATTERY",
      code: "hUPSTO",
      override: "No",
      guideName: "UPS on Battery",
      guideSatisfiedCondition:
        "Primary UPS is on AC Power (or Battery for less than the configurable timeout).",
      configFiles: "/UPS.XML",
      configValues: "UREQ_FACILITY_CFG_UPS_ON_BA TTERY_TIMEOUT_SECONDS",
      guidePage: 15
    },
    {
      ref: 44,
      subsystem: "Hospital",
      name: "UPS Status",
      satisfiedCondition:
        "Satisfied when the PLC reports the site UPS is operational: Not faulted, Not Battery Low, Not in Static Bypass and Not in Maintenance Bypass",
      type: "2",
      class: "B,C",
      enumId: "IL_FACILITY_UPS_OPERATIONAL",
      code: "hUPSSt",
      override: "Yes",
      guideName: "UPS Status",
      guideSatisfiedCondition:
        "Primary UPS is operational: not faulted, bypassed, or lost battery charge for configurable timeouts.",
      configFiles: "/UPS.XML",
      configValues:
        "UREQ_FACILITY_CFG_UPS_BYPAS S_TIMEOUT_SECONDS UREQ_FACILITY_CFG_UPS_FAULT ED_TIMEOUT_SECONDS UREQ_FACILITY_CFG_UPS_MAINT ENANCE_TIMEOUT_SECONDS UREQ_FACILITY_CFG_UPS_NOT_C HARGED_TIMEOUT_SECONDS",
      guidePage: 16
    },
    {
      ref: 45,
      subsystem: "Hospital",
      name: "Treatment Room Door",
      satisfiedCondition:
        "Satisfied when MCC is communicating with the PLC and PLC reports True for Vault Door Closed (Treatment Room Door)",
      type: "1",
      class: "B",
      enumId: "IL_FACILITY_VAULT_DOOR",
      code: "hDoor",
      override: "Yes",
      guideName: "Treatment Room Door",
      guideSatisfiedCondition:
        "PLC reports that the treatment room door (also called “vault door”) is closed.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 15
    },
    {
      ref: 46,
      subsystem: "HSS",
      name: "Hardwired Safety System C-Inner Gantry/Couch Motion Key",
      satisfiedCondition: "Satisfied when the HSS CIG/Couch Motion Override Key is OFF",
      type: "2",
      class: "B,M",
      enumId: "IL_HSS_CIG_COUCH_MOTION",
      code: "hHSSCC",
      override: "Yes",
      guideName: "HSS CIG/Couch Motion Key",
      guideSatisfiedCondition: "HSS CIG/Couch Motion Override Key is OFF",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 16
    },
    {
      ref: 47,
      subsystem: "HSS",
      name: "Hardwired Safety System Outer Gantry Motion Key",
      satisfiedCondition: "Satisfied when the HSS OG Motion Override Key is OFF",
      type: "2",
      class: "B,M",
      enumId: "IL_HSS_OG_MOTION",
      code: "hHSSOG",
      override: "Yes",
      guideName: "HSS OG Motion Key",
      guideSatisfiedCondition: "HSS OG Motion Override Key is OFF",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 16
    },
    {
      ref: 48,
      subsystem: "HSS",
      name: "Hardwired Safety System Status",
      satisfiedCondition: "Satisfied when the HSS Status is Clear",
      type: "1",
      class: "B",
      enumId: "IL_HSS_STATUS",
      code: "hHSSSt",
      override: "No",
      guideName: "Hardwired Safety System Status",
      guideSatisfiedCondition:
        "Entire HSS chain is satisfied in hardware. Includes: Apertures, XYZ Status, Dosimetry Status, Doors, EMOs, and Keys. Check status on System Health: HSS tab.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 14
    },
    {
      ref: 49,
      subsystem: "Ion Source",
      name: "Ion Source Gas Flow Ready",
      satisfiedCondition: "Satisfied when the IS Gas Flow has been enabled for 5 seconds",
      type: "1",
      class: "B",
      enumId: "IL_ION_SOURCE_GAS_FLOW_FOR_READY",
      code: "iGRdy",
      override: "Yes",
      guideName: "Ion Source Gas Flow Ready",
      guideSatisfiedCondition:
        "Ion Source Gas Flow has been enabled for 5 seconds. Gas flow is enabled using “Start/Done Beam Prep” or manually on the Ion Source tab.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 17
    },
    {
      ref: 50,
      subsystem: "Ion Source",
      name: "Ion Source Gas Flow Rate",
      satisfiedCondition:
        "Satisfied when the IS Gas Flow is enabled and the rate is within configurable tolerance over a sliding 10 second window",
      type: "1",
      class: "B",
      enumId: "IL_ION_SOURCE_GAS_FLOW_FOR_TERMINATE",
      code: "iGRate",
      override: "Yes",
      guideName: "Ion Source Gas Flow Rate",
      guideSatisfiedCondition:
        "Ion Source Gas Flow is enabled and the rate is within configurable tolerance over a sliding 10 second window.",
      configFiles: "IonSource.XML",
      configValues: "UREQ_IS_CFG_H2_FLOW_DEVIATION _PERCENT_MAX Nominally set to 20%.",
      guidePage: 17
    },
    {
      ref: 51,
      subsystem: "Ion Source",
      name: "Ion Source Gas Flow Maximum Time",
      satisfiedCondition:
        "Satisfied while the IS Gas Flow has not been enabled continuously for more than the configurable time.",
      type: "1",
      class: "B",
      enumId: "IL_ION_SOURCE_GAS_FLOW_TIME_LIMIT",
      code: "iGTime",
      override: "Yes",
      guideName: "Ion Source Gas Flow Maximum Time",
      guideSatisfiedCondition:
        "Ion Source Gas Flow has not been enabled continuously for more than the configurable time.",
      configFiles: "IonSource.XML",
      configValues: "UREQ_IS_CFG_H2_FLOW_TIME_SECO NDS_MAX Nominally set to 1 hour.",
      guidePage: 17
    },
    {
      ref: 52,
      subsystem: "Ion Source",
      name: "Ion Source Pulser Chassis Voltage",
      satisfiedCondition:
        "Satisfied while the Ion Source Cathode actual Voltage Readback differs from the setpoint by less than 'Max Voltage Deviation' (on the Service screen).",
      type: "1",
      class: "B",
      enumId: "IL_ION_SOURCE_PSUPP_VOLTAGE",
      code: "iPCV",
      override: "Yes",
      guideName: "Ion Source Pulser Chassis Voltage",
      guideSatisfiedCondition:
        "Actual Ion Source Cathode Voltage Readback differs from the set-point by less than the configurable 'Max Voltage Deviation' percentage.",
      configFiles: "IonSource.XML",
      configValues: "UREQ_IS_CFG_VDC_DEVIATION Nominally set to 25%.",
      guidePage: 17
    },
    {
      ref: 53,
      subsystem: "Magnet",
      name: "Coil Positioning",
      satisfiedCondition:
        "Satisfied when the cold mass is in position as determined by both magnetic field sensors. Note: mACP interlock status is not monitored after entry to Beam Ready or Beam On, therefore mACP interlock will not change in those states. It is monitored in Beam Pause.",
      type: "1",
      class: "",
      enumId: "IL_MAGNET_ADAPTIVE_COIL_POSITIONER",
      code: "mACP",
      override: "Yes",
      guideName: "Magnet Coil Position (ACP)",
      guideSatisfiedCondition:
        "The cold mass is in position as determined by both magnetic field (Hall) sensors, within configurable tolerance of configurable targets.",
      configFiles: "/ACP Parameters.XML",
      configValues:
        "<hallPosTolerance_vdc> (Hall Tolerance in Volts) <OuterGantryMappings> (For Each Gantry Angle) <left_position> (Hall Target in Volts) <right_position> (Hall Target in Volts)",
      guidePage: 20
    },
    {
      ref: 54,
      subsystem: "Magnet",
      name: "Magnet Charged",
      satisfiedCondition:
        "Satisfied when communication with the DMM is established, communication with the cyclotron PLC is established, bit MAGNET_BOOL_IO_MAG_DCCT_NORMAL is true, and the magnet current is within a configurable plus/minus tolerance of the configurable commissioned magnet current Setpoint.",
      type: "1",
      class: "B",
      enumId: "IL_MAGNET_CHARGED",
      code: "mChgd",
      override: "Yes",
      guideName: "Magnet Charged",
      guideSatisfiedCondition:
        "Magnet current is within a configurable plus/minus tolerance of the configurable commissioned magnet current set-point.",
      configFiles: "/MagnetPS.XML",
      configValues:
        "UREQ_MAGNET_CFG_COMMISSIONED_CURRENT _SETPOINT UREQ_MAGNET_CFG_COMMISSIONED_CURRENT _MARGIN Nominally set to ±10 Amps.",
      guidePage: 18
    },
    {
      ref: 55,
      subsystem: "Magnet",
      name: "Magnet Treatment Ready",
      satisfiedCondition:
        "Satisfied when communication with the DMM is established, communication with the cyclotron PLC is established, bit MAGNET_BOOL_IO_MAG_DCCT_NORMAL is true, the magnet power supply is in state REGULATION, and the magnet current is within the configurable magnet power supply current tolerance for more than 10 seconds. Unsatisfied at all other times.",
      type: "1",
      class: "B",
      enumId: "IL_MAGNET_TREATMENT_READY",
      code: "mTrdy",
      override: "Yes",
      guideName: "Magnet Treatment Ready",
      guideSatisfiedCondition:
        "Magnet power supply is in state REGULATION, and the magnet current is within the configurable magnet power supply current tolerance for more than 10 seconds.",
      configFiles: "/MagnetPS.XML",
      configValues:
        "UREQ_MAGNET_FINE_REGULATION_PID_CURREN T_HEAD_ROOM Nominally set to ±20 Amps, sets state to ‘Regulation’ UREQ_MAGNET_POWER_SUPPLY_CURRENT_TOL ERANCE Nominally set to ±500 mAmps for the Mevion S250i.",
      guidePage: 18
    },
    {
      ref: 56,
      subsystem: "Magnet",
      name: "Magnet Cooling Capacity",
      satisfiedCondition:
        "Interlock only changes state when communications with helium pressure Newport is active. If communication active, satisfied when heater is above 0W, or at 0W for less than configurable time period.",
      type: "1",
      class: "B",
      enumId: "IL_MAGNET_COOLING_CAPACITY",
      code: "mCool",
      override: "Yes",
      guideName: "Magnet Cooling Capacity",
      guideSatisfiedCondition:
        "Cooling capacity (heater power) is above 0W, or at 0W for less than configurable time period. Interlock only changes state when there is an active helium pressure reading from the MIC.",
      configFiles: "/MIC.XML",
      configValues: "UREQ_MAGNET_HEATER_AT_ZERO_WATTS_MAXI MUM_TIME Nominally set to 15 Minutes.",
      guidePage: 18
    },
    {
      ref: 57,
      subsystem: "Magnet",
      name: "Magnet Cryostat Vacuum",
      satisfiedCondition:
        "Satisfied while Communication with the cyclotron PLC exists, no G4 error is reported, and the vacuum pressure is less than the configured maximum.",
      type: "2",
      class: "B,C",
      enumId: "IL_MAGNET_CRYOSTAT_VACUUM",
      code: "mCryoV",
      override: "Yes",
      guideName: "Magnet Cryostat Vacuum",
      guideSatisfiedCondition:
        "No error is reported on the gauge and the cryostat pressure is less than the configurable maximum.",
      configFiles: "/Vacuum.XML",
      configValues: "UREQ_VACUUM_CFG_G4_WARNING_PRESSURE UREQ_VACUUM_CFG_G4_INTERLOCK_PRESSURE",
      guidePage: 18
    },
    {
      ref: 58,
      subsystem: "Magnet",
      name: "Magnet Power Supply Self Protection Range",
      satisfiedCondition:
        "Satisfied when communication with the DMM is established, communication with the cyclotron PLC is established, the cyclotron PLC reports that the DMM is operational, and while Magnet current below configured slow discharge threshold.",
      type: "2",
      class: "B",
      enumId: "IL_MAGNET_CURRENT_SELF_PROTECTION",
      code: "mPSSP",
      override: "No",
      guideName: "Magnet Power Supply Self Protection Range",
      guideSatisfiedCondition:
        "The cyclotron PLC reports that the DMM is operational and Magnet current is below the configured slow discharge threshold.",
      configFiles: "/MagnetPS.XML",
      configValues: "UREQ_MAGNET_CURRENT_SLOW_DISCHARGE_T HRESHOLD Nominally set to 2025 amps.",
      guidePage: 18
    },
    {
      ref: 59,
      subsystem: "Magnet",
      name: "DCCT Status",
      satisfiedCondition:
        "Satisfied when communication with the DMM is established, communication with the cyclotron PLC is established, and bit MAGNET_BOOL_IO_MAG_DCCT_NORMAL is true.",
      type: "2",
      class: "B,C",
      enumId: "IL_MAGNET_DCCT_NORMAL_OPERATION",
      code: "mDCCT",
      override: "No",
      guideName: "Direct-Current Current Transformer Status",
      guideSatisfiedCondition: "Direct-Current Current Transformer (DCCT) is operating normally.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 18
    },
    {
      ref: 60,
      subsystem: "Magnet",
      name: "Helium Pressure",
      satisfiedCondition:
        "Unsatisfied while Helium pressure Newport is ONLINE AND 1. the helium pressure is greater than the configured helium pressure threshold UREQ_MAGNET_HELIUM _PRESSURE_THRESHOLD from MIC.xml OR 2. the helium pressue is less than or equal to 98% of the configured helium pressure threshold Setpoint 1 on Service Screen OR 3. communications have been lost with the Helium pressure Newport for more than 30 seconds. Satisfied at all other times. * NOTE: PERMIT SLOW DISCHARGE only occurs on an overpressure condition, item 1.",
      type: "1",
      class: "B,C",
      enumId: "IL_MAGNET_HELIUM_PRESSURE",
      code: "mHePrs",
      override: "Yes",
      guideName: "Helium Pressure",
      guideSatisfiedCondition:
        "Helium Pressure is below configurable maximum. Interlock only changes state when there is an active helium pressure reading from the MIC.",
      configFiles: "/MIC.XML",
      configValues: "UREQ_MAGNET_HELIUM_PRESSURE_THRESHOLD Nominally set to 22.5 psia.",
      guidePage: 19
    },
    {
      ref: 61,
      subsystem: "Magnet",
      name: "Magnet Low Temperature",
      satisfiedCondition:
        "Only changes state after the TC has sent TMUX setup data at least once and the TMUX is online. Satisfied unless at least one TMUX temperature, which warning has not been disabled, exceeds the individually configurable Warning threshold.",
      type: "1",
      class: "B,C",
      enumId: "IL_MAGNET_LEAD_TEMPERATURE",
      code: "mTempL",
      override: "Yes",
      guideName: "Magnet Lead Warning (Low) Temperatures",
      guideSatisfiedCondition:
        "No TMUX temperature value exceeds configurable warning threshold on Magnet: Setup tab.",
      configFiles: "/Magnet.XML",
      configValues: "<limit> Per TMUX value <disable_temperature_warning> Per TMUX value",
      guidePage: 19
    },
    {
      ref: 62,
      subsystem: "Magnet",
      name: "LEM / DCCT Tolerance",
      satisfiedCondition:
        "Satisfied when communication with the DMM is established, communication with the cyclotron PLC is established, bit MAGNET_BOOL_IO_MAG_DCCT_NORMAL is true, communications with both QDSPs are established, and the two LEM current values and DCCT current are within the LEM/DCCT Current Variance threshold.",
      type: "1",
      class: "B,C",
      enumId: "IL_MAGNET_LEM_DCCT_TOLERANCE",
      code: "mLEM",
      override: "Yes",
      guideName: "LEM / DCCT Tolerance",
      guideSatisfiedCondition:
        "DCCT is operating normally, comms exists with both QDSPs, and two LEM current values are within configurable tolerance of DCCT reading.",
      configFiles: "/MagnetPS.XML",
      configValues: "UREQ_MAGNET_LEM_DCCT_CURRENT_VARIANCE _SETPOINT",
      guidePage: 19
    },
    {
      ref: 63,
      subsystem: "Magnet",
      name: "Molded Case Switches",
      satisfiedCondition:
        "Satisfied when communication with the cyclotron PLC is established, and MAGNET_BOOL_IO_MAG_MCS_5VDC_PRESENT, MAGNET_BOOL_IO_MAG_MCS_FIBER_OK, MAGNET_BOOL_IO_MAG_MCS_24VDC_PRESENT, MAGNET_BOOL_IO_MAG_MCS_FUSE_CONTINUITY, MAGNET_BOOL_IO_MAG_MCS_CONTACTOR_CONTINUITY are all true.",
      type: "2",
      class: "B,C",
      enumId: "IL_MAGNET_MCS_OK",
      code: "mMCS",
      override: "No",
      guideName: "Molded Case Switches",
      guideSatisfiedCondition:
        "MCS power supplies, QDSP fibers, magnet ground fuse and VFD line contactor status are all OK.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 19
    },
    {
      ref: 64,
      subsystem: "Magnet",
      name: "QDSP 1 Communications",
      satisfiedCondition:
        "Satisfied when QDSP 1's heartbeat has changed at least once in the past 6 seconds.",
      type: "1",
      class: "B,C",
      enumId: "IL_MAGNET_QDSP_1_COMMUNICATION",
      code: "mQDSP1",
      override: "Yes",
      guideName: "QDSP 1 Communications",
      guideSatisfiedCondition:
        "Satisfied when QDSP 1's heartbeat has changed at least once in the past 6 seconds.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 19
    },
    {
      ref: 65,
      subsystem: "Magnet",
      name: "QDSP 2 Communications",
      satisfiedCondition:
        "Satisfied when QDSP 2's heartbeat has changed at least once in the past 6 seconds.",
      type: "1",
      class: "B,C",
      enumId: "IL_MAGNET_QDSP_2_COMMUNICATION",
      code: "mQDSP2",
      override: "Yes",
      guideName: "QDSP 2 Communications",
      guideSatisfiedCondition:
        "Satisfied when QDSP 2's heartbeat has changed at least once in the past 6 seconds.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 20
    },
    {
      ref: 66,
      subsystem: "Magnet",
      name: "QDSP Enabled",
      satisfiedCondition:
        "Satisfied when communication with the DMM is established, communication with the cyclotron PLC is established, bit MAGNET_BOOL_IO_MAG_DCCT_NORMAL is true, and the DMM reported current is less than 400 amps OR Both QDSP #1 and #2 report bit QDSP_BOOL_QDSP_ENABLED as true.",
      type: "1",
      class: "B,C",
      enumId: "IL_MAGNET_QDSP_ENABLED",
      code: "mQDSP",
      override: "No",
      guideName: "QDSP Enabled",
      guideSatisfiedCondition:
        "DCCT is operating normally and DMM reports less than 400 amps or both QDSPs are enabled.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 20
    },
    {
      ref: 67,
      subsystem: "Magnet",
      name: "QDSP Power Supply",
      satisfiedCondition:
        "Unsatisfied when communication with the DMM is established, communication with the cyclotron PLC is established, bit MAGNET_BOOL_IO_MAG_DCCT_NORMAL is true, the DMM reported current is greater than 400 amps, and any of the following bits from the PLC are false: MAGNET_BOOL_XLOCK_INPUT_DATA_VALID, MAGNET_BOOL_QDSP_PS1_STATUS, MAGNET_BOOL_QDSP_PS2_STATUS. Satisfied at all other times.",
      type: "2",
      class: "B,C",
      enumId: "IL_MAGNET_QDSP_POWER_SUPPLY",
      code: "mQDSPP",
      override: "Yes",
      guideName: "QDSP Power Supply",
      guideSatisfiedCondition:
        "DCCT is operating normally and DMM reports less than 400 amps or both power supplies enabled.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 20
    },
    {
      ref: 68,
      subsystem: "Magnet",
      name: "Magnet Slow Discharge Assembly",
      satisfiedCondition: "Unsatisfied when the slow discharge MCS is open. Satisfied when it is closed.",
      type: "1",
      class: "B,C",
      enumId: "IL_MAGNET_SDA_COOLDOWN",
      code: "mSDA",
      override: "Yes",
      guideName: "Magnet Slow Discharge Assembly",
      guideSatisfiedCondition: "Magnet Slow Discharge Assembly MCS is closed.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 20
    },
    {
      ref: 69,
      subsystem: "Magnet",
      name: "Magnet High Temperature",
      satisfiedCondition:
        'Unsatisfied when: 1. Communication with the TMUX exists, the TC has sent TMUX setup at least once, the last TMUX setup was valid, a tmux RTD was above the configured value for more than the configured time, and the TC has not set the "slow discharge disable" for that particular TMUX channel. -OR- 2. The magnet lead positive terminal temperature is known and exceeds the configured maximum. -OR- 3. The magnet lead negative terminal temperature is known and exceeds the configured maximum. Satisfied at all other times.',
      type: "1",
      class: "B,C",
      enumId: "IL_MAGNET_TEMPERATURES",
      code: "mTempH",
      override: "Yes",
      guideName: "Magnet Lead Discharge (High) Temperatures",
      guideSatisfiedCondition:
        "No TMUX temperature value exceeds configurable slow discharge threshold on Magnet: Setup Tab. Additionally, neither External Lead exceeds configurable maximum temperature threshold.",
      configFiles: "/Magnet.XML /MIC.XML",
      configValues:
        "<slow_discharge_temperature_threshold> Per TMUX value <disable_slow_discharge> Per TMUX value UREQ_MAGNET_MIC_POSITIVE_LEAD_TEMPERATU RE_THRESHOLD UREQ_MAGNET_MIC_NEGATIVE_LEAD_TEMPERAT URE_THRESHOLD",
      guidePage: 19
    },
    {
      ref: 70,
      subsystem: "RF",
      name: "RF Control Module Loaded",
      satisfiedCondition:
        "Satisfied when the Triggers and Delays loaded into RFCM by MCC and verified by readback, and RFCM is Online and is in correct state (Enabled or higher)",
      type: "1",
      class: "B",
      enumId: "IL_RF_RFCM_LOADED",
      code: "rfCMLd",
      override: "Yes",
      guideName: "RF Control Module Loaded",
      guideSatisfiedCondition:
        "Triggers and Delays loaded into RFCM by MCC and verified by readback, and RFCM is Online and is in correct state (Enabled or higher). Additionally, no errors have been detected. See log for “RFCM Error Register has changed. Reads: ########. “",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 21
    },
    {
      ref: 71,
      subsystem: "RF",
      name: "RF Control Module Status",
      satisfiedCondition:
        "Unsatisfied when the RFCM has been ON longer than Max_Time_Duration, or the RFCM indicates error state, or RFCM state does not match expected RFCM state, or RFCM rejects specific commands, or loss of Heartbeat from RFCM to MCC, or override bit in RFCM is set to 1.",
      type: "1",
      class: "B",
      enumId: "IL_RF_CONTROL_MODULE_OPERATIONAL",
      code: "rfCMSt",
      override: "Yes",
      guideName: "RF Control Module Status",
      guideSatisfiedCondition:
        "RFCM has been on less than the configurable max time, has no errors, the state matches the expected state, no rejected commands, no loss of Heartbeat from RFCM to MCC, and no RFCM overrides are enabled (RF: RFCM Diagnostics tab).",
      configFiles: "/RF.XML",
      configValues: "UREQ_RF_CFG_MAXIMUM_RF_ON_DURATION_ MINUTES",
      guidePage: 21
    },
    {
      ref: 72,
      subsystem: "RF",
      name: "RF DC Bias Power Supply Voltage",
      satisfiedCondition:
        "Satisfied while the absolute value of the RF DC BIAS Power Supply Voltage Readback is greater than the RF DC Bias Voltage Interrupt value (on Service screen).",
      type: "1",
      class: "B",
      enumId: "IL_RF_DC_BIAS_POWER_SUPPLY_VOLTAGE",
      code: "rfDCBV",
      override: "No",
      guideName: "RF DC Bias Power Supply Voltage",
      guideSatisfiedCondition:
        "Satisfied while the absolute value of the RF DC BIAS Power Supply Voltage Readback is greater than the absolute value of the configurable Interrupt value.",
      configFiles: "/RF.XML",
      configValues:
        "UREQ_RF_CFG_DC_BIAS_VOLTAGE_WARNIN G_SETPOINT UREQ_RF_CFG_DC_BIAS_VOLTAGE_INTERRU PT_SETPOINT",
      guidePage: 21
    },
    {
      ref: 73,
      subsystem: "RF",
      name: "RF DC Bias Power Supply Current",
      satisfiedCondition:
        "Satisfied while the RF DC BIAS Power Supply Current Readback is less than the Rf DC Bias Current Terminate value (on Service screen)",
      type: "1",
      class: "B",
      enumId: "IL_RF_DC_BIAS_POWER_SUPPLY_CURRENT",
      code: "rfDCBI",
      override: "No",
      guideName: "RF DC Bias Power Supply Current",
      guideSatisfiedCondition:
        "Satisfied while the RF DC BIAS Power Supply Current Readback is less than the configurable RF DC Bias Current Terminate value.",
      configFiles: "/RF.XML",
      configValues:
        "UREQ_RF_CFG_DC_BIAS_CURRENT_WARNIN G_SETPOINT UREQ_RF_CFG_DC_BIAS_CURRENT_TERMINA TE_SETPOINT",
      guidePage: 21
    },
    {
      ref: 74,
      subsystem: "RF",
      name: "Rotating Capacitor Speed",
      satisfiedCondition:
        "The ROTC's velocity is within its configurable tolerance of its configurable Speed Normal.",
      type: "1",
      class: "B",
      enumId: "IL_RF_ROTC_SPEED_TARGET",
      code: "rRotCS",
      override: "Yes",
      guideName: "Rotating Capacitor Normal Speed",
      guideSatisfiedCondition:
        "The ROTC's velocity is within the configurable tolerance of the configurable Normal Speed.",
      configFiles: "/ROTC.XML",
      configValues: "<speed_normal> Nominally set to 63 Hz. <tolerance_speed_normal> Nominally set to 4 Hz.",
      guidePage: 21
    },
    {
      ref: 75,
      subsystem: "RF",
      name: "Rotating Capacitor Idle",
      satisfiedCondition:
        "The ROTC's velocity is greater than its configurable Speed Idle minus its configurable tolerance.",
      type: "1",
      class: "B,C",
      enumId: "IL_RF_ROTC_SPEED_IDLE",
      code: "rRotCI",
      override: "Yes",
      guideName: "Rotating Capacitor Idle Speed",
      guideSatisfiedCondition:
        "The ROTC's velocity is greater than the configurable Idle Speed minus the configurable tolerance.",
      configFiles: "/ROTC.XML",
      configValues: "<speed_idle> Nominally set to 10 Hz. <tolerance_speed_idle> Nominally set to 3 Hz.",
      guidePage: 21
    },
    {
      ref: 76,
      subsystem: "Treatment Room",
      name: "CAX Laser Location",
      satisfiedCondition: "Satisfied when the The CAX Laser is retracted",
      type: "1",
      class: "",
      enumId: "IL_CAX_RETRACTED",
      code: "tCAX",
      override: "Yes",
      guideName: "Central Axis Laser Location",
      guideSatisfiedCondition: "The CAX Laser is retracted",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 25
    },
    {
      ref: 77,
      subsystem: "Treatment Room",
      name: "C-Inner Gantry Motion",
      satisfiedCondition:
        "Unsatisfied upon detection of CIG Theta or Extension motion while in Beam Ready, Beam ON or Beam Paused.",
      type: "2",
      class: "B, M",
      enumId: "IL_TREATMENT_CIG_BEAM_ON_MOTION",
      code: "tCIGBM",
      override: "No",
      guideName: "C-Inner Gantry Motion",
      guideSatisfiedCondition:
        "No CIG Theta or Extension motion detected in Beam Ready, Beam On or Beam Pause.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 24
    },
    {
      ref: 78,
      subsystem: "Treatment Room",
      name: "C-Inner Gantry Speed",
      satisfiedCondition:
        "Unsatisfied upon detection of excess speed of the CIG Theta or Extension retraction away from the patient.",
      type: "2",
      class: "B, M",
      enumId: "IL_TREATMENT_CIG_SPEED",
      code: "tCIGSp",
      override: "No",
      guideName: "C-Inner Gantry Speed",
      guideSatisfiedCondition: "Any CIG Theta motion or Extension Retraction is below the speed thresholds.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 24
    },
    {
      ref: 79,
      subsystem: "Treatment Room",
      name: "C-Inner Gantry Extension Speed",
      satisfiedCondition:
        "Unsatisfied upon detection of excess speed of the CIG Extension towards the Patient. Interlock will be cleared (satisfied) by release of Enable Bars on the Hand Pendant.",
      type: "1",
      class: "B, M",
      enumId: "IL_TREATMENT_EXTENSION_SPEED",
      code: "tExtSp",
      override: "No",
      guideName: "C-Inner Gantry Extension Speed",
      guideSatisfiedCondition:
        "Cig Extension towards the patient is below the speed threshold. Interlock is cleared by releasing enable bars on the hand pendant.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 24
    },
    {
      ref: 80,
      subsystem: "Treatment Room",
      name: "Motion Allowed",
      satisfiedCondition: "Unsatisfied while S250i State is Beam Ready, Beam ON, or Beam Paused",
      type: "1",
      class: "M",
      enumId: "IL_TREATMENT_SYSTEM_STATE_FOR_MOTION",
      code: "tMotOK",
      override: "No",
      guideName: "Motion Allowed",
      guideSatisfiedCondition: "System State must not be Beam Ready, Beam On or Beam Pause.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 24
    },
    {
      ref: 81,
      subsystem: "Treatment Room",
      name: "Outer Gantry in Safe Zone for PA X-Ray Source",
      satisfiedCondition:
        "The Outer Gantry's position is less than or equal to the Gantry PA X-Ray Source Interference.",
      type: "1",
      class: "M",
      enumId: "IL_TREATMENT_OG_IN_XRAY_TUBE_SAFE_ZONE",
      code: "tPAXOG",
      override: "No",
      guideName: "Outer Gantry in Safe Zone for PA X-Ray Source",
      guideSatisfiedCondition:
        "The Outer Gantry's position is less than or equal to the Gantry PA X-Ray Source Interference threshold and the PA X-Ray Source is now free to deploy.",
      configFiles: "/OuterGantry.XML",
      configValues: "<xray_boundary> Nominally set to 136 degrees.",
      guidePage: 25
    },
    {
      ref: 82,
      subsystem: "Treatment Room",
      name: "C-Inner Gantry Motion Errors",
      satisfiedCondition:
        'Unsatisfied upon detection of a CIG PLC Motion Fault - includes unexpected motion: without "moving" indicator',
      type: "2",
      class: "B, M",
      enumId: "IL_TREATMENT_PLC_CIG_MOTION_ERRORS",
      code: "tCIGMt",
      override: "No",
      guideName: "C-Inner Gantry Motion Errors",
      guideSatisfiedCondition:
        "No CIG Motion Faults are detected, including unexpected motion without “moving” indicator or failure to meet stopping distance.",
      configFiles: "/OuterGantry.XML",
      configValues:
        "UREQ_CIG_THETA_STOPPING_DISTANCE UREQ_CIG_EXTENSION_STOPPING_DISTANCE UREQ_CIG_THETA_DEADBAND UREQ_CIG_EXTENSION_DEADBAND",
      guidePage: 24
    },
    {
      ref: 83,
      subsystem: "Treatment Room",
      name: "PA X-Ray Home",
      satisfiedCondition: "The PA X-Ray source has successfully homed.",
      type: "1",
      class: "B, I",
      enumId: "IL_TREATMENT_PSS_PA_XRAY_HOME",
      code: "tPAXHm",
      override: "Yes",
      guideName: "PA X-Ray Home",
      guideSatisfiedCondition:
        "The PA X-Ray source has successfully homed; homing is lost when power or comms are lost.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 25
    },
    {
      ref: 84,
      subsystem: "Treatment Room",
      name: "X-Ray Panel LAT Deployed Vertically",
      satisfiedCondition:
        "Satisfied when the LAT X-Ray Panel is Deployed Vertically - LAT vertical TRUE and Horizontal FALSE",
      type: "1",
      class: "I",
      enumId: "IL_TREATMENT_XRAY_PANEL_LAT_DEPLOYED",
      code: "tXPLat",
      override: "Yes",
      guideName: "X-Ray Panel LAT Deployed Vertically",
      guideSatisfiedCondition:
        "LAT X-Ray Panel is Deployed Vertically and PA X-Ray Panel is not stowed vertical",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 24
    },
    {
      ref: 85,
      subsystem: "Treatment Room",
      name: "X-Ray Panel PA Deployed Horizontally",
      satisfiedCondition:
        "Satisfied when the PA X-Ray Panel is Deployed Horizontally - PA vertical FALSE and Horizontal TRUE",
      type: "1",
      class: "I",
      enumId: "IL_TREATMENT_XRAY_PANEL_PA_DEPLOYED",
      code: "tXPPA",
      override: "Yes",
      guideName: "X-Ray Panel PA Deployed Horizontally",
      guideSatisfiedCondition: "PA X-Ray Panel is deployed horizontally.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 24
    },
    {
      ref: 86,
      subsystem: "Treatment Room",
      name: "X-Ray Panels in Safe Zone",
      satisfiedCondition:
        "Satisfied when MCC is communicating with the PLC and PLC reports True for Treatment X-Ray Panels CIG Safe.",
      type: "1",
      class: "B",
      enumId: "IL_TREATMENT_XRAY_PANELS_CIG_SAFE",
      code: "tXPSZ",
      override: "Yes",
      guideName: "X-Ray Panels in Safe Zone",
      guideSatisfiedCondition: "X-Ray panels are retracted and CIG is safe to move.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 24
    },
    {
      ref: 87,
      subsystem: "Treatment Room",
      name: "X-Ray Panels Deployed",
      satisfiedCondition:
        "Satisfied when MCC is communicating with the PLC and PLC reports True for Treatment X-Ray Panels Extended.",
      type: "1",
      class: "I",
      enumId: "IL_TREATMENT_XRAY_PANELS_EXTENDED",
      code: "tXPExt",
      override: "Yes",
      guideName: "X-Ray Panels Deployed",
      guideSatisfiedCondition: "X-ray panels are extended (deployed).",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 24
    },
    {
      ref: 88,
      subsystem: "Treatment Room",
      name: "PA X-Ray Source Extended",
      satisfiedCondition:
        "The PA X-Ray source's resolver position is within its configurable tolerance of its configurable Treatment Position, and also that the PLC indicates that the source is at the treatment position as determined by the state and consistency of the secondary position sensors .",
      type: "1",
      class: "I",
      enumId: "IL_TREATMENT_XRAY_TUBE_EXTENDED",
      code: "tXSrcE",
      override: "Yes",
      guideName: "PA X-Ray Source Extended",
      guideSatisfiedCondition:
        "The PA X-Ray source's resolver position is within its configurable tolerance of its configurable Treatment Position, and the PLC indicates that the secondary position sensors are satisfied.",
      configFiles: "/XRay.XML",
      configValues: "<PaTreatmentPosition> <PaTolerance>",
      guidePage: 25
    },
    {
      ref: 89,
      subsystem: "Vacuum",
      name: "Cyclotron Vacuum Chamber Pressure for Beam Prep",
      satisfiedCondition:
        "Satisfied when actual Cyclotron Pressure (G3) is less than the Beam Prep value (on Service screen)",
      type: "1",
      class: "B",
      enumId: "IL_VACUUM_CYCLOTRON_PRESSURE_PREP",
      code: "vPrep",
      override: "Yes",
      guideName: "Cyclotron Beam Chamber Pressure for Beam Prep",
      guideSatisfiedCondition:
        "Actual Cyclotron Beam Chamber Vacuum Pressure (G3) is less than the configurable threshold value required for the state Beam Prep.",
      configFiles: "/Vacuum.XML",
      configValues: "UREQ_VACUUM_CFG_MAX_G3_BEAM_PREP_PRES SURE",
      guidePage: 28
    },
    {
      ref: 90,
      subsystem: "Vacuum",
      name: "Cyclotron Vacuum Chamber Pressure for Beam ON",
      satisfiedCondition:
        "Satisfied when actual Cyclotron Pressure (G3) is less than the Beam ON value (on Service screen)",
      type: "1",
      class: "B",
      enumId: "IL_VACUUM_CYCLOTRON_PRESSURE_BEAM_ON",
      code: "vBeam",
      override: "Yes",
      guideName: "Cyclotron Beam Chamber Pressure for Beam ON",
      guideSatisfiedCondition:
        "Actual Cyclotron Beam Chamber Vacuum Pressure (G3) is less than the configurable threshold value required for the state Beam On.",
      configFiles: "/Vacuum.XML",
      configValues: "UREQ_VACUUM_CFG_MAX_G3_BEAM_ON_PRESSU RE",
      guidePage: 28
    },
    {
      ref: 91,
      subsystem: "Vacuum",
      name: "Cyclotron Vacuum Chamber Pressure for Beam Interrupt",
      satisfiedCondition:
        "Satisfied when actual Cyclotron Pressure (G3) is less than the Beam Interrupt value (on Service screen)",
      type: "1",
      class: "B",
      enumId: "IL_VACUUM_CYCLOTRON_PRESSURE_BEAM_INT",
      code: "vInt",
      override: "Yes",
      guideName: "Cyclotron Beam Chamber Pressure for Beam Interrupt",
      guideSatisfiedCondition:
        "Actual Cyclotron Beam Chamber Vacuum Pressure (G3) is less than the configurable threshold value required for the state Beam Interrupt (Pause).",
      configFiles: "/Vacuum.XML",
      configValues: "UREQ_VACUUM_CFG_MAX_G3_BEAM_INTERRUPT _PRESSURE",
      guidePage: 28
    },
    {
      ref: 92,
      subsystem: "Vacuum",
      name: "Cyclotron Vacuum Chamber Pressure for Beam Terminate",
      satisfiedCondition:
        "Satisfied when actual Cyclotron Pressure (G3) is less than the Beam Terminate value (on Service screen)",
      type: "1",
      class: "B",
      enumId: "IL_VACUUM_CYCLOTRON_PRESSURE_BEAM_TERM",
      code: "vTerm",
      override: "No",
      guideName: "Cyclotron Beam Chamber Pressure for Beam Terminate",
      guideSatisfiedCondition:
        "Actual Cyclotron Beam Chamber Vacuum Pressure (G3) is less than the configurable threshold value required for the state Beam Terminate.",
      configFiles: "/Vacuum.XML",
      configValues: "UREQ_VACUUM_CFG_MAX_G3_BEAM_TERMINATE _PRESSURE",
      guidePage: 28
    },
    {
      ref: 93,
      subsystem: "Water / Cooling",
      name: "Heat Exchanger Water Source",
      satisfiedCondition:
        "Satisfied when PLC indicates Heat Exchanger Position TRUE and City Water Bypass Position FALSE",
      type: "2",
      class: "B,C",
      enumId: "IL_FACILITY_RECIRCULATED_WATER",
      code: "WHExS",
      override: "Yes",
      guideName: "Heat Exchanger Water Source",
      guideSatisfiedCondition:
        "System is not on City Water Bypass and heat exchangers are operating normally.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 29
    },
    {
      ref: 94,
      subsystem: "Water / Cooling",
      name: "Heat Exchanger Cyclotron A1",
      satisfiedCondition:
        "Satisfied when communication with the cyclotron PLC exists, and FACILITY_BOOL_H2O_HEAT_EXCHANGER_A1_OK is true.",
      type: "2",
      class: "B",
      enumId: "IL_MAGNET_HEAT_EXCHANGER_1",
      code: "wHEx1",
      override: "Yes",
      guideName: "Cryo-Compressor Heat ExchangerA1",
      guideSatisfiedCondition:
        "Cryo Compressor Heat Exchanger (A1) is operating normally with a chilled water temp below 23°C.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 29
    },
    {
      ref: 95,
      subsystem: "Water / Cooling",
      name: "Heat Exchanger RF Amp A2",
      satisfiedCondition:
        "Satisfied when communication with the cyclotron PLC exists, and FACILITY_BOOL_H2O_HEAT_EXCHANGER_A2_OK is true.",
      type: "2",
      class: "B",
      enumId: "IL_MAGNET_HEAT_EXCHANGER_2",
      code: "wHEx2",
      override: "Yes",
      guideName: "RF Amp Heat Exchanger A2",
      guideSatisfiedCondition:
        "RF Amplifier Heat Exchanger (A2) is operating normally with a chilled water temp below 23°C.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 29
    },
    {
      ref: 96,
      subsystem: "Water / Cooling",
      name: "Heat Exchanger Magnet A3",
      satisfiedCondition:
        "Satisfied when communication with the cyclotron PLC exists, and FACILITY_BOOL_H2O_HEAT_EXCHANGER_A3_OK is true.",
      type: "2",
      class: "B,C",
      enumId: "IL_MAGNET_HEAT_EXCHANGER_3",
      code: "wHEx3",
      override: "No",
      guideName: "Cyclotron Heat Exchanger A3",
      guideSatisfiedCondition:
        "Cyclotron Heat Exchanger (A3) is operating normally with a chilled water temp below 23°C.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 29
    },
    {
      ref: 97,
      subsystem: "Water / Cooling",
      name: "Cryogenic Compressor A8",
      satisfiedCondition:
        "Satisfied when communication with the cyclotron PLC exists, and FACILITY_BOOL_H2O_COMPRESSOR_A8_OK is true.",
      type: "2",
      class: "B,C",
      enumId: "IL_MAGNET_HELIUM_COMPRESSOR_STAGE_1",
      code: "wCryo8",
      override: "No",
      guideName: "Cryogenic Compressor A8",
      guideSatisfiedCondition: "Cryogenic Compressor (A8) is operating normally and is not faulted.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 29
    },
    {
      ref: 98,
      subsystem: "Water / Cooling",
      name: "Cryogenic Compressor A5",
      satisfiedCondition:
        "Satisfied when communication with the cyclotron PLC exists, and FACILITY_BOOL_H2O_COMPRESSOR_A5_OK is true.",
      type: "2",
      class: "B,C",
      enumId: "IL_MAGNET_HELIUM_COMPRESSOR_STAGE_2_UNIT_1",
      code: "wCryo5",
      override: "No",
      guideName: "Cryogenic Compressor A5",
      guideSatisfiedCondition: "Cryogenic Compressor (A5) is operating normally and is not faulted.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 29
    },
    {
      ref: 99,
      subsystem: "Water / Cooling",
      name: "Cryogenic Compressor A6",
      satisfiedCondition:
        "Satisfied when communication with the cyclotron PLC exists, and FACILITY_BOOL_H2O_COMPRESSOR_A6_OK is true.",
      type: "2",
      class: "B,C",
      enumId: "IL_MAGNET_HELIUM_COMPRESSOR_STAGE_2_UNIT_2",
      code: "wCryo6",
      override: "No",
      guideName: "Cryogenic Compressor A6",
      guideSatisfiedCondition: "Cryogenic Compressor (A6) is operating normally and is not faulted.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 29
    },
    {
      ref: 100,
      subsystem: "Water / Cooling",
      name: "Cryogenic Compressor A7",
      satisfiedCondition:
        "Satisfied when communication with the cyclotron PLC exists, and FACILITY_BOOL_H2O_COMPRESSOR_A7_OK is true.",
      type: "2",
      class: "B,C",
      enumId: "IL_MAGNET_HELIUM_COMPRESSOR_STAGE_2_UNIT_3",
      code: "wCryo7",
      override: "No",
      guideName: "Cryogenic Compressor A7",
      guideSatisfiedCondition: "Cryogenic Compressor (A7) is operating normally and is not faulted.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 29
    },
    {
      ref: 101,
      subsystem: "Water / Cooling",
      name: "Cryogenic Compressor A8 Flow",
      satisfiedCondition:
        "Satisfied when communication with the cyclotron PLC exists, and FACILITY_BOOL_H2O_COMPRESSOR_FLOW_OK is true.",
      type: "1",
      class: "B,C",
      enumId: "IL_MAGNET_HELIUM_COMPRESSOR_WATER_COOLING_FLOW",
      code: "wCryoF",
      override: "No",
      guideName: "Cryogenic Compressor A8 Flow",
      guideSatisfiedCondition: "Cryogenic Compressor (A8) has a sufficient water flow rate.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 29
    },
    {
      ref: 102,
      subsystem: "Water / Cooling",
      name: "Cryogenic Compressor A8 Temperature",
      satisfiedCondition:
        "Satisfied when communication with the cyclotron PLC exists, and FACILITY_BOOL_H2O_COMPRESSOR_TEMP_OK is true.",
      type: "1",
      class: "B,C",
      enumId: "IL_MAGNET_HELIUM_COMPRESSOR_WATER_COOLING_TEMP",
      code: "wCryoT",
      override: "No",
      guideName: "Cryogenic Compressor A8 Temperature",
      guideSatisfiedCondition: "Water temperature in Cryogenic Compressor (A8) is sufficiently cool.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 30
    },
    {
      ref: 103,
      subsystem: "Water / Cooling",
      name: "RF Amplifier Water Cooling Flow",
      satisfiedCondition: "Satisfied when PLC indicates RF Amp Flow Gauge is OK",
      type: "1",
      class: "B",
      enumId: "IL_RF_AMP_WATER_COOLING_FLOW",
      code: "wRFAF",
      override: "Yes",
      guideName: "RF Amplifier Water Cooling Flow",
      guideSatisfiedCondition: "RF Amplifier has a sufficient water flow rate.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 30
    },
    {
      ref: 104,
      subsystem: "Water / Cooling",
      name: "RF Amplifier Water Cooling Temperature",
      satisfiedCondition: "Satisfied when PLC indicates RF Amp Temp Gauge is OK",
      type: "1",
      class: "B",
      enumId: "IL_RF_AMP_WATER_COOLING_TEMP",
      code: "wRFAT",
      override: "Yes",
      guideName: "RF Amplifier Water Cooling Temperature",
      guideSatisfiedCondition: "Water temperature in RF Amplifier is sufficiently cool.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 30
    },
    {
      ref: 105,
      subsystem: "Water / Cooling",
      name: "Inner Conductor Water Cooling Flow",
      satisfiedCondition: "Satisfied when PLC indicates Inner Conductor Flow Gauge is OK",
      type: "1",
      class: "B",
      enumId: "IL_RF_INNER_LOOP_WATER_COOLING_FLOW",
      code: "wICWF",
      override: "No",
      guideName: "Inner Conductor Water Cooling Flow",
      guideSatisfiedCondition: "RF Inner Conductor has a sufficient water flow rate.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 30
    },
    {
      ref: 106,
      subsystem: "Water / Cooling",
      name: "Inner Conductor Water Cooling Temperature",
      satisfiedCondition: "Satisfied when PLC indicates Inner Conductor Temp Gauge is OK",
      type: "1",
      class: "B",
      enumId: "IL_RF_INNER_LOOP_WATER_COOLING_TEMP",
      code: "wICWT",
      override: "No",
      guideName: "Inner Conductor Water Cooling Temperature",
      guideSatisfiedCondition: "Water temperature in RF Inner Conductor is sufficiently cool.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 30
    },
    {
      ref: 107,
      subsystem: "Water / Cooling",
      name: "A/C Rectifier Stack Cooling Water Flow",
      satisfiedCondition:
        "Satisfied when communication with the cyclotron PLC exists, and FACILITY_BOOL_H2O_RECTIFIER_STACK_FLOW is true.",
      type: "1",
      class: "B",
      enumId: "IL_MAGNET_RECTIFIER_STACK_WATER_COOLING_FLOW",
      code: "wRStkF",
      override: "Yes",
      guideName: "A/C Rectifier Stack Cooling Water Flow",
      guideSatisfiedCondition: "A/C Rectifier Stack has a sufficient water flow rate.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 30
    },
    {
      ref: 108,
      subsystem: "Water / Cooling",
      name: "A/C Rectifier Stack Cooling Water Temp",
      satisfiedCondition:
        "Satisfied when communication with the cyclotron PLC exists, and FACILITY_BOOL_H2O_RECTIFIER_STACK_TEMPERATURE is true.",
      type: "1",
      class: "B",
      enumId: "IL_MAGNET_RECTIFIER_STACK_WATER_COOLING_TEMP",
      code: "wRStkT",
      override: "Yes",
      guideName: "A/C Rectifier Stack Cooling Water Temp",
      guideSatisfiedCondition: "Water temperature in A/C Rectifier Stack is sufficiently cool.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 30
    },
    {
      ref: 109,
      subsystem: "Water / Cooling",
      name: "Rotating Capacitor Water Cooling Flow",
      satisfiedCondition: "Satisfied when PLC indicates RotC/Outer Conductor Flow Gauge is OK",
      type: "1",
      class: "B",
      enumId: "IL_RF_ROTC_OUTER_CONDUCTOR_WATER_COOLING_FLOW",
      code: "wROutF",
      override: "No",
      guideName: "Rotating Capacitor Water Cooling Flow",
      guideSatisfiedCondition:
        "Outer Conductor / Rotating Capacitor (ROTC) has a sufficient water flow rate.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 30
    },
    {
      ref: 110,
      subsystem: "Water / Cooling",
      name: "Rotating Capacitor Water Cooling Temperature",
      satisfiedCondition: "Satisfied when PLC indicates RotC/Outer Conductor Temp Gauge is OK",
      type: "1",
      class: "B",
      enumId: "IL_RF_ROTC_OUTER_CONDUCTOR_WATER_COOLING_TEMP",
      code: "wROutT",
      override: "No",
      guideName: "Rotating Capacitor Water Cooling Temperature",
      guideSatisfiedCondition:
        "Water temperature in Outer Conductor /Rotating Capacitor (ROTC) is sufficiently cool.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 31
    },
    {
      ref: 111,
      subsystem: "Water / Cooling",
      name: "Flyback Diode Temperature",
      satisfiedCondition:
        "Satisfied when communication with the cyclotron PLC exists, and reports bits MAGNET_BOOL_XLOCK_INPUT_DATA_VALID and MAGNET_BOOL_IO_FLYBACK_DIODE_TEMPERATURE are both true.",
      type: "2",
      class: "B",
      enumId: "IL_MAGNET_FLYBACK_DIODE_TEMP",
      code: "wFlyBT",
      override: "Yes",
      guideName: "Flyback Diode Overtemp",
      guideSatisfiedCondition: "Flyback diode is below the configurable temperature threshold.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 31
    },
    {
      ref: 112,
      subsystem: "Water / Cooling",
      name: "AC Rectifier Stack Diode Overtemperature",
      satisfiedCondition:
        "Satisfied when communication with the cyclotron PLC exists, and MAGNET_BOOL_IO_RECTIFIER_STACK_DIODE_TEMPERATURE is true.",
      type: "2",
      class: "B",
      enumId: "IL_MAGNET_RECTIFIER_STACK_DIODE_TEMP",
      code: "wRectT",
      override: "Yes",
      guideName: "AC Rectifier Stack Diode Overtemp",
      guideSatisfiedCondition: "Rectifier Stack is below the configurable temperature threshold.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 31
    },
    {
      ref: 113,
      subsystem: "Water / Cooling",
      name: "Scanning Magnet Cooling Status",
      satisfiedCondition: "Satisfied when the scanning magnet cooling system is not faulted",
      type: "2",
      class: "",
      enumId: "IL_SCANNING_MAGNET_COOLING",
      code: "wSMSt",
      override: "Yes",
      guideName: "Scanning Magnet Cooling Status",
      guideSatisfiedCondition: "Scanning magnet cooling system is not faulted",
      configFiles: "/XYZ.XML",
      configValues: "<pressureTransducerMin_psi> <pressureTransducerMax_psi>",
      guidePage: 31
    },
    {
      ref: 114,
      subsystem: "Scanning",
      name: "XYZ Controller Status",
      satisfiedCondition:
        "Satisfied when XYZ Proton Core Module reports a heartbeat to the MCC, and all subsystem overrides are disabled. Trip Interlock on RS Errors or after scanning magnet current fails to meet commanded current in configurable # seconds.",
      type: "1",
      class: "",
      enumId: "IL_XYZ_CONTROLLER_STATUS",
      code: "sXYZSt",
      override: "Yes",
      guideName: "XYZ Controller Status",
      guideSatisfiedCondition:
        "XYZ Proton Core Module reports a heartbeat to the MCC and all subsystem overrides are disabled and",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 22
    },
    {
      ref: 115,
      subsystem: "Scanning",
      name: "XYZ Controller Loaded",
      satisfiedCondition:
        "Satisfied when XYZ PCM has been configured with all required treatment parameters and Treatment map has been loaded.",
      type: "1",
      class: "",
      enumId: "IL_XYZ_CONTROLLER_LOADED",
      code: "sXYZLd",
      override: "Yes",
      guideName: "XYZ Controller Loaded",
      guideSatisfiedCondition:
        "XYZ PCM has been configured with all required treatment parameters and Treatment map has been loaded. Scanning magnet current has not failed to reach the commanded current in the configurable # of seconds. Pulse Retry count limit hasn’t been met.",
      configFiles: "/XYZ.XML",
      configValues: "<magnetSettlingTimeout_uS> <magnetCurrentTolerance_Amp> <pulseRetryCountLimit>",
      guidePage: 22
    },
    {
      ref: 116,
      subsystem: "Scanning",
      name: "DOS_Y Controller Status",
      satisfiedCondition:
        "Satisfied when DOS_Y PCM reports a heartbeat to the MCC, all subsystem overrides are disabled, HV is present and within configurable tolerance, and the test charge injection has not failed.",
      type: "1",
      class: "",
      enumId: "IL_DOSE_1_CONTROLLER_STATUS",
      code: "SDOS1St",
      override: "Yes",
      guideName: "DOS_Y Controller Status",
      guideSatisfiedCondition:
        "DOS_Y PCM reports a heartbeat to the MCC, all subsystem overrides are disabled and HV is present and within configurable tolerance.",
      configFiles: "/Dosimetry.XML",
      configValues:
        "<hvps_loopback_tolerance_kV> <DosYconfiguration> <hvps2_loopback_gain> <hvps2_loopback_offset> <hvps2_loopback_target_kV>",
      guidePage: 22
    },
    {
      ref: 117,
      subsystem: "Scanning",
      name: "DOS_Y Controller Loaded",
      satisfiedCondition:
        "Satisfied when DOS_Y PCM has been configured with all required treatment parameters, Treatment map has been loaded, and there has been a successful test charge injection.",
      type: "1",
      class: "",
      enumId: "IL_DOSE_1_CONTROLLER_LOADED",
      code: "SDOS1LD",
      override: "Yes",
      guideName: "DOS_Y Controller Loaded",
      guideSatisfiedCondition:
        "DOS_Y PCM has been configured with all required treatment parameters, Treatment map has been loaded. Unsatisfies if test charge injection fails.",
      configFiles: "/Dosimetry.XML",
      configValues: "<DosYconfiguration> <prebeamTargetRecyclingCount> <prebeamTargetRecyclingCountTol>",
      guidePage: 22
    },
    {
      ref: 118,
      subsystem: "Scanning",
      name: "DOS_X Controller Status",
      satisfiedCondition:
        "Satisfied when DOS_X PCM reports a heartbeat to the MCC, all subsystem overrides are disabled, HV is present and within configurable tolerance, and the test charge injection has not failed.",
      type: "1",
      class: "",
      enumId: "IL_DOSE_2_CONTROLLER_STATUS",
      code: "sDOS2St",
      override: "Yes",
      guideName: "DOS_X Controller Status",
      guideSatisfiedCondition:
        "DOS_X PCM reports a heartbeat to the MCC, all subsystem overrides are disabled and HV is present and within configurable tolerance.",
      configFiles: "/Dosimetry.XML",
      configValues:
        "<hvps_loopback_tolerance_kV> <DosXconfiguration> <hvps1_loopback_gain> <hvps2_loopback_gain> <hvps1_loopback_offset> <hvps2_loopback_offset> <hvps1_loopback_target_kV> <hvps2_loopback_target_kV>",
      guidePage: 22
    },
    {
      ref: 119,
      subsystem: "Scanning",
      name: "DOS_Y Controller Loaded",
      satisfiedCondition:
        'Satisfied when DOS_Y PCM has been configured with all required treatment parameters and Treatment map has been loaded. Interlock is gated on successful "test charge injection".',
      type: "1",
      class: "",
      enumId: "IL_DOSE_2_CONTROLLER_LOADED",
      code: "sDOS2LD",
      override: "Yes",
      guideName: "DOS_X Controller Loaded",
      guideSatisfiedCondition:
        "DOS_Y PCM has been configured with all required treatment parameters and Treatment map has been loaded. Unsatisfies if test charge injection fails.",
      configFiles: "/Dosimetry.XML",
      configValues: "<DosXconfiguration> <prebeamTargetRecyclingCount> <prebeamTargetRecyclingCountTol>",
      guidePage: 22
    },
    {
      ref: 120,
      subsystem: "Scanning",
      name: "ACM Controller Status",
      satisfiedCondition:
        "Satisified when ACM PCM reports a heartbeat to the MCC, all subsystem overrides are disabled, and there are no AA Errors.",
      type: "1",
      class: "",
      enumId: "IL_ACM_CONTROLLER_STATUS",
      code: "sACMSt",
      override: "Yes",
      guideName: "ACM Controller Status",
      guideSatisfiedCondition:
        "ACM PCM reports a heartbeat to the MCC, all subsystem overrides are disabled, motors are both configured and enabled.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 23
    },
    {
      ref: 121,
      subsystem: "Scanning",
      name: "ACM Controller Loaded",
      satisfiedCondition:
        "Satisfied when ACM PCM has been configured with all required treatment parameters and an AA map has been loaded.",
      type: "1",
      class: "",
      enumId: "IL_ACM_CONTROLLER_LOADED",
      code: "sACMLD",
      override: "Yes",
      guideName: "ACM Controller Loaded",
      guideSatisfiedCondition:
        "ACM PCM has been configured with all required treatment parameters (translation has occurred) and an AA map has been loaded and startup configuration verified.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 23
    },
    {
      ref: 122,
      subsystem: "Scanning",
      name: "Scanning Magnet Amp Status",
      satisfiedCondition: "Satisified when Scanning Magnet Amplifier is not faulted.",
      type: "1",
      class: "",
      enumId: "IL_SCANNING_MAGNET_AMPLIFIER_STATUS",
      code: "smASt",
      override: "Yes",
      guideName: "Scanning Magnet Amplifier Status",
      guideSatisfiedCondition: "Scanning Magnet Amplifier is not faulted.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 23
    },
    {
      ref: 123,
      subsystem: "Scanning",
      name: "Adaptive Aperture Position",
      satisfiedCondition: "Satisfied when Redundant position sensors are both in tolerance.",
      type: "1",
      class: "",
      enumId: "IL_AA_POSITIONS_MATCH",
      code: "sAAPos",
      override: "Yes",
      guideName: "Adaptive Aperture Position",
      guideSatisfiedCondition:
        "Adaptive Aperture Redundant position sensors are both in tolerance (no unexpected moves or position mismatches) and no motor timeouts.",
      configFiles: "/ACMConfiguration .XML",
      configValues: "<primaryCountThreshold> & <secondaryCountThreshold> For all 17 axes.",
      guidePage: 23
    },
    {
      ref: 124,
      subsystem: "Scanning",
      name: "Adaptive Aperture Error",
      satisfiedCondition: "Satisfied when the adaptive aperture does not have any nonrecoverable errors.",
      type: "2",
      class: "",
      enumId: "IL_AA_ERROR",
      code: "sAAErr",
      override: "Yes",
      guideName: "Adaptive Aperture Error",
      guideSatisfiedCondition:
        "The adaptive aperture motors are configured and the following errors have not occurred: Homing failed, calibration verification failed, motor failure or configuration error.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 23
    },
    {
      ref: 125,
      subsystem: "Scanning",
      name: "Range Shifter Error",
      satisfiedCondition:
        "Satisfied when the range shifter does not have any nonrecoverable errors and the pre-beam calibration check has not failed.",
      type: "1",
      class: "",
      enumId: "IL_RANGE_SHIFTER_CAL_CHECK",
      code: "sRSErr",
      override: "Yes",
      guideName: "Range Shifter Error",
      guideSatisfiedCondition:
        "Range shifter does not have any non- recoverable errors and the pre-beam calibration check has not failed.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 23
    },
    {
      ref: 126,
      subsystem: "Scanning",
      name: "Range Shifter Position",
      satisfiedCondition: "Satisfied when Redundant position sensors are in agreement.",
      type: "1",
      class: "",
      enumId: "IL_RANGE_SHIFTER_POS",
      code: "sRSPos",
      override: "Yes",
      guideName: "Range Shifter Position",
      guideSatisfiedCondition: "Redundant position sensors are in agreement",
      configFiles: "/XYZ.XML",
      configValues: "<FollowTheBeamConfig> <ThresholdOut_mm> <ThresholdIn_mm>",
      guidePage: 23
    },
    {
      ref: 127,
      subsystem: "Treatment Room",
      name: "CIG Secondary Position Check",
      satisfiedCondition:
        "Satisfied when both cig theta readings and both cig extension readings agree to within configurable tolerances.",
      type: "1",
      class: "",
      enumId: "IL_TREATMENT_CIG_SECONDARY",
      code: "tCIGSec",
      override: "Yes",
      guideName: "CIG Secondary Position Check",
      guideSatisfiedCondition:
        "Both cig theta readings and both cig extension readings agree to within configurable tolerances.",
      configFiles: "/OuterGantry.XML",
      configValues:
        "UREQ_CIG_ANGLE_PRIM_TO_SEC_TOL UREQ_CIG_EXTENSION_TOL (extension tol) UREQ_CIG_EXTENSION_SCALE_FACTOR (calibrate 2nd resolver) UREQ_CIG_VALUE_THETA_SCALE (calibrate 2nd resolver)",
      guidePage: 25
    },
    {
      ref: 128,
      subsystem: "Treatment Room",
      name: "CT Image Acquisition OK",
      satisfiedCondition:
        "CT imaging is enabled when the couch is in the scanning position. The system must not be in the BEAM_ON state in order to acquire images.",
      type: "1",
      class: "",
      enumId: "IL_CONE_BEAM_SCANNING_ENABLED",
      code: "tCBImOK",
      override: "No",
      guideName: "CT Image Acquisition OK",
      guideSatisfiedCondition:
        "CT imaging is enabled when the couch is in the scanning position. The system must not be in the BEAM_ON state in order to acquire images.",
      configFiles: "medPhotonCalib_co nfig.JSON",
      configValues: "Multiple CBCT Calibration Values",
      guidePage: 26
    },
    {
      ref: 129,
      subsystem: "Treatment Room",
      name: "CT Scanner(s) Parked",
      satisfiedCondition: "Satisified when all installed CT scanners are in the parked position.",
      type: "1",
      class: "",
      enumId: "IL_CT_SCANNERS_PARKED",
      code: "tCBCT",
      override: "No",
      guideName: "CT Scanner(s) Parked",
      guideSatisfiedCondition: "Satisified when all installed CT scanners are in the parked position.",
      configFiles: "-none-",
      configValues: "-none-",
      guidePage: 25
    },
    {
      ref: 130,
      subsystem: "Treatment Room",
      name: "Couch Collision Prevention",
      satisfiedCondition:
        "Purpose: prevent collisions between the Couch and Nozzle, and between the Couch and rail-mounted CT Scanners. Note: multiple conditions may prevent couch motion at the same time. 1a) Couch & Nozzle: Prevents all moves from the Load Position, regardless of CIG angle, unless the extension is completely retracted. This prevents collisions when moving from Load to Setup if the nozzle is extended into the field. 1b) Couch & Nozzle: Prevents some couch moves when the CIG Angle is below (a larger angle than) a configured collision angle if the extension is not fully retracted. This prevents collisions when moving to Load if the CIG is extended below the couch and unseen. Disallowed moves are controlled by the configured boolean CollisionPreventionLoadOnly. If TRUE, only LOAD on the handpendant is disallowed. If FALSE, all the following are disallowed: LOAD, SETUP, TREATMENT, DELTA, RECALL, or SWITCH. The angle is controlled by LoadCollisionPreventionCIGAngle. 2) Couch & rail-mounted CBCT Scanner: o Prevents all couch motion when the rail mounted CBCT Scanner is extended beyond its configured safe zone position. o Prevents some couch motion when the rail-mounted CBCT Scanner is extended from park, but within its configured safe zone: - TREATMENT, RECALL and SWITCH disallowed - SETUP, DELTA and LOAD are allowed to speed up workflow (Separately, moves to the medPhoton scan position are prevented if the CIG is below (larger angle than) the angle specified in CouchIO_config.json CBCTCollisionPreventionCIGAngle, regardless of how retracted the extension is) 3) Couch & rail-mounted CTOR Scanner: Prevents all couch motion when the rail mounted CTOR is not parked (extended by any amount). This is not configurable. 4) Pendant stuck button: It is possible for buttons on the couch hand pendants to become stuck in the on position, so if a button on the hand pendant is already on when the enable bars toggle from disabled to enabled, the interlock will disable the Couch and CIG motion permits. This interlock will remain unsatisfied until the enable bars are released.",
      type: "1",
      class: "",
      enumId: "IL_COUCHIO_COLLISION_PREVENTION",
      code: "tCICP",
      override: "Yes",
      guideName: "Couch Collision Prevention",
      guideSatisfiedCondition:
        "To prevent collisions between the Couch and Nozzle, and between the Couch and rail-mounted CT Scanners. Note: multiple conditions may prevent couch motion at the same time. 1) Couch & Nozzle: Prevents some couch moves when the CIG Angle is greater than a configured collision warning angle AND the CIG is not fully retracted. Disallowed moves are controlled by the configured boolean CollisionPreventionLoadOnly. If TRUE, only LOAD on the handpendant is disallowed. If FALSE, all the following are disallowed: LOAD, SETUP, TREATMENT, DELTA, RECALL, or SWITCH. 2) Couch & rail-mounted CBCT Scanner: o Prevents all couch motion when the rail mounted CBCT Scanner is extended beyond its configured safe zone position. o Prevents some couch motion when the rail-mounted CBCT Scanner is extended from park, but within its configured safe zone: - TREATMENT, RECALL and SWITCH disallowed - SETUP, DELTA and LOAD are allowed to speed up workflow 3) Couch & rail-mounted CTOR Scanner: Prevents all couch motion when the rail mounted CTOR is not parked (extended by any amount). This is not configurable.",
      configFiles: "CouchIO_config.json",
      configValues: "CollisionPreventionCIGAngle CollisionPreventionLoadOnly",
      guidePage: 27
    },
    {
      ref: 131,
      subsystem: "Controls",
      name: "X04 Collimator Ready",
      satisfiedCondition: "Satisfied when redundant X04 Collimator position sensors are both in tolerance.",
      type: "1",
      class: "",
      enumId: "IL_X04_COLLIMATOR_READY",
      code: "flX04",
      override: "Yes"
    }
  ]
});
