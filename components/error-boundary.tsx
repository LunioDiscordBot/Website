'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
	children: ReactNode;
	fallback?: ReactNode;
};

type State = {
	error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
	state: State = { error: null };

	static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		if (process.env.NODE_ENV === 'development') {
			console.error('[ErrorBoundary]', error, info.componentStack);
		}
	}

	render() {
		if (this.state.error) {
			if (this.props.fallback) return this.props.fallback;

			return (
				<div className="rounded-[1.5rem] border border-danger/30 bg-danger/10 p-6">
					<div className="font-headline text-xl font-bold text-white">Something went wrong</div>
					<div className="mt-2 text-sm leading-7 text-muted">{this.state.error.message || 'An unexpected error occurred.'}</div>
					<button
						className="secondary-button mt-5"
						onClick={() => this.setState({ error: null })}
						type="button"
					>
						Try again
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}
