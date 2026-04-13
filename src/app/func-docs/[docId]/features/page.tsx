import { FuncDocFeaturesPage } from "@/features/func-doc/func-doc-features-page";

export default async function FuncDocFeaturesRoutePage({
  params,
}: {
  params: Promise<{ docId: string }>;
}) {
  const { docId } = await params;
  return <FuncDocFeaturesPage docId={docId} />;
}
