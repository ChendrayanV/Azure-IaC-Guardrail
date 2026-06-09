# Delivery Playbook

## Scrum cadence

- Two-week delivery iterations.
- Weekly backlog refinement.
- Sprint planning selects only issues with acceptance criteria and dependencies.
- Demo Preview changes with limitations visible.
- Retrospective actions become owned issues when they require work.

## Workflow

1. **Discovery:** problem, users, evidence, risk, and options are understood.
2. **Ready:** acceptance criteria, dependencies, and test strategy are clear.
3. **In progress:** one owner drives the issue to review.
4. **Review:** code, UX, security, tests, and documentation are assessed.
5. **Done:** merged, verified, documented, and represented in release notes.

## Definition of ready

- User or engineering outcome is explicit.
- Acceptance criteria are observable.
- Security and sensitive-data impact are identified.
- Dependencies and milestone are assigned.
- Preview or GA status is clear.

## Definition of done

- Acceptance criteria pass.
- Type check, lint, tests, identifier guard, and compile pass.
- User-facing behavior is documented.
- Security and privacy impacts are reviewed.
- Migration and compatibility implications are addressed.
- Release notes are prepared when externally visible.

## Severity and priority

- **Critical:** security exposure, destructive behavior, invalid compliance
  pass, or release blocker.
- **High:** major workflow failure or misleading result.
- **Medium:** important capability, usability, or maintainability improvement.
- **Low:** optional enhancement with limited immediate impact.

