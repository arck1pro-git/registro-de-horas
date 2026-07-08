import { House, Building2 } from "lucide-react";
import { auth } from "@/auth";
import {
  getRegistrosByUser,
  getModalidadesByUser,
  findUserById,
  getFcmToken,
  type RegistroTipo,
} from "@/lib/data";
import { PontoFlow, ModalidadeFlow } from "@/app/registro-flow";
import { ProfileHeader } from "@/app/profile-header";
import { formatTime, formatDate, dateKey } from "@/lib/tz";

const LABELS: Record<RegistroTipo, string> = {
  in: "Entrada",
  out: "Saída",
};

const DOT: Record<RegistroTipo, string> = {
  in: "bg-emerald-600",
  out: "bg-rose-600",
};

export default async function Home() {
  const session = await auth();
  const user = session?.user;
  const dbUser = user?.id ? await findUserById(user.id) : undefined;
  const registros = user?.id ? await getRegistrosByUser(user.id) : [];
  const modalidades = user?.id ? await getModalidadesByUser(user.id) : [];
  const notificationsEnabled = user?.id ? !!(await getFcmToken(user.id)) : false;

  // Apenas os registros de hoje.
  const hoje = new Date();
  const hojeKey = dateKey(hoje);
  const registrosHoje = registros.filter(
    (r) => dateKey(r.timestamp) === hojeKey
  );
  const last = registrosHoje[registrosHoje.length - 1];
  const modalidadeHoje = modalidades.find((m) => m.dia === hojeKey);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col bg-background md:my-8 md:rounded-3xl md:border md:border-black/10 md:shadow-xl md:dark:border-white/15">
      <ProfileHeader
        name={dbUser?.name ?? user?.name}
        imageUrl={dbUser?.image}
        notificationsEnabled={notificationsEnabled}
      />

      {/* Section sobe por cima da foto, com cantos bem arredondados */}
      <div className="relative z-10 -mt-8 flex flex-1 flex-col gap-6 rounded-t-4xl bg-background px-6 pb-6 pt-7 md:rounded-b-3xl">
        <div>
          <p className="text-sm opacity-60">Olá,</p>
          <p className="text-2xl font-semibold leading-tight">
            {dbUser?.name ?? user?.name}
          </p>
        </div>

        <section className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm opacity-60">
            {last
              ? `Último registro: ${LABELS[last.tipo]} às ${formatTime(last.timestamp)}`
              : "Nenhum registro ainda"}
          </p>
        </section>

        <PontoFlow modalidadeRegistrada={!!modalidadeHoje} />

      <section className="flex flex-1 flex-col gap-2">
        <h2 className="text-sm font-semibold opacity-60">Registros de hoje</h2>
        {registrosHoje.length === 0 ? (
          <p className="py-8 text-center text-sm opacity-50">
            Nenhum registro hoje ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {registrosHoje.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3 dark:border-white/15"
              >
                <span className="flex items-center gap-2 font-medium">
                  <span className={`h-2.5 w-2.5 rounded-full ${DOT[r.tipo]}`} />
                  {LABELS[r.tipo]}
                </span>
                <span className="text-sm opacity-60">
                  {formatDate(r.timestamp)} · {formatTime(r.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col gap-2 border-t border-black/10 pt-4 dark:border-white/15">
        <p className="text-center text-sm opacity-60">
          {modalidadeHoje ? (
            <span className="inline-flex items-center gap-1.5">
              Modalidade de hoje:
              {modalidadeHoje.tipo === "home_office" ? (
                <span className="inline-flex items-center gap-1 font-medium">
                  <House className="h-4 w-4 text-indigo-600" /> Home Office
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-medium">
                  <Building2 className="h-4 w-4 text-amber-600" /> Presencial
                </span>
              )}
            </span>
          ) : (
            "Modalidade de hoje: não definida"
          )}
        </p>
        <ModalidadeFlow />
      </div>
      </div>
    </main>
  );
}
