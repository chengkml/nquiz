import { FuncDocDetailPage } from "@/features/func-doc/func-doc-detail-page";

export default async function FuncDocDetailRoutePage({
  params,
}: {
  params: Promise<{ docId: string }>;
}) {
  const { docId } = await params;
  return <FuncDocDetailPage docId={docId} />;
}
