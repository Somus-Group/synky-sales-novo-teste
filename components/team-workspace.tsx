'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Clock3,
  Crown,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getTeamMetrics } from '@/lib/team-metrics';
import type { Member } from './somus-app';
import styles from './team-workspace.module.css';

type Props = { members: Member[]; onAdd: () => void };

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function addedAt(timestamp: number) {
  if (!timestamp) return 'Data não informada';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(timestamp);
}

export function TeamWorkspace({ members, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<
    'Todos os status' | 'Ativo' | 'Pendente'
  >('Todos os status');
  const metrics = getTeamMetrics(members);
  const filteredMembers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return members.filter((member) => {
      const matchesQuery =
        !normalized ||
        [member.name, member.email, member.role].some((value) =>
          value.toLocaleLowerCase('pt-BR').includes(normalized),
        );
      const matchesStatus =
        status === 'Todos os status' ||
        (status === 'Ativo'
          ? member.status === 'Ativo'
          : member.status !== 'Ativo');
      return matchesQuery && matchesStatus;
    });
  }, [members, query, status]);
  const bars = [
    metrics.active,
    metrics.pending,
    metrics.roles,
    metrics.available,
  ];
  const barMax = Math.max(1, ...bars);

  return (
    <div className={styles.root}>
      <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0B6FE8]">
            Gestão do workspace
          </p>
          <h1
            className={`${styles.heading} mt-2 text-[clamp(30px,3vw,42px)] font-semibold tracking-[-0.055em] text-[#10213D]`}
          >
            Equipe
          </h1>
          <p className={`${styles.subtle} mt-2 text-[13px] text-[#617493]`}>
            Pessoas, acessos e responsabilidades do seu escritório.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative block sm:w-[250px]">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#6F83A1]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={`${styles.search} h-11 w-full rounded-2xl border border-[#DCE6F3] bg-white pl-10 pr-3 text-[11px] outline-none transition-shadow placeholder:text-[#9AA9BD] focus:ring-4 focus:ring-[#0B6FE8]/10`}
              placeholder="Buscar pessoas..."
              aria-label="Buscar pessoas"
            />
          </label>
          <Button
            onClick={onAdd}
            className="h-11 rounded-2xl bg-[#082542] px-5 text-white shadow-[0_12px_24px_rgba(8,37,66,0.19)] hover:bg-[#10385E]"
          >
            <Plus />
            Adicionar usuário
          </Button>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[minmax(360px,1.42fr)_minmax(0,1.05fr)]">
        <article
          className={`${styles.hero} relative min-h-[324px] overflow-hidden rounded-[28px] p-6 text-white shadow-[0_18px_38px_rgba(4,30,60,0.18)] sm:p-7`}
        >
          <div className="relative z-10 flex h-full max-w-[440px] flex-col">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em]">
              <Users2 className="size-3.5" />
              Organização do time
            </span>
            <h2 className="mt-6 text-[clamp(28px,3vw,38px)] font-semibold leading-[1.07] tracking-[-0.055em]">
              Uma equipe alinhada deixa o trabalho fluir.
            </h2>
            <p className="mt-4 max-w-[360px] text-[12px] leading-5 text-white/78">
              Centralize quem participa do workspace e mantenha os acessos
              organizados em um só lugar.
            </p>
            <Button
              onClick={onAdd}
              className="mt-auto w-fit rounded-2xl bg-white px-5 text-[#10213D] shadow-lg hover:bg-[#EEF5FF]"
            >
              <UserPlus />
              Convidar pessoa <ArrowRight />
            </Button>
          </div>
          <div className="absolute bottom-6 right-6 hidden space-y-2.5 md:block">
            {[
              'Mais produtividade',
              'Segurança de dados',
              'Gestão simplificada',
              'Crescimento do time',
            ].map((label, index) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-full bg-[#0A315B]/55 py-2 pl-2 pr-4 backdrop-blur-sm"
              >
                <span className="grid size-9 place-items-center rounded-full bg-white/15 text-white">
                  {index === 1 ? (
                    <ShieldCheck className="size-4" />
                  ) : index === 2 ? (
                    <BarChart3 className="size-4" />
                  ) : (
                    <Users2 className="size-4" />
                  )}
                </span>
                <span className="text-[11px] font-medium">{label}</span>
              </div>
            ))}
          </div>
        </article>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            className={styles.metric}
            icon={<Users2 />}
            tone="blue"
            label="Membros no workspace"
            value={String(metrics.occupied)}
            detail={`de ${metrics.capacity} permitidos`}
          >
            <div
              className={`${styles.progress} mt-2 h-1.5 overflow-hidden rounded-full bg-[#DDEBFE]`}
            >
              <span
                className="block h-full origin-left rounded-full bg-[#0B6FE8]"
                style={{ width: `${metrics.utilization}%` }}
              />
            </div>
            <p className="mt-1.5 text-[9px] text-[#6080AF]">
              {metrics.utilization}% de utilização
            </p>
          </StatCard>
          <StatCard
            className={styles.metric}
            icon={<ShieldCheck />}
            tone="green"
            label="Acessos ativos"
            value={String(metrics.active)}
            detail={
              metrics.pending
                ? `${metrics.pending} aguardando acesso`
                : 'Todos em ordem'
            }
          >
            <Badge good={!metrics.pending}>
              {metrics.pending
                ? `${metrics.pending} pendente${metrics.pending > 1 ? 's' : ''}`
                : 'Tudo em ordem'}
            </Badge>
          </StatCard>
          <StatCard
            className={styles.metric}
            icon={<Clock3 />}
            tone="violet"
            label="Convites pendentes"
            value={String(metrics.pending)}
            detail={
              metrics.pending
                ? 'Pessoas aguardando entrada'
                : 'Nenhum convite no momento'
            }
          >
            <p className="mt-3 text-[9px] text-[#7D6BA7]">
              Atualizado com a equipe
            </p>
          </StatCard>
          <StatCard
            className={styles.metric}
            icon={<BarChart3 />}
            tone="amber"
            label="Funções configuradas"
            value={String(metrics.roles)}
            detail={
              metrics.roles === 1 ? 'Função cadastrada' : 'Funções cadastradas'
            }
          >
            <p className="mt-3 text-[9px] text-[#9A7544]">
              Com base nos acessos atuais
            </p>
          </StatCard>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <article
          className={`${styles.surface} overflow-hidden rounded-[28px] border border-[#E2EAF4] bg-white shadow-[0_14px_36px_rgba(18,59,107,0.07)]`}
        >
          <div className="flex flex-col gap-4 border-b border-[#E7EEF6] px-5 py-5 md:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2
                className={`${styles.heading} text-[20px] font-semibold tracking-[-0.04em] text-[#10213D]`}
              >
                Pessoas do workspace
              </h2>
              <p className={`${styles.subtle} mt-1 text-[11px] text-[#6D7F98]`}>
                Função, status e acessos de cada pessoa da sua operação.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 sm:w-[235px]">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#7C8FA9]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className={`${styles.search} h-10 w-full rounded-xl border border-[#DDE6F1] bg-white pl-9 pr-3 text-[10px] outline-none focus:ring-4 focus:ring-[#0B6FE8]/10`}
                  placeholder="Buscar por nome, e-mail ou função..."
                  aria-label="Filtrar pessoas"
                />
              </label>
              <label className="relative">
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as typeof status)
                  }
                  className={`${styles.search} h-10 min-w-[158px] appearance-none rounded-xl border border-[#DDE6F1] bg-white px-3 pr-8 text-[10px] outline-none focus:ring-4 focus:ring-[#0B6FE8]/10`}
                  aria-label="Filtrar por status"
                >
                  <option>Todos os status</option>
                  <option>Ativo</option>
                  <option>Pendente</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#7286A1]" />
              </label>
              <Button
                onClick={onAdd}
                className="h-10 rounded-xl bg-[#082542] px-4 text-white hover:bg-[#10385E]"
              >
                <Plus />
                Adicionar
              </Button>
            </div>
          </div>
          <div
            className={`${styles.tableHead} hidden grid-cols-[minmax(250px,1.45fr)_0.8fr_0.64fr_0.82fr] gap-4 border-b border-[#E7EEF6] bg-[#F8FAFD] px-6 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#7B8EA9] md:grid`}
          >
            <span>Pessoa</span>
            <span>Função</span>
            <span>Status</span>
            <span>Incluído em</span>
          </div>
          <div className="divide-y divide-[#E8EEF5]">
            {filteredMembers.map((member, index) => (
              <div
                key={member.id}
                className={`${styles.row} group grid items-center gap-3 px-5 py-4 transition-colors hover:bg-[#F8FBFF] md:grid-cols-[minmax(250px,1.45fr)_0.8fr_0.64fr_0.82fr] md:gap-4 md:px-6`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${index % 3 === 0 ? 'bg-[#DFF7ED] text-[#167452]' : index % 3 === 1 ? 'bg-[#E7F0FF] text-[#0B6FE8]' : 'bg-[#F6E9FF] text-[#8044B8]'}`}
                  >
                    {initials(member.name)}
                  </span>
                  <span className="min-w-0">
                    <strong
                      className={`${styles.heading} block truncate text-[12px] font-semibold text-[#152741]`}
                    >
                      {member.name}
                      {member.isCurrent ? (
                        <em className="ml-2 rounded-full bg-[#E9F2FF] px-2 py-0.5 text-[9px] font-semibold not-italic text-[#0B6FE8]">
                          Você
                        </em>
                      ) : null}
                    </strong>
                    <span
                      className={`${styles.subtle} mt-1 flex min-w-0 items-center gap-1.5 truncate text-[10px] text-[#71839D]`}
                    >
                      <Mail className="size-3 shrink-0" />
                      {member.email}
                    </span>
                  </span>
                </div>
                <span className="w-fit rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[10px] font-medium text-[#536882]">
                  {member.role === 'Proprietário' ? (
                    <Crown className="mr-1 inline size-3 text-[#B57D17]" />
                  ) : null}
                  {member.role}
                </span>
                <span
                  className={`flex w-fit items-center gap-1.5 text-[10px] font-medium ${member.status === 'Ativo' ? 'text-[#19845E]' : 'text-[#A26A21]'}`}
                >
                  <i className="size-1.5 rounded-full bg-current" />
                  {member.status}
                </span>
                <span className={`${styles.subtle} text-[10px] text-[#6C7D95]`}>
                  {addedAt(member.createdAt)}
                </span>
              </div>
            ))}
            {filteredMembers.length === 0 && (
              <div className="px-6 py-16 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#EAF2FF] text-[#0B6FE8]">
                  <Users2 className="size-5" />
                </span>
                <strong
                  className={`${styles.heading} mt-4 block text-sm text-[#152741]`}
                >
                  {members.length
                    ? 'Nenhuma pessoa encontrada'
                    : 'Sua equipe começa por aqui'}
                </strong>
                <p
                  className={`${styles.subtle} mx-auto mt-2 max-w-xs text-[11px] leading-5 text-[#71839D]`}
                >
                  {members.length
                    ? 'Ajuste a busca ou os filtros para ver outras pessoas.'
                    : 'Adicione a primeira pessoa para organizar acessos e responsabilidades.'}
                </p>
                <Button
                  onClick={onAdd}
                  className="mt-5 rounded-xl bg-[#082542] text-white hover:bg-[#10385E]"
                >
                  <Plus />
                  Adicionar usuário
                </Button>
              </div>
            )}
          </div>
        </article>

        <aside className="space-y-4">
          <section
            className={`${styles.mutedSurface} rounded-[24px] border border-[#E4ECF5] bg-[#F7FAFE] p-5`}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-10 place-items-center rounded-2xl bg-white text-[#0B6FE8] shadow-sm">
                <ShieldCheck className="size-5" />
              </span>
              <span className="text-[10px] font-semibold text-[#0B6FE8]">
                Dados atuais <ArrowRight className="ml-1 inline size-3" />
              </span>
            </div>
            <h2
              className={`${styles.heading} mt-4 text-[17px] font-semibold tracking-[-0.035em] text-[#152741]`}
            >
              Visão de acesso
            </h2>
            <p
              className={`${styles.subtle} mt-1 text-[10px] leading-4 text-[#637895]`}
            >
              Acompanhe rapidamente a disponibilidade da sua equipe no
              workspace.
            </p>
            <dl
              className={`${styles.subtle} mt-4 space-y-2.5 border-t border-[#DFE9F5] pt-4 text-[10px] text-[#617692]`}
            >
              <MetricRow
                label="Membros no workspace"
                value={metrics.occupied}
              />
              <MetricRow label="Convites pendentes" value={metrics.pending} />
              <MetricRow label="Funções configuradas" value={metrics.roles} />
              <MetricRow
                label="Limite do plano"
                value={`${metrics.occupied} / ${metrics.capacity}`}
              />
            </dl>
          </section>
          <section className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#062F2A,#084C42)] p-5 text-white shadow-[0_16px_34px_rgba(4,60,51,0.2)]">
            <Sparkles className="size-5 text-[#8EF0BC]" />
            <h2 className="mt-5 max-w-[195px] text-[16px] font-semibold leading-6 tracking-[-0.035em]">
              Times fortes constroem resultados extraordinários.
            </h2>
            <p className="mt-2 max-w-[205px] text-[10px] leading-4 text-white/66">
              Talento, processo e tecnologia para uma equipe que cresce com
              clareza.
            </p>
            <button
              onClick={onAdd}
              className="mt-4 inline-flex items-center gap-1 rounded-xl bg-white/12 px-3 py-2 text-[10px] font-semibold transition hover:bg-white/20"
            >
              Evoluir minha equipe <ArrowRight className="size-3" />
            </button>
            <div
              className={`${styles.valueBars} absolute bottom-5 right-5 flex h-16 items-end gap-1.5`}
              aria-label="Resumo visual do uso atual"
            >
              <span
                className="w-2 rounded-t bg-[#34D399]/50"
                style={{ height: `${Math.max(20, (bars[0] / barMax) * 100)}%` }}
              />
              <span
                className="w-2 rounded-t bg-[#34D399]/65"
                style={{ height: `${Math.max(20, (bars[1] / barMax) * 100)}%` }}
              />
              <span
                className="w-2 rounded-t bg-[#34D399]/80"
                style={{ height: `${Math.max(20, (bars[2] / barMax) * 100)}%` }}
              />
              <span
                className="w-2 rounded-t bg-[#6EE7B7]"
                style={{ height: `${Math.max(20, (bars[3] / barMax) * 100)}%` }}
              />
            </div>
          </section>
          <section
            className={`${styles.surface} rounded-[24px] border border-[#E4ECF5] bg-white p-5 shadow-[0_10px_28px_rgba(18,59,107,0.06)]`}
          >
            <div className="flex items-center justify-between">
              <h2
                className={`${styles.heading} text-[14px] font-semibold text-[#152741]`}
              >
                Atividade recente
              </h2>
              <span className="text-[10px] font-semibold text-[#0B6FE8]">
                Atualizada agora
              </span>
            </div>
            {members.slice(0, 2).map((member) => (
              <div key={member.id} className="mt-4 flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-full bg-[#DFF7ED] text-[9px] font-semibold text-[#167452]">
                  {initials(member.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <strong
                    className={`${styles.heading} block truncate text-[10px] text-[#20324B]`}
                  >
                    {member.status === 'Ativo'
                      ? 'Acesso confirmado'
                      : 'Convite preparado'}
                  </strong>
                  <span
                    className={`${styles.subtle} block truncate text-[9px] text-[#71839D]`}
                  >
                    {member.name}
                  </span>
                </span>
                <span
                  className="size-2 rounded-full bg-[#24B47E]"
                  aria-label="Atualizado"
                />
              </div>
            ))}
            {members.length === 0 && (
              <p className={`${styles.subtle} mt-4 text-[10px] text-[#71839D]`}>
                As atividades aparecerão ao adicionar pessoas.
              </p>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  tone,
  label,
  value,
  detail,
  children,
  className,
}: {
  icon: React.ReactNode;
  tone: 'blue' | 'green' | 'violet' | 'amber';
  label: string;
  value: string;
  detail: string;
  children: React.ReactNode;
  className?: string;
}) {
  const stylesByTone = {
    blue: 'border-[#D9E8FC] bg-[#F8FBFF] text-[#0B6FE8]',
    green: 'border-[#D7F0E5] bg-[#F4FFFA] text-[#16845C]',
    violet: 'border-[#E8DDFC] bg-[#FBF9FF] text-[#8851CA]',
    amber: 'border-[#F2E5C8] bg-[#FFFCF5] text-[#B77A14]',
  } as const;
  return (
    <article
      className={`${className || ''} rounded-[22px] border p-4 shadow-[0_10px_24px_rgba(18,59,107,0.05)] ${stylesByTone[tone]}`}
    >
      <span className="grid size-9 place-items-center rounded-xl bg-white/80 shadow-sm">
        {icon}
      </span>
      <p className="mt-4 text-[10px] font-medium text-[#45617F]">{label}</p>
      <strong className="mt-1 block text-[30px] leading-none tracking-[-0.06em] text-[#12233E]">
        {value}
      </strong>
      <p className="mt-1 text-[9px] text-[#6B7E98]">{detail}</p>
      {children}
    </article>
  );
}

function Badge({
  good,
  children,
}: {
  good: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-semibold ${good ? 'bg-[#DDF7EA] text-[#167452]' : 'bg-[#FFF0DE] text-[#A36217]'}`}
    >
      <Check className="size-3" />
      {children}
    </span>
  );
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt>{label}</dt>
      <dd className="font-semibold text-[#183151]">{value}</dd>
    </div>
  );
}
