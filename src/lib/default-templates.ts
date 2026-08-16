import type { DocumentBlock } from "@/lib/document-blocks";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { proposalTemplates, contractTemplates } from "@/db/schema";

/**
 * Default proposal + contract templates seeded into every new workspace.
 *
 * Single source of truth for the "out of the box" templates a user sees when
 * they first land in the Template Center. Kept here (not in `document-blocks`)
 * so the seed payload is decoupled from the editor's "start from template"
 * starter blocks, and so both workspace-creation paths (`ensureUserWorkspace`
 * and `createWorkspace`) insert identical content.
 *
 * NOTE: placeholders use underscore form (`{{workspace_name}}`) — the resolver
 * accepts both underscore and dot notation, and these match the tokens the
 * block editor exposes in its placeholder chips.
 */

export const DEFAULT_PROPOSAL_TEMPLATE_NAME = "Standard Project Proposal";
export const DEFAULT_CONTRACT_TEMPLATE_NAME = "Standard Service Agreement";

export const DEFAULT_PROPOSAL_BODY = `## Executive Summary

This proposal outlines our recommended approach, scope, and investment for your project. We have aligned the deliverables below with your stated goals, and we are confident our team can deliver measurable results on schedule and on budget.

## Scope of Work

- Discovery & requirements gathering
- Design & prototyping
- Development & implementation
- Testing, QA & refinements
- Launch, training & post-launch support

## Timeline

Estimated timeline: 4–6 weeks from kickoff. Detailed milestones will be confirmed during the discovery phase and tracked through a shared project timeline.

## Investment

Please refer to the itemized pricing table and payment schedule below. A 50% down payment is required to begin work; the remaining balance is due upon project completion.

## About {{workspace_name}}

{{workspace_name}} is a dedicated team of designers, engineers, and strategists. We partner with clients to deliver high-quality digital work that drives real business results.

## Terms & Conditions

This proposal is valid until {{valid_until}}. Prices exclude applicable taxes unless stated otherwise. Any additional work outside the defined scope will be quoted separately.
`;

