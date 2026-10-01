import { ThinkingOrb } from './thinking-orb';

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
	return <ThinkingOrb className={className} />;
}
