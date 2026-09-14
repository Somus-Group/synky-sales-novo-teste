import { notFound } from 'next/navigation';
import { ProposalOnePage } from '@/components/proposal-onepage';
import { proposalTemplates } from '@/lib/proposal-templates';
import { createCollectionExample } from '@/lib/proposal-collection';

// Only catalog examples are public here; no saved proposal or customer is loaded.
export default async function TemplatePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = proposalTemplates.find((item) => item.id === id);
  if (!template) notFound();

  return <ProposalOnePage preview idPrefix={`template-${template.id}`} proposal={createCollectionExample(template.value) || {
    code: 'MODELO', client: 'Cliente exemplo', project: template.name,
    value: 85000, validity: '2026-12-31', template: template.value,
  }} />;
}
