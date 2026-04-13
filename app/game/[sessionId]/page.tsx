import GameClient from './GameClient'

interface Props {
  params: Promise<{ sessionId: string }>
}

export default async function GamePage({ params }: Props) {
  const { sessionId } = await params
  return <GameClient sessionId={sessionId} />
}
