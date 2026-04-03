import WitnessClient from './WitnessClient'

export default async function WitnessPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  return <WitnessClient sessionId={sessionId} />
}
