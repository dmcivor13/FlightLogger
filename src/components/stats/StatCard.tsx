interface Props {
  label: string;
  value: number | string;
}

export function StatCard({ label, value }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
      <div className="text-3xl font-bold text-blue-700">{value}</div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
    </div>
  );
}
