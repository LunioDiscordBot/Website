export function ListSkeleton({
	label,
	rows = 4,
	artwork = true,
	action = false,
	className = '',
}: {
	label: string;
	rows?: number;
	artwork?: boolean;
	action?: boolean;
	className?: string;
}) {
	return (
		<div className={className} role="status">
			<span className="sr-only">{label}</span>
			<div aria-hidden="true" className="grid gap-2">
				{Array.from({ length: rows }, (_, index) => (
					<div className="flex items-center gap-3 rounded-lg border border-[var(--dash-border)] px-3 py-3" key={index}>
						{artwork ? <div className="skeleton h-10 w-10 shrink-0 rounded-md" /> : null}
						<div className="min-w-0 flex-1 space-y-2">
							<div className="skeleton h-3" style={{ width: `${[62, 78, 54, 70][index % 4]}%` }} />
							<div className="skeleton h-2.5 w-2/5" />
						</div>
						{action ? <div className="skeleton hidden h-7 w-16 shrink-0 sm:block" /> : null}
					</div>
				))}
			</div>
		</div>
	);
}

export function SettingsSkeleton() {
	return (
		<section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]" role="status">
			<span className="sr-only">Loading guild settings...</span>
			<div aria-hidden="true" className="grid gap-6">
				{[0, 1].map((index) => (
					<div className="dashboard-panel-card" key={index}>
						<div className="skeleton h-3 w-24" />
						<div className="skeleton mt-3 h-7 w-1/2" />
						<div className="skeleton mt-4 h-3 w-3/4" />
						<div className="mt-8 grid gap-4 sm:grid-cols-2">
							{[0, 1, 2, 3].map((field) => (
								<div className="skeleton h-14" key={field} />
							))}
						</div>
					</div>
				))}
			</div>
			<div aria-hidden="true" className="dashboard-side-card self-start">
				<div className="skeleton h-6 w-1/2" />
				<div className="skeleton mt-4 h-3 w-3/4" />
				<div className="skeleton mt-6 h-11" />
			</div>
		</section>
	);
}
