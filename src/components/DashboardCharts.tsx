"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface PorCategoria {
  nombre: string;
  disponible: number;
  usado: number;
}

interface PieDatum {
  name: string;
  value: number;
  color: string;
}

export function BarraPorCategoria({ porCategoria }: { porCategoria: PorCategoria[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={porCategoria} barSize={18} barGap={3}>
        <XAxis dataKey="nombre" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={22} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 12 }}
          formatter={(val, name) => [val, name === "disponible" ? "Disponible" : "Usado"]} />
        <Bar dataKey="disponible" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="disponible" />
        <Bar dataKey="usado" fill="#64748b" radius={[4, 4, 0, 0]} name="usado" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PieEstado({ pieData }: { pieData: PieDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
