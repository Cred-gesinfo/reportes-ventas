import { Vista } from "@/components/Vista";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <Vista sp={await searchParams} acumulado={false} />;
}
