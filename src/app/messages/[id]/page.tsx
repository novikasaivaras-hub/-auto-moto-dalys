import { Suspense } from "react";
import ConversationClient from "./ConversationClient";

// AUTO_MOTO_CONVERSATION_SUSPENSE_V1

type Props = {
  params: Promise<{
    id: string;
  }>;
};

async function ConversationContent({ params }: Props) {
  const { id } = await params;

  return <ConversationClient conversationId={id} />;
}

export default function ConversationPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#F5F7F6] px-4 py-10">
          <div className="mx-auto max-w-3xl">
            <p className="text-slate-700">Įkeliamas pokalbis...</p>
          </div>
        </main>
      }
    >
      <ConversationContent params={params} />
    </Suspense>
  );
}