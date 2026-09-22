import { StudioError } from './studio';
import { composeZeroBrief } from './zero-compose';
import {
  emptyZeroDraft,
  renderZeroProposal,
  zeroReadiness,
} from './zero-proposal';

type StudioSupplier = {
  business_name?: string | null;
  email?: string | null;
  phone?: string | null;
};

/**
 * Local proposal composition deliberately does not infer facts beyond the
 * deterministic Zero parser. It is the zero-cost default for a new project.
 */
export function renderStudioLocal(
  request: string,
  briefing: string,
  supplier: StudioSupplier | null,
  logoId?: string,
) {
  const source = [briefing.trim(), request.trim()].filter(Boolean).join('\n\n');
  if (source.length > 24000)
    throw new StudioError(
      'Para criar sem IA, use até 24.000 caracteres entre briefing e pedido.',
      422,
      'local_brief_too_long',
    );
  const base = emptyZeroDraft(supplier?.business_name || '');
  base.email = supplier?.email || '';
  base.phone = supplier?.phone || '';
  const composition = composeZeroBrief(source, base);
  const missing = zeroReadiness(composition.draft);
  if (missing.length)
    throw new StudioError(
      'Ainda não encontrei um escopo claro. Diga para quem é a proposta e qual serviço será entregue.',
      422,
      'local_brief_incomplete',
    );
  const reviewItems = [
    ...composition.warnings,
    ...composition.unresolved.map((item) =>
      `Revise este trecho do briefing: ${item.slice(0, 180)}`,
    ),
  ].slice(0, 12);
  return {
    title: composition.draft.title,
    message:
      reviewItems.length > 0
        ? 'Proposta criada localmente, sem consumo de IA. Há pontos comerciais para revisar antes do envio.'
        : 'Proposta criada localmente, sem consumo de IA.',
    html: renderZeroProposal(
      composition.draft,
      '',
      '',
      {},
      {
        logo: logoId ? `studio-asset:${logoId}` : undefined,
        hideCover: true,
      },
    ),
    reference_status: 'not_requested' as const,
    missing_information: reviewItems,
  };
}
