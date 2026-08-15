import ContractsPage from "../page";

export default function NewContractPage() {
  return <ContractsPage searchParams={Promise.resolve({ new: "1" })} />;
}