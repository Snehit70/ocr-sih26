# Package inspection

Language for assessing declarations on physical retail packages.

## Language

**Package photograph**:
A photograph of a physical packaged commodity submitted as evidence for an inspection.
_Avoid_: Product listing image

**Inspection**:
An assessment of one physical package using one or more package photographs.
_Avoid_: Scan

**Reviewer**:
The person who checks model observations and suspected violations, corrects mistakes, and confirms an inspection report. A team member fills this role in the SIH demo.
_Avoid_: Model

**Observed declaration**:
A declaration identified on a package photograph, linked to the photograph and the region where it appears. Its extracted text may still need review.
_Avoid_: OCR result

**Reviewed declaration**:
An observed declaration whose text and location an officer has accepted or corrected. The original observation remains available.
_Avoid_: Raw extraction

**Not assessed**:
A check whose result cannot be established from the submitted photographs or from the rules supported for that commodity. It is neither a confirmed violation nor a pass.
_Avoid_: Missing, compliant

**Suspected violation**:
A rule check that points to a possible problem on the package and awaits officer review.
_Avoid_: Confirmed violation
