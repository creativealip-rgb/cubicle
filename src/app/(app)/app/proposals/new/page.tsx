import ProposalsPage from "../page";

export default function NewProposalPage() {
  return <ProposalsPage searchParams={Promise.resolve({ new: "1" })} />;
}
