import { VistaIndicadores } from "@/components/VistaIndicadores";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <VistaIndicadores sp={await searchParams} />;
}
