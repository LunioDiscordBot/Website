import { ThinkingOrb } from './thinking-orb';

export function LoadingIndicator({ label, className = '', searching = false, size = 20 }: { label: string; className?: string; searching?: boolean; size?: 20 | 64 }) {
	return (
		<div className={`flex items-center gap-2 text-sm text-muted ${className}`} role="status">
			<ThinkingOrb size={size} state={searching ? 'searching' : 'working'} />
			<span>{label}</span>
		</div>
	);
}
