import { PhotoCreditsLink } from '@/components/deck/PhotoCredits';
import { ScaledSlide } from '@/components/deck/ScaledSlide';
import { HardwoodStage } from '@/components/hardwood/HardwoodStage';
import { JoinPanel } from '@/components/hardwood/JoinPanel';

interface WelcomeViewProps {
  isStarting: boolean;
  error: string | null;
  onStartCall: () => void;
}

export function WelcomeView({ isStarting, error, onStartCall }: WelcomeViewProps) {
  return (
    <div className="lobby-shell">
      <ScaledSlide rail={<PhotoCreditsLink />}>
        <HardwoodStage vignette showCredits={false}>
          <div className="flex h-full items-center justify-center">
            <JoinPanel isStarting={isStarting} error={error} onJoin={onStartCall} />
          </div>
        </HardwoodStage>
      </ScaledSlide>
    </div>
  );
}
