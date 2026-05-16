import { PersonForm } from "@/components/people/PersonForm";

export default function NewPersonPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Add person</h1>
      <PersonForm />
    </div>
  );
}