export function buildDefaultProposalBlocks(): DocumentBlock[] {
  return [
    { id: crypto.randomUUID(), type: "heading", level: 1, content: "Project Proposal", align: "center" },
    { id: crypto.randomUUID(), type: "text", content: "{{workspace_name}}", align: "center" },
    { id: crypto.randomUUID(), type: "text", content: "Prepared for {{client_name}}", align: "center" },
    { id: crypto.randomUUID(), type: "text", content: "{{today}}", align: "center" },
    { id: crypto.randomUUID(), type: "divider" },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Executive Summary" },
    { id: crypto.randomUUID(), type: "text", content: "This proposal outlines our recommended approach, scope, and investment for your project. We have aligned the deliverables below with your stated goals, and we are confident our team can deliver measurable results on schedule and on budget." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Scope of Work" },
    { id: crypto.randomUUID(), type: "list", items: ["Discovery & requirements gathering", "Design & prototyping", "Development & implementation", "Testing, QA & refinements", "Launch, training & post-launch support"], ordered: false },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Timeline" },
    { id: crypto.randomUUID(), type: "text", content: "Estimated timeline: 4–6 weeks from kickoff. Detailed milestones will be confirmed during the discovery phase and tracked through a shared project timeline." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Investment" },
    { id: crypto.randomUUID(), type: "text", content: "Please refer to the itemized pricing table and payment schedule below. A 50% down payment is required to begin work; the remaining balance is due upon project completion." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "About {{workspace_name}}" },
    { id: crypto.randomUUID(), type: "text", content: "{{workspace_name}} is a dedicated team of designers, engineers, and strategists. We partner with clients to deliver high-quality digital work that drives real business results." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Terms & Conditions" },
    { id: crypto.randomUUID(), type: "text", content: "This proposal is valid until {{valid_until}}. Prices exclude applicable taxes unless stated otherwise. Any additional work outside the defined scope will be quoted separately." },
  ];
}

export const DEFAULT_CONTRACT_BODY = `# Service Agreement

**{{workspace_name}}**

Contract No. {{contract_number}}

{{contract_date}}

---

## Parties

This Service Agreement (the "Agreement") is entered into on {{contract_date}} between:

**{{workspace_name}}** ("Service Provider"), and

**{{client_name}}** ("Client").

## Background

The Client wishes to engage the Service Provider to perform the services described below. The Service Provider has the qualifications, experience, and ability to provide these services, and agrees to do so under the terms of this Agreement.

## Services

- Deliverable 1 — to be defined in the project brief
- Deliverable 2 — to be defined in the project brief
- Deliverable 3 — to be defined in the project brief

## Payment

The Client agrees to pay the Service Provider the amount set out in the pricing schedule for the Services. A down payment of 50% is due upon signing; the remaining balance is due upon completion. Invoices are payable within 14 days of receipt. Late payments may incur a 1.5% monthly service charge.

## Term & Termination

This Agreement begins on {{contract_date}} and remains in effect until {{valid_until}}, unless terminated earlier. Either Party may terminate this Agreement with 14 days written notice if the other Party materially breaches its obligations and fails to cure within the notice period.

## Confidentiality

Each Party agrees to keep confidential any non-public information received from the other Party during the course of this Agreement, and not to disclose it to third parties without prior written consent, except as required by law.

## Intellectual Property

Upon full payment, the Service Provider assigns to the Client all rights to the final deliverables produced under this Agreement. The Service Provider retains ownership of pre-existing tools, frameworks, and materials, and grants the Client a license to use them as part of the deliverables.

## Liability & Indemnification

Each Party agrees to indemnify and hold the other harmless from claims arising out of its own negligence or willful misconduct. The Service Provider's total liability under this Agreement shall not exceed the total fees paid by the Client.

## Dispute Resolution

The Parties agree to resolve any dispute through good-faith negotiation first. If unresolved, the dispute will be submitted to mediation before pursuing legal remedies. This Agreement is governed by the laws of the Service Provider's jurisdiction.

## General Provisions

- This Agreement constitutes the entire agreement between the Parties.
- Any amendment must be in writing and signed by both Parties.
- If any provision is found unenforceable, the remainder remains in effect.
- Neither Party is liable for delays caused by force majeure events.

## Signatures
`;

export function buildDefaultContractBlocks(): DocumentBlock[] {
  return [
    { id: crypto.randomUUID(), type: "heading", level: 1, content: "Service Agreement", align: "center" },
    { id: crypto.randomUUID(), type: "text", content: "{{workspace_name}}", align: "center" },
    { id: crypto.randomUUID(), type: "text", content: "Contract No. {{contract_number}}", align: "center" },
    { id: crypto.randomUUID(), type: "text", content: "{{contract_date}}", align: "center" },
    { id: crypto.randomUUID(), type: "divider" },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Parties" },
    { id: crypto.randomUUID(), type: "text", content: "This Service Agreement (the \u201cAgreement\u201d) is entered into on {{contract_date}} between:" },
    { id: crypto.randomUUID(), type: "text", content: "{{workspace_name}} (\u201cService Provider\u201d), and" },
    { id: crypto.randomUUID(), type: "text", content: "{{client_name}} (\u201cClient\u201d)." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Background" },
    { id: crypto.randomUUID(), type: "text", content: "The Client wishes to engage the Service Provider to perform the services described below. The Service Provider has the qualifications, experience, and ability to provide these services, and agrees to do so under the terms of this Agreement." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Services" },
    { id: crypto.randomUUID(), type: "list", items: ["Deliverable 1 — to be defined in the project brief", "Deliverable 2 — to be defined in the project brief", "Deliverable 3 — to be defined in the project brief"], ordered: false },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Payment" },
    { id: crypto.randomUUID(), type: "text", content: "The Client agrees to pay the Service Provider the amount set out in the pricing schedule for the Services. A down payment of 50% is due upon signing; the remaining balance is due upon completion. Invoices are payable within 14 days of receipt. Late payments may incur a 1.5% monthly service charge." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Term & Termination" },
    { id: crypto.randomUUID(), type: "text", content: "This Agreement begins on {{contract_date}} and remains in effect until {{valid_until}}, unless terminated earlier. Either Party may terminate this Agreement with 14 days written notice if the other Party materially breaches its obligations and fails to cure within the notice period." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Confidentiality" },
    { id: crypto.randomUUID(), type: "text", content: "Each Party agrees to keep confidential any non-public information received from the other Party during the course of this Agreement, and not to disclose it to third parties without prior written consent, except as required by law." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Intellectual Property" },
    { id: crypto.randomUUID(), type: "text", content: "Upon full payment, the Service Provider assigns to the Client all rights to the final deliverables produced under this Agreement. The Service Provider retains ownership of pre-existing tools, frameworks, and materials, and grants the Client a license to use them as part of the deliverables." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Liability & Indemnification" },
    { id: crypto.randomUUID(), type: "text", content: "Each Party agrees to indemnify and hold the other harmless from claims arising out of its own negligence or willful misconduct. The Service Provider\u2019s total liability under this Agreement shall not exceed the total fees paid by the Client." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Dispute Resolution" },
    { id: crypto.randomUUID(), type: "text", content: "The Parties agree to resolve any dispute through good-faith negotiation first. If unresolved, the dispute will be submitted to mediation before pursuing legal remedies. This Agreement is governed by the laws of the Service Provider\u2019s jurisdiction." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "General Provisions" },
    { id: crypto.randomUUID(), type: "list", items: ["This Agreement constitutes the entire agreement between the Parties.", "Any amendment must be in writing and signed by both Parties.", "If any provision is found unenforceable, the remainder remains in effect.", "Neither Party is liable for delays caused by force majeure events."], ordered: false },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Signatures" },
    { id: crypto.randomUUID(), type: "signature" },
  ];
}

/**
 * Seed the default proposal + contract templates into a newly created
 * workspace. Idempotent per workspace: skips a template type if the workspace
 * already has a default of that kind. Safe to call from both workspace-creation
 * paths (`ensureUserWorkspace` on first signup and `createWorkspace` on
 * additional workspaces).
 */
export async function seedDefaultTemplates(workspaceId: string): Promise<void> {
  const [existingProposal] = await db
    .select({ id: proposalTemplates.id })
    .from(proposalTemplates)
    .where(and(eq(proposalTemplates.workspaceId, workspaceId), eq(proposalTemplates.isDefault, true)))
    .limit(1);

  const [existingContract] = await db
    .select({ id: contractTemplates.id })
    .from(contractTemplates)
    .where(and(eq(contractTemplates.workspaceId, workspaceId), eq(contractTemplates.isDefault, true)))
    .limit(1);

  if (!existingProposal) {
    await db.insert(proposalTemplates).values({
      workspaceId,
      name: DEFAULT_PROPOSAL_TEMPLATE_NAME,
      body: DEFAULT_PROPOSAL_BODY,
      contentBlocks: buildDefaultProposalBlocks(),
      isDefault: true,
    });
  }

  if (!existingContract) {
    await db.insert(contractTemplates).values({
      workspaceId,
      name: DEFAULT_CONTRACT_TEMPLATE_NAME,
      body: DEFAULT_CONTRACT_BODY,
      contentBlocks: buildDefaultContractBlocks(),
      isDefault: true,
    });
  }
}
