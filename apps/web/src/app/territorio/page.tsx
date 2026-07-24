import { AppShell } from '@/components/app-shell';
import { TerritoryMap } from '@/components/territory-map';
import { apiGet } from '@/lib/api';

type Point = {
  accountId: string;
  name: string;
  code: string;
  segment: string;
  creditStatus: string;
  lat: number;
  lng: number;
  territoryCode: string;
  href: string;
  personaKey?: string | null;
};

export default async function TerritorioPage() {
  let points: Point[] = [];
  try {
    const data = await apiGet<{ points: Point[] }>('/territorio/points?take=200');
    points = data.points;
  } catch {
    points = [];
  }

  return (
    <AppShell active="/territorio">
      <TerritoryMap points={points} />
    </AppShell>
  );
}
